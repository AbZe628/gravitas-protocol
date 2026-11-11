# Phase 1 — Factual Repository and Deployment Audit

**Assessment date:** 11 November 2026  
**Repository:** `AbZe628/gravitas-protocol`  
**Branch:** `cbar-azerbaijan-sandbox`  
**Audited source commit:** `692022e1ca34a280f90a198d2455ac3535b3bce2` (`origin/main` at branch creation)  
**Classification:** Internal technical review — not an independent security audit.

## Scope and reproducible baseline

The CBAR branch is isolated from `mb-sandbox-review`. It starts directly from the verified `origin/main` commit `692022e1ca34a280f90a198d2455ac3535b3bce2`; no contract or Multibank reference file was changed during the Phase 1 review. The branch was clean before this report and the CBAR documentation directory was the only new worktree content afterward.

On that exact source baseline, `forge fmt --check`, `forge build --sizes`, and `forge test -vv` completed successfully. Solc 0.8.24 compiled 90 files; all 86 Foundry tests passed, with 0 failures and 0 skips. In `apps/majlis`, `npm ci`, `npm run typecheck`, `npm test`, and `npm run build` completed successfully. Vitest reported 56 test files and 488 passing tests. The production build completed; its output included React `act(...)` warnings from tests and the standard Vite large-chunk warning. These warnings were not suppressed. The `gravitas-sdk` test/build baseline did not complete: the SDK's test command stopped because `vitest` was not installed in that package environment. This report does not treat unexecuted integration paths as passing.

## Maturity findings

### Majlis governance application

Majlis is more than a static mock: it has authenticated server-side matter/proposal routes, reasoned deliberation and vote records, role checks, signatory quorum calculation, an executable application lifecycle, objections, expiry/timelock progression, document hashing/sealing and selectable in-memory or JSON-file persistence. Relevant implementation is in `apps/majlis/server/src/routes/governance.ts`, `services/lifecycle.ts`, `services/signature.ts`, `auth/passkeys.ts`, `services/hash.ts`, and the store adapters; focused coverage exists in `server/test/governance.test.ts`, `the-vote-waits.test.ts`, `sweep-timelock.test.ts`, `signature.test.ts`, `signing-http.test.ts`, and `passkeys.test.ts`.[1]

The critical boundary is the registry integration. `services/registry.ts` and `services/enforcement.ts` read/configure registry state; `services/carrying.ts` describes the path as read-only. No governance route or service submits registry writes, and no verified path turns a completed Majlis vote into an on-chain registry transaction. “In force” in the Majlis state machine is an application record, not an on-chain policy update. The installed signature/seal service includes HMAC installation attestation and passkey-based authentication records; it is not a personal signing key that authorizes a Policy Registry transaction. Parameter hashes in `services/hash.ts` provide canonicalized data integrity checks, not signatures or governance approvals.[1]

Seed data in `apps/majlis/server/src/data/seed.ts`, `seed-work.ts`, and `seed-lifecycle.ts` is explicitly illustrative. Seeded boards, votes, holdings and lifecycle events are not evidence of real institutional decisions. The component's types also state that Stage One is read-only. No SQL schema or migration artifacts were found in `apps/majlis`; persistence is memory/file based in the reviewed code. Thus governance workflow is **IMPLEMENTED AND TESTED** at application level; on-chain governance/write/signature linkage is **PROPOSED / NOT IMPLEMENTED**; seeded history is **MOCKED / SIMULATED**.[1]

### Gravitas Policy Registry and governance controls

`contracts/GravitasPolicyRegistry.sol` implements owner-gated asset, router and executor flags; pause/unpause; version/history and a sequential policy hash; and read-side compliance functions. Source and tests cover setters, no-op writes, version/hash progression, event replay patterns, ownership transfer mechanics and pause-gated checks. `checkSubscriptionCompliance(subscriber, subscriptionToken)` checks the token and executor conditions but does not inspect `subscriber`; it is not KYC, sanctions, accreditation or investor-eligibility enforcement.[2]

A `GravitasTimelock` wrapper and ownership-handover script exist, but the existence of source is not proof of a completed handover. The deployment script configures a 300-second minimum delay and deployer-controlled proposer configuration, rather than enforcing the recommended 48-hour delay and multisig arrangement; deployment documentation says handover remains pending. The local test suite tests `Ownable2Step` mechanics but does not exercise the complete timelock schedule → execute → registry ownership acceptance path.[2]

### Teleport V2

`contracts/TeleportV2.sol` implements an atomic same-chain V2-style liquidity operation: resolve a pair through a caller-supplied factory, burn caller-provided LP tokens, and add the resulting same token pair through an authorized destination router. It checks registry executor, router and asset policies, enforces a per-route cooldown and maximum share of total pair LP supply, returns dust and provides owner token rescue. Tests exercise successful flows and key guards using simplified test mocks.[3]

