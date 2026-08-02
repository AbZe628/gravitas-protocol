# NPM Publish Instructions

## First-time setup (do once)

```bash
# Login to NPM (requires NPM account with access to @gravitas scope)
npm login

# Verify you are logged in
npm whoami
```

## Publish to NPM

```bash
cd gravitas-sdk

# Build first
pnpm build

# Dry run to verify what will be published
npm publish --dry-run

# Publish (first time — creates the package on NPM)
npm publish --access public
```

## Update version and republish

```bash
# Patch version (0.1.0 → 0.1.1)
npm version patch

# Minor version (0.1.0 → 0.2.0)  
npm version minor

# Then publish
npm publish --access public
```

## Verify publication

After publishing, verify at:
https://www.npmjs.com/package/@gravitas/sdk

## NPM Account Setup

To publish under the `@gravitas` scope:
1. Create NPM account at npmjs.com
2. Create `@gravitas` organization at npmjs.com/org/create
3. npm login with that account
4. npm publish --access public

## Add NPM badge to main README

After first successful publish, add this badge to the root README.md badges section:

```markdown
<a href="https://www.npmjs.com/package/@gravitas/sdk"><img src="https://badge.fury.io/js/%40gravitas%2Fsdk.svg" alt="npm version"></a>
```
