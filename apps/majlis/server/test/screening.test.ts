import { describe, it, expect } from 'vitest';
import {
  BadFigure,
  NOT_A_RULING,
  RATIOS,
  assess,
  crossings,
  formatAmount,
  parseAmount,
  type Figures,
} from '../src/services/screening.js';

const figures = (over: Partial<Figures> = {}): Figures => ({
  asOf: '2026-06-30',
  source: 'Institution treasury, audited interim accounts',
  currency: 'USD',
  marketCapitalisation: '1000',
  interestBearingDebt: '200',
  cashAndInterestBearingSecurities: '100',
  totalRevenue: '500',
  nonPermissibleIncome: '10',
  ...over,
});

const of = (a: ReturnType<typeof assess>, key: string) => a.ratios.find((r) => r.key === key)!;

describe('exact decimals, because a ruling must not turn on binary rounding', () => {
  it('round-trips a figure without losing a cent', () => {
    for (const raw of ['0', '1', '12480.55', '0.00000001', '999999999999.123456']) {
      expect(formatAmount(parseAmount(raw, 'x'))).toBe(raw);
    }
  });

  it('accepts the separators a treasury actually types', () => {
    expect(formatAmount(parseAmount('1,240,000.50', 'x'))).toBe('1240000.5');
    expect(formatAmount(parseAmount(' 1 240 000 ', 'x'))).toBe('1240000');
  });

  it('refuses anything that is not a figure rather than guessing at one', () => {
    for (const bad of ['approx 4.2bn', '', '4.2e9', 'NaN', '1.2.3', '£100']) {
      expect(() => parseAmount(bad, 'marketCapitalisation')).toThrow(BadFigure);
    }
  });

  it('refuses more precision than it can hold, instead of silently truncating', () => {
    expect(() => parseAmount('1.123456789', 'x')).toThrow(BadFigure);
  });

  it('names the field it refused, so an interface can point at it', () => {
    try {
      parseAmount('lots', 'totalRevenue');
      expect.unreachable();
    } catch (e) {
      expect((e as BadFigure).field).toBe('totalRevenue');
    }
  });
});

describe('the three ratios', () => {
  it('computes all three and shows the arithmetic', () => {
    const a = assess(figures());
    expect(a.ratios).toHaveLength(3);

    expect(of(a, 'debt').percent).toBe('20.00');
    expect(of(a, 'liquidity').percent).toBe('10.00');
    expect(of(a, 'income').percent).toBe('2.00');
    expect(of(a, 'debt').workings).toBe('200 ÷ 1000 = 20.00%, against a limit of ≤ 30%. Within the threshold.');
    expect(a.allWithinThresholds).toBe(true);
  });

  it('keeps the standard’s own strictness: one limit is exclusive and two are not', () => {
    const atExactly30 = assess(
      figures({ interestBearingDebt: '300', cashAndInterestBearingSecurities: '300' }),
    );
    // Debt is "≤ 30%" — exactly 30 is within.
    expect(of(atExactly30, 'debt').withinThreshold).toBe(true);
    // Cash is "< 30%" — exactly 30 is not.
    expect(of(atExactly30, 'liquidity').withinThreshold).toBe(false);
  });

  it('tests the threshold exactly, not on the rounded display value', () => {
    // 30.001% displays as 30.00 and is outside the limit. If the comparison
    // used the display figure it would read as within.
    const a = assess(figures({ marketCapitalisation: '100000', interestBearingDebt: '30001' }));
    expect(of(a, 'debt').percent).toBe('30.00');
    expect(of(a, 'debt').withinThreshold).toBe(false);
  });

  it('marks the income ratio against revenue, not market capitalisation', () => {
    const a = assess(figures({ nonPermissibleIncome: '30', totalRevenue: '500' }));
    expect(of(a, 'income').percent).toBe('6.00');
    expect(of(a, 'income').withinThreshold).toBe(false);
  });

  it('refuses to divide by nothing, and says so instead of reporting a pass', () => {
    const a = assess(figures({ marketCapitalisation: '0' }));
    expect(of(a, 'debt').withinThreshold).toBeNull();
    expect(of(a, 'debt').percent).toBeNull();
    expect(of(a, 'debt').workings).toContain('cannot be computed');
    expect(a.allWithinThresholds).toBeNull();
  });

  it('carries the date, the source and the currency into the result', () => {
    const a = assess(figures());
    expect(a.asOf).toBe('2026-06-30');
    expect(a.source).toContain('audited interim accounts');
    expect(a.currency).toBe('USD');
  });
});

describe('what it must not say', () => {
  it('carries the disclaimer in the output, because output travels', () => {
    expect(assess(figures()).note).toBe(NOT_A_RULING);
    expect(assess(figures()).note).toContain('ruling for the board');
  });

  it('has no field anywhere that states permissibility', () => {
    const json = JSON.stringify(assess(figures()));
    for (const word of ['halal', 'haram', 'permissible"', 'compliant', 'approved', 'verdict']) {
      expect(json.toLowerCase()).not.toContain(word.toLowerCase());
    }
  });

  it('does not teach the tangible-asset ratio that Standard 59 revised', () => {
    const keys = RATIOS.map((r) => r.key);
    expect(keys).toEqual(['debt', 'liquidity', 'income']);
    expect(JSON.stringify(RATIOS).toLowerCase()).not.toContain('tangible');
  });
});

describe('drift, which is where the value is', () => {
  const march = assess(figures());

  it('says nothing when nothing changed side', () => {
    const july = assess(figures({ interestBearingDebt: '250' }));
    expect(crossings(march, july)).toEqual([]);
  });

  it('raises a question when a ratio moves into breach', () => {
    const july = assess(figures({ interestBearingDebt: '340' }));
    const found = crossings(march, july);

    expect(found).toHaveLength(1);
    expect(found[0].key).toBe('debt');
    expect(found[0].direction).toBe('into_breach');
    expect(found[0].was).toBe('20.00');
    expect(found[0].now).toBe('34.00');
    expect(found[0].questionForBoard).toContain('Does the standing ruling still hold?');
  });

  it('phrases it as a question and never as a conclusion', () => {
    const july = assess(figures({ interestBearingDebt: '340' }));
    const text = crossings(march, july)[0].questionForBoard.toLowerCase();
    expect(text).toContain('?');
    for (const word of ['must', 'therefore', 'impermissible', 'withdraw', 'revoke']) {
      expect(text).not.toContain(word);
    }
  });

  it('reports a return to within the threshold too, since that also changes the basis', () => {
    const breached = assess(figures({ interestBearingDebt: '340' }));
    const recovered = assess(figures({ interestBearingDebt: '210' }));
    const found = crossings(breached, recovered);

    expect(found).toHaveLength(1);
    expect(found[0].direction).toBe('back_within');
    expect(found[0].questionForBoard).toContain('back within the threshold');
  });

  it('reports every ratio that moved, not just the first', () => {
    const july = assess(figures({ interestBearingDebt: '340', nonPermissibleIncome: '40' }));
    expect(crossings(march, july).map((c) => c.key)).toEqual(['debt', 'income']);
  });

  it('stays silent where a figure could not be computed on either side', () => {
    const missing = assess(figures({ marketCapitalisation: '0' }));
    expect(crossings(march, missing)).toEqual([]);
    expect(crossings(missing, march)).toEqual([]);
  });
});
