/**
 * What somebody undertook to do, and by when.
 *
 * Every board portal has this and calls it action items. It is the least
 * glamorous thing on the list and the one a chair asks for first, because a
 * meeting that decides four things and tracks none of them is a meeting that
 * will decide the same four things again in six months.
 *
 * ── it is not a task list ─────────────────────────────────────────────────
 *
 * An undertaking is minuted. Somebody said, in a sitting, that they would do
 * a thing, and the secretary wrote it down. So it carries the meeting it came
 * from and cannot exist without one, it names a person rather than a queue,
 * and it is closed by somebody saying what happened rather than by a checkbox.
 *
 * ── and it is not a deadline this application invented ────────────────────
 *
 * `dueAt` is optional and is whatever the board said. Where the board said
 * nothing, nothing is due, and the interface says *no date was set* rather
 * than picking one. Majlis inventing a fortnight because a fortnight is a
 * round number would be the application deciding board business.
 *
 * ── closing it says what happened ─────────────────────────────────────────
 *
 * `close` takes an outcome in words. A tick would record that somebody
 * pressed a button; the point of a minuted undertaking is that the next
 * meeting can read what was actually done, which is the only thing the board
 * can act on.
 */

export type UndertakingState = 'open' | 'done' | 'dropped';

export interface Undertaking {
  id: string;
  boardId: string;
  /** The sitting it was minuted at. An undertaking cannot exist without one. */
  meetingId: string;
  /** The agenda item it came from, where it came from one. */
  matterId?: string;

  /** What they undertook to do, in the words it was minuted in. */
  what: string;
  /** Who. A person on this board, not a role and not a queue. */
  who: string;
  /** By when, where the board said. Absent is a real answer. */
  dueAt?: string;

  minutedBy: string;
  minutedAt: string;

  state: UndertakingState;
  /** What happened, in words, and who said so. Set when it stops being open. */
  outcome?: { said: string; by: string; at: string };
}

export type UndertakingRefusal =
  | 'nothing_undertaken'
  | 'nobody_named'
  | 'not_on_this_board'
  | 'backwards_due_date'
  | 'already_closed'
  | 'no_outcome_given';

export class Refused extends Error {
  constructor(
    readonly reason: UndertakingRefusal,
    message: string,
  ) {
    super(message);
    this.name = 'Refused';
  }
}

export interface MinuteInput {
  id: string;
  boardId: string;
  meetingId: string;
  matterId?: string;
  what: string;
  who: string;
  dueAt?: string;
  minutedBy: string;
  minutedAt: string;
  /** Who is on this board, so an undertaking cannot name a stranger. */
  members: readonly { id: string }[];
}

export function minute(input: MinuteInput): Undertaking {
  const what = input.what.trim();
  if (!what) {
    throw new Refused(
      'nothing_undertaken',
      'Write down what was undertaken. An entry with a name and no task is a name in a list.',
    );
  }
  if (!input.who.trim()) {
    throw new Refused('nobody_named', 'Name who undertook it. A board does not assign work to a room.');
  }
  if (!input.members.some((m) => m.id === input.who)) {
    throw new Refused(
      'not_on_this_board',
      `${input.who} is not on this board. An undertaking names somebody who was in the room.`,
    );
  }
  if (input.dueAt && Date.parse(input.dueAt) < Date.parse(input.minutedAt)) {
    throw new Refused(
      'backwards_due_date',
      'The date it is due by falls before the sitting it was minuted at.',
    );
  }

  return {
    id: input.id,
    boardId: input.boardId,
    meetingId: input.meetingId,
    ...(input.matterId ? { matterId: input.matterId } : {}),
    what,
    who: input.who,
    ...(input.dueAt ? { dueAt: input.dueAt } : {}),
    minutedBy: input.minutedBy,
    minutedAt: input.minutedAt,
    state: 'open',
  };
}

/**
 * Close it by saying what happened.
 *
 * `dropped` is a first-class outcome and not a failure. Boards decide not to
 * do things, and an undertaking quietly deleted is how a record starts
 * disagreeing with what the board actually resolved.
 */
export function close(
  current: Undertaking,
  state: 'done' | 'dropped',
  said: string,
  by: string,
  at: string,
): Undertaking {
  if (current.state !== 'open') {
    throw new Refused(
      'already_closed',
      'This was already closed. A later account of it is a note at the next sitting, not a rewrite of this one.',
    );
  }
  if (!said.trim()) {
    throw new Refused(
      'no_outcome_given',
      'Say what happened. A tick records that somebody pressed a button; the next sitting needs to read what was done.',
    );
  }

  return { ...current, state, outcome: { said: said.trim(), by, at } };
}

/** Open, and past the date the board set. Never past a date nobody set. */
export function overdue(u: Undertaking, now: string): boolean {
  return u.state === 'open' && u.dueAt !== undefined && Date.parse(u.dueAt) < Date.parse(now);
}

export interface UndertakingSummary {
  open: number;
  overdue: number;
  /** Open with no date the board set. Counted, because it is its own problem. */
  openWithNoDate: number;
  done: number;
  dropped: number;
}

export function summarise(all: readonly Undertaking[], now: string): UndertakingSummary {
  return {
    open: all.filter((u) => u.state === 'open').length,
    overdue: all.filter((u) => overdue(u, now)).length,
    openWithNoDate: all.filter((u) => u.state === 'open' && u.dueAt === undefined).length,
    done: all.filter((u) => u.state === 'done').length,
    dropped: all.filter((u) => u.state === 'dropped').length,
  };
}
