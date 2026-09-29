import {
  daysSince,
  grammarFor,
  nextOf,
  say,
  type Group,
  type Passage,
  type Step,
} from './passage-shape.js';
import { overdue, type Undertaking } from './undertaking.js';

/**
 * The passage an undertaking makes from the minute to the record.
 *
 * ── the only record that already names a person ───────────────────────────
 *
 * Everywhere else in this application work belongs to a role — the board, a
 * signatory, the institution — and whose it is has to be inferred from a
 * credential. An undertaking is different: somebody said in a room that they
 * would do a thing, and the minute has their name on it.
 *
 * So this is the one reading that can say *this is yours* and mean a person.
 * It is carried on the step as `who` rather than folded into the owner,
 * which is a role on every kind. Every other `who` is an assignment, written
 * on after the reading by `withAssignments`; this one is the reading's own,
 * and no assignment moves it — nobody hands on who made a promise.
 *
 * ── a date the board never set is its own problem ─────────────────────────
 *
 * `undertakingSummary` already counts them: open, with no date. An
 * undertaking with no date cannot be late, so it never appears on any list of
 * things past due, and the ones most likely to be forgotten are the ones the
 * application said least about. It is a step here, open, belonging to the
 * board — not to the person who gave it, because when a thing is wanted by is
 * the room's decision and not theirs.
 *
 * ── and closing it is saying what happened ────────────────────────────────
 *
 * Never a tick. An undertaking is closed by an account of what was done, in
 * words, by the person who did it — which is why `outcome` carries `said` and
 * not a boolean.
 */

const { done, notApplicable, open } = grammarFor('undertaking.step');

function stepsOf(u: Undertaking, now: string): Step[] {
  const steps: Step[] = [];

  steps.push(done('given', 'board', u.minutedAt));

  /*
   * The date. Only while it is still open: a thing already done did not need
   * one, and asking for a date on a closed undertaking would be asking for
   * paperwork about the past.
   */
  if (u.state !== 'open') {
    steps.push(
      u.dueAt
        ? done('due_date', 'board', u.minutedAt)
        : notApplicable('due_date', 'board', say('undertaking.step.due_date.closed')),
    );
  } else if (u.dueAt) {
    steps.push(done('due_date', 'board', u.minutedAt));
  } else {
    steps.push(open('due_date', 'board', say('undertaking.step.due_date.standing')));
  }

  /*
   * Doing it, and saying what happened.
   *
   * One step and not two, because the record holds one fact: an account, or
   * nothing. Splitting it would invent a moment — *done but not yet written
   * up* — that nothing here can tell from a thing nobody has started.
   */
  if (u.state === 'done') {
    steps.push(done('account', 'board', u.outcome?.at ?? null));
  } else if (u.state === 'dropped') {
    steps.push(notApplicable('account', 'board', say('undertaking.step.account.dropped')));
  } else {
    const days = daysSince(u.minutedAt, now);
    /*
     * The one step carrying a name.
     *
     * Whoever gave the undertaking is the one who says what happened; setting
     * a date above is the room's. Putting the name on the record rather than
     * on this step listed a member against an act that was never theirs.
     */
    steps.push({
      ...open(
        'account',
        'board',
        overdue(u, now)
          ? say('undertaking.step.account.standingLate', { days })
          : say('undertaking.step.account.standing', { days }),
      ),
      who: u.who,
    });
  }

  return steps;
}

const SETTLED = {
  done: say('undertaking.settled.done'),
  dropped: say('undertaking.settled.dropped'),
} as const;

export function buildUndertakingPassage(u: Undertaking, now: string): Passage {
  const settledNote = u.state === 'open' ? null : SETTLED[u.state];

  const groups: Group[] = [
    { key: 'carrying_out', order: 'sequence', steps: stepsOf(u, now) },
  ];

  const next = settledNote ? null : nextOf(groups);
  const days = daysSince(u.minutedAt, now);

  return {
    of: { kind: 'undertaking', id: u.id },
    groups,
    next,
    waiting: settledNote
      ? null
      : {
          days,
          since: u.minutedAt,
          on: next?.whose ?? 'board',
          note: overdue(u, now)
            ? say('undertaking.waiting.late', { days })
            : say('undertaking.waiting', { days }),
        },
    settled: settledNote,
  };
}
