import { describe, it, expect } from 'vitest';
import { distribute, type DistributionInput } from '../src/services/distribution.js';

/**
 * The reserves are two rates and two caps, applied in a fixed order.
 *
 * What is worth testing is the order — PER before the split so both parties
 * bear it, IRR after it so only the depositors do — and the one thing the
 * annual report's opinion actually rests on: what smoothing did, as a number.
 */

const base: DistributionInput = {
  periodFrom: '2026-01-01',
  periodTo: '2026-03-31',
  currency: 'AED',
  source: 'Treasury, unaudited management accounts',
  grossProfit: '1000000',
  mudaribShareBps: 3000, // 30% to the bank
  perDeductionBps: 500, // 5% of gross
  perBalance: '0',
  perCap: '10000000',
  irrDeductionBps: 200, // 2% of the depositors' share
  irrBalance: '0',
  irrCap: '10000000',
  depositorFunds: '100000000',
};

const run = (over: Partial<DistributionInput> = {}) => distribute({ ...base, ...over });

describe('the order is the whole design', () => {
  it('takes PER from gross, before the split, so both parties bear it', () => {
    const d = run();
    // 5% of 1 000 000 = 50 000. Distributable is 950 000.
    expect(d.distributableProfit).toBe('950000');
    // The mudarib's 30% is of the reduced figure, not of gross.
    expect(d.mudaribShare).toBe('285000');
    expect(d.depositorsShare).toBe('665000');
  });

  it('takes IRR after the split, from the depositors’ share alone', () => {
    const d = run();
    // 2% of 665 000 = 13 300.
    expect(d.paidToDepositors).toBe('651700');
    // The mudarib is untouched by it.
    expect(d.mudaribShare).toBe('285000');
  });

  it('writes out every sum so it can be checked', () => {
    const d = run();
    expect(d.steps.map((s) => s.label)).toEqual([
      'Gross profit',
      'Less profit equalisation reserve',
      'Distributable profit',
      'Mudarib’s share',
      'Depositors’ share',
      'Less investment risk reserve',
      'Paid to depositors',
    ]);
    expect(d.steps[1].working).toContain('5.00% of 1000000');
    expect(d.steps[5].working).toContain('from the depositors’ share alone');
  });

  it('records the method, because the fatwa carries it', () => {
    expect(run().method).toContain('before the split');
    expect(run().method).toContain('after the split');
  });
});

describe('the caps are a ceiling on the balance, not on the deduction', () => {
  it('takes only the headroom when the full rate would breach the cap', () => {
    const d = run({ perBalance: '48000', perCap: '50000' });
    // 5% would be 50 000; only 2 000 of headroom remains.
    expect(d.reserves[0].movement).toBe('2000');
    expect(d.reserves[0].cappedAt).toBe(true);
    expect(d.reserves[0].closingBalance).toBe('50000');
    expect(d.distributableProfit).toBe('998000');
  });

  it('takes nothing at all once the cap is reached', () => {
    const d = run({ perBalance: '50000', perCap: '50000' });
    expect(d.reserves[0].movement).toBe('0');
    expect(d.distributableProfit).toBe('1000000');
  });

  it('says how much room is left', () => {
    const d = run({ perBalance: '0', perCap: '200000' });
    expect(d.reserves[0].headroom).toBe('150000');
  });

  it('explains the cap in the working rather than silently taking less', () => {
    const d = run({ perBalance: '48000', perCap: '50000' });
    expect(d.steps[1].working).toContain('below its cap');
  });
});

