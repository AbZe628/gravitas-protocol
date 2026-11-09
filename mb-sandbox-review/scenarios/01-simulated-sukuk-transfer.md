# Scenario 01 — Dummy sukuk transfer

The local deployment creates a dummy GUSD token, a dummy gated sukuk token and a manager. The registry owner approves the gated token and registers the manager as an executor. Scenario 01 checks that the manager reads the registry, calls `transferFrom` and emits `TransferChecked` in the same transaction.

Run the focused checks from the repository root:

```bash
bash mb-sandbox-review/scripts/run-scenario-1.sh
```

The reference test checks the recipient balance and the event's policy version and `policyHistory(version)` hash. A later test shows why the extra token matters: plain GUSD has no transfer hook, while `GatedDemoSukuk._update` checks approval for every post-construction balance change.

This is a local dummy transfer, not a subscription or a claim about a real sukuk.
