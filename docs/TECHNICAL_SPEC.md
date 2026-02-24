# Gravitas Protocol: Technical Specification (Series-A Ready)

**Document Version:** 1.0.0
**Author:** Distinguished Smart Contract Engineer
**Date:** January 31, 2026

This document formally defines the core invariants and mathematical logic of the Gravitas Protocol's Policy-Constrained Smart Routing engine, elevating the MVP to an institutional-grade infrastructure.

---

## 1. Core Invariants (Mathematical Proof of Safety)

The protocol guarantees the following invariants hold true for every atomic liquidity migration, ensuring non-custodial safety and Shariah compliance.

### Invariant 1: Non-Custodial Asset Integrity
The total amount of underlying tokens (`T_A`, `T_B`) owned by the user and the protocol MUST remain constant throughout the migration, excluding only the slippage loss and protocol fees.

$$
\text{Balance}_{\text{Start}} = \text{Balance}_{\text{End}} + \text{Fees} + \text{Slippage}
$$

**Proof of Mitigation:**
- The entire process (Burn $\rightarrow$ Collect $\rightarrow$ Swap $\rightarrow$ Mint) is executed atomically within a single transaction.
- The `_refundDelta` function ensures any token dust remaining in the contract is immediately returned to the user, preventing asset lock-up.

### Invariant 2: Shariah Compliance (Asset Whitelisting)
A migration MUST only be executed if both tokens in the liquidity pair are registered as compliant in the `GravitasPolicyRegistry`.

$$
\text{isCompliant}(\text{Token}_A) \land \text{isCompliant}(\text{Token}_B) = \text{TRUE}
$$

**Proof of Mitigation:**
- The `migrateLiquidityV2` and `teleportLiquidity` functions include a mandatory `require(registry.areTokensCompliant(tokenA, tokenB))` check at the beginning of the execution path.
- This invariant ensures the protocol cannot be used to route capital into non-compliant (e.g., Riba, Maysir) pools.

### Invariant 3: Gharar Avoidance (Deterministic Execution)
The user's final output (new LP tokens) MUST meet or exceed the minimum specified amounts, or the entire transaction MUST revert.

$$
\text{LP}_{\text{Minted}} \ge \text{LP}_{\text{Min}} \land \text{Token}_{A, \text{Out}} \ge \text{Token}_{A, \text{Min}} \land \text{Token}_{B, \text{Out}} \ge \text{Token}_{B, \text{Min}}
$$

**Proof of Mitigation:**
- The use of `amountAMin`, `amountBMin`, and `amountOutSwapMin` parameters in the V2 `addLiquidity` and V3 `exactInputSingle` calls enforces a deterministic outcome, eliminating the uncertainty (Gharar) of slippage.

---

## 2. Policy-Constrained Routing Logic (V2)

The core V2 migration function, `migrateLiquidityV2`, is governed by two primary risk policies:

### Policy 1: Maximum Move Percentage ($\text{maxMoveBps}$)
This policy limits the size of a single migration relative to the total liquidity of the source pool.

$$
\text{LP}_{\text{Amount}} \le \frac{\text{LP}_{\text{Reference}} \times \text{maxMoveBps}}{10,000}
$$

| Variable | Definition |
| :--- | :--- |
| $\text{LP}_{\text{Amount}}$ | `lpAmount` (LP tokens to burn) |
| $\text{LP}_{\text{Reference}}$ | `referenceLpBalance` (Total LP supply) |
| $\text{maxMoveBps}$ | Protocol-set limit (e.g., 2000 for 20%) |

### Policy 2: Cooldown Period ($\text{cooldownSeconds}$)
This policy prevents rapid, repeated migrations for the same liquidity path.

$$
\text{block.timestamp} \ge \text{lastMigrationAt} + \text{cooldownSeconds}
$$

| Variable | Definition |
| :--- | :--- |
| $\text{lastMigrationAt}$ | Timestamp of the last successful migration for the unique path key. |
| $\text{cooldownSeconds}$ | Protocol-set minimum time between migrations. |

---

## 3. V3 Liquidity Teleport Flow

The `teleportLiquidity` function follows a strict, non-custodial sequence:

1.  **Pre-Check**: Validate NFT ownership, check Shariah compliance of tokens, and enforce deadline.
2.  **Decrease Liquidity**: Call `positionManager.decreaseLiquidity` to remove the liquidity from the NFT position.
3.  **Collect Tokens**: Call `positionManager.collect` to transfer the underlying tokens and accumulated fees to the `TeleportV3` contract.
4.  **Burn NFT**: Call `positionManager.burn` to destroy the old NFT, cleaning up the state.
5.  **Optional Swap**: If `doSwap` is true, call `swapRouter.exactInputSingle` to rebalance the collected tokens.
6.  **Mint New Position**: Call `positionManager.mint` to create a new NFT position with the collected/rebalanced tokens, minting the new NFT directly to the user's address.
7.  **Refund Dust**: Call `_refundDelta` to return any unused tokens to the user.
