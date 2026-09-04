import { describe, it, expect } from 'vitest';
import type { Board, Incident, Matter, Rule } from '../src/types.js';
import { buildCalendar, toICalendar } from '../src/services/calendar.js';

const NOW = '2026-09-03T09:00:00.000Z';
const at = (days: number) =>
  new Date(new Date(NOW).getTime() + days * 86_400_000).toISOString();

const board: Board = {
  id: 'b', institutionId: 'inst', name: 'Board',
  quorumPermit: 3, quorumRestrict: 2, totalSignatories: 3, ratificationWindowHours: 168,
  members: [
    { id: 's1', name: 'One', title: '', board: 'b', signatory: true },
    { id: 's2', name: 'Two', title: '', board: 'b', signatory: true },
    { id: 's3', name: 'Three', title: '', board: 'b', signatory: true },
  ],
};

function rule(over: Partial<Rule> = {}): Rule {
  return {
    id: 'r1', boardId: 'b', title: 'Wrapped tokens', statement: '', parameters: [],
    parameterHash: '0x0', version: 1, inForceFrom: at(-60),
    supersededBy: null, supersedes: null, sources: [], reviewEveryMonths: 6,
    ...over,
  };
}

function matter(over: Partial<Matter> = {}): Matter {
  return {
    id: 'm1', boardId: 'b', title: 'A question', origin: 'institution_request',
    direction: 'permit', status: 'deliberation', openedAt: at(-10),
    proposal: '', notDecided: [], mechanism: '', interactsWith: [],
    proposedRule: rule(), simulation: null, deliberation: [], reasoning: [],
    timelockStartedAt: null, timelockEndsAt: null, objections: [],
    inForceAt: null, sources: [],
    ...over,
  };
}

function incident(over: Partial<Incident> = {}): Incident {
  return {
    id: 'i1', boardId: 'b', reference: 'SNC-2026-001', title: 'Mispricing',
    report: '', reportedBy: 'x', reportedAt: at(-25),
    stage: 'determined', concurrences: [], determinedAt: at(-20), actual: true,
    stopped: [], plans: [], directorsApprovedAt: null, submittedToRegulatorAt: null,
    purification: null, closedAt: null, sources: [],
    ...over,
  };
}

const build = (over: Partial<Parameters<typeof buildCalendar>[0]> = {}) =>
  buildCalendar({ boards: [board], matters: [], rules: [], incidents: [], now: NOW, ...over });

describe('what the record can put on a calendar', () => {
  it('carries a timelock, and says nobody is holding it up', () => {
    const c = build({
      matters: [matter({ status: 'timelock', timelockStartedAt: at(-1), timelockEndsAt: at(1) })],
    });
    expect(c.entries).toHaveLength(1);
    expect(c.entries[0].kind).toBe('timelock_ends');
    expect(c.entries[0].waitingOn).toEqual([]);
  });

  it('carries a ratification window and names who has not voted', () => {
    const m = matter({
      direction: 'restrict', status: 'in_force', inForceAt: at(-2),
      reasoning: [{ scholarId: 's1', position: 'for', reason: 'A reason of sufficient length.', at: at(-2) }],
    });
    const c = build({ matters: [m] });

    expect(c.entries[0].kind).toBe('ratification_due');
    expect(c.entries[0].waitingOn).toEqual(['s2', 's3']);
    expect(c.entries[0].note).toContain('lapses');
  });

  it('leaves out a restriction the full quorum has already ratified', () => {
    const m = matter({
      direction: 'restrict', status: 'in_force', inForceAt: at(-2),
      reasoning: ['s1', 's2', 's3'].map((id) => ({
        scholarId: id, position: 'for' as const, reason: 'A reason of sufficient length.', at: at(-2),
      })),
    });
    expect(build({ matters: [m] }).entries).toEqual([]);
  });

  it('carries the thirty days, and marks an overrun as overdue', () => {
    const c = build({ incidents: [incident()] });
    expect(c.entries[0].kind).toBe('rectification_due');
    expect(c.entries[0].overdue).toBe(false);

    const late = build({ incidents: [incident({ determinedAt: at(-40) })] });
    expect(late.entries[0].overdue).toBe(true);
  });

  it('carries a review date and leaves out a rule that has none', () => {
    expect(build({ rules: [rule()] }).entries[0].kind).toBe('review_due');
    expect(build({ rules: [rule({ reviewEveryMonths: undefined })] }).entries).toEqual([]);
  });

  it('puts everything in date order', () => {
    const c = build({
      matters: [matter({ id: 'tl', status: 'timelock', timelockEndsAt: at(30) })],
      incidents: [incident({ determinedAt: at(-20) })],
      rules: [rule({ inForceFrom: at(-170) })],
    });
    const dates = c.entries.map((e) => e.at);
    expect([...dates].sort()).toEqual(dates);
  });

  it('ignores another board’s obligations', () => {
    const theirs = matter({ id: 'x', boardId: 'other', status: 'timelock', timelockEndsAt: at(1) });
    expect(build({ matters: [theirs] }).entries).toEqual([]);
  });
});

