# Scenario 02 — Approved asset

The registry stores an asset approval. Its pair check returns true only when both assets are approved. That view call does not itself transfer tokens or restrict a token that never consults the registry.

Run the root registry test and the reference manager success test:

```bash
bash mb-sandbox-review/scripts/run-scenario-2.sh
```

The runner verifies the existing view behavior, then checks that the registered executor can move the approved dummy token through the reference manager. The transfer guard belongs to `GatedDemoSukuk`, not to the registry alone.
