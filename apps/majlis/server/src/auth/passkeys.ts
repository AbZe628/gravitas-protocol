/**
 * Signing with a device the member already owns.
 *
 * ── what the handbook asks for ────────────────────────────────────────────
 *
 * A member signs by pressing a button and confirming with the fingerprint
 * reader, face recognition or PIN they already use to unlock their own laptop
 * or phone. They enrol the devices they own; the signing key is made inside
 * the device's secure hardware and never leaves it; Majlis keeps only the
 * public half, against the member's name. No wallet, no seed phrase, no fee,
 * nothing to install.
 *
 * That is WebAuthn, and this file is the part of it that belongs on a server.
 *
 * ── what a passkey signature proves, exactly ──────────────────────────────
 *
 * It proves that someone held an enrolled device and performed the unlock
 * gesture that device asks for, and that the device signed a challenge this
 * installation issued for one document and one member.
 *
 * It does not prove who that person was. A device lent to a colleague signs
 * exactly as well for them. That is true of a wet signature too, and the
 * honest phrasing is what the document prints: a named member's enrolled
 * device, unlocked by whoever held it.
 *
 * What it does prove that the older proof did not: the private key that made
 * this signature has never been on this server, so nothing here — and nobody
 * who takes a copy of this record — can produce another signature by it.
 *
 * ── the challenge is not the document hash ────────────────────────────────
 *
 * It is thirty-two random bytes, issued for one member, one matter and one
 * document hash, usable once, expiring in minutes. Signing the document hash
 * directly would be simpler and would be wrong: the hash is predictable and
 * printed on the page, so a signature captured once could be replayed onto
 * the same document afterwards. The binding to the document is kept here,
 * beside the challenge, where it can be checked but not guessed.
 *
 * ── user verification is required ─────────────────────────────────────────
 *
 * Both at enrolment and at signing. A device that merely exists is not a
 * member confirming anything, and the gesture is the whole of what the
 * handbook promises. A device that will not perform it cannot be enrolled,
 * and the screen says why rather than enrolling a weaker thing quietly.
 */

import { createHash, createPublicKey, randomBytes, verify as verifySignature } from 'node:crypto';
import { decode, MalformedCbor, type CborValue } from './cbor.js';

/** Why a challenge was issued. The two are never interchangeable. */
export type Purpose = 'enrol' | 'sign';

export class PasskeyRefused extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'PasskeyRefused';
    this.code = code;
  }
}

function refuse(code: string, message: string): never {
  throw new PasskeyRefused(code, message);
}

// ── base64url, which is how a browser hands over every one of these ───────

export function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

export function fromBase64Url(text: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) {
    refuse('not_base64url', 'That value is not base64url, so it did not come from a browser.');
  }
  return new Uint8Array(Buffer.from(text, 'base64url'));
}

// ── what is kept about a device ───────────────────────────────────────────

/**
 * One enrolled device, as the record holds it.
 *
 * `publicKey` is a JWK because that is what `node:crypto` takes directly, and
 * because it is readable: a security review can see that what is stored is a
 * public curve point and nothing else.
 */
export interface EnrolledDevice {
  /** The credential id the device chose, base64url. Unique per device. */
  id: string;
  scholarId: string;
  boardId: string;
  /** What the member calls it. Their words: "my work laptop". */
  label: string;
  publicKey: { kty: 'EC'; crv: 'P-256'; x: string; y: string };
  /**
   * The device's own counter, where it keeps one.
   *
   * Compared on every signature and never allowed to go backwards: a counter
   * that repeats is the signal that a credential has been copied out of the
   * hardware that was supposed to hold it. Many devices report zero always,
   * and zero is then accepted forever — which is what the specification says
   * to do and is worth saying out loud rather than looking like a gap.
   */
  signCount: number;
  enrolledAt: string;
  lastUsedAt?: string;
}

// ── the challenge, and what it was issued for ─────────────────────────────

