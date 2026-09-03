import { describe, it, expect } from 'vitest';
import { Refused } from '../src/services/lifecycle.js';
import { computeZakat, type ZakatInput } from '../src/services/zakat.js';

const base: ZakatInput = {
  method: 'net_assets',
  year: 'lunar',
  borneBy: 'institution',
  hawlEndsOn: '2026-12-31',
  currency: 'AED',
  source: 'Audited financial statements',

  cash: '4000000',
  receivables: '2500000',
  tradeGoods: '1500000',
  zakatableInvestments: '2000000',
  shortTermLiabilities: '2000000',

  paidUpCapital: '50000000',
  reserves: '5000000',
  retainedEarnings: '3000000',
  netProfit: '2000000',
  fixedAssets: '20000000',
  longTermInvestments: '8000000',
  accumulatedLosses: '0',
};

const run = (over: Partial<ZakatInput> = {}) => computeZakat({ ...base, ...over });

const code = (fn: () => unknown): string | null => {
  try { fn(); return null; } catch (e) { return e instanceof Refused ? e.code : `threw ${String(e)}`; }
};

describe('the base is the board’s, and the two do not have to agree', () => {
  it('adds what is zakatable and subtracts what is owed within the year', () => {
    // 4 000 000 + 2 500 000 + 1 500 000 + 2 000 000 = 10 000 000, less 2 000 000.
    const z = run({ method: 'net_assets' });
    expect(z.base).toBe('8000000');
    expect(z.due).toBe('200000');
  });

  it('takes the funds put in and subtracts what is not zakatable', () => {
    // 60 000 000 in, less 28 000 000 out.
    const z = run({ method: 'net_invested_funds' });
    expect(z.base).toBe('32000000');
    expect(z.due).toBe('800000');
  });

  it('gives different answers on one balance sheet, which is why the board picks', () => {
    expect(run({ method: 'net_assets' }).base).not.toBe(run({ method: 'net_invested_funds' }).base);
  });

  it('refuses a base it does not know rather than falling back on one', () => {
    expect(code(() => run({ method: 'whatever' as ZakatInput['method'] }))).toBe('not_found');
  });

  it('states the base in words, not only as a key', () => {
    expect(run({ method: 'net_assets' }).methodStated).toContain('less liabilities falling due');
    expect(run({ method: 'net_invested_funds' }).methodStated).toContain('less fixed assets');
  });
});

describe('the rate follows the year, exactly', () => {
  it('applies 2.5% to a lunar year', () => {
    const z = run({ year: 'lunar' });
    expect(z.rateStated).toBe('2.5%');
    expect(z.due).toBe('200000');
  });

  it('applies 2.577% to a solar one, without rounding it into basis points', () => {
    const z = run({ year: 'solar' });
    expect(z.rateStated).toBe('2.577%');
    // 8 000 000 × 2.577% = 206 160, and not 206 400 as 258 basis points would give.
    expect(z.due).toBe('206160');
  });

  it('says why the rate differs, rather than only that it does', () => {
    expect(run({ year: 'solar' }).rateWhy).toContain('longer than a lunar one');
  });

  it('refuses a year it does not know rather than guessing which is kept', () => {
    expect(code(() => run({ year: 'gregorian' as ZakatInput['year'] }))).toBe('not_found');
  });

  it('holds the difference exactly on an awkward base', () => {
    const lunar = run({ year: 'lunar', cash: '1234567.89', receivables: '0', tradeGoods: '0', zakatableInvestments: '0', shortTermLiabilities: '0' });
    const solar = run({ year: 'solar', cash: '1234567.89', receivables: '0', tradeGoods: '0', zakatableInvestments: '0', shortTermLiabilities: '0' });
    expect(lunar.due).toBe('30864.19725');
    // 1 234 567.89 × 2577 ÷ 100 000, carried out exactly.
    expect(solar.due).toBe('31814.8145253');
  });
});

describe('whose obligation it is, which is a disclosure in itself', () => {
  it('says plainly that computing it discharges nothing where shareholders bear it', () => {
    const z = run({ borneBy: 'shareholders' });
    expect(z.borneByStated).toContain('discharges nothing');
  });

  it('does not divide it where both bear it, because that basis is the board’s', () => {
    const z = run({ borneBy: 'both' });
    expect(z.borneByStated).toContain('not computed here');
  });

  it('carries the hawl, whatever the answer', () => {
    expect(run().hawlEndsOn).toBe('2026-12-31');
  });
});

describe('a missing figure is not a zero', () => {
  it('refuses the net assets base without cash, receivables or liabilities', () => {
    expect(code(() => run({ cash: undefined }))).toBe('no_reason_given');
    expect(code(() => run({ receivables: '' }))).toBe('no_reason_given');
    expect(code(() => run({ shortTermLiabilities: undefined }))).toBe('no_reason_given');
  });

  it('refuses the invested funds base without capital or fixed assets', () => {
    expect(code(() => run({ method: 'net_invested_funds', paidUpCapital: undefined }))).toBe('no_reason_given');
    expect(code(() => run({ method: 'net_invested_funds', fixedAssets: undefined }))).toBe('no_reason_given');
  });

  it('says why, in terms of what would go wrong', () => {
    try {
      run({ cash: undefined });
      expect.unreachable();
    } catch (e) {
      expect((e as Refused).message).toContain('understates an obligation nobody checked');
    }
  });

  it('treats a genuinely absent optional part as nothing rather than refusing', () => {
    const z = run({ tradeGoods: undefined, zakatableInvestments: '' });
    expect(z.base).toBe('4500000');
    // And says nothing about a part that was not there.
    expect(z.steps.some((s) => s.label === 'Trade goods')).toBe(false);
  });

  it('refuses a figure that is not a figure', () => {
    expect(() => run({ cash: 'about four million' })).toThrow(/not a plain decimal figure/);
  });
});

describe('a base that has gone negative', () => {
  it('is nothing due rather than a negative obligation', () => {
    const z = run({ shortTermLiabilities: '15000000' });
    expect(z.baseIsNegative).toBe(true);
    expect(z.due).toBe('0');
    expect(z.base.startsWith('-')).toBe(true);
  });

  it('says why nothing is due rather than printing a zero without a reason', () => {
    const z = run({ shortTermLiabilities: '15000000' });
    const last = z.steps[z.steps.length - 1];
    expect(last.label).toBe('Nothing is due');
    expect(last.working).toContain('no base to apply a rate to');
  });
});

describe('what it refuses to be', () => {
  it('claims nothing is discharged and reaches no verdict', () => {
    // The note is scanned separately below. Searching the disclaimer for the
    // words it uses to deny something is circular: it says "whether anything
    // has been paid ... is not answered here", which is the opposite of a claim.
    const { note, ...rest } = run();
    const text = JSON.stringify(rest).toLowerCase();
    for (const claim of ['halal', 'haram', 'is compliant', 'has been paid', 'obligation discharged', 'therefore']) {
      expect(text).not.toContain(claim);
    }
    expect(note).toBeTruthy();
  });

  it('carries the sentence saying the base and the payment are not its answer', () => {
    const z = run();
    expect(z.note).toContain('whether anything has been paid');
    expect(z.note).toContain('not answered here');
  });

  it('shows every sum so the figure can be checked', () => {
    const z = run();
    expect(z.steps.map((s) => s.label)).toContain('Zakatable assets');
    expect(z.steps.map((s) => s.label)).toContain('Less liabilities due within the year');
    expect(z.steps[0].working).toContain('Audited financial statements');
  });
});
