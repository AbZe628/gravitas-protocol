/**
 * Signing with a device the member owns.
 *
 * The fixtures here are not recordings. A real P-256 key is generated, real
 * authenticator data is laid out byte by byte, and the signature is a real
 * ECDSA signature over exactly what a device would sign — so a verification
 * that passes here would pass against hardware, and one that is wrong about
 * the byte order fails here too.
 *
 * The small CBOR encoder at the top exists only to build those fixtures. The
 * application reads CBOR and never writes it.
 */

import { describe, it, expect } from 'vitest';
import { createHash, createSign, generateKeyPairSync, randomBytes } from 'node:crypto';
import {
  Challenges,
  PasskeyRefused,
  checkSignature,
  coseToJwk,
  enrol,
  fromBase64Url,
  readAuthenticatorData,
  toBase64Url,
  type EnrolledDevice,
  type Expected,
  type Issued,
} from '../src/auth/passkeys.js';
import { decode, MalformedCbor } from '../src/auth/cbor.js';

const AT = '2026-09-14T10:00:00.000Z';
const expected: Expected = { rpId: 'localhost', origin: 'http://localhost:4102' };

// ── enough CBOR to build a fixture ────────────────────────────────────────

function head(major: number, length: number): Buffer {
  if (length < 24) return Buffer.from([(major << 5) | length]);
  if (length < 256) return Buffer.from([(major << 5) | 24, length]);
  const b = Buffer.alloc(3);
  b[0] = (major << 5) | 25;
  b.writeUInt16BE(length, 1);
  return b;
}

function cbor(value: unknown): Buffer {
  if (typeof value === 'number') {
    return value >= 0 ? head(0, value) : head(1, -1 - value);
  }
  if (typeof value === 'string') {
    const bytes = Buffer.from(value, 'utf8');
    return Buffer.concat([head(3, bytes.length), bytes]);
  }
  if (value instanceof Uint8Array) {
    return Buffer.concat([head(2, value.length), Buffer.from(value)]);
  }
  if (Array.isArray(value)) {
    return Buffer.concat([head(4, value.length), ...value.map(cbor)]);
  }
  if (value instanceof Map) {
    const parts: Buffer[] = [head(5, value.size)];
    for (const [k, v] of value) parts.push(cbor(k), cbor(v));
    return Buffer.concat(parts);
  }
  throw new Error('the fixture encoder does not write that');
}

// ── a device ──────────────────────────────────────────────────────────────

interface Device {
  credentialId: Buffer;
  privateKey: ReturnType<typeof generateKeyPairSync>['privateKey'];
  cose: Map<number, unknown>;
}

function makeDevice(): Device {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = publicKey.export({ format: 'jwk' }) as { x: string; y: string };

  return {
    credentialId: randomBytes(32),
    privateKey,
    cose: new Map<number, unknown>([
      [1, 2],
      [3, -7],
      [-1, 1],
      [-2, fromBase64Url(jwk.x)],
      [-3, fromBase64Url(jwk.y)],
    ]),
  };
}

function authenticatorData(opts: {
  rpId?: string;
  verified?: boolean;
  signCount?: number;
  device?: Device;
}): Buffer {
  const rpIdHash = createHash('sha256').update(opts.rpId ?? expected.rpId).digest();
  const flags = 0x01 | (opts.verified === false ? 0 : 0x04) | (opts.device ? 0x40 : 0);

  const fixed = Buffer.alloc(37);
  rpIdHash.copy(fixed, 0);
  fixed[32] = flags;
  fixed.writeUInt32BE(opts.signCount ?? 0, 33);

  if (!opts.device) return fixed;

  const idLength = Buffer.alloc(2);
  idLength.writeUInt16BE(opts.device.credentialId.length);
  return Buffer.concat([
    fixed,
    Buffer.alloc(16), // AAGUID
    idLength,
    opts.device.credentialId,
    cbor(opts.device.cose),
  ]);
}

function clientData(type: string, challenge: string, origin = expected.origin): string {
  return toBase64Url(Buffer.from(JSON.stringify({ type, challenge, origin, crossOrigin: false })));
}

