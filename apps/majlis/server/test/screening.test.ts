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
  type Threshold,
} from '../src/services/screening.js';

/*
 * Limits a board set. There are no shipped ones any more, so a test that wants
 * a comparison has to say what to compare against — which is the same thing the
 * product now asks of a board.
 */
const LIMITS: Threshold[] = [
  { key: 'debt', thresholdBps: 3000, bound: 'at_or_below', basis: 'This board’s resolution of 4 February' },
  { key: 'liquidity', thresholdBps: 3000, bound: 'strictly_below' },
  { key: 'income', thresholdBps: 500, bound: 'at_or_below' },
];

const figures = (over: Partial<Figures> = {}): Figures => ({
  asOf: '2026-06-30',
  source: 'Institution treasury, audited interim accounts',
  currency: 'USD',
  marketCapitalisation: '1000',
  interestBearingDebt: '200',
  cashAndInterestBearingSecurities: '100',
  totalRevenue: '500',
  nonPermissibleIncome: '10',
  thresholds: LIMITS,
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
    expect(of(a, 'debt').workings).toBe(
      '200 ÷ 1000 = 20.00%, against this board’s limit of ≤ 30%. Within it.',
    );
    expect(a.allWithinThresholds).toBe(true);
  });

  it('keeps each limit’s own strictness: the board says whether it is inclusive', () => {
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

  it('does not teach a tangible-asset ratio among these three', () => {
    const keys = RATIOS.map((r) => r.key);
    expect(keys).toEqual(['debt', 'liquidity', 'income']);
    expect(JSON.stringify(RATIOS).toLowerCase()).not.toContain('tangible');
  });

  /*
   * The product is not a standard and does not follow one. Every board decides
   * which standard governs it, and a threshold or a citation shipped in this
   * file would be that decision taken for them — quietly, since a board reading
   * "within the threshold" has no way to ask whose threshold it was.
   */
  it('ships no limit and no standard of its own', () => {
    const json = JSON.stringify(RATIOS).toLowerCase();
    for (const word of ['aaoifi', 'standard', 'authority', 'threshold', 'bps']) {
      expect(json).not.toContain(word);
    }
  });
});

describe('the limit is the board’s, and there is none until they set one', () => {
  const noLimits = (over: Partial<Figures> = {}) => figures({ thresholds: undefined, ...over });

  it('still computes and shows the ratio', () => {
    const a = assess(noLimits());
    expect(of(a, 'debt').percent).toBe('20.00');
    expect(of(a, 'debt').valueBps).toBe(2000);
  });

  it('tests nothing, rather than testing against a figure we chose', () => {
    const a = assess(noLimits());
    for (const key of ['debt', 'liquidity', 'income']) {
      expect(of(a, key).withinThreshold).toBeNull();
      expect(of(a, key).thresholdBps).toBeNull();
      expect(of(a, key).bound).toBeNull();
    }
    expect(a.allWithinThresholds).toBeNull();
    expect(a.limitsSet).toBe(0);
  });

  it('says which silence this is, so a reader does not read it as bad figures', () => {
    expect(of(assess(noLimits()), 'debt').unknownBecause).toBe('no_limit_set');
    expect(of(assess(noLimits()), 'debt').workings).toContain('has not set a limit');

    const cannotDivide = assess(figures({ marketCapitalisation: '0' }));
    expect(of(cannotDivide, 'debt').unknownBecause).toBe('denominator_is_zero');
  });

  it('takes one limit without inventing the other two', () => {
    const a = assess(
      noLimits({ thresholds: [{ key: 'debt', thresholdBps: 3300, bound: 'at_or_below' }] }),
    );
    expect(of(a, 'debt').withinThreshold).toBe(true);
    expect(of(a, 'debt').thresholdBps).toBe(3300);
    expect(of(a, 'liquidity').withinThreshold).toBeNull();
    expect(of(a, 'income').withinThreshold).toBeNull();
    expect(a.limitsSet).toBe(1);
  });

  it('carries the board’s own words for what the limit rests on, and only those', () => {
    const a = assess(figures());
    expect(of(a, 'debt').basis).toBe('This board’s resolution of 4 February');
    // The board gave no basis for this one, and none is supplied for it.
    expect(of(a, 'liquidity').basis).toBeNull();
  });

  it('names the limit as the board’s when it asks the drift question', () => {
    const before = assess(figures());
    const after = assess(figures({ interestBearingDebt: '340' }));
    const question = crossings(before, after)[0].questionForBoard;

    expect(question).toContain('the limit this board set');
    expect(question).toContain('This board’s resolution of 4 February');
    expect(question.toLowerCase()).not.toContain('aaoifi');
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
    expect(found[0].questionForBoard).toContain('back within the limit this board set');
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
