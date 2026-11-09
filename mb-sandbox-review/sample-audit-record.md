# Audit record examples

Two records are included and they show different things.

[`sample-audit-record.json`](sample-audit-record.json) is the earlier composed example from separate policy and sample operations. It is not a chain receipt and does not prove that a token moved.

[`reference-audit-record.json`](reference-audit-record.json) was generated from an actual manager transaction on a private local Anvil chain. It contains the transaction hash, block, timestamp, transfer, policy version and policy hash. In that one transaction, the dummy token emitted its `Transfer` event and the manager emitted `TransferChecked` with the same request ID, token, transfer amount, version and hash.

The verifier decoded both events, confirmed they came from the same transaction and block, queried the registry at that block, replayed the ordered registry changes, and recomputed each policy hash. The script is `reference/scripts/verify-audit-record.py`; scenario 07 generates a fresh record with `bash mb-sandbox-review/scripts/run-scenario-7.sh`.

This local record proves only that this dummy code emitted those events on that local chain. It does not identify an investor, prove eligibility, establish legal or religious status, or represent a public-chain transfer.
