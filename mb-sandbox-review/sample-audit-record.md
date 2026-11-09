# Sample audit record: what it proves

`sample-audit-record.json` is a dummy local example assembled by the review helper. Its outer keys group actual contract arguments, return values, event fields and node responses. Those grouping keys are not a new registry event or stored audit schema. The file is **not** proof that a protected sukuk transfer or an approved external ruling exists.

## Read the example

The transfer is 100 dummy `GUSD` units from Anvil account 0 to account 2. `Transfer.from`, `Transfer.to` and `Transfer.value` match the ERC-20 event in `lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol`. `value` is `100000000000000000000` because this dummy token has 18 decimal places. Its contract is `contracts/MockERC20.sol`; no sukuk features are present.

The checked rule is the existing `checkSubscriptionCompliance(subscriber, subscriptionToken)` function in `contracts/GravitasPolicyRegistry.sol`. It requires the asset flag to be true and `isExecutor[msg.sender]` to be true. The JSON gives the exact call input, simulated caller and block tag. A successful raw `eth_call.response.result` ending in `03` decodes to `policyVersion = 3`. The check uses version 3's current lists. It does **not** check the investor, recipient, amount, instrument documents or an external certification.

`PolicyUpdated.version` and `PolicyUpdated.policyHash` use the actual event's field names. The helper reads the hash from `policyHistory(3)`; the same version/hash pair was emitted when the second executor was granted. Version 1 is the constructor grant, version 2 approves the asset, and version 3 grants this executor. `_recordChange` hashes the previous hash, register identifier, changed address and boolean value. This is an ordered change commitment, not the text or identifier of a board-approved ruling. The registry stores no such ruling document.

`eth_getTransactionReceipt.transactionHash` is the separate token transfer's transaction reference. `status = 0x1` means that transfer succeeded, **not** that it applied a registry rule. `logs` contains its real `Transfer` event shape. `eth_getBlockByNumber.timestamp` is the transfer block's timestamp in hexadecimal seconds since 1 January 1970; the registry event itself contains no timestamp. Block and receipt fields come from the blockchain node, not registry storage.

## The gap

The check was simulated at block `0x4`; the transfer was a different operation at block `0x5`. The check emitted no event and has no transaction hash. The token transfer did not call the registry. Therefore this file proves only **a successful version-3 check followed by a separate dummy transfer**. It cannot honestly prove "version 3 was enforced by this transfer". The version could change, or the registry could pause, between a pre-check and execution.

Neither `LiquidityMigrated` in `TeleportV2.sol` nor `LiquidityTeleported` in `TeleportV3.sol` emits the registry version. The HTTP mock's audit line contains `ts`, `requestId`, `channel`, `asset`, `amount`, `decision` and `reason`, but no on-chain version, policy hash or transaction reference.

**TODO FOR ABDUSAMED T6:** an actual transfer integration must perform the check and record its returned version during the same transaction. Retain the relevant policy-change events and map the version to the governing approval outside this registry. That integration is not in this repo. No contract code was changed to manufacture it.

Reproduce the external fixture with `python3 mb-sandbox-review/scripts/check-local.py` after local setup. Local transaction hashes and timestamps can differ on a new run. All values are sandbox-only; no real money or customer data is used.
