import { describe, it, expect } from 'vitest';
import { Refused } from '../src/services/lifecycle.js';
import {
  TERM,
  coverageOf,
  coveringYear,
  exceptionsIn,
  notExamined,
  record,
  type RecordInput,
} from '../src/services/examination.js';
import { structureById } from '../src/data/structures.js';
import type { Matter } from '../src/types.js';

/**
 * The comparison the whole discipline names as its commonest failure: what the
 * board approved against what the institution actually executed.
 *
 * Most of what is tested here is what it refuses to do — choose the sample,
 * reach a verdict, or compute a coverage figure out of a denominator nobody
 * supplied.
 */

const NOW = '2026-09-07T09:00:00.000Z';

const matter = (over: Partial<Matter> = {}): Matter =>
  ({
    id: 'matter-2026-050',
    boardId: 'board-1',
    title: 'A murabaha for the trade desk',
    origin: 'institution_request',
    direction: 'permit',
    status: 'in_force',
    openedAt: '2026-01-01T09:00:00.000Z',
    proposal: 'Approve the murabaha as documented.',
    notDecided: [],
    mechanism: '',
    interactsWith: [],
    assetIds: [],
    structureId: 'murabaha',
    findings: [],
    proposedRule: {
      id: 'rule-1',
      boardId: 'board-1',
      title: 'A murabaha for the trade desk',
      statement: 'Permitted on the terms below.',
      parameters: [
        { key: 'maxTenorMonths', value: '24', unit: 'months', meaning: 'Payable within two years.' },
      ],
      parameterHash: '0xabc',
      version: 1,
      inForceFrom: NOW,
      supersededBy: null,
      supersedes: null,
      sources: [],
    },
    simulation: null,
    deliberation: [],
    reasoning: [],
    timelockStartedAt: null,
    timelockEndsAt: null,
    objections: [],
    inForceAt: NOW,
    sources: [],
    ...over,
  }) as Matter;

const input = (over: Partial<RecordInput> = {}): RecordInput => ({
  from: '2026-01-01T00:00:00.000Z',
  to: '2026-06-30T00:00:00.000Z',
  howChosen: 'Every murabaha over one million dirhams, plus ten drawn at random from the rest.',
  population: 240,
  examined: 30,
  findings: [
    {
      against: 'ownership-before-sale',
      held: 'held',
      exceptions: 0,
      note: '',
    },
  ],
  ...over,
});

const made = (over: Partial<RecordInput> = {}, m = matter()) =>
  record('exam-1', m, 'auditor-a', NOW, input(over));

const code = (fn: () => unknown): string | null => {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof Refused ? e.code : `threw ${String(e)}`;
  }
};

describe('what it refuses', () => {
  it('refuses an examination of a matter the board has not decided', () => {
    for (const status of ['draft', 'deliberation', 'voting', 'rejected'] as const) {
      expect(code(() => made({}, matter({ status })))).toBe('wrong_status');
    }
  });

  /*
   * Choosing the sample is most of what an audit is. A system that chose it
   * would be conducting the audit while appearing to hold it.
   */
  it('refuses a sample nobody accounted for', () => {
    expect(code(() => made({ howChosen: 'random' }))).toBe('no_basis_for_sample');
  });

  it('refuses an examination that looked at nothing', () => {
    expect(code(() => made({ examined: 0 }))).toBe('nothing_examined');
  });

  it('refuses more examined than the period is said to contain', () => {
    expect(code(() => made({ population: 10, examined: 30 }))).toBe('more_examined_than_exist');
  });

  it('refuses more exceptions than transactions examined', () => {
    expect(
      code(() =>
        made({
          examined: 5,
          findings: [
            { against: 'ownership-before-sale', held: 'exceptions', exceptions: 9, note: 'The bank was not on title in nine files.' },
          ],
        }),
      ),
    ).toBe('more_exceptions_than_examined');
  });

  it('refuses an exception nobody described', () => {
    expect(
      code(() =>
        made({
          findings: [{ against: 'ownership-before-sale', held: 'exceptions', exceptions: 3, note: 'bad' }],
        }),
      ),
    ).toBe('no_finding_note');
  });

  it('refuses a finding that says held and counts exceptions', () => {
    expect(
      code(() =>
        made({
          findings: [{ against: 'ownership-before-sale', held: 'held', exceptions: 2, note: '' }],
        }),
      ),
    ).toBe('held_with_exceptions');
  });

  it('refuses exceptions with no count', () => {
    expect(
      code(() =>
        made({
          findings: [
            { against: 'ownership-before-sale', held: 'exceptions', exceptions: 0, note: 'Something was wrong in several files.' },
          ],
        }),
      ),
    ).toBe('exceptions_without_a_count');
  });

  it('refuses a finding against something this ruling never set', () => {
    expect(
      code(() => made({ findings: [{ against: 'invented-condition', held: 'held', exceptions: 0, note: '' }] })),
    ).toBe('not_in_this_ruling');
  });

  it('refuses a period that ends before it starts', () => {
    expect(code(() => made({ from: '2026-06-30T00:00:00.000Z', to: '2026-01-01T00:00:00.000Z' }))).toBe(
      'backwards_period',
    );
  });
});

