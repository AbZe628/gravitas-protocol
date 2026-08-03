import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Code2, Package, Copy, CheckCheck,
  Terminal, Zap, Shield, ExternalLink, BookOpen, Github
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GeometryBackground from "@/components/GeometryBackground";
import BytecodeNotice from "@/components/BytecodeNotice";

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
    <div className="rounded-xl border border-line bg-ink overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 border-b border-line bg-surface/50">
        <span className="text-[10px] text-muted font-mono uppercase tracking-widest font-bold">{title || language}</span>
        <button onClick={copy} className="p-2 text-muted hover:text-goldsoft transition-colors">
          {copied ? <CheckCheck size={14} className="text-green-400" /> : <Copy size={14} />}
        </button>
      </div>
      <pre className="p-6 overflow-x-auto text-sm leading-relaxed scrollbar-thin">
        <code className="text-goldsoft font-mono">{code}</code>
      </pre>
    </div>
  );
}

export default function SDK() {
  return (
    <div className="min-h-screen bg-ink text-paper selection:bg-gold/30 selection:text-goldsoft">
      <Header />

      <main className="pt-20">
        {/* HERO */}
        <section className="relative py-32 md:py-48 overflow-hidden">
          <GeometryBackground className="opacity-50" />
          <div className="container relative z-10">
            <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-4xl">
              <motion.div variants={fadeUp} className="mb-10">
                <span className="px-4 py-1.5 rounded-full bg-gold/5 border border-gold/20 text-goldsoft text-[10px] uppercase tracking-[0.2em] font-bold">
                  <Package className="h-3 w-3 inline mr-2 mb-0.5" />
                  v1.0.0 Stable
                </span>
              </motion.div>
              <motion.h1 variants={fadeUp} className="display-xl mb-10">
                Gravitas SDK
              </motion.h1>
              <motion.p variants={fadeUp} className="prose-institutional text-lg md:text-xl mb-12 text-sand/80">
                A Stripe-like developer experience for institutional DeFi. Fully typed, pre-flight compliance checks, and a fluent builder API for atomic migrations.
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
                {["TypeScript", "ESM + CJS", "Ethers v6"].map((tag) => (
                  <span key={tag} className="px-4 py-1.5 bg-surface/50 border border-line rounded-lg text-[10px] uppercase tracking-widest font-bold text-muted">
                    {tag}
                  </span>
                ))}
              </motion.div>
            </motion.div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-surface hadid-sweep border-t border-gold/10" />
        </section>

        <div className="container py-32">
          <div className="grid lg:grid-cols-12 gap-24">
            {/* Sidebar / Quick Links */}
            <aside className="lg:col-span-3 hidden lg:block">
              <div className="sticky top-40 space-y-16">
                <div>
                  <h3 className="text-[10px] uppercase tracking-[0.2em] text-gold font-bold mb-8">Quick Start</h3>
                  <ul className="space-y-4">
                    {[
                      { label: "Installation", href: "#installation" },
                      { label: "Initialization", href: "#initialization" },
                      { label: "Compliance API", href: "#compliance" },
                      { label: "Migration Builder", href: "#migration" }
                    ].map((link) => (
                      <li key={link.label}>
                        <a href={link.href} className="text-sm text-muted hover:text-goldsoft transition-colors flex items-center gap-2 group">
                          <span className="h-px w-4 bg-line group-hover:w-6 group-hover:bg-gold transition-all" />
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-[10px] uppercase tracking-[0.2em] text-gold font-bold mb-8">Resources</h3>
                  <ul className="space-y-6">
                    <li className="flex items-center gap-4 group">
                      <div className="h-10 w-10 rounded-lg bg-surface border border-line flex items-center justify-center group-hover:border-gold/30 transition-colors">
                        <BookOpen size={18} className="text-gold" />
                      </div>
                      <a href="/docs" className="text-sm font-bold text-paper hover:text-gold transition-colors">Documentation</a>
                    </li>
                    <li className="flex items-center gap-4 group">
                      <div className="h-10 w-10 rounded-lg bg-surface border border-line flex items-center justify-center group-hover:border-gold/30 transition-colors">
                        <Github size={18} className="text-gold" />
                      </div>
                      <a href="https://github.com/AbZe628/gravitas-protocol" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-paper hover:text-gold transition-colors">GitHub Repository</a>
                    </li>
                  </ul>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <div className="lg:col-span-9 space-y-48">
              {/* Installation */}
              <section id="installation" className="scroll-mt-40">
                <div className="flex items-center gap-4 mb-12">
                  <div className="h-12 w-12 rounded-xl bg-gold/5 border border-gold/20 flex items-center justify-center">
                    <Terminal className="h-6 w-6 text-gold" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-display">Installation</h2>
                </div>
                <div className="grid sm:grid-cols-3 gap-6">
                  <CodeBlock code="npm install @gravitas/sdk" language="npm" />
                  <CodeBlock code="yarn add @gravitas/sdk" language="yarn" />
                  <CodeBlock code="pnpm add @gravitas/sdk" language="pnpm" />
                </div>
              </section>

              {/* Initialization */}
              <section id="initialization" className="scroll-mt-40">
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-12 w-12 rounded-xl bg-gold/5 border border-gold/20 flex items-center justify-center">
                    <Code2 className="h-6 w-6 text-gold" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-display">GravitasClient</h2>
                </div>
                <p className="prose-institutional text-lg mb-12 text-sand/70">The main entry point for all SDK interactions. Requires RPC and registry configuration.</p>
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
              <section id="compliance" className="scroll-mt-40">
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-12 w-12 rounded-xl bg-gold/5 border border-gold/20 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-gold" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-display">Compliance API</h2>
                </div>
                <p className="prose-institutional text-lg mb-12 text-sand/70">Pre-flight Shariah compliance checks before any migration execution.</p>
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
              <section id="migration" className="scroll-mt-40">
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-12 w-12 rounded-xl bg-gold/5 border border-gold/20 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-gold" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-display">Migration Builder</h2>
                </div>
                <p className="prose-institutional text-lg mb-12 text-sand/70">Fluent builder API for constructing and executing atomic migrations with EIP-712 signatures.</p>
                <div className="space-y-12">
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
                  
                  <BytecodeNotice />
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
