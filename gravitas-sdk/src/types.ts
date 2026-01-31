import { z } from 'zod';
import { Address, Hex } from 'viem';

/**
 * @title Gravitas SDK Type Definitions
 * @author Gravitas Protocol Labs
 * @notice Type-safe schemas for the Gravitas Protocol SDK.
 * @dev All schemas match exactly with the deployed smart contracts (Bank-Grade synchronization).
 */

// ═══════════════════════════════════════════════════════════════════════════════════════
//                              VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * @notice Strict Ethereum Address validation schema.
 * @dev Validates 40-character hex string with 0x prefix.
 */
export const AddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/) as z.ZodType<Address>;

/**
 * @notice Migration parameters schema for runtime validation.
 * @dev EXACT MATCH with TeleportV3.AtomicMigrationParams struct.
 *      Field names synchronized with contract for Bank-Grade compatibility.
 *
 *      Contract Struct Reference:
 *      ```solidity
 *      struct AtomicMigrationParams {
 *          uint256 tokenId;
 *          uint24 newFee;
 *          int24 newTickLower;
 *          int24 newTickUpper;
 *          uint256 amount0MinMint;
 *          uint256 amount1MinMint;
 *          uint256 amount0MinDecrease;
 *          uint256 amount1MinDecrease;
 *          uint256 deadline;
 *          bool executeSwap;
 *          bool zeroForOne;
 *          uint256 swapAmountIn;
 *          uint256 swapAmountOutMin;
 *          uint24 swapFeeTier;
 *      }
 *      ```
 */
export const MigrationParamsSchema = z.object({
  // Position identification
  tokenId: z.bigint().describe('NFT ID of the Uniswap V3 position to migrate'),
  
  // New position parameters
  newFee: z.number().int().min(0).describe('Fee tier for new position (500, 3000, 10000)'),
  newTickLower: z.number().int().describe('Lower tick boundary for new position'),
  newTickUpper: z.number().int().describe('Upper tick boundary for new position'),
  
  // Slippage protection (Gharar Elimination)
  amount0MinMint: z.bigint().describe('Minimum token0 for new position'),
  amount1MinMint: z.bigint().describe('Minimum token1 for new position'),
  amount0MinDecrease: z.bigint().describe('Minimum token0 from liquidity removal'),
  amount1MinDecrease: z.bigint().describe('Minimum token1 from liquidity removal'),
  
  // Transaction deadline (Deterministic Execution)
  deadline: z.bigint().describe('Unix timestamp deadline for transaction'),
  
  // Optional rebalancing swap
  executeSwap: z.boolean().describe('Whether to perform rebalancing swap'),
  zeroForOne: z.boolean().describe('Swap direction (true = token0 → token1)'),
  swapAmountIn: z.bigint().describe('Amount to swap for rebalancing'),
  swapAmountOutMin: z.bigint().describe('Minimum output from swap'),
  swapFeeTier: z.number().int().min(0).describe('Fee tier for swap pool'),
});

export type MigrationParams = z.infer<typeof MigrationParamsSchema>;

// ═══════════════════════════════════════════════════════════════════════════════════════
//                              CUSTOM ERRORS
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * @notice Custom error for Shariah compliance violations.
 * @dev Thrown when assets fail the Risk & Compliance Oracle check.
 *      This implements the "Gharar Elimination" principle by providing
 *      clear, deterministic error messages.
 */
export class ShariahViolationError extends Error {
  constructor(message: string) {
    super(`[Shariah Violation] ${message}`);
    this.name = 'ShariahViolationError';
  }
}

/**
 * @notice Custom error for invalid migration parameters.
 * @dev Thrown when migration parameters fail validation.
 */
export class InvalidMigrationParamsError extends Error {
  constructor(message: string) {
    super(`[Invalid Migration Params] ${message}`);
    this.name = 'InvalidMigrationParamsError';
  }
}

/**
 * @notice Custom error for unauthorized executor.
 * @dev Thrown when the caller is not authorized in the Policy Registry.
 */
export class UnauthorizedExecutorError extends Error {
  constructor(message: string) {
    super(`[Unauthorized Executor] ${message}`);
    this.name = 'UnauthorizedExecutorError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════
//                              CLIENT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * @notice Configuration schema for the Gravitas Client.
 * @dev All addresses are validated to ensure Bank-Grade reliability.
 */
export const ClientConfigSchema = z.object({
  rpcUrl: z.string().url().describe('RPC endpoint URL'),
  registryAddress: AddressSchema.describe('GravitasPolicyRegistry contract address'),
  teleportV3Address: AddressSchema.describe('TeleportV3 contract address'),
  chainId: z.number().int().positive().describe('Chain ID (e.g., 421614 for Arbitrum Sepolia)'),
});

export type ClientConfig = z.infer<typeof ClientConfigSchema>;

// ═══════════════════════════════════════════════════════════════════════════════════════
//                              COMPLIANCE TYPES
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * @notice Result of a compliance check.
 */
export interface ComplianceCheckResult {
  isCompliant: boolean;
  tokenA: Address;
  tokenB: Address;
  checkedAt: number;
}

/**
 * @notice Result of a migration simulation.
 */
export interface MigrationSimulationResult {
  newTokenId: bigint;
  newLiquidity: bigint;
  estimatedGas: bigint;
}
