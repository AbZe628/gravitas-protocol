/**
 * What is coming.
 *
 * The clocks already know every date this board is held to. What they did not
 * have was one place that lists them in order, and — more usefully — a feed a
 * scholar can subscribe to from the calendar they already use.
 *
 * That last part matters more than it sounds. A deadline that only exists
 * inside an application is a deadline you have to remember to go and look for,
 * which is the failure this whole system was built against. A subscribed feed
 * puts the board's dates next to the scholar's flights and their teaching, in
 * the place they already check every morning, and it needs no email provider,
 * no integration and no account: it is a URL a calendar reads.
 *
 * Two rules.
 *
 * **Derived, never stored.** Same as attention and the manual. There is no
 * calendar table to drift from the record.
 *
 * **It lists what the record knows, and says what it does not.** Meeting
 * cadence is one of the six clocks and this system does not record meetings, so
 * the feed cannot carry them. That is stated rather than quietly omitted — a
 * calendar that looks complete and is missing the one obligation with a
 * regulatory floor would be worse than no calendar.
 */

import { rectificationClock } from './incident.js';
import { ratificationDeadline, quorumFor, tally } from './lifecycle.js';
import { reviewStatus } from './review.js';
import type { Board, Incident, Matter, Rule } from '../types.js';

export type EntryKind =
  /** A permit's timelock ends and it can be brought into force. */
  | 'timelock_ends'
  /** A restriction lapses unless the full quorum ratifies it. */
  | 'ratification_due'
  /** Thirty days from a finding of actual non-compliance. */
  | 'rectification_due'
  /** A ruling returns to the board. */
  | 'review_due';

export interface CalendarEntry {
  /** Stable across regenerations, so a subscribed calendar updates rather than duplicates. */
  id: string;
  kind: EntryKind;
  /** The day it falls due. */
  at: string;
  title: string;
  /** What it concerns: a matter, a rule, an incident. */
  subject: string;
  note: string;
  overdue: boolean;
  /**
   * Whose step it is. Empty where only time is passing — a timelock needs
   * nobody, and naming members against it would invite chasing people over a
   * delay that exists on purpose.
   */
  waitingOn: string[];
}

export interface Calendar {
  asOf: string;
  boardId: string | null;
  entries: CalendarEntry[];
  /** What the record cannot put on a calendar, named rather than omitted. */
  gaps: string[];
}

/** Signatories with no standing position. A released one does not count. */
function yetToVote(board: Board, matter: Matter): string[] {
  return board.members
    .filter((m) => m.signatory)
    .filter((m) => !matter.reasoning.some((r) => r.scholarId === m.id && !r.releasedAt))
    .map((m) => m.id);
}

const past = (at: string, now: string) => new Date(at).getTime() < new Date(now).getTime();

export function buildCalendar(params: {
  boards: Board[];
  matters: Matter[];
  rules: Rule[];
  incidents: Incident[];
  now: string;
  boardId?: string;
}): Calendar {
  const { now, boardId } = params;
  const boards = boardId ? params.boards.filter((b) => b.id === boardId) : params.boards;
  const byId = new Map(boards.map((b) => [b.id, b]));
  const mine = <T extends { boardId: string }>(xs: T[]) => xs.filter((x) => byId.has(x.boardId));

  const entries: CalendarEntry[] = [];

  for (const matter of mine(params.matters)) {
    const board = byId.get(matter.boardId)!;

    if (matter.status === 'timelock' && matter.timelockEndsAt) {
      entries.push({
        id: `timelock:${matter.id}`,
        kind: 'timelock_ends',
        at: matter.timelockEndsAt,
        title: matter.title,
        subject: matter.id,
        overdue: false,
        // Nobody is holding this up. It is time passing on purpose.
        waitingOn: [],
        note:
          'The timelock ends. Until then any signatory may object and halt the change; ' +
          'after it, the change can be brought into force.',
      });
    }

    if (matter.status === 'in_force' && matter.direction === 'restrict') {
      const due = ratificationDeadline(board, matter);
      const counts = tally(board, matter);
      const needed = quorumFor(board, 'permit');
      if (due && counts.for < needed) {
        entries.push({
          id: `ratify:${matter.id}`,
          kind: 'ratification_due',
          at: due,
          title: matter.title,
          subject: matter.id,
          overdue: past(due, now),
          waitingOn: yetToVote(board, matter),
          note:
            `In force on the reduced quorum. It needs ${needed} in favour to be ratified and has ` +
            `${counts.for}. If the window closes first it lapses and must be proposed again.`,
        });
      }
    }
  }

  for (const incident of mine(params.incidents)) {
    const clock = rectificationClock(incident, now);
    if (!clock) continue;
    entries.push({
      id: `rectify:${incident.id}`,
      kind: 'rectification_due',
      at: clock.deadline,
      title: incident.title,
      subject: incident.reference,
      overdue: clock.overdue,
      waitingOn: [],
      note: clock.note,
    });
  }

  for (const rule of mine(params.rules)) {
    const review = reviewStatus(rule, now);
    if (!review.dueAt) continue;
    entries.push({
      id: `review:${rule.id}`,
      kind: 'review_due',
      at: review.dueAt,
      title: rule.title,
      subject: rule.id,
      overdue: review.overdue,
      waitingOn: [],
      note: review.note,
    });
  }

  entries.sort((a, b) => a.at.localeCompare(b.at));

  const gaps = [
    'Meetings are not recorded by this system, so the six-month cadence — the one deadline ' +
      'with a regulatory floor behind it — cannot appear here.',
  ];
  const unscheduled = mine(params.rules).filter((r) => reviewStatus(r, now).state === 'unscheduled');
  if (unscheduled.length) {
    gaps.push(
      `${unscheduled.length} rule${unscheduled.length === 1 ? '' : 's'} in force carry no review ` +
        'interval, so nothing about them will ever appear on a calendar.',
    );
  }

  return { asOf: now, boardId: boardId ?? null, entries, gaps };
}

