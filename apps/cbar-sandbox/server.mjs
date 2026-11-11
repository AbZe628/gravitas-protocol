import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_DIR = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC_DIR = resolve(APP_DIR, 'public');
const DOCS_DIR = resolve(APP_DIR, '../../docs/cbar');
const REPO_ROOT = resolve(APP_DIR, '../..');
const RPC_URL = 'https://arbitrum-sepolia-rpc.publicnode.com';
const EXPECTED_CHAIN_ID = '0x66eee'; // 421614
const OWNER_AT_AUDIT = '0xFba6C221af564Ab90e333AEEf4E427f787911B73';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export const CONTRACTS = Object.freeze({
  registry: '0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23',
  teleportV3: '0x6702C2CE6eD58ca3934eBBd785CaC1De8DCd85B4',
  teleportV2: '0xEDfF3dFdcdd7C04B11d9B614D5e0cd368f1e93c0',
  timelock: '0xbFFAd90B2607e3E5926260B640BbcD1E128680Ba',
});

const SELECTORS = Object.freeze({
  owner: '0x8da5cb5b',
  pendingOwner: '0xe30c3978',
  paused: '0x5c975abb',
  currentVersion: '0x9d888e86',
  policyHistory: '0x505119f3',
  registry: '0x7b103999',
  cooldownSeconds: '0xb8221bc4',
  maxMoveBps: '0x34059458',
  positionManager: '0x791b98bc',
  swapRouter: '0xc31c9c07',
  getMinDelay: '0xf27a0c92',
  proposerRole: '0x8f61f4f5',
  executorRole: '0x07bd0265',
  cancellerRole: '0xb08e51c0',
  hasRole: '0x91d14854',
  isAssetCompliant: '0x146530c3',
  isRouterAuthorized: '0x82b32bb6',
  isExecutor: '0xdebfda30',
});

const READ_METHODS = new Set(['eth_chainId', 'eth_blockNumber', 'eth_getCode', 'eth_call']);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.pdf': 'application/pdf' };
const PUBLIC_DOCS = new Set([
  'README.md', 'PHASE1_REPOSITORY_AUDIT.md', 'CBAR_ARCHITECTURE.md', 'CBAR_REGULATORY_CONSIDERATIONS.md',
  'CBAR_KNOWN_LIMITATIONS.md', 'CBAR_ROADMAP.md', 'CBAR_REVIEWER_GUIDE.md', 'CBAR_EVIDENCE_INDEX.md',
  'CBAR_SECURITY_REVIEW.md', 'CBAR_TEST_RESULTS.md', 'CBAR_TEST_PLAN.md', 'CBAR_TECHNICAL_PROPOSAL.md',
  'CBAR_EXECUTIVE_BRIEF.md', 'CBAR_INVESTOR_BRIEF.md', 'CBAR_COMMUNICATION_PACKAGE.md', 'research-sources.md',
]);
const LOCAL_TESTS = Object.freeze({
  T26: { label: 'V3 full migration success paths', args: ['--match-test', 'test_V3_FullMigration_(NoSwap|WithSwap)', '-vv'] },
  T27: { label: 'V3 late refund failure and rollback state comparison', args: ['--match-test', 'test_V3_DustRefundRevertsWhenTheTokenReturnsFalse', '-vvv'] },
});
let localTestActive = false;

export function isAddress(value) {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value);
}

export function padAddress(value) {
  if (!isAddress(value)) throw new TypeError('Expected a 20-byte hex address');
  return value.slice(2).toLowerCase().padStart(64, '0');
}

export function decodeUint(hex) {
  if (typeof hex !== 'string' || !/^0x[0-9a-fA-F]+$/.test(hex)) throw new TypeError('Invalid ABI uint result');
  return BigInt(hex).toString(10);
}

export function decodeAddress(hex) {
  if (typeof hex !== 'string' || !/^0x[0-9a-fA-F]{64,}$/.test(hex)) throw new TypeError('Invalid ABI address result');
  return `0x${hex.slice(-40)}`;
}

export function decodeBool(hex) {
  if (typeof hex !== 'string' || !/^0x[0-9a-fA-F]{64,}$/.test(hex)) throw new TypeError('Invalid ABI bool result');
  const value = BigInt(hex);
  if (value !== 0n && value !== 1n) throw new TypeError('Invalid ABI bool value');
  return value === 1n;
}

