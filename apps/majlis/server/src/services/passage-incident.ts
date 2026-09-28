import {
  asPast,
  daysSince,
  grammarFor,
  nextOf,
  say,
  type Group,
  type Passage,
  type Say,
  type Step,
} from './passage-shape.js';
import type { Incident } from '../types.js';

/**
 * A breach's own namespace, because `close` means one thing at the end of a
 * vote and another at the end of a breach file. See `grammarFor`.
 */
const { ahead, done, notApplicable, open } = grammarFor('breach.step');

/**
 * The passage a reported breach makes, read from the record.
 *
 * ── it was written three times ────────────────────────────────────────────
 *
 * This is the one piece of work in Majlis that had the most grammar and the
 * least agreement about it.
 *
 * `queue.ts` kept a hand table of six stages, mapping each to an act and an
 * owner. The breach screen kept **nine** steps in the component, with
 * `current: i.stage === 'reported'` written out for each, and it knew two
 * steps the queue did not: that the activity has to stop, and that
 * purification has to be paid. So the arrival screen could say a breach was
 * with the board while the breach's own screen was waiting on the bank to pay
 * — and neither was wrong about the record; they were reading different parts
 * of it.
 *
 * Both are deleted. This is the reading, and both screens call it.
 *
 * ── two halves, and they are not a matter's two halves ────────────────────
 *
 * A matter has *putting the question in shape*, which is a set, and
 * *deciding*, which is a sequence. A breach has neither. It has **establishing
 * what happened** — it was reported, the board determines whether it is
 * actually a non-compliance, and the activity stops — and then **putting it
 * right**, which runs from the plan to the close. Both are sequences, because
 * each genuinely waits on the one before.
 *
 * That is why a passage carries groups rather than two fields named after a
 * matter's phases.
 *
 * ── three of the nine are not the board's ─────────────────────────────────
 *
 * Filing a plan, putting it to the Board of Directors, filing with the
 * regulator: those belong to the institution, and saying so is most of the
 * value here. The commonest way a breach stalls is that each side believes it
 * is with the other, and forty days pass with a number on a screen and nobody
 * holding it.
 *
 * ── what it will not say ──────────────────────────────────────────────────
 *
 * It never says a plan is good enough to endorse, or that enough has been
 * purified. It says what is in the record — a plan is filed, a plan is not
 * endorsed, nothing records that anything stopped — and the board rules.
 */

/** The steps of a breach, in the order the work actually runs. */
export type IncidentStepKey =
  | 'reported'
  | 'determine'
  | 'stop'
  | 'plan'
  | 'endorse'
  | 'directors'
  | 'regulator'
  | 'purify'
  | 'close';

export const ESTABLISHING: readonly IncidentStepKey[] = ['reported', 'determine', 'stop'];

export const PUTTING_RIGHT: readonly IncidentStepKey[] = [
  'plan',
  'endorse',
  'directors',
  'regulator',
  'purify',
  'close',
];

/**
 * The stages that mean the record is finished with, and the sentence for each.
 *
 * `not_actual` is as final as `closed` and is not a failure: a board that
 * looked and found no non-compliance has done the work, and a screen that
 * showed it as an unfinished breach would be pressing a board to find one.
 */
const SETTLED: Record<string, Say> = {
  not_actual: say('breach.settled.not_actual'),
  closed: say('breach.settled.closed'),
};

/**
 * The lists a breach carries, read as empty where the record has none.
 *
 * ── found by the queue swallowing an exception ────────────────────────────
 *
 * This file read `i.stopped.length` and `i.plans.length` directly. A record
 * without those fields throws, and the arrival queue catches — deliberately,
 * so one bad record cannot take down the screen every member opens first. So
 * the row appeared with no next act and no owner at all, and nothing anywhere
 * said why.
 *
 * A reading of the record has to survive a record it does not recognise. An
 * absent list is not a malformed one: it means nothing was recorded, which is
 * a true and useful thing to say, and is exactly what an older store or a
 * partly-written breach looks like.
 */
const stoppedIn = (i: Incident) => i.stopped ?? [];
const plansIn = (i: Incident) => i.plans ?? [];
const concurrencesIn = (i: Incident) => i.concurrences ?? [];

/** The plan that stands, which is the last one filed. */
function standingPlan(i: Incident) {
  const plans = plansIn(i);
  return plans.length > 0 ? plans[plans.length - 1] : null;
}

/**
 * Establishing what happened.
 *
 * Everything here belongs to the board except the report itself, and the board
 * cannot be made to hurry: the thirty days the institution is held to run from
 * the determination, not from the report, precisely so that a board's own
 * deliberation is never counted against the bank.
 */
function establishingOf(i: Incident): Step[] {
  const steps: Step[] = [];

  // Always done. The passage of a breach begins with there being one.
  steps.push(done('reported', 'institution', i.reportedAt));

  steps.push(
    i.actual !== null
      ? done('determine', 'signatory', i.determinedAt)
      : open(
          'determine',
          'signatory',
          concurrencesIn(i).length > 0
            ? say('breach.step.determine.standingSome', { said: concurrencesIn(i).length })
            : say('breach.step.determine.standingNone'),
        ),
  );

  /*
   * What stopped.
   *
   * Only once the board has found it actual, and genuinely not applicable
   * where it found the opposite: an event that is not a non-compliance has
   * nothing to stop, and reporting it as outstanding would be the software
   * pressing for a remedy the board declined to order.
   */
  /*
   * The board's, not the bank's — checked against the route rather than
   * reasoned about. `/incidents/:id/stopped` takes a signatory's credential,
   * because naming what stops is part of the finding and the finding is the
   * board's. The bank carries it out; the board says what it is.
   *
   * Written the other way here first, on the reasoning that stopping an
   * activity is something a bank does. The route says otherwise, and the route
   * is what actually refuses: an owner this file invented would have put a
   * board's own act into the bank's column on every screen that reads it.
   */
  if (i.actual === null) {
    steps.push(ahead('stop', 'signatory', say('breach.step.stop.ahead')));
  } else if (!i.actual) {
    steps.push(notApplicable('stop', 'signatory', say('breach.step.stop.notActual')));
  } else {
    steps.push(
      stoppedIn(i).length > 0
        ? done('stop', 'signatory', i.determinedAt)
        : open('stop', 'signatory', say('breach.step.stop.standing')),
    );
  }

  return steps;
}