// ── the subscribable feed ─────────────────────────────────────────────────

const PRODID = '-//Gravitas Majlis//Shariah board calendar//EN';

/**
 * Escape a value for an iCalendar TEXT property, per RFC 5545 §3.3.11.
 *
 * Backslash first, or the escapes it inserts get escaped again.
 */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Fold a content line to 75 octets, per RFC 5545 §3.1.
 *
 * Counted in octets rather than characters: an Arabic rule title is multi-byte
 * in UTF-8, and folding on character count would produce lines a strict parser
 * rejects. Continuation lines begin with a single space.
 */
function fold(line: string): string {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;

  const out: string[] = [];
  let start = 0;
  let limit = 75;

  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    // Never split a UTF-8 sequence: back off to a lead byte.
    while (end > start && end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    out.push(bytes.slice(start, end).toString('utf8'));
    start = end;
    limit = 74; // continuation lines carry a leading space
  }

  return out.join('\r\n ');
}

/** YYYYMMDD, for an all-day event. A deadline is a day, not a moment. */
function dateOnly(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10).replace(/-/g, '');
}

/** YYYYMMDDTHHMMSSZ, for stamps. */
function stamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function nextDay(iso: string): string {
  return dateOnly(new Date(new Date(iso).getTime() + 86_400_000).toISOString());
}

const HEADING: Record<EntryKind, string> = {
  timelock_ends: 'Timelock ends',
  ratification_due: 'Ratify or it lapses',
  rectification_due: 'Rectification plan due',
  review_due: 'Review due',
};

/**
 * The calendar as a feed a scholar subscribes to.
 *
 * All-day events, because a deadline is a day rather than a moment and an event
 * pinned to 09:00 UTC lands at the wrong hour for most of the people this is
 * built for.
 *
 * `uid` is stable per obligation and `SEQUENCE` rises with the date, so a
 * calendar that has already imported an entry updates it rather than adding a
 * second copy when a window moves.
 */
export function toICalendar(calendar: Calendar, host: string): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText('Majlis — what is coming')}`,
  ];

  for (const e of calendar.entries) {
    const summary = `${HEADING[e.kind]}: ${e.title}`;
    const description = [
      e.note,
      e.waitingOn.length ? `Not yet recorded from: ${e.waitingOn.join(', ')}` : '',
      `Reference: ${e.subject}`,
    ]
      .filter(Boolean)
      .join('\n');

    lines.push(
      'BEGIN:VEVENT',
      fold(`UID:${e.id}@${host}`),
      `DTSTAMP:${stamp(calendar.asOf)}`,
      // Whole-day, and DTEND is exclusive per the specification.
      `DTSTART;VALUE=DATE:${dateOnly(e.at)}`,
      `DTEND;VALUE=DATE:${nextDay(e.at)}`,
      fold(`SUMMARY:${escapeText(summary)}`),
      fold(`DESCRIPTION:${escapeText(description)}`),
      'TRANSP:TRANSPARENT',
      e.overdue ? 'STATUS:CONFIRMED' : 'STATUS:TENTATIVE',
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');

  // RFC 5545 requires CRLF between content lines and a trailing one.
  return lines.join('\r\n') + '\r\n';
}
