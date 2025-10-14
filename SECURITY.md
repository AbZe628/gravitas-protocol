# Security Policy

## Supported Versions
The Gravitas Protocol MVP is currently under active development.
Security patches and improvements will be continuously integrated as the project matures.

| Version | Supported          |
| -------- | ------------------ |
| MVP (v0.1) | ✅ Active |
| Future testnet releases | ⚙️ Planned |
| Mainnet | 🚧 Pending audit |

---

## Reporting a Vulnerability

If you discover a security issue, please **do not create a public GitHub issue**.  
Instead, report it directly to:

📧 gravitas-security@proton.me

You can use GPG or encrypted email if you prefer.  
All valid reports will be acknowledged and rewarded with early contributor status once the program is launched.

---

## Security Practices

- Guardian role can only **pause** contracts — cannot withdraw or upgrade logic.  
- All upgrades are protected by a **48h timelock**.  
- Policies are externally auditable and executed via **non-custodial adapters**.  
- No user funds are ever directly held by Gravitas contracts.
