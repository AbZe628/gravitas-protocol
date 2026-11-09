# Sandbox access

Use a local sandbox for the six scenarios. It needs no API key, testnet money or approved real asset. Anvil is a private test blockchain. Forge compiles and tests contracts. Cast calls them. All accounts below are public test accounts. Never use them with real funds.

## 1. Install and clone

Use Bash on Linux, macOS or Windows Subsystem for Linux (WSL). Install Git, Python 3 and Node.js 22 with npm. Install Foundry if it is missing:

```bash
curl -L https://foundry.paradigm.xyz | bash
export PATH="$HOME/.foundry/bin:$PATH"
foundryup --install 1.9.0
forge --version
cast --version
anvil --version
```

Expected: version `1.9.0`. The official installer chooses your platform's binaries. This review used Linux ARM64, Foundry 1.9.0 and Node.js 22.23.4. See the [official installation guide](https://www.getfoundry.sh/introduction/installation).

```bash
git clone --branch mb-sandbox-review --recurse-submodules \
  https://github.com/AbZe628/gravitas-protocol.git
cd gravitas-protocol
git branch --show-current
git submodule update --init --recursive
forge build
forge test
```

Expected branch: `mb-sandbox-review`. Tests must report zero failures; see [verification.md](verification.md) for the observed count. The build can print an unused `subscriber` warning and Foundry lint warnings. They are not evidence of a clean audit. The dependency is pinned by the repository's submodule and `foundry.lock`. Do not replace it with a newer version.

## 2. Start a fresh local chain

In terminal 1:

```bash
anvil --host 127.0.0.1 --port 8545 --chain-id 31337 \
  --mnemonic 'test test test test test test test test test test test junk'
```

Expected: funded test accounts and `Listening on 127.0.0.1:8545`. Keep it running. Do not expose the port to a network. In terminal 2, from the repository root:

```bash
bash mb-sandbox-review/scripts/setup-local.sh
source /tmp/mb-sandbox-env.sh
cast call "$REGISTRY" 'currentVersion()(uint256)' --rpc-url "$RPC"
```

Expected: registry and dummy asset addresses, an environment-file path, then `3`. The helper uses existing `GravitasPolicyRegistry` and `MockERC20`. It changes no Solidity files. The token's actual name is `Gravitas USD` and symbol is `GUSD`; it is only a stand-in for the simulated sukuk. The owner starts with 1,000,000 units, each with 18 decimal places.

Dummy accounts: `OWNER` is Anvil account 0, `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`; `EXECUTOR` is account 1, `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`; `RECIPIENT` is account 2, `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`. `UNKNOWN` is `0x0000000000000000000000000000000000000999`. No private keys are needed: only the local Anvil accounts are unlocked.

Version 1 records the owner's initial executor grant. Approving the dummy asset creates version 2. Granting the second executor creates version 3. The helper refuses any other chain or a non-fresh owner account; it does not reset your chain.

## 3. Run the six probes

```bash
source /tmp/mb-sandbox-env.sh
python3 mb-sandbox-review/scripts/check-local.py
```

Expected: six `PASS` lines, evidence in `/tmp/mb-sandbox-run`, and `Restored local version-3 baseline.` The helper checks both registry outcomes and actual direct-token bypasses. It takes a local snapshot and restores it even on failure. Its audit file is an external composition, not a contract event. Scenarios also give the existing Foundry tests that prove the underlying behaviour.

For individual `cast` commands, keep `$RPC` set and use `--from "$EXECUTOR"` for the subscription check. This sets the simulated caller (`msg.sender`), not the subscriber. Run mutating scenarios on a snapshot:

```bash
SNAP=$(cast rpc evm_snapshot --rpc-url "$RPC" | tr -d '"')
# Run one scenario's commands here.
cast rpc evm_revert "$SNAP" --rpc-url "$RPC"
```

## 4. Optional mock HTTP API

