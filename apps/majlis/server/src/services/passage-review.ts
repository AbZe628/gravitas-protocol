import {
  daysSince,
  grammarFor,
  nextOf,
  say,
  type Group,
  type Passage,
  type Step,
} from './passage-shape.js';
import type { Rule } from '../types.js';
import { reviewStatus } from './review.js';

/**
 * The passage a ruling in force makes between reviews.
 *
 * ── the shortest reading, and the one that names a real gap ───────────────
 *
 * A ruling that is in force is not finished work. It rests on facts that move:
 * a threshold the institution reports, a structure the market changed, a
 * standard the board itself amended. Coming back to it is the whole of what
 * *in force* means in this application, and until now it was a date on a
 * screen that went red.
 *
 * ── a ruling nobody will look at again ────────────────────────────────────
 *
 * `reviewStatus` already knows the worst case and already says it in words:
 * a ruling with no interval, which **nothing will bring back before the
 * board**. It said it and stopped. Nobody was asked to set one, it fell into
 * no queue, and it appeared on no list of things outstanding — so the ruling
 * least likely to be revisited was also the one the application said least
 * about.
 *
 * Here it is a step, open, belonging to the board. That is the whole fix: a
 * thing that is not done, said in the same shape as everything else that is
 * not done, so the same screens carry it.
 *
 * ── it does not decide the interval ───────────────────────────────────────
 *
 * It says there is none. How often a ruling should come back is a judgement
 * about the ruling — some rest on a rate that moves weekly and some on a
 * structure that has not changed in twenty years — and a default invented
 * here would be this file setting the board's own review policy.
 */

const { ahead, done, notApplicable, open } = grammarFor('review.step');

function stepsOf(rule: Rule, now: string): Step[] {
  const status = reviewStatus(rule, now);
  const steps: Step[] = [];

  /*
   * Nothing to review. Guidance the board issued without putting anything into
   * force has no standing to come back to, and asking for an interval on one
   * would be inventing work.
   */
  if (status.state === 'not_applicable') {
    return [
      notApplicable('interval', 'board', say('review.step.interval.notApplicable')),
      notApplicable('due', 'clock', say('review.step.due.notApplicable')),
      notApplicable('look', 'board', say('review.step.look.notApplicable')),
    ];
  }

  /*
   * The interval. Open where there is none, which is the case `reviewStatus`
   * describes as nothing bringing this back before the board.
   */
  steps.push(
    status.everyMonths === null
      ? open('interval', 'board', say('review.step.interval.standing'))
      : done('interval', 'board', rule.inForceFrom ?? null),
  );

  /*
   * The date arriving, which is the clock's and nobody's fault.
   *
   * Counted rather than judged: how many days until, or how many past. The
   * figure is in the record and the board decides what it means.
   */
  if (status.everyMonths === null) {
    steps.push(ahead('due', 'clock', say('review.step.due.noInterval')));
  } else if (status.state === 'due') {
    steps.push(
      done('due', 'clock', status.dueAt),
    );
  } else {
    steps.push(
      ahead(
        'due',
        'clock',
        status.daysUntilDue === null
          ? say('review.step.due.ahead')
          : say('review.step.due.aheadIn', { days: status.daysUntilDue }),
      ),
    );
  }

  /*
   * Looking at it again, and recording what was found.
   *
   * Open only once the date has arrived. A board may of course look sooner,
   * and nothing here stops them — but an open step on every ruling in force
   * would put the whole register in everybody's queue at once, which is the
   * same as putting nothing there.
   */
  steps.push(
    status.state === 'due'
      ? open(
          'look',
          'board',
          status.overdue && status.daysUntilDue !== null
            ? say('review.step.look.standingOverdue', { days: Math.abs(status.daysUntilDue) })
            : say('review.step.look.standing'),
        )
      : ahead('look', 'board', say('review.step.look.ahead')),
  );

  return steps;
}

export function buildReviewPassage(rule: Rule, now: string): Passage {
  const status = reviewStatus(rule, now);
  const groups: Group[] = [
    { key: 'coming_back', order: 'sequence', steps: stepsOf(rule, now) },
  ];

  const next = nextOf(groups);

  /*
   * Since it came into force, or since it was last looked at. Never a
   * reproach: a ruling that has stood for two years without needing a change
   * is a ruling that was well made.
   */
  const since = status.countingFrom ?? rule.inForceFrom ?? null;
  const days = since ? daysSince(since, now) : 0;

  return {
    of: { kind: 'review', id: rule.id },
    groups,
    next,
    waiting: next
      ? {
          days,
          since: since ?? now,
          on: next.whose,
          note: rule.lastReviewedAt
            ? say('review.waiting.sinceLooked', { days })
            : say('review.waiting.sinceInForce', { days }),
        }
      : null,
    // A ruling in force is never settled. It stands until something changes it.
    settled: null,
  };
}
