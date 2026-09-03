/**
 * What must be given away from a holding that passed screening.
 *
 * Not the same thing as the purification in `incident.ts`. That one follows a
 * breach: the institution earned income from an activity the board found
 * non-compliant, and the amount comes out of its ledger rather than from any
 * ratio. **This one is ongoing.** A share passes the three screening ratios and
 * still carries some non-permissible income, so what was received from it is
 * purified in proportion, every period, for as long as it is held.
 *
 * Conflating the two would be a real error, and the first draft of this project
 * did. One is an event with a thirty-day clock; the other is arithmetic that
 * runs quietly forever.
 *
 * ── the method is the board's ─────────────────────────────────────────────
 *
 * There are three ways to work it out and **they give different answers**:
 *
 *   per share    (non-permissible income ÷ shares outstanding) × units held
 *   per dividend (non-permissible income ÷ total income) × income received
 *   per unit      a published rate per unit × units held
 *
 * A system that picked one would be issuing a ruling in the shape of a default.
 * So the method is supplied, never inferred, and it is recorded as an operative
 * term the fatwa carries — after which the same method applies unchanged, every
 * period, until the board changes it.
 *
 * ── and what the software cannot know ─────────────────────────────────────
 *
 * Whether the figure supplied is gross or net, and whether it includes capital
 * gain or only income, are questions about **what the number means** rather
 * than about how to divide it. The software cannot inspect that, so it does not
 * branch on it: the board states the basis in its own words and the basis is
 * printed beside the result. Pretending to compute on a distinction it cannot
 * see would be worse than recording it.
 */

import { formatAmount, parseAmount, percent, ratioBps, shareOf } from './money.js';
import { Refused } from './lifecycle.js';

export type PurificationMethod = 'per_share' | 'per_dividend' | 'per_unit';

export const PURIFICATION_METHODS: readonly PurificationMethod[] = [
  'per_share',
  'per_dividend',
  'per_unit',
];

export interface PurificationInput {
  /** Supplied, never inferred. The three give different answers. */
  method: PurificationMethod;
  periodFrom: string;
  periodTo: string;
  currency: string;
  /** Who supplied the figures. A figure with no source is one somebody typed. */
  source: string;
  /**
   * What the figures cover, in the board's words: gross or net, income alone or
   * income and gain. Recorded rather than computed on, because the software
   * cannot see which a supplied number is.
   */
  basis: string;

  /** How much of the thing is held. */
  unitsHeld: string;

  /** per_share: the company's non-permissible income and its shares in issue. */
  nonPermissibleIncome?: string;
  sharesOutstanding?: string;

  /** per_dividend: the same income against total income, applied to what was received. */
  totalIncome?: string;
  incomeReceived?: string;

  /** per_unit: a rate the issuer or fund published. */
  ratePerUnit?: string;

  /**
   * Apportion by how long it was held.
   *
   * A modifier the board sets. Holding something for two months of a year and
   * purifying a full year's share overstates the obligation; not apportioning
   * at all understates it for a holding bought late. Neither is obviously
   * right, so it is a choice that gets recorded.
   */
  apportionByHoldingPeriod?: boolean;
  daysHeld?: number;
  daysInPeriod?: number;
}

export interface PurificationStep {
  label: string;
  working: string;
  value: string;
}

export interface Purification {
  method: PurificationMethod;
  methodStated: string;
  basis: string;
  periodFrom: string;
  periodTo: string;
  currency: string;
  source: string;

  /** What must be given away. */
  amount: string;
  /** Per unit held, so two holdings can be compared. */
  perUnit: string | null;
  /**
   * The proportion of what was received, where that is known.
   *
   * Null under per_share and per_unit, which do not take receipts as an input.
   * Reporting a proportion of something nobody supplied would be inventing one.
   */
  proportionOfReceiptsBps: number | null;

  steps: PurificationStep[];
  note: string;
}

const METHOD_STATED: Record<PurificationMethod, string> = {
  per_share:
    'The company’s non-permissible income divided by its shares in issue, multiplied by the units held.',
  per_dividend:
    'The company’s non-permissible income as a proportion of its total income, applied to what was received.',
  per_unit: 'A purification rate published per unit, multiplied by the units held.',
};

export const NOT_A_RULING =
  'This applies the method the board approved to the figures supplied. Whether that method ' +
  'is the right one, what the figures should cover, and where the amount is given, are the ' +
  'board’s to decide.';

/**
 * Refuse rather than compute with a gap.
 *
 * Every method needs its own figures, and a missing one is not a zero. A
 * purification of nothing, produced because a field was blank, is the most
 * dangerous output this file could return: it looks like an answer and it
 * discharges an obligation that was never computed.
 */
function require(value: string | undefined, field: string, method: PurificationMethod): string {
  if (value === undefined || value.trim() === '') {
    throw new Refused(
      'no_reason_given' as never,
      `The ${method.replace('_', ' ')} method needs "${field}", and it was not supplied. ` +
        'A missing figure is not a zero: purifying nothing because a field was blank would ' +
        'discharge an obligation nobody computed.',
    );
  }
  return value;
}

