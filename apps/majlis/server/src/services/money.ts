/**
 * Exact decimal arithmetic, because a ruling must not turn on binary rounding.
 *
 * Extracted from `screening.ts` when a second calculation needed it. Every
 * figure a board rules on passes through here: amounts arrive as strings, stay
 * strings, and are compared as integers. A threshold that flipped because of
 * rounding at the fifteenth decimal place would be a ruling decided by
 * IEEE 754, and money that has to reconcile with a bank's ledger cannot be
 * held in a float at all.
 */

/** Amounts are scaled to this many decimal places internally. */
export const SCALE = 8n;
export const SCALE_FACTOR = 10n ** SCALE;
export const BPS = 10_000n;

export class BadFigure extends Error {
  readonly code = 'bad_figure';
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
    this.name = 'BadFigure';
  }
}

/**
 * Exact decimal, from a string, without ever becoming a number.
 *
 * Rejects rather than guesses. A figure that arrives as "approx 4.2bn" is not a
 * figure, and coercing it to something would put an invented number in front of
 * a board.
 */
export function parseAmount(raw: string, field: string): bigint {
  const text = (raw ?? '').trim().replace(/[\s_,]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(text)) {
    throw new BadFigure(field, `"${raw}" is not a plain decimal figure.`);
  }
  const negative = text.startsWith('-');
  const [whole, fraction = ''] = (negative ? text.slice(1) : text).split('.');

  if (fraction.length > Number(SCALE)) {
    throw new BadFigure(field, `More than ${SCALE} decimal places in "${raw}".`);
  }
  const padded = (fraction + '0'.repeat(Number(SCALE))).slice(0, Number(SCALE));
  const value = BigInt(whole) * SCALE_FACTOR + BigInt(padded || '0');
  return negative ? -value : value;
}

/** Back to a string, trailing zeroes trimmed, for display and for the record. */
export function formatAmount(value: bigint): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / SCALE_FACTOR;
  const fraction = (abs % SCALE_FACTOR).toString().padStart(Number(SCALE), '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole}${fraction ? '.' + fraction : ''}`;
}

/**
 * A share of an amount, in basis points.
 *
 * Truncates rather than rounds. A distribution that rounded each share up would
 * pay out more than was earned, and the remainder has to belong to somebody
 * explicitly rather than appear from rounding.
 */
export function shareOf(amount: bigint, bps: number): bigint {
  return (amount * BigInt(Math.round(bps))) / BPS;
}

/** A ratio expressed in basis points, for a rate a reader can compare. */
export function ratioBps(part: bigint, whole: bigint): number | null {
  if (whole === 0n) return null;
  const scaled = (part * BPS * 100n) / whole;
  return Number((scaled + 50n) / 100n);
}

export const percent = (bps: number): string => (bps / 100).toFixed(2);
