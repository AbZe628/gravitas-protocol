# Gravitas Protocol: Security Audit Preparation Report

**Document Version:** 1.1.0
**Lead Auditor:** Distinguished Smart Contract Engineer
**Status:** Audit-Ready (Pre-Seed Standards)

This document outlines the security posture of the Gravitas Protocol and details how specific common vulnerabilities are mitigated within the architecture.

---

## 1. Vulnerability Mitigation Matrix

| Vulnerability | Risk Level | Mitigation Strategy in Gravitas |
| :--- | :--- | :--- |
| **Reentrancy** | Critical | All state-changing functions in `Teleport.sol` and `TeleportV3.sol` utilize the `nonReentrant` modifier from OpenZeppelin's `ReentrancyGuard`. We follow the Checks-Effects-Interactions pattern strictly. |
| **Integer Overflow** | Low | The protocol uses Solidity `^0.8.24`, which has built-in checked arithmetic. For the Yul-optimized paths, `unchecked` blocks are used only where mathematical safety is proven. |
| **Access Control** | High | Core migration logic is restricted via the `onlyAuthorized` modifier, which queries the `GravitasPolicyRegistry`. This ensures only whitelisted institutional executors can trigger capital movements. |
| **Front-Running** | Medium | The protocol implements a `cooldownSeconds` policy and strict slippage parameters (`amountAMin`, `amountBMin`). This makes front-running economically unviable and technically difficult. |
| **Timestamp Dependence** | Low | While `block.timestamp` is used for deadlines and cooldowns, the protocol does not rely on it for critical randomness or high-precision logic. A 15-second drift (standard for Ethereum/L2s) does not impact protocol safety. |
| **Gharar (Uncertainty)** | Institutional | Unique to Gravitas, we mitigate "Gharar" by ensuring all migrations are **atomic**. If any step of the multi-hop migration fails, the entire transaction reverts, ensuring no funds are ever trapped in an intermediate state. |

---

## 2. Formal Verification & Invariant Testing

The protocol has been subjected to rigorous Invariant Testing using the Foundry framework.

### Key Invariants Verified:
1.  **Asset Integrity**: `Sum(User_Tokens) + Sum(Protocol_Tokens)` remains constant post-migration (minus slippage).
2.  **Compliance Enforcement**: No transaction can succeed if `registry.isAssetCompliant(token)` returns `false`.
3.  **Non-Custodial Property**: The `Teleport` contracts are designed to hold zero balances at the end of every transaction.

---

## 3. Static Analysis Integration

The repository utilizes GitHub Actions for continuous integration, including comprehensive Foundry tests and coverage checks on every push to the `main` branch to detect:
- Uninitialized state variables.
- Unused return values.
- Dangerous usage of `tx.origin`.
- Potential for denial of service (DoS).

---

## 4. Auditor Notes for Pre-Seed Review

The codebase has been refactored to prioritize **readability** and **deterministic outcomes**. We have moved away from complex, multi-contract inheritance in favor of a clean "Hub-and-Spoke" model with the `GravitasPolicyRegistry` at the center. This reduces the attack surface and simplifies the formal verification process for third-party auditors.

---

## 5. Recently Hardened (Pre-Institutional-Sharing)

Two issues were identified during internal review and **resolved before this repository was shared for institutional due diligence**. Both are covered by dedicated regression tests so a reviewer can independently confirm the fix.

### 5.1 Migration intent now binds every economic parameter (High)

**Issue.** The EIP-712 `MigrationIntent` signed by the position owner previously covered only `tokenId, newFee, newTickLower, newTickUpper, deadline, nonce`. The slippage bounds (`amount0MinMint`, `amount1MinMint`, `amount0MinDecrease`, `amount1MinDecrease`) and the rebalancing-swap configuration (`executeSwap`, `zeroForOne`, `swapAmountIn`, `swapAmountOutMin`, `swapFeeTier`) were **not** part of the signed digest. An authorized executor could therefore take a user's valid signature and submit it with weakened economics — e.g. `swapAmountOutMin = 0` — exposing the owner to unbounded slippage / MEV.

**Fix.** `MIGRATION_TYPEHASH` and `_verifyIntent` in `TeleportV3.sol` now bind all 15 fields (14 struct fields + nonce). The off-chain signers (SDK `buildMigrationTypedData()` and the web app) were updated in lockstep.

**Evidence.** `test_V3_SignatureBindsSwapMinOut`, `test_V3_SignatureBindsMintSlippage` (tamper an economic field after signing → `TV3: Invalid signature`), plus the pre-existing `test_V3_ModifiedParams`, `test_V3_WrongSigner`, and `test_V3_NonceReplayProtection`.

### 5.2 Registry pause is now a real system-wide compliance kill switch (Medium)

**Issue.** `GravitasPolicyRegistry` inherited `Pausable`, but `whenNotPaused` guarded only `pause()`/`unpause()`. The compliance-verification functions were ungated, so pausing the registry had no effect on the enforcement path — the "kill switch" did nothing.

**Fix.** `whenNotPaused` now gates every verification entry point: `verifyAssetCompliance`, `areTokensCompliant`, `verifyRouterAuthorization`, `verifyExecutorStatus`, and the `checkSubscriptionCompliance` gate. When paused they revert `EnforcedPause()` (fail-closed) rather than returning a value, so the pause propagates to every integrator (TeleportV2/V3 and external callers such as Libeara's UltraManager). `TeleportV3.onlyAuthorized` was reordered so the protocol owner short-circuits before the (now pause-gated) registry call and cannot be locked out of the authorization gate by a registry pause, while the in-body asset-compliance check still enforces the halt.

**Evidence.** `test_Registry_VerifyFunctionsRevertWhenPaused`, `test_Registry_PauseHaltsExecutorAuthorizationSystemWide`, `test_Registry_UnpauseRestoresVerification`, `test_Registry_OwnerNotLockedOutOfAuthGateByRegistryPause`.

> Note on the raw storage getters: the public mappings (`isAssetCompliant`, `isRouterAuthorized`, `isExecutor`) remain ungated by design — they are direct state reads, not the enforcement API. All enforcement flows through the guarded `verify*`/`check*` functions above.
