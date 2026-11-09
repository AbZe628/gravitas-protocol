# Scenario 04 — Rule change

The owner revokes the token, advancing the policy version. The next manager call is refused. The previous version's hash remains unchanged; the new hash is recomputed from the previous hash, the `asset` field, token address and `false`. Re-approval advances the version again rather than rolling back history.

Run the registry and reference checks:

```bash
bash mb-sandbox-review/scripts/run-scenario-4.sh
```

The transfer event reports the version and hash returned by the registry for the same transaction. These values are a policy-history reference, not proof of a legal ruling or an instrument's status.
