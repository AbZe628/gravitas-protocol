# Reference implementation status

**Reference implementation, unaudited, for evaluation, not for production.**

This directory contains an illustrative gated demo token, a one-time-bound manager, a local JSON-RPC compliance API, a fail-closed example consumer client, and verification code. The token is called a demo sukuk only as a label. It is a dummy ERC-20 with no legal or religious standing. This is not an issuer product, Shariah opinion, regulator approval, independent audit, hosted service, or mainnet deployment.

The gated token permits balance changes only through its immutable manager after construction; direct `transfer` and delegated `transferFrom` revert. The token's registry hook checks asset approval and pause state. The holder must be the caller of the manager transfer, so an unrelated caller cannot redirect the holder's manager allowance. The manager separately checks that it is a registered registry executor and that the asset is approved, and emits the versioned transfer event in the same transaction. These checks cover only the configured dummy token and transfer path.

The registry's asset decision verifies the asset flag; its executor decision verifies the manager contract caller. `checkSubscriptionCompliance` accepts but does not evaluate its subscriber parameter. No component implements investor identity, KYC/AML, sanctions, accreditation, suitability, or recipient eligibility. API request context is caller-supplied correlation data, not compliance evidence. The separate client example blocks its callback on unavailable, invalid, mismatched or non-ALLOW API responses, but the API read and a later transaction are not atomic. The manager and token remain the on-chain enforcement point.

The existing registry remains unchanged. The project imports it from `../../contracts` and uses the repository's existing OpenZeppelin v5.5.0 and nested Foundry test library. The manager token binding is one-time and controlled by its deployer; this is not a complete governance or key-management design. The source is supplied for evaluation only. Do not use it to issue or transfer a real instrument.
