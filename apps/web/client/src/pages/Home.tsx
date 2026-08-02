import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Shield, ExternalLink, Github,
  CheckCircle, Copy, Check,
  Activity, Blocks, GitBranch,
  Building2, Scale, Cpu, ArrowRight
} from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GeometryBackground from "@/components/GeometryBackground";
import BytecodeNotice from "@/components/BytecodeNotice";

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
      className="p-2 rounded-md text-muted hover:text-goldsoft hover:bg-gold/5 transition-colors"
      aria-label="Copy address"
    >
      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
    </button>
  );
}

function SystemStatusWidget() {
  const [block, setBlock] = useState<number | null>(null);
  useEffect(() => {
    setBlock(Math.floor(Math.random() * 1000) + 13200000);
  }, []);
  return (
    <div className="flex flex-wrap items-center gap-6 text-xs text-muted font-medium tracking-wide uppercase">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
        <span>Arbitrum Sepolia</span>
      </div>
      <div className="h-4 w-px bg-line" />
      <div className="flex items-center gap-2">
        <Activity size={14} className="text-gold" />
        <span className="font-mono">Chain ID: 421614</span>
      </div>
      <div className="h-4 w-px bg-line" />
      <div className="flex items-center gap-2">
        <Blocks size={14} className="text-gold" />
        <span className="font-mono">Block: {block ? block.toLocaleString() : "—"}</span>
      </div>
      <div className="h-4 w-px bg-line" />
      <div className="flex items-center gap-2">
        <GitBranch size={14} className="text-gold" />
        <span>Registry v1.0</span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-ink text-paper selection:bg-gold/30 selection:text-goldsoft">
      <Header />

      <main>
        {/* HERO SECTION */}
        <section className="relative min-h-[90vh] flex items-center pt-32 pb-24 overflow-hidden" id="hero">
          <GeometryBackground className="opacity-60" />
          
          <div className="container relative z-10">
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="max-w-4xl"
            >
              <motion.div variants={fadeUp} className="mb-10">
                <span className="px-4 py-1.5 rounded-full bg-gold/5 border border-gold/20 text-goldsoft text-[10px] uppercase tracking-[0.2em] font-bold">
                  Institutional DeFi Infrastructure
                </span>
              </motion.div>
              
              <motion.h1 variants={fadeUp} className="display-xl mb-10 text-paper">
                Shariah-Compliant Liquidity <br className="hidden lg:block" />
                Migration Protocol
              </motion.h1>
              
              <motion.p variants={fadeUp} className="prose-institutional text-lg md:text-xl mb-12 text-sand/80">
                Gravitas embeds compliance directly into the execution path. Atomic, on-chain enforcement for Islamic finance institutions migrating liquidity between Uniswap V2 and V3.
              </motion.p>
              
              <motion.div variants={fadeUp} className="flex flex-wrap gap-6 mb-20">
                <Link href="/dashboard">
                  <button className="btn-primary group">
                    Enter Dashboard <ArrowRight className="ml-2 transition-transform group-hover:translate-x-1" size={18} />
                  </button>
                </Link>
                <Link href="/docs">
                  <button className="btn-secondary">
                    Read Documentation
                  </button>
                </Link>
              </motion.div>

              <motion.div variants={fadeUp}>
                <SystemStatusWidget />
              </motion.div>
            </motion.div>
          </div>
          
          {/* Hadid-style sweeping bottom edge */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-surface hadid-sweep border-t border-gold/10" />
        </section>

        {/* ARCHITECTURE SECTION */}
        <section className="relative py-32 bg-surface" id="architecture">
          <div className="container relative z-10">
            <div className="grid lg:grid-cols-2 gap-24 items-center">
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={stagger}
              >
                <motion.span variants={fadeUp} className="text-[10px] uppercase tracking-[0.2em] text-gold font-bold mb-6 block">Core Infrastructure</motion.span>
                <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl mb-10">Atomic Compliance Enforcement</motion.h2>
                <div className="space-y-12">
                  <motion.p variants={fadeUp} className="prose-institutional text-lg text-sand/70">
                    Unlike UI-level filtering, Gravitas Protocol enforces compliance at the smart contract level. If a token is not whitelisted by the Policy Registry, the transaction reverts on-chain.
                  </motion.p>
                  
                  <div className="grid gap-10">
                    {[
                      {
                        title: "Atomic Execution",
                        desc: "Position burning, token collection, and re-minting occur in a single transaction."
                      },
                      {
                        title: "EIP-712 Signing",
                        desc: "Institutional-grade security using typed data signatures for all migration intents."
                      },
                      {
                        title: "Risk Controls",
                        desc: "On-chain limits on migration volume and cooldown periods to prevent manipulation."
                      }
                    ].map((item, i) => (
                      <motion.div key={i} variants={fadeUp} className="flex gap-6">
                        <div className="mt-1 h-10 w-10 rounded-lg bg-gold/5 border border-gold/20 flex items-center justify-center shrink-0">
                          <CheckCircle className="h-5 w-5 text-gold" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-paper mb-2">{item.title}</h4>
                          <p className="text-sm text-muted leading-relaxed max-w-md">{item.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="relative"
              >
                <div className="g-panel-raised p-10 relative overflow-hidden bg-ink/40">
                  <div className="absolute top-0 right-0 p-6">
                    <Cpu className="h-8 w-8 text-gold opacity-10" />
                  </div>
                  <h3 className="text-[10px] uppercase tracking-[0.2em] text-gold font-bold mb-10">Deployed Contracts</h3>
                  <div className="space-y-6">
                    {contracts.map((contract) => (
                      <div key={contract.name} className="p-6 bg-ink border border-line rounded-xl hover:border-gold/30 transition-colors group">
                        <div className="flex justify-between items-start mb-4">
                          <span className="font-bold text-paper group-hover:text-goldsoft transition-colors">{contract.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-[9px] uppercase tracking-wider bg-green-500/10 text-green-400 px-2 py-1 rounded border border-green-500/20 font-bold">Verified</span>
                            <a href={contract.explorer} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-paper transition-colors">
                              <ExternalLink size={14} />
                            </a>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mb-4 p-2 bg-surface/50 rounded border border-line/50">
                          <code className="text-[11px] font-mono text-goldsoft truncate flex-1">{contract.address}</code>
                          <CopyButton text={contract.address} />
                        </div>
                        <p className="text-xs text-muted leading-relaxed">
                          {contract.description}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-10">
                    <BytecodeNotice />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
          
          {/* Hadid-style sweeping section boundary */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-ink hadid-sweep border-t border-gold/10" />
        </section>

        {/* COMPLIANCE SECTION */}
        <section className="relative py-32 bg-ink overflow-hidden" id="compliance">
          <GeometryBackground variant="simple" className="opacity-20 scale-150" />
          <div className="container relative z-10">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
              className="max-w-4xl"
            >
              <motion.span variants={fadeUp} className="text-[10px] uppercase tracking-[0.2em] text-gold font-bold mb-6 block">Shariah Framework</motion.span>
              <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl mb-10">Programmable Ethics</motion.h2>
              <div className="space-y-12">
                <motion.p variants={fadeUp} className="prose-institutional text-lg text-sand/70">
                  The protocol enforces three core prohibitions of Islamic finance at the bytecode level:
                </motion.p>
                <div className="grid sm:grid-cols-3 gap-8">
                  {[
                    { title: "No Riba", desc: "Flat service fees instead of interest-based revenue models." },
                    { title: "No Gharar", desc: "Atomic execution removes uncertainty from migration outcomes." },
                    { title: "No Maysir", desc: "Registry filters out gambling and speculative assets." }
                  ].map((item, i) => (
                    <motion.div key={i} variants={fadeUp} className="g-panel p-8 bg-surface/30 hover:bg-surface/50">
                      <h4 className="text-lg font-bold text-goldsoft mb-4">{item.title}</h4>
                      <p className="text-sm text-muted leading-relaxed">{item.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ROADMAP SECTION */}
        <section className="relative py-32 bg-surface" id="roadmap">
          {/* Hadid-style top sweep */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-ink hadid-sweep -scale-y-100 border-b border-gold/10" />
          
          <div className="container relative z-10 pt-16">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
              className="text-center mb-24"
            >
              <motion.span variants={fadeUp} className="text-[10px] uppercase tracking-[0.2em] text-gold font-bold mb-6 block">Protocol Evolution</motion.span>
              <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl">Governance & Expansion</motion.h2>
            </motion.div>
            
            <div className="grid md:grid-cols-3 gap-10">
              {[
                {
                  stage: "Stage One: Current",
                  title: "Majlis Deployment",
                  desc: "Deployment of the Majlis governance interface and initial Policy Registry for Arbitrum Sepolia.",
                  active: true
                },
                {
                  stage: "Stage Two: Upcoming",
                  title: "Formal Security Audit",
                  desc: "Third-party audit of TeleportV3 and PolicyRegistry smart contracts before Mainnet deployment.",
                  active: false
                },
                {
                  stage: "Stage Three: Vision",
                  title: "Multi-Chain Registry",
                  desc: "Cross-chain compliance enforcement for liquidity pools across Ethereum L2 ecosystems.",
                  active: false
                }
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className={`g-panel p-10 border-t-4 ${item.active ? 'border-t-gold bg-ink/40 shadow-xl' : 'border-t-line opacity-60'}`}
                >
                  <div className={`text-[10px] uppercase tracking-widest font-bold mb-6 ${item.active ? 'text-gold' : 'text-muted'}`}>
                    {item.stage}
                  </div>
                  <h3 className="text-xl font-bold text-paper mb-6">{item.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">
                    {item.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
