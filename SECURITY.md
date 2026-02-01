# Security Policy

## Critical Warning: Key Rotation
**If secrets (private keys, API keys, .env) have ever been committed to this repository, they MUST be considered compromised.**
1.  **Rotate all keys** immediately.
2.  **Revoke permissions** for compromised addresses in `GravitasPolicyRegistry`.
3.  **Transfer ownership** to a new, secure multi-sig wallet.

## Threat Model
- **Non-Compliant Asset Entry**: Prevented by `GravitasPolicyRegistry` whitelisting.
- **Unauthorized Migration**: Prevented by `onlyAuthorized` modifier and executor registry.
- **Liquidity Drain**: Prevented by `maxMoveBps` risk policy and atomic execution.
- **Signature Replay (V3)**: Prevented by EIP-712 nonces and domain separator.

## Secret Management
- **NEVER** commit `.env` or private keys.
- Use `.env.example` as a template for local development.
- CI/CD pipelines must use GitHub Secrets, never hardcoded values.
