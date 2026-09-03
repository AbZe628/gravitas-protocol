/**
 * How long this has taken, and whose step it is.
 *
 * Every other measurement in this system describes a decision. This one
 * describes the *waiting*, which nobody currently measures and which is the
 * thing an institution actually feels. A board that decides well in eleven
 * weeks and a board that decides equally well in four days are indistinguishable
 * in the record as it stands, and the difference between them is the whole
 * argument for the product.
 *
 * Three rules govern what is computed here.
 *
 * **It measures to the decision, not to the effect.** A permitting change sits
 * in a 48-hour timelock after the board has already decided. That delay is a
 * deliberate safety property, and charging it to the board's pace would punish
 * the system for working as designed. `settledAt` is the end of the board's
 * part; `inForceAt` is a separate fact and stays separate.
 *
 * **It never blames.** `waitingOn` names who has not yet acted because that is
 * a fact the record holds, and it is the only way a chair can unblock anything.
 * It carries no notion of who is slow, and nothing here ranks members. A
 * scholar who has not voted may be reading, travelling, or waiting on an answer
 * that has not come.
 *
 * **It says what it cannot see.** A matter opened here on Tuesday may have been
 * raised by a business unit three weeks earlier. Where `arrivedAt` is absent
 * the figure covers only the part this system witnessed and is marked
 * `partial`. An understated number that admits it beats a confident wrong one,
 * and this is a number people will put in front of a board.
 */

import { quorumFor, ratificationDeadline, tally } from './lifecycle.js';
import type { Board, Matter, MatterStatus } from '../types.js';

const HOUR = 3_600_000;
const DAY = 86_400_000;

/** Where the time is going right now. */
export type WaitPhase =
  /** Not yet put to the board. */
  | 'unopened'
  /** With the board, being discussed. */
  | 'deliberation'
  /** With the board, being voted on. */
  | 'voting'
  /** With nobody — a deliberate delay running its course. */
  | 'timelock'
  /** In force on a reduced quorum, still needing the full one. */
  | 'ratification'
  /** The board's part is over. */
  | 'settled';

export interface Wait {
  matterId: string;
  boardId: string;
  title: string;
  status: MatterStatus;

  /** Where the time is going. */
  phase: WaitPhase;
  /** Whole hours from arrival to now, or to settlement if it has settled. */
  hours: number;
  /** The same figure in days, to one decimal. What an interface shows. */
  days: number;

  /**
   * True when the wait is measured from `openedAt` because `arrivedAt` was
   * never recorded — the figure covers this system's part only.
   */
  partial: boolean;
  /**
   * True when settlement was inferred from the record's last event rather than
   * stamped. Only occurs on matters settled before `settledAt` existed.
   */
  inferredSettlement: boolean;

  /** Scholar ids who have not yet done the thing this phase needs. */
  waitingOn: string[];
  /** True when nothing is required of anyone and only time is passing. */
  onTheClock: boolean;

  from: string;
  to: string;
  /** One sentence an interface can show without working anything out. */
  note: string;
}

function hours(from: string, to: string): number {
  return Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / HOUR));
}

/** The last thing that happened on this matter, for records that predate stamping. */
function lastEvent(matter: Matter): string | null {
  const times = [
    ...matter.deliberation.map((d) => d.at),
    ...matter.reasoning.map((r) => r.at),
    ...matter.objections.map((o) => o.at),
    matter.inForceAt,
    matter.timelockStartedAt,
  ].filter((t): t is string => typeof t === 'string' && t.length > 0);

  if (times.length === 0) return null;
  return times.reduce((a, b) => (new Date(a).getTime() >= new Date(b).getTime() ? a : b));
}

const SETTLED: readonly MatterStatus[] = ['in_force', 'rejected', 'withdrawn', 'lapsed'];

/** Signatories with no standing position. A released one does not count. */
function yetToVote(board: Board, matter: Matter): string[] {
  return board.members
    .filter((m) => m.signatory)
    .filter((m) => !matter.reasoning.some((r) => r.scholarId === m.id && !r.releasedAt))
    .map((m) => m.id);
}

function phaseOf(board: Board, matter: Matter): { phase: WaitPhase; waitingOn: string[] } {
  switch (matter.status) {
    case 'draft':
      return { phase: 'unopened', waitingOn: [] };

    case 'deliberation':
      return {
        phase: 'deliberation',
        waitingOn: board.members
          .filter((m) => !matter.deliberation.some((d) => d.scholarId === m.id))
          .map((m) => m.id),
      };

    case 'voting':
      return { phase: 'voting', waitingOn: yetToVote(board, matter) };

    case 'timelock':
      // Nobody is holding this up. Naming members here would invite a chair to
      // chase people over a delay that exists on purpose.
      return { phase: 'timelock', waitingOn: [] };

    case 'in_force': {
      if (matter.direction !== 'restrict') return { phase: 'settled', waitingOn: [] };
      if (!ratificationDeadline(board, matter)) return { phase: 'settled', waitingOn: [] };
      const counts = tally(board, matter);
      if (counts.for >= quorumFor(board, 'permit')) return { phase: 'settled', waitingOn: [] };
      return { phase: 'ratification', waitingOn: yetToVote(board, matter) };
    }

    default:
      return { phase: 'settled', waitingOn: [] };
  }
}

