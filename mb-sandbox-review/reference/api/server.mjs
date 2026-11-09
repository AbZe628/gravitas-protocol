/*
 * REFERENCE IMPLEMENTATION, UNAUDITED, FOR EVALUATION, NOT FOR PRODUCTION.
 * Binds to loopback by default; Docker overrides the bind address and publishes only to host loopback.
 */
import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RegistryReader, RpcUnavailable } from './registry.mjs';

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const AMOUNT = /^(0|[1-9][0-9]*)(\.[0-9]+)?$/;
const REQUEST_LIMIT = 8192;
const ALLOWED_ROOT_KEYS = new Set(['asset', 'amount', 'context']);
const ALLOWED_CONTEXT_KEYS = new Set(['channel', 'requestId']);

function json(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  res.end(body);
}
function equalSecret(given, expected) {
  if (typeof given !== 'string' || !expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
function validateBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Body must be a JSON object';
  if (Object.keys(body).some((key) => !ALLOWED_ROOT_KEYS.has(key))) return 'Unknown top-level field';
  if (!ADDRESS.test(body.asset || '')) return 'asset must be a 20-byte hexadecimal address';
  if (typeof body.amount !== 'string' || !AMOUNT.test(body.amount)) return 'amount must be a non-negative decimal string';
  if (!body.context || typeof body.context !== 'object' || Array.isArray(body.context)) return 'context must be an object';
  if (Object.keys(body.context).some((key) => !ALLOWED_CONTEXT_KEYS.has(key))) return 'Unknown context field';
  if (typeof body.context.channel !== 'string' || body.context.channel.length < 1 || body.context.channel.length > 80) return 'context.channel must be 1 to 80 characters';
  if (typeof body.context.requestId !== 'string' || body.context.requestId.length < 1 || body.context.requestId.length > 128) return 'context.requestId must be 1 to 128 characters';
  return null;
}
async function readJson(req) {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) {
    const error = new Error('Content-Type must be application/json'); error.status = 415; throw error;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > REQUEST_LIMIT) { const error = new Error('Request body too large'); error.status = 413; throw error; }
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { const error = new Error('Body must be valid JSON'); error.status = 400; throw error; }
}

export function createComplianceServer({
  rpcUrl = process.env.RPC_URL || 'http://127.0.0.1:8545',
  registryAddress = process.env.REGISTRY_ADDRESS || '',
  apiKey = process.env.MB_API_KEY || '',
  auditLogPath = process.env.AUDIT_LOG_PATH || './audit.jsonl',
  timeoutMs = 2000,
  retries = 1,
  fetchImpl = fetch,
} = {}) {
  if (!ADDRESS.test(registryAddress)) throw new Error('REGISTRY_ADDRESS must be a 20-byte hexadecimal address');
  if (!apiKey) throw new Error('MB_API_KEY is required');
  const reader = new RegistryReader({ rpcUrl, registryAddress, timeoutMs, retries, fetchImpl });

  async function audit(record) {
    await appendFile(auditLogPath, `${JSON.stringify({ loggedAt: new Date().toISOString(), ...record })}\n`, { mode: 0o600 });
  }

  return createServer(async (req, res) => {
    if (!equalSecret(req.headers['x-api-key'], apiKey)) {
      await audit({ method: req.method, path: req.url, status: 401, policyVersion: null, policyHash: null, blockNumber: null }).catch(() => {});
      return json(res, 401, { error: 'UNAUTHORIZED' });
    }

    if (req.method === 'GET' && req.url === '/health') {
      await audit({ method: req.method, path: req.url, status: 200, policyVersion: null, policyHash: null, blockNumber: null }).catch(() => {});
      return json(res, 200, { status: 'ok' });
    }

    if (req.method === 'GET' && req.url === '/v1/policy') {
      try {
        const state = await reader.snapshot(null);
        await audit({ method: req.method, path: req.url, status: 200, ...state, registry: registryAddress.toLowerCase() });
        return json(res, 200, {
          policyVersion: state.policyVersion,
          policyHash: state.policyHash,
          blockNumber: state.blockNumber,
          chainId: state.chainId,
          registry: registryAddress.toLowerCase(),
          timestamp: state.timestamp,
          paused: state.paused,
        });
      } catch {
        await audit({ method: req.method, path: req.url, status: 503, reasonCode: 'REGISTRY_UNAVAILABLE', policyVersion: null, policyHash: null, blockNumber: null }).catch(() => {});
        return json(res, 503, { decision: 'DENY', reasonCode: 'REGISTRY_UNAVAILABLE' });
      }
    }

    if (req.method === 'POST' && req.url === '/v1/verify') {
      let body;
      try { body = await readJson(req); }
      catch (error) {
        await audit({ method: req.method, path: req.url, status: error.status || 400, policyVersion: null, policyHash: null, blockNumber: null }).catch(() => {});
        return json(res, error.status || 400, { error: 'INVALID_REQUEST', message: error.message });
      }
      const validationError = validateBody(body);
      if (validationError) {
        await audit({ method: req.method, path: req.url, status: 400, policyVersion: null, policyHash: null, blockNumber: null }).catch(() => {});
        return json(res, 400, { error: 'INVALID_REQUEST', message: validationError });
      }

      const baseRecord = {
        requestId: body.context.requestId,
        asset: body.asset.toLowerCase(),
        amount: body.amount,
        channel: body.context.channel,
        registry: registryAddress.toLowerCase(),
      };
      try {
        const state = await reader.snapshot(body.asset);
        const decision = state.paused ? 'DENY' : (state.assetApproved ? 'ALLOW' : 'DENY');
        const reasonCode = state.paused ? 'REGISTRY_PAUSED' : (state.assetApproved ? 'ASSET_APPROVED' : 'ASSET_NOT_APPROVED');
        const result = {
          decision,
          reasonCode,
          policyVersion: state.policyVersion,
          policyHash: state.policyHash,
          blockNumber: state.blockNumber,
          chainId: state.chainId,
          registry: registryAddress.toLowerCase(),
          timestamp: state.timestamp,
          requestId: body.context.requestId,
        };
        await audit({ ...baseRecord, ...result });
        return json(res, 200, result);
      } catch (error) {
        const result = { decision: 'DENY', reasonCode: 'REGISTRY_UNAVAILABLE' };
        try {
          await audit({ ...baseRecord, ...result, policyVersion: null, policyHash: null, blockNumber: null });
        } catch {
          return json(res, 503, { ...result, auditLog: 'UNAVAILABLE' });
        }
        return json(res, 503, result);
      }
    }

    await audit({ method: req.method, path: req.url, status: 404, policyVersion: null, policyHash: null, blockNumber: null }).catch(() => {});
    return json(res, 404, { error: 'NOT_FOUND' });
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const host = process.env.API_HOST || '127.0.0.1';
  const port = Number(process.env.API_PORT || '8787');
  const server = createComplianceServer();
  server.listen(port, host, () => {
    console.log(`Reference API listening on http://${host}:${port}`);
  });
}
