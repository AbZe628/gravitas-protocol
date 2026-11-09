#!/usr/bin/env bash
# REFERENCE IMPLEMENTATION, UNAUDITED, FOR EVALUATION, NOT FOR PRODUCTION.
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd -- "$SCRIPT_DIR/../../.." && pwd)"
REF="$ROOT/mb-sandbox-review/reference"
DEPLOY="$REF/deployments/local.json"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
OUT="${AUDIT_RECORD_OUT:-$ROOT/mb-sandbox-review/reference-audit-record.json}"
MNEMONIC="${ANVIL_MNEMONIC:-test test test test test test test test test test test junk}"
OWNER_KEY="$(cast wallet private-key --mnemonic "$MNEMONIC" --mnemonic-index 0)"
HOLDER_KEY="$(cast wallet private-key --mnemonic "$MNEMONIC" --mnemonic-index 1)"
RECIPIENT_KEY="$(cast wallet private-key --mnemonic "$MNEMONIC" --mnemonic-index 2)"
HOLDER="$(cast wallet address --private-key "$HOLDER_KEY")"
RECIPIENT="$(cast wallet address --private-key "$RECIPIENT_KEY")"
REGISTRY="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["registry"])' "$DEPLOY")"
TOKEN="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["gatedToken"])' "$DEPLOY")"
MANAGER="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["manager"])' "$DEPLOY")"
AMOUNT="$(cast to-wei 1)"
REQUEST_ID="$(cast keccak "reference-audit-$RANDOM-$RANDOM")"
cast send "$TOKEN" 'approve(address,uint256)' "$MANAGER" "$AMOUNT" --rpc-url "$RPC_URL" --private-key "$HOLDER_KEY" --json >/dev/null
TX_JSON="$(cast send "$MANAGER" 'transferSukuk(bytes32,address,address,address,uint256)' "$REQUEST_ID" "$TOKEN" "$HOLDER" "$RECIPIENT" "$AMOUNT" --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" --json)"
TX_HASH="$(python3 -c 'import json,sys;print(json.load(sys.stdin)["transactionHash"])' <<<"$TX_JSON")"
python3 "$REF/scripts/verify-audit-record.py" \
  --rpc-url "$RPC_URL" --tx-hash "$TX_HASH" --registry "$REGISTRY" \
  --manager "$MANAGER" --token "$TOKEN" --from-address "$HOLDER" \
  --to-address "$RECIPIENT" --request-id "$REQUEST_ID" --amount "$AMOUNT" \
  --output "$OUT"