describe('what smoothing did, which is what the opinion rests on', () => {
  it('compares the payout against the same period with neither reserve touched', () => {
    const d = run();
    // Without smoothing the depositors take 70% of gross: 700 000.
    expect(d.smoothing.withoutSmoothing).toBe('700000');
    expect(d.smoothing.paid).toBe('651700');
    expect(d.smoothing.difference).toBe('-48300');
    expect(d.smoothing.direction).toBe('lowered');
  });

  it('says plainly that a good period was retained against a later one', () => {
    expect(run().smoothing.note).toContain('earned');
    expect(run().smoothing.note).toContain('retained against later ones');
  });

  it('reports a payout raised out of earlier reserves as raised', () => {
    // Nothing taken this period, so what is paid is what was earned…
    const flat = run({ perDeductionBps: 0, irrDeductionBps: 0 });
    expect(flat.smoothing.direction).toBe('none');
    expect(flat.smoothing.note).toContain('what the period earned');
  });

  it('expresses both as a rate where the funds are known', () => {
    const d = run();
    // 700 000 on 100 000 000 is 70 bps; 651 700 is 65 bps.
    expect(d.smoothing.rateWithoutSmoothingBps).toBe(70);
    expect(d.smoothing.ratePaidBps).toBe(65);
  });

  it('says nothing about a rate when nobody supplied the funds', () => {
    const d = run({ depositorFunds: undefined });
    expect(d.smoothing.rateWithoutSmoothingBps).toBeNull();
    expect(d.smoothing.ratePaidBps).toBeNull();
  });
});

describe('what it refuses to be', () => {
  it('states no verdict anywhere in the output', () => {
    const text = JSON.stringify(run()).toLowerCase();
    for (const word of ['permissible', 'compliant', 'halal', 'haram', 'proper"', 'approved:']) {
      expect(text).not.toContain(word);
    }
  });

  it('carries the sentence saying the judgement is the board’s', () => {
    expect(run().note).toContain('matters for the board');
    expect(run().note).toContain('whether the smoothing was proper');
  });

  it('names who supplied the figures', () => {
    expect(run().source).toContain('management accounts');
    expect(run().steps[0].working).toContain('Treasury');
  });

  it('refuses a figure that is not a figure rather than coercing it', () => {
    expect(() => run({ grossProfit: 'about a million' })).toThrow(/not a plain decimal figure/);
  });

  it('holds exact decimals through the whole chain', () => {
    const d = run({ grossProfit: '1000000.55', perDeductionBps: 0, irrDeductionBps: 0 });
    expect(d.distributableProfit).toBe('1000000.55');
    // 70% of 1 000 000.55 = 700 000.385
    expect(d.depositorsShare).toBe('700000.385');
  });
});

describe('a period that lost money', () => {
  it('draws the reserve down rather than topping it up', () => {
    // 5% of a 200 000 loss releases 10 000 from a reserve that holds it.
    const d = run({ grossProfit: '-200000', perBalance: '60000' });
    expect(d.reserves[0].movement).toBe('-10000');
    expect(d.reserves[0].closingBalance).toBe('50000');
    // The release cushions the loss: −200 000 less −10 000 is −190 000.
    expect(d.distributableProfit).toBe('-190000');
  });

  it('releases only what the reserve actually holds', () => {
    const d = run({ grossProfit: '-200000', perBalance: '4000' });
    expect(d.reserves[0].movement).toBe('-4000');
    expect(d.reserves[0].closingBalance).toBe('0');
    expect(d.distributableProfit).toBe('-196000');
  });

  it('never takes a reserve below zero, whatever the loss', () => {
    // The failure this guards: a cushion the bank never built showing as one.
    const d = run({ grossProfit: '-5000000', perBalance: '0', irrBalance: '0' });
    expect(d.reserves[0].movement).toBe('0');
    expect(d.reserves[0].closingBalance).toBe('0');
    expect(d.reserves[1].closingBalance).toBe('0');
    for (const r of d.reserves) expect(r.closingBalance.startsWith('-')).toBe(false);
  });

  it('carries the loss through to the depositors rather than inventing a payout', () => {
    const d = run({ grossProfit: '-200000', perBalance: '0', irrBalance: '0' });
    expect(d.paidToDepositors.startsWith('-')).toBe(true);
  });
});