export interface Issued {
  challenge: string;
  purpose: Purpose;
  scholarId: string;
  /** Present for a signing challenge: the document it is good for. */
  matterId?: string;
  documentHash?: string;
  expiresAt: string;
}

/** Five minutes. Long enough to find a phone, short enough to be no use later. */
export const CHALLENGE_MINUTES = 5;

/**
 * Challenges in flight.
 *
 * In memory on purpose, and the same assumption the rest of this installation
 * makes: one process. A restart drops every challenge in flight, which costs
 * a member one press and costs the record nothing.
 */
export class Challenges {
  private readonly open = new Map<string, Issued>();

  issue(
    purpose: Purpose,
    scholarId: string,
    at: string,
    forDocument?: { matterId: string; documentHash: string },
  ): Issued {
    this.forget(at);

    const issued: Issued = {
      challenge: toBase64Url(new Uint8Array(randomBytes(32))),
      purpose,
      scholarId,
      ...(forDocument ?? {}),
      expiresAt: new Date(new Date(at).getTime() + CHALLENGE_MINUTES * 60_000).toISOString(),
    };
    this.open.set(issued.challenge, issued);
    return issued;
  }

  /**
   * Take a challenge back, for one use only.
   *
   * Removed before it is judged, so a challenge that fails verification is
   * spent all the same. Otherwise a wrong answer could be tried repeatedly
   * against the same challenge, which is the whole reason it is one-time.
   */
  spend(challenge: string, purpose: Purpose, scholarId: string, at: string): Issued {
    const found = this.open.get(challenge);
    this.open.delete(challenge);

    if (!found) {
      refuse(
        'no_such_challenge',
        'That request has already been used or was never issued. Press the button again.',
      );
    }
    if (new Date(at).getTime() > new Date(found.expiresAt).getTime()) {
      refuse('challenge_expired', 'That request has expired. Press the button again.');
    }
    if (found.purpose !== purpose) {
      refuse('wrong_purpose', 'That request was issued for something else.');
    }
    if (found.scholarId !== scholarId) {
      refuse('wrong_member', 'That request was issued to a different member.');
    }
    return found;
  }

  /** Drop what has expired. Called on every issue, so nothing accumulates. */
  private forget(at: string): void {
    const now = new Date(at).getTime();
    for (const [key, issued] of this.open) {
      if (now > new Date(issued.expiresAt).getTime()) this.open.delete(key);
    }
  }

  get outstanding(): number {
    return this.open.size;
  }
}

// ── reading what the browser sends back ───────────────────────────────────

interface ClientData {
  type: string;
  challenge: string;
  origin: string;
}

function readClientData(bytes: Uint8Array): ClientData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    refuse('bad_client_data', 'The browser sent something that is not the expected JSON.');
  }
  const o = parsed as Partial<ClientData>;
  if (typeof o?.type !== 'string' || typeof o.challenge !== 'string' || typeof o.origin !== 'string') {
    refuse('bad_client_data', 'The browser sent JSON without the fields a passkey carries.');
  }
  return { type: o.type, challenge: o.challenge, origin: o.origin };
}

export interface AuthenticatorData {
  rpIdHash: Uint8Array;
  /** The member was present — they touched it. */
  present: boolean;
  /** The member was verified — fingerprint, face or PIN. This is the one that matters. */
  verified: boolean;
  signCount: number;
  credentialId?: Uint8Array;
  publicKey?: Map<number | string, CborValue>;
}

/**
 * The authenticator data, which is a fixed header and then, at enrolment, the
 * credential itself.
 *
 * Laid out by the specification as: 32 bytes of RP id hash, one byte of
 * flags, four bytes of counter, and — only when the flags say so — the AAGUID,
 * the credential id and the COSE public key.
 */
