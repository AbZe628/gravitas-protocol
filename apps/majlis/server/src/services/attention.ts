/**
 * What needs looking at, and by when.
 *
 * Derived from the record rather than kept as a queue. A stored list of
 * notifications is a second copy of the truth, and a second copy drifts: a
 * matter is withdrawn and the reminder stays, a member votes and the reminder
 * stays, the process is rebuilt and the reminders describe the old one. Working
 * it out from the matters themselves cannot go stale, because there is nothing
 * to go stale.
 *
 * It is also per member. "Three matters need attention" is not useful to
 * someone who has already acted on all three; what matters is whether *you*
 * still have something to do.
 *
 * There is no email here and no push. Majlis is behind a credential and a board
 * of five people, and a service that sends mail needs an account, a sender
 * domain and a deliverability problem. This is what the interface reads when a
 * scholar opens it, which is the honest scope for a stage whose purpose is to
 * exercise the process.
 */

import { quorumFor, ratificationDeadline, tally, timelockElapsed } from './lifecycle.js';
import type { Board, Matter } from '../types.js';

export type AttentionKind =
  | 'awaiting_your_deliberation'
  | 'awaiting_your_vote'
  | 'objection_window_open'
  | 'ready_to_take_effect'
  | 'awaiting_ratification'
  | 'overdue';

export interface AttentionItem {
  matterId: string;
  boardId: string;
  title: string;
  status: Matter['status'];
  direction: Matter['direction'];
  kind: AttentionKind;
  /** When the chance to act closes. Null where there is no clock. */
  deadline: string | null;
  /** Negative once the deadline has passed. Null where there is no clock. */
  hoursRemaining: number | null;
  /** Whether the clock has already run out. */
  overdue: boolean;
  /** One sentence an interface can show without working anything out. */
  note: string;
}

const HOUR = 3_600_000;

function hoursBetween(from: string, to: string): number {
  return (new Date(to).getTime() - new Date(from).getTime()) / HOUR;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function item(
  matter: Matter,
  kind: AttentionKind,
  note: string,
  deadline: string | null,
  now: string,
): AttentionItem {
  const hoursRemaining = deadline === null ? null : round(hoursBetween(now, deadline));
  return {
    matterId: matter.id,
    boardId: matter.boardId,
    title: matter.title,
    status: matter.status,
    direction: matter.direction,
    kind,
    deadline,
    hoursRemaining,
    overdue: hoursRemaining !== null && hoursRemaining < 0,
    note,
  };
}

export interface AttentionOptions {
  /** Who is asking. Attention is personal. */
  scholarId: string;
  now?: string;
}

/**
 * What this member still has to do about this matter, if anything.
 *
 * Returns at most one item per matter. A matter in a timelock is either
 * something you can still object to or something ready to take effect; listing
 * both would ask a reader to work out which applies, which is the work this is
 * supposed to do for them.
 */
export function attentionFor(board: Board, matter: Matter, opts: AttentionOptions): AttentionItem | null {
  const now = opts.now ?? new Date().toISOString();
  const member = board.members.find((m) => m.id === opts.scholarId);
  if (!member) return null;

  switch (matter.status) {
    case 'deliberation': {
      const spoken = matter.deliberation.some((d) => d.scholarId === opts.scholarId);
      if (spoken) return null;
      return item(
        matter,
        'awaiting_your_deliberation',
        'Open for deliberation. You have not said anything on it yet.',
        null,
        now,
      );
    }

    case 'voting': {
      if (!member.signatory) return null;
      if (matter.reasoning.some((r) => r.scholarId === opts.scholarId)) return null;

      const counts = tally(board, matter);
      const still = counts.required - counts.for;
      return item(
        matter,
        'awaiting_your_vote',
        `The vote is open and yours is not recorded. ${counts.for} of ${counts.required} in favour` +
          (still > 0 ? `; ${still} more needed.` : '; the threshold is met.'),
        null,
        now,
      );
    }

    case 'timelock': {
      if (!member.signatory) return null;
      const ends = matter.timelockEndsAt;

      if (timelockElapsed(matter, now)) {
        return item(
          matter,
          'ready_to_take_effect',
          'The timelock has run and nobody objected. It can be brought into force.',
          ends,
          now,
        );
      }
      return item(
        matter,
        'objection_window_open',
        'In its timelock. Any one signatory can halt it with a written objection until it ends.',
        ends,
        now,
      );
    }

    case 'in_force': {
      // Only a restriction has anything left to do, and only if this member has
      // not already recorded a position toward ratifying it.
      if (matter.direction !== 'restrict') return null;
      if (!member.signatory) return null;

      const deadline = ratificationDeadline(board, matter);
      if (!deadline) return null;

      const counts = tally(board, matter);
      const needed = quorumFor(board, 'permit');
      if (counts.for >= needed) return null;

      const late = hoursBetween(now, deadline) < 0;
      return item(
        matter,
        late ? 'overdue' : 'awaiting_ratification',
        late
          ? 'The ratification window has closed. This restriction has lapsed and must be proposed again.'
          : `In force on the reduced quorum. It needs ${needed} in favour to be ratified, ` +
            `and has ${counts.for}. If the window closes first it lapses.`,
        deadline,
        now,
      );
    }

    default:
      return null;
  }
}

/** Everything this member has outstanding, soonest deadline first. */
export function attentionList(
  boards: Board[],
  matters: Matter[],
  opts: AttentionOptions,
): AttentionItem[] {
  const byId = new Map(boards.map((b) => [b.id, b]));
  const out: AttentionItem[] = [];

  for (const matter of matters) {
    const board = byId.get(matter.boardId);
    if (!board) continue;
    const found = attentionFor(board, matter, opts);
    if (found) out.push(found);
  }

  return out.sort((a, b) => {
    // Anything with a clock outranks anything without, and the tightest clock
    // comes first. Something already overdue is the most urgent of all.
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    if (a.hoursRemaining === null && b.hoursRemaining === null) return a.title.localeCompare(b.title);
    if (a.hoursRemaining === null) return 1;
    if (b.hoursRemaining === null) return -1;
    return a.hoursRemaining - b.hoursRemaining;
  });
}
