/**
 * The migration intent, built once and used twice.
 *
 * A V3 migration is two steps. The owner signs an intent, and then somebody
 * submits it. The contract recovers the signature over the parameters it was
 * given, so **every field has to be identical between the two**, and the
 * screen said so in a comment:
 *
 *   > These values MUST be identical to the params submitted in
 *   > handleV3Execute, otherwise on-chain signature verification will reject
 *   > the migration.
 *
 * They were written out by hand in both places, fifty lines apart. Nothing
 * checked that they agreed. A field edited in one and not the other produces a
 * signature the contract refuses — after the user has paid the gas to find out.
 *
 * So the fields are built here, once. The signing path adds the nonce, which
 * the contract reads for itself rather than taking from the submitted
 * parameters, and is the only difference between the two.
 */

/** The fee tiers TeleportV3 accepts. Anything else is refused by the pool. */
export type FeeTier = 500 | 3000 | 10000;

/** What the form holds. Every field is a string, because inputs give strings. */
export interface V3Form {
  tokenId: string;
  newFee: string;
  tickLower: string;
  tickUpper: string;
  amount0MinMint: string;
  amount1MinMint: string;
  amount0MinDecrease: string;
  amount1MinDecrease: string;
}

/**
 * What both the signature and the transaction carry.
 *
 * The order matches `EIP712_TYPES.MigrationIntent` and
 * `TeleportV3.MIGRATION_TYPEHASH`. It is not decorative: EIP-712 hashes the
 * fields in the order the type declares them.
 */
export interface V3Params {
  tokenId: bigint;
  newFee: FeeTier;
  newTickLower: number;
  newTickUpper: number;
  amount0MinMint: bigint;
  amount1MinMint: bigint;
  amount0MinDecrease: bigint;
  amount1MinDecrease: bigint;
  deadline: bigint;
  executeSwap: boolean;
  zeroForOne: boolean;
  swapAmountIn: bigint;
  swapAmountOutMin: bigint;
  swapFeeTier: FeeTier;
}

/** How long a signed intent stays good for, in seconds. */
export const DEADLINE_SECONDS = 1800;

/**
 * The deadline, from a clock passed in.
 *
 * Taken as an argument rather than read from `Date.now()` inside, so a test can
 * state the time instead of racing it.
 */
export function deadlineFrom(nowMs: number): bigint {
  return BigInt(Math.floor(nowMs / 1000) + DEADLINE_SECONDS);
}

/**
 * An empty mint minimum becomes 1, not 0.
 *
 * `TeleportV3.executeAtomicMigration` requires both mint minimums to exceed
 * zero — a migration that opens the new position on unbounded terms is refused
 * by the contract. Sending 0 would fail on chain rather than in the form, so
 * the floor is applied here and the field starts at 1.
 *
 * The withdrawal minimums have no such floor in the contract, and 0 is a real
 * value there: it means the owner accepts any amount out of the old position.
 * They are left alone. See docs/KNOWN-ISSUES.md on the one-sided floor.
 */
function mintMinimum(value: string): bigint {
  const trimmed = value.trim();
  if (trimmed === '') return BigInt(1);
  const n = BigInt(trimmed);
  return n > BigInt(0) ? n : BigInt(1);
}

function amount(value: string): bigint {
  const trimmed = value.trim();
  return trimmed === '' ? BigInt(0) : BigInt(trimmed);
}

/**
 * Build the parameters. Pure: the same form and deadline always give the same
 * object, which is what lets one call be compared against another.
 *
 * The swap fields are fixed at "no swap" because the screen does not offer a
 * rebalancing swap. They are still signed, so an executor cannot add one to a
 * signature the owner gave without it — which is the whole reason the typed
 * data covers them.
 */
export function buildV3Params(form: V3Form, deadline: bigint): V3Params {
  return {
    tokenId: BigInt(form.tokenId),
    newFee: Number.parseInt(form.newFee, 10) as FeeTier,
    newTickLower: Number.parseInt(form.tickLower, 10),
    newTickUpper: Number.parseInt(form.tickUpper, 10),
    amount0MinMint: mintMinimum(form.amount0MinMint),
    amount1MinMint: mintMinimum(form.amount1MinMint),
    amount0MinDecrease: amount(form.amount0MinDecrease),
    amount1MinDecrease: amount(form.amount1MinDecrease),
    deadline,
    executeSwap: false,
    zeroForOne: false,
    swapAmountIn: BigInt(0),
    swapAmountOutMin: BigInt(0),
    swapFeeTier: 3000,
  };
}

/**
 * What gets signed: the parameters, plus the nonce.
 *
 * The nonce is in the typed data and not in the submitted parameters, because
 * the contract reads the owner's current nonce itself. That is the one
 * asymmetry between signing and executing, and having it in one place is what
 * stops it being mistaken for a field somebody forgot to copy.
 */
export function signedMessage(params: V3Params, nonce: bigint): V3Params & { nonce: bigint } {
  return { ...params, nonce };
}

/**
 * What the form is missing before it can be signed.
 *
 * Returned as a list rather than a boolean so a screen can say which field,
 * and empty means ready.
 */
export function whatIsMissing(form: V3Form): string[] {
  const missing: string[] = [];

  if (!form.tokenId.trim()) missing.push('tokenId');
  if (!/^\d+$/.test(form.tokenId.trim())) {
    if (form.tokenId.trim()) missing.push('tokenId must be a whole number');
  }

  const lower = Number.parseInt(form.tickLower, 10);
  const upper = Number.parseInt(form.tickUpper, 10);
  if (Number.isNaN(lower) || Number.isNaN(upper)) {
    missing.push('tick range');
  } else if (lower >= upper) {
    // A range that does not open cannot hold liquidity, and the pool refuses
    // it. Saying so here costs nothing; finding out on chain costs the gas.
    missing.push('tickLower must be below tickUpper');
  }

  if (![500, 3000, 10000].includes(Number.parseInt(form.newFee, 10))) {
    missing.push('fee tier');
  }

  return missing;
}
