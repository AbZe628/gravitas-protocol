import { describe, it, expect } from 'vitest';
import { buildDayToDay } from '../src/services/carrying.js';
import { rules } from '../src/data/seed.js';
import type { EnforcementSnapshot } from '../src/services/enforcement.js';

/**
 * What a ruling in force means from one day to the next.
 *
 * The handbook promises six answers in the same six places for every ruling.
 * What these hold to is the honest half of that promise: **a ruling that has
 * nothing measuring it says so**, rather than showing an empty box that a
 * board would read as the software having it covered.
 *
 * They run against the seeded rulings rather than against hand-built ones.
 * Stubs built by hand agree with whatever the code does, which is how a term
 * the board actually writes goes unrecognised for months — `revert` did
 * exactly that, and it is the word two of these three rulings use.
 */

const attached: EnforcementSnapshot = {
  kind: 'evm',
  configured: true,
  readAt: '2026-09-13T00:00:00Z',
  label: 'the Gravitas policy registry',
  reachable: true,
  paused: false,
};

const nothing: EnforcementSnapshot = {
  kind: 'none',
  configured: false,
  readAt: '2026-09-13T00:00:00Z',
};

const ruleFor = (id: string) => {
  const found = rules.find((r) => r.id === id);
  if (!found) throw new Error(`seed has no ${id}`);
  return found;
};

describe('what happens if it fails', () => {
  it('finds a refusal written as revert, which two of the three rulings use', () => {
    const par = buildDayToDay(ruleFor('rule-stablecoin-par'), attached);
    expect(par.behaviours).toHaveLength(1);
    expect(par.behaviours[0].meaning).toMatch(/does not execute/);

    const wakil = buildDayToDay(ruleFor('rule-wakil-mandate'), attached);
    expect(wakil.behaviours).toHaveLength(1);
    expect(wakil.behaviours[0].meaning).toMatch(/does not execute/);
  });

  it('finds one written as a longer instruction', () => {
    const ratio = buildDayToDay(ruleFor('rule-tangible-ratio'), attached);
    expect(ratio.behaviours).toHaveLength(1);
    expect(ratio.behaviours[0].value).toBe('block_secondary_market_trades');
  });

  it('never counts a behaviour as a figure or as a name', () => {
    for (const rule of rules) {
      const d = buildDayToDay(rule, attached);
      const keys = [...d.figures, ...d.names, ...d.behaviours].map((t) => t.key);
      expect(new Set(keys).size).toBe(keys.length);
      expect(keys.length).toBe(rule.parameters.length);
    }
  });
});

describe('how it is measured, and whether it moves', () => {
  it('a ruling with a figure and a source moves with what it is read from', () => {
    const d = buildDayToDay(ruleFor('rule-tangible-ratio'), attached);
    expect(d.figures.map((f) => f.value)).toContain('5100');
    expect(d.names.map((n) => n.value)).toContain('pool.navBreakdown');
    expect(d.moves).toBe('with_what_it_is_read_from');
  });

  it('a ruling that is a standard of conduct does not move on its own', () => {
    // The agent's mandate fixes no figure: it names a set of categories.
    const d = buildDayToDay(ruleFor('rule-wakil-mandate'), attached);
    expect(d.figures).toHaveLength(0);
    expect(d.moves).toBe('only_when_the_board_changes_it');
  });

  it('reads a figure off the value and never off the key', () => {
    const d = buildDayToDay(
      {
        id: 'made-up',
        statement: 'A board that names its terms in its own way is served the same.',
        parameters: [
          { key: 'ceiling', value: '250', unit: 'basis points', meaning: 'At most 2.50%.' },
          { key: 'whereFrom', value: 'ledger.dailyClose', meaning: 'Read from the daily close.' },
        ],
      },
      nothing,
    );
    expect(d.figures.map((f) => f.key)).toEqual(['ceiling']);
    expect(d.names.map((n) => n.key)).toEqual(['whereFrom']);
  });
});

describe('when it is checked', () => {
  it('is before every transaction where something is attached', () => {
    expect(buildDayToDay(ruleFor('rule-tangible-ratio'), attached).cadence).toBe(
      'before_every_transaction',
    );
  });

  it('is when somebody looks where nothing is attached, and that is not a fault', () => {
    const d = buildDayToDay(ruleFor('rule-tangible-ratio'), nothing);
    expect(d.cadence).toBe('when_someone_looks');
    expect(d.attached).toBe(false);
    expect(d.carrier).toBeNull();
  });
});

describe('who is told', () => {
  it('says plainly that nothing is sent until the institution wires a relay', () => {
    for (const snapshot of [attached, nothing]) {
      const d = buildDayToDay(ruleFor('rule-tangible-ratio'), snapshot);
      expect(d.limits.some((l) => /sends nothing unless/.test(l))).toBe(true);
    }
  });
});

describe('the board’s own words', () => {
  it('travel unchanged', () => {
    const rule = ruleFor('rule-tangible-ratio');
    const d = buildDayToDay(rule, attached);
    expect(d.statement).toBe(rule.statement);
    for (const term of [...d.figures, ...d.names, ...d.behaviours]) {
      const original = rule.parameters.find((p) => p.key === term.key);
      expect(term.meaning).toBe(original?.meaning);
    }
  });
});
