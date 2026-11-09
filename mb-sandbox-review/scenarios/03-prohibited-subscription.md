# Scenario 03 — Unapproved asset or executor

An unapproved token is refused by the manager with the registry's exact asset-compliance revert. A manager that is not registered as an executor is refused with the exact caller-authorization revert. Both failures leave balances unchanged.

Run the checks:

```bash
bash mb-sandbox-review/scripts/run-scenario-3.sh
```

The registry checks its caller, which is the manager contract in this call. The subscriber address is not checked for identity or eligibility. An asset decision is not approval of an investor or instrument.
