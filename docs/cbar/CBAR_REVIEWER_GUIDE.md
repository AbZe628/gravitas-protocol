# CBAR reviewer guide

This guide is for an independent reviewer using the `cbar-azerbaijan-sandbox` branch. It describes reproducible local steps; it is not an instruction to submit testnet transactions.

## Prerequisites and checkout

Use Node.js 22+, Foundry (Solidity 0.8.24 through `foundry.toml`), Git and network access if you want live read-only Arbitrum Sepolia state. Clone with submodules because OpenZeppelin and `forge-std` dependencies are submodules:

```sh
git clone --branch cbar-azerbaijan-sandbox --recurse-submodules https://github.com/AbZe628/gravitas-protocol.git
git submodule update --init --recursive
```

If Foundry was installed through `foundryup`, ensure its binary directory is in the environment used to start the interface:

```sh
export PATH="$HOME/.foundry/bin:$PATH"
forge --version
```

If the branch is only local, substitute its local path. Do not use production private keys. No environment variables are required for the reviewer app. The service uses a fixed public read-only RPC URL.

## Run the reviewer interface

```sh
cd apps/cbar-sandbox
npm test
npm start
```

Open `http://127.0.0.1:8789`. The server binds to loopback by default; keep it there for the review and do not expose it on a shared network. The network proxy uses only fixed, allow-listed JSON-RPC reads (`eth_chainId`, `eth_blockNumber`, `eth_getCode`, `eth_call`). The separate local test endpoint requires a loopback client and same-origin request, accepts only T26/T27, runs hard-coded Foundry tests with a minimal environment and cannot accept arbitrary commands or submit network transactions. `npm test` exercises address validation, ABI encoding/decoding, method denial and local-runner guards. A green local API health response means only that the local Node handler is responsive, not that the external RPC is healthy.

## Run the Solidity suite

At repository root:

```sh
forge fmt --check
forge build --sizes
forge test -vv
forge test --match-test test_V3_DustRefundRevertsWhenTheTokenReturnsFalse -vvv
```

The focused late-failure test asserts that a failed SafeERC20 refund leaves the tested source NFT owner, source liquidity, user's token balances and nonce at their initial values. It is a local mock-based EVM test, not a live transaction. Test names and case mapping are in `CBAR_TEST_PLAN.md`.

## Run Majlis tests

```sh
cd apps/majlis
npm ci
npm run typecheck
npm test
npm run build
```

Seeded governance data is demo fixture data. The application does not submit Registry transactions.

## Run the Majlis application UI (optional)

For an interactive look at the separate Stage Two application workflow, start it in another terminal:

```sh
cd apps/majlis
npm ci
npm run dev
```

The development client defaults to `http://127.0.0.1:5173` and the API to port 4000. To exercise member-only writes, create a disposable demo member using the prompt-based command in `apps/majlis/.env.example`; put only the generated hash in a local, git-ignored `.env` as `MAJLIS_MEMBERS=demo-signatory:signatory:scrypt$…`. Never use a real board member's credential, real institution data or production secrets. The development server is not a production security boundary; do not expose it publicly. Seed board/matter/vote records are illustrative. Stage Two application voting and lifecycle records do not create an Ethereum signature or write the Policy Registry.

## Environments and state inspection

- **Mock mode:** local fixture/demo data; every such record is `SIMULATED`.
- **Local EVM:** actual local Foundry transactions with mocks; use test logs and assertions.
- **Arbitrum Sepolia:** the reviewer UI queries a fixed block snapshot from PublicNode and shows block number, runtime code length, selected getters and role membership. Use Arbiscan links and repeat independently. The observed API does not send a transaction.
- **Testnet writes:** disabled. Do not connect a production wallet or expose a private key. No testnet write is needed for this review.

For local CLI read examples, set `ARB_SEPOLIA_RPC_URL` only to a public read provider and use `cast call` against the fixed addresses. Verify chain ID first (`eth_chainId` should be `0x66eee` / decimal 421614). The app's `policyHistory(1)` read is bytes32; compare it with the explorer and a second provider before relying on it.

## Reset and troubleshooting

Stop the Node process and restart to reset the interface; it stores no data. If snapshot fails, the UI reports **RPC unavailable** and does not show an old snapshot as live. The RPC provider is independent from the local API: if `GET /api/health` succeeds but `/api/snapshot` fails, the local service is up and the upstream RPC call failed. If the local app itself cannot be reached, the local API/server is unavailable. A Registry policy flag returning `false` is distinct from either outage.

If Foundry cannot resolve imports, check `git submodule status` and run `git submodule update --init --recursive`. If node tests fail, confirm Node 22+ and run `npm test` from `apps/cbar-sandbox`. If a test is labelled `NOT EXECUTED`, do not infer success from a related test; see the exact evidence note in `CBAR_TEST_PLAN.md`.

## Evidence preservation

Capture the command, commit SHA, environment, result summary and output file under `evidence/cbar/`. Do not use a screenshot as the only proof of an EVM operation. Record transaction hashes only for actual chain transactions; no such live write has been performed in this package.