export function readAuthenticatorData(bytes: Uint8Array): AuthenticatorData {
  if (bytes.length < 37) {
    refuse('bad_authenticator_data', 'The authenticator data is too short to be one.');
  }

  const flags = bytes[32];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out: AuthenticatorData = {
    rpIdHash: bytes.subarray(0, 32),
    present: (flags & 0x01) !== 0,
    verified: (flags & 0x04) !== 0,
    signCount: view.getUint32(33),
  };

  if ((flags & 0x40) === 0) return out;

  // 16 bytes of AAGUID, then a two-byte length and the credential id.
  if (bytes.length < 55) {
    refuse('bad_authenticator_data', 'The credential is announced but the data stops short of it.');
  }
  const idLength = view.getUint16(53);
  const idEnds = 55 + idLength;
  if (idLength === 0 || bytes.length < idEnds) {
    refuse('bad_authenticator_data', 'The credential id does not fit in what was sent.');
  }
  out.credentialId = bytes.subarray(55, idEnds);

  let key: CborValue;
  try {
    key = decode(bytes.subarray(idEnds));
  } catch (e) {
    refuse(
      'bad_public_key',
      e instanceof MalformedCbor ? e.message : 'The public key could not be read.',
    );
  }
  if (!(key instanceof Map)) refuse('bad_public_key', 'The public key is not a COSE key.');
  out.publicKey = key;
  return out;
}

/**
 * A COSE key as a JWK, which is what `node:crypto` verifies with.
 *
 * ES256 on P-256 only. Every platform authenticator in use makes one, it is
 * the algorithm this application asks for by name, and a second algorithm
 * accepted here would be a second path to keep correct for no member's
 * benefit. Anything else is refused by name.
 */
export function coseToJwk(key: Map<number | string, CborValue>): EnrolledDevice['publicKey'] {
  const kty = key.get(1);
  const alg = key.get(3);
  const crv = key.get(-1);
  const x = key.get(-2);
  const y = key.get(-3);

  if (kty !== 2) refuse('unsupported_key', 'That device offered a key type this board does not take.');
  if (alg !== -7) {
    refuse('unsupported_key', 'That device offered an algorithm other than ES256, which is the one asked for.');
  }
  if (crv !== 1) refuse('unsupported_key', 'That device offered a curve other than P-256.');
  if (!(x instanceof Uint8Array) || !(y instanceof Uint8Array) || x.length !== 32 || y.length !== 32) {
    refuse('unsupported_key', 'The key does not carry a P-256 point.');
  }

  return { kty: 'EC', crv: 'P-256', x: toBase64Url(x), y: toBase64Url(y) };
}

// ── the two acts ──────────────────────────────────────────────────────────

/** What every check is measured against. Set from the installation, never from the request. */
export interface Expected {
  /** The host this installation is served from, e.g. `localhost`. */
  rpId: string;
  /** The exact origin the browser must report, e.g. `http://localhost:4102`. */
  origin: string;
}

function checkOriginAndRp(
  client: ClientData,
  auth: AuthenticatorData,
  expected: Expected,
  wanted: string,
): void {
  if (client.type !== wanted) {
    refuse('wrong_ceremony', 'The browser answered a different kind of request than the one asked.');
  }
  if (client.origin !== expected.origin) {
    refuse(
      'wrong_origin',
      `That was signed for ${client.origin}, and this installation is ${expected.origin}. A ` +
        'signature made for another site is not accepted here.',
    );
  }

  const wantedHash = createHash('sha256').update(expected.rpId).digest();
  if (Buffer.compare(wantedHash, Buffer.from(auth.rpIdHash)) !== 0) {
    refuse('wrong_site', 'The device signed for a different site than this one.');
  }
  if (!auth.verified) {
    refuse(
      'not_verified',
      'The device did not confirm it was unlocked by its owner. A fingerprint, a face or a PIN ' +
        'is what a signature here means, so a touch on its own is not taken.',
    );
  }
}

export interface EnrolmentAnswer {
  clientDataJSON: string;
  attestationObject: string;
}

