/**
 * A meeting, as a record rather than as a room.
 *
 * **Majlis does not host the call.** A conversation on camera is not a record,
 * and a board that decides on one leaves a vote with no reasoning behind it —
 * which is the failure this whole system exists to replace. What Majlis owns
 * is the minute, the attendance and the agenda, and it links each agenda item
 * to the matter where the decision actually lives.
 *
 * ── the two gaps this closes ──────────────────────────────────────────────
 *
 * **The annual report.** GS-1 expects the number of meetings held and each
 * member's attendance. The report has been naming that as a gap about itself
 * since it was written, because nothing here held a meeting.
 *
 * **The calendar's sixth clock.** Meeting cadence is the one deadline with a
 * regulatory floor behind it and the only clock with nothing to count from.
 * A recorded meeting gives it a last-held date.
 *
 * ── what a meeting may not do ─────────────────────────────────────────────
 *
 * **It decides nothing.** Decisions are matters: raised, deliberated, voted on
 * with a reason attached to every vote. A minute reading "the board approved
 * the murabaha product" while no vote exists would be a decision with no
 * record behind it, and the minute would become the place people looked
 * instead of the place the reasoning is. So the agenda links to matters, and
 * the minute is an account of the discussion.
 *
 * ── and it freezes ────────────────────────────────────────────────────────
 *
 * The minute is written and rewritten freely while the meeting is open. A
 * board approves its minutes at the following meeting, and closing is that
 * act: after it, nothing about the meeting changes. There is no route to amend
 * a closed minute, and that is deliberate — a record several hands can rewrite
 * afterwards is a record nobody can rely on.
 */

import { Refused } from './lifecycle.js';
import type { AgendaItem, Attendance, Board, Matter, MatterStatus, Meeting, RoomCall } from '../types.js';

export type MeetingRefusal =
  | 'already_closed'
  | 'no_minute'
  | 'no_agenda'
  | 'not_on_this_board'
  | 'no_such_matter'
  | 'nothing_recorded'
  | 'not_yet_held'
  | 'already_settled'
  | 'no_reason_given'
  | 'already_asked'
  | 'not_asked';

function refuse(code: MeetingRefusal, message: string): never {
  throw new Refused(code as never, message);
}

/** Long enough that "met" is not a minute. */
const MIN_MINUTE_CHARS = 40;

/** Long enough that "needs discussion" is not a reason. */
const MIN_REASON_CHARS = 20;

/** The statuses where nothing is left to take into a room. */
const SETTLED_STATUSES: readonly MatterStatus[] = ['in_force', 'rejected', 'withdrawn', 'lapsed'];

export interface ConveneInput {
  boardId: string;
  at: string;
  joinUrl?: string | null;
  agenda: AgendaItem[];
}

export function convene(
  input: ConveneInput,
  board: Board,
  knownMatterIds: string[],
  by: string,
): Meeting {
  if (input.agenda.length === 0) {
    refuse(
      'no_agenda',
      'A meeting is convened around something. An agenda supplied later is one nobody could ' +
        'prepare for, and preparation is most of what a meeting is worth.',
    );
  }

  for (const item of input.agenda) {
    if (item.matterId && !knownMatterIds.includes(item.matterId)) {
      refuse(
        'no_such_matter',
        `The agenda names the matter "${item.matterId}", which is not before this board.`,
      );
    }
  }

  return {
    id: `meeting-${input.at.replace(/[^0-9]/g, '').slice(0, 12)}-${Math.random().toString(36).slice(2, 8)}`,
    boardId: board.id,
    at: input.at,
    joinUrl: input.joinUrl?.trim() || null,
    agenda: input.agenda,
    attendance: [],
    minute: '',
    recordedBy: by,
    closedAt: null,
  };
}

function requireOpen(meeting: Meeting): void {
  if (meeting.closedAt) {
    refuse(
      'already_closed',
      'This meeting is closed. A board approves its minutes and they stop moving; nothing here ' +
        'rewrites one afterwards, because a record several hands can revise is a record nobody ' +
        'can rely on.',
    );
  }
}

