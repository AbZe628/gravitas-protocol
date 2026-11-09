# Sandbox access

Use a private local Anvil chain. The test accounts and GUSD have no real value. Do not use the sample mnemonic or unlocked accounts on a public network.

## Install and build

Use Bash on Linux, macOS or WSL. Install Git, Python 3, Node.js 22 with npm, and Foundry 1.9.0. Check `forge --version`, `cast --version` and `anvil --version`. Foundry installation instructions: [getfoundry.sh/introduction/installation](https://www.getfoundry.sh/introduction/installation).

Clone the review branch and run the project tests:

```bash
git clone --branch mb-sandbox-review --recurse-submodules \
  https://github.com/AbZe628/gravitas-protocol.git
cd gravitas-protocol
git submodule update --init --recursive
forge build
forge test
```

Expected: Foundry 1.9.0, successful build, 86 tests passed. Existing compiler and lint warnings may appear. See `evidence/` for captured outputs and run details.

## Start a fresh chain

Terminal 1:

```bash
anvil --host 127.0.0.1 --port 8545 --chain-id 31337 \
  --mnemonic 'test test test test test test test test test test test junk'
```

Keep Anvil on loopback. In terminal 2, from the repository root:

```bash
bash mb-sandbox-review/scripts/setup-local.sh
source /tmp/mb-sandbox-env.sh
cast call "$REGISTRY" 'currentVersion()(uint256)' --rpc-url "$RPC"
python3 mb-sandbox-review/scripts/check-local.py
```

Expected: fresh registry and dummy token addresses, policy version `3`, six `PASS` lines, then `Restored local version-3 baseline.` The helper deploys the repository's existing registry and `MockERC20`. It refuses a non-fresh chain.

The token is Gravitas USD (GUSD), with 18 decimals and one million initial units. It is not a sukuk. Anvil account 0 is `OWNER`, account 1 is `EXECUTOR`, account 2 is `RECIPIENT`; `UNKNOWN` is `0x0000000000000000000000000000000000000999`. The helper grants the initial executor at version 1, approves GUSD at version 2 and grants the second executor at version 3.

## Run an individual scenario

Each scenario lists its own `forge test` proof command. Local cast commands use the environment above. For manual changes, use a snapshot and restore it when finished:

```bash
SNAP=$(cast rpc evm_snapshot --rpc-url "$RPC" | tr -d '"')
# Run one scenario's commands.
cast rpc evm_revert "$SNAP" --rpc-url "$RPC"
```

A test failure expected by a scenario is an expected rejection, not a passing permission decision. Run its test command to confirm the repository assertion.

## Optional file-driven HTTP mock

The mock is separate from the registry. It reads a local JSON policy file, has no real authentication and does not execute a transfer. Keep it on loopback:

```bash
npm ci --prefix integration-kit/mock-server
node -e 'const h=require("http");const l=h.Server.prototype.listen;h.Server.prototype.listen=function(p,...a){return l.call(this,p,"127.0.0.1",...a)};require("./integration-kit/mock-server/server.js")'
```

In another terminal:

```bash
curl http://127.0.0.1:8787/v1/policies
curl -sS -X POST http://127.0.0.1:8787/v1/verify \
  -H 'Content-Type: application/json' \
  -d '{"asset":{"address":"0x0000000000000000000000000000000000000999","symbol":"DUMMY-SUKUK"},"amount":"100.00","context":{"channel":"local-review","requestId":"DUMMY-001"}}'
```

The first returns the fixture. The second returns `DENY` with `DEFAULT-DENY`. The mock appends to `integration-kit/mock-server/audit.log.jsonl`; its entry contains no registry version or transfer hash. The locked dependencies produced three npm audit findings in this review. Do not expose this mock publicly.

## Optional read-only testnet check

`docs/DEPLOYMENTS.md` lists the registry at `0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23` on Arbitrum Sepolia. A dated read and code comparison are in `evidence/bytecode-comparison.json` and `verification.md`. Read-only commands:

```bash
TESTNET_RPC=https://sepolia-rollup.arbitrum.io/rpc
TESTNET_REGISTRY=0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23
cast code "$TESTNET_REGISTRY" --rpc-url "$TESTNET_RPC"
cast call "$TESTNET_REGISTRY" 'getPolicyVersion()(uint256)' --rpc-url "$TESTNET_RPC"
cast call "$TESTNET_REGISTRY" 'paused()(bool)' --rpc-url "$TESTNET_RPC"
```

Do not send writes to this address. A read-only query does not confirm current asset policy for future runs; check the live results first.
