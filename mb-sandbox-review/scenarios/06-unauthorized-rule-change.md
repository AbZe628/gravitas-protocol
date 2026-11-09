# Scenario 06 — Unauthorized calls and transfer routes

Only the registry owner can change asset, router or executor lists. The root tests exercise those controls. The reference tests also try direct and delegated transfers while the gated asset is unapproved or the registry is paused; both routes are refused. The plain GUSD contrast still transfers because that token never queries the registry.

Run the focused checks:

```bash
bash mb-sandbox-review/scripts/run-scenario-6.sh
```

The reference guard does not change the old token or registry. An issuer would still have to select and secure the token implementation and decide who can pause it, approve assets and register managers.
