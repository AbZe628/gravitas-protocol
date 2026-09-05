import { describe, it, expect } from 'vitest';
import { computeLatePayment, NOT_INCOME, type LatePaymentInput } from '../src/services/late.js';
import { BadFigure } from '../src/services/money.js';

/**
 * A late payment charge, and the one thing it may not become.
 *
 * The whole file exists to keep one sentence true: **this is not income.** So
 * most of what is tested here is not the arithmetic — it is the paths by which
 * an amount could quietly end up staying with the institution, and each of them
 * being closed.
 */

function input(over: Partial<LatePaymentInput> = {}): LatePaymentInput {
  return {
    method: 'stipulated_amount',
    currency: 'AED',
    source: 'Collections ledger, entry 4471',
    obligation: 'Murabaha instalment 7 of 24, contract MB-2025-0113',
    dueOn: '2026-04-01',
    paidOn: '2026-07-01',
    solvency: 'able_and_delaying',
    retention: 'nothing',
    stipulated: '5000',
    ...over,
  };
}

describe('the charge, and where it goes', () => {
  it('gives the whole amount away where the board permits no retention', () => {
    const out = computeLatePayment(input());

    expect(out.charged).toBe('5000');
    expect(out.retained).toBe('0');
    expect(out.toBeGivenAway).toBe('5000');
  });

  it('counts the days late from the dates rather than being told', () => {
    // 1 April to 1 July 2026 — thirty, thirty-one, thirty.
    expect(computeLatePayment(input()).daysLate).toBe(91);
  });

  it('applies a rate over the days outstanding, on the day count the contract uses', () => {
    const out = computeLatePayment(
      input({
        method: 'rate_on_overdue',
        stipulated: undefined,
        outstanding: '1000000',
        rateBps: 500,
        dayCount: 365,
      }),
    );

    // 1 000 000 × 5% × 91 ÷ 365 = 12 465.753424657534...
    expect(out.charged).toBe('12465.75342465');
    expect(out.steps.find((s) => s.label === 'Charge')?.working).toBe(
      '1000000 × 5.00% × 91 ÷ 365',
    );
  });

  it('gives a different answer on 360, which is why it is asked', () => {
    const on360 = computeLatePayment(
      input({
        method: 'rate_on_overdue',
        stipulated: undefined,
        outstanding: '1000000',
        rateBps: 500,
        dayCount: 360,
      }),
    );

    // 1 000 000 × 5% × 91 ÷ 360 = 12 638.88..., against 12 465.75 on 365.
    expect(on360.charged).toBe('12638.88888888');
    expect(on360.charged).not.toBe('12465.75342465');
  });

  it('divides once, at the end', () => {
    /*
     * Taking the rate first would give 1 × 91 ÷ 365 on a truncated figure.
     * A single denominator of 10 000 × 365 keeps the whole thing exact until
     * the last step, and this is the case that shows it: a rate small enough
     * that an early truncation would round the charge away entirely.
     */
    const out = computeLatePayment(
      input({
        method: 'rate_on_overdue',
        stipulated: undefined,
        outstanding: '0.00000100',
        rateBps: 1,
        dayCount: 365,
      }),
    );

    expect(out.charged).toBe('0');
    // And the figure it came from is still shown, so the zero is checkable.
    expect(out.steps.find((s) => s.label === 'Outstanding')?.value).toBe('0.000001');
  });
});

describe('nothing becomes income', () => {
  const costs = [{ description: 'Court filing fee', amount: '1200' }];

  it('retains evidenced collection cost where the board permits it', () => {
    const out = computeLatePayment(input({ retention: 'evidenced_costs', costs }));

    expect(out.retained).toBe('1200');
    expect(out.toBeGivenAway).toBe('3800');
  });

  it('retains nothing where the board permits nothing, however good the evidence', () => {
    const out = computeLatePayment(input({ retention: 'nothing', costs }));

    // Sending the field does not override the ruling. An interface that
    // honoured costs because they arrived would let a payload decide this.
    expect(out.retained).toBe('0');
    expect(out.toBeGivenAway).toBe('5000');
    expect(out.steps.find((s) => s.label === 'Collection cost evidenced')?.working).toContain(
      'permits no retention',
    );
  });

  it('never retains more than was charged', () => {
    const out = computeLatePayment(
      input({
        retention: 'evidenced_costs',
        costs: [{ description: 'Court filing fee', amount: '9000' }],
      }),
    );

    // The institution spending more on collection than it charged is a loss it
    // bore, not a claim on what is given away.
    expect(out.retained).toBe('5000');
    expect(out.toBeGivenAway).toBe('0');
    expect(out.steps.find((s) => s.label === 'Retained')?.working).toContain('a loss the institution bore');
  });

  it('refuses a cost with no description', () => {
    expect(() =>
      computeLatePayment(
        input({ retention: 'evidenced_costs', costs: [{ description: '  ', amount: '1200' }] }),
      ),
    ).toThrow(/A cost with no description is a number/);
  });

  it('has no field that would let an unevidenced amount stay', () => {
    const out = computeLatePayment(input({ retention: 'evidenced_costs' }));

    // No costs supplied, so nothing evidenced, so nothing retained. There is
    // no default and no optional allowance.
    expect(out.retained).toBe('0');
    expect(out.toBeGivenAway).toBe('5000');
  });

  it('says in the note that it does not become income by being received', () => {
    expect(computeLatePayment(input()).note).toBe(NOT_INCOME);
    expect(NOT_INCOME).toContain('does not become income by being');
  });
});

