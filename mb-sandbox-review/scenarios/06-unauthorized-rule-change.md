# 06 — Unauthorised rule change attempt

## Setup

Use the dummy local baseline in [sandbox-access.md](../sandbox-access.md), from the repository root. `$RPC` is `http://127.0.0.1:8545`. `$OWNER` is Anvil0, `$EXECUTOR` Anvil1, `$RECIPIENT` Anvil2; `$REGISTRY`, `$ASSET` and `$UNKNOWN` are dummy values. Version 3 records the constructor executor grant, asset whitelist entry and second executor grant.

`onlyOwner` allows only the current owner to call a function. An executor may pass execution checks but cannot change rules. `Ownable2Step` requires a proposed owner (`pendingOwner`) to accept before becoming owner. A **revert** rejects a call and rolls back its changes.

## Steps and expected result

Optional local probes follow. Run individually: denied writes and the wrong acceptance must fail; continue after those expected errors. A snapshot saves local chain state for restoration.

```bash
source /tmp/mb-sandbox-env.sh
SNAP=$(cast rpc evm_snapshot --rpc-url "$RPC" | tr -d '"')
read_registry() {
  cast call "$REGISTRY" "$@" --from "$EXECUTOR" --rpc-url "$RPC"
}
write_registry() {
  local caller="$1"; shift
  cast send "$REGISTRY" "$@" --from "$caller" --unlocked --rpc-url "$RPC"
}
read_registry 'policyHistory(uint256)(bytes32)' 3
for fn in setAssetCompliance setRouterAuthorization setExecutorStatus; do
  write_registry "$EXECUTOR" "$fn(address,bool)" "$UNKNOWN" true
done
write_registry "$OWNER" 'transferOwnership(address)' "$RECIPIENT"
read_registry 'owner()(address)'
read_registry 'pendingOwner()(address)'
write_registry "$RECIPIENT" 'setAssetCompliance(address,bool)' "$UNKNOWN" true
write_registry "$EXECUTOR" 'acceptOwnership()'
read_registry 'isAssetCompliant(address)(bool)' "$UNKNOWN"
read_registry 'currentVersion()(uint256)'
read_registry 'policyHistory(uint256)(bytes32)' 3
write_registry "$RECIPIENT" 'acceptOwnership()'
read_registry 'owner()(address)'
read_registry 'pendingOwner()(address)'
cast rpc evm_revert "$SNAP" --rpc-url "$RPC"
```

All denied operations revert with `OwnableUnauthorizedAccount(caller)`. Before correct acceptance, owner remains `$OWNER`, pending owner is `$RECIPIENT`, the unknown asset remains `false`, version stays `3` and its hash stays unchanged. Correct acceptance changes owner to `$RECIPIENT` and clears pending owner to zero. Restore the snapshot even after unexpected results.

## Existing Forge proof

```bash
forge test --match-path test/foundry/PolicyCommitment.t.sol --match-contract '^PolicyCommitment' --match-test '^test_(OnlyTheOwnerWrites|OnlyTheOwnerWritesToEveryRegister)' -vv
forge test --match-path test/GravitasPolicyRegistryMultisig.t.sol --match-contract '^GravitasPolicyRegistryMultisigTest' --match-test '^test_Ownable2Step_(TransferRequiresAcceptance|AttackerCannotAccept|OnlyOwnerCanPropose)' -vv
```

Selected tests: `test_OnlyTheOwnerWrites`, `test_OnlyTheOwnerWritesToEveryRegister`, `test_Ownable2Step_TransferRequiresAcceptance`, `test_Ownable2Step_AttackerCannotAccept` and `test_Ownable2Step_OnlyOwnerCanPropose`. The rejection tests expect any revert, not the exact error type.

## Sources and limits

`contracts/GravitasPolicyRegistry.sol`: `setAssetCompliance`, `setRouterAuthorization`, `setExecutorStatus`, `_recordChange`. `lib/openzeppelin-contracts/contracts/access/Ownable.sol`: `onlyOwner`, `_checkOwner`; adjacent `Ownable2Step.sol`: `transferOwnership`, `pendingOwner`, `acceptOwnership`.

The five tests do not directly attempt a pending-owner write; that conclusion follows from the inherited owner check, with an optional probe above. Despite its filename, the multisig test uses dummy addresses, not a multiple-signature wallet. No real multisig or timelock (delayed execution controller) is established; see `docs/KNOWN-ISSUES.md`, “Ownership has not moved to the timelock.” These controls cannot stop an authorised owner changing rules immediately. The named tests passed in the full review run; scripts/check-local.py additionally ran the core local probes.
