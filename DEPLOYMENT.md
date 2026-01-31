# 🚀 Testnet Deployment Guide 

Network: Arbitrum Sepolia
Status: Ready for Deployment

## How to Deploy (One-Click)

1. Create a `.env` file with `RPC_URL`, `PRIVATE_KEY`, and `ETHERSCAN_API_KEY`.
2. Run the automated script:

```bash
chmod +x deploy_testnet.sh
./deploy_testnet.sh 
```

## Verification 

After deployment, verify Shariah Compliance on Arbiscan:
1. Go to the `GravitasPolicyRegistry` contract.
2. Read Contract -> `isAssetCompliant(tokenAddress)`.
3. Ensure it returns `true` for whitelisted assets.