function enrolment(device: Device, challenge: string, over: Parameters<typeof authenticatorData>[0] = {}) {
  return {
    clientDataJSON: clientData('webauthn.create', challenge),
    attestationObject: toBase64Url(
      cbor(
        new Map<string, unknown>([
          ['fmt', 'none'],
          ['attStmt', new Map()],
          ['authData', authenticatorData({ device, ...over })],
        ]),
      ),
    ),
  };
}

function assertion(device: Device, challenge: string, over: Parameters<typeof authenticatorData>[0] = {}) {
  const authData = authenticatorData(over);
  const clientDataJSON = clientData('webauthn.get', challenge, over.rpId ? undefined : expected.origin);
  const signed = Buffer.concat([
    authData,
    createHash('sha256').update(Buffer.from(fromBase64Url(clientDataJSON))).digest(),
  ]);
  const signer = createSign('sha256');
  signer.update(signed);

  return {
    id: toBase64Url(device.credentialId),
    clientDataJSON,
    authenticatorData: toBase64Url(authData),
    signature: toBase64Url(signer.sign(device.privateKey)),
  };
}

const issuedFor = (challenge: string, purpose: 'enrol' | 'sign' = 'sign'): Issued => ({
  challenge,
  purpose,
  scholarId: 'member-a',
  expiresAt: '2099-01-01T00:00:00.000Z',
});

const refusal = (fn: () => unknown): string => {
  try {
    fn();
  } catch (e) {
    return e instanceof PasskeyRefused ? e.code : `not-a-refusal: ${String(e)}`;
  }
  return 'did-not-refuse';
};

// ── the reader ────────────────────────────────────────────────────────────

describe('reading CBOR', () => {
  it('reads what a passkey is made of', () => {
    expect(decode(cbor(0))).toBe(0);
    expect(decode(cbor(23))).toBe(23);
    expect(decode(cbor(300))).toBe(300);
    expect(decode(cbor(-7))).toBe(-7);
    expect(decode(cbor('authData'))).toBe('authData');
    // A byte string comes back as a view onto the input, so compare contents:
    // a Buffer and a Uint8Array over the same bytes are not deeply equal.
    expect([...(decode(cbor(new Uint8Array([1, 2, 3]))) as Uint8Array)]).toEqual([1, 2, 3]);
    expect(decode(cbor([1, 'two']))).toEqual([1, 'two']);
    expect(decode(cbor(new Map<number, unknown>([[1, 2]])))).toEqual(new Map([[1, 2]]));
  });

  it('refuses bytes that follow the value', () => {
    const trailing = Buffer.concat([cbor(1), Buffer.from([0x00])]);
    expect(() => decode(trailing)).toThrow(MalformedCbor);
  });

  it('refuses a value that runs off the end', () => {
    expect(() => decode(Buffer.from([0x42, 0x01]))).toThrow(MalformedCbor);
  });

  it('refuses a key repeated in one map', () => {
    const doubled = Buffer.concat([head(5, 2), cbor(1), cbor(10), cbor(1), cbor(20)]);
    expect(() => decode(doubled)).toThrow(MalformedCbor);
  });
});

// ── challenges ────────────────────────────────────────────────────────────

