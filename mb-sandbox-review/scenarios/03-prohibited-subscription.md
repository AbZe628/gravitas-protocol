# Scenario 03 — Unapproved asset or executor

An unapproved token is refused by the manager with the registry's exact asset-compliance revert. A manager contract not registered as an executor is refused with the exact caller-authorization revert. Both failures leave balances, allowances and request-id state unchanged. A third party cannot use the holder's manager allowance because the holder must be the transaction caller.

Run the checks:

```bash
bash mb-sandbox-review/scripts/run-scenario-3.sh
```

The registry checks its caller, which is the manager contract in this call. The manager's holder-caller check establishes only that the transaction sender equals the `from` address; it is not KYC, identity proof beyond that wallet address, or investor eligibility. The registry accepts the subscriber address but does not inspect it. An asset decision is not approval of an investor or instrument.
