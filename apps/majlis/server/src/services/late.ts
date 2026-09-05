/**
 * An increase taken on a late debt, and the one thing it may not become.
 *
 * A customer owes an instalment and pays it three months late. The contract
 * stipulates a charge. **That charge is not income.** AAOIFI SS-3 permits a
 * board to require an amount of a solvent debtor who delays, as a deterrent
 * against delay rather than as a price for time — and an amount that is a price
 * for time is riba whatever the contract calls it. So what is taken goes to
 * charity, and the institution keeps at most what it can evidence it actually
 * spent collecting.
 *
 * This file is small and it is the same shape as the other calculations: an
 * amount identified, a method the board prescribed, and a destination. It feeds
 * purification, which already exists and already has somewhere to put it.
 *
 * ── the three things it will not do ───────────────────────────────────────
 *
 * **It will not let the charge become income.** `retained` can only be
 * evidenced collection costs, only where the board permits retention at all,
 * and never more than was charged. Everything else is `toBeGivenAway`. There
 * is no field that lets an unevidenced amount stay with the institution — not
 * a defaulted one, not an optional one.
 *
 * **It will not decide whether the debtor was able to pay.** A charge on a
 * debtor who genuinely cannot pay is the thing the standard forbids, and
 * *"if the debtor is in difficulty, then grant him time"* is not a question
 * arithmetic reaches. It is asked, recorded, and carried beside the figure —
 * and where the answer is that the debtor could not pay, or that nobody
 * determined it, the result says so plainly rather than quietly computing on.
 *
 * **It will not guess the day count.** 360 and 365 give different answers on
 * the same debt, and which one the contract uses is a term rather than a
 * convention this file may assume.
 *
 * ── the arithmetic ────────────────────────────────────────────────────────
 *
 * One division, at the end. Computing the rate, then the day fraction, then
 * multiplying would truncate twice, and a charge is being taken off somebody —
 * the error should not be introduced by the order of operations.
 */

import { BadFigure, formatAmount, parseAmount, percent } from './money.js';

export type LateMethod = 'stipulated_amount' | 'rate_on_overdue';

export const LATE_METHODS: readonly LateMethod[] = ['stipulated_amount', 'rate_on_overdue'];

/**
 * Whether the board permits the institution to keep anything at all.
 *
 * Boards differ, and the difference is a ruling. Some permit the direct,
 * evidenced cost of collection to be retained on the ground that it is a real
 * expense rather than a return on time; some require the whole amount to be
 * given away and treat the cost of collection as the institution's own.
 */
export type Retention = 'nothing' | 'evidenced_costs';

export const RETENTIONS: readonly Retention[] = ['nothing', 'evidenced_costs'];

/**
 * What the board established about the debtor, in the board's own terms.
 *
 * Not a flag this file acts on. It is recorded and carried, because the answer
 * changes whether a charge is due at all and that is not arithmetic.
 */
export type Solvency = 'able_and_delaying' | 'unable' | 'not_determined';

export const SOLVENCIES: readonly Solvency[] = ['able_and_delaying', 'unable', 'not_determined'];

/** The day count the contract uses. Supplied, because the two disagree. */
export type DayCount = 360 | 365;

export interface CollectionCost {
  /** What it was. A cost with no description is a number. */
  description: string;
  amount: string;
}

export interface LatePaymentInput {
  method: LateMethod;
  currency: string;
  source: string;
  /** The debt this arises on. Recorded, never computed on. */
  obligation: string;
  dueOn: string;
  paidOn: string;
  solvency: Solvency;
  retention: Retention;

  /** stipulated_amount: the figure the contract names. */
  stipulated?: string;

  /** rate_on_overdue: what was outstanding, at what rate, on which day count. */
  outstanding?: string;
  rateBps?: number | null;
  dayCount?: DayCount;

  /** Only ever retained against these, and only where the board permits it. */
  costs?: CollectionCost[];
}

export interface LateStep {
  label: string;
  working: string;
  value: string;
}

export interface LatePayment {
  method: LateMethod;
  methodStated: string;
  currency: string;
  source: string;
  obligation: string;
  dueOn: string;
  paidOn: string;
  daysLate: number;

  solvency: Solvency;
  /** What the board established, said in words beside the figure. */
  solvencyStated: string;
  /** Present where the solvency answer means the charge may not be due at all. */
  solvencyWarning: string | null;

  retention: Retention;
  retentionStated: string;

