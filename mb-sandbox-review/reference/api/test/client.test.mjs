/*
 * REFERENCE CLIENT TESTS, UNAUDITED, FOR EVALUATION, NOT FOR PRODUCTION.
 * The transfer callback is a spy; these tests do not submit transactions.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { executeTransferAfterAllow, verifyForTransfer } from '../compliance-client.mjs';

const KEY = 'reference-test-key';
const REGISTRY = '0x1111111111111111111111111111111111111111';
const ASSET = '0x2222222222222222222222222222222222222222';
const HASH = `0x${'ab'.repeat(32)}`;
const REQUEST = { asset: ASSET, amount: '1', context: { channel: 'test', requestId: 'req-client-01' } };
const ALLOW = {
  decision: 'ALLOW', reasonCode: 'ASSET_APPROVED', policyVersion: '7', policyHash: HASH,
  blockNumber: '100', chainId: '31337', registry: REGISTRY,
  timestamp: '2026-11-10T00:00:00.000Z', requestId: REQUEST.context.requestId,
};
const options = (fetchImpl, extra = {}) => ({
  baseUrl: 'http://127.0.0.1:1', apiKey: KEY, request: REQUEST,
  expectedChainId: '31337', expectedRegistry: REGISTRY,
  timeoutMs: 40, maxRetries: 1, totalTimeoutMs: 150, fetchImpl, ...extra,
});

async function withServer(handler, fn) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try { await fn(baseUrl); }
  finally { await new Promise((resolve) => { server.close(resolve); server.closeAllConnections?.(); }); }
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

test('unreachable API returns local UNAVAILABLE and does not invoke transfer callback', async () => {
  let calls = 0;
  let executed = 0;
  const result = await executeTransferAfterAllow({
    verifyOptions: options(async () => { calls += 1; throw new TypeError('connection refused'); }),
    executeTransfer: async () => { executed += 1; },
  });
  assert.deepEqual(result, { executed: false, decision: { decision: 'UNAVAILABLE', reasonCode: 'API_UNAVAILABLE', attempts: 2 } });
  assert.equal(calls, 2);
  assert.equal(executed, 0);
});

test('API-up/RPC-down HTTP 503 DENY remains distinct from an unreachable API', async () => {
  let executed = 0;
  const result = await executeTransferAfterAllow({
    verifyOptions: options(async () => jsonResponse({ decision: 'DENY', reasonCode: 'REGISTRY_UNAVAILABLE' }, 503)),
    executeTransfer: async () => { executed += 1; },
  });
  assert.equal(result.executed, false);
  assert.equal(result.decision.decision, 'DENY');
  assert.equal(result.decision.reasonCode, 'REGISTRY_UNAVAILABLE');
  assert.equal(executed, 0);
});

test('invalid or mismatched HTTP 200 ALLOW is unavailable and never executes', async () => {
  let executed = 0;
  const result = await executeTransferAfterAllow({
    verifyOptions: options(async () => jsonResponse({ ...ALLOW, registry: '0x3333333333333333333333333333333333333333' })),
    executeTransfer: async () => { executed += 1; },
  });
  assert.equal(result.executed, false);
  assert.equal(result.decision.decision, 'UNAVAILABLE');
  assert.equal(result.decision.reasonCode, 'INVALID_API_RESPONSE');
  assert.equal(executed, 0);
});

test('a valid current ALLOW is the only response that invokes transfer callback', async () => {
  let executed = 0;
  const result = await executeTransferAfterAllow({
    verifyOptions: options(async (_url, init) => {
      assert.equal(init.cache, 'no-store');
      assert.equal(init.headers['x-api-key'], KEY);
      return jsonResponse(ALLOW);
    }),
    executeTransfer: async () => { executed += 1; },
  });
  assert.equal(result.executed, true);
  assert.equal(result.decision.decision, 'ALLOW');
  assert.equal(executed, 1);
});

test('valid policy DENY does not execute a transfer', async () => {
  let executed = 0;
  const result = await executeTransferAfterAllow({
    verifyOptions: options(async () => jsonResponse({ ...ALLOW, decision: 'DENY', reasonCode: 'ASSET_NOT_APPROVED' })),
    executeTransfer: async () => { executed += 1; },
  });
  assert.equal(result.executed, false);
  assert.equal(result.decision.decision, 'DENY');
  assert.equal(executed, 0);
});

test('timeout and transport retries remain bounded by attempt and total-time caps', async () => {
  let attempts = 0;
  const started = performance.now();
  const result = await verifyForTransfer(options((_url, { signal }) => {
    attempts += 1;
    return new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    });
  }, { timeoutMs: 25, maxRetries: 2, totalTimeoutMs: 55 }));
  const elapsed = performance.now() - started;
  assert.notEqual(result.decision, 'ALLOW');
  assert.equal(result.decision, 'UNAVAILABLE');
  assert.ok(attempts >= 1 && attempts <= 3);
  assert.equal(result.attempts, attempts);
  assert.ok(elapsed < 250, `bounded retries exceeded expected test ceiling: ${elapsed}ms`);
});

test('transport recovery makes a fresh request and executes once only after validated ALLOW', async () => {
  let attempts = 0;
  let executed = 0;
  const fetchImpl = async () => {
    attempts += 1;
    if (attempts === 1) throw new TypeError('connection reset');
    return jsonResponse(ALLOW);
  };
  const result = await executeTransferAfterAllow({
    verifyOptions: options(fetchImpl),
    executeTransfer: async () => { executed += 1; },
  });
  assert.equal(result.executed, true);
  assert.equal(result.decision.decision, 'ALLOW');
  assert.equal(attempts, 2);
  assert.equal(executed, 1);
});

test('real closed loopback endpoint is not interpreted as approval', async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  await new Promise((resolve) => { server.close(resolve); server.closeAllConnections?.(); });
  let executed = 0;
  const result = await executeTransferAfterAllow({
    verifyOptions: { ...options(fetch), baseUrl, timeoutMs: 500, totalTimeoutMs: 700 },
    executeTransfer: async () => { executed += 1; },
  });
  assert.equal(result.executed, false);
  assert.equal(result.decision.decision, 'UNAVAILABLE');
  assert.equal(executed, 0);
});

test('HTTP 500 or malformed JSON cannot create ALLOW', async () => {
  let executed = 0;
  await withServer((_req, res) => { res.writeHead(500); res.end('{broken'); }, async (baseUrl) => {
    const result = await executeTransferAfterAllow({
      verifyOptions: { ...options(fetch), baseUrl },
      executeTransfer: async () => { executed += 1; },
    });
    assert.equal(result.executed, false);
    assert.equal(result.decision.decision, 'UNAVAILABLE');
  });
  assert.equal(executed, 0);
});

test('client rejects retry limits outside the documented bound', async () => {
  await assert.rejects(() => verifyForTransfer(options(fetch, { maxRetries: 3 })), RangeError);
});
