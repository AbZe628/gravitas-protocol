export enum ChainId {
  ARBITRUM_ONE = 42161,
  ARBITRUM_SEPOLIA = 421614
}

// Safety buffer to ensure transactions don't revert due to minor block timestamp drift
export const MIN_DEADLINE_BUFFER_SECONDS = 300; // 5 minutes

// Maximum allowed slippage in Basis Points (BPS) to prevent user error
export const MAX_SLIPPAGE_BPS = 1000; // 10%

// Basis Points Divisor
export const BPS_DIVISOR = 10000n;

// Default Gas Limit Estimates for Simulation
export const GAS_ESTIMATES = {
  MIGRATION_BASE: 350000n,
  ADAPTER_OVERHEAD: 50000n
};
