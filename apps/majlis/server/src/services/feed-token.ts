import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Board, Scholar } from '../types.js';

/**
 * A member's own address for the calendar feed.
 *
 * ── why this exists, and what it costs ────────────────────────────────────
 *
 * The dates a board is held to live in this application, and a deadline that
 * exists only inside an application is one somebody has to remember to go and
 * look for. The feed puts them in the calendar a scholar already checks.
 *
 * Downloading a file was what there was, and a downloaded calendar is a
 * photograph: the sitting convened tomorrow is not in the copy taken last
 * month. A calendar that subscribes re-fetches every few hours on its own —
 * and no calendar client can answer a password prompt, so a subscription is
 * reached by an address that carries its own secret.
 *
 * **That is a real cost and it is not hidden.** The address is a bearer
 * credential: whoever holds it can read this board's dates — the titles and
 * the times, which is what a calendar shows — without signing in. It is
 * shown once, it can be revoked in one press, and it opens nothing else.
 *
 * ── what it may do, and what it may not ───────────────────────────────────
 *
 * It answers for exactly one route. It is not an identity: it cannot read a
 * matter, cannot see what anybody said, cannot vote, cannot be used to sign
 * in. The one thing a person holding it learns is when this board is busy.
 *
 * ── kept as a fingerprint, never as the secret ────────────────────────────
 *
 * What the record holds is a SHA-256 of the token, so a copy of the database
 * does not hand anybody a working address. The token itself is returned once,
 * at the moment it is made, and nothing can produce it again — a member who
 * loses it issues a new one, which is also how a member who suspects theirs
 * has been seen fixes it.
 *
 * A plain hash rather than a slow one, deliberately: the token is 256 bits of
 * randomness, so there is no dictionary to run against it and nothing for the
 * slowness to buy. What slowness would buy is a way to exhaust this server by
 * asking for the calendar with a wrong token over and over, on a route that
 * by its nature answers before anybody has signed in.
 */

export interface FeedToken {
  /** SHA-256 of the token, hex. The token itself is never stored. */
  fingerprint: string;
  issuedAt: string;
}

/** 256 bits, so the fingerprint needs no stretching to be worth nothing to a guesser. */
const BYTES = 32;

export function fingerprintOf(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * A new address for this member, replacing whatever they had.
 *
 * Replacing rather than adding: two live addresses for one person is one the
 * member has forgotten about, and the point of revoking is that revoking
 * works.
 */
export function issue(
  board: Board,
  scholarId: string,
  at: string,
): { board: Board; token: string } {
  if (!board.members.some((m) => m.id === scholarId)) {
    throw new Error(`No member ${scholarId} on this board.`);
  }

  const token = randomBytes(BYTES).toString('base64url');
  const feed: FeedToken = { fingerprint: fingerprintOf(token), issuedAt: at };

  return {
    board: {
      ...board,
      members: board.members.map((m) => (m.id === scholarId ? { ...m, calendarFeed: feed } : m)),
    },
    token,
  };
}

/** Withdraw it. The address stops answering the moment this is written. */
export function revoke(board: Board, scholarId: string): Board {
  return {
    ...board,
    members: board.members.map((m) =>
      m.id === scholarId ? { ...withoutFeed(m) } : m,
    ),
  };
}

function withoutFeed(member: Scholar): Scholar {
  const { calendarFeed: _dropped, ...rest } = member;
  return rest;
}

/**
 * Whose address this is, or nobody's.
 *
 * Compared in constant time. The fingerprints are public knowledge in the
 * sense that they are in the record, but the comparison still runs the same
 * way every time: a check that returns sooner for a nearly-right token is a
 * check that tells an attacker they are nearly right.
 */
export function whose(
  boards: Board[],
  token: string,
): { boardId: string; scholarId: string } | null {
  if (!token || token.length < 16 || token.length > 200) return null;

  const wanted = Buffer.from(fingerprintOf(token), 'hex');
  let found: { boardId: string; scholarId: string } | null = null;

  for (const board of boards) {
    for (const member of board.members) {
      const held = member.calendarFeed?.fingerprint;
      if (!held || held.length !== wanted.length * 2) continue;

      /*
       * Every candidate is compared, and the answer is kept rather than
       * returned. Stopping at the first match would make the time taken
       * depend on where in the board a token sits.
       */
      if (timingSafeEqual(Buffer.from(held, 'hex'), wanted)) {
        found = { boardId: board.id, scholarId: member.id };
      }
    }
  }

  return found;
}
