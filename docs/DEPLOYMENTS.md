# Gravitas Protocol Deployments

> **Redeployed 23 August 2026.** The contracts at the addresses below are built from the
> source in this repository. The previous deployment was not: it carried no pause, no
> two-step ownership, no policy version history, and no EIP-712 signed intent, and its
> swap router pointed at an address with no code on this network. Those addresses are
> listed under "Superseded" at the foot of this document and should not be integrated
> against.


## Arbitrum Sepolia (Testnet)

### Contract Addresses

| Contract | Address | Explorer |
|----------|---------|----------|
| **GravitasPolicyRegistry** | `0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23` | [View on Arbiscan](https://sepolia.arbiscan.io/address/0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23) |
| **TeleportV3** | `0x6702C2CE6eD58ca3934eBBd785CaC1De8DCd85B4` | [View on Arbiscan](https://sepolia.arbiscan.io/address/0x6702C2CE6eD58ca3934eBBd785CaC1De8DCd85B4) |
| **TeleportV2** | `0xEDfF3dFdcdd7C04B11d9B614d5E0cd368f1e93c0` | [View on Arbiscan](https://sepolia.arbiscan.io/address/0xEDfF3dFdcdd7C04B11d9B614d5E0cd368f1e93c0) |
| **GravitasTimelock** | `0xbFFAd90B2607e3E5926260B640BbcD1E128680Ba` | [View on Arbiscan](https://sepolia.arbiscan.io/address/0xbFFAd90B2607e3E5926260B640BbcD1E128680Ba) |

### Uniswap V3 on this network

| | |
|---|---|
| NonfungiblePositionManager | `0x6b2937Bde17889EDCf8fbD8dE31C3C2a70Bc4d65` |
| SwapRouter02 | `0x101F443B4d1b059569D643917553c771E1b9663E` |

TeleportV3 previously pointed at `0xE592427A0AEce92De3Edee1F18E0157C05861564`, the original
SwapRouter. That address holds no code on Arbitrum Sepolia, so the rebalancing swap could never
have executed. SwapRouter02 has a shorter params struct — no `deadline` field — and the
interface in `TeleportV3` matches it.

**TeleportV2 has nothing to route through on this network.** There is no Uniswap V2 deployment
on Arbitrum Sepolia at any canonical address. The contract is deployed and callable, but a
migration through it needs a V2 factory and router to exist first.

### Superseded

These carried the 0.1.0 bytecode and are no longer the protocol's addresses. Left here so an
old link resolves to an explanation rather than to nothing.

| Contract | Address |
|---|---|
| GravitasPolicyRegistry (0.1.0) | `0xbcaE3069362B0f0b80f44139052f159456C84679` |
| TeleportV3 (0.1.0) | `0x5D423f8d01539B92D3f3953b91682D9884D1E993` |

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

#### Deploy everything

One script deploys all four contracts in order and refuses to start if either
Uniswap address it depends on has no code at it. There are no per-contract
scripts; earlier versions of this document named two that were never written.

```bash
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $SEPOLIA_RPC_URL \
  --account deployer \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
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
  --compiler-version v0.8.24+commit.e11b9ed9 \
  <CONTRACT_ADDRESS> \
  contracts/TeleportV3.sol:TeleportV3
```

## Arbitrum One (Mainnet)

### Status

🚧 **Not yet deployed**

### Planned Deployment

- **Target Date**: pending (no date claimed) (after external audit)
- **Prerequisites**:
  - External security audit completion
  - Shariah Advisory Board certification
  - Comprehensive testnet validation

### Deployment Checklist

- [ ] External audit completed (Hacken, Certik or equivalent)
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

- **Cooldown Period**: 900 seconds (15 minutes) — `cooldownSeconds`, adjustable by the owner via `setPolicy`
- **Max Move BPS**: 2000 (20%) — `maxMoveBps`, adjustable by the owner via `setPolicy`

### Teleport V3

- **Supported Fee Tiers**: 100, 500, 3000, 10000 (0.01%, 0.05%, 0.3%, 1%)
- **EIP-712 Domain**: 
  - Name: `GravitasTeleportV3`
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
- **Technical**: abdusamed@gravitasprotocol.xyz
- **Security**: abdusamed@gravitasprotocol.xyz
- **General**: abdusamed@gravitasprotocol.xyz

## References

- [Arbitrum Documentation](https://docs.arbitrum.io/)
- [Foundry Deployment Guide](https://book.getfoundry.sh/forge/deploying)
- [Contract Verification Guide](https://docs.arbiscan.io/tutorials/verifying-contracts-programmatically)

---

## Source verification on Arbiscan

Verification is what puts the green tick on the address page and lets anyone read the source
next to the bytecode. It needs a free Etherscan API key — one V2 key works across every chain.
Get it at [etherscan.io/apis](https://etherscan.io/apis), then:

```
$env:ETHERSCAN_API_KEY = "your key"
forge script script/Deploy.s.sol --rpc-url https://sepolia-rollup.arbitrum.io/rpc --verify --resume
```

`--resume` reads the broadcast record from the deployment, so the constructor arguments and the
compiler settings come from what was actually deployed rather than from anything retyped.

If a single contract needs doing on its own, the arguments are:

| Contract | Constructor arguments |
|---|---|
| GravitasPolicyRegistry | none |
| TeleportV3 | `(positionManager, swapRouter, registry)` |
| TeleportV2 | `(registry)` |
| GravitasTimelock | `(300, [deployer], [address(0)], address(0))` |

```
forge verify-contract <address> <ContractName> \
  --chain 421614 --constructor-args $(cast abi-encode "c(address)" <registry>)
```

Compiler settings come from `foundry.toml` and must match the deployment exactly: solc 0.8.24,
optimizer on, 200 runs, `via_ir` enabled. A mismatch in any one of them makes the bytecode differ
and the verification fail.
