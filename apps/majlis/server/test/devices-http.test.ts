/**
 * Enrolling a device and signing with it, over HTTP.
 *
 * `passkeys.test.ts` holds the cryptography. What is held here is everything
 * around it, which is where a signing feature actually goes wrong:
 *
 *   - a device belongs to the member who enrolled it and to nobody else;
 *   - a challenge is issued for one document, and a draft that moved between
 *     asking and answering is refused rather than signed;
 *   - claiming a device signature without a device answer is refused, and so
 *     is an answer filed under a weaker kind of proof;
 *   - the document prints which device it was signed with, and the seal
 *     covers that.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createHash, createSign, generateKeyPairSync } from 'node:crypto';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import { hashPassword } from '../src/auth/members.js';
import { fromBase64Url, toBase64Url } from '../src/auth/passkeys.js';

const PASSWORD = 'the original passphrase';
const secret = hashPassword(PASSWORD);
const ORIGIN = 'http://localhost:4102';
const RP_ID = 'localhost';

const MEMBERS = ['member-a:signatory+chair', 'member-b:signatory', 'watcher:observer']
  .map((entry) => `${entry}:${secret}`)
  .join('\n');

const as = (who: string) => 'Basic ' + Buffer.from(`${who}:${PASSWORD}`).toString('base64');

// ── a device, in the shape a browser hands one over ───────────────────────

function head(major: number, length: number): Buffer {
  if (length < 24) return Buffer.from([(major << 5) | length]);
  if (length < 256) return Buffer.from([(major << 5) | 24, length]);
  const b = Buffer.alloc(3);
  b[0] = (major << 5) | 25;
  b.writeUInt16BE(length, 1);
  return b;
}

function cbor(value: unknown): Buffer {
  if (typeof value === 'number') return value >= 0 ? head(0, value) : head(1, -1 - value);
  if (typeof value === 'string') {
    const bytes = Buffer.from(value, 'utf8');
    return Buffer.concat([head(3, bytes.length), bytes]);
  }
  if (value instanceof Uint8Array) return Buffer.concat([head(2, value.length), Buffer.from(value)]);
  if (value instanceof Map) {
    const parts: Buffer[] = [head(5, value.size)];
    for (const [k, v] of value) parts.push(cbor(k), cbor(v));
    return Buffer.concat(parts);
  }
  throw new Error('the fixture encoder does not write that');
}

function makeDevice(credentialId = Buffer.from('a-particular-laptop-0001')) {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = publicKey.export({ format: 'jwk' }) as { x: string; y: string };
  const cose = new Map<number, unknown>([
    [1, 2],
    [3, -7],
    [-1, 1],
    [-2, fromBase64Url(jwk.x)],
    [-3, fromBase64Url(jwk.y)],
  ]);

  const authenticatorData = (withCredential: boolean): Buffer => {
    const fixed = Buffer.alloc(37);
    createHash('sha256').update(RP_ID).digest().copy(fixed, 0);
    fixed[32] = 0x01 | 0x04 | (withCredential ? 0x40 : 0);
    fixed.writeUInt32BE(0, 33);
    if (!withCredential) return fixed;

    const length = Buffer.alloc(2);
    length.writeUInt16BE(credentialId.length);
    return Buffer.concat([fixed, Buffer.alloc(16), length, credentialId, cbor(cose)]);
  };

  const clientData = (type: string, challenge: string) =>
    toBase64Url(Buffer.from(JSON.stringify({ type, challenge, origin: ORIGIN })));

  return {
    id: toBase64Url(credentialId),

    enrolment(challenge: string) {
      return {
        clientDataJSON: clientData('webauthn.create', challenge),
        attestationObject: toBase64Url(
          cbor(
            new Map<string, unknown>([
              ['fmt', 'none'],
              ['attStmt', new Map()],
              ['authData', authenticatorData(true)],
            ]),
          ),
        ),
      };
    },

    assertion(challenge: string) {
      const authData = authenticatorData(false);
      const clientDataJSON = clientData('webauthn.get', challenge);
      const signer = createSign('sha256');
      signer.update(
        Buffer.concat([
          authData,
          createHash('sha256').update(Buffer.from(fromBase64Url(clientDataJSON))).digest(),
        ]),
      );
      return {
        id: toBase64Url(credentialId),
        clientDataJSON,
        authenticatorData: toBase64Url(authData),
        signature: toBase64Url(signer.sign(privateKey)),
      };
    },
  };
}

const DEVICE_PROOF = 'a device they enrolled, unlocked by its owner';

let app: Express;
const saved = { members: process.env.MAJLIS_MEMBERS, origin: process.env.MAJLIS_ORIGIN };

beforeEach(() => {
  process.env.MAJLIS_MEMBERS = MEMBERS;
  process.env.MAJLIS_ORIGIN = ORIGIN;
  app = createApp(new MemoryStore());
});

afterEach(() => {
  process.env.MAJLIS_MEMBERS = saved.members;
  if (saved.origin === undefined) delete process.env.MAJLIS_ORIGIN;
  else process.env.MAJLIS_ORIGIN = saved.origin;
});

async function enrolDevice(who: string, device: ReturnType<typeof makeDevice>, label = 'My laptop') {
  const asked = await request(app)
    .post('/api/devices/request')
    .set('Authorization', as(who))
    .send({})
    .expect(200);

  return request(app)
    .post('/api/devices')
    .set('Authorization', as(who))
    .send({ label, ...device.enrolment(asked.body.challenge) });
}

// ── enrolling ─────────────────────────────────────────────────────────────

describe('enrolling a device', () => {
  it('keeps it under the member’s own name', async () => {
    const device = makeDevice();
    const kept = await enrolDevice('member-a', device);
    expect(kept.status).toBe(201);
    expect(kept.body.label).toBe('My laptop');

    const mine = await request(app).get('/api/devices').set('Authorization', as('member-a')).expect(200);
    expect(mine.body.devices).toHaveLength(1);
    expect(mine.body.rpId).toBe(RP_ID);
  });

  it('never returns anything but the public half', async () => {
    const kept = await enrolDevice('member-a', makeDevice());
    expect(JSON.stringify(kept.body)).not.toContain('publicKey');
    expect(JSON.stringify(kept.body)).not.toContain('scholarId');
  });

  it('shows a member only their own', async () => {
    await enrolDevice('member-a', makeDevice());
    const theirs = await request(app)
      .get('/api/devices')
      .set('Authorization', as('member-b'))
      .expect(200);
    expect(theirs.body.devices).toHaveLength(0);
  });

  it('refuses a challenge issued to somebody else', async () => {
    const device = makeDevice();
    const asked = await request(app)
      .post('/api/devices/request')
      .set('Authorization', as('member-a'))
      .send({})
      .expect(200);

    const stolen = await request(app)
      .post('/api/devices')
      .set('Authorization', as('member-b'))
      .send({ label: 'Not mine', ...device.enrolment(asked.body.challenge) });

    expect(stolen.status).toBe(409);
    expect(stolen.body.error).toBe('wrong_member');
  });

  it('refuses a challenge twice', async () => {
    const device = makeDevice();
    const asked = await request(app)
      .post('/api/devices/request')
      .set('Authorization', as('member-a'))
      .send({})
      .expect(200);

    const body = { label: 'Once', ...device.enrolment(asked.body.challenge) };
    await request(app).post('/api/devices').set('Authorization', as('member-a')).send(body).expect(201);

    const again = await request(app)
      .post('/api/devices')
      .set('Authorization', as('member-a'))
      .send({ ...body, label: 'Twice' });
    expect(again.status).toBe(409);
    expect(again.body.error).toBe('no_such_challenge');
  });

  it('refuses one already enrolled to another member', async () => {
    const shared = makeDevice();
    await enrolDevice('member-a', shared);

    const theirs = await enrolDevice('member-b', shared, 'The same laptop');
    expect(theirs.status).toBe(409);
    expect(theirs.body.error).toBe('device_belongs_to_another');
  });

  it('refuses a credential that holds no seat', async () => {
    const asked = await request(app)
      .post('/api/devices/request')
      .set('Authorization', as('watcher'))
      .send({});
    expect(asked.status).toBe(403);
    expect(asked.body.error).toBe('not_a_member');
  });
});

describe('forgetting a device', () => {
  it('is yours to do and nobody else’s', async () => {
    const kept = await enrolDevice('member-a', makeDevice());

    const theirs = await request(app)
      .delete(`/api/devices/${encodeURIComponent(kept.body.id)}`)
      .set('Authorization', as('member-b'));
    expect(theirs.status).toBe(404);

    await request(app)
      .delete(`/api/devices/${encodeURIComponent(kept.body.id)}`)
      .set('Authorization', as('member-a'))
      .expect(204);

    const mine = await request(app).get('/api/devices').set('Authorization', as('member-a'));
    expect(mine.body.devices).toHaveLength(0);
  });
});

// ── signing ───────────────────────────────────────────────────────────────

/** A matter with a decision on it, which is the only thing that can be signed. */
async function aDecidedMatter(): Promise<string> {
  const matters = await request(app).get('/api/matters').set('Authorization', as('member-a'));
  const decided = matters.body.find((m: { status: string }) => m.status === 'in_force');
  expect(decided).toBeTruthy();
  return decided.id;
}

