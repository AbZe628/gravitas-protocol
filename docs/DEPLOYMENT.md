# Gravitas Protocol: Deployment Guide

**Document Version:** 1.0.0  
**Date:** February 25, 2026  
**Status:** Production-Ready

---

## Overview

This guide covers the complete deployment process for the Gravitas Protocol across testnet and mainnet environments. The protocol consists of three core smart contracts and a React-based web dashboard.

---

## 1. Smart Contract Deployment

### Prerequisites

- **Foundry** installed (`foundryup`)
- **Node.js** 18+ and **pnpm**
- Private key with sufficient ETH for gas fees
- RPC endpoints for target networks

### Environment Setup

Create `.env` file in the repository root:

```bash
# Arbitrum Sepolia (Testnet)
ARB_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
ARB_SEPOLIA_PRIVATE_KEY=0x...

# Arbitrum One (Mainnet)
ARB_MAINNET_RPC_URL=https://arb1.arbitrum.io/rpc
ARB_MAINNET_PRIVATE_KEY=0x...

# Etherscan API Key (for verification)
ETHERSCAN_API_KEY=...
```

### Deployment Steps

#### 1. Deploy GravitasPolicyRegistry

```bash
cd gravitas-protocol

# Testnet deployment
forge create contracts/GravitasPolicyRegistry.sol:GravitasPolicyRegistry \
  --rpc-url $ARB_SEPOLIA_RPC_URL \
  --private-key $ARB_SEPOLIA_PRIVATE_KEY \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY

# Save the contract address as REGISTRY_ADDRESS
```

#### 2. Deploy TeleportV2

```bash
# Testnet deployment
forge create contracts/Teleport.sol:Teleport \
  --rpc-url $ARB_SEPOLIA_RPC_URL \
  --private-key $ARB_SEPOLIA_PRIVATE_KEY \
  --constructor-args $REGISTRY_ADDRESS \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY

# Save the contract address as TELEPORT_V2_ADDRESS
```

#### 3. Deploy TeleportV3

```bash
# Testnet deployment
forge create contracts/TeleportV3.sol:TeleportV3 \
  --rpc-url $ARB_SEPOLIA_RPC_URL \
  --private-key $ARB_SEPOLIA_PRIVATE_KEY \
  --constructor-args $REGISTRY_ADDRESS 0x68b3465833fb72B5A828cCEA02FFAD6bFB335AaF \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY

# Save the contract address as TELEPORT_V3_ADDRESS
```

### Contract Configuration

After deployment, configure the registry:

```bash
# Whitelist Shariah-compliant tokens
cast send $REGISTRY_ADDRESS \
  "setAssetCompliance(address,bool)" \
  0x... true \
  --rpc-url $ARB_SEPOLIA_RPC_URL \
  --private-key $ARB_SEPOLIA_PRIVATE_KEY

# Authorize executors (routers, protocols)
cast send $REGISTRY_ADDRESS \
  "authorizeRouter(address,bool)" \
  0x... true \
  --rpc-url $ARB_SEPOLIA_RPC_URL \
  --private-key $ARB_SEPOLIA_PRIVATE_KEY
```

---

## 2. Frontend Deployment

### Prerequisites

- Node.js 18+
- pnpm package manager
- GitHub Pages or Vercel account (optional)

### Build Steps

```bash
cd apps/web/client

# Install dependencies
pnpm install

# Build for production
pnpm run build

# Output directory: dist/
```

### Deployment Options

#### Option 1: GitHub Pages

```bash
# Update vite.config.ts base URL
# base: "/gravitas-protocol/"

# Build and deploy
pnpm run build
git add dist/
git commit -m "chore: deploy to GitHub Pages"
git push origin main
```

#### Option 2: Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Option 3: Self-Hosted

```bash
# Build
pnpm run build

# Serve with nginx
sudo cp -r dist/* /var/www/gravitas/
```

### Environment Configuration

Update `apps/web/client/src/lib/wagmi.ts` with deployed contract addresses:

```typescript
export const CONTRACTS = {
  POLICY_REGISTRY: "0x...", // Deployed registry address
  TELEPORT_V2: "0x...",      // Deployed TeleportV2 address
  TELEPORT_V3: "0x...",      // Deployed TeleportV3 address
};
```

---

## 3. Testnet Verification

### Arbitrum Sepolia

1. **Verify Contracts on Arbiscan:**
   - Navigate to [Arbiscan Sepolia](https://sepolia.arbiscan.io/)
   - Search for each deployed contract address
   - Verify source code matches repository

2. **Test Migration Flow:**
   - Connect wallet to Arbitrum Sepolia
   - Visit `/dashboard/migrate`
   - Test V2 and V3 migration flows
   - Verify compliance checker works

3. **Monitor Transactions:**
   - All transactions should be visible on Arbiscan
   - Check gas usage and execution time
   - Verify events are emitted correctly

---

## 4. Mainnet Deployment Checklist

Before deploying to mainnet, ensure:

- [ ] All smart contracts have passed external security audit
- [ ] Test coverage is ≥90% for all core contracts
- [ ] Frontend has been tested on Arbitrum Sepolia
- [ ] All environment variables are configured correctly
- [ ] Private keys are stored securely (hardware wallet recommended)
- [ ] Deployment addresses are documented
- [ ] Shariah Advisory Board has approved token whitelist
- [ ] Incident response plan is in place
- [ ] Monitoring and alerting systems are configured
- [ ] Legal review completed for compliance

### Mainnet Deployment

```bash
# Deploy to Arbitrum One
forge create contracts/GravitasPolicyRegistry.sol:GravitasPolicyRegistry \
  --rpc-url $ARB_MAINNET_RPC_URL \
  --private-key $ARB_MAINNET_PRIVATE_KEY \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY

# Repeat for TeleportV2 and TeleportV3
```

---

## 5. Post-Deployment

### Monitoring

- Set up alerts for failed transactions
- Monitor contract state changes
- Track gas prices and optimization opportunities
- Log all administrative actions

### Maintenance

- Regular security audits (annually)
- Update dependencies and libraries
- Monitor for protocol upgrades
- Maintain documentation

### Upgrades

The current protocol uses immutable contracts. For future upgrades:

1. Deploy new contract versions
2. Migrate liquidity through atomic swaps
3. Deprecate old contracts
4. Update frontend to point to new addresses

---

## 6. Troubleshooting

### Common Issues

| Issue | Solution |
| :--- | :--- |
| **Deployment fails with "out of gas"** | Increase gas limit or split deployment |
| **Verification fails on Arbiscan** | Ensure Solidity version matches, check constructor args |
| **Frontend shows "Wrong Network"** | Verify wallet is connected to correct chain |
| **Migrations revert** | Check token compliance status in registry |
| **Signature validation fails** | Verify EIP-712 domain matches contract |

### Support

For deployment issues:
1. Check contract logs on Arbiscan
2. Review transaction details
3. Verify all prerequisites are met
4. Consult security documentation

---

## 7. Security Considerations

- **Private Keys:** Never commit `.env` files. Use environment variables or hardware wallets.
- **Rate Limiting:** Implement rate limiting on frontend to prevent abuse.
- **Monitoring:** Set up alerts for unusual activity.
- **Backups:** Maintain backups of deployment configurations and addresses.
- **Incident Response:** Have a plan in place for security incidents.

---

## Conclusion

The Gravitas Protocol is now ready for deployment. Follow this guide carefully to ensure a smooth and secure deployment process. For questions or issues, refer to the technical specification and security documentation.