/**
 * Putting it right.
 *
 * None of this applies where the board found the event was not a
 * non-compliance. Six steps reported as outstanding on a breach the board has
 * already dismissed would be six jobs nobody will ever do, sitting in
 * somebody's queue.
 */
function puttingRightOf(i: Incident, now: string): Step[] {
  const steps: Step[] = [];

  if (i.actual === false) {
    for (const key of PUTTING_RIGHT) {
      steps.push(notApplicable(key, 'institution', say('breach.notActual')));
    }
    return steps;
  }

  const determined = i.actual === true;
  const plan = standingPlan(i);
  const endorsed = Boolean(plan?.endorsedAt);

  /*
   * The plan, and the clock the institution is actually held to.
   *
   * Thirty days from the determination. Said as a figure on the step rather
   * than as a deadline this file invented: the number is in the record, and
   * how many of them have gone is a fact about the past.
   */
  if (!determined) {
    steps.push(ahead('plan', 'institution', say('breach.step.plan.ahead')));
  } else if (plan) {
    steps.push(done('plan', 'institution', plan.filedAt));
  } else {
    const days = i.determinedAt ? daysSince(i.determinedAt, now) : 0;
    steps.push(
      open(
        'plan',
        'institution',
        plansIn(i).length > 0
          ? say('breach.step.plan.standingAgain', { days, sent: plansIn(i).length })
          : say('breach.step.plan.standing', { days }),
      ),
    );
  }

  steps.push(
    endorsed
      ? done('endorse', 'signatory', plan?.endorsedAt ?? null)
      : plan
        ? open('endorse', 'signatory', say('breach.step.endorse.standing'))
        : ahead('endorse', 'signatory', say('breach.step.endorse.ahead')),
  );

  steps.push(
    i.directorsApprovedAt
      ? done('directors', 'institution', i.directorsApprovedAt)
      : endorsed
        ? open('directors', 'institution', say('breach.step.directors.standing'))
        : ahead('directors', 'institution', say('breach.step.directors.ahead')),
  );

  steps.push(
    i.submittedToRegulatorAt
      ? done('regulator', 'institution', i.submittedToRegulatorAt)
      : i.directorsApprovedAt
        ? open('regulator', 'institution', say('breach.step.regulator.standing'))
        : ahead('regulator', 'institution', say('breach.step.regulator.ahead')),
  );

  /*
   * Purification.
   *
   * Runs beside the plan rather than after the regulator, because what was
   * earned impermissibly is owed from the moment the board says so — it does
   * not wait on anybody's approval. The screen knew this and the queue did
   * not, which is how a breach could read as *with the board* while the money
   * was outstanding.
   */
  if (!determined) {
    /*
     * A signatory, because the first act inside this step is the board's.
     *
     * Purification is the one step carrying two acts by two people: the board
     * prescribes what is owed (`/incidents/:id/purification`, a signatory),
     * and the institution records paying it (`/purification/paid`, the
     * secretary or the liaison). So the owner moves with which of the two is
     * outstanding. It said *the institution* before anything at all had
     * happened, which put a board's own ruling in the bank's column.
     */
    steps.push(ahead('purify', 'signatory', say('breach.step.purify.ahead')));
  } else if (i.purification?.paidAt) {
    steps.push(done('purify', 'institution', i.purification.paidAt));
  } else if (i.purification) {
    steps.push(open('purify', 'institution', say('breach.step.purify.standingComputed')));
  } else {
    steps.push(open('purify', 'signatory', say('breach.step.purify.standing')));
  }

  const purified = Boolean(i.purification?.paidAt);
  steps.push(
    i.stage === 'closed'
      ? done('close', 'signatory', i.closedAt)
      : purified && i.submittedToRegulatorAt
        ? open('close', 'signatory', say('breach.step.close.standing'))
        : ahead('close', 'signatory', say('breach.step.close.ahead')),
  );

  return steps;
}

/**
 * Where a breach now waits.
 *
 * Not who is at fault. A breach whose plan is with the Board of Directors
 * waits on the institution and nobody on this board is holding it up.
 */
function waitingOn(next: Step | null) {
  return next?.whose ?? 'board';
}

export function buildIncidentPassage(incident: Incident, now: string): Passage {
  const settledNote = SETTLED[incident.stage] ?? null;

  const establishing = establishingOf(incident).map((s) => (settledNote ? asPast(s) : s));
  const puttingRight = puttingRightOf(incident, now).map((s) => (settledNote ? asPast(s) : s));

  const groups: Group[] = [
    { key: 'establishing', order: 'sequence', steps: establishing },
    { key: 'putting_right', order: 'sequence', steps: puttingRight },
  ];

  const next = settledNote ? null : nextOf(groups);
  const days = daysSince(incident.reportedAt, now);

  return {
    of: { kind: 'breach', id: incident.id },
    groups,
    next,
    waiting: settledNote
      ? null
      : {
          days,
          since: incident.reportedAt,
          on: waitingOn(next),
          note: say('breach.waiting', { days }),
        },
    settled: settledNote,
  };
}
