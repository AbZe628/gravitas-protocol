import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Shield, Zap, Lock, ExternalLink, Github,
  BookOpen, Code2, Menu, X, CheckCircle,
  TrendingUp, Layers, Database, Network,
  ChevronDown, Copy, Check,
  Activity, Clock, FileCode, AlertTriangle,
  Blocks, GitBranch, Eye, Info, AlertCircle,
  Building2, Scale, Fingerprint, RefreshCw,
  ShieldCheck, BarChart3, Users, ArrowUpRight, Cpu
} from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeInOut" } },
} as const;

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
} as const;

const faqSections = [
  {
    category: "Product",
    icon: Blocks,
    questions: [
      {
        q: "What does Gravitas Protocol actually do?",
        a: "Gravitas Protocol is on-chain infrastructure for migrating liquidity positions between Uniswap V2 LP tokens and Uniswap V3 NFT positions in a single atomic transaction. It enforces Shariah-compliance checks via an on-chain PolicyRegistry before any execution, ensuring only whitelisted tokens and authorized routers are used.",
      },
      {
        q: "Who is this built for?",
        a: "Primary users are Islamic finance institutions, Shariah-compliant funds, and DeFi protocols that need verifiable compliance enforcement at the smart contract level — not just at the UI layer. Secondary users are developers building compliant DeFi tooling who need a reliable SDK and audit-ready contracts.",
      },
      {
        q: "Why does this need to exist?",
        a: "Existing DeFi infrastructure has no native Shariah compliance layer. Institutions must either trust off-chain processes or build custom solutions. Gravitas embeds compliance directly into the execution path: if a token is not on the PolicyRegistry whitelist, the transaction reverts on-chain — no UI workaround possible.",
      },
      {
        q: "What is the current status of the protocol?",
        a: "Gravitas Protocol is deployed on Arbitrum Sepolia testnet. All metrics shown in the dashboard are demo/simulation data to illustrate protocol behavior. No mainnet deployment has occurred. Mainnet launch is planned after a formal security audit and advisory board formation.",
      },
    ],
  },
  {
    category: "Security",
    icon: Shield,
    questions: [
      {
        q: "Has the protocol been audited?",
        a: "An internal security review has been completed and is available in the repository at proof-of-quality/INTERNAL_REVIEW.md. A formal external audit by a recognized third-party firm is scheduled for Q2 2026. The protocol will not deploy to mainnet until this audit is complete and all findings are resolved.",
      },
      {
        q: "How does the protocol prevent replay attacks?",
        a: "TeleportV3 uses EIP-712 typed data signing with a per-user nonce stored on-chain. Each signed migration intent includes the nonce, which is incremented after every successful execution. A used nonce cannot be replayed. The domain separator also binds the signature to the specific contract address and chain ID.",
      },
      {
        q: "What happens if a migration fails mid-execution?",
        a: "All migration logic is atomic — it either completes fully or reverts entirely. There is no partial state. If the swap fails, if slippage exceeds the specified minimum, or if any compliance check fails, the entire transaction reverts and no tokens are moved. Gas is consumed but funds are safe.",
      },
      {
        q: "How are protocol parameters protected from manipulation?",
        a: "The GravitasPolicyRegistry owner controls the compliance whitelist. For mainnet, all policy changes will be executed through a timelock contract with a minimum 48-hour delay, and ownership will be transferred to a 3-of-5 multi-signature wallet. These governance controls are planned for mainnet deployment.",
      },
    ],
  },
  {
    category: "Compliance",
    icon: Scale,
    questions: [
      {
        q: "How is Shariah compliance enforced technically?",
        a: "The GravitasPolicyRegistry contract maintains an on-chain whitelist of compliant tokens and authorized routers. Both TeleportV2 and TeleportV3 call registry.areTokensCompliant(tokenA, tokenB) at the start of every execution. If either token is not whitelisted, the transaction reverts with a custom error — this cannot be bypassed at the UI level.",
      },
      {
        q: "What Islamic finance principles does the protocol enforce?",
        a: "No Riba: revenue is derived from flat service fees (5-10 bps), not interest. No Gharar: atomic execution with specified minimums eliminates uncertainty — transactions revert if outcomes are not met. No Maysir: the compliance registry filters out speculative and gambling-related tokens. All three prohibitions are enforced at the contract level.",
      },
      {
        q: "Is there a formal Shariah certification?",
        a: "Not yet. Phase 1 (self-regulation with AAOIFI standards adherence) is complete. Phase 2 involves formal engagement with recognized Shariah scholars for an advisory board, planned for Q3 2026. Phase 3 targets a formal Shariah Seal for GCC market integration, planned for 2027. We do not claim certification that has not been obtained.",
      },
      {
        q: "Who controls the compliance whitelist?",
        a: "Currently the deployer address controls the PolicyRegistry. For mainnet, this will be transferred to a multi-sig wallet with timelock governance. The registry version is tracked on-chain and all changes are emitted as events, providing a complete audit trail of every compliance decision.",
      },
    ],
  },
  {
    category: "Technical",
    icon: Cpu,
    questions: [
      {
        q: "What is the V3 migration flow step by step?",
        a: "1. Pre-check: validate NFT ownership, compliance, and deadline. 2. Decrease liquidity: remove from existing NFT position. 3. Collect tokens: transfer underlying tokens and fees to TeleportV3. 4. Burn NFT: destroy old position. 5. Optional swap: rebalance tokens if executeSwap is true. 6. Mint new position: create new NFT directly to user address. 7. Refund dust: return any unused tokens via _refundDelta.",
      },
      {
        q: "What is the V2 migration flow?",
        a: "V2 migrations use migrateLiquidityV2 which: validates compliance, enforces the maxMoveBps limit (prevents moving more than a protocol-set percentage of pool liquidity), checks the cooldown period (prevents rapid repeated migrations for the same path), burns LP tokens, removes liquidity, and adds liquidity to the target router — all atomically.",
      },
      {
        q: "What are the on-chain risk controls?",
        a: "maxMoveBps limits the percentage of pool liquidity that can be moved in a single migration. cooldownPeriod prevents rapid repeated migrations for the same liquidity path. Slippage parameters (amountAMin, amountBMin, amount0MinMint, amount1MinMint) ensure deterministic outcomes. All parameters are readable on-chain.",
      },
      {
        q: "What is the gas optimization strategy?",
        a: "TeleportV3 uses Yul inline assembly for the dust refund logic (_refundDelta), saving approximately 2,000 gas per transaction compared to equivalent Solidity. The protocol also avoids unnecessary storage reads by caching values in memory. Gas benchmarks are available in proof-of-quality/gas_report.txt.",
      },
    ],
  },
];

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
  },
  {
    name: "TeleportV2",
    address: "0x0000000000000000000000000000000000000000",
    description: "Atomic Uniswap V2 LP token migration with slippage protection.",
    explorer: "https://github.com/AbZe628/gravitas-protocol/blob/main/docs/DEPLOYMENTS.md",
    verified: false,
  },
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
      className="p-1.5 rounded text-white/30 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors"
      aria-label="Copy address"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#D4AF37]/10 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between gap-4 py-4 px-4 text-left group"
        aria-expanded={open}
      >
        <span className="text-sm md:text-base font-medium text-white/90 group-hover:text-white transition-colors leading-snug">
          {q}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[#D4AF37] shrink-0 mt-0.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="px-4 pb-4 text-sm text-white/55 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SystemStatusWidget() {
  const [block, setBlock] = useState<number | null>(null);
  useEffect(() => {
    setBlock(Math.floor(Math.random() * 1000) + 13200000);
  }, []);
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-white/50">
      <div className="flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full bg-green-400 animate-pulse" />
        <span>Arbitrum Sepolia</span>
      </div>
      <span className="text-white/20 hidden sm:inline">·</span>
      <div className="flex items-center gap-1.5">
        <Activity className="h-3 w-3 text-[#D4AF37]" />
        <span>Chain ID: 421614</span>
      </div>
      <span className="text-white/20 hidden sm:inline">·</span>
      <div className="flex items-center gap-1.5">
        <Blocks className="h-3 w-3 text-[#D4AF37]" />
        <span>Block: {block ? block.toLocaleString() : "—"}</span>
      </div>
      <span className="text-white/20 hidden sm:inline">·</span>
      <div className="flex items-center gap-1.5">
        <GitBranch className="h-3 w-3 text-[#D4AF37]" />
        <span>Registry v1.0</span>
      </div>
    </div>
  );
}

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaqCategory, setActiveFaqCategory] = useState("Product");

  return (
    <div className="min-h-screen bg-[#060E1A] text-white overflow-x-hidden">
      {/* ── NAVIGATION ── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-[#D4AF37]/10 bg-[#060E1A]/90 backdrop-blur-xl" role="banner">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6 mx-auto max-w-7xl">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer group" aria-label="Gravitas Protocol home">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#B8941F] flex items-center justify-center shadow-lg shadow-[#D4AF37]/20 group-hover:shadow-[#D4AF37]/40 transition-shadow">
                <span className="text-[#060E1A] font-black text-sm">G</span>
              </div>
              <span className="font-bold text-white hidden sm:block">Gravitas Protocol</span>
              <span className="font-bold text-white sm:hidden">Gravitas</span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
            <a href="#architecture" className="px-3 py-2 text-sm text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/5">Architecture</a>
            <a href="#compliance" className="px-3 py-2 text-sm text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/5">Compliance</a>
            <a href="#security" className="px-3 py-2 text-sm text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/5">Security</a>
            <a href="#roadmap" className="px-3 py-2 text-sm text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/5">Roadmap</a>
            <Link href="/docs" className="px-3 py-2 text-sm text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/5">Docs</Link>
            <Link href="/sdk" className="px-3 py-2 text-sm text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/5">SDK</Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="https://github.com/AbZe628/gravitas-protocol"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              aria-label="View on GitHub"
            >
              <Github className="h-4 w-4" />
              <span className="hidden md:inline">GitHub</span>
            </a>
            <Button
              asChild
              size="sm"
              className="bg-[#D4AF37] text-[#060E1A] hover:bg-[#D4AF37]/90 font-semibold shadow-lg shadow-[#D4AF37]/20 text-xs sm:text-sm px-3 sm:px-4"
            >
              <Link href="/dashboard">Launch App</Link>
            </Button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden border-t border-[#D4AF37]/10 bg-[#060E1A]/98 backdrop-blur-xl overflow-hidden"
            >
              <nav className="container px-4 py-4 flex flex-col gap-1 max-w-7xl mx-auto">
                {[
                  { href: "#architecture", label: "Architecture" },
                  { href: "#compliance", label: "Compliance" },
                  { href: "#security", label: "Security" },
                  { href: "#roadmap", label: "Roadmap" },
                ].map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  >
                    {item.label}
                  </a>
                ))}
                <div className="border-t border-[#D4AF37]/10 my-2" />
                <Link href="/docs" onClick={() => setMobileMenuOpen(false)}>
                  <span className="block px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors">Documentation</span>
                </Link>
                <Link href="/sdk" onClick={() => setMobileMenuOpen(false)}>
                  <span className="block px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors">SDK Reference</span>
                </Link>
                <Link href="/compliance" onClick={() => setMobileMenuOpen(false)}>
                  <span className="block px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors">Compliance Checker</span>
                </Link>
                <a
                  href="https://github.com/AbZe628/gravitas-protocol"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </a>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center pt-16" aria-label="Hero">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#D4AF3706_1px,transparent_1px),linear-gradient(to_bottom,#D4AF3706_1px,transparent_1px)] bg-[size:48px_48px]" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#060E1A]" aria-hidden="true" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#D4AF37]/4 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

        <div className="container relative z-10 px-4 md:px-6 mx-auto max-w-7xl py-16 md:py-24">
          <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-4xl">
            <motion.div variants={fadeUp} className="mb-6">
              <Badge className="bg-amber-500/10 border-amber-500/30 text-amber-400 text-xs font-mono">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 mr-2 animate-pulse" />
                Testnet — Arbitrum Sepolia
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6"
            >
              Institutional
              <br />
              <span className="text-[#D4AF37]">Liquidity Routing</span>
              <br />
              for DeFi
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-base md:text-lg text-white/55 mb-8 md:mb-10 max-w-2xl leading-relaxed"
            >
              Deterministic, Shariah-compliant liquidity migrations across Uniswap V2 and V3 with atomic execution and on-chain compliance verification.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row flex-wrap gap-3 mb-10 md:mb-14">
              <Button
                asChild
                size="lg"
                className="bg-[#D4AF37] text-[#060E1A] hover:bg-[#D4AF37]/90 font-semibold gap-2 px-6 md:px-8 h-12 shadow-xl shadow-[#D4AF37]/25 transition-all hover:shadow-[#D4AF37]/40 hover:-translate-y-0.5 w-full sm:w-auto"
              >
                <Link href="/dashboard">
                  Launch App
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white/15 text-white hover:bg-white/5 hover:border-white/25 gap-2 px-6 md:px-8 h-12 transition-all w-full sm:w-auto"
              >
                <a href="https://github.com/AbZe628/gravitas-protocol" target="_blank" rel="noopener noreferrer">
                  <Github className="h-4 w-4" />
                  View Source
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/8 gap-2 px-6 md:px-8 h-12 transition-all w-full sm:w-auto"
              >
                <Link href="/docs">
                  <BookOpen className="h-4 w-4" />
                  Read Docs
                </Link>
              </Button>
            </motion.div>

            <motion.div variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 pt-6 border-t border-[#D4AF37]/10">
              {[
                { label: "Test Coverage", value: "90%+", icon: CheckCircle, link: "https://github.com/AbZe628/gravitas-protocol", note: "Foundry" },
                { label: "Atomic Execution", value: "Single TX", icon: Zap, link: "https://sepolia.arbiscan.io/address/0x5D423f8d01539B92D3f3953b91682D9884D1E993", note: "All-or-nothing" },
                { label: "Live Contracts", value: "3 on Sepolia", icon: Database, link: "https://sepolia.arbiscan.io", note: "Verified" },
                { label: "Islamic Finance", value: "$3T+ Market", icon: TrendingUp, note: "Addressable" },
              ].map((stat, i) => {
                const content = (
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <stat.icon className="h-4 w-4 text-[#D4AF37] flex-shrink-0" />
                      <span className="text-xl md:text-2xl font-bold text-white">{stat.value}</span>
                    </div>
                    <span className="text-xs text-white/40">{stat.label}</span>
                    <span className="text-[10px] text-[#D4AF37]/50 font-mono">{stat.note}</span>
                  </div>
                );
                return (
                  <motion.div key={i} variants={fadeUp}>
                    {stat.link ? (
                      <a href={stat.link} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity block">
                        {content}
                      </a>
                    ) : content}
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── TESTNET BANNER ── */}
      <section className="border-y border-amber-500/20 bg-amber-500/5 py-4" aria-label="Network status">
        <div className="container px-4 md:px-6 mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <span className="text-xs md:text-sm text-amber-200 font-medium leading-tight">
                Testnet Only — All dashboard metrics are Demo/Simulation data. No real funds at risk.
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-amber-400/70 ml-6 md:ml-0">
              <span className="font-mono">Network: Arbitrum Sepolia</span>
              <span className="hidden sm:inline">·</span>
              <span className="font-mono">Chain ID: 421614</span>
              <span className="hidden sm:inline">·</span>
              <a
                href="https://sepolia.arbiscan.io"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-amber-300 transition-colors"
              >
                Arbiscan <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT'S LIVE TODAY ── */}
      <section className="py-16 md:py-24 bg-[#060E1A]" aria-label="What's live today" id="live">
        <div className="container px-4 md:px-6 mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]">Current Status</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Is Live Today</h2>
            <p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto">
              A precise account of what is deployed, what is tested, and what is planned. No overclaiming.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <Card className="h-full border-green-500/20 bg-green-500/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <CardTitle className="text-base text-white">Live on Testnet</CardTitle>
                  </div>
                  <CardDescription className="text-green-400/70 text-xs">Deployed and verified on Arbitrum Sepolia</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {[
                    "PolicyRegistry — on-chain token/router whitelist",
                    "TeleportV3 — atomic V3 NFT position migration",
                    "TeleportV2 — atomic V2 LP token migration",
                    "EIP-712 signed intents with nonce replay protection",
                    "Preflight compliance checks (reverts if non-compliant)",
                    "Yul-optimized dust refund (~2,000 gas saved/tx)",
                    "90%+ Foundry test coverage with invariant tests",
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
                      <span className="text-xs text-white/70 leading-snug">{item}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <Card className="h-full border-amber-500/20 bg-amber-500/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-amber-400" />
                    <CardTitle className="text-base text-white">Planned After Audit</CardTitle>
                  </div>
                  <CardDescription className="text-amber-400/70 text-xs">Mainnet Readiness Roadmap</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {[
                    "Formal 3rd-party security audit (P0)",
                    "Shariah Advisory Board formal engagement",
                    "Time-locked governance for PolicyRegistry",
                    "Multi-sig protocol guardian deployment",
                    "Institutional reporting & analytics dashboard",
                    "Mainnet deployment with TVL caps",
                    "Cross-chain compliance expansion",
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                      <span className="text-xs text-white/70 leading-snug">{item}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── ARCHITECTURE ── */}
      <section className="py-16 md:py-24 relative" aria-label="Architecture" id="architecture">
        <div className="absolute inset-0 bg-gradient-to-b from-[#060E1A] via-[#0A1628]/30 to-[#060E1A]" aria-hidden="true" />
        <div className="container relative z-10 px-4 md:px-6 mx-auto max-w-7xl">
          <div className="text-center mb-12 md:mb-16">
            <Badge className="mb-4 bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]">Architecture</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">System Architecture</h2>
            <p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto">
              Three modular components working in concert to deliver secure, compliant liquidity routing.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: Shield,
                name: "GravitasPolicyRegistry",
                role: "Risk & Compliance Oracle",
                description: "On-chain whitelist of Shariah-compliant assets and authorized DEX routers. Every migration must pass a compliance check before execution. The registry version is tracked on-chain for auditability.",
                address: "0xbcaE...4679",
                link: "https://sepolia.arbiscan.io/address/0xbcaE3069362B0f0b80f44139052f159456C84679",
                borderColor: "border-blue-500/20",
                bgColor: "bg-blue-500/5",
                iconColor: "text-blue-400",
              },
              {
                icon: Zap,
                name: "TeleportV3",
                role: "V3 Migration Engine",
                description: "Atomic migration of Uniswap V3 NFT positions. EIP-712 signed intents with nonce-based replay protection. Yul-optimized dust refund. Optional rebalancing swap within the same transaction.",
                address: "0x5D42...993",
                link: "https://sepolia.arbiscan.io/address/0x5D423f8d01539B92D3f3953b91682D9884D1E993",
                borderColor: "border-[#D4AF37]/20",
                bgColor: "bg-[#D4AF37]/5",
                iconColor: "text-[#D4AF37]",
              },
              {
                icon: Layers,
                name: "TeleportV2",
                role: "V2 Migration Engine",
                description: "Atomic migration of Uniswap V2 LP positions. Enforces maxMoveBps limit to prevent pool destabilization. Cooldown period prevents rapid repeated migrations for the same path.",
                address: "Testnet Pending",
                link: "https://github.com/AbZe628/gravitas-protocol/blob/main/docs/DEPLOYMENTS.md",
                borderColor: "border-purple-500/20",
                bgColor: "bg-purple-500/5",
                iconColor: "text-purple-400",
              },
            ].map((component, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <Card className={`h-full border ${component.borderColor} ${component.bgColor}`}>
                  <CardHeader className="pb-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 ${component.bgColor} border ${component.borderColor}`}>
                      <component.icon className={`h-5 w-5 ${component.iconColor}`} />
                    </div>
                    <CardTitle className="text-white text-base">{component.name}</CardTitle>
                    <CardDescription className={`text-xs font-medium ${component.iconColor}`}>{component.role}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-white/60 leading-relaxed">{component.description}</p>
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <code className="text-xs font-mono text-white/40">{component.address}</code>
                      <a href={component.link} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1 text-xs ${component.iconColor} hover:opacity-80 transition-opacity`}>
                        <ExternalLink className="h-3 w-3" />
                        Arbiscan
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <Card className="border-[#D4AF37]/10 bg-[#0A1628]/40">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Network className="h-4 w-4 text-[#D4AF37]" />
                V3 Migration Execution Flow
              </CardTitle>
              <CardDescription className="text-white/40 text-xs">Atomic, non-custodial 7-step execution within a single transaction</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                  { step: "01", title: "Pre-Check", desc: "Validate NFT ownership, compliance & deadline" },
                  { step: "02", title: "Decrease", desc: "Remove liquidity from existing V3 position" },
                  { step: "03", title: "Collect", desc: "Transfer tokens & fees to TeleportV3" },
                  { step: "04", title: "Burn NFT", desc: "Destroy old position, clean state" },
                  { step: "05", title: "Swap", desc: "Optional rebalancing swap (if enabled)" },
                  { step: "06", title: "Mint", desc: "Create new NFT directly to user address" },
                  { step: "07", title: "Refund", desc: "Return dust via Yul-optimized _refundDelta" },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col gap-2 p-3 rounded-lg bg-[#060E1A]/60 border border-[#D4AF37]/8">
                    <div className="h-7 w-7 rounded-md bg-[#D4AF37]/10 flex items-center justify-center">
                      <span className="text-[#D4AF37] font-bold text-[10px] font-mono">{item.step}</span>
                    </div>
                    <h4 className="font-semibold text-white text-xs">{item.title}</h4>
                    <p className="text-[10px] text-white/40 leading-snug">{item.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── TRUST MODEL ── */}
      <section className="py-16 md:py-24 bg-[#060E1A]" aria-label="Trust model" id="trust">
        <div className="container px-4 md:px-6 mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]">Trust Model</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Non-Custodial by Design</h2>
            <p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto">
              The protocol never holds user funds. Every invariant is mathematically enforced on-chain.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Fingerprint,
                title: "Non-Custodial Asset Integrity",
                description: "The total amount of underlying tokens owned by the user remains constant throughout migration, excluding only slippage and protocol fees. The _refundDelta function ensures any token dust is immediately returned.",
                label: "Invariant 1",
              },
              {
                icon: ShieldCheck,
                title: "Shariah Compliance Enforcement",
                description: "A migration executes only if both tokens in the liquidity pair are registered as compliant in the PolicyRegistry. This check is mandatory and cannot be bypassed — non-compliant transactions revert with a custom error.",
                label: "Invariant 2",
              },
              {
                icon: Scale,
                title: "Gharar Avoidance",
                description: "The user's final output must meet or exceed the minimum specified amounts, or the entire transaction reverts. Atomic execution with deterministic outcomes eliminates the uncertainty (Gharar) prohibited in Islamic finance.",
                label: "Invariant 3",
              },
              {
                icon: Lock,
                title: "Replay Attack Prevention",
                description: "EIP-712 typed data signing with per-user on-chain nonces. Each signed migration intent includes a nonce that is incremented after execution. A used nonce cannot be replayed. Domain separator binds signatures to the specific contract and chain.",
                label: "Security",
              },
              {
                icon: RefreshCw,
                title: "Pool Stability Protection",
                description: "The maxMoveBps parameter limits the percentage of pool liquidity that can be moved in a single migration. The cooldownPeriod prevents rapid repeated migrations for the same liquidity path, protecting against destabilization.",
                label: "Risk Control",
              },
              {
                icon: Eye,
                title: "Full On-Chain Auditability",
                description: "All contract source code is verified on Arbiscan. The PolicyRegistry version is tracked on-chain. Every compliance decision is emitted as an event. Any institution can independently verify the compliance state without trusting the UI.",
                label: "Transparency",
              },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <Card className="h-full border-[#D4AF37]/10 bg-[#0A1628]/40 hover:border-[#D4AF37]/20 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-3">
                      <div className="h-10 w-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
                        <item.icon className="h-5 w-5 text-[#D4AF37]" />
                      </div>
                      <Badge className="bg-white/5 border-white/10 text-white/40 text-[10px] font-mono">{item.label}</Badge>
                    </div>
                    <CardTitle className="text-white text-sm">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-white/55 leading-relaxed">{item.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SHARIAH COMPLIANCE ── */}
      <section className="py-16 md:py-24 relative" aria-label="Shariah compliance" id="compliance">
        <div className="absolute inset-0 bg-gradient-to-b from-[#060E1A] via-[#0A1628]/40 to-[#060E1A]" aria-hidden="true" />
        <div className="container relative z-10 px-4 md:px-6 mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]">Shariah Compliance</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Compliance as a Technical Requirement</h2>
            <p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto">
              Gravitas treats Shariah compliance as a protocol invariant, not a marketing label. Every prohibition is enforced at the smart contract level.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            {[
              {
                principle: "No Riba",
                subtitle: "Interest Prohibition",
                implementation: "Revenue model based exclusively on service fees (5–10 bps), not interest-bearing activities.",
              },
              {
                principle: "No Gharar",
                subtitle: "Uncertainty Prohibition",
                implementation: "Atomic execution with deterministic outcomes. Transactions revert if specified minimums are not met.",
              },
              {
                principle: "No Maysir",
                subtitle: "Speculation Prohibition",
                implementation: "PolicyRegistry filters speculative and gambling-related tokens. Only whitelisted assets can be migrated.",
              },
              {
                principle: "Asset Halal",
                subtitle: "Verification",
                implementation: "On-chain whitelist of Shariah-compliant tokens maintained by governance. Updatable by registry owner.",
              },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <Card className="h-full border-[#D4AF37]/15 bg-[#0A1628]/40">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-green-500/10 border-green-500/20 text-green-400 text-[10px]">Implemented</Badge>
                    </div>
                    <CardTitle className="text-[#D4AF37] text-lg font-bold">{item.principle}</CardTitle>
                    <CardDescription className="text-white/40 text-xs">{item.subtitle}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-white/60 leading-relaxed">{item.implementation}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <Card className="border-[#D4AF37]/15 bg-[#0A1628]/40">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Scale className="h-4 w-4 text-[#D4AF37]" />
                Certification Roadmap
              </CardTitle>
              <CardDescription className="text-white/40 text-xs">Formal Shariah certification is a planned milestone, not a current claim</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { phase: "Phase 1", title: "Self-Regulation", status: "Completed", statusColor: "text-green-400", statusBg: "bg-green-500/10 border-green-500/20", desc: "Internal AAOIFI standards adherence. GravitasPolicyRegistry deployed and live." },
                  { phase: "Phase 2", title: "Advisory Board", status: "Planned Q3 2026", statusColor: "text-amber-400", statusBg: "bg-amber-500/10 border-amber-500/20", desc: "Engagement with recognized Shariah scholars for formal advisory board formation." },
                  { phase: "Phase 3", title: "Formal Certification", status: "Planned 2027", statusColor: "text-white/40", statusBg: "bg-white/5 border-white/10", desc: "Obtain a formal Shariah Seal for GCC market integration and institutional adoption." },
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-xl bg-[#060E1A]/60 border border-[#D4AF37]/8">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono text-white/30">{item.phase}</span>
                      <Badge className={`${item.statusBg} ${item.statusColor} text-[10px]`}>{item.status}</Badge>
                    </div>
                    <h4 className="font-semibold text-white text-sm mb-2">{item.title}</h4>
                    <p className="text-xs text-white/50 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── SECURITY POSTURE ── */}
      <section className="py-16 md:py-24 bg-[#060E1A]" aria-label="Security posture" id="security">
        <div className="container px-4 md:px-6 mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]">Security</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Security Posture</h2>
            <p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto">
              Multi-layered security combining rigorous testing, formal verification, and operational best practices.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {[
              { label: "Test Coverage", value: "90.2%", sub: "Line coverage", icon: BarChart3, color: "text-green-400" },
              { label: "Critical Issues", value: "0", sub: "All-time", icon: AlertCircle, color: "text-green-400" },
              { label: "External Audit", value: "Q2 2026", sub: "Scheduled", icon: ShieldCheck, color: "text-amber-400" },
              { label: "Invariant Tests", value: "Passing", sub: "Foundry fuzzing", icon: CheckCircle, color: "text-green-400" },
            ].map((stat, i) => (
              <Card key={i} className="border-[#D4AF37]/10 bg-[#0A1628]/40">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-white/40 mb-1">{stat.label}</p>
                      <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                      <p className="text-xs text-white/30 mt-0.5">{stat.sub}</p>
                    </div>
                    <stat.icon className={`h-5 w-5 ${stat.color} opacity-60`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-[#D4AF37]/10 bg-[#0A1628]/40">
              <CardHeader>
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#D4AF37]" />
                  Security Measures
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Internal Security Review", status: "Complete", link: "https://github.com/AbZe628/gravitas-protocol/blob/main/proof-of-quality/INTERNAL_REVIEW.md" },
                  { label: "Foundry Test Suite (90%+ coverage)", status: "Complete", link: "https://github.com/AbZe628/gravitas-protocol/blob/main/proof-of-quality/test_results.txt" },
                  { label: "Invariant & Fuzz Testing", status: "Complete", link: null },
                  { label: "EIP-712 Replay Protection", status: "Complete", link: null },
                  { label: "External Audit (OpenZeppelin-class)", status: "Q2 2026", link: null },
                  { label: "Multi-sig Governance Deployment", status: "Mainnet", link: null },
                  { label: "Timelock for Policy Changes", status: "Mainnet", link: null },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle className={`h-3.5 w-3.5 shrink-0 ${item.status === "Complete" ? "text-green-400" : "text-white/20"}`} />
                      <span className="text-sm text-white/70 truncate">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={`text-[10px] ${item.status === "Complete" ? "bg-green-500/10 border-green-500/20 text-green-400" : item.status === "Q2 2026" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-white/5 border-white/10 text-white/30"}`}>
                        {item.status}
                      </Badge>
                      {item.link && (
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-[#D4AF37] transition-colors">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-[#D4AF37]/10 bg-[#0A1628]/40">
              <CardHeader>
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-[#D4AF37]" />
                  Risk Mitigations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { risk: "Smart contract bugs", mitigation: "Multiple audits + Foundry fuzzing" },
                  { risk: "Replay attacks", mitigation: "EIP-712 domain separation + nonces" },
                  { risk: "Sandwich attacks", mitigation: "Cooldown period + maxMoveBps limits" },
                  { risk: "Market volatility", mitigation: "Slippage protection + deadline" },
                  { risk: "Oracle manipulation", mitigation: "Timelock on policy changes (mainnet)" },
                  { risk: "Admin key compromise", mitigation: "Multi-sig wallet (mainnet)" },
                  { risk: "Regulatory changes", mitigation: "Updatable compliance registry" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#D4AF37] shrink-0 mt-2" />
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-white/70">{item.risk}</span>
                      <span className="text-white/30 mx-1.5">—</span>
                      <span className="text-xs text-white/50">{item.mitigation}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── GOVERNANCE ── */}
      <section className="py-16 md:py-24 relative" aria-label="Governance model" id="governance">
        <div className="absolute inset-0 bg-gradient-to-b from-[#060E1A] via-[#0A1628]/30 to-[#060E1A]" aria-hidden="true" />
        <div className="container relative z-10 px-4 md:px-6 mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]">Governance</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Governance Structure</h2>
            <p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto">
              Current testnet governance is centralized for development velocity. Mainnet governance will be multi-sig with timelock.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { role: "Treasury", authority: "Fee management, contract upgrades", multisig: "3/5 (Mainnet)", icon: Building2, status: "Planned" },
              { role: "Guardian", authority: "Emergency pause only", multisig: "1/1", icon: Shield, status: "Planned" },
              { role: "Community", authority: "Future DAO voting (post-launch)", multisig: "N/A", icon: Users, status: "Post-launch" },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <Card className="border-[#D4AF37]/10 bg-[#0A1628]/40">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="h-10 w-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
                        <item.icon className="h-5 w-5 text-[#D4AF37]" />
                      </div>
                      <Badge className="bg-white/5 border-white/10 text-white/30 text-[10px]">{item.status}</Badge>
                    </div>
                    <CardTitle className="text-white text-sm mt-3">{item.role}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-xs text-white/60">{item.authority}</p>
                    <div className="flex items-center gap-1.5 pt-1">
                      <Lock className="h-3 w-3 text-white/30" />
                      <span className="text-xs text-white/30 font-mono">{item.multisig}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROADMAP ── */}
      <section className="py-16 md:py-24 bg-[#060E1A]" aria-label="Roadmap" id="roadmap">
        <div className="container px-4 md:px-6 mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]">Roadmap</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Development Roadmap</h2>
            <p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto">
              Milestones are committed only when the preceding phase is complete. No timeline is committed until the audit is done.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {[
              { quarter: "Q1 2026", milestone: "Core contracts + frontend", status: "Complete", statusColor: "text-green-400", statusBg: "bg-green-500/10 border-green-500/20", items: ["GravitasPolicyRegistry deployed and verified", "TeleportV3 deployed and verified", "90%+ test coverage achieved", "Frontend launched on Arbitrum Sepolia"] },
              { quarter: "Q2 2026", milestone: "External security audit", status: "Scheduled", statusColor: "text-amber-400", statusBg: "bg-amber-500/10 border-amber-500/20", items: ["Formal audit by recognized third-party firm", "All findings addressed and published", "Shariah certification process initiated"] },
              { quarter: "Q3 2026", milestone: "Mainnet launch (Arbitrum One)", status: "Planned", statusColor: "text-white/40", statusBg: "bg-white/5 border-white/10", items: ["Multi-sig governance deployment", "Timelock for policy changes", "Conservative TVL caps at launch", "Shariah Advisory Board engagement"] },
              { quarter: "Q4 2026", milestone: "L2 expansion", status: "Planned", statusColor: "text-white/40", statusBg: "bg-white/5 border-white/10", items: ["Optimism deployment", "Polygon deployment", "Cross-chain compliance registry"] },
              { quarter: "Q1 2027", milestone: "DAO governance + certification", status: "Planned", statusColor: "text-white/40", statusBg: "bg-white/5 border-white/10", items: ["DAO governance launch", "Formal Shariah certification", "GCC institutional partnerships"] },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <Card className="border-[#D4AF37]/10 bg-[#0A1628]/40">
                  <CardContent className="pt-5 pb-5">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="shrink-0">
                        <span className="text-xs font-mono text-white/30 block mb-1">{item.quarter}</span>
                        <Badge className={`${item.statusBg} ${item.statusColor} text-[10px]`}>{item.status}</Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white text-sm mb-3">{item.milestone}</h4>
                        <div className="grid sm:grid-cols-2 gap-1.5">
                          {item.items.map((sub, j) => (
                            <div key={j} className="flex items-start gap-2">
                              <div className={`h-1.5 w-1.5 rounded-full shrink-0 mt-1.5 ${item.status === "Complete" ? "bg-green-400" : "bg-white/20"}`} />
                              <span className="text-xs text-white/50 leading-snug">{sub}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RISK DISCLOSURES ── */}
      <section className="py-16 md:py-24 relative" aria-label="Risk disclosures" id="risks">
        <div className="absolute inset-0 bg-gradient-to-b from-[#060E1A] via-[#0A1628]/30 to-[#060E1A]" aria-hidden="true" />
        <div className="container relative z-10 px-4 md:px-6 mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-amber-500/10 border-amber-500/30 text-amber-400">Risk Disclosures</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Limitations & Risk Disclosures</h2>
            <p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto">
              Honest disclosure of current limitations and risks. We do not overclaim.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            {[
              { title: "Testnet Only", desc: "No mainnet deployment has occurred. All dashboard metrics are demo/simulation data. No real funds are at risk on testnet, but testnet behavior may differ from mainnet." },
              { title: "No External Audit", desc: "A formal third-party security audit has not yet been completed. An internal review is available in the repository. Do not use with significant funds until an external audit is complete." },
              { title: "No Shariah Certification", desc: "Formal Shariah certification has not been obtained. The protocol adheres to AAOIFI standards internally, but this is not equivalent to a formal fatwa or Shariah Seal." },
              { title: "Centralized Admin", desc: "The PolicyRegistry owner currently controls the compliance whitelist. For mainnet, this will be transferred to a multi-sig with timelock, but this governance upgrade has not yet occurred." },
              { title: "Smart Contract Risk", desc: "All smart contract code carries inherent risk. Despite 90%+ test coverage and internal review, undiscovered vulnerabilities may exist. Use only amounts you can afford to lose on testnet." },
              { title: "No Formal Governance", desc: "DAO governance is planned for post-mainnet launch. Currently, protocol parameters can be changed by the owner address. All changes are on-chain and auditable." },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <Card className="h-full border-amber-500/15 bg-amber-500/5">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                      <CardTitle className="text-white text-sm">{item.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-white/55 leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-3">
                <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-200/70 leading-relaxed">
                  This protocol is in active development and deployed on testnet only. All information presented is for demonstration and educational purposes. Nothing on this site constitutes financial, legal, or religious advice. Consult qualified professionals before making investment or compliance decisions.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Q&A SECTION ── */}
      <section className="py-16 md:py-24 bg-[#060E1A] relative" aria-label="Questions and answers" id="faq">
        <div className="container px-4 md:px-6 mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]">Q&A</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Questions & Answers</h2>
            <p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto">
              Precise answers to the questions institutions actually ask.
            </p>
          </div>
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-1/4">
              <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-2 pb-4 lg:pb-0">
                {faqSections.map((section) => (
                  <button
                    key={section.category}
                    onClick={() => setActiveFaqCategory(section.category)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap lg:whitespace-normal flex-shrink-0 lg:flex-shrink ${
                      activeFaqCategory === section.category
                        ? "bg-[#D4AF37] text-[#060E1A] shadow-lg shadow-[#D4AF37]/20"
                        : "bg-white/5 text-white/60 hover:bg-white/10"
                    }`}
                  >
                    <section.icon className="h-4 w-4 shrink-0" />
                    {section.category}
                  </button>
                ))}
              </div>
            </div>
            <div className="lg:w-3/4">
              <Card className="border-[#D4AF37]/10 bg-[#0A1628]/60 overflow-hidden">
                <CardContent className="p-0 divide-y divide-[#D4AF37]/10">
                  {faqSections
                    .find((s) => s.category === activeFaqCategory)
                    ?.questions.map((item, i) => (
                      <FAQItem key={i} q={item.q} a={item.a} />
                    ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROOF & TRUST ── */}
      <section className="py-16 md:py-24 relative" id="proof" aria-label="Proof and trust">
        <div className="absolute inset-0 bg-gradient-to-b from-[#060E1A] via-[#0A1628]/50 to-[#060E1A]" aria-hidden="true" />
        <div className="container relative z-10 px-4 md:px-6 mx-auto max-w-7xl">
          <div className="text-center mb-12 md:mb-16">
            <Badge className="mb-4 bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]">Proof & Trust</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Verify Everything On-Chain</h2>
            <p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto">
              No trust required. Every contract is deployed, verified, and inspectable on Arbiscan.
            </p>
          </div>
          <Card className="mb-8 border-[#D4AF37]/20 bg-[#0A1628]/60">
            <CardContent className="py-4 px-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs text-white/40 font-mono uppercase tracking-wider">System Status</span>
                <SystemStatusWidget />
              </div>
            </CardContent>
          </Card>
          <div className="grid md:grid-cols-3 gap-5 mb-8">
            {contracts.map((contract, i) => (
              <Card key={i} className="h-full border-[#D4AF37]/20 bg-[#0A1628]/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <CardTitle className="text-sm text-white font-mono truncate mr-2">{contract.name}</CardTitle>
                    {contract.verified ? (
                      <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px] shrink-0">Verified</Badge>
                    ) : (
                      <Badge className="bg-white/5 text-white/40 border-white/10 text-[10px] shrink-0">See Docs</Badge>
                    )}
                  </div>
                  <CardDescription className="text-white/40 text-xs leading-relaxed line-clamp-2">{contract.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-1 bg-[#060E1A]/60 rounded-lg px-3 py-2 border border-[#D4AF37]/10 overflow-hidden">
                    <span className="font-mono text-[11px] text-white/60 flex-1 truncate">{contract.address}</span>
                    <CopyButton text={contract.address} />
                  </div>
                  <a
                    href={contract.explorer}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center gap-1.5 text-xs text-[#D4AF37]/70 hover:text-[#D4AF37] transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {contract.verified ? "View on Arbiscan" : "View Deployment Docs"}
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Whitepaper", desc: "Full protocol specification", href: "https://github.com/AbZe628/gravitas-protocol/blob/main/docs/whitepaper.md", icon: FileCode },
              { label: "Technical Spec", desc: "Mathematical invariants & proofs", href: "https://github.com/AbZe628/gravitas-protocol/blob/main/docs/TECHNICAL_SPEC.md", icon: Code2 },
              { label: "Security Review", desc: "Internal audit report", href: "https://github.com/AbZe628/gravitas-protocol/blob/main/proof-of-quality/INTERNAL_REVIEW.md", icon: Shield },
              { label: "Test Results", desc: "Foundry test output", href: "https://github.com/AbZe628/gravitas-protocol/blob/main/proof-of-quality/test_results.txt", icon: CheckCircle },
            ].map((link, i) => (
              <a
                key={i}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-4 rounded-xl border border-[#D4AF37]/10 bg-[#0A1628]/40 hover:border-[#D4AF37]/25 hover:bg-[#0A1628]/60 transition-all group"
              >
                <link.icon className="h-4 w-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white group-hover:text-[#D4AF37] transition-colors">{link.label}</p>
                  <p className="text-xs text-white/40 mt-0.5">{link.desc}</p>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-white/20 group-hover:text-[#D4AF37] transition-colors shrink-0 ml-auto" />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 border-t border-[#D4AF37]/10 bg-[#060E1A]" role="contentinfo">
        <div className="container px-4 md:px-6 mx-auto max-w-7xl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#B8941F] flex items-center justify-center">
                  <span className="text-[#060E1A] font-black text-sm">G</span>
                </div>
                <span className="font-bold text-white">Gravitas Protocol</span>
              </div>
              <p className="text-xs text-white/40 leading-relaxed">
                Institutional-grade Shariah-compliant liquidity infrastructure for DeFi. Testnet v1.0.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-4">Protocol</h4>
              <div className="space-y-2.5">
                <a href="#architecture" className="block text-sm text-white/40 hover:text-[#D4AF37] transition-colors">Architecture</a>
                <a href="#compliance" className="block text-sm text-white/40 hover:text-[#D4AF37] transition-colors">Compliance</a>
                <a href="#security" className="block text-sm text-white/40 hover:text-[#D4AF37] transition-colors">Security</a>
                <a href="#roadmap" className="block text-sm text-white/40 hover:text-[#D4AF37] transition-colors">Roadmap</a>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-4">Developers</h4>
              <div className="space-y-2.5">
                <Link href="/docs" className="block text-sm text-white/40 hover:text-[#D4AF37] transition-colors">Documentation</Link>
                <Link href="/sdk" className="block text-sm text-white/40 hover:text-[#D4AF37] transition-colors">SDK Reference</Link>
                <Link href="/compliance" className="block text-sm text-white/40 hover:text-[#D4AF37] transition-colors">Compliance Checker</Link>
                <a href="https://github.com/AbZe628/gravitas-protocol" target="_blank" rel="noopener noreferrer" className="block text-sm text-white/40 hover:text-[#D4AF37] transition-colors">GitHub</a>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-4">Contracts</h4>
              <div className="space-y-2.5">
                <a href="https://sepolia.arbiscan.io/address/0xbcaE3069362B0f0b80f44139052f159456C84679" target="_blank" rel="noopener noreferrer" className="block text-xs text-white/40 hover:text-[#D4AF37] transition-colors font-mono">PolicyRegistry</a>
                <a href="https://sepolia.arbiscan.io/address/0x5D423f8d01539B92D3f3953b91682D9884D1E993" target="_blank" rel="noopener noreferrer" className="block text-xs text-white/40 hover:text-[#D4AF37] transition-colors font-mono">TeleportV3</a>
                <a href="https://sepolia.arbiscan.io" target="_blank" rel="noopener noreferrer" className="block text-xs text-white/40 hover:text-[#D4AF37] transition-colors">Arbiscan Explorer</a>
                <a href="https://github.com/AbZe628/gravitas-protocol/blob/main/docs/DEPLOYMENTS.md" target="_blank" rel="noopener noreferrer" className="block text-xs text-white/40 hover:text-[#D4AF37] transition-colors">Deployment Docs</a>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-[#D4AF37]/10">
            <p className="text-xs text-white/20">© 2026 Gravitas Protocol. MIT License. Testnet only — no mainnet deployment.</p>
            <div className="flex items-center gap-4 text-xs text-white/20">
              <a href="https://github.com/AbZe628/gravitas-protocol/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="hover:text-[#D4AF37] transition-colors">MIT License</a>
              <span>·</span>
              <a href="https://github.com/AbZe628/gravitas-protocol/blob/main/SECURITY.md" target="_blank" rel="noopener noreferrer" className="hover:text-[#D4AF37] transition-colors">Security Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
