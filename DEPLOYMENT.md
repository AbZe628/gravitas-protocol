# Gravitas Protocol - Testnet Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Gravitas Protocol core contracts to **Arbitrum Sepolia testnet**. The deployment process is designed for institutional-grade execution with deterministic addressing and Shariah compliance verification.

---

## Prerequisites

Before deploying, ensure you have the following:

1. **Foundry Installed**: The deployment uses Foundry (forge) for smart contract compilation and deployment.
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Arbitrum Sepolia Testnet Access**: You need an RPC endpoint for Arbitrum Sepolia.
   - Public RPC: `https://sepolia-rollup.arbitrum.io/rpc`
   - Or use a provider like Alchemy or Infura

3. **Funded Wallet**: Your deployer wallet must have Arbitrum Sepolia ETH for gas fees.
   - Get testnet ETH from [Arbitrum Sepolia Faucet](https://faucet.quicknode.com/arbitrum/sepolia)

4. **Arbiscan API Key** (Optional but Recommended): For automatic contract verification.
   - Get your API key from [Arbiscan](https://arbiscan.io/myapikey)

---

## Environment Configuration

### Step 1: Create `.env` File

In the root directory of the repository, create a `.env` file with the following variables:

```bash
# Arbitrum Sepolia RPC URL
RPC_URL=https://sepolia-rollup.arbitrum.io/rpc

# Your deployer wallet private key (DO NOT COMMIT THIS)
PRIVATE_KEY=0xYourPrivateKeyHere

# Arbiscan API key for contract verification
ETHERSCAN_API_KEY=YourArbiscanApiKeyHere
```

**Security Warning**: Never commit your `.env` file to version control. The `.gitignore` file already excludes it.

### Step 2: Verify Environment Variables

Ensure all required variables are set correctly:

```bash
source .env
echo "RPC_URL: $RPC_URL"
echo "PRIVATE_KEY: [HIDDEN]"
echo "ETHERSCAN_API_KEY: $ETHERSCAN_API_KEY"
```

---

## Deployment Process

### Option 1: One-Click Deployment (Recommended)

The repository includes a shell script for automated deployment:

```bash
./deploy_testnet.sh
```

This script will:
1. Validate your environment variables
2. Compile the smart contracts
3. Deploy `GravitasPolicyRegistry` and `TeleportV3` to Arbitrum Sepolia
4. Verify the contracts on Arbiscan (if API key is provided)
5. Display deployment addresses and next steps

### Option 2: Manual Deployment with Foundry

If you prefer manual control, use the following command:

```bash
forge script script/DeployDeterministic.s.sol:DeployDeterministic \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

**Without Verification**:
```bash
forge script script/DeployDeterministic.s.sol:DeployDeterministic \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

---

## Post-Deployment Verification

### Step 1: Locate Deployment Addresses

After deployment, the contract addresses will be displayed in the terminal output. You can also find them in:

```
broadcast/DeployDeterministic.s.sol/<chain-id>/run-latest.json
```

### Step 2: Verify on Arbiscan

Visit [Arbitrum Sepolia Arbiscan](https://sepolia.arbiscan.io/) and search for your deployed contract addresses.

**Key Contracts**:
- **GravitasPolicyRegistry**: The Shariah compliance registry
- **TeleportV3**: The core liquidity migration engine

### Step 3: Verify Shariah Compliance

To verify that the protocol is enforcing Shariah compliance, check the following on Arbiscan:

#### Check Asset Compliance Status

Navigate to the **GravitasPolicyRegistry** contract on Arbiscan and use the **Read Contract** tab:

1. **Function**: `isAssetCompliant(address asset)`
   - Input: The token address you want to check
   - Output: `true` if the asset is Shariah-compliant, `false` otherwise

2. **Function**: `areTokensCompliant(address tokenA, address tokenB)`
   - Input: Two token addresses
   - Output: `true` if both tokens are compliant

#### Check Router Authorization

1. **Function**: `isRouterAuthorized(address router)`
   - Input: DEX router address
   - Output: `true` if the router is authorized for liquidity routing

#### Check Executor Status

1. **Function**: `isExecutor(address executor)`
   - Input: Executor address
   - Output: `true` if the address is authorized to execute migrations

---

## Configuration After Deployment

### Step 1: Whitelist Compliant Assets

As the contract owner, you must whitelist Shariah-compliant assets:

```bash
cast send <REGISTRY_ADDRESS> \
  "setAssetCompliance(address,bool)" \
  <TOKEN_ADDRESS> \
  true \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

**Example**: Whitelisting USDC on Arbitrum Sepolia:
```bash
cast send 0xYourRegistryAddress \
  "setAssetCompliance(address,bool)" \
  0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d \
  true \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

### Step 2: Authorize DEX Routers

Authorize trusted DEX routers (e.g., Uniswap V2, Sushiswap):

```bash
cast send <REGISTRY_ADDRESS> \
  "setRouterAuthorization(address,bool)" \
  <ROUTER_ADDRESS> \
  true \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

### Step 3: Authorize Executors

Authorize institutional executors or keepers:

```bash
cast send <REGISTRY_ADDRESS> \
  "setExecutorStatus(address,bool)" \
  <EXECUTOR_ADDRESS> \
  true \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

---

## Troubleshooting

### Issue: `forge: command not found`

**Solution**: Install Foundry:
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Issue: `insufficient funds for gas`

**Solution**: Ensure your deployer wallet has Arbitrum Sepolia ETH. Get testnet ETH from a faucet.

### Issue: Contract verification failed

**Solution**: 
1. Ensure `ETHERSCAN_API_KEY` is correct
2. Manually verify on Arbiscan using the contract source code
3. Use the following command to retry verification:
   ```bash
   forge verify-contract <CONTRACT_ADDRESS> \
     <CONTRACT_NAME> \
     --chain-id 421614 \
     --etherscan-api-key $ETHERSCAN_API_KEY
   ```

### Issue: Deployment script fails with "Stack too deep"

**Solution**: This has been resolved in `foundry.toml` with `via_ir = true` and optimizer settings. Ensure you have the latest version of the repository.

---

## Deployment Checklist

- [ ] Foundry installed and updated
- [ ] `.env` file created with correct variables
- [ ] Deployer wallet funded with Arbitrum Sepolia ETH
- [ ] Contracts compiled successfully (`forge build`)
- [ ] Deployment script executed (`./deploy_testnet.sh`)
- [ ] Contract addresses recorded
- [ ] Contracts verified on Arbiscan
- [ ] Shariah compliance checks performed (`isAssetCompliant`)
- [ ] Compliant assets whitelisted
- [ ] DEX routers authorized
- [ ] Executors configured

---

## Support

For technical issues or questions:
- **GitHub Issues**: [Gravitas Protocol Repository](https://github.com/AbZe628/gravitas-protocol/issues)
- **Documentation**: [Gravitas Protocol Docs](https://docs.gravitasprotocol.com)

---

## Security Notice

**This is a testnet deployment.** Do not use mainnet private keys or real funds. Always audit smart contracts before mainnet deployment.

---

**Gravitas Protocol** - Institutional-Grade Shariah-Compliant Liquidity Infrastructure
