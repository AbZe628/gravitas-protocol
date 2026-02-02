# Gravitas Protocol Deployments

## Arbitrum Sepolia (Testnet)

### Contract Addresses

| Contract | Address | Explorer |
|----------|---------|----------|
| **GravitasPolicyRegistry** | `0xbcaE3069362B0f0b80f44139052f159456C84679` | [View on Arbiscan](https://sepolia.arbiscan.io/address/0xbcaE3069362B0f0b80f44139052f159456C84679) |
| **TeleportV3** | `0x5D423f8d01539B92D3f3953b91682D9884D1E993` | [View on Arbiscan](https://sepolia.arbiscan.io/address/0x5D423f8d01539B92D3f3953b91682D9884D1E993) |

### Network Information

- **Chain ID**: 421614
- **RPC URL**: `https://sepolia-rollup.arbitrum.io/rpc`
- **Block Explorer**: https://sepolia.arbiscan.io
- **Faucet**: https://faucet.quicknode.com/arbitrum/sepolia

### Purpose

The Arbitrum Sepolia deployment is used for:
- Testing protocol functionality
- Integration testing for frontend and SDK
- Demonstrating compliance checks
- Validating migration flows

### Deployment Scripts

#### Deploy Policy Registry

```bash
forge script script/DeployPolicyRegistry.s.sol:DeployPolicyRegistry \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ARBISCAN_API_KEY
```

#### Deploy Teleport V3

```bash
forge script script/DeployTeleportV3.s.sol:DeployTeleportV3 \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ARBISCAN_API_KEY
```

### Verification

After deployment, verify contracts on Arbiscan:

```bash
forge verify-contract \
  --chain-id 421614 \
  --num-of-optimizations 200 \
  --watch \
  --constructor-args $(cast abi-encode "constructor(address)" <REGISTRY_ADDRESS>) \
  --etherscan-api-key $ARBISCAN_API_KEY \
  --compiler-version v0.8.20+commit.a1b79de6 \
  <CONTRACT_ADDRESS> \
  contracts/TeleportV3.sol:TeleportV3
```

## Arbitrum One (Mainnet)

### Status

🚧 **Not yet deployed**

### Planned Deployment

- **Target Date**: Q2 2026 (after external audit)
- **Prerequisites**:
  - External security audit completion
  - Shariah Advisory Board certification
  - Comprehensive testnet validation

### Deployment Checklist

- [ ] External audit completed (OpenZeppelin or equivalent)
- [ ] Shariah certification obtained
- [ ] Testnet validation complete (>1000 successful migrations)
- [ ] Multi-sig wallet configured for ownership
- [ ] Emergency pause mechanism tested
- [ ] Monitoring and alerting infrastructure ready
- [ ] Documentation finalized
- [ ] Community announcement prepared

## Configuration

### Policy Registry

Initial configuration:
- **Owner**: Multi-sig wallet (Gnosis Safe)
- **Compliant Assets**: To be determined by Shariah Advisory Board
- **Authorized Executors**: Institutional partners only

### Teleport V2

- **Cooldown Period**: 3600 seconds (1 hour)
- **Max Move BPS**: 10000 (100%)

### Teleport V3

- **Supported Fee Tiers**: 100, 500, 3000, 10000 (0.01%, 0.05%, 0.3%, 1%)
- **EIP-712 Domain**: 
  - Name: `TeleportV3`
  - Version: `1`
  - Chain ID: Network-specific

## Upgrade Strategy

### Immutable Contracts

All deployed contracts are **immutable** (no proxy pattern). Upgrades require:

1. Deploy new contract versions
2. Update Policy Registry with new addresses
3. Migrate liquidity to new contracts (if necessary)
4. Deprecate old contracts with grace period

### Rationale

Immutability provides:
- **Security**: No upgrade key risk
- **Trust**: Users know code won't change
- **Simplicity**: No proxy complexity
- **Compliance**: Easier to audit and certify

## Monitoring

### Key Metrics

- **Total Migrations**: Count of successful V2/V3 migrations
- **Total Value Locked**: USD value of liquidity managed
- **Compliance Rate**: % of transactions passing compliance checks
- **Gas Efficiency**: Average gas cost per migration
- **Failure Rate**: % of failed transactions

### Alerts

- Unusual transaction volume
- Failed compliance checks
- Contract paused
- Ownership transfer
- Policy updates

### Tools

- **Tenderly**: Transaction monitoring and alerting
- **Dune Analytics**: On-chain metrics dashboard
- **OpenZeppelin Defender**: Security monitoring

## Emergency Procedures

### Pause Mechanism

If a critical vulnerability is discovered:

1. Owner calls `pause()` on affected contracts
2. All user-facing functions are disabled
3. Investigation and fix deployed
4. Unpause after validation

### Recovery Plan

1. **Assess Impact**: Determine affected users and funds
2. **Communicate**: Notify community via official channels
3. **Deploy Fix**: New contract version if necessary
4. **Compensate**: If funds are at risk, coordinate recovery
5. **Post-Mortem**: Publish detailed incident report

## Contact

For deployment-related questions:
- **Technical**: dev@gravitas-protocol.io
- **Security**: security@gravitas-protocol.io
- **General**: info@gravitas-protocol.io

## References

- [Arbitrum Documentation](https://docs.arbitrum.io/)
- [Foundry Deployment Guide](https://book.getfoundry.sh/forge/deploying)
- [Contract Verification Guide](https://docs.arbiscan.io/tutorials/verifying-contracts-programmatically)
