# 03 — Prohibited asset or caller

The fresh integration fixture approves one dummy asset and one executor. The combined check rejects an unapproved asset and rejects a request from an unapproved caller. Run from the repository root:

```bash
forge test --match-path test/GravitasSubscriptionIntegration.t.sol --match-test '^test_CheckSubscriptionCompliance_RevertOnNonCompliantAsset' -vv
forge test --match-path test/GravitasSubscriptionIntegration.t.sol --match-test '^test_CheckSubscriptionCompliance_RevertOnUnauthorizedExecutor' -vv
forge test --match-path test/GravitasSubscriptionIntegration.t.sol --match-test '^test_Verify(AssetCompliance|ExecutorStatus)' -vv
```

Expected: first case reverts with `GPR: Asset not Shariah-compliant`; second with `GPR: Calling contract not an authorized executor`. Boolean verify functions return `false` for an unapproved entry while unpaused; they do not themselves stop a transfer. The named test functions in `test/GravitasSubscriptionIntegration.t.sol` prove each result. The subscriber parameter is not checked.
