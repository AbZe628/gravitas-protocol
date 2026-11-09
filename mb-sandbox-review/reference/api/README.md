# Registry-backed reference API

**Reference implementation, unaudited, for evaluation, not for production.** The service uses Node 22 built-ins only. `npm ci` is still supported through the committed lockfile; `npm audit` checks this package.

The API reads the registry with JSON-RPC `eth_call`. Every decision uses a block number fetched at the start of the request; the pause flag, asset check, version and hash are read at that same block. The existing `verifyAssetCompliance` call reverts while paused, so the service reads `paused()` at the pinned block and returns `DENY / REGISTRY_PAUSED` without attempting that reverting call. An unapproved asset returns `DENY / ASSET_NOT_APPROVED`. A live approved-asset read returns `ALLOW / ASSET_APPROVED`.

The current registry does not evaluate investor identity, amount, parties, or instrument terms. `amount`, `channel`, and `requestId` are validated and logged; only the live asset flag and pause state determine the decision. Request identifiers are caller-supplied correlation strings, not authentication, uniqueness, or idempotency controls.

The default listener is `127.0.0.1:8787`. Required environment: `RPC_URL`, `REGISTRY_ADDRESS`, `MB_API_KEY`. Optional: `API_HOST`, `API_PORT`, and `AUDIT_LOG_PATH`. All routes require `X-API-Key`, including `/health`. The JSON body limit is 8192 bytes. Unknown paths return 404. RPC calls have a two-second timeout and one retry. After both attempts fail, `/v1/verify` returns HTTP 503 with `decision: DENY` and `reasonCode: REGISTRY_UNAVAILABLE`; `/v1/policy` returns 503. The service never caches ALLOW. JSON-line records include request correlation, decision, policy version/hash and block number; unavailable reads use null for the values that could not be read.

Run tests with `npm ci && npm test`; inspect dependency advisories with `npm audit`. The reference API OpenAPI contract is `openapi.yaml`. The earlier file-driven mock is a separate fixture service, documented by `../api-spec/openapi.yaml`; it does not read this registry or enforce a transfer.
