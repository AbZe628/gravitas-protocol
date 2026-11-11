# Evidence index

**Audit base:** `692022e1ca34a280f90a198d2455ac3535b3bce2`.  
**Read-only snapshot block:** `328255709` (Arbitrum Sepolia, chain ID `421614`), observed through PublicNode; no transaction was sent. Archived JSON: `evidence/cbar/arbitrum-sepolia-snapshot-2026-11-11.json`. Snapshot details are also rendered dynamically by the reviewer app at one pinned block per refresh.

| Claim | Evidence | Status / limit |
|---|---|---|
| CBAR branch is based directly on stable `origin/main` commit | `git rev-parse origin/main`, branch inventory | Verified at branch creation: `692022e1ca34a280f90a198d2455ac3535b3bce2`. |
| Root Solidity suite passes | `forge fmt --check`, `forge build --sizes`, `forge test -vv`; output stored under `evidence/cbar/` | 86 tests; rerun after the additional rollback assertions is pending until final test capture. |
| Late V3 refund failure restores selected state | `test/foundry/TeleportV3FullFlow.t.sol::test_V3_DustRefundRevertsWhenTheTokenReturnsFalse` | Targeted run passed after adding assertions for nonce, source NFT owner/liquidity and user balances. Local mock EVM only. |
| Majlis typecheck, tests and build | `apps/majlis` commands and saved output in evidence | 56 test files / 488 tests on the audited base; not a governance-to-Registry transaction test. |
| Majlis-to-Registry write path exists | Search of governance routes/services for write calls; `services/carrying.ts` read-only classification | Not implemented. |
| Registry and engines have deployed runtime code | `eth_getCode` at block 328255709; Arbiscan source/ABI pages | Verified code presence at that block; exact bytecode equivalence to base commit not established. |
| Registry owner and pending handover | `owner()`, `pendingOwner()` at block 328255709 | Owner is the observed EOA `0xFba6…11B73`; pending owner zero. |
| Registry current policy state | `paused()`, `currentVersion()`, `policyHistory(1)` at block 328255709 | Read as `false`, `1`, and `0x687a974ff8f6ad74a4ba4355e5502668cde3e41cb279579d7100251f6a54f43c`. |
| Teleport bindings and pause | `registry()`, `positionManager()`, `swapRouter()`, `paused()` getters | V2/V3 Registry binding equals documented Registry; V3 paused false. |
| Timelock relationship | `getMinDelay()`, `PROPOSER_ROLE()`, `EXECUTOR_ROLE()`, `hasRole()` at block 328255709 | 300s; observed owner is proposer; zero address has executor role; Registry/engines are not Timelock-owned. |
| CBAR cycle and eligibility | CBAR third-cycle announcement, portal, Resolution 06/4 and e-Qanun text | Third cycle closed 25 Aug 2026; official pages reviewed show no current open cycle. Gravitas has no Azerbaijani legal entity. |
| Public read endpoint | Arbitrum chain info and PublicNode Arbitrum Sepolia page | Official endpoint returned HTTP 403 in sandbox; PublicNode used as third-party read provider; second-provider check still recommended. |

## Reproduction references

- Root tests: `forge fmt --check && forge build --sizes && forge test -vv`.
- Focused rollback: `forge test --match-test test_V3_DustRefundRevertsWhenTheTokenReturnsFalse -vvv`.
- Majlis: `cd apps/majlis && npm ci && npm run typecheck && npm test && npm run build`.
- Reviewer API: `cd apps/cbar-sandbox && npm test && npm start`.
- Chain ID: Arbitrum Sepolia is `421614` (`0x66eee`) per <https://docs.arbitrum.io/chain-info>.
- RPC: <https://arbitrum.publicnode.com/?sepolia>.
- CBAR source register: [`research-sources.md`](research-sources.md).

Evidence directory: `evidence/cbar/`. Any future records must state command, commit, date, environment, actual result and whether a chain transaction was sent.
