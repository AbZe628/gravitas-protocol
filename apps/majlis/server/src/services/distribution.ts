/**
 * What the investment account holders receive.
 *
 * The annual report's opinion has to state whether profit allocation and loss
 * charging followed the basis the board approved, and until now nothing here
 * could support that sentence.
 *
 * ── what this is not ──────────────────────────────────────────────────────
 *
 * There is no model in here. The reserves are not a dynamic formula; they are
 * **two rates and two caps that a board approves**, applied in a fixed order.
 * Encoding anything more elaborate would be inventing sophistication that the
 * practice does not have.
 *
 *   **PER** — the profit equalisation reserve — is taken from **gross profit,
 *   before the split**, so the bank and the depositors both bear it. It exists
 *   to smooth what depositors are paid: a good month tops it up, a poor month
 *   draws it down, and the depositor sees a steady rate.
 *
 *   **IRR** — the investment risk reserve — is taken **after the split, from
 *   the depositors' share alone**. It is a shield against loss of principal, so
 *   a failed investment does not show as a negative on a depositor's account.
 *
 * ── and what the board is actually looking at ─────────────────────────────
 *
 * Smoothing is the point of the reserves and it is also the danger in them.
 * A steady payout that tracks a conventional rate is what they are for, and it
 * is also how a poor quarter is hidden — which is why several central banks now
 * restrict or forbid them.
 *
 * So this does not merely compute the payout. It reports **what the depositors
 * would have received without smoothing, what they actually received, and the
 * difference** — because that difference is displaced commercial risk, and a
 * board signing the annual report is entitled to see it as a number rather than
 * infer it.
 *
 * The arithmetic is shown. Whether the smoothing was proper is a ruling.
 */

import { BPS, formatAmount, parseAmount, percent, ratioBps, shareOf } from './money.js';

/**
 * Everything the board set, and everything the period produced.
 *
 * The five parameters at the top are operative terms of a rule: they are
 * approved once, recorded in a fatwa, and applied unchanged until the board
 * changes them. Nothing here chooses one.
 */
export interface DistributionInput {
  periodFrom: string;
  periodTo: string;
  currency: string;
  /** Who supplied the figures. A figure with no source is one somebody typed. */
  source: string;

  /** Gross profit of the investment pool, before anything is taken. */
  grossProfit: string;

  /** The approved profit-sharing ratio: the mudarib's share, in basis points. */
  mudaribShareBps: number;

  /** Taken from gross profit, before the split. Both parties bear it. */
  perDeductionBps: number;
  /** What the reserve already holds. */
  perBalance: string;
  /** The ceiling the board set. Nothing is taken beyond it. */
  perCap: string;

  /** Taken after the split, from the depositors' share only. */
  irrDeductionBps: number;
  irrBalance: string;
  irrCap: string;

  /** Depositor funds under management, so a payout can be expressed as a rate. */
  depositorFunds?: string;
}

export interface DistributionStep {
  label: string;
  /** The sum, written out. */
  working: string;
  value: string;
}

export interface Smoothing {
  /** What the depositors' share would have been with no PER and no IRR. */
  withoutSmoothing: string;
  /** What they are actually paid. */
  paid: string;
  /** Positive where smoothing raised the payout, negative where it lowered it. */
  difference: string;
  direction: 'raised' | 'lowered' | 'none';
  /** The two rates, where funds are known, so the gap is comparable. */
  rateWithoutSmoothingBps: number | null;
  ratePaidBps: number | null;
  note: string;
}

export interface Reserve {
  name: 'PER' | 'IRR';
  openingBalance: string;
  movement: string;
  closingBalance: string;
  cap: string;
  /** True where the cap stopped the full deduction being taken. */
  cappedAt: boolean;
  headroom: string;
}

export interface Distribution {
  periodFrom: string;
  periodTo: string;
  currency: string;
  source: string;
  method: string;

  grossProfit: string;
  distributableProfit: string;
  mudaribShare: string;
  depositorsShare: string;
  paidToDepositors: string;

  reserves: Reserve[];
  steps: DistributionStep[];
  smoothing: Smoothing;
  note: string;
}

