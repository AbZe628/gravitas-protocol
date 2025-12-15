import { MigrationPolicy } from "../types";
import { MIN_DEADLINE_BUFFER_SECONDS, MAX_SLIPPAGE_BPS } from "../constants";
import { InvalidPolicyError } from "../errors";

export function validatePolicy(policy: MigrationPolicy): void {
  // 1. Check Deadline
  const now = Math.floor(Date.now() / 1000);
  if (policy.deadline < now + MIN_DEADLINE_BUFFER_SECONDS) {
    throw new InvalidPolicyError(
      `Deadline is too soon. Must be at least ${MIN_DEADLINE_BUFFER_SECONDS}s in the future.`,
      { provided: policy.deadline, current: now }
    );
  }

  // 2. Check Slippage
  if (policy.slippageBps < 0 || policy.slippageBps > MAX_SLIPPAGE_BPS) {
    throw new InvalidPolicyError(
      `Slippage BPS ${policy.slippageBps} is out of bounds (0-${MAX_SLIPPAGE_BPS}).`
    );
  }

  // 3. Check Amounts
  if (policy.liquidityAmount <= 0n) {
    throw new InvalidPolicyError("Liquidity amount must be greater than zero.");
  }
  
  // 4. Check Identity
  if (policy.sourceAdapterId === policy.targetAdapterId) {
    throw new InvalidPolicyError("Source and Target adapters must be different.");
  }
}
