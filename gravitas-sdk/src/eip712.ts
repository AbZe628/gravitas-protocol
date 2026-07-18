import { Address, TypedDataDomain } from 'viem';
import { MigrationParams } from './types.js';

/**
 * @title Gravitas EIP-712 Migration Intent
 * @author Gravitas Protocol Labs
 * @notice Canonical EIP-712 typed-data definition for signing a TeleportV3 migration intent.
 * @dev This MUST stay in lockstep with TeleportV3.MIGRATION_TYPEHASH. The signed intent binds
 *      EVERY execution parameter — all slippage bounds (amount*Min*) and the full rebalancing
 *      swap configuration (executeSwap, zeroForOne, swapAmountIn, swapAmountOutMin, swapFeeTier)
 *      — plus the per-owner replay nonce. This prevents an authorized executor from taking a
 *      user's valid signature and re-executing it with weakened economics (e.g. swapAmountOutMin
 *      = 0), which would expose the position owner to unbounded slippage / MEV.
 *
 *      DO NOT hand-roll a reduced field set. Use buildMigrationTypedData() so the digest always
 *      matches the on-chain verifier.
 */

/** EIP-712 domain name — matches EIP712("GravitasTeleportV3", "1") in the contract. */
export const MIGRATION_DOMAIN_NAME = 'GravitasTeleportV3';
export const MIGRATION_DOMAIN_VERSION = '1';

/**
 * EIP-712 type definition for the MigrationIntent. Field names, types, and ORDER must match
 * TeleportV3.MIGRATION_TYPEHASH exactly.
 */
export const MIGRATION_INTENT_TYPES = {
  MigrationIntent: [
    { name: 'tokenId', type: 'uint256' },
    { name: 'newFee', type: 'uint24' },
    { name: 'newTickLower', type: 'int24' },
    { name: 'newTickUpper', type: 'int24' },
    { name: 'amount0MinMint', type: 'uint256' },
    { name: 'amount1MinMint', type: 'uint256' },
    { name: 'amount0MinDecrease', type: 'uint256' },
    { name: 'amount1MinDecrease', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
    { name: 'executeSwap', type: 'bool' },
    { name: 'zeroForOne', type: 'bool' },
    { name: 'swapAmountIn', type: 'uint256' },
    { name: 'swapAmountOutMin', type: 'uint256' },
    { name: 'swapFeeTier', type: 'uint24' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const;

/**
 * @notice Builds the EIP-712 domain for a TeleportV3 deployment.
 * @param teleportV3Address The address of the TeleportV3 contract (verifyingContract).
 * @param chainId The chain ID the contract is deployed on (e.g. 421614 for Arbitrum Sepolia).
 */
export function buildMigrationDomain(teleportV3Address: Address, chainId: number): TypedDataDomain {
  return {
    name: MIGRATION_DOMAIN_NAME,
    version: MIGRATION_DOMAIN_VERSION,
    chainId,
    verifyingContract: teleportV3Address,
  };
}

/**
 * The fully-formed EIP-712 payload, ready to pass to viem's `walletClient.signTypedData(...)`
 * or ethers' `signer.signTypedData(domain, types, message)`.
 */
export interface MigrationTypedData {
  domain: TypedDataDomain;
  types: typeof MIGRATION_INTENT_TYPES;
  primaryType: 'MigrationIntent';
  message: MigrationParams & { nonce: bigint };
}

/**
 * @notice Assembles the complete EIP-712 typed-data object a position owner must sign.
 * @dev The returned `message` includes the on-chain replay `nonce`, which the caller must read
 *      from `TeleportV3.nonces(owner)` immediately before signing. The SAME params object must
 *      later be submitted to `executeAtomicMigration`; changing any field after signing (other
 *      than via a fresh signature) will cause on-chain verification to revert with
 *      "TV3: Invalid signature".
 *
 * @example
 * ```ts
 * const nonce = await publicClient.readContract({
 *   address: teleportV3Address, abi, functionName: 'nonces', args: [owner],
 * });
 * const typedData = buildMigrationTypedData(params, nonce, teleportV3Address, 421614);
 * const signature = await walletClient.signTypedData({ account: owner, ...typedData });
 * ```
 *
 * @param params The full migration parameters (must equal what is submitted on-chain).
 * @param nonce The current per-owner nonce from TeleportV3.nonces(owner).
 * @param teleportV3Address The TeleportV3 contract address (verifyingContract).
 * @param chainId The chain ID (e.g. 421614 for Arbitrum Sepolia).
 */
export function buildMigrationTypedData(
  params: MigrationParams,
  nonce: bigint,
  teleportV3Address: Address,
  chainId: number
): MigrationTypedData {
  return {
    domain: buildMigrationDomain(teleportV3Address, chainId),
    types: MIGRATION_INTENT_TYPES,
    primaryType: 'MigrationIntent',
    message: { ...params, nonce },
  };
}