export function purify(input: PurificationInput): Purification {
  if (!PURIFICATION_METHODS.includes(input.method)) {
    throw new Refused(
      'not_found' as never,
      `"${input.method}" is not a method this knows. The board's choice among them is a ruling, ` +
        'and nothing here picks one.',
    );
  }

  const units = parseAmount(input.unitsHeld, 'unitsHeld');
  const cur = input.currency;
  const steps: PurificationStep[] = [];

  let gross: bigint;
  let proportionBps: number | null = null;

  if (input.method === 'per_share') {
    const income = parseAmount(require(input.nonPermissibleIncome, 'nonPermissibleIncome', input.method), 'nonPermissibleIncome');
    const shares = parseAmount(require(input.sharesOutstanding, 'sharesOutstanding', input.method), 'sharesOutstanding');

    if (shares <= 0n) {
      throw new Refused(
        'no_reason_given' as never,
        'Shares in issue is zero, so a per-share amount cannot be computed and no obligation has been worked out.',
      );
    }

    const perShare = (income * 100_000_000n) / shares;
    gross = (perShare * units) / 100_000_000n;

    steps.push({
      label: 'Non-permissible income of the company',
      working: `As supplied by ${input.source}`,
      value: `${formatAmount(income)} ${cur}`,
    });
    steps.push({
      label: 'Per share in issue',
      working: `${formatAmount(income)} ÷ ${formatAmount(shares)}`,
      value: `${formatAmount(perShare)} ${cur}`,
    });
    steps.push({
      label: 'Applied to the holding',
      working: `${formatAmount(perShare)} × ${formatAmount(units)}`,
      value: `${formatAmount(gross)} ${cur}`,
    });
  } else if (input.method === 'per_dividend') {
    const income = parseAmount(require(input.nonPermissibleIncome, 'nonPermissibleIncome', input.method), 'nonPermissibleIncome');
    const total = parseAmount(require(input.totalIncome, 'totalIncome', input.method), 'totalIncome');
    const received = parseAmount(require(input.incomeReceived, 'incomeReceived', input.method), 'incomeReceived');

    if (total <= 0n) {
      throw new Refused(
        'no_reason_given' as never,
        'Total income is zero, so the proportion cannot be computed and no obligation has been worked out.',
      );
    }

    const bps = ratioBps(income, total) ?? 0;
    gross = shareOf(received, bps);
    proportionBps = bps;

    steps.push({
      label: 'Non-permissible share of income',
      working: `${formatAmount(income)} ÷ ${formatAmount(total)}`,
      value: `${percent(bps)}%`,
    });
    steps.push({
      label: 'Received in the period',
      working: `As supplied by ${input.source}`,
      value: `${formatAmount(received)} ${cur}`,
    });
    steps.push({
      label: 'Applied to what was received',
      working: `${percent(bps)}% of ${formatAmount(received)}`,
      value: `${formatAmount(gross)} ${cur}`,
    });
  } else {
    const rate = parseAmount(require(input.ratePerUnit, 'ratePerUnit', input.method), 'ratePerUnit');
    gross = (rate * units) / 100_000_000n;

    steps.push({
      label: 'Published rate per unit',
      working: `As supplied by ${input.source}`,
      value: `${formatAmount(rate)} ${cur}`,
    });
    steps.push({
      label: 'Applied to the holding',
      working: `${formatAmount(rate)} × ${formatAmount(units)}`,
      value: `${formatAmount(gross)} ${cur}`,
    });
  }

  // ── the modifier the board sets ─────────────────────────────────────────
  let amount = gross;
  if (input.apportionByHoldingPeriod) {
    const held = input.daysHeld;
    const inPeriod = input.daysInPeriod;

    if (!Number.isFinite(held) || !Number.isFinite(inPeriod) || !inPeriod || inPeriod <= 0) {
      throw new Refused(
        'no_reason_given' as never,
        'Apportioning by holding period needs both the days held and the days in the period. ' +
          'Without them the apportionment cannot be computed, and applying none silently would ' +
          'quietly change the method the board approved.',
      );
    }

    const heldDays = BigInt(Math.max(0, Math.round(held as number)));
    const periodDays = BigInt(Math.round(inPeriod as number));
    amount = (gross * heldDays) / periodDays;

    steps.push({
      label: 'Apportioned by holding period',
      working: `${formatAmount(gross)} × ${heldDays} ÷ ${periodDays} days`,
      value: `${formatAmount(amount)} ${cur}`,
    });
  }

  const perUnit = units > 0n ? formatAmount((amount * 100_000_000n) / units) : null;

  return {
    method: input.method,
    methodStated: METHOD_STATED[input.method],
    basis: input.basis,
    periodFrom: input.periodFrom,
    periodTo: input.periodTo,
    currency: cur,
    source: input.source,

    amount: formatAmount(amount),
    perUnit,
    proportionOfReceiptsBps: proportionBps,

    steps,
    note: NOT_A_RULING,
  };
}

/**
 * The terms a board approves once, so a fatwa can carry them.
 *
 * After that the same method runs every period and shows its working, which is
 * the difference between a calculator and a compliance tool.
 */
export const PURIFICATION_TERMS = [
  { key: 'purificationMethod', meaning: 'Which of the three methods applies: per share, per dividend, or per unit.' },
  { key: 'purificationBasis', meaning: 'What the figures cover: gross or net, income alone or income and gain.' },
  { key: 'apportionByHoldingPeriod', meaning: 'Whether the amount is reduced for a holding held part of the period.' },
  { key: 'purificationDestination', meaning: 'Where it goes. The board decides this; the institution does not.' },
] as const;