  /** What the method produced. */
  charged: string;
  /** Evidenced collection cost the board permits the institution to keep. */
  retained: string;
  /** Everything else. This is the figure purification takes. */
  toBeGivenAway: string;

  steps: LateStep[];
  note: string;
}

const DAY = 86_400_000;

/**
 * What this calculation did not answer.
 *
 * Travels with the figures unchanged, like the other four. The sentence that
 * matters is the second one: a charge that stayed with the institution would be
 * a return on time, and no arrangement of the arithmetic makes it otherwise.
 */
export const NOT_INCOME =
  'This computes an amount and says where the board directed it. It does not ' +
  'decide whether a charge was due — that turns on whether the debtor could ' +
  'have paid and chose not to, which is a ruling and is recorded here rather ' +
  'than computed. What is not retained against evidenced collection cost is to ' +
  'be given away: an increase taken for the passage of time is a return on ' +
  'time whatever the contract calls it, and it does not become income by being ' +
  'received.';

const METHOD_STATED: Record<LateMethod, string> = {
  stipulated_amount:
    'The amount is the figure the contract names, applied as it stands. Nothing here scales it ' +
    'by how late the payment was.',
  rate_on_overdue:
    'The amount is a rate on what was outstanding for the days it was outstanding, on the day ' +
    'count the contract uses.',
};

const RETENTION_STATED: Record<Retention, string> = {
  nothing:
    'This board permits the institution to retain nothing. The whole amount is to be given away, ' +
    'and the cost of collection is the institution’s own.',
  evidenced_costs:
    'This board permits the institution to retain the direct cost of collection where it is ' +
    'evidenced, on the ground that it is an expense incurred rather than a return on time. ' +
    'Anything beyond what is evidenced is to be given away.',
};

const SOLVENCY_STATED: Record<Solvency, string> = {
  able_and_delaying:
    'The board established that this debtor was able to pay and delayed.',
  unable:
    'The board established that this debtor was unable to pay.',
  not_determined:
    'Whether this debtor was able to pay has not been determined.',
};

const SOLVENCY_WARNING: Record<Solvency, string | null> = {
  able_and_delaying: null,
  unable:
    'A charge on a debtor who could not pay is the thing AAOIFI SS-3 forbids — one in ' +
    'difficulty is to be granted time. The figures below are what the method produces on ' +
    'these inputs. They are not a finding that anything is due.',
  not_determined:
    'The charge turns on whether this debtor could have paid and chose not to, and that has ' +
    'not been determined. The figures below are what the method produces on these inputs. ' +
    'They are not a finding that anything is due.',
};

function daysBetween(dueOn: string, paidOn: string): number {
  const due = Date.parse(dueOn);
  const paid = Date.parse(paidOn);
  if (Number.isNaN(due)) throw new BadFigure('dueOn', 'The date the payment fell due is not a date.');
  if (Number.isNaN(paid)) throw new BadFigure('paidOn', 'The date the payment was made is not a date.');
  return Math.floor((paid - due) / DAY);
}

