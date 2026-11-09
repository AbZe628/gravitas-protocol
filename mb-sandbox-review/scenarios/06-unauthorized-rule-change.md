# 06 — Unauthorised policy change

Only the registry owner can change asset, router or executor lists. `Ownable2Step` ownership transfer takes effect only after the proposed owner accepts. The local probe also checks that a pending owner cannot write before acceptance and that the wrong account cannot accept. Run from the repository root:

```bash
python3 mb-sandbox-review/scripts/check-local.py
forge test --match-path test/foundry/PolicyCommitment.t.sol --match-test '^test_OnlyTheOwnerWrites' -vv
forge test --match-test '^test_Ownable2Step_(TransferRequiresAcceptance|AttackerCannotAccept|OnlyOwnerCanPropose)' -vv
```

Expected: six local `PASS` lines; version and hash remain unchanged after rejected writes; ownership changes only after the proposed owner accepts. The Foundry tests are `test_OnlyTheOwnerWrites`, `test_OnlyTheOwnerWritesToEveryRegister` and the three named `test_Ownable2Step_...` tests. Their multisig-named fixture uses dummy addresses; it is not a real multisignature wallet.
