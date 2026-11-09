# 05 — Paused registry and unavailable service

## Setup

Use the fresh local baseline in [sandbox-access.md](../sandbox-access.md): `$RPC` is `http://127.0.0.1:8545`; `$REGISTRY`, `$ASSET`, `$OWNER`, `$EXECUTOR`, `$RECIPIENT` and `$UNKNOWN` are dummy local values. Version is 3: constructor executor grant, asset whitelist entry, then executor whitelist entry. A whitelist is an explicit allowed-address list.

A **revert** rejects a contract call and rolls back its changes. **Fail closed** means failure does not grant permission. A **raw getter** reads stored data without enforcing permission.

## Steps and expected result

From the repository root, run these optional local probes individually; the five paused checks are expected to fail, so do not stop at the first error:

```bash
source /tmp/mb-sandbox-env.sh
read_registry() {
  cast call "$REGISTRY" "$@" --from "$EXECUTOR" --rpc-url "$RPC"
}
read_registry 'checkSubscriptionCompliance(address,address)(uint256)' "$RECIPIENT" "$ASSET"
SNAP=$(cast rpc evm_snapshot --rpc-url "$RPC" | tr -d '"')
cast send "$REGISTRY" 'pause()' --from "$OWNER" --unlocked --rpc-url "$RPC"
read_registry 'paused()(bool)'
read_registry 'verifyAssetCompliance(address)(bool)' "$ASSET"
read_registry 'areTokensCompliant(address,address)(bool)' "$ASSET" "$ASSET"
read_registry 'verifyRouterAuthorization(address)(bool)' "$UNKNOWN"
read_registry 'verifyExecutorStatus(address)(bool)' "$EXECUTOR"
read_registry 'checkSubscriptionCompliance(address,address)(uint256)' "$RECIPIENT" "$ASSET"
read_registry 'isAssetCompliant(address)(bool)' "$ASSET"
read_registry 'isRouterAuthorized(address)(bool)' "$UNKNOWN"
read_registry 'isExecutor(address)(bool)' "$EXECUTOR"
read_registry 'currentVersion()(uint256)'
read_registry 'getPolicyVersion()(uint256)'
cast send "$REGISTRY" 'unpause()' --from "$OWNER" --unlocked --rpc-url "$RPC"
read_registry 'checkSubscriptionCompliance(address,address)(uint256)' "$RECIPIENT" "$ASSET"
cast rpc evm_revert "$SNAP" --rpc-url "$RPC"
```

Before pause and after unpause, the subscription check returns `3`. While paused, `paused()` returns `true`; all five enforcement checks revert with `EnforcedPause()`, not `false`. Raw mapping reads return `true`, `false`, `true`; both version reads return `3`. Pause/unpause do not change policy version. Restore the snapshot even if a probe surprises you.

With the optional mock HTTP server stopped, run:

```bash
curl --max-time 2 http://127.0.0.1:8787/v1/policies
```

Expect a connection error, not an `ALLOW` decision. This is only a transport probe.

## Existing Forge proof

```bash
forge test --match-path test/foundry/PausableTests.t.sol --match-contract '^PausableTests' --match-test '^test_Registry_' -vv
```

This selects existing functions `test_Registry_PauseUnpause`, `test_Registry_OnlyOwnerCanPause`, `test_Registry_VerifyFunctionsRevertWhenPaused`, `test_Registry_PauseHaltsExecutorAuthorizationSystemWide`, `test_Registry_UnpauseRestoresVerification` and `test_Registry_OwnerNotLockedOutOfAuthGateByRegistryPause`.

## Sources and limits

`contracts/GravitasPolicyRegistry.sol`: `pause`, `unpause`, five guarded checks, public mappings and `getPolicyVersion`. `contracts/TeleportV3.sol`: `onlyAuthorized` rejects non-owner executors through the paused registry; the owner bypasses that authorization check, but not the later asset check. `contracts/TeleportV2.sol`: `onlyAuthorized` and `migrateLiquidityV2` have guarded executor/asset paths, though its router read is raw. See `integration-kit/PROTOCOL-TESTING.md`, sections 4–5.

These Forge tests do not assert paused raw-read/version behavior; the probes cover that gap. Raw reads enforce nothing. `integration-kit/mock-server/server.js` reads a fixture, not the registry; `integration-kit/sdk-examples/verify-client.ts::run` exits on errors. No production HTTP outage handling or transfer executor is provided. Timeouts, retries and refusal to use stale permission need implementation and tests. The named tests passed in the full review run; scripts/check-local.py additionally ran the core local probes.
