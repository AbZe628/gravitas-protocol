#!/bin/bash

###############################################################################
# Gravitas Protocol - Testnet Deployment Script
# 
# Purpose: One-click deployment to Arbitrum Sepolia testnet
# Author: Gravitas Protocol Labs
# Date: January 2026
#
# This script automates the deployment of Gravitas Protocol core contracts
# to Arbitrum Sepolia with verification on Arbiscan.
###############################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Banner
echo ""
echo "=========================================="
echo "  GRAVITAS PROTOCOL - TESTNET DEPLOYMENT"
echo "=========================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    print_error ".env file not found!"
    print_info "Please create a .env file with the following variables:"
    echo ""
    echo "RPC_URL=https://sepolia-rollup.arbitrum.io/rpc"
    echo "PRIVATE_KEY=your_private_key_here"
    echo "ETHERSCAN_API_KEY=your_arbiscan_api_key_here"
    echo ""
    exit 1
fi

# Load environment variables
print_info "Loading environment variables from .env..."
source .env

# Validate required variables
if [ -z "$RPC_URL" ]; then
    print_error "RPC_URL is not set in .env"
    exit 1
fi

if [ -z "$PRIVATE_KEY" ]; then
    print_error "PRIVATE_KEY is not set in .env"
    exit 1
fi

if [ -z "$ETHERSCAN_API_KEY" ]; then
    print_warning "ETHERSCAN_API_KEY is not set. Contract verification will be skipped."
    VERIFY_FLAG=""
else
    VERIFY_FLAG="--verify --etherscan-api-key $ETHERSCAN_API_KEY"
fi

print_success "Environment variables loaded successfully"
echo ""

# Check if Foundry is installed
if ! command -v forge &> /dev/null; then
    print_error "Foundry (forge) is not installed!"
    print_info "Install Foundry: curl -L https://foundry.paradigm.xyz | bash && foundryup"
    exit 1
fi

print_success "Foundry detected: $(forge --version | head -n 1)"
echo ""

# Build contracts
print_info "Building contracts with Foundry..."
forge build

if [ $? -eq 0 ]; then
    print_success "Contracts compiled successfully"
else
    print_error "Contract compilation failed"
    exit 1
fi

echo ""
print_info "Deploying to Arbitrum Sepolia..."
print_warning "This will broadcast transactions to the network."
echo ""

# Deploy with verification
if [ -z "$VERIFY_FLAG" ]; then
    forge script script/DeployDeterministic.s.sol:DeployDeterministic \
        --rpc-url "$RPC_URL" \
        --private-key "$PRIVATE_KEY" \
        --broadcast
else
    forge script script/DeployDeterministic.s.sol:DeployDeterministic \
        --rpc-url "$RPC_URL" \
        --private-key "$PRIVATE_KEY" \
        --broadcast \
        $VERIFY_FLAG
fi

if [ $? -eq 0 ]; then
    echo ""
    print_success "Deployment completed successfully!"
    echo ""
    print_info "Check deployment details in broadcast/DeployDeterministic.s.sol/"
    print_info "Verify Shariah compliance on Arbiscan using isAssetCompliant()"
    echo ""
else
    print_error "Deployment failed"
    exit 1
fi

echo "=========================================="
echo "  DEPLOYMENT COMPLETE"
echo "=========================================="
echo ""
