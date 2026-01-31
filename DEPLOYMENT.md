# Gravitas Protocol - Testnet Deployment Guide

**Network**: Arbitrum Sepolia  
**Status**: Ready for Deployment  
**Estimated Gas**: ~3,000,000 gas units

---

## Prerequisites

Before deploying, ensure you have the following:

| Requirement | Description |
|-------------|-------------|
| **Foundry** | Install via `curl -L https://foundry.paradigm.xyz \| bash` |
| **Node.js 20+** | Required for contract dependencies |
| **ETH (Sepolia)** | Testnet ETH for gas fees |
| **Arbiscan API Key** | For contract verification |

---

## Environment Configuration

### Step 1: Create `.env` File

Create a `.env` file in the root directory with the following variables:

```bash
# Arbitrum Sepolia RPC URL
RPC_URL=https://sepolia-rollup.arbitrum.io/rpc

# Deployer Private Key (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# Arbiscan API Key for verification
ETHERSCAN_API_KEY=your_arbiscan_api_key

# Optional: Uniswap V3 addresses (defaults provided in script)
POSITION_MANAGER=0xC36442b4a4522E871399CD717aBDD847Ab11FE88
SWAP_ROUTER=0xE592427A0AEce92De3Edee1F18E0157C05861564
```

### Step 2: Secure Your Keys

**IMPORTANT**: Never commit your `.env` file to version control.

```bash
# Ensure .env is in .gitignore
echo ".env" >> .gitignore
```

---

## Deployment Methods

### Method 1: One-Click Deployment (Recommended)

```bash
# Make script executable
chmod +x deploy_testnet.sh

# Run deployment
./deploy_testnet.sh
```

The script will:
1. Validate environment variables
2. Build contracts with Foundry
3. Deploy to Arbitrum Sepolia
4. Verify contracts on Arbiscan

### Method 2: Manual Deployment

```bash
# Build contracts
forge build

# Deploy with verification
forge script script/DeployDeterministic.s.sol:DeployDeterministic \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast \
    --verify \
    --etherscan-api-key $ETHERSCAN_API_KEY
```

---

## Deployed Contracts

After deployment, you will have the following contracts:

| Contract | Description |
|----------|-------------|
| **GravitasPolicyRegistry** | Risk & Compliance Oracle for Shariah governance |
| **TeleportV3** | Deterministic Liquidity Routing Engine |

---

## Post-Deployment Configuration

### Step 1: Whitelist Compliant Assets

Call `setAssetCompliance()` on the Policy Registry to whitelist Shariah-compliant tokens:

```solidity
// Example: Whitelist USDC and WETH
registry.setAssetCompliance(USDC_ADDRESS, true);
registry.setAssetCompliance(WETH_ADDRESS, true);
```

### Step 2: Authorize Routers

Call `setRouterAuthorization()` to authorize trusted DEX routers:

```solidity
// Example: Authorize Uniswap V3 Router
registry.setRouterAuthorization(UNISWAP_ROUTER, true);
```

### Step 3: Add Executors

Call `setExecutorStatus()` to authorize institutional executors:

```solidity
// Example: Authorize a keeper address
registry.setExecutorStatus(KEEPER_ADDRESS, true);
```

---

## Shariah Compliance Verification

After deployment, verify the compliance configuration on Arbiscan:

### Step 1: Navigate to Contract

Go to the `GravitasPolicyRegistry` contract on [Arbiscan Sepolia](https://sepolia.arbiscan.io/).

### Step 2: Read Contract Functions

Use the "Read Contract" tab to verify:

| Function | Expected Result |
|----------|-----------------|
| `isAssetCompliant(tokenAddress)` | `true` for whitelisted assets |
| `isRouterAuthorized(routerAddress)` | `true` for authorized routers |
| `isExecutor(executorAddress)` | `true` for authorized executors |
| `areTokensCompliant(tokenA, tokenB)` | `true` if both tokens are compliant |

### Step 3: Verify Compliance Flow

Test the full compliance flow:

1. **Check Token Pair**: Call `areTokensCompliant(USDC, WETH)` - should return `true`
2. **Check Router**: Call `isRouterAuthorized(UNISWAP_ROUTER)` - should return `true`
3. **Check Executor**: Call `isExecutor(YOUR_ADDRESS)` - should return `true`

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| **"Stack too deep"** | Ensure `foundry.toml` has `via_ir = true` |
| **Verification failed** | Wait 30 seconds and retry with `forge verify-contract` |
| **Insufficient gas** | Increase gas limit or get more testnet ETH |
| **RPC errors** | Try alternative RPC: `https://arb-sepolia.g.alchemy.com/v2/YOUR_KEY` |

### Manual Verification

If automatic verification fails:

```bash
forge verify-contract \
    --chain-id 421614 \
    --num-of-optimizations 200 \
    --watch \
    --compiler-version v0.8.24 \
    --constructor-args $(cast abi-encode "constructor(address,address,address)" $POSITION_MANAGER $SWAP_ROUTER $REGISTRY_ADDRESS) \
    $CONTRACT_ADDRESS \
    contracts/TeleportV3.sol:TeleportV3 \
    --etherscan-api-key $ETHERSCAN_API_KEY
```

---

## Network Information

### Arbitrum Sepolia

| Parameter | Value |
|-----------|-------|
| **Chain ID** | 421614 |
| **RPC URL** | https://sepolia-rollup.arbitrum.io/rpc |
| **Block Explorer** | https://sepolia.arbiscan.io |
| **Faucet** | https://faucet.quicknode.com/arbitrum/sepolia |

### Uniswap V3 Addresses (Arbitrum Sepolia)

| Contract | Address |
|----------|---------|
| **NonfungiblePositionManager** | `0xC36442b4a4522E871399CD717aBDD847Ab11FE88` |
| **SwapRouter** | `0xE592427A0AEce92De3Edee1F18E0157C05861564` |
| **Factory** | `0x1F98431c8aD98523631AE4a59f267346ea31F984` |

---

## Security Checklist

Before announcing deployment:

- [ ] Verify all contracts on Arbiscan
- [ ] Test `setAssetCompliance()` with test tokens
- [ ] Test `setRouterAuthorization()` with Uniswap router
- [ ] Test `setExecutorStatus()` with keeper address
- [ ] Perform test migration with small amounts
- [ ] Verify dust refund mechanism works correctly

---

## Support

For deployment assistance:
- **GitHub Issues**: [gravitas-protocol/issues](https://github.com/AbZe628/gravitas-protocol/issues)
- **Email**: contact@gravitas.finance
