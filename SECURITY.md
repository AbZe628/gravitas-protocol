# Security Policy

This document outlines the security procedures and policies for the Gravitas Protocol.

## 1. Threat Model

The primary security threats to the Gravitas Protocol are:

- **Smart Contract Vulnerabilities:** Bugs or flaws in the Solidity code that could be exploited to drain funds, bypass compliance checks, or disrupt operations (e.g., reentrancy, integer overflows, access control issues).
- **Private Key Compromise:** Theft or loss of the private keys that control the protocol's ownership and administrative functions.
- **Oracle Manipulation:** An attack on the `GravitasPolicyRegistry` to maliciously add or remove compliant assets or authorized routers.
- **Economic Exploitation:** Attacks that leverage unforeseen market dynamics or interactions with external protocols to manipulate the system for profit.

## 2. Security Best Practices & Mitigations

| Threat | Mitigation Strategy |
| :--- | :--- |
| **Smart Contract Vulnerabilities** | - **Comprehensive Test Suite:** >90% line coverage on core contracts.<br>- **Internal & External Audits:** Rigorous code reviews by internal and third-party experts.<br>- **Reentrancy Guards:** Use of OpenZeppelin's `ReentrancyGuard` on all external-facing functions.<br>- **Secure Development Practices:** Adherence to the latest Solidity security standards. |
| **Private Key Compromise** | - **Multi-Signature Wallets:** Protocol ownership and upgrades MUST be managed by a Gnosis Safe or equivalent multi-sig wallet (recommended: 3-of-5 quorum).<br>- **Hardware Wallets:** Private keys should be stored on hardware wallets (e.g., Ledger, Trezor) and never exposed online.<br>- **Key Rotation:** A formal process for rotating keys should be established and practiced. |
| **Oracle Manipulation** | - **Timelocks:** All changes to the `GravitasPolicyRegistry` (e.g., adding a new compliant asset) MUST be executed through a timelock contract with a minimum delay of 48 hours. This provides a crucial window for the community to review and react to proposed changes. |
| **Economic Exploitation** | - **Deterministic Execution:** The core design of `TeleportV3` ensures that migrations are atomic and revert if slippage or other parameters are not met, minimizing exposure to economic attacks.<br>- **Fuzz Testing:** Use of Foundry's invariant and fuzz testing capabilities to uncover edge cases and unexpected economic behaviors. |

## 3. Key Rotation Policy

**WARNING:** Regular key rotation is a critical component of maintaining the security of the protocol. The team commits to a formal key rotation ceremony at least **once every 12 months** for all keys associated with protocol ownership and administration.

In the event of a suspected key compromise, an emergency rotation procedure must be initiated immediately. This involves:

1.  Transferring ownership of all contracts to a new, secure multi-sig wallet.
2.  Revoking all authorizations associated with the potentially compromised keys.
3.  Publicly announcing the rotation and the reasons for it.

## 4. Responsible Disclosure Policy

We encourage security researchers to review our contracts and report any potential vulnerabilities. We are committed to working with the community to ensure the safety of our users' funds.

- **Reporting:** Please email any security findings to `security@gravitas.finance` (or `abdusamedzelic98@gmail.com` if the alias is not yet set up). Please provide a detailed description of the vulnerability and steps to reproduce it.
- **Bounty Program:** A formal bug bounty program will be established post-mainnet launch to reward researchers for their contributions.
- **Disclosure Timeline:** We will work with you to agree on a reasonable timeline for public disclosure, typically after a fix has been developed and deployed.

**IMPORTANT:** Please do not disclose any vulnerabilities publicly until they have been addressed and a coordinated disclosure plan is in place.

## 5. Audit Status

- **Internal Review:** Completed. See `proof-of-quality/INTERNAL_REVIEW.md`.
- **External Audit:** Planned for Q2 2026. This document will be updated with a link to the final report upon completion.

We do **not** claim that the protocol is "fully audited" by a third party at this time. The security of the protocol is our highest priority, and we are committed to a transparent and continuous audit process.

## 6. Secret Management

- **NEVER** commit `.env` or private keys.
- Use `.env.example` as a template for local development.
- CI/CD pipelines must use GitHub Secrets, never hardcoded values.

