/**
 * Bringing a rule back to the board before it stops describing the world.
 *
 * Of the four kinds of work a board does, this is the only one with **no
 * external trigger**. A product approval arrives because a business unit is
 * waiting. A non-compliance arrives because something broke. A screening
 * question arrives because someone wants to hold the instrument. A periodic
 * review arrives because somebody remembered — and so it does not arrive.
 *
 * That is how a fatwa comes to govern a structure it no longer describes: not
 * through anybody's negligence, but because the calendar was the only thing
 * holding it and calendars are held by people who leave.
 *
 * So this is the highest-value automation in the system, and also the most
 * modest: it computes a date, compares it to today, and asks a question. It
 * does not re-rule, it does not withdraw, and it does not mark a rule stale.
 * A rule whose review is overdue is still in force — an expiring ruling would
 * mean compliance lapsing because nobody opened an application, which is worse
 * than the problem it solves.
 */

import type { Rule } from '../types.js';

const DAY = 86_400_000;

/**
 * Months, added properly.
 *
 * Adding thirty days twelve times is not a year, and a review that drifts by
 * five days a year is a review that eventually lands in the wrong quarter.
 * Where the day of the month does not exist in the target month — the 31st of
 * a 30-day month — it settles on the last day of that month rather than
 * spilling into the next one, which is what a person writing "in six months"
 * on a calendar means.
 */
export function addMonths(iso: string, months: number): string {
  const from = new Date(iso);
  const day = from.getUTCDate();
  const target = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + months, 1));

  const lastOfTarget = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();

  return new Date(
    Date.UTC(
      target.getUTCFullYear(),
      target.getUTCMonth(),
      Math.min(day, lastOfTarget),
      from.getUTCHours(),
      from.getUTCMinutes(),
      from.getUTCSeconds(),
      from.getUTCMilliseconds(),
    ),
  ).toISOString();
}

export type ReviewState =
  /** In force, with an interval, and not yet due. */
  | 'scheduled'
  /** Due now or overdue. */
  | 'due'
  /** In force with no interval set. Nothing will ever raise it. */
  | 'unscheduled'
  /** Not in force, superseded, or otherwise not the board's to review. */
  | 'not_applicable';

export interface ReviewStatus {
  ruleId: string;
  boardId: string;
  title: string;
  state: ReviewState;
  /** What the interval is counted from: the last review, else the effect date. */
  countingFrom: string | null;
  everyMonths: number | null;
  dueAt: string | null;
  /** Negative once it has passed. Null where there is no date. */
  daysUntilDue: number | null;
  overdue: boolean;
  note: string;
}

function daysBetween(from: string, to: string): number {
  return Math.round(((new Date(to).getTime() - new Date(from).getTime()) / DAY) * 10) / 10;
}

/** Where one rule stands. */
export function reviewStatus(rule: Rule, now: string): ReviewStatus {
  const base = {
    ruleId: rule.id,
    boardId: rule.boardId,
    title: rule.title,
    countingFrom: null,
    everyMonths: null,
    dueAt: null,
    daysUntilDue: null,
    overdue: false,
  };

  if (!rule.inForceFrom || rule.supersededBy) {
    return {
      ...base,
      state: 'not_applicable',
      note: rule.supersededBy
        ? 'Superseded. The rule that replaced it carries the review.'
        : 'Not in force, so there is nothing to review yet.',
    };
  }

  if (!rule.reviewEveryMonths || rule.reviewEveryMonths <= 0) {
    return {
      ...base,
      state: 'unscheduled',
      countingFrom: rule.lastReviewedAt ?? rule.inForceFrom,
      note:
        'In force with no review interval. Nothing will bring this back to the board, ' +
        'which is how a ruling comes to describe something that has changed.',
    };
  }

  const countingFrom = rule.lastReviewedAt ?? rule.inForceFrom;
  const dueAt = addMonths(countingFrom, rule.reviewEveryMonths);
  const days = daysBetween(now, dueAt);
  const overdue = days < 0;
  const due = days <= 0;

  const since = rule.lastReviewedAt ? 'its last review' : 'the day it took effect';

  return {
    ...base,
    state: due ? 'due' : 'scheduled',
    countingFrom,
    everyMonths: rule.reviewEveryMonths,
    dueAt,
    daysUntilDue: days,
    overdue,
    // Whole days in the sentence, for the reason set out in incident.ts: a
    // countdown expressed to a tenth reads as a measurement.
    note: overdue
      ? `Review was due ${Math.round(Math.abs(days))} days ago. The rule remains in force; what is missing is the board looking at it.`
      : due
        ? `Review is due today, ${rule.reviewEveryMonths} months from ${since}.`
        : `Next review in ${Math.round(days)} days, ${rule.reviewEveryMonths} months from ${since}.`,
  };
}

/**
 * What the board should be looking at, most overdue first.
 *
 * Includes the unscheduled, at the end. A rule that nothing will ever raise is
 * a quieter problem than one that is late, but it is the same problem, and a
 * list that omitted it would be reassuring rather than accurate.
 */
export function reviewsDue(rules: Rule[], now: string): ReviewStatus[] {
  const all = rules.map((r) => reviewStatus(r, now));
  const due = all.filter((s) => s.state === 'due');
  const unscheduled = all.filter((s) => s.state === 'unscheduled');

  due.sort((a, b) => (a.daysUntilDue ?? 0) - (b.daysUntilDue ?? 0));
  unscheduled.sort((a, b) => a.title.localeCompare(b.title));

  return [...due, ...unscheduled];
}

/**
 * Set the interval, at the moment the rule takes effect.
 *
 * Refuses zero and refuses negatives. "Review every zero months" is not a
 * schedule, and a system that accepted it would produce a rule that is
 * perpetually due and therefore never noticed.
 */
export class BadInterval extends Error {
  readonly code = 'bad_interval';
  constructor(message: string) {
    super(message);
    this.name = 'BadInterval';
  }
}

export function scheduleReview(rule: Rule, everyMonths: number): Rule {
  if (!Number.isInteger(everyMonths) || everyMonths <= 0) {
    throw new BadInterval(
      `A review interval is a whole number of months, greater than zero. Got ${everyMonths}.`,
    );
  }
  if (everyMonths > 60) {
    throw new BadInterval(
      'A review interval longer than five years is not a schedule. If the board means ' +
        'never, that should be said rather than encoded as a long wait.',
    );
  }
  return { ...rule, reviewEveryMonths: everyMonths };
}

/**
 * Record that the board looked, whatever it concluded.
 *
 * Confirming, amending and withdrawing are three different outcomes and all
 * three are a review having happened. The clock restarts on any of them —
 * including on a confirmation, which is the outcome people forget is one.
 */
export function recordReviewed(rule: Rule, at: string): Rule {
  return { ...rule, lastReviewedAt: at };
}
