import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Code2, Package, Copy, CheckCheck,
  Terminal, Zap, Shield, ExternalLink, BookOpen
} from "lucide-react";
import Header from "@/components/Header";
import ParametricField from "@/design/ParametricField";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

function CodeBlock({ code, language = "typescript", title }: { code: string; language?: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rounded-[var(--g-radius)] border border-[var(--g-line)] bg-[var(--g-navy)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--g-line)] bg-[var(--g-surface)]">
        <span className="text-[10px] text-[var(--g-muted)] font-mono uppercase tracking-widest">{title || language}</span>
        <button onClick={copy} className="p-1 text-[var(--g-muted)] hover:text-[var(--g-gold-soft)] transition-colors">
          {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed scrollbar-thin">
        <code className="text-[var(--g-gold-soft)] font-mono">{code}</code>
      </pre>
    </div>
  );
}

export default function SDK() {
  return (
    <div className="min-h-screen bg-[var(--g-navy)] text-[var(--g-paper)]">
      <Header />

      <main className="pt-24">
        {/* HERO */}
        <section className="relative py-24 md:py-32 overflow-hidden">
          <ParametricField 
            className="absolute inset-0 w-full h-full pointer-events-none opacity-30" 
            anchor={{ x: 0.9, y: 0.4 }}
            scale={0.7}
            shells={8}
            motion={true}
          />
          <div className="container relative z-10 px-6 mx-auto max-w-7xl">
            <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-3xl">
              <motion.div variants={fadeUp} className="mb-6">
                <span className="g-label px-3 py-1 rounded-full bg-[var(--g-gold-wash)] border border-[var(--g-gold)]/20 text-[var(--g-gold-soft)]">
                  <Package className="h-3 w-3 inline mr-2 mb-0.5" />
                  v1.0.0 Stable
                </span>
              </motion.div>
              <motion.h1 variants={fadeUp} className="g-display mb-6">
                Gravitas SDK
              </motion.h1>
              <motion.p variants={fadeUp} className="g-prose text-[var(--g-text-lg)] text-[var(--g-paper-dim)] mb-8">
                A Stripe-like developer experience for institutional DeFi. Fully typed, pre-flight compliance checks, and a fluent builder API for atomic migrations.
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
                <span className="px-3 py-1 bg-[var(--g-surface)] border border-[var(--g-line)] rounded-md text-[var(--g-text-xs)] text-[var(--g-muted)]">TypeScript</span>
                <span className="px-3 py-1 bg-[var(--g-surface)] border border-[var(--g-line)] rounded-md text-[var(--g-text-xs)] text-[var(--g-muted)]">ESM + CJS</span>
                <span className="px-3 py-1 bg-[var(--g-surface)] border border-[var(--g-line)] rounded-md text-[var(--g-text-xs)] text-[var(--g-muted)]">Ethers v6</span>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <div className="container px-6 py-16 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-16">
            {/* Sidebar / Quick Links */}
            <aside className="lg:col-span-3 hidden lg:block">
              <div className="sticky top-32 space-y-8">
                <div>
                  <h3 className="g-label mb-4">Quick Start</h3>
                  <ul className="space-y-3 text-[var(--g-text-sm)]">
                    <li><a href="#installation" className="text-[var(--g-muted)] hover:text-[var(--g-paper)] transition-colors">Installation</a></li>
                    <li><a href="#initialization" className="text-[var(--g-muted)] hover:text-[var(--g-paper)] transition-colors">Initialization</a></li>
                    <li><a href="#compliance" className="text-[var(--g-muted)] hover:text-[var(--g-paper)] transition-colors">Compliance API</a></li>
                    <li><a href="#migration" className="text-[var(--g-muted)] hover:text-[var(--g-paper)] transition-colors">Migration Builder</a></li>
                  </ul>
                </div>
                <div>
                  <h3 className="g-label mb-4">Resources</h3>
                  <ul className="space-y-3 text-[var(--g-text-sm)]">
                    <li className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-[var(--g-gold)]" />
                      <a href="/docs" className="text-[var(--g-muted)] hover:text-[var(--g-paper)] transition-colors">Documentation</a>
                    </li>
                    <li className="flex items-center gap-2">
                      <Github className="h-4 w-4 text-[var(--g-gold)]" />
                      <a href="https://github.com/AbZe628/gravitas-protocol" className="text-[var(--g-muted)] hover:text-[var(--g-paper)] transition-colors">GitHub Repository</a>
                    </li>
                  </ul>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <div className="lg:col-span-9 space-y-24">
              {/* Installation */}
              <section id="installation" className="scroll-mt-32">
                <div className="flex items-center gap-3 mb-8">
                  <Terminal className="h-6 w-6 text-[var(--g-gold)]" />
                  <h2 className="text-[var(--g-text-xl)] font-bold">Installation</h2>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <CodeBlock code="npm install @gravitas/sdk" language="npm" />
                  <CodeBlock code="yarn add @gravitas/sdk" language="yarn" />
                  <CodeBlock code="pnpm add @gravitas/sdk" language="pnpm" />
                </div>
              </section>

              {/* Initialization */}
              <section id="initialization" className="scroll-mt-32">
                <div className="flex items-center gap-3 mb-4">
                  <Code2 className="h-6 w-6 text-[var(--g-gold)]" />
                  <h2 className="text-[var(--g-text-xl)] font-bold">GravitasClient</h2>
                </div>
                <p className="g-prose text-[var(--g-paper-dim)] mb-8">The main entry point for all SDK interactions. Requires RPC and registry configuration.</p>
                <CodeBlock
                  title="Initialize client"
                  code={`import { GravitasClient } from '@gravitas/sdk';

const client = new GravitasClient({
  rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
  chainId: 421614,
  registryAddress: '0xbcaE3069362B0f0b80f44139052f159456C84679',
  teleportV3Address: '0x5D423f8d01539B92D3f3953b91682D9884D1E993',
});`}
                />
              </section>

              {/* Compliance API */}
              <section id="compliance" className="scroll-mt-32">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="h-6 w-6 text-[var(--g-gold)]" />
                  <h2 className="text-[var(--g-text-xl)] font-bold">Compliance API</h2>
                </div>
                <p className="g-prose text-[var(--g-paper-dim)] mb-8">Pre-flight Shariah compliance checks before any migration execution.</p>
                <CodeBlock
                  title="compliance.ts"
                  code={`const compliance = client.compliance();

// Check if an asset is Shariah-compliant
const isCompliant = await compliance.isAssetCompliant(
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' // USDC
);

// Run full pre-flight check
await compliance.preflight({
  tokenA: '0x...',
  tokenB: '0x...',
  executor: '0x...',
});`}
                />
              </section>

              {/* Migration Builder */}
              <section id="migration" className="scroll-mt-32">
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="h-6 w-6 text-[var(--g-gold)]" />
                  <h2 className="text-[var(--g-text-xl)] font-bold">Migration Builder</h2>
                </div>
                <p className="g-prose text-[var(--g-paper-dim)] mb-8">Fluent builder API for constructing and executing atomic migrations with EIP-712 signatures.</p>
                <div className="space-y-6">
                  <CodeBlock
                    title="V3 Migration Flow"
                    code={`const migration = client.migration()
  .tokenId(123n)
  .newFee(3000)
  .ticks(-887220, 887220)
  .slippage(0n, 0n, 0n, 0n)
  .deadline(BigInt(Math.floor(Date.now() / 1000) + 3600));

// Sign and execute
const nonce = await migration.getNonce(userAddress);
const signature = await migration.sign(signer, nonce);
const tx = await migration.execute(signature);`}
                  />
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-[var(--g-navy)] border-t border-[var(--g-line)] py-12 mt-20">
        <div className="container px-6 mx-auto max-w-7xl flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="text-[var(--g-text-xs)] text-[var(--g-muted)]">
            © 2026 Gravitas Protocol. Type-safe institutional DeFi.
          </div>
          <div className="flex gap-6 text-[var(--g-text-xs)] text-[var(--g-muted)]">
            <a href="https://github.com/AbZe628/gravitas-protocol" className="hover:text-[var(--g-paper)] transition-colors">GitHub</a>
            <a href="/docs" className="hover:text-[var(--g-paper)] transition-colors">Documentation</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
