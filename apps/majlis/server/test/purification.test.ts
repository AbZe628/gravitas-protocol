import { describe, it, expect } from 'vitest';
import { Refused } from '../src/services/lifecycle.js';
import { purify, type PurificationInput } from '../src/services/purification.js';

/**
 * Three methods that give three different answers on the same holding.
 *
 * That is the whole reason the method is supplied rather than chosen, and the
 * first test below demonstrates it rather than asserting it in prose.
 */

const base: Omit<PurificationInput, 'method'> = {
  periodFrom: '2026-01-01',
  periodTo: '2026-12-31',
  currency: 'USD',
  source: 'Issuer annual report, audited',
  basis: 'Income only, gross, as reported by the issuer',
  unitsHeld: '10000',

  nonPermissibleIncome: '3200000',
  sharesOutstanding: '400000000',

  totalIncome: '100000000',
  incomeReceived: '25000',

  ratePerUnit: '0.009',
};

const run = (over: Partial<PurificationInput> & { method: PurificationInput['method'] }) =>
  purify({ ...base, ...over });

const code = (fn: () => unknown): string | null => {
  try { fn(); return null; } catch (e) { return e instanceof Refused ? e.code : `threw ${String(e)}`; }
};

describe('the three methods do not agree, which is why the board picks one', () => {
  it('per share divides the company’s income across its shares', () => {
    const p = run({ method: 'per_share' });
    // 3 200 000 ÷ 400 000 000 = 0.008 per share; × 10 000 = 80.
    expect(p.amount).toBe('80');
    expect(p.steps[1].working).toBe('3200000 ÷ 400000000');
  });

  it('per dividend applies the non-permissible proportion to what was received', () => {
    const p = run({ method: 'per_dividend' });
    // 3 200 000 ÷ 100 000 000 = 3.20%; of 25 000 = 800.
    expect(p.proportionOfReceiptsBps).toBe(320);
    expect(p.amount).toBe('800');
  });

  it('per unit takes the published rate', () => {
    const p = run({ method: 'per_unit' });
    // 0.009 × 10 000 = 90.
    expect(p.amount).toBe('90');
  });

  it('gives three different answers on one holding', () => {
    const amounts = (['per_share', 'per_dividend', 'per_unit'] as const).map(
      (method) => run({ method }).amount,
    );
    expect(new Set(amounts).size).toBe(3);
  });

  it('refuses a method it does not know rather than falling back on one', () => {
    expect(code(() => run({ method: 'whatever' as PurificationInput['method'] }))).toBe('not_found');
  });
});

describe('a missing figure is not a zero', () => {
  it('refuses per share without the company’s income or its shares', () => {
    expect(code(() => run({ method: 'per_share', nonPermissibleIncome: undefined }))).toBe('no_reason_given');
    expect(code(() => run({ method: 'per_share', sharesOutstanding: '' }))).toBe('no_reason_given');
  });

  it('refuses per dividend without total income or what was received', () => {
    expect(code(() => run({ method: 'per_dividend', totalIncome: undefined }))).toBe('no_reason_given');
    expect(code(() => run({ method: 'per_dividend', incomeReceived: undefined }))).toBe('no_reason_given');
  });

  it('refuses per unit without a rate', () => {
    expect(code(() => run({ method: 'per_unit', ratePerUnit: undefined }))).toBe('no_reason_given');
  });

  it('says why, in terms of what would go wrong', () => {
    try {
      run({ method: 'per_unit', ratePerUnit: undefined });
      expect.unreachable();
    } catch (e) {
      expect((e as Refused).message).toContain('discharge an obligation nobody computed');
    }
  });

  it('refuses to divide by nothing rather than returning zero', () => {
    expect(code(() => run({ method: 'per_share', sharesOutstanding: '0' }))).toBe('no_reason_given');
    expect(code(() => run({ method: 'per_dividend', totalIncome: '0' }))).toBe('no_reason_given');
  });

  it('refuses a figure that is not a figure', () => {
    expect(() => run({ method: 'per_unit', unitsHeld: 'about ten thousand' })).toThrow(
      /not a plain decimal figure/,
    );
  });
});

