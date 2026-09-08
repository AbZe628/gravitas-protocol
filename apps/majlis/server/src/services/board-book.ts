/**
 * The board book: everything for one sitting, in one document.
 *
 * This is the thing every board portal sold to corporate directors is built
 * around, and it is the last one Majlis did not have. Diligent, Nasdaq
 * Boardvantage, Convene and BoardEffect all do the same thing: some days
 * before a meeting, each director is handed one document containing the
 * agenda and, under each item, everything needed to decide it. They read it on
 * a plane. They arrive having read it.
 *
 * `services/pack.ts` built that for one matter. This is the same idea for a
 * whole sitting: the agenda in order, a pack under each item that is a matter,
 * and — the part a Shariah board needs and a corporate one does not — what
 * has drifted or gone unexamined since the board last met.
 *
 * ── it assembles, and it composes nothing ─────────────────────────────────
 *
 * Same rule as the pack and the ruling. Every sentence was written by a member
 * of the board, by the institution, or by a service that already computed it.
 * No summary of an agenda item, no running order suggested, no recommendation
 * on any item. A board book that told a scholar what to think before the
 * meeting would be worse than one that told them during it.
 *
 * ── the last part is what a corporate portal has no reason to hold ────────
 *
 * `sinceWeMet` is the standing business: rulings whose review date has passed,
 * holdings that have left the limits a ruling set, holdings nobody has ever
 * examined. A corporate board's papers are the papers for the items. A Shariah
 * board's are those plus the standing question of whether the last set of
 * decisions is still being honoured, and nothing in the market waits for the
 * agenda to be drawn up.
 *
 * ── an agenda item that is not a matter ───────────────────────────────────
 *
 * Plenty of items are not: *any other business*, an appointment, a report from
 * the auditor. Those carry no pack and the book says so in place of one,
 * rather than printing an empty section that reads like a matter with nothing
 * in it.
 */

import { assemblePack, type Pack } from './pack.js';
import { stateOf, unaccountedFor, type MeetingState } from './meeting.js';
import type { EnforcementSnapshot } from './enforcement.js';
import type { Undertaking } from './undertaking.js';
import type { Board, Computation, Matter, Meeting } from '../types.js';

export interface BookItem {
  /** Where it sits on the agenda, from one. */
  number: number;
  /** The item as the secretary wrote it. */
  item: string;
  /** Set where the item is a matter already before the board. */
  matterId: string | null;
  /**
   * Everything for that matter, in reading order.
   *
   * Null where the item is not a matter, or where the matter it names is not
   * in this board's record — which is a fault worth seeing rather than
   * hiding, and `missing` says which of the two it is.
   */
  pack: Pack | null;
  /** True where the item names a matter that could not be found. */
  missing: boolean;
}

export interface StandingItem {
  kind: 'review_due' | 'moved' | 'never_examined';
  /** What it concerns, in the record's own words. */
  what: string;
  /** Where to look. A ruling, a holding. */
  ref: string;
  /** Plain words about why it is here. Never composed — a stated fact. */
  note: string;
}

export interface BoardBook {
  meetingId: string;
  boardId: string;
  at: string;
  state: MeetingState;
  joinUrl: string | null;

  items: BookItem[];

  /**
   * Who is expected, and who has not been accounted for.
   *
   * Before a meeting this is the invitation list; after it, attendance. Both
   * are the same field because a book printed the morning after should show
   * what actually happened.
   */
  expected: { scholarId: string; name: string; present: boolean | null; note?: string }[];
  unaccountedFor: string[];

  /** The standing business, whether or not anybody put it on the agenda. */
  sinceWeMet: StandingItem[];

  /**
   * What was undertaken at this sitting, and what is still open from before.
   *
   * Both, on purpose. A director reading the papers wants to know what they
   * agreed to last time as much as what is on the agenda this time, and a
   * board that only ever showed the current sitting's undertakings would let
   * an old one go quiet.
   */
  undertakings: { fromThisSitting: Undertaking[]; stillOpenFromBefore: Undertaking[] };

  /** What the book could not tell you. Assembled, never written by hand. */
  gaps: string[];

  assembledAt: string;
}

export interface BookInput {
  board: Board;
  meeting: Meeting;
  /** Every matter of this board, so an agenda item can be resolved to one. */
  allMatters: readonly Matter[];
  computations: readonly Computation[];
  enforcement: EnforcementSnapshot;
  /** The standing business, found by the services that already find it. */
  standing?: readonly StandingItem[];
  /** Every undertaking of this board. Split here, not by the caller. */
  undertakings?: readonly Undertaking[];
  assembledAt: string;
}

export function assembleBook(input: BookInput): BoardBook {
  const { board, meeting, allMatters, computations, enforcement, assembledAt } = input;

  const byId = new Map(allMatters.map((m) => [m.id, m]));

  const items: BookItem[] = meeting.agenda.map((entry, i) => {
    const matterId = entry.matterId ?? null;
    const matter = matterId ? byId.get(matterId) : undefined;

    return {
      number: i + 1,
      item: entry.item,
      matterId,
      pack: matter
        ? assemblePack({ board, matter, allMatters, computations, enforcement, assembledAt })
        : null,
      missing: Boolean(matterId) && matter === undefined,
    };
  });

  const seen = new Map(meeting.attendance.map((a) => [a.scholarId, a]));
  const expected = board.members.map((m) => {
    const a = seen.get(m.id);
    return {
      scholarId: m.id,
      name: m.name,
      // Null, not false: before a meeting nobody is absent, they are simply
      // not yet recorded. Printing them as absent would be an accusation.
      present: a ? a.present : null,
      ...(a?.note ? { note: a.note } : {}),
    };
  });

  const sinceWeMet = [...(input.standing ?? [])];

  const allUndertakings = input.undertakings ?? [];
  const undertakings = {
    fromThisSitting: allUndertakings.filter((u) => u.meetingId === meeting.id),
    stillOpenFromBefore: allUndertakings.filter(
      (u) => u.meetingId !== meeting.id && u.state === 'open',
    ),
  };

  const gaps: string[] = [];

  const withoutPack = items.filter((x) => x.matterId === null).length;
  if (withoutPack > 0) {
    gaps.push(
      `${withoutPack} of the agenda items are not matters before the board, so there are no papers for them. Whoever put them on the agenda holds what is needed.`,
    );
  }

  const notFound = items.filter((x) => x.missing);
  if (notFound.length > 0) {
    gaps.push(
      `${notFound.length} of the agenda items name a matter that is not in this board's record. The item is printed; the papers could not be found.`,
    );
  }

  if (meeting.agenda.length === 0) {
    gaps.push('No agenda has been set, so this book holds nothing but the standing business.');
  }

  if (sinceWeMet.length === 0) {
    gaps.push(
      'Nothing is shown as outstanding since the board last met. That is what the record holds; it is not a statement that nothing has moved.',
    );
  }

  if (!meeting.closedAt && meeting.minute.trim() === '') {
    gaps.push('No minute has been written yet, so what was decided is not in this book.');
  }

  return {
    meetingId: meeting.id,
    boardId: meeting.boardId,
    at: meeting.at,
    state: stateOf(meeting, assembledAt),
    joinUrl: meeting.joinUrl,

    items,
    expected,
    unaccountedFor: unaccountedFor(meeting, board),

    sinceWeMet,
    undertakings,
    gaps,
    assembledAt,
  };
}