export const METHOD =
  'PER deducted from gross profit before the split; IRR deducted after the split ' +
  'from the depositors’ share alone. Both at the rates and caps the board approved.';

export const NOT_A_RULING =
  'These are arithmetic facts about the figures supplied and the rates the board ' +
  'approved. Whether the allocation followed the approved basis, and whether the ' +
  'smoothing was proper, are matters for the board.';

/**
 * Take a deduction, held between the floor and the cap.
 *
 * The cap is a ceiling on the **balance**, not on the deduction, which is how a
 * board actually writes it: *the reserve shall not exceed X*. Where the full
 * rate would breach it, only the headroom is taken and the result says so.
 *
 * **And the floor matters as much as the cap.** A period that lost money draws
 * the reserve down rather than topping it up, which is what the reserve is for
 * — but a reserve cannot release what it does not hold. Without the floor a
 * loss against an empty reserve produces a negative balance, which is not a
 * reserve at all: it is the bank owing the depositors a cushion it never built.
 */
function deduct(base: bigint, bps: number, balance: bigint, cap: bigint) {
  const wanted = shareOf(base, bps);
  const headroom = cap - balance;

  let taken = wanted;
  if (wanted > 0n) {
    // Topping up: never past the cap.
    taken = headroom <= 0n ? 0n : wanted > headroom ? headroom : wanted;
  } else if (wanted < 0n) {
    // Drawing down: never past what the reserve actually holds.
    taken = balance <= 0n ? 0n : -wanted > balance ? -balance : wanted;
  }

  return {
    taken,
    capped: taken !== wanted,
    headroom: headroom < 0n ? 0n : headroom,
    /** True where the reserve had less than the period asked of it. */
    exhausted: wanted < 0n && taken > wanted,
  };
}

