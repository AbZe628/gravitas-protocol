import { BigNumberish } from "ethers";

/**
 * Represents the instruction set for a liquidity migration.
 * This object is fully deterministic.
 */
export interface MigrationPolicy {
  /** Unique identifier for the source protocol (e.g., 'uniswap_v2') */
  sourceAdapterId: string;
  
  /** Unique identifier for the destination protocol (e.g., 'camelot_v2') */
  targetAdapterId: string;
  
  /** The LP token address representing the liquidity to migrate */
  tokenA: string;
  tokenB: string;
  
  /** The amount of LP tokens to remove from Source */
  liquidityAmount: bigint;
  
  /** The minimum amount of LP tokens expected at Target */
  minLpOut: bigint;
  
  /** Unix timestamp (seconds) by which transaction must be included */
  deadline: number;
  
  /** User-defined slippage tolerance in Basis Points */
  slippageBps: number;
}

/**
 * Result of an off-chain simulation run.
 */
export interface SimulationResult {
  success: boolean;
  
  /** The estimated amount of TokenA reclaimed from Source */
  expectedTokenA: bigint;
  
  /** The estimated amount of TokenB reclaimed from Source */
  expectedTokenB: bigint;
  
  /** The estimated amount of LP tokens minted at Target */
  expectedLpOut: bigint;
  
  /** Estimated gas consumption for the operation */
  estimatedGas: bigint;
  
  /** List of invariant checks that passed (e.g., "Slippage < 50bps") */
  invariantChecks: string[];
  
  /** If success is false, this provides the strict typed reason */
  failureReason?: string;
}

export interface TransactionPayload {
  to: string;
  data: string;
  value: bigint;
  chainId: number;
}

export interface GravitasConfig {
  rpcUrl: string;
  chainId: number;
  teleportAddress: string;
}
