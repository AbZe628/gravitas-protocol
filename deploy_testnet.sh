#!/bin/bash
set -e 

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "Starting Gravitas Protocol Deployment..."

# Check env
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file missing!${NC}"
    exit 1
fi
source .env

# Build
echo "Building contracts..."
forge build

# Deploy
echo "Deploying to Arbitrum Sepolia..."
forge script script/DeployDeterministic.s.sol:DeployDeterministic --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --broadcast --verify --etherscan-api-key "$ETHERSCAN_API_KEY"

echo -e "${GREEN}Deployment Complete! Verifiable on Arbiscan.${NC}"
