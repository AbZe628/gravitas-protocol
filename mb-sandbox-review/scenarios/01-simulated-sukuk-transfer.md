# 01 — Simulated tokenised sukuk transfer

## Setup

Reviewed base: `692022e1ca34a280f90a198d2455ac3535b3bce2`, branch `mb-sandbox-review`.

Sukuk are asset-linked certificates; none are implemented here. `contracts/MockERC20.sol` creates **Gravitas USD / GUSD**, a dummy ERC-20 (standard balance-and-transfer token), not a sukuk. All actors and addresses below are dummy local accounts.

Use `../sandbox-access.md` for setup, not these steps to deploy. Baseline: `RPC=http://127.0.0.1:8545`; freshly deployed `REGISTRY`; existing MockERC20 `ASSET`; `OWNER` = Anvil0, `EXECUTOR` = Anvil1, `RECIPIENT` = Anvil2, `UNKNOWN=0x0000000000000000000000000000000000000999`. OWNER must hold at least one GUSD. Constructor grants OWNER executor status at version 1; asset whitelist at version 2; EXECUTOR whitelist at version 3. A whitelist is an explicit allowed-address list. An executor is the caller authorized to request the combined check.

## 1. What is permitted or prohibited?

The registry stores allowed assets and callers. These calls are read-only: they do not move tokens. Run separately; expected rejections stop only that call. A revert means the contract rejects the call.

```bash
# Permitted: returns 3
cast call "$REGISTRY" 'checkSubscriptionCompliance(address,address)(uint256)' "$RECIPIENT" "$ASSET" --from "$EXECUTOR" --rpc-url "$RPC"
# Prohibited asset: GPR: Asset not Shariah-compliant
cast call "$REGISTRY" 'checkSubscriptionCompliance(address,address)(uint256)' "$RECIPIENT" "$UNKNOWN" --from "$EXECUTOR" --rpc-url "$RPC"
# Prohibited caller: GPR: Calling contract not an authorized executor
cast call "$REGISTRY" 'checkSubscriptionCompliance(address,address)(uint256)' "$RECIPIENT" "$ASSET" --from "$UNKNOWN" --rpc-url "$RPC"
# Also returns 3: subscriber is ignored, not an eligibility check
cast call "$REGISTRY" 'checkSubscriptionCompliance(address,address)(uint256)' "$UNKNOWN" "$ASSET" --from "$EXECUTOR" --rpc-url "$RPC"
```

## 2. Which routes bypass the check?

Demonstrate a real local transfer while the asset is prohibited and the registry paused. `--unlocked` uses the local node's OWNER account; never use this on a remote node.

```bash
cast send "$REGISTRY" 'setAssetCompliance(address,bool)' "$ASSET" false --from "$OWNER" --unlocked --rpc-url "$RPC"
# Now version 4; check rejects the asset
cast call "$REGISTRY" 'checkSubscriptionCompliance(address,address)(uint256)' "$RECIPIENT" "$ASSET" --from "$EXECUTOR" --rpc-url "$RPC"
cast send "$REGISTRY" 'pause()' --from "$OWNER" --unlocked --rpc-url "$RPC"
# Now rejects with EnforcedPause()
cast call "$REGISTRY" 'checkSubscriptionCompliance(address,address)(uint256)' "$RECIPIENT" "$ASSET" --from "$EXECUTOR" --rpc-url "$RPC"
# Record both balances before and after this transfer
cast call "$ASSET" 'balanceOf(address)(uint256)' "$OWNER" --rpc-url "$RPC"
cast call "$ASSET" 'balanceOf(address)(uint256)' "$RECIPIENT" --rpc-url "$RPC"
cast send "$ASSET" 'transfer(address,uint256)' "$RECIPIENT" 1000000000000000000 --from "$OWNER" --unlocked --rpc-url "$RPC"
cast call "$ASSET" 'balanceOf(address)(uint256)' "$OWNER" --rpc-url "$RPC"
cast call "$ASSET" 'balanceOf(address)(uint256)' "$RECIPIENT" --rpc-url "$RPC"
```

Expected: OWNER loses one GUSD, RECIPIENT gains one, and `Transfer` is emitted. Registry remains paused at version 4. Inherited `transfer` and approved-spender `transferFrom` never consult it. TeleportV2's owner-only `rescueTokens` also has no registry check, but moves only tokens held by Teleport.

TeleportV2/V3 `onlyAuthorized` owner short circuit skips **executor authorization only**. Migration still calls `verifyAssetCompliance`; ownership cannot bypass prohibited assets or a paused registry. The owner-pause test below proves passage to deadline validation, not successful migration.

Closing the transfer gap requires a token or manager that calls the guarded registry during execution on every balance-moving route, including delegated transfers and any custody or administrative route. An optional pre-check is not enough. That sukuk integration is absent here; no contract was changed to add it. Use a local snapshot and restore it before running another scenario, or run the snapshot-restoring `scripts/check-local.py` helper from the package root.

## 3. What if the API or registry is unavailable?

API means application programming interface. The separate HTTP mock uses a local JSON policy file, not live registry calls; its log is not transfer enforcement. `verify-client.ts` exits on request failure and executes no transfers. An integrating application must stop on an unavailable decision, not treat it as permission. Failed registry calls cannot authorize a guarded migration; direct GUSD transfer remains independent. If the local RPC itself is down, these commands cannot submit transactions.

The guarded migration paths **fail closed**: failure blocks execution. This is decided by the registry's `whenNotPaused` and the migration contracts' required asset checks; neither migration catches a registry failure and continues. A direct GUSD transfer does not consult the API or registry at all, so their outage cannot block it. No production HTTP transfer client is present: fail-open versus fail-closed there is an integration choice that still needs implementation and testing. In `ComplianceService.gatedRead`, read failures are thrown, not converted to permission.

## Existing tests, references, and limits

Run from repository root; the underlying tests passed in the full 86-test review run:

```bash
forge test --match-path test/GravitasSubscriptionIntegration.t.sol -vv
forge test --match-path test/foundry/PausableTests.t.sol --match-test 'test_Registry_(VerifyFunctionsRevertWhenPaused|PauseHaltsExecutorAuthorizationSystemWide|OwnerNotLockedOutOfAuthGateByRegistryPause)' -vv
forge test --match-path test/foundry/TeleportFlow.t.sol --match-test '^test_V2_RescueTokens' -vv
```

Subscription tests: `test_CheckSubscriptionCompliance_Success`, `test_CheckSubscriptionCompliance_RevertOnNonCompliantAsset`, `test_CheckSubscriptionCompliance_RevertOnUnauthorizedExecutor`.

Sources: `contracts/GravitasPolicyRegistry.sol` — `checkSubscriptionCompliance`, `_recordChange`, `pause`; `contracts/MockERC20.sol` — constructor; `lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol` — `transfer`, `transferFrom`, `_update`; `contracts/TeleportV2.sol` — `onlyAuthorized`, `migrateLiquidityV2`, `rescueTokens`; `contracts/TeleportV3.sol` — `onlyAuthorized`, `executeAtomicMigration`; `integration-kit/mock-server/server.js` — `decide`, `/v1/verify`; `integration-kit/sdk-examples/verify-client.ts` — `run`; `integration-kit/README.md` — flow.

No existing dedicated MockERC20 bypass test was found. Separate checks and transfers have no atomic (all-in-one-transaction) rule-version audit in the existing token contract. No sukuk issuance, holder eligibility, or legal rights are demonstrated.
