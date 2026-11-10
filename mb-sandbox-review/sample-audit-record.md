# Audit record examples

Two records are included and they show different things.

[`sample-audit-record.json`](sample-audit-record.json) is the earlier composed example from separate policy and sample operations. It is not a chain receipt and does not prove that a token moved.

[`reference-audit-record.json`](reference-audit-record.json) is regenerated from an actual holder-initiated manager transaction on a private local Anvil chain. It contains transaction, receipt, block, signer, transfer, policy version/hash and event metadata. The dummy token's `Transfer` and manager's `TransferChecked` must share a transaction and block; the verifier fetches them from RPC and does not trust serialized summaries.

The verifier checks the expected chain and minimum confirmation count, transaction calldata and caller, receipt and block hash, paired events, registry state at the receipt block, ordered policy updates and recomputed policy hashes. `reference/scripts/test-audit-verifier.py` then mutates the real record and proxies malformed RPC evidence to confirm rejection. The generator is `reference/scripts/generate-audit-record.sh`; Scenario 07 runs it with `bash mb-sandbox-review/scripts/run-scenario-7.sh`.

This local record proves only that this dummy code emitted those events on that local chain. It does not identify an investor, prove eligibility, establish legal or religious status, or represent a public-chain transfer.
