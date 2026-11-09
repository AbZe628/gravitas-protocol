# Scenario 07 — Gated token and one-transaction record

`GatedDemoSukuk` checks the registry in `_update` for transfers, delegated transfers, mint and burn after construction. The initial constructor mint is exempt because the token cannot be approved before its address exists. The manager checks the executor and token, transfers in the same transaction and emits the policy version and hash. A fuzz test checks that refused routes do not change balances.

Run the reference tests and generate a fresh record from the deployed local contracts:

```bash
bash mb-sandbox-review/scripts/run-scenario-7.sh
```

The included [`reference-audit-record.json`](../reference-audit-record.json) records one actual run: chain 31337; transaction `0xd45c98188300d453bcb1a4f412098e3bc013a350a33dc66e3230fbb74d71283f`; block 11; timestamp `2026-11-09T20:16:54Z`; policy version 3; hash `0x96405a9315fa1a542184d8419512d74374ec2fff1684eaca112f6b36a723033f`. Both token and manager events were in that transaction. The verifier recomputed the registry hash chain through version 3 and compared the hash with the manager event and a registry read at the receipt block.

This local record proves only that this dummy code emitted those events on that local chain. It does not bind an investor identity or establish legal or religious status.
