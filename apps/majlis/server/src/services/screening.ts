/**
 * The three screening ratios of AAOIFI Shariah Standard No. 21.
 *
 * **This file computes. It never concludes.**
 *
 * That sentence is the whole design. A ratio that exceeds its threshold is an
 * arithmetic fact about a company's balance sheet; whether the instrument is
 * therefore impermissible is a ruling, and rulings belong to the board. Nothing
 * here returns a field called compliant, permissible, halal or approved, and
 * nothing here has an opinion about what a board should do with the numbers.
 * What it does is take the work of *finding and calculating* away, which is the
 * only part of this that is not judgement.
 *
 * The arithmetic is shown rather than asserted. A scholar who is handed "31.4%,
 * fails" has been given a conclusion to accept; one who is handed "1 240 000 000
 * ÷ 3 950 000 000" has been given something they can check, and disagree with,
 * and take to the institution that supplied the figures.
 *
 * Money is never a float. Every amount arrives as a string and stays one, and
 * every comparison is done in exact integer arithmetic — a threshold test that
 * flipped because of binary rounding at the fifteenth decimal place would be a
 * ruling decided by IEEE 754.
 *
 * ── a correction this file exists partly to make ──────────────────────────
 * A **30% tangible-asset ratio** appears in older screening material and in the
 * demonstration data this repository shipped with. AAOIFI Shariah Standard
 * No. 59 on the Sale of Debt revised it. It is not among the three below, and
 * teaching it as current would be the same fault as a document describing code
 * that does not exist.
 */

import { formatAmount, parseAmount } from './money.js';

/*
 * The exact-decimal machinery moved to `money.ts` when a second calculation
 * needed it. Re-exported here because callers and tests already import these
 * names from this module, and moving a file should not break a name.
 */
export { BadFigure, formatAmount, parseAmount } from './money.js';

const BPS = 10_000n;

export type RatioKey = 'debt' | 'liquidity' | 'income';

/** Whether the standard's limit is inclusive. The difference is in the text. */
export type Bound = 'at_or_below' | 'strictly_below';

export interface RatioDefinition {
  key: RatioKey;
  label: string;
  numeratorLabel: string;
  denominatorLabel: string;
  thresholdBps: number;
  bound: Bound;
  /** Where the rule comes from, in the words a scholar would look for. */
  authority: string;
}

/**
 * Two of the three are inclusive limits and one is not. That is how the
 * standard is written, and collapsing them into one comparison would be a
 * quiet amendment to it.
 */
export const RATIOS: readonly RatioDefinition[] = [
  {
    key: 'debt',
    label: 'Interest-bearing debt to market capitalisation',
    numeratorLabel: 'interest-bearing debt',
    denominatorLabel: 'market capitalisation',
    thresholdBps: 3000,
    bound: 'at_or_below',
    authority: 'AAOIFI Shariah Standard No. 21',
  },
  {
    key: 'liquidity',
    label: 'Cash and interest-bearing securities to market capitalisation',
    numeratorLabel: 'cash and interest-bearing securities',
    denominatorLabel: 'market capitalisation',
    thresholdBps: 3000,
    bound: 'strictly_below',
    authority: 'AAOIFI Shariah Standard No. 21',
  },
  {
    key: 'income',
    label: 'Non-permissible income to total revenue',
    numeratorLabel: 'non-permissible income',
    denominatorLabel: 'total revenue',
    thresholdBps: 500,
    bound: 'at_or_below',
    authority: 'AAOIFI Shariah Standard No. 21',
  },
];

export interface Figures {
  /** The date the figures describe, not the date they were entered. */
  asOf: string;
  /** Who supplied them. A ratio is only as good as its source. */
  source: string;
  currency: string;
  marketCapitalisation: string;
  interestBearingDebt: string;
  cashAndInterestBearingSecurities: string;
  totalRevenue: string;
  nonPermissibleIncome: string;
}

export interface RatioResult extends RatioDefinition {
  numerator: string;
  denominator: string;
  /**
   * The ratio in basis points, rounded for display only.
   *
   * Null where the denominator is zero. **Never used for the threshold test** —
   * that is done exactly, so a figure that displays as 30.00% cannot be within
   * the limit on one screen and outside it on another.
   */
  valueBps: number | null;
  /** The same, as a percentage string to two places. */
  percent: string | null;
  withinThreshold: boolean | null;
  /** The sum, written out, so it can be checked rather than believed. */
  workings: string;
}

