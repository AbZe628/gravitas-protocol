# 04 — Policy version and change hash

The registry starts at version 1 after granting executor status to its deployer. A real change advances the version and records a hash that includes the previous hash; a duplicate write changes neither. Pause and unpause do not update the policy lists. Run from the repository root:

```bash
forge test --match-contract '^PolicyCommitment' -vv
forge test --match-contract '^GravitasSubscriptionIntegrationTest' --match-test '^test_CheckSubscriptionCompliance_Success' -vv
forge test --match-contract '^PausableTests' --match-test '^test_Registry_PauseUnpause' -vv
```

Expected: all selected tests pass. `test_EachVersionFoldsInTheOneBeforeIt`, `test_RewritingTheSameValueIsNotAPolicyChange` and `test_OrderOfChangesIsPartOfTheCommitment` in `test/foundry/PolicyCommitment.t.sol` check the sequence. `policyHistory` stores change hashes, not the full historical registry state or a board ruling. A replay needs the ordered changes.