/**
 * Enrol a device.
 *
 * Attestation is deliberately not examined. It would say which make and model
 * of authenticator this is, signed by its manufacturer, and a board deciding
 * that one member's laptop is an acceptable brand and another's is not is not
 * something this application should make easy. What matters is that the key
 * is held in the device and the member unlocked it, and both of those are
 * established without it.
 */
export function enrol(
  answer: EnrolmentAnswer,
  issued: Issued,
  expected: Expected,
  who: { scholarId: string; boardId: string; label: string },
  at: string,
): EnrolledDevice {
  const client = readClientData(fromBase64Url(answer.clientDataJSON));
  if (client.challenge !== issued.challenge) {
    refuse('wrong_challenge', 'The device answered a request other than the one it was given.');
  }

  let attestation: CborValue;
  try {
    attestation = decode(fromBase64Url(answer.attestationObject));
  } catch (e) {
    refuse(
      'bad_attestation',
      e instanceof MalformedCbor ? e.message : 'The enrolment could not be read.',
    );
  }
  if (!(attestation instanceof Map)) refuse('bad_attestation', 'The enrolment is not what it claims.');

  const authData = attestation.get('authData');
  if (!(authData instanceof Uint8Array)) {
    refuse('bad_attestation', 'The enrolment carries no authenticator data.');
  }

  const auth = readAuthenticatorData(authData);
  checkOriginAndRp(client, auth, expected, 'webauthn.create');

  if (!auth.credentialId || !auth.publicKey) {
    refuse('no_credential', 'The device did not return a credential to keep.');
  }

  return {
    id: toBase64Url(auth.credentialId),
    scholarId: who.scholarId,
    boardId: who.boardId,
    label: who.label,
    publicKey: coseToJwk(auth.publicKey),
    signCount: auth.signCount,
    enrolledAt: at,
  };
}

export interface SigningAnswer {
  id: string;
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
}

/**
 * Check a signature made by an enrolled device.
 *
 * Returns the device as it should be written back — the counter moved on and
 * the date of last use — so the caller stores one thing and there is no second
 * place where the counter could be forgotten.
 */
export function checkSignature(
  answer: SigningAnswer,
  device: EnrolledDevice,
  issued: Issued,
  expected: Expected,
  at: string,
): EnrolledDevice {
  if (answer.id !== device.id) {
    refuse('wrong_device', 'That answer came from a different device than the one it names.');
  }

  const client = readClientData(fromBase64Url(answer.clientDataJSON));
  if (client.challenge !== issued.challenge) {
    refuse('wrong_challenge', 'The device answered a request other than the one it was given.');
  }

  const authBytes = fromBase64Url(answer.authenticatorData);
  const auth = readAuthenticatorData(authBytes);
  checkOriginAndRp(client, auth, expected, 'webauthn.get');

  /*
   * What the device actually signed: the authenticator data exactly as sent,
   * then the hash of the client data. Concatenated, not hashed together — the
   * specification's order, and getting it wrong fails closed.
   */
  const signed = Buffer.concat([
    Buffer.from(authBytes),
    createHash('sha256').update(Buffer.from(fromBase64Url(answer.clientDataJSON))).digest(),
  ]);

  const key = createPublicKey({ key: device.publicKey, format: 'jwk' });
  const ok = verifySignature('sha256', signed, key, Buffer.from(fromBase64Url(answer.signature)));
  if (!ok) {
    refuse(
      'signature_failed',
      'That signature does not match the device enrolled under this name. Nothing has been ' +
        'recorded.',
    );
  }

  /*
   * A counter that goes backwards means two things exist that should be one.
   * A device that reports zero every time is not doing this, and is the
   * ordinary case on Apple and Windows hardware.
   */
  if (auth.signCount !== 0 && auth.signCount <= device.signCount) {
    refuse(
      'counter_went_backwards',
      'That device reports a signature count lower than one it has already used, which is what a ' +
        'copied credential looks like. It has been refused. Enrol the device again to clear it.',
    );
  }

  return { ...device, signCount: auth.signCount, lastUsedAt: at };
}
