import { describe, it, expect } from 'vitest';
import type { Rule } from '../src/types.js';
import {
  BadInterval,
  addMonths,
  recordReviewed,
  reviewStatus,
  reviewsDue,
  scheduleReview,
} from '../src/services/review.js';

const T0 = '2026-01-31T09:00:00.000Z';

function rule(over: Partial<Rule> = {}): Rule {
  return {
    id: 'r1', boardId: 'b', title: 'Wrapped asset treatment',
    statement: '', parameters: [], parameterHash: '0x00', version: 1,
    inForceFrom: '2026-01-15T09:00:00.000Z',
    supersededBy: null, supersedes: null, sources: [],
    ...over,
  };
}

describe('adding months, which is not adding thirty days', () => {
  it('lands on the same day of the month', () => {
    expect(addMonths('2026-01-15T09:00:00.000Z', 6)).toBe('2026-07-15T09:00:00.000Z');
    expect(addMonths('2026-01-15T09:00:00.000Z', 12)).toBe('2027-01-15T09:00:00.000Z');
  });

  it('settles on the last day where the target month is shorter', () => {
    expect(addMonths('2026-01-31T09:00:00.000Z', 1)).toBe('2026-02-28T09:00:00.000Z');
    expect(addMonths('2026-08-31T09:00:00.000Z', 1)).toBe('2026-09-30T09:00:00.000Z');
  });

  it('handles a leap February', () => {
    expect(addMonths('2028-01-31T09:00:00.000Z', 1)).toBe('2028-02-29T09:00:00.000Z');
  });

  it('does not drift over twelve one-month steps', () => {
    let d = '2026-03-15T00:00:00.000Z';
    for (let i = 0; i < 12; i++) d = addMonths(d, 1);
    expect(d).toBe('2027-03-15T00:00:00.000Z');
  });

  it('keeps the time of day, so a due date does not creep across midnight', () => {
    expect(addMonths('2026-01-15T23:30:00.000Z', 3)).toBe('2026-04-15T23:30:00.000Z');
  });
});

describe('where one rule stands', () => {
  it('counts from the effect date until the first review', () => {
    const s = reviewStatus(rule({ reviewEveryMonths: 6 }), '2026-02-15T09:00:00.000Z');
    expect(s.state).toBe('scheduled');
    expect(s.countingFrom).toBe('2026-01-15T09:00:00.000Z');
    expect(s.dueAt).toBe('2026-07-15T09:00:00.000Z');
    expect(s.note).toContain('the day it took effect');
  });

  it('counts from the last review once there has been one', () => {
    const s = reviewStatus(
      rule({ reviewEveryMonths: 6, lastReviewedAt: '2026-05-01T09:00:00.000Z' }),
      '2026-06-01T09:00:00.000Z',
    );
    expect(s.countingFrom).toBe('2026-05-01T09:00:00.000Z');
    expect(s.dueAt).toBe('2026-11-01T09:00:00.000Z');
    expect(s.note).toContain('its last review');
  });

  it('is due on the day, and overdue after it', () => {
    const r = rule({ reviewEveryMonths: 6 });
    expect(reviewStatus(r, '2026-07-15T09:00:00.000Z').state).toBe('due');
    expect(reviewStatus(r, '2026-07-15T09:00:00.000Z').overdue).toBe(false);

    const late = reviewStatus(r, '2026-08-14T09:00:00.000Z');
    expect(late.state).toBe('due');
    expect(late.overdue).toBe(true);
    expect(late.note).toContain('30 days ago');
  });

  it('says plainly that an overdue rule is still in force', () => {
    const late = reviewStatus(rule({ reviewEveryMonths: 6 }), '2027-01-01T09:00:00.000Z');
    expect(late.note).toContain('remains in force');
  });

  it('names a rule nothing will ever raise', () => {
    const s = reviewStatus(rule(), T0);
    expect(s.state).toBe('unscheduled');
    expect(s.dueAt).toBeNull();
    expect(s.note).toContain('Nothing will bring this back to the board');
  });

  it('has nothing to say about a rule that is not in force', () => {
    expect(reviewStatus(rule({ inForceFrom: null, reviewEveryMonths: 6 }), T0).state)
      .toBe('not_applicable');
  });

  it('hands a superseded rule’s review to the rule that replaced it', () => {
    const s = reviewStatus(rule({ reviewEveryMonths: 6, supersededBy: 'r2' }), '2027-01-01T00:00:00.000Z');
    expect(s.state).toBe('not_applicable');
    expect(s.note).toContain('rule that replaced it');
  });
});

describe('what the board should be looking at', () => {
  const now = '2026-09-01T09:00:00.000Z';

  it('puts the most overdue first and the merely unscheduled last', () => {
    const list = reviewsDue(
      [
        rule({ id: 'soon', reviewEveryMonths: 12 }),
        rule({ id: 'late', reviewEveryMonths: 3 }),
        rule({ id: 'later', reviewEveryMonths: 6 }),
        rule({ id: 'never', title: 'A' }),
      ],
      now,
    );
    expect(list.map((s) => s.ruleId)).toEqual(['late', 'later', 'never']);
  });

  it('leaves out what is not yet due', () => {
    expect(reviewsDue([rule({ reviewEveryMonths: 24 })], now)).toEqual([]);
  });

  it('does not quietly omit a rule with no schedule', () => {
    const list = reviewsDue([rule()], now);
    expect(list).toHaveLength(1);
    expect(list[0].state).toBe('unscheduled');
  });

  it('has an honest answer for a board with nothing outstanding', () => {
    expect(reviewsDue([], now)).toEqual([]);
  });
});

describe('setting and recording', () => {
  it('refuses an interval that is not a schedule', () => {
    for (const bad of [0, -6, 1.5]) {
      expect(() => scheduleReview(rule(), bad)).toThrow(BadInterval);
    }
  });

  it('refuses to encode "never" as a very long wait', () => {
    expect(() => scheduleReview(rule(), 120)).toThrow(/should be said rather than encoded/);
    expect(scheduleReview(rule(), 60).reviewEveryMonths).toBe(60);
  });

  it('restarts the clock on a review, including one that confirmed the rule', () => {
    const r = scheduleReview(rule(), 6);
    expect(reviewStatus(r, '2026-08-01T09:00:00.000Z').state).toBe('due');

    const confirmed = recordReviewed(r, '2026-08-01T09:00:00.000Z');
    const after = reviewStatus(confirmed, '2026-08-02T09:00:00.000Z');
    expect(after.state).toBe('scheduled');
    expect(after.dueAt).toBe('2027-02-01T09:00:00.000Z');
  });
});
