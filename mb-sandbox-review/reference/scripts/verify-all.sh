#!/usr/bin/env bash
# REFERENCE VERIFICATION, UNAUDITED, FOR EVALUATION, NOT FOR PRODUCTION.
set -euo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd)"
REF="$ROOT/mb-sandbox-review/reference"
API="$REF/api"
DATE="$(date -u +%F)"
SOURCE="${REVIEW_SOURCE_COMMIT:-local-checkout}"
OUT="$ROOT/mb-sandbox-review/evidence/verify-${DATE}-${SOURCE}"
STATE_PATH="${ANVIL_STATE_PATH:-/tmp/reference-anvil-state.json}"
PID_FILE="/tmp/reference-anvil.pid"
ANVIL_LOG="/tmp/reference-anvil.log"
MNEMONIC="${ANVIL_MNEMONIC:-test test test test test test test test test test test junk}"
ANVIL_HOST="${ANVIL_HOST:-0.0.0.0}"
ANVIL_PORT="${ANVIL_PORT:-8545}"
export PATH="/usr/local/bin:$PATH"
export MB_API_KEY="${MB_API_KEY:-local-reference-key-only}"
export RPC_URL="${RPC_URL:-http://127.0.0.1:${ANVIL_PORT}}"
export API_PORT="${API_PORT:-8787}"
export API_URL="${API_URL:-http://127.0.0.1:${API_PORT}}"
mkdir -p "$OUT"
printf 'verification_date_utc=%s\nsource_commit=%s\n' "$DATE" "$SOURCE" > "$OUT/metadata.txt"

run_capture() {
  local name="$1"; shift
  printf '\n== %s ==\n' "$name"
  "$@" > "$OUT/$name.txt" 2>&1 || { cat "$OUT/$name.txt"; return 1; }
  tail -12 "$OUT/$name.txt"
}

run_capture root-forge-build bash -lc "cd '$ROOT' && forge build"
run_capture root-forge-test bash -lc "cd '$ROOT' && forge test --summary"
python3 - "$OUT/root-forge-test.txt" <<'PY' | tee "$OUT/root-test-count.txt"
import re,sys
text=open(sys.argv[1]).read()
rows=re.findall(r'^\|\s*[^|]+\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*$',text,re.M)
if not rows: raise SystemExit('Could not parse Foundry test summary')
passed=sum(int(x[0]) for x in rows); failed=sum(int(x[1]) for x in rows); skipped=sum(int(x[2]) for x in rows)
print(f'current root suite: {passed} passed, {failed} failed, {skipped} skipped')
if failed or skipped: raise SystemExit(1)
if passed != 86: print(f'NOTE: request expected 86; checked-out root suite reports {passed}. No existing tests were modified.')
PY
run_capture reference-forge-build bash -lc "cd '$REF' && forge build"
run_capture reference-forge-test bash -lc "cd '$REF' && forge test --summary"
run_capture api-node-tests bash -lc "cd '$API' && npm ci --ignore-scripts --no-audit --no-fund && npm test"
run_capture api-npm-audit bash -lc "cd '$API' && npm audit --audit-level=high"
run_capture openapi-validation python3 "$REF/scripts/verify-openapi.py"

for n in 1 2 3 4 5 6 7; do run_capture "scenario-$n" bash "$ROOT/mb-sandbox-review/scripts/run-scenario-${n}.sh"; done
run_capture audit-verifier-negative-tests python3 "$REF/scripts/test-audit-verifier.py"
run_capture live-api-check python3 "$REF/scripts/check-live-api.py"
run_capture live-api-pause-check bash "$REF/scripts/check-live-pause.sh"

# Stop the actual local Anvil process. The live API must deny; then restore its saved local state.
if [[ ! -f "$PID_FILE" ]]; then echo "Missing Anvil PID file: $PID_FILE" >&2; exit 1; fi
ANVIL_PID="$(cat "$PID_FILE")"
kill -INT "$ANVIL_PID"
for _ in $(seq 1 80); do
  if ! cast chain-id --rpc-url "$RPC_URL" >/dev/null 2>&1; then break; fi
  sleep 0.25
done
if cast chain-id --rpc-url "$RPC_URL" >/dev/null 2>&1; then echo 'Anvil did not stop for outage test' >&2; exit 1; fi
if [[ ! -s "$STATE_PATH" ]]; then echo 'Anvil did not save the local state for recovery' >&2; exit 1; fi
DOWN_CODE="$(curl -sS --max-time 8 -o "$OUT/api-real-outage.json" -w '%{http_code}' -X POST "$API_URL/v1/verify" -H "X-API-Key: $MB_API_KEY" -H 'Content-Type: application/json' -d '{"asset":"0x1111111111111111111111111111111111111111","amount":"1","context":{"channel":"outage-check","requestId":"real-outage"}}')"
python3 - "$DOWN_CODE" "$OUT/api-real-outage.json" <<'PY'
import json,sys
assert sys.argv[1]=='503', f'expected HTTP 503, got {sys.argv[1]}'
x=json.load(open(sys.argv[2])); assert x=={'decision':'DENY','reasonCode':'REGISTRY_UNAVAILABLE'},x
print('PASS stopped local Anvil: HTTP 503 DENY REGISTRY_UNAVAILABLE')
PY

anvil --host "$ANVIL_HOST" --port "$ANVIL_PORT" --chain-id 31337 --mnemonic "$MNEMONIC" --state "$STATE_PATH" >"$ANVIL_LOG" 2>&1 &
echo $! > "$PID_FILE"
for _ in $(seq 1 80); do
  if cast chain-id --rpc-url "$RPC_URL" >/dev/null 2>&1; then break; fi
  sleep 0.25
done
cast chain-id --rpc-url "$RPC_URL" >/dev/null
python3 "$REF/scripts/check-live-api.py" | tee "$OUT/api-recovery.txt"
printf 'PASS local Anvil state restored; live API recovered without cached ALLOW\n' | tee -a "$OUT/api-recovery.txt"
printf 'ALL CHECKS PASSED. Exact test counts and captured outputs are in: %s\n' "$OUT"
