# Gravitas Protocol — MVP (Liquidity Teleport & Fee Harvesting)

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

---

## License

MIT © 2025 Gravitas Protocol
