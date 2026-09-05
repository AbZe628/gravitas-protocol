import { describe, it, expect } from 'vitest';
import { assessTradability, NOT_A_PERMISSION, type TradabilityInput } from '../src/services/tradability.js';
import { BadFigure } from '../src/services/money.js';

/**
 * Tradability, and the permission it will not give.
 *
 * The useful sentence out of this calculation is "may we trade this". The whole
 * design is that Majlis never says it — it says what the proportion is, and it
 * repeats what this board wrote about that proportion. These tests hold that
 * line at the two places it would break: a composition the board's rule does
 * not reach, and a rule that would have to be interpreted before it applied.
 */

const BANDS = [
  { fromBps: 0, toBps: 5100, consequence: 'Redemption at par only. The paper may not be traded at a negotiated price.' },
  { fromBps: 5100, toBps: 10_000, consequence: 'May be traded at a negotiated price.' },
];

function input(over: Partial<TradabilityInput> = {}): TradabilityInput {
  return {
    asOf: '2026-07-01',
    source: 'Trustee composition report, 1 July 2026',
    parts: [
      { label: 'Leased aircraft', bps: 5400, kind: 'tangible' },
      { label: 'Murabaha receivables', bps: 3600, kind: 'receivable' },
      { label: 'Cash at bank', bps: 1000, kind: 'cash' },
    ],
    countsAsTangible: ['tangible'],
    bands: BANDS,
    authority: 'Board resolution of 12 March 2026, on AAOIFI SS-59',
    ...over,
  };
}

describe('it computes the proportion and repeats the board’s sentence', () => {
  it('totals the counted side and says where it falls', () => {
    const out = assessTradability(input());

    expect(out.countedBps).toBe(5400);
    expect(out.countedPercent).toBe('54.00');
    expect(out.band?.consequence).toBe('May be traded at a negotiated price.');
    expect(out.unstated).toBeNull();
  });

  it('quotes the board rather than paraphrasing it', () => {
    const own = 'Tradable at market, provided the trustee certifies the lease is on foot.';
    const out = assessTradability(input({ bands: [{ fromBps: 0, toBps: 10_000, consequence: own }] }));

    // Verbatim. The moment this system rewrites a board's sentence it is
    // writing its own.
    expect(out.band?.consequence).toBe(own);
  });

  it('shows every kind, including the ones that totalled nothing', () => {
    const out = assessTradability(input());

    // A kind absent from the working reads as a kind nobody checked.
    const labels = out.steps.map((s) => s.label);
    for (const kind of ['tangible', 'debt', 'cash', 'receivable', 'other']) {
      expect(labels).toContain(`Total ${kind}`);
    }
    expect(out.steps.find((s) => s.label === 'Total debt')?.working).toBe('no parts of this kind');
  });

  it('shows the band test as the comparison it is, hit and miss alike', () => {
    const out = assessTradability(input());

    const hit = out.steps.find((s) => s.value === 'this band');
    expect(hit?.working).toContain('5400 falls within 5100 to 10000');
    expect(out.steps.some((s) => s.working.includes('5400 is outside 0 to 5100'))).toBe(true);
  });

  it('counts what the board said to count and nothing else', () => {
    // The same composition, with receivables counted on the tangible side.
    // 54% becomes 90%, and it is the board's classification that moved it.
    const out = assessTradability(input({ countsAsTangible: ['tangible', 'receivable'] }));

    expect(out.countedBps).toBe(9000);
    expect(out.band?.consequence).toBe('May be traded at a negotiated price.');
  });

  it('puts a boundary in the band above it', () => {
    const out = assessTradability(
      input({
        parts: [
          { label: 'Leased aircraft', bps: 5100, kind: 'tangible' },
          { label: 'Murabaha receivables', bps: 4900, kind: 'receivable' },
        ],
      }),
    );

    // Exactly on 51.00%. `fromBps` is inclusive, and which side of a boundary a
    // case falls on is the sort of thing that decides it.
    expect(out.countedBps).toBe(5100);
    expect(out.band?.consequence).toBe('May be traded at a negotiated price.');
  });

  it('carries the note that says what it did not answer', () => {
    expect(assessTradability(input()).note).toBe(NOT_A_PERMISSION);
    expect(NOT_A_PERMISSION).toContain('does not decide whether the instrument may be traded');
  });
});

