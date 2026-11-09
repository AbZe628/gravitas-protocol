# Scenario 05 — Paused registry or unavailable node

When the registry is paused, the manager and direct transfers through the gated token revert. The live API returns `DENY / REGISTRY_PAUSED`. A node outage returns HTTP 503 and `DENY / REGISTRY_UNAVAILABLE` after its two-second timeout and one retry. It does not reuse an earlier ALLOW.

Run the contract scenario:

```bash
bash mb-sandbox-review/scripts/run-scenario-5.sh
```

The full verifier also pauses the real local registry and checks the API, stops local Anvil, checks the 503 response, restores the saved chain state and checks a fresh ALLOW.

The design trade-off is deliberate: while paused, holders cannot transfer, mint or burn through the gated token. An issuer must choose and test its pause policy. Options include a full freeze or a separately governed emergency exit with narrow, pre-defined conditions. This package chooses the full freeze; it does not implement an emergency path.