It is not a general-purpose bridge and has no bridge messaging, cross-chain settlement, swap/conversion, multi-hop path, per-user intent signature or nonce. The destination is one caller-supplied authorized V2-compatible router. The source repository states that a usable V2 DEX route is not deployed on Arbitrum Sepolia. The V2 contract itself has no pause interface; its registry checks can fail closed when the Registry is paused. Its ownership is single-step `Ownable`.[3]

### Teleport V3

`contracts/TeleportV3.sol` implements EIP-712-signed same-chain migration of a Uniswap V3-style NFT liquidity position. The contract verifies the current position owner and signature, binds the operation fields and chain/contract domain, uses a per-owner nonce and deadline, checks registry executor/asset conditions, removes liquidity, collects tokens, burns the old position, optionally executes a bounded single-hop rebalance, mints a new NFT position to the original owner and refunds defined excess balances. Contract and test evidence covers no-swap and swap paths, replay protection, invalid signatures/parameters, fee tiers, dust and rollback cases, using repository mocks rather than a fork/live Uniswap integration.[4]

It does not preserve the original NFT identifier and does not provide cross-chain migration. The new position is a fresh mint. Pool behavior and swap economics in the full-flow suite are simulated by deterministic mocks. The decrease-side nonzero slippage-floor issue and lack of a separate emergency pauser are recorded in `docs/KNOWN-ISSUES.md`; an accidental ERC-721 can be stranded because there is no general rescue path.[4]

### SDK and integration kit

`gravitas-sdk` is a viem-based read/simulate/calldata helper, not a transaction-submitting wallet and not an HTTP client for a hosted production compliance API. Builder and compliance tests use fake clients. The SDK does not implement user signature production, nonce retrieval or `writeContract` submission. A code-level edge case exists: `getComplianceStatus` calls the pair compliance method outside the shared gated-read error normalizer, so a paused-registry revert may not map to the SDK's pause-specific error.[5]

`integration-kit/mock-server` is explicitly a local mock that loads JSON policy fixtures, decides from those local fixtures and appends JSONL audit records; it does not read the live registry. The OpenAPI document declares API-key security, but the mock server has no authentication middleware. The examples contain drift and placeholders, including calls that do not match the SDK API; they should not be represented as executable production integrations. The SDK-specific test/build attempt was **NOT COMPLETED** because `vitest` was missing.[5]

## Arbitrum Sepolia read-only deployment check

The official Arbitrum chain table identifies Arbitrum Sepolia as chain ID `421614`. Its public RPC endpoint returned HTTP 403 from this sandbox, so the read-only check used the PublicNode Arbitrum Sepolia endpoint listed by Arbitrum as a third-party provider. At observed block `328255709`, all four documented addresses had non-empty runtime code: Registry (3,244 bytes), TeleportV3 (8,996 bytes), TeleportV2 (4,200 bytes), and Timelock (5,279 bytes). Arbiscan exposes a source-code/ABI panel for each of these addresses. This confirms code presence and published ABI/source material, but does **not** prove byte-for-byte correspondence with this source commit or the absence of proxy/verification caveats.[6]

Read calls showed:

- Registry owner: `0xFba6C221af564Ab90e333AEEf4E427f787911B73`; pending owner is zero; paused is `false`; `currentVersion()` is `1`; `policyHistory(1)` is `0x687a974ff8f6ad74a4ba4355e5502668cde3e41cb279579d7100251f6a54f43c`.
- TeleportV2 owner is the same EOA; its `registry()` points to the documented Registry; `cooldownSeconds()` is `900` and `maxMoveBps()` is `2000`.
- TeleportV3 owner is the same EOA; its registry binding points to the documented Registry; its position manager is `0x6b2937Bde17889EDCf8fbD8dE31C3C2a70Bc4d65` and swap router is `0x101F443B4d1b059569D643917553c771E1b9663E`; its own `paused()` state is `false`.
- Timelock `getMinDelay()` is `300` seconds; the observed owner has `PROPOSER_ROLE`, does not have `EXECUTOR_ROLE`, and the zero address has `EXECUTOR_ROLE` (open execution).

The owner result is important: the Registry and both engines are not currently shown as owned by the deployed Timelock. The Registry has no pending transfer. Therefore, although the Timelock contract is deployed and configured with a 300-second minimum delay, the read-only state does not demonstrate that it governs the live Registry or engines. All getter/code reads in the reviewer UI use one fixed block tag per refresh. This snapshot is from one public provider; independent second-provider agreement and bytecode equivalence to the base commit remain unverified. No transaction was sent.[6]

## Initial implementation matrix