describe('whether the debtor could pay is recorded, never decided', () => {
  it('says nothing extra where the board established the debtor was delaying', () => {
    const out = computeLatePayment(input({ solvency: 'able_and_delaying' }));

    expect(out.solvencyWarning).toBeNull();
    expect(out.solvencyStated).toContain('able to pay and delayed');
  });

  it('warns rather than refusing where the debtor could not pay', () => {
    const out = computeLatePayment(input({ solvency: 'unable' }));

    /*
     * It still computes. Refusing would be this file ruling that no charge is
     * due, which is the board's to say — and a board comparing what the
     * contract would have produced against what it will permit needs the
     * figure in front of it.
     */
    expect(out.charged).toBe('5000');
    expect(out.solvencyWarning).toContain('is to be granted time');
    expect(out.solvencyWarning).toContain('not a finding that anything is due');
  });

  it('warns where nobody determined it, rather than treating silence as delay', () => {
    const out = computeLatePayment(input({ solvency: 'not_determined' }));

    expect(out.solvencyWarning).toContain('has not been determined');
    expect(out.charged).toBe('5000');
  });
});

describe('what it refuses', () => {
  const refusal = (over: Partial<LatePaymentInput>) => {
    try {
      computeLatePayment(input(over));
    } catch (e) {
      if (e instanceof BadFigure) return e;
      throw e;
    }
    throw new Error('expected a refusal');
  };

  it('refuses a charge on a payment that was not late', () => {
    const e = refusal({ paidOn: '2026-03-01' });
    expect(e.field).toBe('paidOn');
    expect(e.message).toContain('before it fell due');
  });

  it('refuses a charge on a payment made on the day it fell due', () => {
    expect(refusal({ paidOn: '2026-04-01' }).message).toContain('on the day it fell due');
  });

  it('refuses a missing rate rather than reading it as zero', () => {
    const e = refusal({
      method: 'rate_on_overdue',
      stipulated: undefined,
      outstanding: '1000000',
      rateBps: null,
      dayCount: 365,
    });

    // A rate of nothing is a decision to charge nothing, which is not the same
    // as not having said.
    expect(e.field).toBe('rateBps');
    expect(e.message).toContain('not the same as not having');
  });

  it('refuses to assume the day count', () => {
    const e = refusal({
      method: 'rate_on_overdue',
      stipulated: undefined,
      outstanding: '1000000',
      rateBps: 500,
      dayCount: undefined,
    });

    expect(e.field).toBe('dayCount');
    expect(e.message).toContain('different answers on the same debt');
  });

  it('refuses a missing stipulated amount rather than reading it as zero', () => {
    expect(refusal({ stipulated: undefined }).message).toContain('A missing figure is not a zero');
  });

  it('refuses a charge attached to no debt', () => {
    const e = refusal({ obligation: '  ' });
    expect(e.field).toBe('obligation');
    expect(e.message).toContain('cannot be checked next year');
  });

  it('refuses a figure with no source', () => {
    expect(refusal({ source: '' }).field).toBe('source');
  });

  it('refuses a date that is not a date', () => {
    expect(refusal({ paidOn: 'some time in July' }).field).toBe('paidOn');
  });
});

describe('nothing here reaches a verdict', () => {
  it('returns no field saying the charge was due', () => {
    const keys = Object.keys(computeLatePayment(input()));

    for (const forbidden of ['due', 'owed', 'payable', 'permissible', 'valid', 'lawful']) {
      expect(keys.some((k) => k.toLowerCase() === forbidden)).toBe(false);
    }
  });

  it('states the method and the retention in words rather than leaving them as keys', () => {
    const out = computeLatePayment(input({ retention: 'evidenced_costs' }));

    expect(out.methodStated).toContain('the figure the contract names');
    expect(out.retentionStated).toContain('an expense incurred rather than a return on time');
  });
});