describe('signing with a device', () => {
  it('records the signature and names the device', async () => {
    const device = makeDevice();
    await enrolDevice('member-a', device, 'My work laptop');
    const matterId = await aDecidedMatter();

    const asked = await request(app)
      .post(`/api/matters/${matterId}/sign/request`)
      .set('Authorization', as('member-a'))
      .send({})
      .expect(200);

    expect(asked.body.devices).toHaveLength(1);

    const signed = await request(app)
      .post(`/api/matters/${matterId}/sign`)
      .set('Authorization', as('member-a'))
      .send({ provedBy: DEVICE_PROOF, device: device.assertion(asked.body.challenge) });

    expect(signed.status).toBe(201);
    expect(signed.body.provedBy).toBe(DEVICE_PROOF);
    expect(signed.body.signedWith).toBe('My work laptop');
  });

  it('prints the device on the ruling', async () => {
    const device = makeDevice();
    await enrolDevice('member-a', device, 'My work laptop');
    const matterId = await aDecidedMatter();

    const asked = await request(app)
      .post(`/api/matters/${matterId}/sign/request`)
      .set('Authorization', as('member-a'))
      .send({});
    await request(app)
      .post(`/api/matters/${matterId}/sign`)
      .set('Authorization', as('member-a'))
      .send({ provedBy: DEVICE_PROOF, device: device.assertion(asked.body.challenge) })
      .expect(201);

    const page = await request(app)
      .get(`/api/matters/${matterId}/fatwa`)
      .set('Authorization', as('member-a'))
      .expect(200);

    expect(page.text).toContain('My work laptop');
    expect(page.text).toContain('a device they enrolled');
  });

  it('refuses the claim without an answer from a device', async () => {
    await enrolDevice('member-a', makeDevice());
    const matterId = await aDecidedMatter();

    const claimed = await request(app)
      .post(`/api/matters/${matterId}/sign`)
      .set('Authorization', as('member-a'))
      .send({ provedBy: DEVICE_PROOF });

    expect(claimed.status).toBe(400);
    expect(claimed.body.error).toBe('proof_does_not_match');
  });

  it('refuses an answer filed under a weaker proof', async () => {
    const device = makeDevice();
    await enrolDevice('member-a', device);
    const matterId = await aDecidedMatter();

    const asked = await request(app)
      .post(`/api/matters/${matterId}/sign/request`)
      .set('Authorization', as('member-a'))
      .send({});

    const mixed = await request(app)
      .post(`/api/matters/${matterId}/sign`)
      .set('Authorization', as('member-a'))
      .send({ provedBy: 'their own sign-in', device: device.assertion(asked.body.challenge) });

    expect(mixed.status).toBe(400);
    expect(mixed.body.error).toBe('proof_does_not_match');
  });

  it('refuses a device enrolled to another member', async () => {
    const device = makeDevice();
    await enrolDevice('member-b', device);
    const matterId = await aDecidedMatter();

    // member-a has none, so the request itself is refused before any signature.
    const asked = await request(app)
      .post(`/api/matters/${matterId}/sign/request`)
      .set('Authorization', as('member-a'))
      .send({});

    expect(asked.status).toBe(409);
    expect(asked.body.error).toBe('no_device_enrolled');
  });

  it('refuses a challenge issued for a different document', async () => {
    const device = makeDevice();
    await enrolDevice('member-a', device);

    const matters = await request(app).get('/api/matters').set('Authorization', as('member-a'));
    const decided = matters.body.filter((m: { status: string }) => m.status === 'in_force');
    const lapsed = matters.body.find((m: { status: string }) => m.status === 'lapsed');
    const other = decided[1] ?? lapsed;
    expect(other).toBeTruthy();

    const asked = await request(app)
      .post(`/api/matters/${decided[0].id}/sign/request`)
      .set('Authorization', as('member-a'))
      .send({});

    const elsewhere = await request(app)
      .post(`/api/matters/${other.id}/sign`)
      .set('Authorization', as('member-a'))
      .send({ provedBy: DEVICE_PROOF, device: device.assertion(asked.body.challenge) });

    expect(elsewhere.status).toBe(409);
    expect(elsewhere.body.error).toBe('document_moved');
  });

  it('refuses a challenge twice, so a captured answer is no use', async () => {
    const device = makeDevice();
    await enrolDevice('member-a', device);
    const matterId = await aDecidedMatter();

    const asked = await request(app)
      .post(`/api/matters/${matterId}/sign/request`)
      .set('Authorization', as('member-a'))
      .send({});

    const answer = device.assertion(asked.body.challenge);
    await request(app)
      .post(`/api/matters/${matterId}/sign`)
      .set('Authorization', as('member-a'))
      .send({ provedBy: DEVICE_PROOF, device: answer })
      .expect(201);

    const replayed = await request(app)
      .post(`/api/matters/${matterId}/sign`)
      .set('Authorization', as('member-a'))
      .send({ provedBy: DEVICE_PROOF, device: answer });

    expect(replayed.status).toBe(409);
    expect(replayed.body.error).toBe('no_such_challenge');
  });
});
