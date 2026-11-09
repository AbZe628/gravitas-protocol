/*
 * REFERENCE IMPLEMENTATION TESTS, UNAUDITED, FOR EVALUATION, NOT FOR PRODUCTION.
 */
import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createComplianceServer } from '../server.mjs';

const KEY = 'reference-test-key';
const REGISTRY = '0x1111111111111111111111111111111111111111';
const ASSET = '0x2222222222222222222222222222222222222222';
const HASH = `0x${'ab'.repeat(32)}`;
const ZERO = `0x${'00'.repeat(32)}`;
const REQUEST = { asset: ASSET, amount: '100.25', context: { channel: 'node-test', requestId: 'req-001' } };

let rpc;
let rpcUrl;
let rpcPort;
let api;
let apiUrl;
let tempDir;
let auditPath;
let state;
let apiServer;

function word(value) { return `0x${BigInt(value).toString(16).padStart(64, '0')}`; }
function rpcPayload(method, params) {
  if (method === 'eth_chainId') return '0x7a69';
  if (method === 'eth_getBlockByNumber') return { number: '0x64', timestamp: '0x6553f100' };
  if (method !== 'eth_call') throw new Error(`Unexpected method ${method}`);
  state.callBlocks.push(params[1]);
  const selector = params[0].data.slice(0, 10);
  if (selector === '0x5c975abb') return state.paused ? word(1) : word(0);
  if (selector === '0x5e7770c8') return word(state.version);
  if (selector === '0x505119f3') return state.hash;
  if (selector === '0x6095c14d') return state.allowed ? word(1) : word(0);
  throw new Error(`Unexpected eth_call selector ${selector}`);
}

async function listen(server) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${server.address().port}`;
}
async function startRpc() {
  rpc = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    const parsed = JSON.parse(body);
    state.requests += 1;
    if (state.delayMs) await new Promise((resolve) => setTimeout(resolve, state.delayMs));
    try {
      const result = rpcPayload(parsed.method, parsed.params);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', id: parsed.id, result }));
    } catch (error) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', id: parsed.id, error: { code: -32000, message: error.message } }));
    }
  });
  if (rpcPort) {
    await new Promise((resolve, reject) => {
      rpc.once('error', reject);
      rpc.listen(rpcPort, '127.0.0.1', resolve);
    });
    rpcUrl = `http://127.0.0.1:${rpcPort}`;
  } else {
    rpcUrl = await listen(rpc);
    rpcPort = rpc.address().port;
  }
}
async function startApi(timeoutMs = 2000) {
  apiServer = createComplianceServer({ rpcUrl, registryAddress: REGISTRY, apiKey: KEY, auditLogPath: auditPath, timeoutMs, retries: 1 });
  apiUrl = await listen(apiServer);
}
async function closeServer(server) {
  if (!server?.listening) return;
  await new Promise((resolve) => { server.close(resolve); server.closeAllConnections?.(); });
}
async function post(body = REQUEST, key = KEY) {
  return fetch(`${apiUrl}/v1/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key },
    body: JSON.stringify(body),
  });
}

before(async () => { tempDir = await mkdtemp(join(tmpdir(), 'registry-reference-api-')); auditPath = join(tempDir, 'audit.jsonl'); });
beforeEach(async () => {
  await closeServer(apiServer); await closeServer(rpc);
  state = { paused: false, allowed: true, version: 7n, hash: HASH, requests: 0, callBlocks: [], delayMs: 0 };
  await startRpc(); await startApi();
});
after(async () => { await closeServer(apiServer); await closeServer(rpc); await rm(tempDir, { recursive: true, force: true }); });

test('allowed asset returns a pinned-block ALLOW and auditable policy fields', async () => {
  const response = await post();
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.decision, 'ALLOW');
  assert.equal(data.reasonCode, 'ASSET_APPROVED');
  assert.equal(data.policyVersion, '7');
  assert.equal(data.policyHash, HASH);
  assert.equal(data.blockNumber, '100');
  assert.equal(data.chainId, '31337');
  assert.equal(data.registry, REGISTRY);
  assert.equal(data.requestId, 'req-001');
  assert.ok(state.callBlocks.length >= 4);
  assert.deepEqual([...new Set(state.callBlocks)], ['0x64']);
});

test('unapproved asset returns DENY without converting caller context into authority', async () => {
  state.allowed = false;
  const response = await post();
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.decision, 'DENY');
  assert.equal(data.reasonCode, 'ASSET_NOT_APPROVED');
});

test('paused registry returns DENY at the same pinned block', async () => {
  state.paused = true;
  const response = await post();
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.decision, 'DENY');
  assert.equal(data.reasonCode, 'REGISTRY_PAUSED');
});

test('missing or wrong API key returns 401 on protected routes', async () => {
  assert.equal((await post(REQUEST, 'wrong')).status, 401);
  const noKey = await fetch(`${apiUrl}/health`);
  assert.equal(noKey.status, 401);
});

test('bad addresses, negative amounts and unknown fields are rejected', async () => {
  assert.equal((await post({ ...REQUEST, asset: '0x1234' })).status, 400);
  assert.equal((await post({ ...REQUEST, amount: '-1' })).status, 400);
  assert.equal((await post({ ...REQUEST, unexpected: true })).status, 400);
});

test('unknown route returns 404 after authentication', async () => {
  const response = await fetch(`${apiUrl}/v1/no-such-route`, { headers: { 'x-api-key': KEY } });
  assert.equal(response.status, 404);
});

test('stopped RPC returns 503 DENY; restoring the RPC recovers without a cached ALLOW', async () => {
  await closeServer(rpc); // Stop the JSON-RPC chain endpoint between requests.
  const down = await post();
  assert.equal(down.status, 503);
  assert.deepEqual(await down.json(), { decision: 'DENY', reasonCode: 'REGISTRY_UNAVAILABLE' });
  await startRpc();
  const recovered = await post();
  assert.equal(recovered.status, 200);
  assert.equal((await recovered.json()).decision, 'ALLOW');
  const records = (await readFile(auditPath, 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
  assert.equal(records.at(-2).reasonCode, 'REGISTRY_UNAVAILABLE');
  assert.equal(records.at(-1).decision, 'ALLOW');
});

test('slow RPC times out, retries once, and returns 503 DENY', async () => {
  await closeServer(apiServer);
  state.delayMs = 2100;
  await startApi();
  const start = Date.now();
  const response = await post();
  const elapsed = Date.now() - start;
  assert.equal(response.status, 503);
  assert.equal((await response.json()).reasonCode, 'REGISTRY_UNAVAILABLE');
  assert.ok(elapsed >= 3500 && elapsed < 6000, `expected two two-second attempts, got ${elapsed}ms`);
});

test('policy route reads the version and hash live', async () => {
  const response = await fetch(`${apiUrl}/v1/policy`, { headers: { 'x-api-key': KEY } });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.policyVersion, '7');
  assert.equal(data.policyHash, HASH);
});
