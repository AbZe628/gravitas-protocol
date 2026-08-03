import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  BookOpen, Code2, Shield, Zap, Copy, CheckCheck,
  ExternalLink, Terminal, Package, FileCode, Lock
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

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group rounded-xl border border-line bg-ink overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 border-b border-line bg-surface/50">
        <span className="text-[10px] text-muted font-mono uppercase tracking-widest font-bold">{language}</span>
        <button
          onClick={copy}
          className="p-2 text-muted hover:text-goldsoft transition-colors"
        >
          {copied ? <CheckCheck size={14} className="text-green-400" /> : <Copy size={14} />}
        </button>
      </div>
      <pre className="p-6 text-xs sm:text-sm overflow-x-auto scrollbar-thin leading-relaxed">
        <code className="text-goldsoft font-mono">{code}</code>
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
    <div className="min-h-screen bg-ink text-paper selection:bg-gold/30 selection:text-goldsoft">
      <Header />

      <div className="flex flex-col lg:flex-row pt-20">
        {/* Sidebar */}
        <aside className="hidden lg:block w-80 fixed left-0 top-20 bottom-0 border-r border-line bg-ink/40 backdrop-blur-xl overflow-y-auto">
          <div className="p-10">
            <p className="text-[10px] uppercase tracking-widest text-gold font-bold mb-10">Documentation</p>
            <nav className="space-y-3">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveSection(s.id);
                    document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl text-sm transition-all duration-200 text-left border ${
                    activeSection === s.id
                      ? "bg-gold/5 text-gold border-gold/20 font-bold"
                      : "text-muted hover:text-paper hover:bg-surface border-transparent"
                  }`}
                >
                  <s.icon size={16} className={activeSection === s.id ? "text-gold" : "text-muted"} />
                  {s.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:ml-80 min-h-screen relative overflow-hidden">
          <GeometryBackground variant="simple" className="opacity-20 -top-40 -right-40 scale-150" />
          
          <div className="max-w-4xl mx-auto px-8 md:px-16 py-32 relative z-10">
            <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-48">

              {/* Overview */}
              <motion.section variants={fadeUp} id="overview" className="scroll-mt-40">
                <span className="text-[10px] uppercase tracking-[0.2em] text-gold font-bold mb-6 block">Introduction</span>
                <h1 className="display-xl mb-10">Protocol Documentation</h1>
                <p className="prose-institutional text-lg md:text-xl mb-16 text-sand/80">
                  Gravitas Protocol is an institutional-grade, Shariah-compliant liquidity infrastructure built on Arbitrum. This documentation covers everything you need to integrate with the protocol — from the TypeScript SDK to direct contract interactions.
                </p>
                <div className="grid md:grid-cols-2 gap-8">
                  <a href="/sdk" className="g-panel p-8 bg-surface/30 hover:bg-surface/50 group transition-all">
                    <Package className="h-8 w-8 text-gold mb-6" />
                    <h3 className="text-xl font-bold text-paper group-hover:text-goldsoft transition-colors mb-4">SDK Reference</h3>
                    <p className="text-sm text-muted leading-relaxed">Full TypeScript SDK documentation and usage guides.</p>
                  </a>
                  <a href="/compliance" className="g-panel p-8 bg-surface/30 hover:bg-surface/50 group transition-all">
                    <Shield className="h-8 w-8 text-gold mb-6" />
                    <h3 className="text-xl font-bold text-paper group-hover:text-goldsoft transition-colors mb-4">Compliance API</h3>
                    <p className="text-sm text-muted leading-relaxed">Policy registry integration guide and on-chain validation.</p>
                  </a>
                </div>
              </motion.section>

              {/* Quick Start */}
              <motion.section variants={fadeUp} id="quickstart" className="scroll-mt-40">
                <div className="flex items-center gap-4 mb-12">
                  <div className="h-12 w-12 rounded-xl bg-gold/5 border border-gold/20 flex items-center justify-center">
                    <Terminal className="h-6 w-6 text-gold" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-display">Quick Start</h2>
                </div>
                <div className="space-y-16">
                  <div>
                    <h3 className="text-lg font-bold mb-6 text-paper flex items-center gap-3">
                      <span className="h-6 w-6 rounded-full bg-gold/10 text-gold flex items-center justify-center text-[10px] font-bold">1</span>
                      Install the SDK
                    </h3>
                    <CodeBlock code="npm install @gravitas/sdk" language="bash" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-6 text-paper flex items-center gap-3">
                      <span className="h-6 w-6 rounded-full bg-gold/10 text-gold flex items-center justify-center text-[10px] font-bold">2</span>
                      Initialize the client
                    </h3>
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
              <motion.section variants={fadeUp} id="contracts" className="scroll-mt-40">
                <div className="flex items-center gap-4 mb-12">
                  <div className="h-12 w-12 rounded-xl bg-gold/5 border border-gold/20 flex items-center justify-center">
                    <FileCode className="h-6 w-6 text-gold" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-display">Contract Addresses</h2>
                </div>
                <p className="prose-institutional text-lg mb-16 text-sand/70">All contracts are deployed and verified on Arbitrum Sepolia (Chain ID: 421614).</p>

                <div className="space-y-8">
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
                    <div key={i} className="g-panel-raised p-8 bg-surface/30">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-paper mb-4">{contract.name}</h4>
                          <p className="text-sm text-muted mb-8 leading-relaxed max-w-lg">{contract.desc}</p>
                          <div className="flex items-center gap-3 p-3 bg-ink rounded-xl border border-line">
                            <Lock className="h-4 w-4 text-gold opacity-40" />
                            <code className="text-xs font-mono text-goldsoft g-numeric break-all">
                              {contract.address}
                            </code>
                          </div>
                        </div>
                        <a href={contract.link} target="_blank" rel="noopener noreferrer" className="shrink-0">
                          <Button variant="outline" className="border-line text-muted hover:text-paper hover:bg-surface h-12 px-6">
                            <ExternalLink size={16} className="mr-3" />
                            Arbiscan
                          </Button>
                        </a>
                      </div>
                    </div>
                  ))}
                  
                  <div className="mt-12">
                    <BytecodeNotice />
                  </div>
                </div>
              </motion.section>

            </motion.div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
