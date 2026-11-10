# Scenario 01 — Dummy sukuk transfer

The local deployment creates a dummy GUSD token, a dummy gated sukuk token and a manager. The registry owner approves the gated token and registers the manager as an executor. The token is bound to that manager at construction; the manager binds the token once. The holder approves the manager and must initiate its own transfer. Scenario 01 checks the registry gate, the token's `Transfer` event and the manager's `TransferChecked` event in the same transaction.

Run the focused checks from the repository root:

```bash
bash mb-sandbox-review/scripts/run-scenario-1.sh
```

The reference test checks holder/recipient balances and the event's policy version and `policyHistory(version)` hash. Separate tests prove direct `transfer`, delegated `transferFrom`, and a third party attempting to redirect the holder's allowance all revert without changing balances or allowance. Plain GUSD has no transfer hook; `GatedDemoSukuk._update` enforces the registry state and fixed-manager check for every post-construction transfer.

This is a local dummy transfer, not a subscription or a claim about a real sukuk.
