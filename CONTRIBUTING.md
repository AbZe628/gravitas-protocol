# Contributing to Gravitas Protocol

## Development Workflow

1. **Branching**: Create a feature branch from `main`.
2. **Testing**: Ensure all tests pass before submitting a PR.
   ```bash
   forge test
   ```
3. **Coverage**: New code should maintain or increase the coverage (target: 80%+).
   ```bash
   forge coverage
   ```
4. **Security**: Do not commit secrets. Use `.env.example` as a template.

## PR Requirements

- Must pass CI (lint, compile, test).
- Must include tests for new features.
- Must include documentation for any changes to protocol logic.
