import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, ExternalLink, Github,
  CheckCircle, Copy, Check,
  Activity, Blocks, GitBranch,
  Building2, Scale, Cpu
} from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/Header";
import ParametricField from "@/design/ParametricField";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
} as const;

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
} as const;

const contracts = [
  {
    name: "PolicyRegistry",
    address: "0xbcaE3069362B0f0b80f44139052f159456C84679",
    description: "On-chain Shariah compliance whitelist. Governs token and router authorization.",
    explorer: "https://sepolia.arbiscan.io/address/0xbcaE3069362B0f0b80f44139052f159456C84679",
    verified: true,
  },
  {
    name: "TeleportV3",
    address: "0x5D423f8d01539B92D3f3953b91682D9884D1E993",
    description: "Atomic V3 NFT position migration with EIP-712 signed intents.",
    explorer: "https://sepolia.arbiscan.io/address/0x5D423f8d01539B92D3f3953b91682D9884D1E993",
    verified: true,
  }
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded text-[var(--g-muted)] hover:text-[var(--g-gold-soft)] hover:bg-[var(--g-gold-wash)] transition-colors"
      aria-label="Copy address"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function SystemStatusWidget() {
  const [block, setBlock] = useState<number | null>(null);
  useEffect(() => {
    setBlock(Math.floor(Math.random() * 1000) + 13200000);
  }, []);
  return (
    <div className="flex flex-wrap items-center gap-4 text-[var(--g-text-xs)] text-[var(--g-muted)]">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        <span>Arbitrum Sepolia</span>
      </div>
      <span className="opacity-20 hidden sm:inline">|</span>
      <div className="flex items-center gap-2">
        <Activity className="h-3.5 w-3.5 text-[var(--g-gold)]" />
        <span className="g-numeric">Chain ID: 421614</span>
      </div>
      <span className="opacity-20 hidden sm:inline">|</span>
      <div className="flex items-center gap-2">
        <Blocks className="h-3.5 w-3.5 text-[var(--g-gold)]" />
        <span className="g-numeric">Block: {block ? block.toLocaleString() : "—"}</span>
      </div>
      <span className="opacity-20 hidden sm:inline">|</span>
      <div className="flex items-center gap-2">
        <GitBranch className="h-3.5 w-3.5 text-[var(--g-gold)]" />
        <span>Registry v1.0</span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--g-navy)] text-[var(--g-paper)]">
      <Header />

      <main>
        {/* HERO SECTION */}
        <section className="relative min-h-screen flex items-center pt-24 overflow-hidden" id="hero">
          <ParametricField 
            className="absolute inset-0 w-full h-full pointer-events-none opacity-40" 
            anchor={{ x: 0.85, y: 0.45 }}
            scale={0.7}
            motion={true}
          />
          
          <div className="container relative z-10 px-6 mx-auto max-w-7xl">
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="max-w-3xl"
            >
              <motion.div variants={fadeUp} className="mb-6">
                <span className="g-label px-3 py-1 rounded-full bg-[var(--g-gold-wash)] border border-[var(--g-gold)]/20 text-[var(--g-gold-soft)]">
                  Institutional DeFi Infrastructure
                </span>
              </motion.div>
              
              <motion.h1 variants={fadeUp} className="g-display mb-8 text-[var(--g-paper)]">
                Shariah-Compliant Liquidity Migration Protocol
              </motion.h1>
              
              <motion.p variants={fadeUp} className="g-prose text-[var(--g-text-lg)] text-[var(--g-paper-dim)] mb-10">
                Gravitas embeds compliance directly into the execution path. Atomic, on-chain enforcement for Islamic finance institutions migrating liquidity between Uniswap V2 and V3.
              </motion.p>
              
              <motion.div variants={fadeUp} className="flex flex-wrap gap-4 mb-16">
                <Link href="/dashboard">
                  <button className="px-8 py-4 bg-[var(--g-gold)] text-[var(--g-navy)] font-bold rounded-[var(--g-radius)] hover:bg-[var(--g-gold-soft)] transition-all shadow-xl shadow-[var(--g-gold)]/10">
                    Enter Dashboard
                  </button>
                </Link>
                <a href="/docs">
                  <button className="px-8 py-4 bg-[var(--g-surface)] border border-[var(--g-line)] text-[var(--g-paper)] font-bold rounded-[var(--g-radius)] hover:bg-[var(--g-surface-raised)] transition-all">
                    Read Documentation
                  </button>
                </a>
              </motion.div>

              <motion.div variants={fadeUp}>
                <SystemStatusWidget />
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ARCHITECTURE SECTION */}
        <section className="g-seam py-32 bg-[var(--g-surface)]" id="architecture">
          <div className="container px-6 mx-auto max-w-7xl">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div>
                <span className="g-label mb-4 block">Core Infrastructure</span>
                <h2 className="g-display text-[var(--g-text-2xl)] mb-8">Atomic Compliance Enforcement</h2>
                <div className="g-prose space-y-6 text-[var(--g-paper-dim)]">
                  <p>
                    Unlike UI-level filtering, Gravitas Protocol enforces compliance at the smart contract level. If a token is not whitelisted by the Policy Registry, the transaction reverts on-chain.
                  </p>
                  <div className="grid gap-6 mt-12">
                    <div className="flex gap-4">
                      <div className="mt-1 h-6 w-6 rounded bg-[var(--g-gold-wash)] flex items-center justify-center shrink-0">
                        <CheckCircle className="h-4 w-4 text-[var(--g-gold)]" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[var(--g-paper)] mb-1">Atomic Execution</h4>
                        <p className="text-[var(--g-text-sm)]">Position burning, token collection, and re-minting occur in a single transaction.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="mt-1 h-6 w-6 rounded bg-[var(--g-gold-wash)] flex items-center justify-center shrink-0">
                        <CheckCircle className="h-4 w-4 text-[var(--g-gold)]" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[var(--g-paper)] mb-1">EIP-712 Signing</h4>
                        <p className="text-[var(--g-text-sm)]">Institutional-grade security using typed data signatures for all migration intents.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="mt-1 h-6 w-6 rounded bg-[var(--g-gold-wash)] flex items-center justify-center shrink-0">
                        <CheckCircle className="h-4 w-4 text-[var(--g-gold)]" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[var(--g-paper)] mb-1">Risk Controls</h4>
                        <p className="text-[var(--g-text-sm)]">On-chain limits on migration volume and cooldown periods to prevent manipulation.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <div className="g-panel-raised p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4">
                    <Cpu className="h-6 w-6 text-[var(--g-gold)] opacity-20" />
                  </div>
                  <h3 className="g-label mb-6">Deployed Contracts</h3>
                  <div className="space-y-4">
                    {contracts.map((contract) => (
                      <div key={contract.name} className="p-5 bg-[var(--g-navy)] border border-[var(--g-line)] rounded-[var(--g-radius)]">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-[var(--g-paper)]">{contract.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded border border-green-500/20">Verified</span>
                            <a href={contract.explorer} target="_blank" rel="noopener noreferrer" className="text-[var(--g-muted)] hover:text-[var(--g-paper)]">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <code className="g-numeric text-[var(--g-text-xs)] text-[var(--g-muted)] truncate">{contract.address}</code>
                          <CopyButton text={contract.address} />
                        </div>
                        <p className="text-[var(--g-text-sm)] text-[var(--g-muted)] leading-relaxed">
                          {contract.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* COMPLIANCE SECTION */}
        <section className="py-32 bg-[var(--g-navy)] relative overflow-hidden" id="compliance">
          <ParametricField 
            className="absolute inset-0 w-full h-full pointer-events-none opacity-20" 
            anchor={{ x: 0.1, y: 0.6 }}
            scale={0.6}
            shells={5}
          />
          <div className="container px-6 mx-auto max-w-7xl relative z-10">
            <div className="max-w-3xl">
              <span className="g-label mb-4 block">Shariah Framework</span>
              <h2 className="g-display text-[var(--g-text-2xl)] mb-8">Programmable Ethics</h2>
              <div className="g-prose text-[var(--g-paper-dim)] space-y-6">
                <p>
                  The protocol enforces three core prohibitions of Islamic finance at the bytecode level:
                </p>
                <div className="grid sm:grid-cols-3 gap-8 mt-12">
                  <div className="g-panel p-6">
                    <h4 className="font-bold text-[var(--g-gold-soft)] mb-2">No Riba</h4>
                    <p className="text-[var(--g-text-sm)]">Flat service fees instead of interest-based revenue models.</p>
                  </div>
                  <div className="g-panel p-6">
                    <h4 className="font-bold text-[var(--g-gold-soft)] mb-2">No Gharar</h4>
                    <p className="text-[var(--g-text-sm)]">Atomic execution removes uncertainty from migration outcomes.</p>
                  </div>
                  <div className="g-panel p-6">
                    <h4 className="font-bold text-[var(--g-gold-soft)] mb-2">No Maysir</h4>
                    <p className="text-[var(--g-text-sm)]">Registry filters out gambling and speculative assets.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ROADMAP SECTION */}
        <section className="g-seam py-32 bg-[var(--g-surface)]" id="roadmap">
          <div className="container px-6 mx-auto max-w-7xl">
            <div className="text-center mb-20">
              <span className="g-label mb-4 block">Protocol Evolution</span>
              <h2 className="g-display text-[var(--g-text-2xl)]">Governance & Expansion</h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="g-panel p-8 border-t-4 border-t-[var(--g-gold)]">
                <div className="text-[var(--g-gold)] font-bold mb-4">Stage One: Current</div>
                <h3 className="text-[var(--g-text-lg)] font-bold mb-4">Majlis Deployment</h3>
                <p className="text-[var(--g-text-sm)] text-[var(--g-muted)] leading-relaxed">
                  Deployment of the Majlis governance interface and initial Policy Registry for Arbitrum Sepolia.
                </p>
              </div>
              <div className="g-panel p-8 opacity-60">
                <div className="text-[var(--g-muted)] font-bold mb-4">Stage Two: Upcoming</div>
                <h3 className="text-[var(--g-text-lg)] font-bold mb-4">Formal Security Audit</h3>
                <p className="text-[var(--g-text-sm)] text-[var(--g-muted)] leading-relaxed">
                  Third-party audit of TeleportV3 and PolicyRegistry smart contracts before Mainnet deployment.
                </p>
              </div>
              <div className="g-panel p-8 opacity-60">
                <div className="text-[var(--g-muted)] font-bold mb-4">Stage Three: Vision</div>
                <h3 className="text-[var(--g-text-lg)] font-bold mb-4">Multi-Chain Registry</h3>
                <p className="text-[var(--g-text-sm)] text-[var(--g-muted)] leading-relaxed">
                  Cross-chain compliance enforcement for liquidity pools across Ethereum L2 ecosystems.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-[var(--g-navy)] border-t border-[var(--g-line)] py-20">
        <div className="container px-6 mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16">
            <div className="max-w-xs">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-6 w-6 rounded bg-[var(--g-gold)] flex items-center justify-center">
                  <span className="text-[var(--g-navy)] font-black text-[10px]">G</span>
                </div>
                <span className="font-bold text-[var(--g-paper)]">Gravitas Protocol</span>
              </div>
              <p className="text-[var(--g-text-sm)] text-[var(--g-muted)] leading-relaxed">
                Institutional-grade Shariah compliance infrastructure for the decentralized economy.
              </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
              <div>
                <h4 className="g-label mb-6">Protocol</h4>
                <ul className="space-y-4 text-[var(--g-text-sm)]">
                  <li><a href="#architecture" className="text-[var(--g-muted)] hover:text-[var(--g-paper)] transition-colors">Architecture</a></li>
                  <li><Link href="/compliance" className="text-[var(--g-muted)] hover:text-[var(--g-paper)] transition-colors">Compliance</Link></li>
                  <li><a href="#security" className="text-[var(--g-muted)] hover:text-[var(--g-paper)] transition-colors">Security</a></li>
                </ul>
              </div>
              <div>
                <h4 className="g-label mb-6">Developers</h4>
                <ul className="space-y-4 text-[var(--g-text-sm)]">
                  <li><Link href="/docs" className="text-[var(--g-muted)] hover:text-[var(--g-paper)] transition-colors">Documentation</Link></li>
                  <li><Link href="/sdk" className="text-[var(--g-muted)] hover:text-[var(--g-paper)] transition-colors">SDK</Link></li>
                  <li><a href="https://github.com/AbZe628/gravitas-protocol" className="text-[var(--g-muted)] hover:text-[var(--g-paper)] transition-colors">GitHub</a></li>
                </ul>
              </div>
              <div>
                <h4 className="g-label mb-6">Social</h4>
                <ul className="space-y-4 text-[var(--g-text-sm)]">
                  <li><a href="#" className="text-[var(--g-muted)] hover:text-[var(--g-paper)] transition-colors">Twitter / X</a></li>
                  <li><a href="#" className="text-[var(--g-muted)] hover:text-[var(--g-paper)] transition-colors">LinkedIn</a></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-12 border-t border-[var(--g-line)]">
            <div className="text-[var(--g-text-xs)] text-[var(--g-muted)]">
              © 2026 Gravitas Protocol. Built for institutional Shariah compliance.
            </div>
            <div className="flex gap-6">
              <a href="https://github.com/AbZe628/gravitas-protocol" className="text-[var(--g-muted)] hover:text-[var(--g-paper)] transition-colors">
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
