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


## Detailed Setup Instructions

### Prerequisites

- **Foundry**: Latest version ([installation guide](https://book.getfoundry.sh/getting-started/installation))
- **Node.js**: v18 or higher
- **pnpm**: v8 or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/AbZe628/gravitas-protocol.git
cd gravitas-protocol

# Install Foundry dependencies
forge install

# Install SDK dependencies
cd gravitas-sdk && pnpm install
```

### Environment Setup

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
# NEVER commit real private keys!
```

## Code Style Guidelines

### Solidity

- Use `forge fmt` before committing
- Follow NatSpec documentation standards
- Naming conventions:
  - Contracts: `PascalCase`
  - Functions: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`

### TypeScript (SDK)

- Use `prettier` for formatting
- Prefer explicit types over `any`
- Document public APIs with JSDoc

## Testing Guidelines

### Running Tests

```bash
# All tests
forge test

# Specific test file
forge test --match-path test/foundry/TeleportV3FullFlow.t.sol

# With verbosity
forge test -vvv
```

### Coverage Requirements

- Core contracts (GravitasPolicyRegistry, Teleport, TeleportV3): **>=80%**
- Run coverage check: `python3 check-coverage.py`

## CI/CD Pipeline

All PRs must pass:

1. **Security Scan**: No secrets in git
2. **Contracts**: `forge fmt --check`, `forge build`, `forge test`, coverage >=80%
3. **SDK**: `pnpm build`, `pnpm test`

## Commit Message Format

```
<type>: <description>

[optional body]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `test`: Tests
- `refactor`: Code refactoring
- `chore`: Maintenance

## Security

Report security vulnerabilities privately via:
- GitHub Security Advisories
- Email: security@gravitas-protocol.io

See [SECURITY.md](./SECURITY.md) for details.

## Questions?

Open a discussion on GitHub or ask in PR comments.