describe('a challenge', () => {
  it('is spent by its first use, whether or not that use succeeded', () => {
    const c = new Challenges();
    const issued = c.issue('sign', 'member-a', AT);
    expect(c.spend(issued.challenge, 'sign', 'member-a', AT).challenge).toBe(issued.challenge);
    expect(refusal(() => c.spend(issued.challenge, 'sign', 'member-a', AT))).toBe('no_such_challenge');
  });

  it('is not usable by another member', () => {
    const c = new Challenges();
    const issued = c.issue('sign', 'member-a', AT);
    expect(refusal(() => c.spend(issued.challenge, 'sign', 'member-b', AT))).toBe('wrong_member');
  });

  it('is not usable for another purpose', () => {
    const c = new Challenges();
    const issued = c.issue('enrol', 'member-a', AT);
    expect(refusal(() => c.spend(issued.challenge, 'sign', 'member-a', AT))).toBe('wrong_purpose');
  });

  it('expires', () => {
    const c = new Challenges();
    const issued = c.issue('sign', 'member-a', AT);
    const later = new Date(new Date(AT).getTime() + 6 * 60_000).toISOString();
    expect(refusal(() => c.spend(issued.challenge, 'sign', 'member-a', later))).toBe('challenge_expired');
  });

  it('carries what document it was issued for', () => {
    const c = new Challenges();
    const issued = c.issue('sign', 'member-a', AT, { matterId: 'm', documentHash: '0xabc' });
    expect(issued.matterId).toBe('m');
    expect(issued.documentHash).toBe('0xabc');
  });

  it('does not accumulate', () => {
    const c = new Challenges();
    c.issue('sign', 'member-a', AT);
    c.issue('sign', 'member-a', AT);
    expect(c.outstanding).toBe(2);
    c.issue('sign', 'member-a', new Date(new Date(AT).getTime() + 6 * 60_000).toISOString());
    expect(c.outstanding).toBe(1);
  });

  it('is never the same twice', () => {
    const c = new Challenges();
    const seen = new Set<string>();
    for (let i = 0; i < 50; i += 1) seen.add(c.issue('sign', 'member-a', AT).challenge);
    expect(seen.size).toBe(50);
  });
});

// ── enrolment ─────────────────────────────────────────────────────────────

describe('enrolling a device', () => {
  const who = { scholarId: 'member-a', boardId: 'demo-board', label: 'My work laptop' };

  it('keeps the public half and the credential the device chose', () => {
    const device = makeDevice();
    const issued = issuedFor('CHAL', 'enrol');
    const kept = enrol(enrolment(device, 'CHAL'), issued, expected, who, AT);

    expect(kept.id).toBe(toBase64Url(device.credentialId));
    expect(kept.publicKey.crv).toBe('P-256');
    expect(kept.label).toBe('My work laptop');
    expect(kept.enrolledAt).toBe(AT);
    // Nothing private is anywhere in what is stored.
    expect(JSON.stringify(kept)).not.toContain('PRIVATE');
    expect(Object.keys(kept.publicKey).sort()).toEqual(['crv', 'kty', 'x', 'y']);
  });

  it('refuses a device that answered a different request', () => {
    const device = makeDevice();
    expect(
      refusal(() => enrol(enrolment(device, 'OTHER'), issuedFor('CHAL', 'enrol'), expected, who, AT)),
    ).toBe('wrong_challenge');
  });

  it('refuses one that did not confirm its owner', () => {
    const device = makeDevice();
    expect(
      refusal(() =>
        enrol(enrolment(device, 'CHAL', { verified: false }), issuedFor('CHAL', 'enrol'), expected, who, AT),
      ),
    ).toBe('not_verified');
  });

  it('refuses one enrolled for another site', () => {
    const device = makeDevice();
    expect(
      refusal(() =>
        enrol(
          enrolment(device, 'CHAL', { rpId: 'majlis.example.com' }),
          issuedFor('CHAL', 'enrol'),
          expected,
          who,
          AT,
        ),
      ),
    ).toBe('wrong_site');
  });

  it('refuses a key that is not the algorithm this board asked for', () => {
    const device = makeDevice();
    device.cose.set(3, -257); // RS256
    expect(
      refusal(() => enrol(enrolment(device, 'CHAL'), issuedFor('CHAL', 'enrol'), expected, who, AT)),
    ).toBe('unsupported_key');
  });

  it('refuses a curve point of the wrong size', () => {
    const device = makeDevice();
    device.cose.set(-2, new Uint8Array(16));
    expect(
      refusal(() => enrol(enrolment(device, 'CHAL'), issuedFor('CHAL', 'enrol'), expected, who, AT)),
    ).toBe('unsupported_key');
  });
});

// ── signing ───────────────────────────────────────────────────────────────

