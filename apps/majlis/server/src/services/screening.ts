/**
 * The three screening ratios, measured against limits the board sets.
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
 * ── the limits belong to the board, and this file no longer holds any ─────
 *
 * This file used to ship three thresholds — 30%, 30%, 5% — each with a standard
 * named beside it. Both are gone, and the removal is the correction rather than
 * a tidy-up. What is measured is arithmetic and stays here. **Where the limit
 * sits is a ruling, so it now has to be given.**
 *
 * That is not fastidiousness. Boards differ on all three figures, on whether
 * each limit is inclusive, and on which denominator belongs underneath — and a
 * file that answered on their behalf, with a citation attached, was doing the
 * one thing this product exists to prevent. Worse, it was doing it invisibly:
 * a board that never set a threshold still saw *within the threshold*, and had
 * no way to tell that the limit it was being measured against was ours.
 *
 * A ratio computed with no limit given comes back with `withinThreshold: null`
 * and `unknownBecause: 'no_limit_set'`. The number is shown in full, and
 * nothing claims to have tested it.
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

/** Whether the board's limit is inclusive. The difference is in the text. */
export type Bound = 'at_or_below' | 'strictly_below';

/**
 * One limit, as this board set it.
 *
 * `basis` is the board's own words for what the limit rests on — a standard it
 * follows, a resolution of its own, a supervisor's circular. Optional, and
 * never written from here: nothing in this repository knows which standard
 * governs any board, and a citation no member wrote is worse than none at all.
 */
export interface Threshold {
  key: RatioKey;
  thresholdBps: number;
  bound: Bound;
  basis?: string;
}

/** What is measured. That is arithmetic, so it ships. The limit does not. */
export interface RatioDefinition {
  key: RatioKey;
  label: string;
  numeratorLabel: string;
  denominatorLabel: string;
}

/**
 * What the three ratios divide by what. No limits: see the file header.
 *
 * Whether a limit is inclusive is part of the limit and travels with it, in
 * `Threshold.bound`. Boards do differ on that, and collapsing it into one
 * comparison would be a quiet amendment to whichever board was right.
 */
