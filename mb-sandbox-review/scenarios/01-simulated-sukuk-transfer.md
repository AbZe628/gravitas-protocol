# 01 — Simulated tokenised sukuk transfer

This scenario uses plain GUSD as a stand-in; no sukuk token exists here. It answers three questions: the registry permits only an approved asset and executor on its guarded check; `transfer` and `transferFrom` bypass that check in the present token; and a failed guarded registry call blocks a migration, while HTTP outage handling is not implemented. Follow [sandbox-access.md](../sandbox-access.md) to deploy the local chain and set the environment first. It is not a deployment script.

With a fresh version-3 baseline, run the read calls:

```bash
cast call "$REGISTRY" 'checkSubscriptionCompliance(address,address)(uint256)' "$RECIPIENT" "$ASSET" --from "$EXECUTOR" --rpc-url "$RPC"
cast call "$REGISTRY" 'checkSubscriptionCompliance(address,address)(uint256)' "$RECIPIENT" "$UNKNOWN" --from "$EXECUTOR" --rpc-url "$RPC"
cast call "$REGISTRY" 'checkSubscriptionCompliance(address,address)(uint256)' "$RECIPIENT" "$ASSET" --from "$UNKNOWN" --rpc-url "$RPC"
cast call "$REGISTRY" 'checkSubscriptionCompliance(address,address)(uint256)' "$UNKNOWN" "$ASSET" --from "$EXECUTOR" --rpc-url "$RPC"
```

Expected: first call returns `3`; unapproved asset and caller revert; the last call also returns `3` because the subscriber is ignored.

The actual direct and delegated transfer bypasses, paused-registry checks and balances are tested by:

```bash
python3 mb-sandbox-review/scripts/check-local.py
forge test --match-path test/GravitasSubscriptionIntegration.t.sol -vv
forge test --match-test \
  'test_Registry_(VerifyFunctionsRevertWhenPaused|PauseHaltsExecutorAuthorizationSystemWide|OwnerNotLockedOutOfAuthGateByRegistryPause)' -vv
forge test --match-path test/foundry/TeleportFlow.t.sol --match-test '^test_V2_RescueTokens' -vv
```

Expected: the local helper prints six `PASS` lines; it successfully transfers GUSD after revocation and during pause, and restores version 3. The named Foundry commands select existing tests. Guarded migration checks fail closed on pause; the direct token route never checks the registry. HTTP outage behavior for a production transfer client is not specified or tested.
