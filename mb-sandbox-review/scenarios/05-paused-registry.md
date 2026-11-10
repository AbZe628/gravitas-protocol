# Scenario 05 — Paused registry or unavailable node

When the registry is paused, the manager and direct transfers through the gated token revert. The live API returns `DENY / REGISTRY_PAUSED`. If the JSON-RPC node stops while the HTTP API remains up, `/health` still returns 200 but `/v1/verify` returns HTTP 503 and `DENY / REGISTRY_UNAVAILABLE` after its two-second timeout and one retry. The consumer client does not reuse an earlier ALLOW. A completely unreachable HTTP API is tested separately: its client returns `UNAVAILABLE` and does not invoke the transfer callback.

Run the contract scenario:

```bash
bash mb-sandbox-review/scripts/run-scenario-5.sh
```

The full verifier also pauses the real local registry and checks the API, stops local Anvil while the HTTP server remains available, checks health and the 503 response, restores saved local state and checks a fresh ALLOW. API-client tests separately simulate connection refusal, timeout/retry limits, malformed responses and recovery with a fresh valid response. The client tests use a callback spy and do not submit transactions.

The design trade-off is deliberate: while paused, holders cannot transfer, mint or burn through the gated token. An issuer must choose and test its pause policy. Options include a full freeze or a separately governed emergency exit with narrow, pre-defined conditions. This package chooses the full freeze; it does not implement an emergency path.
