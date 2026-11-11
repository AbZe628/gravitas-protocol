# Test results

**Branch:** `cbar-azerbaijan-sandbox`  
**Source baseline:** `692022e1ca34a280f90a198d2455ac3535b3bce2` (`origin/main` at branch creation)  
**Final verification date:** 11 November 2026  
**Scope:** Local Foundry, Majlis, SDK, mock API and reviewer-app checks; one read-only Arbitrum Sepolia snapshot. No testnet transaction was submitted.

## Final reproducible suite results

| Suite / command | Result | Environment | Evidence boundary |
|---|---|---|---|
| `forge fmt --check` | **PASS** | CBAR branch, Foundry | Formatting only. |
| `forge build --sizes` | **PASS**, Solc 0.8.24 compiled 90 files | Local Foundry | Compiler warning 5667 remains for unused `subscriber` parameter in `GravitasPolicyRegistry.sol:157`; not suppressed. |
| `forge test -vv` | **PASS — 86 tests, 0 failed, 0 skipped** | Local Foundry | Uses local test fixtures and mocks; not live contracts or public-chain transactions. Full output: `evidence/cbar/final-root-foundry.log`. |
| `forge test --match-test test_V3_DustRefundRevertsWhenTheTokenReturnsFalse -vvv` | **PASS — 1/1** | Local Foundry | Induced late SafeERC20 refund failure; source NFT owner/liquidity, user token balances and nonce are asserted equal to their initial values after revert. |
| Majlis: `npm ci`, `npm run typecheck`, `npm test`, `npm run build` | **PASS — 56 test files, 488 tests** | `apps/majlis` | Build emits existing React `act(...)` test warnings and a standard large-chunk warning; neither was suppressed. |
| SDK: `npm ci`, `npm test`, `npm run build` | **PASS — 20 tests; TypeScript build passed** | `gravitas-sdk` after Zod 4.6.7 lockfile update | 15 compliance and 5 builder tests use mock clients, not a live Registry. `npm ci` reports four remaining development-tool advisories: 2 high and 2 moderate in the Vitest/Vite-related tree. |
| Reviewer app: `npm test` and JavaScript/JSON syntax checks | **PASS — 4 tests** | `apps/cbar-sandbox`, Node 22 | Checks address validation, ABI handling, allow-listed routes and read-only method restrictions; not a chain security audit. |
| Integration-kit six-scenario example | **PASS — 6/6 expected fixture decisions** | Loopback-only mock at `127.0.0.1:8791` | **SIMULATED.** Evidence: `evidence/cbar/mock-api-six-scenarios.log`. Mock reads local JSON fixtures and does not query the Registry or enforce the OpenAPI API-key declaration. |
| `POST /v1/verify` valid fixture request | **PASS — HTTP 200 / `ALLOW`** | Loopback-only mock | Fixture policy only; response at `evidence/cbar/mock-api-valid-response.json`. |
| `POST /v1/verify` missing `amount` | **PASS negative control — HTTP 422** | Loopback-only mock | Limited request-shape validation, not full OpenAPI validation; response/status evidence in `evidence/cbar/`. |
| Mock API `npm audit` | **PASS — 0 advisories** | Local mock dependency tree after compatible lockfile updates | Dependency scan only; no production-security conclusion follows. Evidence: `evidence/cbar/mock-api-npm-audit-final.json`. |
| SDK `npm audit` | **WARNING — 4 advisories remain** | SDK development dependency tree | Two high and two moderate in Vitest/Vite-related tooling; safe patch update attempt failed in npm's resolver. Evidence: `evidence/cbar/sdk-npm-audit-final.json`. |
| Reviewer read-only snapshot | **PASS as a read-only response** — chain ID `421614`, block `328255709` | PublicNode, Arbitrum Sepolia | One third-party provider. Code/getter/role reads only; no transaction sent and no second-provider agreement established. Snapshot: `evidence/cbar/arbitrum-sepolia-snapshot-2026-11-11.json`. |
| Non-GET reviewer HTTP request | **PASS negative control — HTTP 405** | Local reviewer service | Confirms write-like HTTP methods are rejected; not an RPC fuzz or security audit. |
| Invalid Registry address lookup | **PASS negative control — HTTP 400** | Local reviewer service | Rejected before upstream RPC access. |
| Main Typst institutional report | **PASS — 30 pages** | Strict compile; publication-profile verifier | `main.typ` compiled with no warnings; deterministic verification passed; representative contact sheet reviewed. |

## Catalogue status

The independent catalogue has 36 requested cases. **22 local contract/Registry cases** are marked PASS or PASS, LIMITED; **T31 and T34** are PASS, SIMULATED; **T36** is PASS, LIMITED for local Registry event replay; and **12 cases remain NOT EXECUTED**. Those twelve are T08, T09, T12, T13, T19, T20, T22, T23, T24, T32, T33 and T35. Exact case-by-case setup, expected and actual results, command, source test and limitations are in `CBAR_TEST_PLAN.md` and the institutional technical PDF.

No testnet transaction hash exists. Foundry tests deploy fresh local fixtures; the public test-network work consists only of read-only calls at the snapshot block. A `PASS` is limited to the behavior the named test asserts and is not a claim of live-system or end-to-end production readiness.

## Captured evidence and known warnings

Raw local test output is under `evidence/cbar/`. The full Foundry run after adding the rollback state comparisons is recorded in `final-root-foundry.log`. The read-only snapshot records the provider and block so another reviewer can cross-check it. Mock API logs are synthetic fixtures. Majlis seed institutions, votes and records are illustrative and are not real board activity.

The SDK major-version update to Zod 4.6.7 passed its tests/build but should be reviewed by maintainers before release. The SDK npm audit still reports development-tool vulnerabilities. The root compiler's unused-parameter warning and Majlis test/build warnings remain visible. These findings are not suppressed to make the package appear cleaner.
