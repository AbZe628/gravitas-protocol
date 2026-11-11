# Gravitas CBAR Reviewer Sandbox

A local, interactive reviewer interface for the Gravitas Protocol repository. It is not a CBAR service, regulatory application, wallet, transaction signer, security audit, or claim of institutional endorsement.

## Prerequisites

- Node.js 22 or later.
- Foundry on `PATH` to run the two fixed local EVM scenarios in the interface.
- Network access to the PublicNode Arbitrum Sepolia JSON-RPC endpoint for live reads. If it is unavailable, the interface reports the upstream RPC as unavailable and does not silently substitute a cached “live” result.

## Run the interface

```sh
cd apps/cbar-sandbox
npm test
npm start
```

Open `http://127.0.0.1:8789`. The server binds to loopback by default; changing `HOST` can expose it to other machines, so keep the loopback setting for this local review. There are no API keys, `.env` values, wallets or private keys. The network proxy allows only `eth_call`, `eth_getCode`, `eth_chainId` and `eth_blockNumber` against fixed contract destinations/selectors; it rejects arbitrary RPC methods, targets and write requests. The one JSON `POST /api/local-test/run` route accepts only T26 or T27, requires a loopback client and same-origin request, and runs hard-coded `forge test` argument arrays with `shell:false`, a 90-second timeout and a minimal environment that does not pass inherited credentials. The route cannot accept a shell command or deploy to a network. Do not expose this local reviewer process as a public service without a separate security review.

## Test commands

The local reviewer API tests are `npm test`; they cover address/ABI utilities, method denial, same-origin and test-ID restrictions, public-document allow-list and malformed input. The UI's **T26** button runs the full V3 no-swap/swap success tests; **T27** runs the late refund failure and state comparison test. Both run against local Foundry fixtures only and return the actual command/output. No transaction hash applies.

Repository baselines can be reproduced from the repository root with `forge fmt --check`, `forge build --sizes`, and `forge test -vv`. Majlis checks run from `apps/majlis` with `npm ci`, `npm run typecheck`, `npm test`, and `npm run build`. Opening the UI does not run those suites.

## Inspecting live results and failures

Use **Refresh live reads** to query chain ID and block number, then read runtime-code presence and a fixed set of contract getters at that same reported block tag. The individual Registry flag lookup obtains its own block number and executes at that block. Links open corresponding Arbiscan address pages. Snapshot reads are point-in-time and use PublicNode, a third-party provider; independently repeat through another provider before institutional reliance.

The UI distinguishes **RPC UNAVAILABLE** (the local API returned an upstream RPC error) from **API / SERVICE UNAVAILABLE** (the local API/browser request could not be completed). A Registry flag value of `false` is a successfully read negative flag and is distinct from either outage. The local health endpoint reports only process readiness. Asset/router/executor flags are not KYC, sanctions screening, accreditation, investor eligibility or lawful access.

## Documentation and diagrams

The document route serves an explicit allow-list of public CBAR Markdown files from `docs/cbar/`. The static UI includes ten reviewed PNG diagrams from `public/diagrams/`. Other repository files, including `CBAR_REMAINING_WORK.md`, are not exposed through the document route.

## Reset

Stop the Node process and restart it. The application persists no state. Any displayed network read should be independently checked through another RPC provider before institutional reliance.
