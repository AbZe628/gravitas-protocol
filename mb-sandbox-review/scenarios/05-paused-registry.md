# 05 — Paused registry and unavailable HTTP service

On a fresh version-3 local chain, the guarded registry checks fail while paused; direct GUSD transfer still succeeds because the token never calls the registry. The HTTP mock is a separate file-driven service. Its production outage policy is not implemented. Run the local probes and existing tests from the repository root:

```bash
python3 mb-sandbox-review/scripts/check-local.py
forge test --match-path test/foundry/PausableTests.t.sol --match-contract '^PausableTests' --match-test '^test_Registry_' -vv
```

Expected: six local `PASS` lines; the helper tests all five guarded calls, raw getters, direct transfer and restores the snapshot. Foundry selects six existing pause tests, including `test_Registry_VerifyFunctionsRevertWhenPaused` and `test_Registry_PauseHaltsExecutorAuthorizationSystemWide`.

With the mock stopped, this request should fail at the transport layer:

```bash
curl --max-time 2 \
  http://127.0.0.1:8787/v1/policies
```

The error is not an `ALLOW` decision and does not prove production transfer handling. Timeout, retries and stale-decision rules remain to be specified and tested.
