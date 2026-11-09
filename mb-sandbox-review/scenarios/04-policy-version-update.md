# 04 — Rule changed to a new version

## Setup

Review base: `692022e1ca34a280f90a198d2455ac3535b3bce2`, branch `mb-sandbox-review`. All accounts and assets are dummy.

A whitelist is an allowed-address list. An executor is an authorized caller of the combined subscription check. A policy version numbers a real list change, not every transaction.

Use a fresh baseline from [sandbox-access.md](../sandbox-access.md): local RPC `http://127.0.0.1:8545`, `REGISTRY`, existing MockERC20 `ASSET`, `OWNER=Anvil0`, `EXECUTOR=Anvil1`, and `RECIPIENT=Anvil2`. Constructor executor grant to OWNER creates version **1**; asset addition creates **2**; EXECUTOR grant creates **3**. `GravitasSubscriptionIntegrationTest.setUp()` performs this same sequence. Each Forge test creates its own fixture, meaning its own fresh setup.

## Steps

1. Check constructor version 1 with `test_GenesisIsTheDeployerGrant`.
2. Check chained changes with `test_EachVersionFoldsInTheOneBeforeIt` and `test_ARealChangeStillAdvancesTheRecord`. The first test adds an asset at 2, a **router**, not an executor, at 3, and revokes the asset at 4.
3. Check duplicate writes with `test_RewritingTheSameValueIsNotAPolicyChange`, `test_RewritingARouterChangesNothing`, `test_RewritingAnExecutorChangesNothing`, and `test_ARepeatedWriteEmitsNothing`.
4. Optional local exercise, inside the snapshot described in sandbox-access: repeat `setAssetCompliance(ASSET,true)` as OWNER; version stays 3. Set it false; version becomes 4. Set it true again; version becomes 5. Pause and unpause; version stays 5. Restore the snapshot afterward. Subscription reads must use `--from "$EXECUTOR"`.

## Expected result

A hash is a fixed-size fingerprint. The hash chain includes the previous fingerprint in each new one. Exact Solidity formula for every real change:

```solidity
H[0] = bytes32(0);
H[v] = keccak256(abi.encode(H[v-1], field, subject, status));
```

`field` is `keccak256("asset")`, `keccak256("router")`, or `keccak256("executor")`; `subject` is the address and `status` the new boolean. Use `abi.encode`, not `abi.encodePacked`. Duplicate writes emit no change event and keep both version and hash unchanged. Order matters: `test_OrderOfChangesIsPartOfTheCommitment` checks this.

## Existing proof commands

Run from the repository root:

```bash
forge test --match-contract '^PolicyCommitment' -vv
forge test --match-contract '^GravitasSubscriptionIntegrationTest' --match-test '^test_CheckSubscriptionCompliance_Success' -vv
forge test --match-contract '^PausableTests' --match-test '^test_Registry_PauseUnpause' -vv
```

## Sources and limits

`contracts/GravitasPolicyRegistry.sol`: constructor, three setters, `_recordChange`, `pause`, `unpause`, `checkSubscriptionCompliance`. Tests: `test/foundry/PolicyCommitment.t.sol`, `test/GravitasSubscriptionIntegration.t.sol`, `test/foundry/PausableTests.t.sol`. Documentation: `docs/whitepaper.md` §3.3.

`policyHistory` maps versions to hashes, **not historical full states**. Reconstruction requires the ordered changes. `test_AnObserverCanReplayTheChainFromEvents` recomputes known changes; it does not decode recorded logs. Pause-version stability follows from code; the existing pause test does not assert it. The named tests passed in the full review run.
