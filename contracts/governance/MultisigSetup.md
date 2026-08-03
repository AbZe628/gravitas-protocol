# Multisig Governance Setup Guide

## Architecture

```
Gnosis Safe (3-of-5) → GravitasTimelock (48h delay) → GravitasPolicyRegistry
```

Every policy change (asset whitelist, router authorization, executor status) must:
1. Be proposed by a Gnosis Safe signer with 3-of-5 approval
2. Wait 48 hours (the timelock delay)
3. Be executed by anyone after the delay

This provides a 48-hour window for institutional partners to review any compliance changes.

## Production Deployment Steps

### 1. Deploy Gnosis Safe
- Go to https://safe.global
- Create a new Safe on Arbitrum One
- Configure: 3-of-5 signers (recommended)
- Signers: Founder, Co-founder, Legal counsel, Shariah scholar representative, Technical advisor
- Note the Safe address: `0x...`

### 2. Deploy GravitasTimelock
```bash
forge create contracts/governance/GravitasTimelock.sol:GravitasTimelock \
  --constructor-args \
    172800 \
    "[GNOSIS_SAFE_ADDRESS]" \
    "[0x0000000000000000000000000000000000000000]" \
    "0x0000000000000000000000000000000000000000" \
  --rpc-url $ARBITRUM_ONE_RPC \
  --private-key $DEPLOYER_KEY
```

Parameters:
- `172800` = 48 hours in seconds
- Proposers: Gnosis Safe address
- Executors: `address(0)` = anyone can execute after delay
- Admin: `address(0)` = no admin (fully decentralized)

### 3. Transfer GravitasPolicyRegistry ownership to Timelock
```solidity
// Call this from current owner wallet
registry.transferOwnership(TIMELOCK_ADDRESS);
// Then call from timelock to accept (Ownable2Step)
registry.acceptOwnership();
```

### 4. Verify setup
```bash
cast call $REGISTRY_ADDRESS "owner()" --rpc-url $ARBITRUM_ONE_RPC
# Should return TIMELOCK_ADDRESS
```

## Making Policy Changes Post-Multisig

### 1. Propose via Safe
In Gnosis Safe UI, create a transaction to call `GravitasTimelock.schedule()` with the policy change calldata.

### 2. Collect signatures (3 of 5)
Share the Safe transaction with other signers.

### 3. Wait 48 hours

### 4. Execute
After delay, anyone can call `GravitasTimelock.execute()` to apply the change.

## Testnet Configuration (Arbitrum Sepolia)

For testnet, use shorter delay:
- minDelay: 300 seconds (5 minutes) for testing
- Keep same architecture, just shorter delay

## Why This Matters for GCC Institutional Sales

Islamic financial institutions require:
1. **No single point of failure** — Ownable2Step + Timelock eliminates single private key risk
2. **Transparent governance** — All changes are on-chain and time-delayed
3. **Auditability** — TimelockController events provide full change history
4. **Reversibility window** — 48h delay allows reaction to malicious proposals
