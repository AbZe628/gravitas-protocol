import { MigrationPolicy, SimulationResult } from "../types";
import { BaseAdapter } from "../adapters/BaseAdapter";
import { GAS_ESTIMATES, BPS_DIVISOR } from "../constants";

/**
 * Pure function to simulate migration outcomes.
 * * NOTE: In v0.1, this simulation uses mock reserve data to prove the flow.
 * In production, this receives real-time reserves from the Provider.
 */
export async function simulateMigration(
  policy: MigrationPolicy,
  sourceAdapter: BaseAdapter,
  targetAdapter: BaseAdapter
): Promise<SimulationResult> {
  const invariantChecks: string[] = [];

  try {
    // 1. Simulate Source Withdrawal (Mock Reserves)
    // In prod: await provider.getReserves(...)
    const mockReservesA = 1000000000000000000000n; 
    const mockReservesB = 1000000000000000000000n; 
    const mockTotalSupply = 1000000000000000000n; // 1:1 ratio for simplicity

    const sourceQuote = sourceAdapter.getQuote(
      policy.liquidityAmount,
      mockReservesA,
      mockReservesB,
      mockTotalSupply
    );
    invariantChecks.push("Source: Quote calculation successful");

    // 2. Apply Slippage (simulating worst-case output)
    const slipFactor = BPS_DIVISOR - BigInt(policy.slippageBps);
    const minTokenA = (sourceQuote.amountA * slipFactor) / BPS_DIVISOR;
    const minTokenB = (sourceQuote.amountB * slipFactor) / BPS_DIVISOR;

    // 3. Simulate Target Deposit (Mock: Assuming price parity for v0.1)
    // In real world, we would check the Target pool reserves here.
    const expectedLpOut = minTokenA; // Simplified 1:1 minting for POC

    // 4. Validate output vs Policy
    if (expectedLpOut < policy.minLpOut) {
      return {
        success: false,
        expectedTokenA: minTokenA,
        expectedTokenB: minTokenB,
        expectedLpOut,
        estimatedGas: 0n,
        invariantChecks,
        failureReason: `Output LP (${expectedLpOut}) < Min LP (${policy.minLpOut})`
      };
    }
    invariantChecks.push("Policy: Min LP output met");

    return {
      success: true,
      expectedTokenA: minTokenA,
      expectedTokenB: minTokenB,
      expectedLpOut,
      estimatedGas: GAS_ESTIMATES.MIGRATION_BASE + GAS_ESTIMATES.ADAPTER_OVERHEAD * 2n,
      invariantChecks
    };

  } catch (error: any) {
    return {
      success: false,
      expectedTokenA: 0n,
      expectedTokenB: 0n,
      expectedLpOut: 0n,
      estimatedGas: 0n,
      invariantChecks,
      failureReason: error.message || "Unknown simulation error"
    };
  }
}
