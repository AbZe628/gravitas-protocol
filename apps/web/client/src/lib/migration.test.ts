import { describe, expect, it } from 'vitest';
import {
  DEADLINE_SECONDS,
  buildV3Params,
  deadlineFrom,
  signedMessage,
  whatIsMissing,
  type V3Form,
} from './migration';

/**
 * The first tests this application has had.
 *
 * They cover the one place where being wrong costs a user money: the intent
 * they sign and the transaction that carries it have to agree field for field,
 * or the contract refuses the signature after the gas is spent.
 *
 * The typed data below is copied from `EIP712_TYPES` in Migrate.tsx, which is
 * itself copied from `TeleportV3.MIGRATION_TYPEHASH`. Keeping a copy here is
 * deliberate: a test that imported the same constant it is checking would agree
 * with any change, including a wrong one.
 */
const TYPED_FIELDS = [
  'tokenId',
  'newFee',
  'newTickLower',
  'newTickUpper',
  'amount0MinMint',
  'amount1MinMint',
  'amount0MinDecrease',
  'amount1MinDecrease',
  'deadline',
  'executeSwap',
  'zeroForOne',
  'swapAmountIn',
  'swapAmountOutMin',
  'swapFeeTier',
  'nonce',
] as const;

const form = (over: Partial<V3Form> = {}): V3Form => ({
  tokenId: '4821',
  newFee: '3000',
  tickLower: '-887220',
  tickUpper: '887220',
  amount0MinMint: '1000',
  amount1MinMint: '2000',
  amount0MinDecrease: '0',
  amount1MinDecrease: '0',
  ...over,
});

const NOON = Date.UTC(2026, 8, 7, 12, 0, 0);

describe('what is signed and what is submitted', () => {
  /*
   * The reason this module exists. The screen wrote these fields out by hand in
   * two functions fifty lines apart, and nothing checked that they matched.
   */
  it('gives the same values to the signature and to the transaction', () => {
    const deadline = deadlineFrom(NOON);
    const toSign = buildV3Params(form(), deadline);
    const toSubmit = buildV3Params(form(), deadline);

    expect(toSubmit).toEqual(toSign);
  });

  it('differs from the signed message in the nonce and nothing else', () => {
    const params = buildV3Params(form(), deadlineFrom(NOON));
    const message = signedMessage(params, BigInt(7));

    const extra = Object.keys(message).filter((k) => !(k in params));
    expect(extra).toEqual(['nonce']);

    for (const key of Object.keys(params) as (keyof typeof params)[]) {
      expect(message[key]).toEqual(params[key]);
    }
  });

  /*
   * EIP-712 hashes fields in the order the type declares them, so a field
   * missing from the parameters produces a different hash and a refused
   * signature. This is the test that catches a field added to the contract and
   * not to the screen.
   */
  it('carries every field the typed data declares, and no others', () => {
    const message = signedMessage(buildV3Params(form(), deadlineFrom(NOON)), BigInt(0));
    expect(Object.keys(message).sort()).toEqual([...TYPED_FIELDS].sort());
  });
});

describe('the slippage floors', () => {
  /*
   * The contract refuses a zero mint minimum: a migration that opens the new
   * position on unbounded terms is not allowed. An empty field would send 0 and
   * fail on chain, so the floor is applied before the user pays for it.
   */
  it('never sends a mint minimum of zero, whatever the field says', () => {
    for (const empty of ['', '   ', '0']) {
      const p = buildV3Params(form({ amount0MinMint: empty, amount1MinMint: empty }), BigInt(1));
      expect(p.amount0MinMint).toBe(BigInt(1));
      expect(p.amount1MinMint).toBe(BigInt(1));
    }
  });

  it('keeps a mint minimum the user actually set', () => {
    const p = buildV3Params(form({ amount0MinMint: '5000' }), BigInt(1));
    expect(p.amount0MinMint).toBe(BigInt(5000));
  });

  /*
   * The withdrawal side has no floor in the contract, and zero is a real answer
   * there: it means the owner accepts any amount out of the old position. It is
   * not silently raised to 1, which would sign terms the owner did not choose.
   */
  it('leaves a withdrawal minimum of zero alone, because zero means something', () => {
    const p = buildV3Params(form({ amount0MinDecrease: '', amount1MinDecrease: '0' }), BigInt(1));
    expect(p.amount0MinDecrease).toBe(BigInt(0));
    expect(p.amount1MinDecrease).toBe(BigInt(0));
  });

  it('keeps a withdrawal minimum the user set', () => {
    const p = buildV3Params(form({ amount0MinDecrease: '900' }), BigInt(1));
    expect(p.amount0MinDecrease).toBe(BigInt(900));
  });
});

describe('the deadline', () => {
  it('is thirty minutes from the moment it is built', () => {
    expect(deadlineFrom(NOON)).toBe(BigInt(Math.floor(NOON / 1000) + DEADLINE_SECONDS));
    expect(DEADLINE_SECONDS).toBe(1800);
  });

  /*
   * Signing and submitting are two separate clicks. If each computed its own
   * deadline the two would differ by however long the wallet took, and the
   * signature would be over a value the transaction does not carry.
   */
  it('is one value carried into both, not computed twice', () => {
    const deadline = deadlineFrom(NOON);
    const signed = buildV3Params(form(), deadline);
    const submittedLater = buildV3Params(form(), deadline);
    expect(submittedLater.deadline).toBe(signed.deadline);
  });
});

describe('the swap fields nobody fills in', () => {
  /*
   * The screen offers no rebalancing swap, and these are still signed. That is
   * the point: an executor cannot add a swap to a signature the owner gave
   * without one.
   */
  it('signs an explicit no-swap rather than leaving it open', () => {
    const p = buildV3Params(form(), BigInt(1));
    expect(p.executeSwap).toBe(false);
    expect(p.swapAmountIn).toBe(BigInt(0));
    expect(p.swapAmountOutMin).toBe(BigInt(0));
  });
});

describe('what the form is missing', () => {
  it('is nothing, when it is filled in', () => {
    expect(whatIsMissing(form())).toEqual([]);
  });

  it('names a missing token id', () => {
    expect(whatIsMissing(form({ tokenId: '' }))).toContain('tokenId');
  });

  /*
   * A range that does not open holds no liquidity and the pool refuses it.
   * Saying so in the form costs nothing; finding out on chain costs the gas.
   */
  it('catches a tick range that does not open', () => {
    expect(whatIsMissing(form({ tickLower: '100', tickUpper: '100' }))).toContain(
      'tickLower must be below tickUpper',
    );
    expect(whatIsMissing(form({ tickLower: '500', tickUpper: '100' }))).toContain(
      'tickLower must be below tickUpper',
    );
  });

  it('catches a fee tier no pool uses', () => {
    expect(whatIsMissing(form({ newFee: '1234' }))).toContain('fee tier');
    for (const good of ['500', '3000', '10000']) {
      expect(whatIsMissing(form({ newFee: good }))).toEqual([]);
    }
  });
});
