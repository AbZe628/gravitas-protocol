/**
 * Gravitas Majlis — the lifecycle of a matter
 *
 * Stage One recorded decisions a board had already taken elsewhere. Stage Two
 * lets the board take them here, which means the rules that were prose in the
 * concept document have to become code that refuses.
 *
 * Nothing in this file signs anything. A matter can reach `in_force`, and that
 * records what the board decided; it does not put the change on chain. That
 * separation is deliberate and is the whole of Stage Two: the full process is
 * exercised with nothing yet resting on it.
 *
 * Two principles decide every rule below.
 *
 *   The failure mode is always toward refusal. Permitting is slow — full
 *   deliberation, full quorum, full timelock. Restricting is fast — reduced
 *   quorum, immediate effect — and is then ratified within a window or lapses.
 *   A board that cannot act is a worse outcome than the one it was protecting
 *   against, but a board that permits something by accident is worse than both.
 *
 *   A vote is not a number. `Reasoning` carries a written reason and the type
 *   makes it non-optional; this file refuses a vote without one rather than
 *   storing an empty string. The record is the product, and a tally with no
 *   reasoning in it is not a record of a deliberation.
 */

import type {
  Board,
  ChangeDirection,
  Matter,
  MatterStatus,
  Objection,
  Reasoning,
  Scholar,
} from '../types.js';
import { TIMELOCK_HOURS } from '../types.js';

/** Refusals carry a code so an interface can respond to the kind, not the prose. */
export type RefusalCode =
  | 'not_a_signatory'
  | 'not_on_this_board'
  | 'wrong_status'
  | 'no_reason_given'
  | 'already_voted'
  | 'quorum_not_met'
  | 'timelock_running'
  | 'objection_standing'
  | 'nothing_to_ratify'
  | 'ratification_window_closed'
  | 'no_deliberation';

export class Refused extends Error {
  constructor(
    readonly code: RefusalCode,
    message: string
  ) {
    super(message);
    this.name = 'Refused';
  }
}

const MIN_REASON_CHARS = 20;

/**
 * Which statuses a matter may move to from where it is. Everything not listed
 * is refused; there is no default-allow branch anywhere in this file.
 *
 * `withdrawn` is reachable from every live status because a proposer may always
 * take a matter back, and a governance system that traps its own proposals
 * teaches people not to open them.
 */
const TRANSITIONS: Record<MatterStatus, readonly MatterStatus[]> = {
  draft: ['deliberation', 'withdrawn'],
  deliberation: ['voting', 'withdrawn'],
  // Back to deliberation while the vote is still open: a board that learns
  // something after the vote opens has to be able to act on it, and its only
  // alternatives were to vote on a question it no longer believed in or to
  // withdraw the matter entirely. Not offered from timelock — by then the
  // decision is taken, and the objection path exists for exactly that.
  voting: ['deliberation', 'timelock', 'in_force', 'rejected', 'withdrawn'],
  timelock: ['in_force', 'rejected', 'withdrawn'],
  in_force: ['lapsed'],
  withdrawn: [],
  rejected: [],
  lapsed: [],
};

