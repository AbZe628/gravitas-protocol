import { z } from 'zod';
import { Address, Hex } from 'viem';

/**
 * @notice Strict Ethereum Address validation schema
 */
export const AddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/) as z.ZodType<Address>;

/**
 * @notice Migration parameters schema for runtime validation
 */
export const MigrationParamsSchema = z.object({
  tokenId: z.bigint(),
  newFee: z.number().int().min(0),
  newTickLower: z.number().int(),
  newTickUpper: z.number().int(),
  amount0MinMint: z.bigint(),
  amount1MinMint: z.bigint(),
  amount0MinDecrease: z.bigint(),
  amount1MinDecrease: z.bigint(),
  deadline: z.bigint(),
  doSwap: z.boolean(),
  zeroForOne: z.boolean(),
  amountToSwap: z.bigint(),
  amountOutSwapMin: z.bigint(),
  swapFee: z.number().int().min(0),
});

export type MigrationParams = z.infer<typeof MigrationParamsSchema>;

/**
 * @notice Custom error for Shariah compliance violations
 */
export class ShariahViolationError extends Error {
  constructor(message: string) {
    super(`[Shariah Violation] ${message}`);
    this.name = 'ShariahViolationError';
  }
}

/**
 * @notice Configuration for the Gravitas Client
 */
export const ClientConfigSchema = z.object({
  rpcUrl: z.string().url(),
  registryAddress: AddressSchema,
  teleportV3Address: AddressSchema,
  chainId: z.number().int(),
});

export type ClientConfig = z.infer<typeof ClientConfigSchema>;
