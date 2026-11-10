# Local sandbox access

**Reference implementation, unaudited, for evaluation, not for production.** For the Compose route, the image supplies Node 22, Foundry 1.9.0 and verification utilities. The build needs network access to fetch the pinned tools and initialized source dependency.

From the repository root, start everything with:

```bash
docker compose -f mb-sandbox-review/docker-compose.yml up --build
```

The container starts a private chain, deploys the demo contracts, approves the dummy token, registers the manager, runs tests and seven scenario runners, and starts the API. It prints the registry, GUSD, gated-token and manager addresses, the local policy version, the API URL and development-only key. The default key is `local-reference-key-only`. It is public test data, not a secret; do not reuse it.

The API listens on port 8787. Anvil's JSON-RPC listens on port 8545. Both published ports bind to the local machine only. The default Anvil mnemonic is public test data, used only inside this disposable sandbox. Do not send real assets or put real credentials in it.

In a second terminal, run the full verification and return its pass/fail status:

```bash
docker compose -f mb-sandbox-review/docker-compose.yml exec sandbox bash /workspace/mb-sandbox-review/reference/scripts/verify-all.sh
```

To stop the sandbox, press `Ctrl-C` in the first terminal. Or run `docker compose -f mb-sandbox-review/docker-compose.yml down`.

## Docker-free native run

This route is for Linux with Git, Bash, Node 22 (including npm), Foundry 1.9.0 (`forge`, `cast`, `anvil`), Python 3 with `venv`, and `curl`. The OpenAPI check downloads two pinned Python packages. Run from a fresh checkout of this release:

```bash
git clone --recurse-submodules --branch mb-review-v3 https://github.com/AbZe628/gravitas-protocol.git
cd gravitas-protocol
git submodule update --init --recursive
[ -e lib/forge-std ] || ln -s openzeppelin-contracts/lib/forge-std lib/forge-std
python3 -m venv .venv-review
source .venv-review/bin/activate
pip install openapi-spec-validator==0.7.2 pycryptodome==3.23.0
export ANVIL_HOST=127.0.0.1 API_HOST=127.0.0.1
bash mb-sandbox-review/reference/scripts/start-sandbox.sh
```

The recursive submodule step is required: `forge-std` is nested in OpenZeppelin. The symlink provides the root Foundry configuration's expected `lib/forge-std` path; the separate reference project already maps to the nested source. Binding both services to `127.0.0.1` keeps the native RPC and API local-only. The startup script builds, deploys and runs the tests, API checks and seven scenarios, then keeps Anvil and the API running.

In a second terminal from the checkout, use:

```bash
source .venv-review/bin/activate
export ANVIL_HOST=127.0.0.1
bash mb-sandbox-review/reference/scripts/verify-all.sh
```

This full native check also stops the local node, verifies the API returns 503, restores the saved local state and checks recovery. Stop the native sandbox with `Ctrl-C` in the startup terminal. Native testing does not verify the container image. The complete Docker build and container run passed in [GitHub Actions](https://github.com/AbZe628/gravitas-protocol/actions/runs/42697229864).

## Test the API

The start command prints ready-to-copy `curl` examples. For a policy read, use:

```bash
curl -H 'X-API-Key: local-reference-key-only' http://127.0.0.1:8787/v1/policy
```

A request for the registered local token returns ALLOW only after a live registry read. An unregistered address returns DENY. A stopped chain produces HTTP 503 and `REGISTRY_UNAVAILABLE`; restarting the same local chain allows the service to recover. A paused registry returns `REGISTRY_PAUSED`.

## Scenario runners

Run one short check from the repository root while either sandbox is up:

```bash
bash mb-sandbox-review/scripts/run-scenario-1.sh
```

Use `run-scenario-2.sh` through `run-scenario-7.sh` for the other cases. Scenario 07 writes a fresh `reference-audit-record.json` from a real local manager transaction and validates the transaction events and registry hash chain.

## Optional cloud development container

The repository includes a `.devcontainer` configuration using the same local tool image. It requires the reviewer's own account with a cloud development environment and an explicit start of the sandbox. Ports are configured private. This is optional; the Docker Compose route does not need that account.

The older file-driven mock in `integration-kit/mock-server/` remains unchanged. It reads a policy file and does not query the registry. Its API specification is `mb-sandbox-review/api-spec/openapi.yaml`; the registry-backed reference API has its own specification at `mb-sandbox-review/reference/api/openapi.yaml`.