function noteFor(phase: WaitPhase, days: number, waitingOn: number, partial: boolean): string {
  const d = `${days} day${days === 1 ? '' : 's'}`;
  const seen = partial ? ' since it reached this system' : '';

  switch (phase) {
    case 'unopened':
      return `Drafted ${d} ago${seen} and not yet put to the board.`;
    case 'deliberation':
      return waitingOn === 0
        ? `In deliberation ${d}${seen}. Everyone has spoken.`
        : `In deliberation ${d}${seen}. ${waitingOn} ${waitingOn === 1 ? 'member has' : 'members have'} not spoken yet.`;
    case 'voting':
      return waitingOn === 0
        ? `Open ${d}${seen}. Every signatory has voted.`
        : `Open ${d}${seen}. ${waitingOn} ${waitingOn === 1 ? 'signatory has' : 'signatories have'} not voted yet.`;
    case 'timelock':
      return `Decided. In its timelock, which runs on its own — nothing is required of anyone.`;
    case 'ratification':
      return `In force ${d}${seen} on the reduced quorum, and still short of the full one.`;
    case 'settled':
      return `Settled after ${d}${seen}.`;
  }
}

/** How long this matter has been waiting, and on whom. */
export function waitOn(board: Board, matter: Matter, now: string): Wait {
  const from = matter.arrivedAt ?? matter.openedAt;
  const partial = matter.arrivedAt === undefined;

  const settled = SETTLED.includes(matter.status);
  const stamped = matter.settledAt ?? null;
  const inferred = settled && !stamped ? lastEvent(matter) : null;
  const to = stamped ?? inferred ?? now;

  const { phase, waitingOn } = phaseOf(board, matter);
  const h = hours(from, to);
  const days = Math.round((h / 24) * 10) / 10;

  return {
    matterId: matter.id,
    boardId: matter.boardId,
    title: matter.title,
    status: matter.status,
    phase,
    hours: h,
    days,
    partial,
    inferredSettlement: inferred !== null,
    waitingOn,
    onTheClock: phase === 'timelock',
    from,
    to,
    note: noteFor(phase, days, waitingOn.length, partial),
  };
}

export interface Pace {
  boardId: string;

  /** Matters whose board part has ended and which therefore have a duration. */
  settled: number;
  /**
   * The middle one, not the average.
   *
   * One matter that sat for a year while a regulator was consulted would drag
   * a mean far from anything the board recognises, and the headline figure has
   * to be one a chair will accept as describing them.
   */
  medianDays: number | null;
  fastestDays: number | null;
  slowestDays: number | null;

  /** Still with the board now. */
  open: number;
  /** The longest-waiting open matter, which is the one to act on. */
  longestOpen: Wait | null;

  /**
   * True when any figure above rests on a matter whose arrival or settlement
   * had to be inferred. The number is still worth showing; it is not worth
   * showing as exact.
   */
  approximate: boolean;
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  const value = s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  return Math.round(value * 10) / 10;
}

/**
 * The board's pace: how long it takes, and what is waiting on it now.
 *
 * Matters still in a timelock count as settled — the board decided, and the
 * clock that follows is not theirs.
 */
export function paceOf(board: Board, matters: Matter[], now: string): Pace {
  const mine = matters.filter((m) => m.boardId === board.id);
  const waits = mine.map((m) => waitOn(board, m, now));

  const done = waits.filter((w) => w.phase === 'settled' || w.phase === 'timelock');
  const open = waits.filter((w) => w.phase !== 'settled' && w.phase !== 'timelock');

  const durations = done.map((w) => w.days);
  const longestOpen = open.reduce<Wait | null>(
    (worst, w) => (worst === null || w.hours > worst.hours ? w : worst),
    null,
  );

  return {
    boardId: board.id,
    settled: done.length,
    medianDays: median(durations),
    fastestDays: durations.length ? Math.min(...durations) : null,
    slowestDays: durations.length ? Math.max(...durations) : null,
    open: open.length,
    longestOpen,
    approximate: waits.some((w) => w.partial || w.inferredSettlement),
  };
}

/** Everything still with the board, longest wait first. */
export function waitingNow(boards: Board[], matters: Matter[], now: string): Wait[] {
  const byId = new Map(boards.map((b) => [b.id, b]));
  const out: Wait[] = [];

  for (const matter of matters) {
    const board = byId.get(matter.boardId);
    if (!board) continue;
    const wait = waitOn(board, matter, now);
    if (wait.phase === 'settled') continue;
    out.push(wait);
  }

  return out.sort((a, b) => b.hours - a.hours);
}

export const CLOCK_UNITS = { HOUR, DAY } as const;