export function computeLatePayment(input: LatePaymentInput): LatePayment {
  if (!input.source.trim()) {
    throw new BadFigure(
      'source',
      'A figure with no source is one somebody typed. Name where the amounts came from.',
    );
  }
  if (!input.obligation.trim()) {
    throw new BadFigure(
      'obligation',
      'Name the debt this arises on. A charge attached to nothing cannot be checked next year, ' +
        'and cannot be given away against anything in particular.',
    );
  }

  const daysLate = daysBetween(input.dueOn, input.paidOn);
  if (daysLate <= 0) {
    throw new BadFigure(
      'paidOn',
      `The payment was made ${daysLate === 0 ? 'on the day it fell due' : 'before it fell due'}. ` +
        'A late payment charge on a payment that was not late is not a late payment charge.',
    );
  }

  const steps: LateStep[] = [
    {
      label: 'Days late',
      working: `${input.dueOn} to ${input.paidOn}`,
      value: String(daysLate),
    },
  ];

  let charged: bigint;

  if (input.method === 'stipulated_amount') {
    if (input.stipulated === undefined || input.stipulated.trim() === '') {
      throw new BadFigure(
        'stipulated',
        'Send the amount the contract names. A missing figure is not a zero: a charge computed ' +
          'around a gap is a charge nobody checked.',
      );
    }
    charged = parseAmount(input.stipulated, 'stipulated');
    steps.push({
      label: 'Amount stipulated',
      working: 'as the contract names it',
      value: formatAmount(charged),
    });
  } else {
    if (input.outstanding === undefined || input.outstanding.trim() === '') {
      throw new BadFigure('outstanding', 'Send what was outstanding. A missing figure is not a zero.');
    }
    if (input.rateBps === null || input.rateBps === undefined) {
      throw new BadFigure(
        'rateBps',
        'Send the rate the contract stipulates. Nothing here reads a missing rate as zero — a ' +
          'rate of nothing is a decision to charge nothing, which is not the same as not having ' +
          'said.',
      );
    }
    if (!Number.isInteger(input.rateBps) || input.rateBps < 0) {
      throw new BadFigure('rateBps', 'The rate is a whole number of basis points and cannot be negative.');
    }
    if (input.dayCount !== 360 && input.dayCount !== 365) {
      throw new BadFigure(
        'dayCount',
        'Send the day count the contract uses: 360 or 365. They give different answers on the ' +
          'same debt, and which applies is a term rather than a convention to assume.',
      );
    }

    const outstanding = parseAmount(input.outstanding, 'outstanding');

    /*
     * One division, at the end.
     *
     * Taking the rate first and the day fraction second would truncate twice,
     * and this figure is being taken off somebody. The error should not be
     * introduced by the order of operations.
     */
    charged =
      (outstanding * BigInt(input.rateBps) * BigInt(daysLate)) / (10_000n * BigInt(input.dayCount));

    steps.push({
      label: 'Outstanding',
      working: 'as at the date it fell due',
      value: formatAmount(outstanding),
    });
    steps.push({
      label: 'Charge',
      working:
        `${formatAmount(outstanding)} × ${percent(input.rateBps)}% × ${daysLate} ÷ ${input.dayCount}`,
      value: formatAmount(charged),
    });
  }

  // ── where it goes ───────────────────────────────────────────────────────

  const costs = input.costs ?? [];
  let evidenced = 0n;

  for (const cost of costs) {
    if (!cost.description.trim()) {
      throw new BadFigure(
        'costs',
        'A cost with no description is a number. Say what was spent before the institution ' +
          'keeps it.',
      );
    }
    evidenced += parseAmount(cost.amount, 'costs');
  }

  let retained: bigint;

  if (input.retention === 'nothing') {
    /*
     * The board permits nothing, so nothing is retained — and evidence sent
     * anyway does not change that. An interface that quietly honoured costs
     * because they were supplied would be letting the sending of a field
     * override the board's ruling.
     */
    retained = 0n;
    if (evidenced > 0n) {
      steps.push({
        label: 'Collection cost evidenced',
        working: 'this board permits no retention, so none of it is retained',
        value: formatAmount(evidenced),
      });
    }
  } else {
    // Never more than was charged. There is no excess to keep: the institution
    // spending more on collection than it charged is a loss it bore, not a
    // claim on the amount given away.
    retained = evidenced > charged ? charged : evidenced;
    for (const cost of costs) {
      steps.push({
        label: `Cost — ${cost.description}`,
        working: 'evidenced, and retainable under this board’s ruling',
        value: formatAmount(parseAmount(cost.amount, 'costs')),
      });
    }
    if (evidenced > charged) {
      steps.push({
        label: 'Retained',
        working:
          `${formatAmount(evidenced)} was evidenced and only ${formatAmount(charged)} was charged. ` +
          'The difference is a loss the institution bore, not a claim on what is given away.',
        value: formatAmount(retained),
      });
    }
  }

  const given = charged - retained;

  steps.push({
    label: 'To be given away',
    working: `${formatAmount(charged)} − ${formatAmount(retained)}`,
    value: formatAmount(given),
  });

  return {
    method: input.method,
    methodStated: METHOD_STATED[input.method],
    currency: input.currency,
    source: input.source,
    obligation: input.obligation,
    dueOn: input.dueOn,
    paidOn: input.paidOn,
    daysLate,
    solvency: input.solvency,
    solvencyStated: SOLVENCY_STATED[input.solvency],
    solvencyWarning: SOLVENCY_WARNING[input.solvency],
    retention: input.retention,
    retentionStated: RETENTION_STATED[input.retention],
    charged: formatAmount(charged),
    retained: formatAmount(retained),
    toBeGivenAway: formatAmount(given),
    steps,
    note: NOT_INCOME,
  };
}