This is a separate, file-driven mock. It does not read the local or testnet registry. Its asset-symbol and category rules are not Solidity registry rules. Use only dummy requests. No API key is checked. The original server listens without a host restriction; the following wrapper binds it to loopback without editing it:

```bash
npm ci --prefix integration-kit/mock-server
node -e 'const h=require("http");const l=h.Server.prototype.listen;h.Server.prototype.listen=function(p,...a){return l.call(this,p,"127.0.0.1",...a)};require("./integration-kit/mock-server/server.js")'
```

Expected: `Gravitas mock sandbox listening on http://localhost:8787`. In another terminal:

```bash
curl http://127.0.0.1:8787/v1/policies
curl -sS -X POST http://127.0.0.1:8787/v1/verify \
  -H 'Content-Type: application/json' \
  -d '{"asset":{"address":"0x0000000000000000000000000000000000000999","symbol":"DUMMY-SUKUK"},"amount":"100.00","context":{"channel":"local-review","requestId":"DUMMY-001"}}'
```

Expected: the first returns the policy fixture; the second returns `DENY` and `DEFAULT-DENY`. Requests append to `integration-kit/mock-server/audit.log.jsonl`. That log does not include a registry version or transaction hash. A missing API or a timeout is **not** an ALLOW result. The mock has no transfer executor or outage fallback. A real integrating application must implement that refusal itself.

The locked mock dependencies had three reported vulnerabilities in this review, including one critical. Keep this mock local; do not deploy it publicly. No dependency fixes were made.

## 5. Optional testnet reads

`docs/DEPLOYMENTS.md` documents the registry at `0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23` on Arbitrum Sepolia, chain 421614. This is not a dummy address. Do not send dummy-account transactions there. The local scenarios are verified against the reviewed source, not assumed to match a deployed contract.

```bash
TESTNET_RPC=https://sepolia-rollup.arbitrum.io/rpc
TESTNET_REGISTRY=0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23
cast code "$TESTNET_REGISTRY" --rpc-url "$TESTNET_RPC"
cast call "$TESTNET_REGISTRY" 'getPolicyVersion()(uint256)' \
  --rpc-url "$TESTNET_RPC"
cast call "$TESTNET_REGISTRY" 'paused()(bool)' --rpc-url "$TESTNET_RPC"
```

Non-empty bytecode shows that code exists, not that it matches this source. See [verification.md](verification.md) for the actual remote-read outcome. No public write-access credentials are supplied by the repo.

## TODO FOR ABDUSAMED

- **T1 — Reviewer access:** supply an approved review computer with the tools above, or arrange an engineer to run the local commands for the compliance reviewers.
- **T2 — Hosted access:** if remote HTTP access is required, supply and independently test the endpoint, authentication method and credentials. The repo does not prove a working hosted registry-backed API.
- **T3 — Testnet identity and writes:** if a shared testnet exercise is required, provide a working RPC, source/bytecode match for the chosen deployment, funded non-public test wallets and an authorised owner/operator. Do not use Anvil keys there.
- **T4 — Enforced transfer integration:** supply or build the actual dummy sukuk token/manager. Enforce the registry inside every transfer route, including delegated transfers and other balance-changing routes. The repo does not contain this integration.
- **T5 — Outage handling:** implement and test fail-closed behaviour in the actual HTTP client/transfer executor. Decide timeouts, retries and whether stale decisions may ever be used. Do not treat a service error as permission.
- **T6 — Versioned execution audit:** implement an execution record that binds the transfer and the returned registry version in the same transaction. Map that version to the approved governance decision and retain the chain log. No such per-transfer record exists here.
- **T7 — Mock hardening:** before any hosted reuse, review the reported dependency vulnerabilities, add authentication and validate identifiers and amounts. Do not use symbol-only matching as an approval control.

T2–T7 are not required to run the local review. They are unresolved requirements for the corresponding remote or enforced-transfer claims.