function ratio(def: RatioDefinition, numerator: bigint, denominator: bigint, currency: string): RatioResult {
  const shown = {
    numerator: formatAmount(numerator),
    denominator: formatAmount(denominator),
  };

  if (denominator <= 0n) {
    return {
      ...def,
      ...shown,
      valueBps: null,
      percent: null,
      withinThreshold: null,
      workings:
        `${def.denominatorLabel} is ${shown.denominator} ${currency}. ` +
        `The ratio cannot be computed, and no threshold has been tested.`,
    };
  }

  // Exact comparison first. numerator/denominator vs threshold/10000 becomes
  // numerator * 10000 vs denominator * threshold, entirely in integers.
  const left = numerator * BPS;
  const right = denominator * BigInt(def.thresholdBps);
  const within = def.bound === 'at_or_below' ? left <= right : left < right;

  // Display value, rounded half-up, and never consulted above.
  const scaled = (numerator * BPS * 100n) / denominator;
  const bps = Number((scaled + 50n) / 100n);
  const percent = (bps / 100).toFixed(2);

  const sign = def.bound === 'at_or_below' ? '≤' : '<';
  const limit = (def.thresholdBps / 100).toFixed(0);

  return {
    ...def,
    ...shown,
    valueBps: bps,
    percent,
    withinThreshold: within,
    workings:
      `${shown.numerator} ÷ ${shown.denominator} = ${percent}%, ` +
      `against a limit of ${sign} ${limit}%. ` +
      `${within ? 'Within' : 'Outside'} the threshold.`,
  };
}

export interface Assessment {
  asOf: string;
  source: string;
  currency: string;
  ratios: RatioResult[];
  /**
   * Whether every ratio that could be computed is within its threshold.
   *
   * Null when any could not be computed. **This is not a finding of
   * permissibility** and must never be labelled as one in an interface: a
   * company can pass all three and still be impermissible on its business
   * activity, which is a question no ratio answers.
   */
  allWithinThresholds: boolean | null;
  /** Said in the output, not only in this file, because output travels. */
  note: string;
}

export const NOT_A_RULING =
  'These are arithmetic facts about the figures supplied. Whether the instrument ' +
  'is permissible is a ruling for the board, and no ratio answers it — the ' +
  'business activity itself is a separate question entirely.';

export function assess(figures: Figures): Assessment {
  const cap = parseAmount(figures.marketCapitalisation, 'marketCapitalisation');
  const revenue = parseAmount(figures.totalRevenue, 'totalRevenue');

  const results = [
    ratio(RATIOS[0], parseAmount(figures.interestBearingDebt, 'interestBearingDebt'), cap, figures.currency),
    ratio(
      RATIOS[1],
      parseAmount(figures.cashAndInterestBearingSecurities, 'cashAndInterestBearingSecurities'),
      cap,
      figures.currency,
    ),
    ratio(RATIOS[2], parseAmount(figures.nonPermissibleIncome, 'nonPermissibleIncome'), revenue, figures.currency),
  ];

  const uncomputable = results.some((r) => r.withinThreshold === null);

  return {
    asOf: figures.asOf,
    source: figures.source,
    currency: figures.currency,
    ratios: results,
    allWithinThresholds: uncomputable ? null : results.every((r) => r.withinThreshold === true),
    note: NOT_A_RULING,
  };
}

// ── drift ─────────────────────────────────────────────────────────────────

export interface Crossing {
  key: RatioKey;
  label: string;
  /** Which way it went. */
  direction: 'into_breach' | 'back_within';
  was: string | null;
  now: string | null;
  /** Stated as something for the board to look at, never as a conclusion. */
  questionForBoard: string;
}

/**
 * What changed side since the board last looked.
 *
 * This is the part that earns its keep. Screening drifts silently: a ruling is
 * given on figures that were true in March, the balance sheet moves in July,
 * and nobody finds out until the audit. Comparing two assessments is arithmetic
 * and needs no judgement, so the system can do it — and then **raise the
 * question**, which is where its authority ends.
 *
 * It never re-rules and it never withdraws the standing ruling. It says the
 * basis has changed.
 */
export function crossings(previous: Assessment, current: Assessment): Crossing[] {
  const before = new Map(previous.ratios.map((r) => [r.key, r]));
  const out: Crossing[] = [];

  for (const now of current.ratios) {
    const was = before.get(now.key);
    if (!was) continue;
    if (was.withinThreshold === null || now.withinThreshold === null) continue;
    if (was.withinThreshold === now.withinThreshold) continue;

    const intoBreach = was.withinThreshold && !now.withinThreshold;
    out.push({
      key: now.key,
      label: now.label,
      direction: intoBreach ? 'into_breach' : 'back_within',
      was: was.percent,
      now: now.percent,
      questionForBoard: intoBreach
        ? `${now.label} was ${was.percent}% when the board last ruled and is now ${now.percent}%, ` +
          `outside the threshold in ${now.authority}. Does the standing ruling still hold?`
        : `${now.label} was ${was.percent}% and is now ${now.percent}%, back within the threshold in ` +
          `${now.authority}. Does that change anything the board decided on that basis?`,
    });
  }

  return out;
}