export function distribute(input: DistributionInput): Distribution {
  const gross = parseAmount(input.grossProfit, 'grossProfit');
  const perBalance = parseAmount(input.perBalance, 'perBalance');
  const perCap = parseAmount(input.perCap, 'perCap');
  const irrBalance = parseAmount(input.irrBalance, 'irrBalance');
  const irrCap = parseAmount(input.irrCap, 'irrCap');
  const funds = input.depositorFunds ? parseAmount(input.depositorFunds, 'depositorFunds') : null;

  const cur = input.currency;
  const steps: DistributionStep[] = [];

  // ── 1 · PER, before the split ───────────────────────────────────────────
  const per = deduct(gross, input.perDeductionBps, perBalance, perCap);
  const distributable = gross - per.taken;

  steps.push({
    label: 'Gross profit',
    working: `As supplied by ${input.source}`,
    value: `${formatAmount(gross)} ${cur}`,
  });
  steps.push({
    label: 'Less profit equalisation reserve',
    working: per.capped
      ? `${percent(input.perDeductionBps)}% of ${formatAmount(gross)} would be ` +
        `${formatAmount(shareOf(gross, input.perDeductionBps))}, but the reserve is ` +
        `${formatAmount(per.headroom)} below its cap of ${formatAmount(perCap)}, so only that is taken`
      : `${percent(input.perDeductionBps)}% of ${formatAmount(gross)}`,
    value: `−${formatAmount(per.taken)} ${cur}`,
  });
  steps.push({
    label: 'Distributable profit',
    working: `${formatAmount(gross)} − ${formatAmount(per.taken)}`,
    value: `${formatAmount(distributable)} ${cur}`,
  });

  // ── 2 · the split ───────────────────────────────────────────────────────
  const mudarib = shareOf(distributable, input.mudaribShareBps);
  const depositors = distributable - mudarib;

  steps.push({
    label: 'Mudarib’s share',
    working: `${percent(input.mudaribShareBps)}% of ${formatAmount(distributable)}`,
    value: `${formatAmount(mudarib)} ${cur}`,
  });
  steps.push({
    label: 'Depositors’ share',
    working: `${formatAmount(distributable)} − ${formatAmount(mudarib)}`,
    value: `${formatAmount(depositors)} ${cur}`,
  });

  // ── 3 · IRR, from the depositors' share alone ───────────────────────────
  const irr = deduct(depositors, input.irrDeductionBps, irrBalance, irrCap);
  const paid = depositors - irr.taken;

  steps.push({
    label: 'Less investment risk reserve',
    working: irr.capped
      ? `${percent(input.irrDeductionBps)}% of the depositors’ share would be ` +
        `${formatAmount(shareOf(depositors, input.irrDeductionBps))}, but the reserve is ` +
        `${formatAmount(irr.headroom)} below its cap, so only that is taken`
      : `${percent(input.irrDeductionBps)}% of ${formatAmount(depositors)}, from the depositors’ share alone`,
    value: `−${formatAmount(irr.taken)} ${cur}`,
  });
  steps.push({
    label: 'Paid to depositors',
    working: `${formatAmount(depositors)} − ${formatAmount(irr.taken)}`,
    value: `${formatAmount(paid)} ${cur}`,
  });

  // ── 4 · what smoothing did ──────────────────────────────────────────────
  //
  // The comparison the annual report's opinion rests on: the same period with
  // neither reserve touched, beside what was actually paid.
  const withoutSmoothing = gross - shareOf(gross, input.mudaribShareBps);
  const difference = paid - withoutSmoothing;

  const rateWithout = funds ? ratioBps(withoutSmoothing, funds) : null;
  const ratePaid = funds ? ratioBps(paid, funds) : null;

  const direction: Smoothing['direction'] =
    difference > 0n ? 'raised' : difference < 0n ? 'lowered' : 'none';

  const smoothing: Smoothing = {
    withoutSmoothing: formatAmount(withoutSmoothing),
    paid: formatAmount(paid),
    difference: formatAmount(difference),
    direction,
    rateWithoutSmoothingBps: rateWithout,
    ratePaidBps: ratePaid,
    note:
      direction === 'none'
        ? 'Neither reserve moved this period, so what was paid is what the period earned.'
        : direction === 'raised'
          ? `The reserves raised the payout by ${formatAmount(difference)} ${cur}. The period earned ` +
            `less than the depositors received, and the difference came out of reserves built in ` +
            `earlier periods.`
          : `The reserves lowered the payout by ${formatAmount(-difference)} ${cur}. The period earned ` +
            `more than the depositors received, and the difference was retained against later ones.`,
  };

  const reserves: Reserve[] = [
    {
      name: 'PER',
      openingBalance: formatAmount(perBalance),
      movement: formatAmount(per.taken),
      closingBalance: formatAmount(perBalance + per.taken),
      cap: formatAmount(perCap),
      cappedAt: per.capped,
      headroom: formatAmount(perCap - (perBalance + per.taken)),
    },
    {
      name: 'IRR',
      openingBalance: formatAmount(irrBalance),
      movement: formatAmount(irr.taken),
      closingBalance: formatAmount(irrBalance + irr.taken),
      cap: formatAmount(irrCap),
      cappedAt: irr.capped,
      headroom: formatAmount(irrCap - (irrBalance + irr.taken)),
    },
  ];

  return {
    periodFrom: input.periodFrom,
    periodTo: input.periodTo,
    currency: cur,
    source: input.source,
    method: METHOD,

    grossProfit: formatAmount(gross),
    distributableProfit: formatAmount(distributable),
    mudaribShare: formatAmount(mudarib),
    depositorsShare: formatAmount(depositors),
    paidToDepositors: formatAmount(paid),

    reserves,
    steps,
    smoothing,
    note: NOT_A_RULING,
  };
}

/** The five terms a board approves. Named here so a fatwa can carry them. */
export const DISTRIBUTION_TERMS = [
  { key: 'mudaribShareBps', meaning: 'The mudarib’s share of distributable profit, in basis points.' },
  { key: 'perDeductionBps', meaning: 'Taken from gross profit before the split, in basis points.' },
  { key: 'perMaximumCap', meaning: 'The ceiling on the profit equalisation reserve.' },
  { key: 'irrDeductionBps', meaning: 'Taken from the depositors’ share after the split, in basis points.' },
  { key: 'irrMaximumCap', meaning: 'The ceiling on the investment risk reserve.' },
] as const;

export { BPS };
