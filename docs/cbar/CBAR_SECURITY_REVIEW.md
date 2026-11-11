# Internal technical review — not an independent security audit

**Reviewed source baseline:** `692022e1ca34a280f90a198d2455ac3535b3bce2`. This document is a focused engineering review, not an independent security audit, formal penetration test, certification or legal/Shariah assessment.

## Reviewed domains

The review covered reentrancy and external calls in Teleport V2/V3; Registry/owner/executor authorization; EIP-712 signature binding, nonce and deadline controls; slippage minima, approvals and token transfer handling; pause and Registry failure behavior; events and policy version/hash; API authentication boundary; test and mock coverage; dependency/configuration caveats; and a read-only check of the four documented Arbitrum Sepolia addresses.

## Positive control evidence

- Registry setters are owner-gated; test cases cover unauthorized writes and zero-address guards.
- Registry policy version/hash advances only on a genuine state change and can be replayed from events in the unit suite.
- Teleport V2/V3 callers check relevant Registry authorization and policy state.
- Teleport V3 uses EIP-712 intent parameters, owner verification, a per-owner nonce and deadline; tests cover parameter mutation, wrong signer and replay.
- Token-moving calls use SafeERC20 paths; a regression test now induces a failed late refund and compares source NFT owner/liquidity, user token balances and nonce to the initial state.
- Reviewer network access is limited to fixed allow-listed reads. The sole reviewer POST route accepts only T26/T27, requires a loopback client and same-origin request, and launches fixed Foundry arguments with `shell:false`, a minimal environment, a 90-second timeout and no inherited credentials. No arbitrary command, signer, wallet or testnet write path exists.

## Material findings and boundaries

1. **Governance-to-chain gap:** Majlis has no verified Registry transaction writer or authorization signature path. Application voting and quorum are not chain governance.
2. **Live ownership:** Registry and both engines are owned by a single observed EOA, not the deployed Timelock; Registry pending owner is zero. Timelock delay is 300 seconds, observed owner has proposer role, and the zero address has executor role. This is not a multisig/timelock handover.
3. **No identity or eligibility controls:** `checkSubscriptionCompliance` does not inspect its `subscriber`. Allow-list flags are not KYC, AML/CFT, sanctions screening, accreditation or investor eligibility.
4. **V2 operational scope:** no live V2 DEX route was established on Arbitrum Sepolia; the contract has no standalone pause method and is not a cross-chain bridge.
5. **V3 recovery and slippage:** decrease-side minimums have no required nonzero floor; a signed owner can accept zero. Directly transferred ERC-721s may be stranded. There is no separate fast emergency pauser.
6. **SDK/API boundary:** SDK does not write transactions. Its 20 unit tests and TypeScript build pass using mock clients; no live Registry integration was exercised. The local mock API now binds to loopback, uses fixtures and still lacks the authentication declared in OpenAPI. A paused-registry pair-check path in the SDK may propagate a raw revert.
7. **Test scope:** root tests use mock tokens, pools and managers; full behavior against live third-party DEX contracts has not been demonstrated. Specific wrong-chain and wrong-verifying-contract negative tests are not present in the baseline.
8. **Deployment verification:** explorer source/ABI is visible, but exact bytecode equality with the audited commit and second-provider state agreement were not established.
9. **Dependencies and build warnings:** the root build emits the unused `subscriber` parameter warning. The mock API dependency audit reports zero advisories after compatible lockfile updates. The SDK audit still reports two high and two moderate advisories in its Vitest/Vite-related development dependency tree; the safe patch update attempt failed in npm's resolver. The SDK's Zod major update to 4.6.7 passed its tests/build, but requires maintainer review before release.
10. **Legal / operational:** no independent audit, local legal entity, CBAR approval, institutional partner or tested production service is claimed.

## Security disposition

The current package is suitable for a controlled technical discussion focused on policy checks and local atomic execution, provided every caveat remains visible. It is not ready to handle customer funds, production institutional transactions, regulated services or a formal CBAR application. Before those steps, complete independent contract review, end-to-end governance/signature/access-control design, owner/Timelock decisions, emergency stop design, production API authentication and monitoring, external integration tests, legal classification and local partner/applicant eligibility review.
