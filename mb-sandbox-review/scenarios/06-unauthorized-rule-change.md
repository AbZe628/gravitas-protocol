# Scenario 06 — Unauthorized calls and transfer routes

Only the registry owner can change asset, router or executor lists. The root tests exercise those controls. The reference tests refuse direct `transfer` and delegated `transferFrom` even when the gated asset is approved, because only the immutable bound manager can perform token transfers. The manager requires the holder to be the caller, so a third party cannot redirect an allowance. Unapproved asset, paused registry, and unregistered manager checks remain independently enforced. The plain GUSD contrast still transfers because that token never queries the registry.

Run the focused checks:

```bash
bash mb-sandbox-review/scripts/run-scenario-6.sh
```

The reference guard does not change the old token or registry. The manager's one-time token binding is controlled by its deployer/owner; after initialization, it cannot be replaced. This is a prototype lifecycle, not a complete issuer governance model. An issuer would still have to select and secure token code, prove the operational authority model, and decide who can pause, approve assets and register managers. The plain-token bypass remains outside this demo gate.