/**
 * Who was there.
 *
 * Recorded rather than inferred. Absence is not silence: frameworks that set an
 * attendance floor expect it to be explicable, so an entry may carry a note and
 * the note travels into the annual report with it.
 */
export function recordAttendance(
  meeting: Meeting,
  attendance: Attendance[],
  board: Board,
): Meeting {
  requireOpen(meeting);

  const members = new Set(board.members.map((m) => m.id));
  for (const a of attendance) {
    if (!members.has(a.scholarId)) {
      refuse('not_on_this_board', `${a.scholarId} does not sit on this board.`);
    }
  }

  // Last entry per member wins, so correcting one name does not need the list
  // sent again — and the order the board gave is kept.
  const byId = new Map<string, Attendance>();
  for (const a of attendance) byId.set(a.scholarId, a);

  return { ...meeting, attendance: [...byId.values()] };
}

export function writeMinute(meeting: Meeting, minute: string, by: string): Meeting {
  requireOpen(meeting);

  const text = minute.trim();
  if (text.length < MIN_MINUTE_CHARS) {
    refuse(
      'no_minute',
      'A minute is an account of what was discussed. A line saying the board met records that a ' +
        'date passed and nothing else.',
    );
  }

  return { ...meeting, minute: text, recordedBy: by };
}

/**
 * Approve the minute and stop.
 *
 * Refused before the meeting was due, because a minute written in advance is
 * not a minute; and refused with nothing recorded, because closing an empty
 * meeting would put a date in the annual report's count with nothing under it.
 */
export function close(meeting: Meeting, at: string): Meeting {
  requireOpen(meeting);

  if (at < meeting.at) {
    refuse('not_yet_held', 'This meeting has not been held yet.');
  }
  if (meeting.minute.trim() === '' || meeting.attendance.length === 0) {
    refuse(
      'nothing_recorded',
      'A meeting is closed once its minute and its attendance are recorded. Closing without them ' +
        'would add a meeting to the year’s count with nothing behind it.',
    );
  }

  return { ...meeting, closedAt: at };
}

// ── what is derived, and never stored ─────────────────────────────────────

export type MeetingState = 'convened' | 'held' | 'minuted' | 'closed';

/**
 * Where a meeting has got to.
 *
 * Derived from what is recorded rather than kept in a field, so the state and
 * the record cannot disagree — the same rule the register and the manual
 * follow.
 */
export function stateOf(meeting: Meeting, now: string): MeetingState {
  if (meeting.closedAt) return 'closed';
  if (meeting.minute.trim() !== '' && meeting.attendance.length > 0) return 'minuted';
  return now >= meeting.at ? 'held' : 'convened';
}

/**
 * Members with no attendance entry.
 *
 * Reported rather than filled in. Writing everyone not named as absent would
 * assert an absence nobody recorded, and an attendance figure the board never
 * gave is exactly the kind of number that ends up in an annual report.
 */
export function unaccountedFor(meeting: Meeting, board: Board): string[] {
  const named = new Set(meeting.attendance.map((a) => a.scholarId));
  return board.members.filter((m) => !named.has(m.id)).map((m) => m.id);
}

export interface AttendanceSummary {
  scholarId: string;
  name: string;
  attended: number;
  of: number;
  /** Absences the board explained, carried so a reader can see they were. */
  notes: string[];
}

/**
 * Attendance across a set of meetings, per member.
 *
 * Only closed meetings count. One convened for next month is not a meeting
 * held, and a report that counted it would be reporting the future.
 */
export function attendanceAcross(meetings: Meeting[], board: Board): AttendanceSummary[] {
  const held = meetings.filter((m) => m.closedAt && m.boardId === board.id);

  return board.members.map((member) => {
    const entries = held.map((m) => m.attendance.find((a) => a.scholarId === member.id));
    return {
      scholarId: member.id,
      name: member.name,
      attended: entries.filter((a) => a?.present).length,
      of: held.length,
      notes: entries.flatMap((a) => (a?.note ? [a.note] : [])),
    };
  });
}

