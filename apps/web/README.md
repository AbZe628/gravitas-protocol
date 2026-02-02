# Gravitas Protocol Frontend

Professional institutional-grade frontend for Gravitas Protocol - Shariah-Compliant Liquidity Routing on Arbitrum.

## 🚀 Live Demo

**Production:** https://abze628.github.io/gravitas-protocol/

## 📦 Tech Stack

- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Web3:** wagmi + viem
- **Animations:** Framer Motion
- **TypeScript:** Full type safety

## 🏗️ Project Structure

```
apps/web/
├── client/
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components (Home, Dashboard)
│   │   ├── lib/           # Utilities and wagmi config
│   │   ├── hooks/         # Custom React hooks
│   │   └── contexts/      # React contexts (Theme)
│   ├── index.html         # HTML entry point
│   └── public/            # Static assets
├── server/                # Express server for production
├── dist/                  # Build output
├── package.json
├── vite.config.ts         # Vite configuration
└── tsconfig.json          # TypeScript configuration
```

## 🛠️ Development

### Prerequisites

- Node.js 18+
- pnpm 8+

### Installation

```bash
cd apps/web
pnpm install
```

### Development Server

```bash
pnpm dev
```

Opens at `http://localhost:3000`

### Build

```bash
NODE_ENV=production pnpm build
```

Output: `dist/public/`

### Preview Production Build

```bash
pnpm preview
```

## 🌐 Deployment

### GitHub Pages (Automatic)

The site is automatically deployed to GitHub Pages when changes are pushed to `main` branch.

**Setup:**

1. Enable GitHub Pages in repository settings
2. Set source to "GitHub Actions"
3. Add workflow file `.github/workflows/deploy-frontend.yml` (see below)

**Workflow File:**

```yaml
name: Deploy Frontend to GitHub Pages

on:
  push:
    branches: [main]
    paths:
      - 'apps/web/**'
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: cd apps/web && pnpm install

      - name: Build
        run: cd apps/web && NODE_ENV=production pnpm build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./apps/web/dist/public

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Manual Deployment

```bash
# Build
cd apps/web
NODE_ENV=production pnpm build

# Deploy dist/public/ to your hosting provider
```

## 🎨 Design System

### Color Palette

- **Primary:** Deep Navy (#0A1628)
- **Accent:** Gold (#D4AF37)
- **Background:** Light Gray (#F8F9FA)
- **Foreground:** Dark Gray (#1A1A1A)

### Typography

- **Headings:** Space Grotesk (Bold)
- **Body:** IBM Plex Sans (Regular, Medium, Semibold)

### Theme

The app uses a light theme by default with institutional design principles:

- Clean, professional aesthetic
- Subtle depth with shadows and gradients
- Smooth animations and transitions
- Geometric patterns inspired by Islamic art

## 🔗 Smart Contracts

### Arbitrum Sepolia

- **Policy Registry:** `0xbcaE3069362B0f0b80f44139052f159456C84679`
- **Teleport V3:** `0x5D423f8d01539B92D3f3953b91682D9884D1E993`

## 📝 Features

### Current (MVP)

- ✅ Professional landing page
- ✅ Wallet connection (MetaMask)
- ✅ Network auto-switch to Arbitrum Sepolia
- ✅ Contract address display with copy/Arbiscan links
- ✅ Responsive design
- ✅ Smooth animations

### Planned (See TODO.md)

- 🚧 Contract read interfaces (Policy Registry, Teleport V2/V3)
- 🚧 Transaction submission forms
- 🚧 EIP-712 signing flow
- 🚧 Transaction history viewer
- 🚧 Event viewer
- 🚧 Gas estimation
- 🚧 WalletConnect integration

## 🧪 Testing

```bash
# Type checking
pnpm check

# Linting
pnpm format
```

## 📚 Documentation

- **Implementation Roadmap:** [TODO.md](./TODO.md)
- **Protocol Docs:** [../../README.md](../../README.md)
- **Smart Contracts:** [../../contracts/](../../contracts/)
- **SDK:** [../../gravitas-sdk/](../../gravitas-sdk/)

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## 📄 License

MIT License - see [LICENSE](../../LICENSE) for details.

## 🔗 Links

- **GitHub:** https://github.com/AbZe628/gravitas-protocol
- **Live Site:** https://abze628.github.io/gravitas-protocol/
- **Arbiscan:** https://sepolia.arbiscan.io
- **Arbitrum Docs:** https://docs.arbitrum.io

---

Built with ❤️ for institutional DeFi