export function canTransition(from: MatterStatus, to: MatterStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

function requireStatus(matter: Matter, allowed: readonly MatterStatus[]): void {
  if (!allowed.includes(matter.status)) {
    throw new Refused(
      'wrong_status',
      `This matter is ${matter.status}. That step is available while it is ${allowed.join(' or ')}.`
    );
  }
}

function requireSignatory(board: Board, scholarId: string): Scholar {
  const member = board.members.find((m) => m.id === scholarId);
  if (!member) {
    throw new Refused('not_on_this_board', 'That member does not sit on this board.');
  }
  if (!member.signatory) {
    throw new Refused(
      'not_a_signatory',
      `${member.name} is an advisory member and does not hold signing authority. ` +
        'Advisory members deliberate; they do not vote.'
    );
  }
  return member;
}

function requireReason(reason: string, what: string): string {
  const trimmed = reason.trim();
  if (trimmed.length < MIN_REASON_CHARS) {
    throw new Refused(
      'no_reason_given',
      `${what} requires a written reason. The record is what the board produces, and a ` +
        'position with no reasoning attached cannot be reviewed, cited or disagreed with later.'
    );
  }
  return trimmed;
}

// ── quorum ────────────────────────────────────────────────────────────────

export interface Tally {
  for: number;
  against: number;
  abstain: number;
  /** Signatures required for this matter's direction. */
  required: number;
  /** Whether the threshold is met. Abstentions never count toward it. */
  met: boolean;
  outstanding: string[];
}

export function quorumFor(board: Board, direction: ChangeDirection): number {
  return direction === 'permit' ? board.quorumPermit : board.quorumRestrict;
}

export function tally(board: Board, matter: Matter): Tally {
  const required = quorumFor(board, matter.direction);
  const counts = { for: 0, against: 0, abstain: 0 };
  const voted = new Set<string>();

  for (const r of matter.reasoning) {
    // A released position was cast on a question that has since changed. It
    // stays in the record and stays out of the arithmetic.
    if (r.releasedAt) continue;
    // Only signatories count. An advisory member's written position stays in
    // the record and stays out of the arithmetic.
    const member = board.members.find((m) => m.id === r.scholarId);
    if (!member?.signatory) continue;
    voted.add(r.scholarId);
    counts[r.position] += 1;
  }

  const outstanding = board.members
    .filter((m) => m.signatory && !voted.has(m.id))
    .map((m) => m.id);

  return { ...counts, required, met: counts.for >= required, outstanding };
}

// ── moving through the process ────────────────────────────────────────────

export function openDeliberation(matter: Matter, at: string): Matter {
  requireStatus(matter, ['draft']);
  return { ...matter, status: 'deliberation', openedAt: matter.openedAt || at };
}

/**
 * Voting opens only after something has actually been said. A board that votes
 * on an unread proposal produces a decision it cannot defend, and the whole
 * argument for this system is that the reasoning is the valuable part.
 */
export function openVoting(matter: Matter): Matter {
  requireStatus(matter, ['deliberation']);
  if (matter.deliberation.length === 0) {
    throw new Refused(
      'no_deliberation',
      'Nothing has been said on this matter yet. Voting opens after deliberation, not instead of it.'
    );
  }
  return { ...matter, status: 'voting' };
}

/**
 * Return an open vote to deliberation.
 *
 * The board is mid-vote and something has changed — a liaison answers a
 * question of mechanism, a member reads the proposal differently, a source
 * turns out to say something else. Without this the only ways out were to
 * finish voting on a question no one believes in any more, or to withdraw the
 * matter and lose everything said on it.
 *
 * Every position already cast is released. This is the part that cannot be
 * skipped: a vote is a position on the matter as it stood when it was cast, and
 * carrying it across a change would record a member as supporting something
 * they have not seen. They vote again, or they do not, and either way it is
 * their choice rather than an inherited one.
 *
 * Requires the same authority as opening the vote, and a written reason — the
 * board will want to know why the vote stopped, and so will anyone reading the
 * record afterwards.
 */
export function returnToDeliberation(
  board: Board,
  matter: Matter,
  by: { scholarId: string; reason: string },
  at: string
): { matter: Matter; released: number } {
  requireStatus(matter, ['voting']);
  requireSignatory(board, by.scholarId);
  const reason = requireReason(by.reason, 'Returning a matter to deliberation');

  const released = matter.reasoning.filter((r) => !r.releasedAt).length;
  const reasoning = matter.reasoning.map((r) => (r.releasedAt ? r : { ...r, releasedAt: at }));

  return {
    matter: { ...matter, status: 'deliberation', reasoning },
    released,
  };
}

export function recordVote(
  board: Board,
  matter: Matter,
  vote: { scholarId: string; position: Reasoning['position']; reason: string },
  at: string
): Matter {
  requireStatus(matter, ['voting']);
  requireSignatory(board, vote.scholarId);
  const reason = requireReason(vote.reason, 'A vote');

  if (matter.reasoning.some((r) => r.scholarId === vote.scholarId && !r.releasedAt)) {
    throw new Refused(
      'already_voted',
      'That member has already recorded a position on this matter. A position may be ' +
        'withdrawn and replaced, which is recorded as such, but it cannot be cast twice.'
    );
  }

  return {
    ...matter,
    reasoning: [...matter.reasoning, { scholarId: vote.scholarId, position: vote.position, reason, at }],
  };
}

export interface Closed {
  matter: Matter;
  /** What happened, for the notification layer to describe. */
  outcome: 'timelock_started' | 'in_force' | 'rejected';
}

/**
 * Close the vote and apply the direction's own timing.
 *
 * A permitting change enters a 48-hour timelock during which any signatory may
 * object and halt it. A restricting change takes effect at once and must be
 * ratified inside the board's window or it lapses — the asymmetry is the point.
 */
export function closeVoting(board: Board, matter: Matter, at: string): Closed {
  requireStatus(matter, ['voting']);
  const result = tally(board, matter);

  if (!result.met) {
    return {
      matter: { ...matter, status: 'rejected' },
      outcome: 'rejected',
    };
  }

  const hours = TIMELOCK_HOURS[matter.direction];
  if (hours === 0) {
    return {
      matter: { ...matter, status: 'in_force', inForceAt: at },
      outcome: 'in_force',
    };
  }

  const ends = new Date(new Date(at).getTime() + hours * 3_600_000).toISOString();
  return {
    matter: { ...matter, status: 'timelock', timelockStartedAt: at, timelockEndsAt: ends },
    outcome: 'timelock_started',
  };
}

/**
 * An objection during the timelock halts the change outright rather than
 * reopening the vote. One signatory who has seen something the others did not
 * is enough; the matter returns as a fresh proposal if it returns at all.
 */
export function objectDuringTimelock(
  board: Board,
  matter: Matter,
  objection: { scholarId: string; reason: string },
  at: string
): Matter {
  requireStatus(matter, ['timelock']);
  requireSignatory(board, objection.scholarId);
  const reason = requireReason(objection.reason, 'An objection');

  const recorded: Objection = { scholarId: objection.scholarId, reason, at };
  return { ...matter, status: 'rejected', objections: [...matter.objections, recorded] };
}

export function timelockElapsed(matter: Matter, now: string): boolean {
  if (matter.status !== 'timelock' || !matter.timelockEndsAt) return false;
  return new Date(now).getTime() >= new Date(matter.timelockEndsAt).getTime();
}

export function bringIntoForce(matter: Matter, now: string): Matter {
  requireStatus(matter, ['timelock']);
  if (matter.objections.length > 0) {
    throw new Refused(
      'objection_standing',
      'An objection was raised during the timelock. The change is halted and does not take effect.'
    );
  }
  if (!timelockElapsed(matter, now)) {
    throw new Refused(
      'timelock_running',
      `The timelock runs until ${matter.timelockEndsAt}. It cannot be shortened from inside the system.`
    );
  }
  return { ...matter, status: 'in_force', inForceAt: now };
}

// ── ratification of a restriction ─────────────────────────────────────────

export function ratificationDeadline(board: Board, matter: Matter): string | null {
  if (matter.direction !== 'restrict' || !matter.inForceAt) return null;
  return new Date(
    new Date(matter.inForceAt).getTime() + board.ratificationWindowHours * 3_600_000
  ).toISOString();
}

/**
 * A restriction took effect on a reduced quorum because waiting was the greater
 * risk. It stands only if the full permitting quorum ratifies it inside the
 * window; otherwise it lapses on its own rather than persisting because nobody
 * got round to revisiting it.
 */
export function ratify(board: Board, matter: Matter, now: string): Matter {
  if (matter.direction !== 'restrict') {
    throw new Refused('nothing_to_ratify', 'Only a restriction requires ratification.');
  }
  requireStatus(matter, ['in_force']);

  const deadline = ratificationDeadline(board, matter);
  if (deadline && new Date(now).getTime() > new Date(deadline).getTime()) {
    throw new Refused(
      'ratification_window_closed',
      `The window closed at ${deadline}. The restriction lapses and must be proposed again.`
    );
  }

  const counts = tally(board, matter);
  if (counts.for < board.quorumPermit) {
    throw new Refused(
      'quorum_not_met',
      `Ratification needs the full permitting quorum of ${board.quorumPermit}; ` +
        `${counts.for} signatories are in favour.`
    );
  }
  return matter;
}

export function hasLapsed(board: Board, matter: Matter, now: string): boolean {
  const deadline = ratificationDeadline(board, matter);
  if (!deadline || matter.status !== 'in_force') return false;
  return new Date(now).getTime() > new Date(deadline).getTime();
}

export function lapse(matter: Matter): Matter {
  requireStatus(matter, ['in_force']);
  return { ...matter, status: 'lapsed' };
}

export function withdraw(matter: Matter): Matter {
  requireStatus(matter, ['draft', 'deliberation', 'voting', 'timelock']);
  return { ...matter, status: 'withdrawn' };
}