describe('apportioning by holding period is a choice, so it is recorded', () => {
  it('reduces the amount for a holding held part of the period', () => {
    const p = run({
      method: 'per_dividend',
      apportionByHoldingPeriod: true,
      daysHeld: 90,
      daysInPeriod: 365,
    });
    // 800 × 90 ÷ 365 = 197.26…
    expect(p.amount.startsWith('197.26')).toBe(true);
    expect(p.steps[p.steps.length - 1].working).toContain('90 ÷ 365 days');
  });

  it('changes nothing when the holding was held throughout', () => {
    const p = run({
      method: 'per_dividend',
      apportionByHoldingPeriod: true,
      daysHeld: 365,
      daysInPeriod: 365,
    });
    expect(p.amount).toBe('800');
  });

  it('refuses rather than quietly applying none when the days are missing', () => {
    // Silently skipping the apportionment would change the method the board
    // approved without anybody being told.
    expect(code(() => run({ method: 'per_dividend', apportionByHoldingPeriod: true }))).toBe(
      'no_reason_given',
    );
    expect(
      code(() => run({ method: 'per_dividend', apportionByHoldingPeriod: true, daysHeld: 90, daysInPeriod: 0 })),
    ).toBe('no_reason_given');
  });

  it('leaves the amount alone when the board did not choose it', () => {
    expect(run({ method: 'per_dividend', daysHeld: 90, daysInPeriod: 365 }).amount).toBe('800');
  });
});

describe('what it records rather than computes', () => {
  it('carries the basis in the board’s own words', () => {
    const p = run({ method: 'per_share', basis: 'Net of tax, income and realised gain' });
    expect(p.basis).toBe('Net of tax, income and realised gain');
  });

  it('states the method in words, not only as a key', () => {
    expect(run({ method: 'per_share' }).methodStated).toContain('divided by its shares in issue');
    expect(run({ method: 'per_dividend' }).methodStated).toContain('applied to what was received');
  });

  it('names who supplied the figures', () => {
    expect(run({ method: 'per_unit' }).source).toContain('audited');
    expect(run({ method: 'per_unit' }).steps[0].working).toContain('Issuer annual report');
  });

  it('reports a proportion of receipts only where receipts were an input', () => {
    expect(run({ method: 'per_dividend' }).proportionOfReceiptsBps).toBe(320);
    // Per share and per unit never see what was received; inventing a
    // proportion of it would be inventing a figure.
    expect(run({ method: 'per_share' }).proportionOfReceiptsBps).toBeNull();
    expect(run({ method: 'per_unit' }).proportionOfReceiptsBps).toBeNull();
  });

  it('gives a per-unit figure so two holdings can be compared', () => {
    expect(run({ method: 'per_dividend' }).perUnit).toBe('0.08');
  });
});

describe('what it refuses to be', () => {
  it('states no verdict about the holding, and claims nothing is discharged', () => {
    // The guard targets claims rather than words: 'non-permissible income' is
    // the term of art for an input, and banning the substring would ban the
    // vocabulary the domain actually uses.
    const text = JSON.stringify(run({ method: 'per_dividend' })).toLowerCase();
    for (const claim of [
      'halal',
      'haram',
      'is permissible',
      'is compliant',
      'now clean',
      'obligation discharged',
      'therefore',
    ]) {
      expect(text).not.toContain(claim);
    }
  });

  it('carries the sentence saying the method and the destination are the board’s', () => {
    const p = run({ method: 'per_share' });
    expect(p.note).toContain('the board’s to decide');
    expect(p.note).toContain('where the amount is given');
  });

  it('holds exact decimals through the whole chain', () => {
    const p = run({ method: 'per_unit', ratePerUnit: '0.00123456', unitsHeld: '1000000' });
    expect(p.amount).toBe('1234.56');
  });
});
