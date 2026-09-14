/**
 * How this board decides, and the record of every time it changed.
 *
 * ── why this is not an ordinary settings page ─────────────────────────────
 *
 * The quorum is the number of signatures that bind the institution. The
 * waiting period is how long a signatory has to object before a permission
 * takes effect. These are not preferences; they are the board's own
 * constitution, and a bank's auditor asking *how many signatures did that
 * ruling need* has to be able to get an answer that is not "whatever the
 * setting says today".
 *
 * So two things hold.
 *
 * **Every change is recorded**, with who made it, when, and what it was
 * before. Append-only, like everything else here. A quorum that quietly went
 * from three to two and back would otherwise leave a ruling carried on two
 * signatures with nothing in the record explaining how.
 *
 * **A change does not reach a vote already open.** The threshold is frozen
 * onto the matter when its vote opens — see `Matter.quorumWhenOpened`. Without
 * that, lowering the quorum mid-vote would carry a matter on fewer signatures
 * than were required when the members were asked, which is the one thing a
 * governance record must never allow.
 *
 * ── and the quorum cannot exceed the board ────────────────────────────────
 *
 * A quorum above the number of signatories is a board that can never decide
 * anything, and it would be discovered at the worst possible moment. Refused
 * with the arithmetic said out loud.
 */

import type { Board, BoardChange } from '../types.js';
import { Refused, type RefusalCode } from './lifecycle.js';

const MAX_NAME = 200;
/** A waiting period longer than this is a matter nobody will ever see decided. */
const MAX_HOURS = 24 * 90;

function refuse(code: RefusalCode, message: string): never {
  throw new Refused(code, message);
}

export interface ConstitutionChange {
  name?: string;
  quorumPermit?: number;
  quorumRestrict?: number;
  ratificationWindowHours?: number;
  rulingSeries?: string;
}

/** What each field is called when a change is described in the record. */
const CALLED: Record<keyof ConstitutionChange, string> = {
  name: 'the board’s name',
  quorumPermit: 'the signatures needed to permit',
  quorumRestrict: 'the signatures needed to restrict',
  ratificationWindowHours: 'the confirmation window, in hours',
  rulingSeries: 'how rulings are numbered',
};

/** How an absent value reads in the history, rather than the word "undefined". */
const NONE = '—';

export function changeHowItDecides(
  board: Board,
  input: ConstitutionChange,
  by: string,
  at: string,
  /** Why. Required: a change to the constitution with no reason is one nobody can review. */
  reason: string,
): Board {
  const said = (reason ?? '').trim();
  if (said.length < 20) {
    refuse(
      'no_reason_given',
      'A change to how this board decides needs a written reason. The number of signatures that ' +
        'bind the institution is not a preference, and a later reader has to be able to see why ' +
        'it moved.',
    );
  }

  const next: Board = { ...board };

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (name.length === 0) {
      refuse('no_reason_given', 'A board cannot be left without a name. It is printed on everything it issues.');
    }
    if (name.length > MAX_NAME) refuse('too_long', 'That is longer than a name.');
    next.name = name;
  }

  for (const field of ['quorumPermit', 'quorumRestrict'] as const) {
    const value = input[field];
    if (value === undefined) continue;

    if (!Number.isInteger(value) || value < 1) {
      refuse(
        'no_reason_given',
        'A quorum is a whole number of people, and at least one. A board that can decide with no ' +
          'signatures is not a board.',
      );
    }
    if (value > board.totalSignatories) {
      refuse(
        'quorum_not_met',
        `This board has ${board.totalSignatories} signatories, so a quorum of ${value} could never ` +
          'be reached. It would be discovered at the worst possible moment.',
      );
    }
    next[field] = value;
  }

  if (input.ratificationWindowHours !== undefined) {
    const hours = input.ratificationWindowHours;
    if (!Number.isInteger(hours) || hours < 1) {
      refuse('no_reason_given', 'The confirmation window is a whole number of hours, and at least one.');
    }
    if (hours > MAX_HOURS) {
      refuse('too_long', 'A window that long is a restriction nobody will ever see confirmed or lapse.');
    }
    next.ratificationWindowHours = hours;
  }

  /*
   * How rulings are numbered.
   *
   * Changing it does not renumber anything already issued — a reference the
   * bank has filed does not move — so this only decides what the next ruling
   * is called. An empty pattern means the board keeps no series and its
   * rulings are quoted by their matter id, which is a choice rather than a
   * misconfiguration.
   */
  if (input.rulingSeries !== undefined) {
    const pattern = input.rulingSeries.trim();
    if (pattern.length === 0) {
      next.rulingSeries = undefined;
    } else {
      if (pattern.length > MAX_NAME) refuse('too_long', 'That is longer than a reference.');
      if (!pattern.includes('{n}')) {
        refuse(
          'no_reason_given',
          'A numbering pattern needs {n}, which is where the number goes. Write {year} for the ' +
            'year; everything else is copied out exactly as typed — SSB/{year}/{n} gives ' +
            'SSB/2026/1.',
        );
      }
      next.rulingSeries = pattern;
    }
  }

  /*
   * What actually moved, as it moved. Fields the caller sent unchanged are not
   * recorded: a history full of "3 → 3" is a history nobody reads.
   */
  const changes: BoardChange[] = [];
  for (const field of Object.keys(CALLED) as (keyof ConstitutionChange)[]) {
    const before = board[field as keyof Board];
    const after = next[field as keyof Board];
    if (input[field] === undefined || before === after) continue;

    changes.push({
      field,
      called: CALLED[field],
      from: before === undefined ? NONE : String(before),
      to: after === undefined ? NONE : String(after),
      by,
      at,
      reason: said,
    });
  }

  if (changes.length === 0) {
    refuse(
      'no_reason_given',
      'Nothing in that would change anything. The values sent are the ones the board already holds.',
    );
  }

  return { ...next, changes: [...(board.changes ?? []), ...changes] };
}
