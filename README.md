🌌 GRAVITAS PROTOCOL: DECENTRALIZED LIQUIDITY TELEPORT

This repository contains the architecture and the **Reviewer-Proof MVP** for the Gravitas Protocol.

Gravitas is a decentralized liquidity infrastructure layer designed to solve DeFi liquidity fragmentation through **atomic, deterministic, on-chain liquidity migration**.

---

# 🚀 ARBITRUM GRANT STATUS: DEPLOYED & VERIFIED

**The primary focus for this grant review is the successful operation of the Liquidity Teleport (MVP).**

The Liquidity Teleport MVP is **deployed and verified on Arbitrum Sepolia** as a production-grade proof of execution. This deployment demonstrates the **safe router-based deposit logic** requested during the review process, replacing unsafe ERC20 transfer patterns and preventing trapped funds.

### 🔗 LIVE MVP DEPLOYMENT (ARBITRUM SEPOLIA)

* **Network:** Arbitrum Sepolia (Chain ID: 421614)
* **Contract:** `Teleport.sol`
* **Address:** `0xA5a5397A141ea0d8f8e8A56c5BF95f66Cecf500B`
* **Arbiscan (Verified – Exact Match):** [View Code on Arbiscan](https://sepolia.arbiscan.io/address/0xA5a5397A141ea0d8f8e8A56c5BF95f66Cecf500B#code)
* **Sourcify Verification:** [View Sourcify Repo](https://repo.sourcify.dev/421614/0xA5a5397A141ea0d8f8e8A56c5BF95f66Cecf500B)

The contract is verified as an **Exact Match**, confirming that the deployed bytecode corresponds 1:1 with the source code in this repository.

---## 🛡️ Security & Architecture Update (v6.0)

We have upgraded the core infrastructure to a **"Reviewer-Proof" Uniswap V3** standard. The new `TeleportV3.sol` contract implements:

- **Atomic V3 Migration:** Handles NFT transfer, liquidity decrease, optional auto-swap (for ratio rebalancing), and re-minting in a single transaction.
- **Strict Delta Tracking:** Uses snapshot-based accounting to ensure only funds from the user's position are used, preventing "dust griefing" attacks.
- **Full Slippage Protection:** User-defined slippage bounds for both the exit (decrease) and entry (mint) steps.
- **Authorized Keeper Model:** Execution is currently gated to whitelisted executors to ensure safe, deterministic pathfinding during the beta phase.
- **Rich Events:** Emits detailed telemetry (`newFee`, `ticks`) for easier off-chain indexing.


## 🛡️ SAFETY & POLICY CONFIGURATION

The Teleport contract is **intentionally policy-gated by default** to ensure deterministic and safe execution.

### 1. Router Allow-Listing (Required)
Teleport blocks all target routers by default. The contract owner must explicitly allow a router before migration can occur:

```solidity
setAllowedRouter(ROUTER_ADDRESS, true)
If omitted, migrations revert with: Teleport: router not allowed. This prevents liquidity from being routed to arbitrary or unsafe addresses.2. Executor Configuration (Optional)By default, only the contract owner can execute migrations. To enable off-chain keepers, SDK-based execution, or multisig-controlled execution, the owner may authorize executors:SoliditysetExecutor(EXECUTOR_ADDRESS, true)
3. Deterministic On-Chain EnforcementEach liquidity migration enforces deterministic, on-chain rules:Slippage bounds: amountAMin, amountBMinExecution deadline: deadlineCooldown: Prevents rapid repeated migrations for the same route.Max move cap: maxMoveBps (basis-point cap per execution).All routing decisions are enforced on-chain and are fully verifiable.🔄 EXECUTION FLOW (DEPLOYED VERSION)The deployed Teleport contract executes the following atomic on-chain flow:Plaintext[LP Holder]
    ↓ (approve LP)
[Teleport.sol]
    ↓ (burn LP on source pair)
[Underlying Tokens]
    ↓ (router.addLiquidity — protocol deposit logic)
[Target Pool]
    ↓
[New LP Tokens → Recipient]
⚠️ Note: Teleport never relies on raw ERC20 transfers as a substitute for protocol deposit logic.🧪 TESTING STRATEGYTwo complementary proofs of correctness are provided:1. Arbitrum Sepolia DeploymentDemonstrates verified on-chain execution, policy-gated safety, and production-style behavior.2. Ethereum Mainnet Forking TestDemonstrates correctness using real Mainnet contracts (WBTC/WETH, Uniswap/Sushiswap).💻 Step-by-Step: Run the Mainnet Fork TestCritical Note: The test uses Ethereum Mainnet Forking via Alchemy RPC.Install Dependencies:Bashnpm install
Setup Environment:Create a .env file in the root directory:Isječak kodaALCHEMY_API_KEY="YOUR_ALCH_API_KEY_HERE"
Execute the Test:Bashnpm run test
This command compiles contracts, forks Ethereum Mainnet, executes the full LP migration scenario, and validates resulting balances.📖 CORE PROTOCOL ARCHITECTUREGravitas Protocol is an infrastructure layer enabling instant, safe, and composable LP mobility across DeFi.⚙️ I. ARCHITECTURE & COMPONENTSComponentStatusDescriptionTeleport.solMVP CompleteCore coordinator. Executes atomic LP burn → router deposit flow.Treasury.solPlanned (Phase 2)Collects protocol fees (5–10 bps) and residual value.AdaptersMVP / PlannedWrappers for external protocols (UniV2 live, V3 planned).LibrariesCompleteSecurity helpers (ReentrancyGuard, SafeERC20).📊 II. MVP STATUSScopeDescriptionStatusCore LogicV2 Liquidity Migration (Router Integrated)✅ CompleteSecurityReentrancyGuard & Policy Gating✅ CompleteTest CoverageMainnet Forking Test✅ CompleteDeploymentVerified on Arbitrum Sepolia✅ Complete⚙️ REPOSITORY LAYOUTPathDescriptioncontracts/Teleport.solCORE MVP. Verified, policy-driven migration contract.scripts/deploy.jsDeployment script.hardhat.config.jsviaIR enabled, Arbitrum Sepolia config.test/teleport.test.jsMainnet Forking Test (Proof of Concept).📝 NOTES FOR REVIEWERSThis MVP demonstrates on-chain execution, not off-chain signaling.Teleport does not custody funds beyond a single atomic transaction.External SDKs or keepers are optional and do not control execution.The design prioritizes safety, determinism, and composability.✅ STATUS SUMMARYTeleport MVP deployed on Arbitrum SepoliaSource code verified (Exact Match)Unsafe ERC20 transfer logic removedDeterministic, policy-driven execution enforcedReady for ecosystem integration and milestone expansionMIT © 2025 Gravitas Protocol
