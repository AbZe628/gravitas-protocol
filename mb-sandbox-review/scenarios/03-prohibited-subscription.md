# 03 — Prohibited asset or executor

## Setup

Reviewed base: `692022e1ca34a280f90a198d2455ac3535b3bce2`, branch `mb-sandbox-review`.

The existing `GravitasSubscriptionIntegrationTest.setUp()` creates a fresh, unpaused registry. It grants the owner executor status in the constructor (version 1), whitelists a dummy asset (version 2), and authorizes a dummy executor (version 3). A whitelist is an explicit allowed-address list. An executor is a caller allowed to request the combined subscription check.

Optional local setup uses `../sandbox-access.md`: `RPC=http://127.0.0.1:8545`, fresh `REGISTRY`, existing MockERC20 `ASSET`, `OWNER=Anvil0`, `EXECUTOR=Anvil1`, `RECIPIENT=Anvil2`, and `UNKNOWN=0x0000000000000000000000000000000000000999`. Keep UNKNOWN off both lists and the registry unpaused; baseline version is 3.

## Steps and expected result

1. Call the combined check from the authorized executor with an unapproved token. Expect a revert, `GPR: Asset not Shariah-compliant`, as asserted by `test_CheckSubscriptionCompliance_RevertOnNonCompliantAsset`.
2. Call it from an unauthorized address with the approved asset. Expect a revert, `GPR: Calling contract not an authorized executor`, as asserted by `test_CheckSubscriptionCompliance_RevertOnUnauthorizedExecutor`.

Optional local simulations:

```bash
cast call "$REGISTRY" 'checkSubscriptionCompliance(address,address)(uint256)' "$RECIPIENT" "$UNKNOWN" --from "$EXECUTOR" --rpc-url "$RPC"
cast call "$REGISTRY" 'checkSubscriptionCompliance(address,address)(uint256)' "$RECIPIENT" "$ASSET" --from "$UNKNOWN" --rpc-url "$RPC"
```

`msg.sender` means the immediate caller: the account supplied by `--from` here, or a calling contract in an integration. `subscriber` is only an argument and is not checked. Supplying an authorized address as subscriber cannot authorize an unauthorized caller.

A Solidity `require` aborts the call when its condition fails. These failures do **not** return `false` or a policy version. The asset check comes first; if both checks fail, its error takes priority.

By contrast, `verifyAssetCompliance(unknown)` and `verifyExecutorStatus(unauthorized)` return `false` while unpaused. Those boolean reads do not themselves reject a subscription; the caller must enforce their result. When paused, both verification functions and the combined check revert with `EnforcedPause()`.

## Existing Forge proof commands

Run from the repository root:

```bash
forge test --match-path test/GravitasSubscriptionIntegration.t.sol --match-test '^test_CheckSubscriptionCompliance_RevertOnNonCompliantAsset' -vv
forge test --match-path test/GravitasSubscriptionIntegration.t.sol --match-test '^test_CheckSubscriptionCompliance_RevertOnUnauthorizedExecutor' -vv
forge test --match-path test/GravitasSubscriptionIntegration.t.sol --match-test '^test_Verify(AssetCompliance|ExecutorStatus)' -vv
```

## Sources and limits

Sources: `contracts/GravitasPolicyRegistry.sol`, `checkSubscriptionCompliance`, `verifyAssetCompliance`, `verifyExecutorStatus`; `test/GravitasSubscriptionIntegration.t.sol`, the named tests; `docs/KNOWN-ISSUES.md`, “One compiler warning” (unused subscriber).

The named tests passed in the full review run. These are read-only checks, not token transfers or completed subscriptions. The tests use dummy addresses, not a deployed subscription manager. Subscriber eligibility is unimplemented; dual-failure ordering is established by code, not a dedicated test. Registry flags are owner-set policy, not external approval.