describe('what it cannot put on a calendar', () => {
  /**
   * Meeting cadence is the sixth clock and was the only one with nothing to
   * count from. It is a gap while no meeting has been recorded, and a dated
   * entry once one has.
   */
  it('says there is nothing to count the cadence from, while there is not', () => {
    const gaps = build().gaps.join(' ');
    expect(gaps).toContain('nothing to count the cadence from');
    // And says plainly that this is an absence here rather than a finding
    // about the board, which may have met for years without this system.
    expect(gaps).toContain('rather than a finding about the board');
    expect(build().entries.some((e) => e.kind === 'meeting_due')).toBe(false);
  });

  it('names rules that will never appear on any calendar', () => {
    const c = build({ rules: [rule({ reviewEveryMonths: undefined })] });
    expect(c.gaps.join(' ')).toContain('nothing about them will ever appear');
  });
});

describe('the feed a scholar subscribes to', () => {
  const feed = (over = {}) => toICalendar(build(over), 'majlis.test');

  it('is a well-formed calendar with CRLF throughout', () => {
    const ics = feed({ rules: [rule()] });
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:');
    // No bare newline anywhere: a strict parser rejects the file.
    expect(/[^\r]\n/.test(ics)).toBe(false);
  });

  it('writes deadlines as whole days, not as a moment in one timezone', () => {
    const ics = feed({ rules: [rule()] });
    expect(ics).toMatch(/DTSTART;VALUE=DATE:\d{8}/);
    expect(ics).toMatch(/DTEND;VALUE=DATE:\d{8}/);
    expect(ics).not.toContain('DTSTART:');
  });

  it('gives each obligation a stable id, so a subscription updates rather than duplicates', () => {
    const a = feed({ rules: [rule()] });
    const b = toICalendar(
      buildCalendar({ boards: [board], matters: [], rules: [rule()], incidents: [], now: at(1) }),
      'majlis.test',
    );
    const uid = (s: string) => s.match(/UID:(.*)\r\n/)?.[1];
    expect(uid(a)).toBe(uid(b));
  });

  it('escapes the characters that would break a line', () => {
    const ics = feed({
      rules: [rule({ title: 'Debt; equity, and a \\ backslash' })],
    });
    expect(ics).toContain('Debt\\; equity\\, and a \\\\ backslash');
  });

  it('folds a long line without splitting a multi-byte character', () => {
    const long = 'حكم في مسألة طويلة جدا '.repeat(12);
    const ics = feed({ rules: [rule({ title: long })] });

    for (const line of ics.split('\r\n')) {
      expect(Buffer.from(line, 'utf8').length).toBeLessThanOrEqual(75);
    }
    // Unfolding restores the original text, so nothing was lost or mangled.
    expect(ics.replace(/\r\n /g, '')).toContain(long.trim());
  });

  it('produces a valid empty calendar when there is nothing due', () => {
    const ics = feed();
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).not.toContain('BEGIN:VEVENT');
  });
});

/**
 * A guard, not a feature.
 *
 * The same defect surfaced three times in three places — the dashboard, the
 * annual report, and the sentences the services generate — because each was
 * fixed where it was seen rather than where it came from. Every note a service
 * writes ends up on a screen or in a document, so this holds the rule in one
 * place: a countdown expressed to a tenth of a day reads as a measurement, and
 * these are not measurements.
 */
describe('no sentence states a fraction of a day', () => {
  const decimals = /\d+\.\d+\s*day/i;

  it('holds for a rectification countdown', () => {
    for (const offset of [-40, -1, 0, 3, 17, 29]) {
      const c = build({ incidents: [incident({ determinedAt: at(offset - 30) })] });
      for (const e of c.entries) expect(e.note).not.toMatch(decimals);
    }
  });

  it('holds for a review countdown', () => {
    for (const offset of [-200, -170, -100, -10] as const) {
      const c = build({ rules: [rule({ inForceFrom: at(offset) })] });
      for (const e of c.entries) expect(e.note).not.toMatch(decimals);
    }
  });

  it('holds for a ratification window', () => {
    const m = matter({ direction: 'restrict', status: 'in_force', inForceAt: at(-3) });
    for (const e of build({ matters: [m] }).entries) expect(e.note).not.toMatch(decimals);
  });

  it('holds across everything at once, which is what a reader sees', () => {
    const c = build({
      matters: [matter({ direction: 'restrict', status: 'in_force', inForceAt: at(-3) })],
      incidents: [incident(), incident({ id: 'i2', determinedAt: at(-40) })],
      rules: [rule(), rule({ id: 'r2', inForceFrom: at(-200) })],
    });
    expect(c.entries.length).toBeGreaterThan(3);
    for (const e of c.entries) expect(e.note).not.toMatch(decimals);
  });
});