/** The last meeting this board actually held, or null. */
export function lastHeld(meetings: Meeting[], boardId: string): Meeting | null {
  const held = meetings
    .filter((m) => m.boardId === boardId && m.closedAt)
    .sort((a, b) => a.at.localeCompare(b.at));
  return held[held.length - 1] ?? null;
}

/** The next meeting already in the diary, or null. */
export function nextConvened(meetings: Meeting[], boardId: string, now: string): Meeting | null {
  const ahead = meetings
    .filter((m) => m.boardId === boardId && !m.closedAt && m.at >= now)
    .sort((a, b) => a.at.localeCompare(b.at));
  return ahead[0] ?? null;
}

// ── what needs the room ───────────────────────────────────────────────────

/**
 * The ask that stands on a matter, or null where none does.
 *
 * The last entry, as everywhere else here: a member who asked and then
 * thought better of it added a second, and what stands is what they said
 * last. Never the count of entries — a member who changed their mind twice
 * would otherwise read as three people wanting a sitting.
 */
export function roomCallOn(matter: Matter): RoomCall | null {
  const calls = matter.wantsTheRoom ?? [];
  const last = calls.length > 0 ? calls[calls.length - 1] : null;
  return last?.wanted ? last : null;
}

/** Everyone who has asked and not taken it back, once each, in the order they asked. */
export function askedForTheRoom(matter: Matter): string[] {
  const standing = new Map<string, boolean>();
  for (const c of matter.wantsTheRoom ?? []) standing.set(c.by, c.wanted);
  return [...standing.entries()].filter(([, wanted]) => wanted).map(([who]) => who);
}

/**
 * Say that a matter needs the board in a room, or take that back.
 *
 * ── it does not convene anything ──────────────────────────────────────────
 *
 * Asking for the room is not calling a meeting. The chair convenes, and what
 * this writes down is that somebody on the board believes this one cannot be
 * settled in writing — which is a position, with a reason, like every other
 * position here. A system where any member could put a date in everyone's
 * calendar would not be a board.
 *
 * ── and the reason is not optional ────────────────────────────────────────
 *
 * *Needs discussion* on its own is the agenda item nobody prepares for. The
 * sentence a member writes here is what the rest of the board reads before
 * the sitting, and is the whole difference between an agenda and a list of
 * titles.
 */
export function callForTheRoom(
  matter: Matter,
  said: { wanted: boolean; by: string; reason: string },
  at: string,
): Matter {
  if (SETTLED_STATUSES.includes(matter.status)) {
    refuse(
      'already_settled',
      'This matter is settled. A sitting cannot reopen it — that takes a fresh matter, ' +
        'which is what makes the first decision still readable.',
    );
  }

  const why = (said.reason ?? '').trim();
  if (why.length < MIN_REASON_CHARS) {
    refuse(
      'no_reason_given',
      `Asking for the room needs a written reason of at least ${MIN_REASON_CHARS} characters. ` +
        'It is what the board reads before the sitting.',
    );
  }

  const calls = matter.wantsTheRoom ?? [];
  const standing = calls.filter((c) => c.by === said.by).pop() ?? null;
  const asked = standing?.wanted === true;

  if (said.wanted && asked) {
    refuse('already_asked', 'You have already asked for this to be taken in a room.');
  }
  if (!said.wanted && !asked) {
    refuse('not_asked', 'You have not asked for this to be taken in a room, so there is nothing to withdraw.');
  }

  return {
    ...matter,
    wantsTheRoom: [...calls, { wanted: said.wanted, by: said.by, at, reason: why }],
  };
}

