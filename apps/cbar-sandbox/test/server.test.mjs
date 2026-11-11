import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeAddress, decodeBool, decodeUint, isAddress, padAddress, createAppServer } from '../server.mjs';

test('validates 20-byte EVM addresses and rejects malformed inputs', () => {
  assert.equal(isAddress('0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23'), true);
  assert.equal(isAddress('0x1234'), false);
  assert.equal(isAddress('not-an-address'), false);
  assert.equal(isAddress(null), false);
});

test('pads addresses into a 32-byte ABI word', () => {
  assert.equal(padAddress('0x0000000000000000000000000000000000000001'), '0'.repeat(63) + '1');
  assert.throws(() => padAddress('0x1234'), /20-byte/);
});

test('decodes ABI addresses, booleans, and large uint values without precision loss', () => {
  assert.equal(decodeAddress(`0x${'0'.repeat(24)}${'ab'.repeat(20)}`), `0x${'ab'.repeat(20)}`);
  assert.equal(decodeBool(`0x${'0'.repeat(63)}1`), true);
  assert.equal(decodeBool(`0x${'0'.repeat(64)}`), false);
  assert.throws(() => decodeBool(`0x${'0'.repeat(63)}2`), /bool value/);
  assert.equal(decodeUint('0x20000000000001'), '9007199254740993');
});

test('HTTP interface is read-only for network access and exposes only allow-listed public documentation', async (t) => {
  const server = createAppServer();
  server.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;

  const health = await fetch(`${base}/api/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ready', mode: 'read-only + fixed local EVM tests', writesEnabled: false, testRunnerEnabled: true });

  const write = await fetch(`${base}/api/health`, { method: 'POST' });
  assert.equal(write.status, 405);
  assert.match((await write.json()).error, /read-only/);

  const localTestGet = await fetch(`${base}/api/local-test/run`);
  assert.equal(localTestGet.status, 405);

  const crossOriginRun = await fetch(`${base}/api/local-test/run`, {
    method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://attacker.example' },
    body: JSON.stringify({ testId: 'T27' }),
  });
  assert.equal(crossOriginRun.status, 403);

  const unsupportedTest = await fetch(`${base}/api/local-test/run`, {
    method: 'POST', headers: { 'content-type': 'application/json', origin: base },
    body: JSON.stringify({ testId: 'arbitrary-command' }),
  });
  assert.equal(unsupportedTest.status, 400);

  const badAddress = await fetch(`${base}/api/registry/asset?address=0x1234`);
  assert.equal(badAddress.status, 400);

  const publicDoc = await fetch(`${base}/docs/CBAR_TEST_PLAN.md`);
  assert.equal(publicDoc.status, 200);
  assert.match(await publicDoc.text(), /T01/);

  const privateDoc = await fetch(`${base}/docs/TODO.md`);
  assert.equal(privateDoc.status, 404);
});
