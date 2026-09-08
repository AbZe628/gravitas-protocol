/**
 * A member's own account: their password, and how they are reached.
 *
 * ── the fault this closes ─────────────────────────────────────────────────
 *
 * A member was not a person in this record. They were a row in an environment
 * variable — `member-a:signatory:scrypt$…` — which the application can read
 * and cannot write. Everything followed from that one fact:
 *
 *   - nobody could change their own password;
 *   - a forgotten password could only be fixed by whoever had shell access to
 *     the deployment, editing an environment variable and restarting;
 *   - `services/notice.ts` composed the words to tell a member something had
 *     arrived and had nowhere to send them, because a `Scholar` had no address;
 *   - the calendar was a file to download again every time, not something a
 *     member's own calendar could subscribe to.
 *
 * Those read as four missing features. They are one missing idea.
 *
 * ── the environment file becomes a seed, not the authority ────────────────
 *
 * `MAJLIS_MEMBERS` still does what it always did: it is how a board is stood
 * up on a fresh installation, and it is checked at boot. What changes is that
 * once a member has set their own password, the store holds it and the store
 * wins. A deployment that keeps the old environment variable does not quietly
 * undo somebody's password change.
 *
 * ── recovery, without pretending there is a helpdesk ──────────────────────
 *
 * A Shariah board is five to nine people. There is no IT desk, most
 * installations have no mail server, and a `Scholar` may have no address at
 * all. So the reset is the one a board of nine actually performs: **the
 * secretary or the chair issues a code, and reads it to the member.** The code
 * is shown once, expires, and is stored only as a hash — so a stolen record
 * does not hand over anybody's account.
 *
 * Where an address is known and mail is configured it can be sent instead.
 * That is an improvement on the same mechanism, not a different one, and it is
 * absent rather than broken where either is missing.
 *
 * ── what this file refuses ────────────────────────────────────────────────
 *
 * **It never reveals a code that already exists.** Asking for a reset issues a
 * new one; nothing reads an outstanding code back out. An interface that could
 * show it would let anybody who reached that screen take an account.
 *
 * **It never says whether a member exists.** A reset asked for an id nobody
 * holds costs the same work and returns the same answer, because the
 * difference is a way to enumerate a board.
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { hashPassword, verifyPassword } from '../auth/members.js';

/** How long a code is good for. Long enough to read out, short enough to matter. */
export const RESET_VALID_MINUTES = 30 as const;

/** The shortest password this will accept, and why it is not longer. */
export const PASSWORD_MIN = 12 as const;

export interface Credential {
  /** The scholar this belongs to. */
  scholarId: string;
  /**
   * Which institution this member belongs to.
   *
   * Carried on the row, the way an asset carries one, because a credential
   * cannot be scoped through board membership: the `institution` role is a
   * desk at the bank and is on no board's member list, so scoping that way
   * locked exactly the people the way in was built for out of their own
   * password. Absent on rows written before this and on single-institution
   * installations, where the store serves one and the question does not arise.
   */
  institutionId?: string;
  /** scrypt$saltHex$hashHex — the same shape the environment file uses. */
  secret: string;
  /** When the member last set it themselves. Null where it came from the seed. */
  setAt: string | null;
  /**
   * An outstanding reset, as a hash. Never the code itself.
   *
   * Held here rather than in its own collection so that issuing a second code
   * replaces the first — a member who asks twice has one way in, not two.
   */
  reset?: { hash: string; issuedAt: string; expiresAt: string; issuedBy: string } | null;
}

export type PasswordRefusal =
  | 'too_short'
  | 'same_as_before'
  | 'wrong_current'
  | 'no_such_credential'
  | 'no_reset_outstanding'
  | 'reset_expired'
  | 'reset_does_not_match';

export class Refused extends Error {
  constructor(
    readonly reason: PasswordRefusal,
    message: string,
  ) {
    super(message);
    this.name = 'Refused';
  }
}

