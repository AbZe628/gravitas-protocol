import { describe, it, expect } from 'vitest';
import type { Address, PublicClient } from 'viem';
import { ComplianceService } from '../src/compliance.js';
import { MigrationBuilder } from '../src/teleport.js';
import { buildMigrationTypedData, MIGRATION_INTENT_TYPES } from '../src/eip712.js';

const REGISTRY = '0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23' as Address;
const TELEPORT = '0x6702C2CE6eD58ca3934eBBd785CaC1De8DCd85B4' as Address;

/** Nothing here reaches the chain; build() is pure. */
const client = {} as unknown as PublicClient;
const builder = () => new MigrationBuilder(new ComplianceService(client, REGISTRY), client, TELEPORT);

const complete = () =>
  builder()
    .tokenId(123n)
    .newFee(3000)
    .ticks(-887220, 887220)
    .slippage(1n, 1n, 0n, 0n)
    .deadline(1_800_000_000n);

describe('MigrationBuilder.build', () => {
  it('returns what was set', () => {
    const params = complete().build();
    expect(params.tokenId).toBe(123n);
    expect(params.newFee).toBe(3000);
    expect(params.newTickLower).toBe(-887220);
    expect(params.newTickUpper).toBe(887220);
    expect(params.deadline).toBe(1_800_000_000n);
  });

  it('defaults the optional swap to off', () => {
    const params = complete().build();
    expect(params.executeSwap).toBe(false);
    expect(params.swapAmountIn).toBe(0n);
    expect(params.swapFeeTier).toBe(0);
  });

  it('carries a swap through once one is configured', () => {
    const params = complete().withSwap(true, 500n, 490n, 500).build();
    expect(params.executeSwap).toBe(true);
    expect(params.zeroForOne).toBe(true);
    expect(params.swapAmountIn).toBe(500n);
    expect(params.swapAmountOutMin).toBe(490n);
    expect(params.swapFeeTier).toBe(500);
  });

  /*
   * Finding out at signing time that a field was never set means the owner has
   * already been shown a wallet prompt for parameters that cannot be submitted.
   */
  it('refuses to build before every required field is set', () => {
    expect(() => builder().tokenId(1n).build()).toThrow();
    expect(() => complete().build()).not.toThrow();
  });

  /*
   * The signature covers the parameters exactly. If build() returned anything
   * the typed data did not carry — or in a different shape — every signature
   * would be rejected on chain with nothing to say why.
   */
  it('produces exactly the fields the EIP-712 message declares', () => {
    const params = complete().build();
    const typedData = buildMigrationTypedData(params, 7n, TELEPORT, 421614);

    const declared = MIGRATION_INTENT_TYPES.MigrationIntent.map((f) => f.name);
    expect(Object.keys(typedData.message).sort()).toEqual([...declared].sort());

    expect(typedData.message.nonce).toBe(7n);
    expect(typedData.domain.verifyingContract).toBe(TELEPORT);
    expect(typedData.domain.chainId).toBe(421614);
    expect(typedData.primaryType).toBe('MigrationIntent');
  });
});
