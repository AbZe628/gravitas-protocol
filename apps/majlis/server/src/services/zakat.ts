/**
 * What is due, and from whom.
 *
 * The annual report already tells a board it cannot state zakat, because
 * nothing here held it. That gap is named in `annual.ts` and this closes it.
 *
 * ── three choices, none of them the software's ────────────────────────────
 *
 * **The base.** Net assets, or net invested funds. They start from opposite
 * ends — one adds up what is zakatable and subtracts what is owed, the other
 * takes the funds put in and subtracts what is not zakatable — and on the same
 * balance sheet they do not have to agree.
 *
 * **The rate.** 2.5% where the year is lunar, 2.577% where the accounting year
 * is solar. A board using a solar financial year and a lunar rate is
 * under-computing by a tenth of a percent every year, and a board using the
 * solar rate on a lunar year is over-computing. Neither is a rounding question.
 *
 * **Who bears it.** The institution, or the shareholders, or both. This is a
 * disclosure in its own right and the annual report asks for it: an institution
 * that computes zakat its shareholders are due to pay has computed a figure and
 * discharged nothing, and saying so is the point.
 *
 * ── and the same line as every other calculation here ─────────────────────
 *
 * It computes and it never concludes. It does not say the obligation is
 * discharged, because nothing here knows whether anything was paid, and it does
 * not say a base is right — only what follows arithmetically from the figures
 * supplied and the method the board approved.
 */

import { formatAmount, parseAmount } from './money.js';
import { Refused } from './lifecycle.js';

export type ZakatMethod = 'net_assets' | 'net_invested_funds';
export type ZakatYear = 'lunar' | 'solar';
export type BorneBy = 'institution' | 'shareholders' | 'both';

export const ZAKAT_METHODS: readonly ZakatMethod[] = ['net_assets', 'net_invested_funds'];
export const ZAKAT_YEARS: readonly ZakatYear[] = ['lunar', 'solar'];

/**
 * The rate, exactly.
 *
 * 2.577% does not divide into whole basis points, so it is held as a fraction
 * rather than rounded into one. A rate rounded on the way in is a rate that is
 * wrong on every figure it touches afterwards.
 */
const RATE: Record<ZakatYear, { num: bigint; den: bigint; stated: string; why: string }> = {
  lunar: {
    num: 25n,
    den: 1000n,
    stated: '2.5%',
    why: 'The year is lunar, so the ordinary rate applies.',
  },
  solar: {
    num: 2577n,
    den: 100_000n,
    stated: '2.577%',
    why:
      'The accounting year is solar and therefore longer than a lunar one, so the rate is ' +
      'adjusted in proportion.',
  },
};

export interface ZakatInput {
  /** Supplied, never inferred. The two bases can disagree on one balance sheet. */
  method: ZakatMethod;
  year: ZakatYear;
  /** Whose obligation it is. A disclosure the annual report asks for. */
  borneBy: BorneBy;
  /** When the year turns. */
  hawlEndsOn: string;
  currency: string;
  source: string;

  /** net_assets: what is zakatable, less what is owed within the year. */
  cash?: string;
  receivables?: string;
  tradeGoods?: string;
  zakatableInvestments?: string;
  shortTermLiabilities?: string;

  /** net_invested_funds: the funds put in, less what is not zakatable. */
  paidUpCapital?: string;
  reserves?: string;
  retainedEarnings?: string;
  netProfit?: string;
  fixedAssets?: string;
  longTermInvestments?: string;
  accumulatedLosses?: string;
}

export interface ZakatStep {
  label: string;
  working: string;
  value: string;
}

export interface Zakat {
  method: ZakatMethod;
  methodStated: string;
  year: ZakatYear;
  rateStated: string;
  rateWhy: string;
  borneBy: BorneBy;
  borneByStated: string;
  hawlEndsOn: string;
  currency: string;
  source: string;

  /** What the rate is applied to. */
  base: string;
  /** What follows from the base and the rate. */
  due: string;
  /** True where liabilities exceeded what is zakatable. */
  baseIsNegative: boolean;

  steps: ZakatStep[];
  note: string;
}

const METHOD_STATED: Record<ZakatMethod, string> = {
  net_assets:
    'Zakatable assets — cash, receivables expected to be recovered, trade goods and zakatable ' +
    'investments — less liabilities falling due within the year.',
  net_invested_funds:
    'Paid-up capital, reserves, retained earnings and profit for the year, less fixed assets, ' +
    'long-term investments and accumulated losses.',
};

const BORNE_STATED: Record<BorneBy, string> = {
  institution: 'The institution pays it.',
  shareholders:
    'The shareholders pay it. The institution computes and discloses the figure and discharges ' +
    'nothing by doing so.',
  both:
    'Divided between the institution and its shareholders on the basis the board approved. What ' +
    'each bears is not computed here.',
};

export const NOT_A_RULING =
  'This applies the base and the rate the board approved to the figures supplied. Whether the ' +
  'base is the right one, which assets belong in it, and whether anything has been paid, are ' +
  'not answered here.';

function need(value: string | undefined, field: string, method: ZakatMethod): bigint {
  if (value === undefined || value.trim() === '') {
    throw new Refused(
      'no_reason_given' as never,
      `The ${method.replace(/_/g, ' ')} base needs "${field}", and it was not supplied. A missing ` +
        'figure is not a zero: a zakat computed around a gap understates an obligation nobody checked.',
    );
  }
  return parseAmount(value, field);
}