function callData(selector, args = '') {
  return `${selector}${args}`;
}

function addressCallData(selector, address) {
  return callData(selector, padAddress(address));
}

function hasRoleCallData(roleHash, account) {
  if (typeof roleHash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(roleHash)) throw new TypeError('Expected bytes32 role hash');
  return callData(SELECTORS.hasRole, `${roleHash.slice(2).toLowerCase()}${padAddress(account)}`);
}

async function rpc(method, params = []) {
  if (!READ_METHODS.has(method)) throw new Error('RPC method is not allow-listed');
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error.message || 'RPC returned an error');
  return payload.result;
}

async function readCall(to, data, blockTag = 'latest') {
  try {
    return { value: await rpc('eth_call', [{ to, data }, blockTag]) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'RPC read failed' };
  }
}

async function readCode(address, blockTag = 'latest') {
  try {
    const code = await rpc('eth_getCode', [address, blockTag]);
    return { hasCode: typeof code === 'string' && code.length > 2, runtimeBytes: Math.max(0, (code.length - 2) / 2) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'RPC code read failed' };
  }
}

function decodeField(result, decoder) {
  if (result?.error) return { status: 'unavailable', error: result.error };
  try { return { status: 'read', value: decoder(result.value) }; }
  catch (error) { return { status: 'unavailable', error: error instanceof Error ? error.message : 'Decode failed' }; }
}

async function readContract(address, fields, blockTag = 'latest') {
  const entries = await Promise.all(Object.entries(fields).map(async ([name, [data, decoder]]) => [name, decodeField(await readCall(address, data, blockTag), decoder)]));
  return Object.fromEntries(entries);
}

async function snapshot() {
  const [chainId, blockNumber] = await Promise.all([rpc('eth_chainId'), rpc('eth_blockNumber')]);
  const blockTag = `0x${BigInt(blockNumber).toString(16)}`;
  const codeResults = await Promise.all(Object.values(CONTRACTS).map(address => readCode(address, blockTag)));
  const [registry, teleportV2, teleportV3, timelock] = await Promise.all([
    readContract(CONTRACTS.registry, {
      owner: [SELECTORS.owner, decodeAddress],
      pendingOwner: [SELECTORS.pendingOwner, decodeAddress],
      paused: [SELECTORS.paused, decodeBool],
      currentVersion: [SELECTORS.currentVersion, decodeUint],
      version1PolicyHash: [callData(SELECTORS.policyHistory, (1n).toString(16).padStart(64, '0')), value => value],
    }, blockTag),
    readContract(CONTRACTS.teleportV2, {
      owner: [SELECTORS.owner, decodeAddress],
      registry: [SELECTORS.registry, decodeAddress],
      cooldownSeconds: [SELECTORS.cooldownSeconds, decodeUint],
      maxMoveBps: [SELECTORS.maxMoveBps, decodeUint],
    }, blockTag),
    readContract(CONTRACTS.teleportV3, {
      owner: [SELECTORS.owner, decodeAddress],
      registry: [SELECTORS.registry, decodeAddress],
      positionManager: [SELECTORS.positionManager, decodeAddress],
      swapRouter: [SELECTORS.swapRouter, decodeAddress],
      paused: [SELECTORS.paused, decodeBool],
    }, blockTag),
    readContract(CONTRACTS.timelock, {
      minimumDelaySeconds: [SELECTORS.getMinDelay, decodeUint],
      proposerRole: [SELECTORS.proposerRole, value => value],
      executorRole: [SELECTORS.executorRole, value => value],
      cancellerRole: [SELECTORS.cancellerRole, value => value],
    }, blockTag),
  ]);

  const proposerHash = timelock.proposerRole.status === 'read' ? timelock.proposerRole.value : null;
  const executorHash = timelock.executorRole.status === 'read' ? timelock.executorRole.value : null;
  const [proposerOwner, executorOwner, executorOpen] = await Promise.all([
    proposerHash ? readCall(CONTRACTS.timelock, hasRoleCallData(proposerHash, OWNER_AT_AUDIT), blockTag) : Promise.resolve({ error: 'Role hash unavailable' }),
    executorHash ? readCall(CONTRACTS.timelock, hasRoleCallData(executorHash, OWNER_AT_AUDIT), blockTag) : Promise.resolve({ error: 'Role hash unavailable' }),
    executorHash ? readCall(CONTRACTS.timelock, hasRoleCallData(executorHash, ZERO_ADDRESS), blockTag) : Promise.resolve({ error: 'Role hash unavailable' }),
  ]);
  timelock.proposerRoleForObservedOwner = decodeField(proposerOwner, decodeBool);
  timelock.executorRoleForObservedOwner = decodeField(executorOwner, decodeBool);
  timelock.executorRoleForZeroAddress = decodeField(executorOpen, decodeBool);

  return {
    observedAt: new Date().toISOString(),
    network: { chainId, expectedChainId: EXPECTED_CHAIN_ID, matchesExpected: chainId?.toLowerCase() === EXPECTED_CHAIN_ID, blockNumber: decodeUint(blockNumber), blockTag },
    contracts: Object.fromEntries(Object.keys(CONTRACTS).map((key, index) => [key, { address: CONTRACTS[key], ...codeResults[index] }])),
    registry, teleportV2, teleportV3, timelock,
    scope: 'Read-only eth_call/eth_getCode snapshot. All contract reads in this refresh use the reported block tag. No transaction was sent. Exact deployed-bytecode equality to the repository commit is not established by this read.',
  };
}

