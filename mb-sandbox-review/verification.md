# Verification and review limits

Review date: 9 November 2026. Reviewed source: `692022e1ca34a280f90a198d2455ac3535b3bce2`. Evidence re-run against branch base `2fbcc41882a3c84dd7efc8defa6768ef0bccf4d8` on the same date. Full command outputs are in `evidence/run-2026-11-09-2fbcc41882a3c84dd7efc8defa6768ef0bccf4d8/`.

## Results rerun

- `forge build`: passed using Foundry 1.9.0 and repository settings (Solidity 0.8.24, optimizer 200 runs, `via_ir`). The unused `subscriber` and lint warnings remain.
- `forge test`: 86 passed, zero failed, zero skipped, across nine suites.
- Scenario proof commands: all 14 documented `forge test` filters selected existing tests; 47 test entries passed across those commands, zero failed or skipped. See `scenario-command-results.json` and the per-command output files.
- Local sandbox: fresh Anvil chain, existing setup script and six local probe groups all passed. They include direct and delegated transfer bypass while rules reject the asset, transfer while paused, failed guarded reads, raw reads, subscriber omission, ownership checks and snapshot restoration. See `setup-local.txt`, `check-local.txt` and `local-results.json`.
- OpenAPI 3.0.3 validation: passed after validating the final specification. Output: `openapi-validation.txt`.
- Audit-fixture validation: recomputed the ABI selector, decoded version 3, checked receipt/log/block links and recomputed the version-3 policy hash from the ordered changes. Output: `audit-fixture-validation.txt`.
- `npm audit --json --prefix integration-kit/mock-server`: exit status 1 because npm reports three findings: one critical, one high and one moderate. The exact advisory output is `npm-audit.json`; the summary is `npm-audit-summary.txt`. This is not an exploitability assessment.

## Dated testnet observation

On 9 November 2026, read-only Arbitrum Sepolia RPC returned chain ID 421614, block 327644577, registry version 1, `paused = false` and owner `0xFba6C221af564Ab90e333AEEf4E427f787911B73`. Runtime bytecode at the documented registry address was 3,244 bytes and matched the local `GravitasPolicyRegistry` build byte for byte, including metadata. Both SHA-256 values were `b058d10c887059aafd4e2ec309098ecaece7057f93a33b31b4f5ff6868f1d92f`. The source's initial version contains the constructor executor grant; no asset approval was recorded. No transaction was sent.

This comparison covers the registry only. TeleportV3 runtime bytecode was not rechecked; its current deployed code is not verified by this package. The stale note in `integration-kit/PROTOCOL-TESTING.md` was replaced with this narrower result. The verification does not establish ownership or code state for every other contract.

## Confirmed behavior and gaps

`GravitasPolicyRegistry.checkSubscriptionCompliance` checks the asset flag and caller's executor status. It accepts but does not read the subscriber. The registry evaluates assets and calling contracts; it does not evaluate investors, amounts or transfer parties.

`MockERC20` inherits normal `transfer` and `transferFrom`; neither calls the registry. Fresh-chain transactions reproduced both bypasses with the asset revoked and also reproduced a direct transfer while paused. This dummy token is GUSD, not a sukuk. No real sukuk token or transfer manager is in this package.

All five guarded registry checks revert when paused; existing Foundry tests cover this. Raw mapping getters still return stored values. `TeleportV2` checks the destination router flag. `TeleportV3` uses fixed constructor venues and does not read the registry router list. Engine owners skip the executor-list check in `onlyAuthorized`, but the migration body still makes required guarded asset checks. The V2 owner-only `rescueTokens` function can move ERC-20s held by TeleportV2 and does not consult the registry.

The local HTTP mock reads `integration-kit/policies/sandbox-policies.json`; it is not registry-backed and has no authentication. The existing example client exits on request failure and sends no transfer. A production HTTP transfer client, timeouts, retry rules and stale-decision refusal are not implemented. A paused on-chain check does fail closed in the guarded migration path. Do not infer the same outage behavior for an absent HTTP production service.

The sample audit JSON joins a successful subscription read at block `0x4`, a separate `PolicyUpdated` version/hash, a distinct GUSD `Transfer` at block `0x5`, and node receipt/block responses. It does not bind the check to the transfer. The registry hash commits to changes; it does not contain a ruling text or identifier. The Majlis registry write is not implemented.

`docs/KNOWN-ISSUES.md`, last checked there on 26 August 2026, says registry ownership has not moved to the timelock, the migration engines use single-step `Ownable`, and engine pause authority waits on the timelock path without a separate pauser role. This review did not independently verify current timelock configuration. The package has not completed an independent security audit. The repository says nothing ships to mainnet before that audit.

## Limits of this review

This is a focused source and sandbox review, not a security audit. Testnet values are dated observations. No testnet transaction or hosted endpoint was tested. The mock's npm audit findings are not proof of exploitability. The package does not establish regulator approval, Shariah certification, a completed independent audit or a production service. No asset was approved in the dated registry observation.

The evidence commands, outputs and dates live in the evidence folder linked from the README. See the six scenario files for each focused test command.
