/**
 * Base error class for all SDK-related exceptions.
 */
export class GravitasError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GravitasError";
  }
}

/**
 * Thrown when a migration policy fails deterministic validation checks.
 * e.g. Deadline in past, slippage too high, zero amounts.
 */
export class InvalidPolicyError extends GravitasError {
  constructor(message: string, public policyContext?: Record<string, any>) {
    super(message);
    this.name = "InvalidPolicyError";
  }
}

/**
 * Thrown when an adapter ID is not found in the registry or
 * is incompatible with the requested chain.
 */
export class AdapterNotSupportedError extends GravitasError {
  constructor(adapterId: string, chainId: number) {
    super(`Adapter '${adapterId}' is not supported on chain ${chainId}.`);
    this.name = "AdapterNotSupportedError";
  }
}

/**
 * Thrown during off-chain simulation if the migration logic expects
 * to fail (e.g., output amount < minAmountOut).
 */
export class SimulationError extends GravitasError {
  constructor(message: string, public failureCode: string) {
    super(message);
    this.name = "SimulationError";
  }
}
