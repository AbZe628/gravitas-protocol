# Changelog

## v0.1.0-alpha

Initial public alpha release of the Gravitas SDK.

### Added
- GravitasClient for deterministic policy validation, simulation, and transaction payload construction.
- Strongly typed MigrationPolicy with strict deadline and slippage invariants.
- Adapter-based architecture (BaseAdapter) enabling protocol extensibility.
- UniV2Adapter and CamelotAdapter reference implementations.
- Off-chain simulation layer for dry-run validation prior to execution.
- Explicit error model (InvalidPolicyError, AdapterNotSupportedError, SimulationError).
- Adapter resolution and chain compatibility checks.

### Security & Design Notes
- SDK does not sign transactions, custody funds, or execute migrations.
- All execution is handled exclusively by the Teleport.sol smart contract.
- Simulations in v0.1 use mock reserve logic to demonstrate architecture and flow.
- Policy validation is intentionally strict to reduce on-chain failure risk.

### Scope Limitations
- No real-time on-chain reserve fetching in v0.1.
- No permissionless execution logic (SDK is tooling-only).
- Adapter registry uses static configuration for alpha phase.

This release establishes the SDK architecture and developer integration surface.
Future versions will expand adapter coverage, integrate live data sources,
and support Orbit chain configurations.