/** A matter waiting for a room, and what a board needs to see beside it. */
export interface Waiting {
  matterId: string;
  title: string;
  status: string;
  /** Everyone whose ask stands, for the screen to name. Never a count. */
  asked: string[];
  /** Why the last of them asked. */
  reason: string;
  since: string;
  /** Where it is already on a sitting still to be held. */
  convenedFor: string | null;
}

/**
 * The agenda that assembles itself: what is waiting for a room, and where.
 *
 * ── what it will not do ───────────────────────────────────────────────────
 *
 * It proposes; it does not convene, and it does not order the sitting. The
 * chair takes what they take. A list that quietly became the agenda would be
 * this file setting the board's business, and a matter nobody asked about
 * would then have to be argued off a machine's list rather than onto a
 * chair's.
 *
 * ── and it says what is already down ──────────────────────────────────────
 *
 * A matter already on a convened sitting still to be held carries that date
 * rather than dropping out. Dropping it would let a chair convene twice for
 * the same thing and see nothing amiss; carrying the date lets them see it
 * and decide.
 */
export function waitingForTheRoom(
  matters: readonly Matter[],
  meetings: readonly Meeting[],
  boardId: string,
  now: string,
): Waiting[] {
  const ahead = meetings.filter((m) => m.boardId === boardId && !m.closedAt && m.at >= now);
  const downFor = new Map<string, string>();
  for (const m of ahead) {
    for (const item of m.agenda) {
      if (item.matterId && !downFor.has(item.matterId)) downFor.set(item.matterId, m.at);
    }
  }

  return matters
    .filter((m) => m.boardId === boardId)
    .map((m) => ({ matter: m, call: roomCallOn(m) }))
    .filter((x): x is { matter: Matter; call: RoomCall } => x.call !== null)
    .sort((a, b) => a.call.at.localeCompare(b.call.at))
    .map(({ matter, call }) => ({
      matterId: matter.id,
      title: matter.title,
      status: matter.status,
      asked: askedForTheRoom(matter),
      reason: call.reason,
      since: call.at,
      convenedFor: downFor.get(matter.id) ?? null,
    }));
}

/**
 * The cadence a board is expected to keep, in months.
 *
 * Not a rule this system asserts. Frameworks differ — quarterly in some
 * jurisdictions, twice a year in others — and the interval belongs to whoever
 * supervises the board. Six months is what the calendar has always named, and
 * it is stated here so a reader can see the number rather than infer it.
 */
export const CADENCE_MONTHS = 6;

export interface Cadence {
  lastHeldAt: string | null;
  dueBy: string | null;
  overdue: boolean;
  nextConvenedAt: string | null;
  note: string;
}

export function cadence(meetings: Meeting[], boardId: string, now: string): Cadence {
  const last = lastHeld(meetings, boardId);
  const next = nextConvened(meetings, boardId, now);

  if (!last) {
    return {
      lastHeldAt: null,
      dueBy: null,
      overdue: false,
      nextConvenedAt: next?.at ?? null,
      // Not overdue: a board with no recorded meeting may have met for years
      // without this system, and reporting a breach from an empty record would
      // be inventing one.
      note:
        'No meeting has been recorded for this board, so there is nothing to count the cadence ' +
        'from. That is an absence in this record rather than a finding about the board.',
    };
  }

  const due = new Date(last.at);
  due.setUTCMonth(due.getUTCMonth() + CADENCE_MONTHS);
  const dueBy = due.toISOString();

  return {
    lastHeldAt: last.at,
    dueBy,
    /**
     * A fact about the past, and nothing else changes it.
     *
     * An earlier version excused this where a meeting was already convened,
     * which was muddled twice over: a meeting in the diary does not undo an
     * interval that has already elapsed, and a meeting convened and never
     * minuted is not a meeting held at all. Whether one is convened is a
     * separate fact and is reported as one.
     */
    overdue: now > dueBy,
    nextConvenedAt: next?.at ?? null,
    note:
      `Counted as ${CADENCE_MONTHS} months from the last meeting held. The interval belongs to ` +
      'whoever supervises this board; it is stated here rather than asserted.',
  };
}