| Component | Status | What the evidence supports | Material boundary |
|---|---|---|---|
| Majlis proposal, deliberation, quorum and application timelock | IMPLEMENTED AND TESTED | HTTP route/service state machine and focused passing tests | Application workflow; not on-chain execution |
| Majlis registry writes and governance-to-chain handoff | PROPOSED / NOT IMPLEMENTED | Registry reads and hash verification exist | No write/transaction submission or end-to-end policy enactment |
| Majlis demo records | MOCKED / SIMULATED | Explicitly seeded fixture data | Not real board activity |
| Registry policy setters, pause, version/hash and read checks | IMPLEMENTED AND TESTED | Solidity source plus passing unit/integration tests | Owner-controlled policy; no KYC/eligibility check |
| Timelock governance of deployed Registry | UNKNOWN / UNVERIFIED; live state indicates not in control | Timelock is deployed; live delay is 300s | Registry owner remains separate EOA; no completed handover proof |
| Teleport V2 same-chain liquidity route | IMPLEMENTED AND TESTED | Mock-backed flow/guard tests | No bridge or documented live V2 DEX route |
| Teleport V3 NFT-position migration | IMPLEMENTED AND TESTED | EIP-712, nonce, bounds and mock-backed full-flow tests | No live Uniswap fork, no cross-chain, documented slippage/recovery gaps |
| SDK compliance reads and transaction simulation | IMPLEMENTED BUT NOT FULLY TESTED | Fake-client unit coverage and source inspection | No transaction submission; live integration untested |
| Integration-kit REST API | MOCKED / SIMULATED | Local JSON policy mock and OpenAPI contract | No API-key enforcement in mock; no proof of hosted production API |
| Current deployed-code/source correspondence | UNKNOWN / UNVERIFIED | Code exists and Arbiscan publishes source/ABI | Exact bytecode match to audited commit not yet established |

## Initial blockers and next engineering scope

The system currently demonstrates several local technical building blocks, but not the complete “human decision → cryptographic authorization → on-chain Registry update → independent replay” chain. It also has no Azerbaijan-registered legal entity. The official third-cycle CBAR window closed on 25 August 2026; no later or currently open cycle was officially evidenced in the reviewed CBAR sources. The appropriate next step is a preliminary technical discussion and regulatory guidance, not a formal sandbox application or claim of eligibility.

The isolated engineering phase should prioritize an independently inspectable reviewer environment, read-only network discovery, a test catalogue grounded in actual existing tests, local-EVM reproductions with state snapshots for success and induced late failure, and an evidence index that labels each item LIVE, LOCAL TEST, SIMULATED, PROPOSED or NOT AUDITED. It must preserve existing production/reference contracts and avoid enabling testnet writes.

## References

[1]: https://github.com/AbZe628/gravitas-protocol/tree/692022e1ca34a280f90a198d2455ac3535b3bce2/apps/majlis "Majlis source and tests at the audited commit"
[2]: https://github.com/AbZe628/gravitas-protocol/tree/692022e1ca34a280f90a198d2455ac3535b3bce2/contracts "Registry, timelock and deployment sources at the audited commit"
[3]: https://github.com/AbZe628/gravitas-protocol/blob/692022e1ca34a280f90a198d2455ac3535b3bce2/contracts/TeleportV2.sol "Teleport V2 source at the audited commit"
[4]: https://github.com/AbZe628/gravitas-protocol/blob/692022e1ca34a280f90a198d2455ac3535b3bce2/contracts/TeleportV3.sol "Teleport V3 source at the audited commit"
[5]: https://github.com/AbZe628/gravitas-protocol/tree/692022e1ca34a280f90a198d2455ac3535b3bce2/gravitas-sdk "SDK and integration-kit source at the audited commit"
[6]: https://docs.arbitrum.io/chain-info "Arbitrum chain ID and RPC reference"
[7]: https://arbitrum.publicnode.com/?sepolia "PublicNode Arbitrum Sepolia RPC endpoint"
[8]: https://sepolia.arbiscan.io/address/0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23 "Registry contract source and ABI"
[9]: https://sepolia.arbiscan.io/address/0x6702C2CE6eD58ca3934eBBd785CaC1De8DCd85B4 "Teleport V3 contract source and ABI"
[10]: https://sepolia.arbiscan.io/address/0xEDfF3dFdcdd7C04B11d9B614D5e0cd368f1e93c0 "Teleport V2 contract source and ABI"
[11]: https://sepolia.arbiscan.io/address/0xbFFAd90B2607e3E5926260B640BbcD1E128680Ba "Timelock contract source and ABI"
[12]: https://sandbox.cbar.az/en/ "CBAR Regulatory Sandbox portal"
[13]: https://cbar.az/press-release-5513/central-bank-accepts-applications-for-third-period-of-participation-in-regulatory-sandbox-regime?language=en "CBAR third-cycle application dates"