export const RATIOS: readonly RatioDefinition[] = [
  {
    key: 'debt',
    label: 'Interest-bearing debt to market capitalisation',
    numeratorLabel: 'interest-bearing debt',
    denominatorLabel: 'market capitalisation',
  },
  {
    key: 'liquidity',
    label: 'Cash and interest-bearing securities to market capitalisation',
    numeratorLabel: 'cash and interest-bearing securities',
    denominatorLabel: 'market capitalisation',
  },
  {
    key: 'income',
    label: 'Non-permissible income to total revenue',
    numeratorLabel: 'non-permissible income',
    denominatorLabel: 'total revenue',
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
  /**
   * The limits this board set, by ratio. Absent or partial is a real state.
   *
   * A board that has ruled on one ratio and not the others gets one comparison
   * and two bare figures, which is exactly what it has decided. Nothing is
   * filled in for the two it has not reached.
   */
  thresholds?: Threshold[];
}

export interface RatioResult extends RatioDefinition {
  numerator: string;
  denominator: string;
  /** The board's limit, or null where the board has not set one. */
  thresholdBps: number | null;
  bound: Bound | null;
  /** What the board said its limit rests on. Never written from here. */
  basis: string | null;
  /**
   * Why there is no answer, where there is none.
   *
   * Two very different silences used to look identical. A ratio with a zero
   * denominator could not be computed; a ratio with no limit given was computed
   * perfectly and simply has nothing to be measured against. Reporting both as
   * `null` let an interface render "—" over each and let a reader assume the
   * figures were bad, when what was actually missing was the board's ruling.
   */
  unknownBecause: 'denominator_is_zero' | 'no_limit_set' | null;
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

function ratio(
  def: RatioDefinition,
  numerator: bigint,
  denominator: bigint,
  currency: string,
  limit: Threshold | undefined,
): RatioResult {
  const shown = {
    numerator: formatAmount(numerator),
    denominator: formatAmount(denominator),
  };

  const set = {
    thresholdBps: limit?.thresholdBps ?? null,
    bound: limit?.bound ?? null,
    basis: limit?.basis ?? null,
  };

  if (denominator <= 0n) {
    return {
      ...def,
      ...shown,
      ...set,
      valueBps: null,
      percent: null,
      withinThreshold: null,
      unknownBecause: 'denominator_is_zero',
      workings:
        `${def.denominatorLabel} is ${shown.denominator} ${currency}. ` +
        `The ratio cannot be computed, and no threshold has been tested.`,
    };
  }

  // Display value, rounded half-up, and never consulted for the comparison.
  const scaled = (numerator * BPS * 100n) / denominator;
  const bps = Number((scaled + 50n) / 100n);
  const percent = (bps / 100).toFixed(2);

  /*
   * The ratio is arithmetic and is always reported. The comparison is not, and
   * is reported only where the board has said what to compare against — this
   * is the branch that used to silently apply our own 30%.
   */
  if (!limit) {
    return {
      ...def,
      ...shown,
      ...set,
      valueBps: bps,
      percent,
      withinThreshold: null,
      unknownBecause: 'no_limit_set',
      workings:
        `${shown.numerator} ÷ ${shown.denominator} = ${percent}%. ` +
        `This board has not set a limit for this ratio, so nothing has been ` +
        `tested against one.`,
    };
  }

  // Exact comparison. numerator/denominator vs threshold/10000 becomes
  // numerator * 10000 vs denominator * threshold, entirely in integers.
  const left = numerator * BPS;
  const right = denominator * BigInt(limit.thresholdBps);
  const within = limit.bound === 'at_or_below' ? left <= right : left < right;

  const sign = limit.bound === 'at_or_below' ? '≤' : '<';
  const shownLimit = (limit.thresholdBps / 100).toFixed(2).replace(/\.00$/, '');

  return {
    ...def,
    ...shown,
    ...set,
    valueBps: bps,
    percent,
    withinThreshold: within,
    unknownBecause: null,
    workings:
      `${shown.numerator} ÷ ${shown.denominator} = ${percent}%, ` +
      `against this board’s limit of ${sign} ${shownLimit}%. ` +
      `${within ? 'Within' : 'Outside'} it.`,
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
  /**
   * How many of the three the board has actually set a limit for.
   *
   * Zero is the state a board starts in, and an interface that cannot tell it
   * apart from three will show a screen of dashes and let a reader conclude
   * the figures were rejected.
   */
  limitsSet: number;
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

  const limitFor = (key: RatioKey) => (figures.thresholds ?? []).find((t) => t.key === key);

  const results = [
    ratio(
      RATIOS[0],
      parseAmount(figures.interestBearingDebt, 'interestBearingDebt'),
      cap,
      figures.currency,
      limitFor('debt'),
    ),
    ratio(
      RATIOS[1],
      parseAmount(figures.cashAndInterestBearingSecurities, 'cashAndInterestBearingSecurities'),
      cap,
      figures.currency,
      limitFor('liquidity'),
    ),
    ratio(
      RATIOS[2],
      parseAmount(figures.nonPermissibleIncome, 'nonPermissibleIncome'),
      revenue,
      figures.currency,
      limitFor('income'),
    ),
  ];

  const untested = results.some((r) => r.withinThreshold === null);

  return {
    asOf: figures.asOf,
    source: figures.source,
    currency: figures.currency,
    ratios: results,
    allWithinThresholds: untested ? null : results.every((r) => r.withinThreshold === true),
    limitsSet: results.filter((r) => r.thresholdBps !== null).length,
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
      /*
       * The limit is named as the board's own, and its basis only where the
       * board gave one. Naming a standard here would put a citation into the
       * question a scholar is being asked — which is where it would do the
       * most damage, because a question is answered on the terms it is put in.
       */
      questionForBoard: intoBreach
        ? `${now.label} was ${was.percent}% when the board last ruled and is now ${now.percent}%, ` +
          `outside the limit this board set${now.basis ? ` on ${now.basis}` : ''}. ` +
          `Does the standing ruling still hold?`
        : `${now.label} was ${was.percent}% and is now ${now.percent}%, back within the limit this ` +
          `board set${now.basis ? ` on ${now.basis}` : ''}. ` +
          `Does that change anything the board decided on that basis?`,
    });
  }

  return out;
}
