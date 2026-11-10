#!/usr/bin/env bash
# REFERENCE IMPLEMENTATION, UNAUDITED, FOR EVALUATION, NOT FOR PRODUCTION.
set -euo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd)"
REF="$ROOT/mb-sandbox-review/reference"
API="$REF/api"
STATE_PATH="${ANVIL_STATE_PATH:-/tmp/reference-anvil-state.json}"
PID_FILE="/tmp/reference-anvil.pid"
ANVIL_LOG="/tmp/reference-anvil.log"
API_LOG="/tmp/reference-api.log"
MNEMONIC="${ANVIL_MNEMONIC:-test test test test test test test test test test test junk}"
ANVIL_HOST="${ANVIL_HOST:-0.0.0.0}"
ANVIL_PORT="${ANVIL_PORT:-8545}"
API_KEY="${MB_API_KEY:-local-reference-key-only}"
export PATH="/usr/local/bin:$PATH"
export ANVIL_MNEMONIC="$MNEMONIC" MB_API_KEY="$API_KEY"
export RPC_URL="${RPC_URL:-http://127.0.0.1:${ANVIL_PORT}}" API_HOST="${API_HOST:-0.0.0.0}" API_PORT="${API_PORT:-8787}"
export API_URL="${API_URL:-http://127.0.0.1:${API_PORT}}"
export AUDIT_LOG_PATH="${AUDIT_LOG_PATH:-/tmp/reference-api-audit.jsonl}"

cleanup() {
  set +e
  if [[ -n "${API_PID:-}" ]] && kill -0 "$API_PID" 2>/dev/null; then kill -TERM "$API_PID"; fi
  if [[ -f "$PID_FILE" ]]; then
    pid="$(cat "$PID_FILE")"
    if kill -0 "$pid" 2>/dev/null; then kill -INT "$pid"; fi
  fi
}
trap cleanup EXIT
trap 'exit 0' INT TERM

start_anvil() {
  if [[ -s "$STATE_PATH" ]]; then
    anvil --host "$ANVIL_HOST" --port "$ANVIL_PORT" --chain-id 31337 --mnemonic "$MNEMONIC" --state "$STATE_PATH" >"$ANVIL_LOG" 2>&1 &
  else
    anvil --host "$ANVIL_HOST" --port "$ANVIL_PORT" --chain-id 31337 --mnemonic "$MNEMONIC" --dump-state "$STATE_PATH" >"$ANVIL_LOG" 2>&1 &
  fi
  echo $! > "$PID_FILE"
  for _ in $(seq 1 60); do
    if cast chain-id --rpc-url "$RPC_URL" >/dev/null 2>&1; then return 0; fi
    sleep 0.25
  done
  echo 'Anvil did not become ready; detailed output is in /tmp/reference-anvil.log' >&2
  return 1
}

mkdir -p "$REF/deployments"
start_anvil
export ANVIL_PRIVATE_KEY="$(cast wallet private-key --mnemonic "$MNEMONIC" --mnemonic-index 0)"
export DEMO_HOLDER="$(cast wallet address --private-key "$(cast wallet private-key --mnemonic "$MNEMONIC" --mnemonic-index 1)")"

printf 'Starting local build and deployment checks...\n'
(cd "$ROOT" && forge build)
(cd "$REF" && forge build)
(cd "$REF" && forge script script/DeployReference.s.sol:DeployReference --rpc-url "$RPC_URL" --broadcast --private-key "$ANVIL_PRIVATE_KEY")

export REGISTRY_ADDRESS="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["registry"])' "$REF/deployments/local.json")"
export GATED_TOKEN_ADDRESS="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["gatedToken"])' "$REF/deployments/local.json")"
node "$API/server.mjs" >"$API_LOG" 2>&1 &
API_PID=$!
for _ in $(seq 1 60); do
  if curl -fsS -H "X-API-Key: $API_KEY" "http://127.0.0.1:${API_PORT}/health" >/dev/null 2>&1; then break; fi
  sleep 0.25
done
curl -fsS -H "X-API-Key: $API_KEY" "http://127.0.0.1:${API_PORT}/health" >/dev/null

printf '\nRunning the existing test suite and API checks...\n'
(cd "$ROOT" && forge test --summary)
(cd "$REF" && forge test --summary)
(cd "$API" && npm ci --ignore-scripts --no-audit --no-fund && npm test)
python3 "$REF/scripts/verify-openapi.py"
(cd "$API" && npm audit --audit-level=high)

printf '\nRunning scenario runners 1–7...\n'
for n in 1 2 3 4 5 6 7; do bash "$ROOT/mb-sandbox-review/scripts/run-scenario-${n}.sh"; done
python3 "$REF/scripts/test-audit-verifier.py"
python3 "$REF/scripts/check-live-api.py"
bash "$REF/scripts/check-live-pause.sh"

REGISTRY="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["registry"])' "$REF/deployments/local.json")"
GUSD="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["gusd"])' "$REF/deployments/local.json")"
TOKEN="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["gatedToken"])' "$REF/deployments/local.json")"
MANAGER="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["manager"])' "$REF/deployments/local.json")"
VERSION="$(cast call "$REGISTRY" 'getPolicyVersion()(uint256)' --rpc-url "$RPC_URL" | awk '{print $1}')"

cat <<SUMMARY

REFERENCE SANDBOX READY — local dummy data only
Source: ${REVIEW_SOURCE_COMMIT:-local checkout}
Chain ID: 31337 (private Anvil)
Policy version: ${VERSION}
Registry: ${REGISTRY}
Plain GUSD: ${GUSD}
Gated demo token: ${TOKEN}
Transfer manager: ${MANAGER}
API: http://127.0.0.1:${API_PORT}
Development-only API key: ${API_KEY}

Try the API:
curl -H 'X-API-Key: ${API_KEY}' http://127.0.0.1:${API_PORT}/v1/policy
curl -X POST http://127.0.0.1:${API_PORT}/v1/verify \\
  -H 'X-API-Key: ${API_KEY}' -H 'Content-Type: application/json' \\
  -d '{"asset":"${TOKEN}","amount":"1.00","context":{"channel":"local-review","requestId":"try-001"}}'

Full verification in Docker (second terminal):
docker compose -f mb-sandbox-review/docker-compose.yml exec sandbox bash /workspace/mb-sandbox-review/reference/scripts/verify-all.sh

Native full verification (second terminal, from repository root):
ANVIL_HOST=127.0.0.1 bash mb-sandbox-review/reference/scripts/verify-all.sh

This local example is unaudited, for evaluation only, and not for production.
The well-known Anvil test mnemonic and development API key are not secrets; never reuse them elsewhere.
SUMMARY
wait "$API_PID"