async function registryFlag(kind, address) {
  if (!isAddress(address)) return { statusCode: 400, body: { error: 'Provide a 20-byte EVM address.' } };
  const selector = kind === 'asset' ? SELECTORS.isAssetCompliant : kind === 'router' ? SELECTORS.isRouterAuthorized : SELECTORS.isExecutor;
  let blockNumber;
  try { blockNumber = await rpc('eth_blockNumber'); }
  catch (error) { return { statusCode: 502, body: { error: error instanceof Error ? error.message : 'RPC read failed', status: 'unavailable' } }; }
  const blockTag = `0x${BigInt(blockNumber).toString(16)}`;
  const result = await readCall(CONTRACTS.registry, addressCallData(selector, address), blockTag);
  if (result.error) return { statusCode: 502, body: { error: result.error, status: 'unavailable' } };
  try { return { statusCode: 200, body: { status: 'read', kind, address, compliantOrAuthorized: decodeBool(result.value), blockNumber: decodeUint(blockNumber), blockTag, observedAt: new Date().toISOString(), caveat: 'Registry flag only; this is not KYC, sanctions screening, accreditation or investor eligibility.' } }; }
  catch (error) { return { statusCode: 502, body: { error: error.message, status: 'unavailable' } }; }
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  response.end(JSON.stringify(body));
}

function securityHeaders(response) {
  response.setHeader('x-content-type-options', 'nosniff');
  response.setHeader('referrer-policy', 'no-referrer');
  response.setHeader('content-security-policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  response.setHeader('cache-control', 'no-store');
}

async function readJsonBody(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk.toString('utf8');
    if (Buffer.byteLength(body, 'utf8') > 2048) throw new Error('Request body exceeds 2 KB.');
  }
  return JSON.parse(body || '{}');
}

function runLocalTest(testId) {
  const entry = LOCAL_TESTS[testId];
  if (!entry) return Promise.resolve({ statusCode: 400, body: { error: 'Choose one of the allow-listed local tests: T26 or T27.' } });
  if (localTestActive) return Promise.resolve({ statusCode: 409, body: { error: 'A local Foundry test is already running.' } });
  localTestActive = true;
  return new Promise(resolveResult => {
    let output = '';
    let truncated = false;
    let settled = false;
    let timedOut = false;
    const child = spawn('forge', ['test', ...entry.args], {
      cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'pipe'], shell: false,
      env: { PATH: process.env.PATH || '', HOME: process.env.HOME || '', TMPDIR: process.env.TMPDIR || '/tmp', FOUNDRY_PROFILE: process.env.FOUNDRY_PROFILE || 'default' },
    });
    const append = chunk => {
      const remaining = 180000 - output.length;
      if (remaining > 0) output += chunk.toString('utf8').slice(0, remaining);
      if (chunk.length > remaining) truncated = true;
    };
    child.stdout.on('data', append);
    child.stderr.on('data', append);
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); }, 90000);
    child.on('error', error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      localTestActive = false;
      resolveResult({ statusCode: 503, body: { status: 'not-available', testId, error: error.message, hint: 'Install Foundry or run the reviewer commands directly.' } });
    });
    child.on('close', code => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      localTestActive = false;
      resolveResult({ statusCode: 200, body: {
        status: timedOut ? 'timeout' : code === 0 ? 'pass' : 'fail', testId, label: entry.label,
        environment: 'LOCAL EVM / Foundry test fixtures', exitCode: code, timedOut,
        networkTransaction: false, transactionHash: null, truncated, output,
        command: `forge test ${entry.args.map(arg => `'${arg}'`).join(' ')}`,
      } });
    });
  });
}

