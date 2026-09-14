/**
 * What a member may change about themselves.
 *
 * ── the four fields, and why only these ───────────────────────────────────
 *
 * Name and title, because they are printed on every ruling the member signs
 * and a board is the only place that knows when one changes. Email and
 * telephone, because a notice has to reach somebody.
 *
 * Not `signatory`, and not the board they sit on. Whether a member may bind
 * the institution is the board's own constitution, not a preference: a member
 * who could grant themselves signing authority would be a board of one.
 *
 * ── their own entry and no other ──────────────────────────────────────────
 *
 * The identity comes from the credential, never from the body. Anything else
 * is a member editing a colleague's name on a document that colleague signed.
 *
 * ── a name change does not reach backwards ────────────────────────────────
 *
 * A position now keeps the name and title it was recorded under, so an issued
 * ruling is unaffected by a correction made afterwards. That is the whole
 * reason this can be offered at all — see `Reasoning.name` in `types.ts`.
 *
 * ── an address is kept, not confirmed ─────────────────────────────────────
 *
 * The handbook asks for a new address to be confirmed before it takes effect.
 * Confirming means sending to it, and this installation sends nothing until
 * the institution wires its own relay. So a changed address is stored with
 * `emailConfirmed` false and the screen says so. Marking it confirmed here
 * would be the software claiming something it has not done.
 */

import type { Board, Scholar } from '../types.js';
import { Refused } from './lifecycle.js';

const MAX_NAME = 120;
const MAX_TITLE = 160;
const MAX_EMAIL = 320;
const MAX_TELEPHONE = 40;

/**
 * Loose on purpose.
 *
 * An address with an at-sign and something on each side of it is as much as
 * this can honestly check; anything stricter rejects addresses that work. What
 * would actually prove it is sending to it, which is exactly what this
 * installation cannot do.
 */
const LOOKS_LIKE_AN_ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface OwnDetails {
  name?: string;
  title?: string;
  email?: string | null;
  telephone?: string | null;
}

function refuse(code: 'not_on_this_board' | 'no_reason_given' | 'too_long', message: string): never {
  throw new Refused(code, message);
}

export function changeYourOwnDetails(
  board: Board,
  scholarId: string,
  input: OwnDetails,
): Board {
  const index = board.members.findIndex((m) => m.id === scholarId);
  if (index === -1) {
    refuse(
      'not_on_this_board',
      'You are not a member of this board, so there is no entry of yours to change.',
    );
  }

  const current = board.members[index];
  const next: Scholar = { ...current };

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (name.length === 0) {
      refuse(
        'no_reason_given',
        'A name cannot be emptied. It is printed on every ruling you have signed, and a signature ' +
          'block with nothing in it is worse than one with the wrong name.',
      );
    }
    if (name.length > MAX_NAME) refuse('too_long', 'That is longer than a name.');
    next.name = name;
  }

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (title.length > MAX_TITLE) refuse('too_long', 'That is longer than a title.');
    // An empty title is a real answer: not everybody carries one.
    next.title = title;
  }

  if (input.email !== undefined) {
    const email = (input.email ?? '').trim();
    if (email.length === 0) {
      delete next.email;
      delete next.emailConfirmed;
    } else {
      if (email.length > MAX_EMAIL) refuse('too_long', 'That is longer than an address.');
      if (!LOOKS_LIKE_AN_ADDRESS.test(email)) {
        refuse(
          'no_reason_given',
          'That does not look like an address anything could be sent to. It needs an at-sign with ' +
            'something on each side of it.',
        );
      }
      /*
       * Unconfirmed whenever it changes, and unchanged where it has not. A
       * member correcting their telephone should not have their confirmed
       * address quietly demoted.
       */
      if (email !== current.email) {
        next.email = email;
        next.emailConfirmed = false;
      }
    }
  }

  if (input.telephone !== undefined) {
    const telephone = (input.telephone ?? '').trim();
    if (telephone.length === 0) {
      delete next.telephone;
    } else {
      if (telephone.length > MAX_TELEPHONE) refuse('too_long', 'That is longer than a number.');
      next.telephone = telephone;
    }
  }

  const members = [...board.members];
  members[index] = next;
  return { ...board, members };
}