describe('a proportion the board’s rule does not reach', () => {
  const partial = [{ fromBps: 5100, toBps: 10_000, consequence: 'May be traded at a negotiated price.' }];

  it('names the gap and concludes nothing from it', () => {
    const out = assessTradability(
      input({
        bands: partial,
        parts: [
          { label: 'Leased aircraft', bps: 3000, kind: 'tangible' },
          { label: 'Murabaha receivables', bps: 7000, kind: 'receivable' },
        ],
      }),
    );

    expect(out.band).toBeNull();
    expect(out.unstated).toContain('30.00%');
    expect(out.unstated).toContain('says nothing about where this composition falls');
    // A hole in the rule, not an answer. It is not rounded into the band above.
    expect(out.unstated).toContain('hole in the rule');
  });

  it('still shows the arithmetic, because the sums are not what is missing', () => {
    const out = assessTradability(
      input({
        bands: partial,
        parts: [{ label: 'Murabaha receivables', bps: 10_000, kind: 'receivable' }],
      }),
    );

    expect(out.band).toBeNull();
    expect(out.countedPercent).toBe('0.00');
    expect(out.steps.length).toBeGreaterThan(5);
  });
});

describe('what governs a composition whatever the proportion says', () => {
  it('names the sale of debt where there is nothing else in the pool', () => {
    const out = assessTradability(
      input({
        parts: [
          { label: 'Murabaha receivables', bps: 7000, kind: 'receivable' },
          { label: 'Deferred instalments', bps: 3000, kind: 'debt' },
        ],
      }),
    );

    // A board reading 0.00% should be pointed at the standard that actually
    // governs rather than left to infer it from a zero.
    expect(out.alsoGovernedBy.join(' ')).toContain('SS-59');
    expect(out.countedPercent).toBe('0.00');
  });

  it('names sarf where the pool is cash', () => {
    const out = assessTradability(
      input({ parts: [{ label: 'Cash at bank', bps: 10_000, kind: 'cash' }] }),
    );

    expect(out.alsoGovernedBy.join(' ')).toContain('SS-1');
    expect(out.alsoGovernedBy.join(' ')).toContain('hand to hand');
  });

  it('names nothing where the pool is mixed', () => {
    expect(assessTradability(input()).alsoGovernedBy).toEqual([]);
  });

  it('adds to the band rather than replacing it', () => {
    const out = assessTradability(
      input({ parts: [{ label: 'Deferred instalments', bps: 10_000, kind: 'debt' }] }),
    );

    // The board's own sentence for 0% still stands. The standard is a pointer
    // beside it, not a second opinion over it.
    expect(out.band?.consequence).toContain('Redemption at par only');
    expect(out.alsoGovernedBy).toHaveLength(1);
  });
});

