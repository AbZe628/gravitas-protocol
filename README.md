![CI](https://github.com/AbZe628/gravitas-protocol/actions/workflows/ci.yml/badge.svg)

# Gravitas Protocol — MVP (Liquidity Teleport & Fee Harvesting)
**Invisible infrastructure for atomic liquidity migration between decentralized exchanges (DEXs).**

Gravitas Protocol is an automated liquidity migration layer that allows users and DeFi projects to move their LP tokens between DEXs like Uniswap, SushiSwap, Curve, and Balancer — instantly, safely, and with micro-fees that generate passive income for the protocol.

## 🌌 Vision

DeFi liquidity today is fragmented across multiple pools and chains.  
Gravitas solves this by providing a *seamless, invisible bridge* for liquidity migration.

- One-click atomic transfers between DEX pools  
- Micro-fees (5–10 bps) generate continuous protocol revenue  
- Partners can integrate via SDK and share in revenue  

## ⚙️ Architecture

Gravitas Protocol is built around modular smart contracts that enable atomic, safe, and flexible liquidity transfers.

**Core Components:**

- **Teleport.sol** — the main contract that executes atomic liquidity migrations  
- **Treasury.sol** — collects protocol fees and manages multi-sig treasury  
- **Adapters (UniV2Adapter.sol / UniV3Adapter.sol)** — interface with Uniswap and other DEX routers  
- **Libraries (SafeERC20.sol / TokenValidation.sol)** — security and validation helpers  

```
[User Wallet] → [Teleport.sol] → [Adapters] → [DEX Pools] → [Treasury.sol]
```

➡ This flow ensures that every liquidity migration is executed atomically, with protocol-level fee collection and full safety guarantees.


**Status:** MVP | **Scope:** Uniswap V2 liquidity migration (same-chain) via adapter + demo tokens | **Stack:** Solidity 0.8.24, Hardhat, TypeScript, OpenZeppelin

Gravitas Protocol is a lightweight infrastructure layer that *migrates (teleports)* liquidity between AMMs and *harvests residual value* (fees/dust) during migration. This MVP focuses on **Uniswap V2-style pools** on a local Hardhat network to prove the core mechanics end‑to‑end.

---

## What this MVP demonstrates

- **Teleport.sol** orchestrates a safe *remove-liquidity → swap (optional) → add-liquidity* flow between two UniswapV2-compatible routers.
- **UniV2Adapter.sol** wraps UniswapV2 router calls with sane checks.
- **ERC‑20 demo tokens** (**TokenA**, **TokenB**) with 1,000,000 supply each for fast local testing.
- **Typed deploy/seed/migrate scripts** to compile, deploy tokens, set allowances, mint LP, and then **migrate LP** from `routerFrom` to `routerTo` on **localhost**.
- Production‑grade patterns: **Ownable**, **Pausable**, **ReentrancyGuard**, **SafeERC20**.

> Note: The repo currently targets a **local Hardhat chain**. Network entries for public testnets are intentionally disabled in `hardhat.config.ts` to keep the MVP reproducible. You can add them later once keys/infrastructure are ready.

---

## Repository layout

```
contracts/
  Teleport.sol           # Core coordinator for V2 liquidity migration
  UniV2Adapter.sol       # Thin wrapper around UniswapV2 Router02
  TokenA.sol, TokenB.sol # Local demo tokens
  interfaces/            # Minimal UniswapV2 interfaces

scripts/
  deploy.ts              # Deploy tokens, adapter, teleport
  seed.ts                # Example seeding/minting/approvals
  migrate.ts             # End-to-end migration demo
  send-op-tx.ts          # Example optional transaction sender

test/
  Counter.ts             # Placeholder (add protocol tests next)

hardhat.config.ts        # Solidity 0.8.24, optimizer on, local networks
package.json             # NPM scripts for compile/deploy/seed/migrate
```

---

## Quickstart (Windows **CMD**, not PowerShell)

> Replace `C:\path\to\gravitas` with your actual path. If your folder is named `gravitas_old`, the first step renames it to `gravitas`.

```bat
:: 0) Go to project folder (adjust path)
cd /d C:\path	o\gravitas_old
ren gravitas_old gravitas
cd gravitas

:: 1) Initialize git (if needed)
git init
git add .
git commit -m "chore: initial MVP import"

:: 2) Install deps
npm install

:: 3) Compile contracts
npx hardhat compile

:: 4) Start a local chain in a second CMD window
:: Open a new CMD, then run:
cd /d C:\path	o\gravitas
npx hardhat node

:: 5) Back in the first CMD window, deploy + seed + migrate on localhost
npm run compile
npx hardhat run scripts\deploy.ts --network localhost
npx hardhat run scripts\seed.ts   --network localhost
npx hardhat run scripts\migrate.ts --network localhost
```

If everything is wired, you should see logs for deployments, approvals, LP minting, and **LiquidityMigratedV2** event emission from `Teleport.sol`.

---

## Configuration

Create a `.env` file if you later add public networks:
```
# .env (example; not needed for local hardhat)
PRIVATE_KEY=0xabc... # never commit real keys
ALCHEMY_MAINNET=
ALCHEMY_SEPOLIA=
ARB_MAINNET=
BASE_MAINNET=
```

In this MVP, `hardhat.config.ts` includes only:
```ts
networks: { hardhat: { chainId: 31337 }, localhost: { url: "http://127.0.0.1:8545", chainId: 31337 } }
```
Add testnets/mainnets when ready.

---

## How Teleport works (Uniswap V2)

1. **Pull LP** from user or a controller (pre-approved).
2. **Remove liquidity** via `routerFrom.removeLiquidity` → get `amountA`, `amountB`.
3. *(Optional future step)* Net-delta swap to rebalance tokens for target pool.
4. **Add liquidity** on `routerTo.addLiquidity` with min‑amounts enforced.
5. Emit `LiquidityMigratedV2(user, from, to, tokenA, tokenB, amtA, amtB, liquidityMinted)`.

Safety: uses **Pausable**, **ReentrancyGuard**, and resets allowances before setting (`forceApprove`).

---

## Roadmap

- [ ] Add **adapters for Uniswap V3** & **Sushi/TraderJoe** variants
- [ ] Cross‑chain migration via canonical bridges (Phase 2)
- [ ] Fee‑harvesting vault & revenue sharing (protocol fees)
- [ ] Extensive Foundry/Hardhat test suite + property-based fuzzing
- [ ] Audit readiness checklist

---

## Commands cheat‑sheet (Windows CMD)

```bat
:: Clean & compile
rmdir /s /q cache build 2>nul
npx hardhat compile

:: Run a local node
npx hardhat node

:: Deploy/seed/migrate to localhost
npx hardhat run scripts\deploy.ts   --network localhost
npx hardhat run scripts\seed.ts     --network localhost
npx hardhat run scripts\migrate.ts  --network localhost
```

---

## Screens / Evidence to show in meeting

- Terminal logs from steps (deploy, seed, migrate).
- Event `LiquidityMigratedV2(...)` from `Teleport.sol` in the node output.
- Contract addresses printed by scripts on localhost.

> This proves the full pipeline exists: contracts, scripts, and observable on-chain state transitions (even if local).

## 🧩 MVP Status & Roadmap

**Current Progress**

✅ Project structure and contract templates complete  
⚙️ Core logic (Teleport.sol) in active development  
🔒 Security audit scheduled (Code4rena + MythX)  
🧠 SDK and analytics dashboard under construction  

---

**Development Roadmap**

| Phase | Description | Status |
|-------|--------------|--------|
| 1 | Smart Contracts Core (Teleport, Treasury) | ✅ 80% Complete |
| 2 | SDK Development & Infrastructure Setup | 🛠 In Progress |
| 3 | Audit & Testnet Deployment | 🔜 Planned |
| 4 | Mainnet Launch with Partners | ⏳ Q2 2025 Target |

---

**Next Milestones**
- Implement fee routing logic in Teleport.sol  
- Finalize adapter safety wrappers (UniV2 & UniV3)  
- Prepare documentation for Code4rena audit  

---
📘 [Read the full Gravitas Protocol Blueprint](./docs/whitepaper.md)
---

## ⚙️ Scope & Limitations

This MVP represents the core logic of Gravitas Protocol — demonstrating the architecture, adapters, and policy enforcement.

**Scope:**
- Supports Uniswap V2-style pools
- Local Hardhat deployment with demo tokens
- Core migration flow: remove → optional swap → add
- Guardian + Timelock governance simulation

**Limitations:**
- No testnet deployment yet
- No fuzzing or formal audit (WIP)
- SDK integration planned for v0.2
- Not connected to live liquidity oracles



## License

MIT © 2025 Gravitas Protocol