/**
 * What a password has to be.
 *
 * A length floor and nothing else. Composition rules — a capital, a digit, a
 * symbol — push people toward `Password1!` and toward writing it down, which
 * is worse for a board that shares an office than a long phrase they can
 * remember. Twelve characters, and the interface says to use words.
 */
export function checkPassword(password: string): void {
  if (password.length < PASSWORD_MIN) {
    throw new Refused(
      'too_short',
      `A password needs at least ${PASSWORD_MIN} characters. Several words you will remember beats a short one you will write down.`,
    );
  }
}

/** Change your own, having proved you know the current one. */
export function changePassword(
  current: Credential,
  currentPassword: string,
  next: string,
  at: string,
): Credential {
  if (!verifyPassword(currentPassword, current.secret)) {
    throw new Refused('wrong_current', 'That is not the current password.');
  }
  checkPassword(next);
  if (verifyPassword(next, current.secret)) {
    throw new Refused('same_as_before', 'That is the password you already have.');
  }

  // The outstanding reset, if any, is dropped. Somebody who has just proved
  // they know their password does not also need a code lying around.
  return { ...current, secret: hashPassword(next), setAt: at, reset: null };
}

/** A code, and the credential that will accept it. Shown once, then gone. */
export function issueReset(
  current: Credential,
  by: string,
  at: string,
): { credential: Credential; code: string } {
  /*
   * Read aloud, so it avoids the characters people mishear.
   *
   * No O or 0, no I or 1, no S or 5. A secretary reads this down a telephone
   * to a scholar in another country, and a code that has to be spelled out
   * twice is a code somebody writes in an email instead.
   */
  const ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXY2346789';
  const raw = randomBytes(10);
  let code = '';
  for (let i = 0; i < 10; i++) {
    if (i === 5) code += '-';
    code += ALPHABET[raw[i] % ALPHABET.length];
  }

  const expiresAt = new Date(Date.parse(at) + RESET_VALID_MINUTES * 60_000).toISOString();

  return {
    credential: {
      ...current,
      reset: { hash: hashCode(code), issuedAt: at, expiresAt, issuedBy: by },
    },
    code,
  };
}

/**
 * The code, as it is stored.
 *
 * SHA-256 rather than scrypt, deliberately: this is a high-entropy value that
 * lives for thirty minutes, not a password somebody chose, so the cost of a
 * slow hash buys nothing and would make the reset screen sluggish.
 */
function hashCode(code: string): string {
  return createHash('sha256').update(code.trim().toUpperCase(), 'utf8').digest('hex');
}

/** Set a new password with a code, without knowing the old one. */
export function redeemReset(
  current: Credential,
  code: string,
  next: string,
  at: string,
): Credential {
  const outstanding = current.reset;
  if (!outstanding) {
    throw new Refused(
      'no_reset_outstanding',
      'No reset code is outstanding. Ask the secretary or the chair to issue one.',
    );
  }
  if (Date.parse(at) > Date.parse(outstanding.expiresAt)) {
    throw new Refused(
      'reset_expired',
      `That code has expired. They are good for ${RESET_VALID_MINUTES} minutes; ask for another.`,
    );
  }

  // Constant time. A comparison that returns early tells somebody how much of
  // a guessed code was right, one character at a time.
  const a = Buffer.from(hashCode(code), 'utf8');
  const b = Buffer.from(outstanding.hash, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Refused('reset_does_not_match', 'That code is not the one that was issued.');
  }

  checkPassword(next);
  return { ...current, secret: hashPassword(next), setAt: at, reset: null };
}

/**
 * Whether a member has ever set their own password.
 *
 * Shown to the member and to the secretary, because a board still running on
 * the passwords somebody typed into a deployment configuration is a fact worth
 * seeing rather than a silence.
 */
export function stillOnTheSeed(c: Credential): boolean {
  return c.setAt === null;
}