describe('signing with an enrolled device', () => {
  const who = { scholarId: 'member-a', boardId: 'demo-board', label: 'laptop' };

  function enrolled(): { device: Device; kept: EnrolledDevice } {
    const device = makeDevice();
    const kept = enrol(enrolment(device, 'CHAL'), issuedFor('CHAL', 'enrol'), expected, who, AT);
    return { device, kept };
  }

  it('accepts a signature the device actually made', () => {
    const { device, kept } = enrolled();
    const after = checkSignature(assertion(device, 'SIGN'), kept, issuedFor('SIGN'), expected, AT);
    expect(after.lastUsedAt).toBe(AT);
  });

  it('refuses a signature made by a different device', () => {
    const { kept } = enrolled();
    const impostor = makeDevice();
    const answer = assertion(impostor, 'SIGN');
    // The impostor claims the enrolled credential id, which is public.
    expect(
      refusal(() => checkSignature({ ...answer, id: kept.id }, kept, issuedFor('SIGN'), expected, AT)),
    ).toBe('signature_failed');
  });

  it('refuses a signature over a different challenge', () => {
    const { device, kept } = enrolled();
    expect(
      refusal(() => checkSignature(assertion(device, 'OTHER'), kept, issuedFor('SIGN'), expected, AT)),
    ).toBe('wrong_challenge');
  });

  it('refuses a signature made for another site', () => {
    const { device, kept } = enrolled();
    const answer = assertion(device, 'SIGN', { rpId: 'elsewhere.example' });
    expect(refusal(() => checkSignature(answer, kept, issuedFor('SIGN'), expected, AT))).toBe('wrong_site');
  });

  it('refuses one where the owner was not verified', () => {
    const { device, kept } = enrolled();
    const answer = assertion(device, 'SIGN', { verified: false });
    expect(refusal(() => checkSignature(answer, kept, issuedFor('SIGN'), expected, AT))).toBe('not_verified');
  });

  it('refuses an answer from a device other than the one it names', () => {
    const { device, kept } = enrolled();
    const answer = { ...assertion(device, 'SIGN'), id: 'c29tZXRoaW5nLWVsc2U' };
    expect(refusal(() => checkSignature(answer, kept, issuedFor('SIGN'), expected, AT))).toBe('wrong_device');
  });

  it('carries the counter forward', () => {
    const { device, kept } = enrolled();
    const after = checkSignature(
      assertion(device, 'SIGN', { signCount: 7 }),
      kept,
      issuedFor('SIGN'),
      expected,
      AT,
    );
    expect(after.signCount).toBe(7);
  });

  it('refuses a counter that goes backwards', () => {
    const { device, kept } = enrolled();
    const used = { ...kept, signCount: 9 };
    expect(
      refusal(() =>
        checkSignature(assertion(device, 'SIGN', { signCount: 4 }), used, issuedFor('SIGN'), expected, AT),
      ),
    ).toBe('counter_went_backwards');
  });

  it('accepts a device that always reports zero, which most do', () => {
    const { device, kept } = enrolled();
    const once = checkSignature(assertion(device, 'SIGN'), kept, issuedFor('SIGN'), expected, AT);
    const twice = checkSignature(assertion(device, 'AGAIN'), once, issuedFor('AGAIN'), expected, AT);
    expect(twice.signCount).toBe(0);
  });
});

// ── the parts underneath ──────────────────────────────────────────────────

describe('the authenticator data', () => {
  it('refuses one too short to be one', () => {
    expect(refusal(() => readAuthenticatorData(new Uint8Array(20)))).toBe('bad_authenticator_data');
  });

  it('refuses one announcing a credential it does not contain', () => {
    const truncated = authenticatorData({ device: makeDevice() }).subarray(0, 60);
    expect(refusal(() => readAuthenticatorData(truncated))).toBe('bad_authenticator_data');
  });

  it('reads the flags apart', () => {
    const read = readAuthenticatorData(authenticatorData({ verified: false }));
    expect(read.present).toBe(true);
    expect(read.verified).toBe(false);
  });
});

describe('a COSE key', () => {
  it('becomes a JWK node can verify with', () => {
    const device = makeDevice();
    const jwk = coseToJwk(device.cose as Map<number | string, never>);
    expect(jwk.kty).toBe('EC');
    expect(fromBase64Url(jwk.x)).toHaveLength(32);
  });

  it('refuses a key type other than an elliptic curve', () => {
    const device = makeDevice();
    device.cose.set(1, 3);
    expect(refusal(() => coseToJwk(device.cose as Map<number | string, never>))).toBe('unsupported_key');
  });
});