export function createAppServer() {
  return createServer(async (request, response) => {
    securityHeaders(response);
    const url = new URL(request.url || '/', 'http://localhost');
    if (url.pathname === '/api/local-test/run') {
      if (request.method !== 'POST') return sendJson(response, 405, { error: 'This route requires POST with one allow-listed local test ID.' });
      const remoteAddress = request.socket.remoteAddress || '';
      if (remoteAddress !== '127.0.0.1' && remoteAddress !== '::1' && !remoteAddress.startsWith('::ffff:127.')) {
        return sendJson(response, 403, { error: 'Local test execution is restricted to loopback clients.' });
      }
      if (!String(request.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return sendJson(response, 415, { error: 'Content-Type must be application/json.' });
      const origin = request.headers.origin;
      if (origin) {
        try { if (new URL(origin).host !== request.headers.host) return sendJson(response, 403, { error: 'Cross-origin local test requests are blocked.' }); }
        catch { return sendJson(response, 403, { error: 'Invalid Origin header.' }); }
      }
      let body;
      try { body = await readJsonBody(request); }
      catch (error) { return sendJson(response, 400, { error: error instanceof Error ? error.message : 'Invalid JSON request.' }); }
      if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 || typeof body.testId !== 'string') {
        return sendJson(response, 400, { error: 'Body must be exactly {"testId":"T26"} or {"testId":"T27"}.' });
      }
      const result = await runLocalTest(body.testId);
      return sendJson(response, result.statusCode, result.body);
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return sendJson(response, 405, { error: 'Only read-only GET/HEAD requests are supported.' });
    }
    if (url.pathname === '/api/health') return sendJson(response, 200, { status: 'ready', mode: 'read-only + fixed local EVM tests', writesEnabled: false, testRunnerEnabled: true });
    if (url.pathname === '/api/snapshot') {
      try { return sendJson(response, 200, await snapshot()); }
      catch (error) { return sendJson(response, 502, { status: 'unavailable', error: error instanceof Error ? error.message : 'RPC request failed', network: 'Arbitrum Sepolia', observedAt: new Date().toISOString() }); }
    }
    const match = url.pathname.match(/^\/api\/registry\/(asset|router|executor)$/);
    if (match) {
      const outcome = await registryFlag(match[1], url.searchParams.get('address') || '');
      return sendJson(response, outcome.statusCode, outcome.body);
    }
    if (url.pathname.startsWith('/api/')) return sendJson(response, 404, { error: 'Unknown API route.' });

    let pathname;
    try { pathname = decodeURIComponent(url.pathname); }
    catch { return sendJson(response, 400, { error: 'Invalid path.' }); }
    const docName = pathname.startsWith('/docs/') ? pathname.slice('/docs/'.length) : '';
    if (docName) {
      if (!PUBLIC_DOCS.has(docName)) return sendJson(response, 404, { error: 'Document not found.' });
      try {
        const content = await readFile(resolve(DOCS_DIR, docName));
        response.writeHead(200, { 'content-type': 'text/markdown; charset=utf-8' });
        if (request.method === 'HEAD') return response.end();
        return response.end(content);
      } catch { return sendJson(response, 404, { error: 'Document not found.' }); }
    }
    if (pathname === '/') pathname = '/index.html';
    const filePath = resolve(PUBLIC_DIR, `.${pathname}`);
    if (!filePath.startsWith(`${PUBLIC_DIR}${sep}`)) return sendJson(response, 403, { error: 'Forbidden.' });
    try {
      const content = await readFile(filePath);
      response.writeHead(200, { 'content-type': MIME[extname(filePath)] || 'application/octet-stream' });
      if (request.method === 'HEAD') return response.end();
      return response.end(content);
    } catch {
      return sendJson(response, 404, { error: 'Not found.' });
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8789);
  const host = process.env.HOST || '127.0.0.1';
  createAppServer().listen(port, host, () => console.log(`CBAR reviewer sandbox listening on http://${host}:${port} (network reads + fixed local tests)`));
}