describe('what it refuses, and why the refusal is the useful part', () => {
  const refusal = (over: Partial<TradabilityInput>) => {
    try {
      assessTradability(input(over));
    } catch (e) {
      if (e instanceof BadFigure) return e;
      throw e;
    }
    throw new Error('expected a refusal');
  };

  it('refuses a composition that does not sum to the whole', () => {
    const e = refusal({
      parts: [
        { label: 'Leased aircraft', bps: 5400, kind: 'tangible' },
        { label: 'Cash at bank', bps: 1000, kind: 'cash' },
      ],
    });

    expect(e.field).toBe('parts');
    expect(e.message).toContain('6400 basis points, not 10 000');
    expect(e.message).toContain('3600 basis points');
    expect(e.message).toContain('proportion of an unknown');
  });

  it('says so when the parts overshoot as well as undershoot', () => {
    const e = refusal({
      parts: [
        { label: 'Leased aircraft', bps: 6000, kind: 'tangible' },
        { label: 'Cash at bank', bps: 5000, kind: 'cash' },
      ],
    });

    expect(e.message).toContain('excess of 1000 basis points');
  });

  it('refuses where the board has not said what counts on the tangible side', () => {
    const e = refusal({ countsAsTangible: [] });

    expect(e.field).toBe('countsAsTangible');
    // Some boards count usufruct there and some do not, and reading it off the
    // labels would settle a classification question this file may not settle.
    expect(e.message).toContain('classification question');
  });

  it('refuses where two bands cover the same proportion', () => {
    const e = refusal({
      bands: [
        { fromBps: 0, toBps: 5100, consequence: 'Par only.' },
        { fromBps: 3000, toBps: 10_000, consequence: 'Tradable.' },
      ],
    });

    expect(e.field).toBe('bands');
    // Not first-match, not a precedence rule. Both sentences apply and choosing
    // between them is the ruling this file will not make.
    expect(e.message).toContain('choosing between them is a ruling');
  });

  it('permits bands that meet without overlapping', () => {
    expect(() =>
      assessTradability(
        input({
          bands: [
            { fromBps: 0, toBps: 3000, consequence: 'Par only.' },
            { fromBps: 3000, toBps: 5100, consequence: 'Par only, and report quarterly.' },
            { fromBps: 5100, toBps: 10_000, consequence: 'Tradable.' },
          ],
        }),
      ),
    ).not.toThrow();
  });

  it('refuses a band with a threshold and nothing attached', () => {
    const e = refusal({ bands: [{ fromBps: 0, toBps: 10_000, consequence: '   ' }] });
    expect(e.message).toContain('threshold with nothing attached');
  });

  it('refuses a composition with no source', () => {
    const e = refusal({ source: '  ' });
    expect(e.field).toBe('source');
    expect(e.message).toContain('somebody typed');
  });

  it('refuses a negative or fractional part', () => {
    expect(refusal({ parts: [{ label: 'Odd', bps: -100, kind: 'tangible' }] }).field).toBe('parts');
    expect(refusal({ parts: [{ label: 'Odd', bps: 33.5, kind: 'tangible' }] }).message).toContain(
      'whole number of basis points',
    );
  });

  it('refuses a rule with no bands at all', () => {
    const e = refusal({ bands: [] });
    expect(e.message).toContain('nothing that says what this board makes of it');
  });

  it('refuses a band that runs outside 0 to 10 000, or backwards', () => {
    expect(refusal({ bands: [{ fromBps: 5100, toBps: 12_000, consequence: 'x' }] }).field).toBe('bands');
    expect(refusal({ bands: [{ fromBps: 5100, toBps: 3000, consequence: 'x' }] }).field).toBe('bands');
  });
});

describe('nothing here reaches a verdict', () => {
  it('returns no field that answers whether this is permissible', () => {
    const out = assessTradability(input());
    const keys = Object.keys(out);

    for (const forbidden of ['permissible', 'compliant', 'halal', 'approved', 'tradable', 'allowed']) {
      expect(keys.some((k) => k.toLowerCase().includes(forbidden))).toBe(false);
    }
  });

  it('says nothing of its own that reads as a ruling', () => {
    const out = assessTradability(input());

    /*
     * Two things are exempt, and both for the same reason: they are sentences
     * about the ruling rather than sentences making one.
     *
     * The board's own consequence — "May be traded at a negotiated price" — is
     * the board ruling, which is the entire point of carrying it. And the note
     * *denies* reaching a verdict, so it necessarily contains the words a
     * verdict would use. The first version of this test scanned both and
     * failed on its own disclaimer, which is the third time a guard here has
     * caught the sentence that exists to make the guarantee rather than break
     * it. A guard that cannot tell a claim from its denial is a guard that
     * eventually forces the denial out of the product.
     *
     * The note is a constant and is asserted verbatim above. What is scanned
     * here is the prose this file *generates* about a particular composition,
     * which is the only part that can drift.
     */
    const ourOwnWords = [out.unstated ?? '', ...out.steps.map((s) => `${s.label} ${s.working}`)].join(' ');

    expect(/\b(?:is|are)\s+(?:therefore\s+)?(?:permissible|impermissible|compliant)\b/i.test(ourOwnWords)).toBe(
      false,
    );
    expect(/\bmay(?:\s+not)?\s+be\s+traded\b/i.test(ourOwnWords)).toBe(false);
  });
});
