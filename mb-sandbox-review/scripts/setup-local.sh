#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$ROOT"
export RPC=http://127.0.0.1:8545
export OWNER=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
export EXECUTOR=0x70997970C51812dc3A010C7d01b50e0d17dc79C8
export RECIPIENT=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
export UNKNOWN=0x0000000000000000000000000000000000000999
command -v forge >/dev/null
command -v cast >/dev/null
command -v python3 >/dev/null
[[ $(cast chain-id --rpc-url "$RPC") == 31337 ]] || { echo 'Refusing: this is not chain 31337.' >&2; exit 1; }
[[ $(cast rpc web3_clientVersion --rpc-url "$RPC") == *anvil* ]] || { echo 'Refusing: this is not Anvil.' >&2; exit 1; }
[[ $(cast nonce "$OWNER" --rpc-url "$RPC") == 0 ]] || { echo 'Start a fresh Anvil process. This helper does not reset chains.' >&2; exit 1; }
WORK=$(mktemp -d /tmp/mb-sandbox-setup.XXXXXX)
forge create contracts/GravitasPolicyRegistry.sol:GravitasPolicyRegistry \
  --broadcast --unlocked --from "$OWNER" --rpc-url "$RPC" --json > "$WORK/registry.json"
export REGISTRY=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["deployedTo"])' "$WORK/registry.json")
forge create contracts/MockERC20.sol:MockERC20 \
  --broadcast --unlocked --from "$OWNER" --rpc-url "$RPC" --json > "$WORK/asset.json"
export ASSET=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["deployedTo"])' "$WORK/asset.json")
cast send "$REGISTRY" 'setAssetCompliance(address,bool)' "$ASSET" true \
  --unlocked --from "$OWNER" --rpc-url "$RPC" --json > "$WORK/asset-approved.json"
cast send "$REGISTRY" 'setExecutorStatus(address,bool)' "$EXECUTOR" true \
  --unlocked --from "$OWNER" --rpc-url "$RPC" --json > "$WORK/executor-approved.json"
ENV_FILE=/tmp/mb-sandbox-env.sh
{
  printf '# Dummy local accounts only. Never use these accounts with real funds.\n'
  for name in RPC OWNER EXECUTOR RECIPIENT UNKNOWN REGISTRY ASSET; do
    printf 'export %s=%q\n' "$name" "${!name}"
  done
} > "$ENV_FILE"
[[ $(cast call "$REGISTRY" 'currentVersion()(uint256)' --rpc-url "$RPC") == 3 ]] || { echo 'Unexpected policy version.' >&2; exit 1; }
printf 'Registry: %s\nDummy asset: %s\nPolicy version: 3\nEnvironment: %s\n' "$REGISTRY" "$ASSET" "$ENV_FILE"
echo 'Run: source /tmp/mb-sandbox-env.sh'