describe('what it records', () => {
  it('accepts a finding against an operative term as well as a condition', () => {
    const e = made({
      findings: [
        { against: TERM + 'maxTenorMonths', held: 'exceptions', exceptions: 2, note: 'Two files ran to thirty months.' },
      ],
    });
    expect(e.findings[0].against).toBe('term:maxTenorMonths');
    expect(exceptionsIn(e)).toBe(2);
  });

  /*
   * An examination against terms the board has since amended is an examination
   * against the older ones, and the hash is what says so.
   */
  it('records the terms as they stood, not as they are now', () => {
    expect(made().parameterHash).toBe('0xabc');
    expect(made().ruleId).toBe('rule-1');
  });

  it('keeps the examiner’s own words for how the sample was chosen', () => {
    expect(made().howChosen).toContain('ten drawn at random');
  });

  it('reaches no verdict anywhere in what it produces', () => {
    const json = JSON.stringify(made()).toLowerCase();
    for (const word of ['compliant', 'passed', 'failed', 'approved', 'permissible', 'verdict']) {
      expect(json).not.toContain(word);
    }
  });
});

describe('coverage, which is only knowable sometimes', () => {
  it('computes it where the institution said how many there were', () => {
    expect(coverageOf(made())).toEqual({ examined: 30, population: 240, percent: '12.5' });
  });

  /*
   * A denominator nobody supplied would turn a sample of thirty into a
   * reassuring percentage of nothing.
   */
  it('reports it as unknown where nobody said, rather than inferring one', () => {
    const e = made({ population: null });
    expect(coverageOf(e)).toEqual({ examined: 30, population: null, percent: null });
  });
});

describe('what was not examined', () => {
  it('names every condition and term the examination did not reach', () => {
    const e = made();
    const conditions = structureById('murabaha')!.conditions;
    const missing = notExamined(e, conditions, ['maxTenorMonths']);

    // One condition was answered; everything else in the shape was not.
    expect(missing.length).toBe(conditions.length - 1 + 1);
    expect(missing).toContain('maxTenorMonths');
  });

  it('counts an explicit not_examined as unexamined, not as answered', () => {
    const e = made({
      findings: [
        { against: 'ownership-before-sale', held: 'not_examined', exceptions: 0, note: '' },
      ],
    });
    const conditions = structureById('murabaha')!.conditions;
    expect(notExamined(e, conditions, []).length).toBe(conditions.length);
  });
});

describe('the year it covers', () => {
  it('takes the period end, not the day it was typed up', () => {
    const inYear = made({ to: '2026-06-30T00:00:00.000Z' });
    const before = {
      ...made({ from: '2025-01-01T00:00:00.000Z', to: '2025-12-31T00:00:00.000Z' }),
      id: 'exam-0',
    };
    expect(coveringYear([inYear, before], 2026).map((e) => e.id)).toEqual(['exam-1']);
  });
});