/** Optional in the base, and genuinely zero when absent rather than missing. */
function optional(value: string | undefined, field: string): bigint {
  return value === undefined || value.trim() === '' ? 0n : parseAmount(value, field);
}

export function computeZakat(input: ZakatInput): Zakat {
  if (!ZAKAT_METHODS.includes(input.method)) {
    throw new Refused(
      'not_found' as never,
      `"${input.method}" is not a base this knows. The choice between them is the board's.`,
    );
  }
  if (!ZAKAT_YEARS.includes(input.year)) {
    throw new Refused(
      'not_found' as never,
      `"${input.year}" is not a year this knows. Lunar and solar carry different rates, and ` +
        'nothing here guesses which the institution keeps.',
    );
  }

  const cur = input.currency;
  const steps: ZakatStep[] = [];
  let base: bigint;

  if (input.method === 'net_assets') {
    const cash = need(input.cash, 'cash', input.method);
    const receivables = need(input.receivables, 'receivables', input.method);
    const goods = optional(input.tradeGoods, 'tradeGoods');
    const investments = optional(input.zakatableInvestments, 'zakatableInvestments');
    const liabilities = need(input.shortTermLiabilities, 'shortTermLiabilities', input.method);

    const zakatable = cash + receivables + goods + investments;
    base = zakatable - liabilities;

    steps.push({
      label: 'Cash',
      working: `As supplied by ${input.source}`,
      value: `${formatAmount(cash)} ${cur}`,
    });
    steps.push({
      label: 'Receivables expected to be recovered',
      working: 'Debts unlikely to be recovered are outside the base',
      value: `${formatAmount(receivables)} ${cur}`,
    });
    if (goods !== 0n) {
      steps.push({ label: 'Trade goods', working: 'Held for sale', value: `${formatAmount(goods)} ${cur}` });
    }
    if (investments !== 0n) {
      steps.push({
        label: 'Zakatable investments',
        working: 'The portion the board treats as zakatable',
        value: `${formatAmount(investments)} ${cur}`,
      });
    }
    steps.push({
      label: 'Zakatable assets',
      working: 'Added',
      value: `${formatAmount(zakatable)} ${cur}`,
    });
    steps.push({
      label: 'Less liabilities due within the year',
      working: `${formatAmount(zakatable)} − ${formatAmount(liabilities)}`,
      value: `${formatAmount(base)} ${cur}`,
    });
  } else {
    const capital = need(input.paidUpCapital, 'paidUpCapital', input.method);
    const reserves = optional(input.reserves, 'reserves');
    const retained = optional(input.retainedEarnings, 'retainedEarnings');
    const profit = optional(input.netProfit, 'netProfit');
    const fixed = need(input.fixedAssets, 'fixedAssets', input.method);
    const longTerm = optional(input.longTermInvestments, 'longTermInvestments');
    const losses = optional(input.accumulatedLosses, 'accumulatedLosses');

    const funds = capital + reserves + retained + profit;
    const deducted = fixed + longTerm + losses;
    base = funds - deducted;

    steps.push({
      label: 'Funds invested',
      working: `Paid-up capital, reserves, retained earnings and profit, as supplied by ${input.source}`,
      value: `${formatAmount(funds)} ${cur}`,
    });
    steps.push({
      label: 'Less what is not zakatable',
      working: 'Fixed assets, long-term investments and accumulated losses',
      value: `−${formatAmount(deducted)} ${cur}`,
    });
    steps.push({
      label: 'Net invested funds',
      working: `${formatAmount(funds)} − ${formatAmount(deducted)}`,
      value: `${formatAmount(base)} ${cur}`,
    });
  }

  const rate = RATE[input.year];
  const negative = base < 0n;

  // A negative base is nothing due, not a negative obligation. Applying a rate
  // to it would produce a figure that reads as a credit.
  const due = negative ? 0n : (base * rate.num) / rate.den;

  steps.push({
    label: negative ? 'Nothing is due' : `At ${rate.stated}`,
    working: negative
      ? 'Liabilities exceeded what is zakatable, so there is no base to apply a rate to.'
      : `${rate.stated} of ${formatAmount(base)}`,
    value: `${formatAmount(due)} ${cur}`,
  });

  return {
    method: input.method,
    methodStated: METHOD_STATED[input.method],
    year: input.year,
    rateStated: rate.stated,
    rateWhy: rate.why,
    borneBy: input.borneBy,
    borneByStated: BORNE_STATED[input.borneBy],
    hawlEndsOn: input.hawlEndsOn,
    currency: cur,
    source: input.source,

    base: formatAmount(base),
    due: formatAmount(due),
    baseIsNegative: negative,

    steps,
    note: NOT_A_RULING,
  };
}

/**
 * The terms a board approves once, so a fatwa can carry them.
 *
 * The hawl is among them and is a clock like every other clock here. It is not
 * yet on the calendar: zakat is computed statelessly, like the screening
 * ratios, so no date is stored for the calendar to count from. That is a real
 * gap and it is smaller than it looks — it needs somewhere to record a
 * computation, which is the same thing purification needs.
 */
export const ZAKAT_TERMS = [
  { key: 'zakatBase', meaning: 'Net assets, or net invested funds.' },
  { key: 'zakatYear', meaning: 'Lunar or solar, which decides the rate.' },
  { key: 'zakatBorneBy', meaning: 'The institution, the shareholders, or both.' },
  { key: 'hawlEndsOn', meaning: 'The date the zakat year turns.' },
] as const;
