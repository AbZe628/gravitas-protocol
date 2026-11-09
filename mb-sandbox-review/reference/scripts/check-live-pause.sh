#!/usr/bin/env bash
# REFERENCE IMPLEMENTATION CHECK, UNAUDITED, FOR EVALUATION, NOT FOR PRODUCTION.
set -euo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd)"
DEPLOY="$ROOT/mb-sandbox-review/reference/deployments/local.json"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
API_URL="${API_URL:-http://127.0.0.1:8787}"
API_KEY="${MB_API_KEY:-local-reference-key-only}"
MNEMONIC="${ANVIL_MNEMONIC:-test test test test test test test test test test test junk}"
OWNER_KEY="$(cast wallet private-key --mnemonic "$MNEMONIC" --mnemonic-index 0)"
REGISTRY="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["registry"])' "$DEPLOY")"
TOKEN="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["gatedToken"])' "$DEPLOY")"
PAUSED=0
restore() { if [[ "$PAUSED" == 1 ]]; then cast send "$REGISTRY" 'unpause()' --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" >/dev/null 2>&1 || true; fi; }
trap restore EXIT
cast send "$REGISTRY" 'pause()' --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" >/dev/null
PAUSED=1
STATUS="$(curl -sS --max-time 8 -o /tmp/reference-paused-api.json -w '%{http_code}' -X POST "$API_URL/v1/verify" -H "X-API-Key: $API_KEY" -H 'Content-Type: application/json' -d "{\"asset\":\"$TOKEN\",\"amount\":\"1\",\"context\":{\"channel\":\"pause-check\",\"requestId\":\"registry-paused\"}}")"
python3 - "$STATUS" <<'PY'
import json,sys
x=json.load(open('/tmp/reference-paused-api.json'))
assert sys.argv[1]=='200' and x['decision']=='DENY' and x['reasonCode']=='REGISTRY_PAUSED', (sys.argv[1],x)
print('PASS actual paused registry: API DENY REGISTRY_PAUSED')
PY
cast send "$REGISTRY" 'unpause()' --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" >/dev/null
PAUSED=0
STATUS="$(curl -sS --max-time 8 -o /tmp/reference-unpaused-api.json -w '%{http_code}' -X POST "$API_URL/v1/verify" -H "X-API-Key: $API_KEY" -H 'Content-Type: application/json' -d "{\"asset\":\"$TOKEN\",\"amount\":\"1\",\"context\":{\"channel\":\"pause-check\",\"requestId\":\"registry-unpaused\"}}")"
python3 - "$STATUS" <<'PY'
import json,sys
x=json.load(open('/tmp/reference-unpaused-api.json'))
assert sys.argv[1]=='200' and x['decision']=='ALLOW' and x['reasonCode']=='ASSET_APPROVED', (sys.argv[1],x)
print('PASS unpaused registry: live API returns ALLOW again')
PY
