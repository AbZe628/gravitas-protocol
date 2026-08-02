import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  BookOpen, Code2, Shield, Zap, Copy, CheckCheck,
  ExternalLink, Terminal, Package, FileCode, Lock
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

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group rounded-[var(--g-radius)] border border-[var(--g-line)] bg-[var(--g-navy)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--g-line)] bg-[var(--g-surface)]">
        <span className="text-[10px] text-[var(--g-muted)] font-mono uppercase tracking-widest">{language}</span>
        <button
          onClick={copy}
          className="p-1 text-[var(--g-muted)] hover:text-[var(--g-gold-soft)] transition-colors"
        >
          {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <pre className="p-4 text-xs sm:text-sm overflow-x-auto scrollbar-thin">
        <code className="text-[var(--g-gold-soft)] font-mono">{code}</code>
      </pre>
    </div>
  );
}

const sections = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "quickstart", label: "Quick Start", icon: Terminal },
  { id: "sdk", label: "SDK Installation", icon: Package },
  { id: "contracts", label: "Contract Addresses", icon: FileCode },
  { id: "compliance", label: "Compliance API", icon: Shield },
];

export default function Docs() {
  const [activeSection, setActiveSection] = useState("overview");

  return (
    <div className="min-h-screen bg-[var(--g-navy)] text-[var(--g-paper)]">
      <Header />

      <div className="flex flex-col lg:flex-row pt-16">
        {/* Sidebar */}
        <aside className="hidden lg:block w-72 fixed left-0 top-16 bottom-0 border-r border-[var(--g-line)] bg-[var(--g-navy)]/80 backdrop-blur-xl overflow-y-auto">
          <div className="p-8">
            <p className="g-label mb-6">Documentation</p>
            <nav className="space-y-2">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveSection(s.id);
                    document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-[var(--g-radius)] text-sm transition-all text-left ${
                    activeSection === s.id
                      ? "bg-[var(--g-gold-wash)] text-[var(--g-gold-soft)] border border-[var(--g-gold)]/20"
                      : "text-[var(--g-muted)] hover:text-[var(--g-paper)] hover:bg-[var(--g-surface)]"
                  }`}
                >
                  <s.icon className="h-4 w-4 shrink-0" />
                  {s.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:ml-72 min-h-screen relative overflow-hidden">
          <ParametricField 
            className="absolute top-0 right-0 w-[800px] h-[800px] pointer-events-none opacity-20" 
            anchor={{ x: 0.8, y: 0.2 }}
            scale={0.8}
            shells={6}
          />
          
          <div className="max-w-4xl mx-auto px-6 md:px-12 py-24 relative z-10">
            <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-32">

              {/* Overview */}
              <motion.section variants={fadeUp} id="overview" className="scroll-mt-32">
                <span className="g-label mb-4 block">Introduction</span>
                <h1 className="g-display mb-8">Protocol Documentation</h1>
                <p className="g-prose text-[var(--g-text-lg)] text-[var(--g-paper-dim)] mb-12">
                  Gravitas Protocol is an institutional-grade, Shariah-compliant liquidity infrastructure built on Arbitrum. This documentation covers everything you need to integrate with the protocol — from the TypeScript SDK to direct contract interactions.
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  <a href="/sdk" className="g-panel p-6 hover:bg-[var(--g-surface-raised)] transition-colors group">
                    <Package className="h-6 w-6 text-[var(--g-gold)] mb-4" />
                    <h3 className="font-bold text-[var(--g-paper)] group-hover:text-[var(--g-gold-soft)] transition-colors mb-2">SDK Reference</h3>
                    <p className="text-[var(--g-text-sm)] text-[var(--g-muted)]">Full TypeScript SDK documentation and usage guides.</p>
                  </a>
                  <a href="/compliance" className="g-panel p-6 hover:bg-[var(--g-surface-raised)] transition-colors group">
                    <Shield className="h-6 w-6 text-[var(--g-gold)] mb-4" />
                    <h3 className="font-bold text-[var(--g-paper)] group-hover:text-[var(--g-gold-soft)] transition-colors mb-2">Compliance API</h3>
                    <p className="text-[var(--g-text-sm)] text-[var(--g-muted)]">Policy registry integration guide and on-chain validation.</p>
                  </a>
                </div>
              </motion.section>

              {/* Quick Start */}
              <motion.section variants={fadeUp} id="quickstart" className="scroll-mt-32">
                <div className="flex items-center gap-3 mb-8">
                  <Terminal className="h-6 w-6 text-[var(--g-gold)]" />
                  <h2 className="text-[var(--g-text-xl)] font-bold">Quick Start</h2>
                </div>
                <div className="space-y-12">
                  <div>
                    <h3 className="text-[var(--g-text-base)] font-bold mb-4 text-[var(--g-paper)]">1. Install the SDK</h3>
                    <CodeBlock code="npm install @gravitas/sdk" language="bash" />
                  </div>
                  <div>
                    <h3 className="text-[var(--g-text-base)] font-bold mb-4 text-[var(--g-paper)]">2. Initialize the client</h3>
                    <CodeBlock code={`import { GravitasClient } from '@gravitas/sdk';

const client = new GravitasClient({
  rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
  chainId: 421614,
  registryAddress: '0xbcaE3069362B0f0b80f44139052f159456C84679',
  teleportV3Address: '0x5D423f8d01539B92D3f3953b91682D9884D1E993',
});`} language="typescript" />
                  </div>
                </div>
              </motion.section>

              {/* Contract Addresses */}
              <motion.section variants={fadeUp} id="contracts" className="scroll-mt-32">
                <div className="flex items-center gap-3 mb-8">
                  <FileCode className="h-6 w-6 text-[var(--g-gold)]" />
                  <h2 className="text-[var(--g-text-xl)] font-bold">Contract Addresses</h2>
                </div>
                <p className="g-prose text-[var(--g-paper-dim)] mb-10">All contracts are deployed and verified on Arbitrum Sepolia (Chain ID: 421614).</p>

                <div className="space-y-6">
                  {[
                    {
                      name: "GravitasPolicyRegistry",
                      address: "0xbcaE3069362B0f0b80f44139052f159456C84679",
                      desc: "Risk & Compliance Oracle. Validates assets, routers, and executors.",
                      link: "https://sepolia.arbiscan.io/address/0xbcaE3069362B0f0b80f44139052f159456C84679",
                    },
                    {
                      name: "TeleportV3",
                      address: "0x5D423f8d01539B92D3f3953b91682D9884D1E993",
                      desc: "Deterministic Liquidity Routing Engine for Uniswap V3 positions.",
                      link: "https://sepolia.arbiscan.io/address/0x5D423f8d01539B92D3f3953b91682D9884D1E993",
                    },
                  ].map((contract, i) => (
                    <div key={i} className="g-panel p-6">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex-1">
                          <h4 className="font-bold text-[var(--g-paper)] mb-2">{contract.name}</h4>
                          <p className="text-[var(--g-text-sm)] text-[var(--g-muted)] mb-4">{contract.desc}</p>
                          <div className="flex items-center gap-2">
                            <Lock className="h-3.5 w-3.5 text-[var(--g-gold)] opacity-40" />
                            <code className="text-xs font-mono text-[var(--g-gold-soft)] g-numeric bg-[var(--g-navy)] px-3 py-1 rounded border border-[var(--g-line)] break-all">
                              {contract.address}
                            </code>
                          </div>
                        </div>
                        <a href={contract.link} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="border-[var(--g-line)] text-[var(--g-muted)] hover:text-[var(--g-paper)]">
                            <ExternalLink className="h-3.5 w-3.5 mr-2" />
                            Arbiscan
                          </Button>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.section>

            </motion.div>
          </div>
        </main>
      </div>

      <footer className="bg-[var(--g-navy)] border-t border-[var(--g-line)] py-12 lg:ml-72">
        <div className="container px-6 mx-auto max-w-7xl flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="text-[var(--g-text-xs)] text-[var(--g-muted)]">
            © 2026 Gravitas Protocol. Institutional-grade DeFi.
          </div>
          <div className="flex gap-6 text-[var(--g-text-xs)] text-[var(--g-muted)]">
            <a href="https://github.com/AbZe628/gravitas-protocol" className="hover:text-[var(--g-paper)] transition-colors">GitHub</a>
            <a href="/sdk" className="hover:text-[var(--g-paper)] transition-colors">SDK</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
