/**
 * The browser's half of signing with a device.
 *
 * ── what this file is, and is not ─────────────────────────────────────────
 *
 * It is the conversion layer. WebAuthn speaks `ArrayBuffer` and the server
 * speaks base64url, and everything here is turning one into the other in the
 * right order. No decision is made here: whether a signature is good is the
 * server's answer, and this file cannot make it come out differently.
 *
 * ── a browser that cannot do it ───────────────────────────────────────────
 *
 * WebAuthn needs a secure context — HTTPS, or localhost — and a platform
 * authenticator. Over plain HTTP from an address on a bank's network the API
 * is simply not there. `available()` asks before anything is offered, so the
 * screen can say so in place rather than showing a button that throws.
 */

import { Refused } from './api.js';

export interface Device {
  id: string;
  label: string;
  enrolledAt: string;
  lastUsedAt?: string;
}

export interface DeviceAnswer {
  id: string;
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
}

const toBase64Url = (buffer: ArrayBuffer): string => {
  let binary = '';
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/*
 * Returns an ArrayBuffer rather than a view. WebAuthn takes a `BufferSource`,
 * and the DOM types insist that a view be over a plain ArrayBuffer — which a
 * `Uint8Array` is not guaranteed to be. Handing over the buffer itself is both
 * correct and shorter than convincing the compiler otherwise.
 */
const fromBase64Url = (text: string): ArrayBuffer => {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '==='.slice((padded.length + 3) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0)).buffer;
};

/**
 * Whether this browser can do any of it.
 *
 * Three questions, and all three have to be yes: the API exists, the page is
 * in a secure context, and a platform authenticator is actually present. The
 * third is asked of the browser rather than assumed — a desktop with no
 * fingerprint reader and no PIN will say no, and a member should be told that
 * rather than shown a dialog that cannot be answered.
 */
export async function available(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!window.isSecureContext) return false;
  if (!('PublicKeyCredential' in window)) return false;

  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** Why this browser cannot, in the one word a screen needs to pick a sentence. */
export async function whyNot(): Promise<'nothing' | 'insecure' | 'unsupported' | 'no-authenticator'> {
  if (typeof window === 'undefined') return 'unsupported';
  if (!window.isSecureContext) return 'insecure';
  if (!('PublicKeyCredential' in window)) return 'unsupported';
  return (await available()) ? 'nothing' : 'no-authenticator';
}

interface EnrolRequest {
  challenge: string;
  rpId: string;
  boardName: string;
  user: { id: string; name: string; displayName: string };
  already: string[];
}

/**
 * Make a key inside this device and hand the public half over.
 *
 * `residentKey` is not asked for: a passkey that lives in the device's own
 * list is a different thing to explain, and a member who is already signed in
 * does not need one to sign. `userVerification: 'required'` is the whole
 * point — the gesture is what the signature means.
 */
export async function enrolThisDevice(
  request: EnrolRequest,
  label: string,
): Promise<{ label: string; clientDataJSON: string; attestationObject: string }> {
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: fromBase64Url(request.challenge),
      rp: { id: request.rpId, name: request.boardName },
      user: {
        id: new TextEncoder().encode(request.user.id),
        name: request.user.name,
        displayName: request.user.displayName,
      },
      // ES256 only, which is what the server verifies and every platform makes.
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
      },
      // Nothing is done with attestation, so none is asked for.
      attestation: 'none',
      excludeCredentials: request.already.map((id) => ({
        type: 'public-key' as const,
        id: fromBase64Url(id),
      })),
      timeout: 120_000,
    },
  })) as PublicKeyCredential | null;

  if (!credential) throw new Refused('cancelled', 'Nothing was enrolled.', 0);
  const response = credential.response as AuthenticatorAttestationResponse;

  return {
    label,
    clientDataJSON: toBase64Url(response.clientDataJSON),
    attestationObject: toBase64Url(response.attestationObject),
  };
}

/** Ask the device to sign one challenge, and hand back what it answered. */
export async function signWithDevice(request: {
  challenge: string;
  rpId: string;
  devices: { id: string; label: string }[];
}): Promise<DeviceAnswer> {
  const credential = (await navigator.credentials.get({
    publicKey: {
      challenge: fromBase64Url(request.challenge),
      rpId: request.rpId,
      allowCredentials: request.devices.map((d) => ({
        type: 'public-key' as const,
        id: fromBase64Url(d.id),
      })),
      userVerification: 'required',
      timeout: 120_000,
    },
  })) as PublicKeyCredential | null;

  if (!credential) throw new Refused('cancelled', 'Nothing was signed.', 0);
  const response = credential.response as AuthenticatorAssertionResponse;

  return {
    id: credential.id,
    clientDataJSON: toBase64Url(response.clientDataJSON),
    authenticatorData: toBase64Url(response.authenticatorData),
    signature: toBase64Url(response.signature),
  };
}

/**
 * What a browser says when the member walks away, and what to call it.
 *
 * A cancelled dialog is not a failure and must not read like one. Everything
 * else keeps the browser's own words, because a member showing a screenshot to
 * their IT desk is better served by them than by a sentence written here.
 */
export function asRefusal(error: unknown): Refused {
  if (error instanceof Refused) return error;

  const name = (error as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'AbortError') {
    return new Refused('cancelled', 'Nothing was recorded.', 0);
  }
  if (name === 'InvalidStateError') {
    return new Refused('already_enrolled', 'This device is already enrolled under your name.', 0);
  }
  return new Refused('device_failed', error instanceof Error ? error.message : String(error), 0);
}
