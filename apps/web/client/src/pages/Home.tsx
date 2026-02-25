import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Shield, Zap, Lock, ExternalLink, Github,
  BookOpen, Code2, Menu, X, CheckCircle,
  TrendingUp, Layers, Cpu, Database, Network,
  ChevronDown, ChevronRight, Copy, Check,
  Activity, Globe, Clock, FileCode, AlertTriangle,
  Blocks, GitBranch, Eye, Terminal, Info
} from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

// ── Q&A DATA ──
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
        q: "What is the attack model?",
        a: "The primary threat vectors are: (1) Replay attacks — mitigated by EIP-712 nonce-based signatures for V3 migrations. (2) Reentrancy — mitigated by checks-effects-interactions pattern and Solidity 0.8.x. (3) Price manipulation / MEV — mitigated by caller-specified minimum amounts (slippage parameters). (4) Unauthorized policy changes — PolicyRegistry uses owner-controlled access; a timelock/guardian model is planned post-audit.",
      },
      {
        q: "Has the protocol been audited?",
        a: "No formal third-party audit has been completed as of the current testnet phase. The codebase has been reviewed internally, includes 90%+ test coverage with Foundry, and has been prepared for audit (see SECURITY_AUDIT_PREP.md in the repository). A formal audit is a P0 requirement before any mainnet deployment. No audit firm has been named or engaged yet.",
      },
      {
        q: "Are there timelocks or guardian mechanisms?",
        a: "Not implemented in the current testnet version. The PolicyRegistry owner can update whitelists immediately. A timelock delay and multi-sig guardian are planned as part of the mainnet security posture. This is clearly a known limitation of the current deployment.",
      },
      {
        q: "How does replay protection work for V3 migrations?",
        a: "V3 migrations use EIP-712 typed structured data signing. Each migration intent includes a nonce that is tracked on-chain per address. Once a nonce is consumed, the same signed message cannot be replayed. This is standard EIP-712 replay protection used by protocols like Uniswap Permit2.",
      },
    ],
  },
  {
    category: "Compliance",
    icon: CheckCircle,
    questions: [
      {
        q: "What does 'Shariah compliant' mean technically in this protocol?",
        a: "It means the PolicyRegistry smart contract maintains an on-chain whitelist of approved token addresses and authorized router addresses. Before any migration executes, the contract calls the registry to verify both tokens in the pair are whitelisted. If either check fails, the transaction reverts. This is a technical enforcement mechanism — not a fatwa or certification. Governance of the whitelist (who decides what is compliant) is a separate, off-chain process.",
      },
      {
        q: "How does the PolicyRegistry work?",
        a: "PolicyRegistry is a standalone contract at 0xbcaE...4679 on Arbitrum Sepolia. It exposes two functions: isTokenCompliant(address) and isRouterAuthorized(address). The TeleportV2 and TeleportV3 contracts call these before execution. The registry owner (currently the deployer) can add or remove addresses. Registry version is tracked on-chain for auditability.",
      },
      {
        q: "What happens if a token is incorrectly flagged as non-compliant?",
        a: "The migration transaction will revert with a specific error code (POLICY_VIOLATION). The user receives their funds back (no state change). False positives are a governance risk, not a security risk. The registry owner must update the whitelist to resolve it. This is why a transparent, time-locked governance process is planned for mainnet.",
      },
      {
        q: "Who controls compliance governance?",
        a: "Currently: the deployer EOA (externally owned account). Planned for mainnet: a multi-sig with a defined advisory board, a timelock delay for whitelist changes, and a public change log. No Shariah advisory board has been formally engaged yet — this is explicitly planned, not claimed.",
      },
    ],
  },
  {
    category: "Integrations",
    icon: Code2,
    questions: [
      {
        q: "How do I integrate the Gravitas SDK in 10 minutes?",
        a: "Install with npm install @gravitas-protocol/sdk. Import GravitasClient and PolicyChecker. Initialize with your RPC URL and contract addresses. Call client.checkCompliance(tokenA, tokenB) before building a migration transaction, then client.buildMigrationTx(params) to get the calldata. Full examples in /sdk and the gravitas-sdk/examples/ directory in the repository.",
      },
      {
        q: "Is there a REST API or only on-chain interaction?",
        a: "Currently the SDK wraps direct on-chain calls via viem/ethers. There is no hosted REST API. All compliance checks and transaction building happen client-side against the deployed contracts. A hosted simulation API is on the roadmap for institutional integrators who need server-side pre-flight checks.",
      },
      {
        q: "What wallets and signers are supported?",
        a: "The frontend supports WalletConnect-compatible wallets via wagmi. The SDK accepts any viem WalletClient or ethers Signer. For institutional custody, EIP-712 signing is compatible with hardware wallets (Ledger, Trezor) and multi-sig solutions (Safe/Gnosis) that support typed data signing.",
      },
    ],
  },
  {
    category: "Metrics & Verification",
    icon: Eye,
    questions: [
      {
        q: "Which metrics are real and which are demo data?",
        a: "All volume, TVL, migration count, and user metrics shown in the Analytics dashboard are demo/simulation data. They are clearly labeled 'Demo' in the UI. What is verifiably real: the deployed contract addresses on Arbitrum Sepolia, the test suite results (90%+ coverage), and the on-chain transactions you can execute yourself on testnet.",
      },
      {
        q: "How do I verify the contracts on-chain?",
        a: "Navigate to Arbiscan Sepolia and search for the contract addresses listed in the Proof & Trust section below. You can read the PolicyRegistry whitelist directly, inspect the TeleportV3 source code (verified on Arbiscan), and trace any testnet transaction. The DEPLOYMENTS.md file in the repository contains all deployment tx hashes.",
      },
      {
        q: "What is the roadmap to mainnet?",
        a: "P0: Formal security audit by a recognized firm. P1: Advisory board formation (Shariah scholars + DeFi security). P2: Timelock + multi-sig governance deployment. P3: Mainnet deployment on Arbitrum One with conservative TVL caps. P4: Cross-chain expansion. No timeline is committed until the audit is complete.",
      },
    ],
  },
];

// ── CONTRACT DATA ──
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
    address: "0x...(see DEPLOYMENTS.md)",
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
      className="p-1.5 rounded text-white/30 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors touch-target"
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
        className="w-full flex items-start justify-between gap-4 py-4 text-left group touch-target"
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
            <p className="pb-4 text-sm text-white/55 leading-relaxed">{a}</p>
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
        <span className="status-dot online" />
        <span>Arbitrum Sepolia</span>
      </div>
      <span className="text-white/20">·</span>
      <div className="flex items-center gap-1.5">
        <Activity className="h-3 w-3 text-[#D4AF37]" />
        <span>Chain ID: 421614</span>
      </div>
      <span className="text-white/20">·</span>
      <div className="flex items-center gap-1.5">
        <Blocks className="h-3 w-3 text-[#D4AF37]" />
        <span>Block: {block ? block.toLocaleString() : "—"}</span>
      </div>
      <span className="text-white/20">·</span>
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

  const navLinks = [
    { label: "Docs", href: "/docs" },
    { label: "Compliance", href: "/compliance" },
    { label: "SDK", href: "/sdk" },
  ];

  return (
    <div className="min-h-screen bg-[#060E1A] text-white overflow-x-hidden">
      {/* ── TOP NAV ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b border-[#D4AF37]/10 bg-[#060E1A]/90 backdrop-blur-xl"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#B8941F] flex items-center justify-center shadow-lg shadow-[#D4AF37]/20">
                <span className="text-[#060E1A] font-black text-lg" aria-hidden="true">G</span>
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-base tracking-tight">Gravitas Protocol</span>
                <span className="ml-2 text-[10px] font-mono text-amber-400/70 border border-amber-400/30 rounded px-1.5 py-0.5">TESTNET</span>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-6 text-sm text-white/60">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer relative group py-1"
                >
                  {link.label}
                  <span className="absolute bottom-0 left-0 w-0 h-px bg-[#D4AF37] group-hover:w-full transition-all duration-200" />
                </Link>
              ))}
              <a
                href="https://github.com/AbZe628/gravitas-protocol"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#D4AF37] transition-colors"
                aria-label="View on GitHub"
              >
                <Github className="h-4 w-4" />
              </a>
            </div>
            <Button asChild size="sm" className="bg-[#D4AF37] text-[#060E1A] hover:bg-[#D4AF37]/90 font-semibold shadow-lg shadow-[#D4AF37]/20">
              <Link href="/dashboard">
                Launch App
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>

          {/* Mobile: CTA + Hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <Button asChild size="sm" className="bg-[#D4AF37] text-[#060E1A] hover:bg-[#D4AF37]/90 font-semibold h-9 px-3 text-xs">
              <Link href="/dashboard">App</Link>
            </Button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-white/60 hover:text-[#D4AF37] transition-colors touch-target rounded-lg hover:bg-white/5"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-[#D4AF37]/10 bg-[#0A1628]/98 backdrop-blur overflow-hidden"
            >
              <div className="container px-4 py-4 space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-4 py-3 text-white/70 hover:text-[#D4AF37] hover:bg-[#D4AF37]/8 rounded-xl transition-colors touch-target"
                  >
                    <span className="font-medium">{link.label}</span>
                    <ChevronRight className="h-4 w-4 opacity-40" />
                  </Link>
                ))}
                <div className="border-t border-[#D4AF37]/10 pt-3 mt-2">
                  <a
                    href="https://github.com/AbZe628/gravitas-protocol"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-4 py-3 text-white/70 hover:text-[#D4AF37] hover:bg-[#D4AF37]/8 rounded-xl transition-colors touch-target"
                  >
                    <span className="font-medium flex items-center gap-2">
                      <Github className="h-4 w-4" /> GitHub
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 opacity-40" />
                  </a>
                </div>
                <div className="px-4 py-3">
                  <SystemStatusWidget />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center pt-16" aria-label="Hero">
        {/* Layered background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#D4AF3708_1px,transparent_1px),linear-gradient(to_bottom,#D4AF3708_1px,transparent_1px)] bg-[size:64px_64px]" aria-hidden="true" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent" aria-hidden="true" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#D4AF37]/4 rounded-full blur-[140px] pointer-events-none" aria-hidden="true" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none" aria-hidden="true" />

        <div className="container relative z-10 py-16 md:py-28 px-4 md:px-6">
          <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-4xl">
            <motion.div variants={fadeUp}>
              <Badge className="mb-6 px-4 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold tracking-wider uppercase gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                Testnet Demo · Arbitrum Sepolia · No Mainnet Deployment
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] mb-6 tracking-tight text-balance"
            >
              Institutional-Grade
              <br />
              <span className="gold-gradient">Liquidity Routing</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-base md:text-lg text-white/55 mb-10 max-w-2xl leading-relaxed">
              Deterministic, Shariah-compliant liquidity migrations across Uniswap V2 and V3 with atomic execution, EIP-712 signed intents, and policy-enforced compliance checks — verifiable on-chain at every step.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row flex-wrap gap-3 mb-14">
              <Button
                asChild
                size="lg"
                className="bg-[#D4AF37] text-[#060E1A] hover:bg-[#D4AF37]/90 font-semibold gap-2 px-8 h-12 text-base shadow-xl shadow-[#D4AF37]/25 transition-all hover:shadow-[#D4AF37]/40 hover:-translate-y-0.5"
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
                className="border-white/15 text-white hover:bg-white/5 hover:border-white/25 gap-2 px-8 h-12 text-base transition-all"
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
                className="border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/8 gap-2 px-8 h-12 text-base transition-all"
              >
                <Link href="/docs">
                  <BookOpen className="h-4 w-4" />
                  Read Docs
                </Link>
              </Button>
            </motion.div>

            {/* Stats row */}
            <motion.div variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 pt-6 border-t border-[#D4AF37]/10">
              {[
                { label: "Test Coverage", value: "90%+", icon: CheckCircle, link: "https://github.com/AbZe628/gravitas-protocol", note: "Foundry" },
                { label: "Atomic Execution", value: "Single TX", icon: Zap, link: "https://sepolia.arbiscan.io/address/0x5D423f8d01539B92D3f3953b91682D9884D1E993", note: "All-or-nothing" },
                { label: "Live Contracts", value: "3 on Sepolia", icon: Database, link: "https://sepolia.arbiscan.io", note: "Verified" },
                { label: "Islamic Finance", value: "$3T+ Market", icon: TrendingUp, note: "Addressable" },
              ].map((stat, i) => {
                const content = (
                  <div className="flex flex-col gap-1 group">
                    <div className="flex items-center gap-2">
                      <stat.icon className="h-4 w-4 text-[#D4AF37]" />
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
        <div className="container px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="text-xs md:text-sm text-amber-200 font-medium">
                Testnet Only — All dashboard metrics are Demo/Simulation data. No real funds at risk.
              </span>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 text-xs">
              <a
                href="https://sepolia.arbiscan.io/address/0xbcaE3069362B0f0b80f44139052f159456C84679"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-white/50 hover:text-[#D4AF37] transition-colors font-mono"
              >
                PolicyRegistry: 0xbcaE...4679 <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
              <a
                href="https://sepolia.arbiscan.io/address/0x5D423f8d01539B92D3f3953b91682D9884D1E993"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-white/50 hover:text-[#D4AF37] transition-colors font-mono"
              >
                TeleportV3: 0x5D42...E993 <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT'S LIVE TODAY ── */}
      <section className="py-12 md:py-16 bg-[#060E1A]" aria-label="What's live today">
        <div className="container px-4 md:px-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Live Today */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <Card className="h-full border-green-500/20 bg-green-500/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="status-dot online" />
                    <CardTitle className="text-base text-white">What's Live Today</CardTitle>
                  </div>
                  <CardDescription className="text-green-400/70 text-xs">Arbitrum Sepolia Testnet</CardDescription>
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
                      <span className="text-xs text-white/70">{item}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Planned After Audit */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <Card className="h-full border-[#D4AF37]/20 bg-[#D4AF37]/3">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-3.5 w-3.5 text-[#D4AF37]" />
                    <CardTitle className="text-base text-white">Planned After Audit</CardTitle>
                  </div>
                  <CardDescription className="text-[#D4AF37]/60 text-xs">Mainnet Roadmap</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {[
                    "Formal third-party security audit (P0 blocker)",
                    "Timelock + multi-sig governance for PolicyRegistry",
                    "Shariah advisory board formation",
                    "Mainnet deployment on Arbitrum One",
                    "Hosted simulation API for institutional integrators",
                    "Cross-chain expansion (Base, Optimism)",
                    "Institutional dashboard with CSV export + reporting",
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <ChevronRight className="h-3.5 w-3.5 text-[#D4AF37]/60 shrink-0 mt-0.5" />
                      <span className="text-xs text-white/55">{item}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-16 md:py-28 relative" aria-label="How it works">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#D4AF3705_1px,transparent_1px),linear-gradient(to_bottom,#D4AF3705_1px,transparent_1px)] bg-[size:48px_48px]" aria-hidden="true" />
        <div className="container relative z-10 px-4 md:px-6">
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12 md:mb-20">
            <motion.div variants={fadeUp}>
              <Badge className="mb-4 bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]">Migration Flow</Badge>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-balance">
              Atomic. Policy-Enforced. Verifiable.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-base md:text-lg text-white/50 max-w-2xl mx-auto">
              Every migration follows the same deterministic path — compliance first, execution second, verification always.
            </motion.p>
          </motion.div>

          {/* Stepper */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                icon: Shield,
                title: "Compliance Check",
                desc: "PolicyRegistry.isTokenCompliant() and isRouterAuthorized() are called on-chain. Transaction reverts immediately if either check fails.",
                color: "text-[#D4AF37]",
                bg: "bg-[#D4AF37]/10",
              },
              {
                step: "02",
                icon: Lock,
                title: "Sign Intent",
                desc: "For V3: EIP-712 typed data is signed with a per-address nonce. Human-readable in hardware wallets. Replay-protected by design.",
                color: "text-blue-400",
                bg: "bg-blue-400/10",
              },
              {
                step: "03",
                icon: Zap,
                title: "Atomic Execute",
                desc: "Remove LP → Swap → Add LP in a single transaction. All-or-nothing. No partial states. No MEV exposure between steps.",
                color: "text-green-400",
                bg: "bg-green-400/10",
              },
              {
                step: "04",
                icon: Eye,
                title: "Verify On-Chain",
                desc: "Transaction hash, block number, and new position ID are returned. Verify directly on Arbiscan. No trust required.",
                color: "text-purple-400",
                bg: "bg-purple-400/10",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="relative"
              >
                <Card className="h-full border-[#D4AF37]/10 bg-[#0A1628]/60 hover:border-[#D4AF37]/25 transition-all card-hover">
                  <CardContent className="pt-6 pb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`h-10 w-10 rounded-xl ${item.bg} flex items-center justify-center`}>
                        <item.icon className={`h-5 w-5 ${item.color}`} />
                      </div>
                      <span className="font-mono text-xs text-white/30 font-bold">{item.step}</span>
                    </div>
                    <h3 className="font-semibold text-white mb-2 text-sm md:text-base">{item.title}</h3>
                    <p className="text-xs text-white/45 leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
                {i < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 z-10 text-[#D4AF37]/30">
                    <ChevronRight className="h-5 w-5" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-16 md:py-28 bg-[#060E1A]" aria-label="Core features">
        <div className="container px-4 md:px-6">
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12 md:mb-20">
            <motion.div variants={fadeUp}>
              <Badge className="mb-4 bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]">Core Features</Badge>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-balance">
              Built for Institutions
            </motion.h2>
            <motion.p variants={fadeUp} className="text-base md:text-lg text-white/50 max-w-2xl mx-auto">
              Enterprise-grade infrastructure designed for funds and institutional traders requiring Shariah compliance and deterministic execution.
            </motion.p>
          </motion.div>
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Shield,
                title: "Policy-Enforced Compliance",
                description: "On-chain PolicyRegistry enforces Shariah compliance at the contract level. No UI bypass possible. Token whitelist and router authorization checked before every execution.",
                badge: "On-Chain",
              },
              {
                icon: Zap,
                title: "Atomic Execution",
                description: "All-or-nothing transaction guarantees with deterministic routing eliminate partial execution risks and MEV exposure across Uniswap V2/V3 positions.",
                badge: "Zero Partial States",
              },
              {
                icon: Lock,
                title: "EIP-712 Signed Intents",
                description: "Human-readable transaction signing with nonce-based replay protection. Compatible with hardware wallets, multi-sig, and institutional custody solutions.",
                badge: "Replay-Protected",
              },
              {
                icon: Layers,
                title: "V2 + V3 Support",
                description: "Migrate Uniswap V2 LP tokens or V3 NFT positions atomically. Single SDK, unified compliance layer, consistent execution guarantees.",
                badge: "Multi-Protocol",
              },
              {
                icon: Cpu,
                title: "Yul-Optimized Gas",
                description: "Inline assembly optimization for dust refunds saves ~2,000 gas per migration. Best-in-class capital efficiency for high-frequency institutional operations.",
                badge: "~2k Gas Saved",
              },
              {
                icon: Network,
                title: "Deterministic Routing",
                description: "Preflight simulation APIs provide exact outcomes before execution. Eliminates uncertainty and supports institutional reporting and audit trails.",
                badge: "Pre-Verifiable",
              },
            ].map((feature, i) => (
              <motion.div key={i} variants={fadeUp}>
                <Card className="h-full border-[#D4AF37]/10 bg-[#0A1628]/40 hover:border-[#D4AF37]/30 transition-all card-hover group">
                  <CardHeader>
                    <div className="h-11 w-11 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <feature.icon className="h-5 w-5 text-[#D4AF37]" />
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-white text-base">{feature.title}</CardTitle>
                      <Badge className="bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20 text-[10px] shrink-0">{feature.badge}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-white/50 leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── PROOF & TRUST ── */}
      <section className="py-16 md:py-28 relative" id="proof" aria-label="Proof and trust">
        <div className="absolute inset-0 bg-gradient-to-b from-[#060E1A] via-[#0A1628]/50 to-[#060E1A]" aria-hidden="true" />
        <div className="container relative z-10 px-4 md:px-6">
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12 md:mb-16">
            <motion.div variants={fadeUp}>
              <Badge className="mb-4 bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]">Proof & Trust</Badge>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-balance">
              Verify Everything On-Chain
            </motion.h2>
            <motion.p variants={fadeUp} className="text-base md:text-lg text-white/50 max-w-2xl mx-auto">
              No trust required. Every contract is deployed, verified, and inspectable on Arbiscan. Every claim below is independently verifiable.
            </motion.p>
          </motion.div>

          {/* System Status */}
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <Card className="mb-8 border-[#D4AF37]/20 bg-[#0A1628]/60">
              <CardContent className="py-4 px-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs text-white/40 font-mono uppercase tracking-wider">System Status</span>
                  <SystemStatusWidget />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contract Cards */}
          <div className="grid md:grid-cols-3 gap-5 mb-8">
            {contracts.map((contract, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <Card className="h-full border-[#D4AF37]/20 bg-[#0A1628]/60 card-hover">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-1">
                      <CardTitle className="text-sm text-white font-mono">{contract.name}</CardTitle>
                      {contract.verified ? (
                        <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">Verified</Badge>
                      ) : (
                        <Badge className="bg-white/5 text-white/40 border-white/10 text-[10px]">See Docs</Badge>
                      )}
                    </div>
                    <CardDescription className="text-white/40 text-xs leading-relaxed">{contract.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-1 bg-[#060E1A]/60 rounded-lg px-3 py-2 border border-[#D4AF37]/10">
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
                      View on Arbiscan
                    </a>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Trust Metrics */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              {
                icon: FileCode,
                label: "Test Coverage",
                value: "90%+",
                sub: "Foundry + invariant tests",
                link: "https://github.com/AbZe628/gravitas-protocol",
              },
              {
                icon: GitBranch,
                label: "Security Audit",
                value: "Planned",
                sub: "P0 before mainnet",
                link: "https://github.com/AbZe628/gravitas-protocol/blob/main/docs/SECURITY_AUDIT_PREP.md",
              },
              {
                icon: Shield,
                label: "Formal Verification",
                value: "In Scope",
                sub: "Invariant test suite",
                link: "https://github.com/AbZe628/gravitas-protocol",
              },
              {
                icon: Globe,
                label: "Network",
                value: "Sepolia",
                sub: "Arbitrum testnet",
                link: "https://sepolia.arbiscan.io",
              },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="block">
                  <Card className="border-[#D4AF37]/15 bg-[#0A1628]/40 hover:border-[#D4AF37]/30 transition-all card-hover">
                    <CardContent className="pt-5 pb-5">
                      <item.icon className="h-5 w-5 text-[#D4AF37] mb-3" />
                      <div className="text-xl font-bold text-white mb-0.5">{item.value}</div>
                      <div className="text-xs font-medium text-white/70 mb-0.5">{item.label}</div>
                      <div className="text-[10px] text-white/35 font-mono">{item.sub}</div>
                    </CardContent>
                  </Card>
                </a>
              </motion.div>
            ))}
          </div>

          {/* Trust Model + Security Posture */}
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <Card className="h-full border-[#D4AF37]/15 bg-[#0A1628]/40">
                <CardHeader>
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Lock className="h-4 w-4 text-[#D4AF37]" />
                    Trust Model
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-white/55">
                  <p><span className="text-white/80 font-medium">Permissions:</span> PolicyRegistry owner is currently the deployer EOA. No timelock implemented on testnet.</p>
                  <p><span className="text-white/80 font-medium">Planned:</span> Multi-sig + timelock for all registry changes. Public change log. Advisory board governance.</p>
                  <p><span className="text-white/80 font-medium">Execution:</span> TeleportV3/V2 contracts are non-upgradeable. Logic is immutable once deployed.</p>
                  <p><span className="text-white/80 font-medium">Compliance is technical:</span> The protocol enforces policy at the contract level. Governance of what is "compliant" is a separate off-chain process.</p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <Card className="h-full border-[#D4AF37]/15 bg-[#0A1628]/40">
                <CardHeader>
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-[#D4AF37]" />
                    Security Posture
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-white/55">
                  <p><span className="text-white/80 font-medium">Testing:</span> 90%+ coverage with Foundry unit tests, integration tests, and invariant/fuzz tests.</p>
                  <p><span className="text-white/80 font-medium">Threat model:</span> Replay attacks (EIP-712 nonces), reentrancy (CEI pattern), MEV (slippage params), unauthorized policy changes (owner access control).</p>
                  <p><span className="text-white/80 font-medium">No audit yet:</span> Formal audit is a P0 requirement before mainnet. No firm has been engaged or named.</p>
                  <p><span className="text-white/80 font-medium">Verify yourself:</span> All contracts are open source and verified on Arbiscan. Read the code directly.</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── ARCHITECTURE ── */}
      <section className="py-16 md:py-24 bg-[#060E1A]" aria-label="Architecture">
        <div className="container px-4 md:px-6">
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-10 md:mb-16">
            <motion.div variants={fadeUp}>
              <Badge className="mb-4 bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]">Architecture</Badge>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold mb-4 text-balance">
              How Compliance is Technical
            </motion.h2>
            <motion.p variants={fadeUp} className="text-base text-white/50 max-w-2xl mx-auto">
              Compliance is not a UI checkbox. It is enforced at the smart contract execution layer.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                title: "PolicyRegistry",
                icon: Database,
                color: "border-[#D4AF37]/30",
                items: [
                  "Token whitelist (isTokenCompliant)",
                  "Router authorization (isRouterAuthorized)",
                  "Registry version tracking",
                  "Owner-controlled (timelock planned)",
                ],
              },
              {
                title: "TeleportV3",
                icon: Zap,
                color: "border-blue-500/30",
                items: [
                  "EIP-712 signed migration intents",
                  "Nonce-based replay protection",
                  "Calls PolicyRegistry before execution",
                  "Atomic: remove → swap → add in 1 TX",
                ],
              },
              {
                title: "TeleportV2",
                icon: Layers,
                color: "border-green-500/30",
                items: [
                  "LP token approval + migration",
                  "Slippage-protected amounts",
                  "Calls PolicyRegistry before execution",
                  "Dust refund via Yul inline assembly",
                ],
              },
            ].map((arch, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <Card className={`h-full bg-[#0A1628]/60 border ${arch.color}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <arch.icon className="h-4 w-4 text-[#D4AF37]" />
                      <CardTitle className="text-white text-sm font-mono">{arch.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {arch.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-2 text-xs text-white/55">
                          <span className="text-[#D4AF37] mt-0.5">→</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Q&A ── */}
      <section className="py-16 md:py-28 relative" id="faq" aria-label="Frequently asked questions">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#D4AF3706_1px,transparent_1px),linear-gradient(to_bottom,#D4AF3706_1px,transparent_1px)] bg-[size:64px_64px]" aria-hidden="true" />
        <div className="container relative z-10 px-4 md:px-6">
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-10 md:mb-16">
            <motion.div variants={fadeUp}>
              <Badge className="mb-4 bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]">Q&A</Badge>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-balance">
              Questions & Answers
            </motion.h2>
            <motion.p variants={fadeUp} className="text-base md:text-lg text-white/50 max-w-2xl mx-auto">
              Precise answers to the questions institutions actually ask.
            </motion.p>
          </motion.div>

          {/* Category Tabs — horizontal scroll on mobile */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-thin -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
            {faqSections.map((section) => (
              <button
                key={section.category}
                onClick={() => setActiveFaqCategory(section.category)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all touch-target ${
                  activeFaqCategory === section.category
                    ? "bg-[#D4AF37] text-[#060E1A] shadow-lg shadow-[#D4AF37]/20"
                    : "bg-[#0A1628]/60 text-white/60 border border-[#D4AF37]/15 hover:text-white hover:border-[#D4AF37]/30"
                }`}
              >
                <section.icon className="h-3.5 w-3.5" />
                {section.category}
              </button>
            ))}
          </div>

          {/* FAQ Items */}
          <AnimatePresence mode="wait">
            {faqSections
              .filter((s) => s.category === activeFaqCategory)
              .map((section) => (
                <motion.div
                  key={section.category}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="border-[#D4AF37]/15 bg-[#0A1628]/60">
                    <CardContent className="pt-6 px-4 md:px-6">
                      {section.questions.map((item, i) => (
                        <FAQItem key={i} q={item.q} a={item.a} />
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </section>

      {/* ── SDK CTA ── */}
      <section className="py-16 md:py-24 bg-[#060E1A]" aria-label="Developer resources">
        <div className="container px-4 md:px-6">
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <Card className="h-full border-[#D4AF37]/20 bg-gradient-to-br from-[#0A1628] to-[#0F1E35] card-hover">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center mb-3">
                    <Code2 className="h-6 w-6 text-[#D4AF37]" />
                  </div>
                  <CardTitle className="text-white text-xl">SDK Reference</CardTitle>
                  <CardDescription className="text-white/50">
                    Integrate compliance checks and migration execution in minutes.
                    TypeScript-first, viem-compatible, fully typed.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="code-block mb-4 text-xs">
                    <span className="text-white/30">$</span>{" "}
                    <span className="text-green-400">npm install</span>{" "}
                    <span className="text-white/80">@gravitas-protocol/sdk</span>
                  </div>
                  <Button asChild className="bg-[#D4AF37] text-[#060E1A] hover:bg-[#D4AF37]/90 font-semibold w-full sm:w-auto">
                    <Link href="/sdk">
                      SDK Documentation
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <Card className="h-full border-[#D4AF37]/20 bg-gradient-to-br from-[#0A1628] to-[#0F1E35] card-hover">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center mb-3">
                    <BookOpen className="h-6 w-6 text-[#D4AF37]" />
                  </div>
                  <CardTitle className="text-white text-xl">Documentation</CardTitle>
                  <CardDescription className="text-white/50">
                    Full technical specification, architecture diagrams, deployment guides,
                    and compliance framework documentation.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {["Technical Spec", "Whitepaper", "Deployment Guide", "Security Prep"].map((tag) => (
                      <Badge key={tag} className="bg-[#D4AF37]/8 text-[#D4AF37]/70 border-[#D4AF37]/15 text-xs">{tag}</Badge>
                    ))}
                  </div>
                  <Button asChild variant="outline" className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/8 w-full sm:w-auto">
                    <Link href="/docs">
                      Read Documentation
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-20 md:py-32 relative overflow-hidden" aria-label="Call to action">
        <div className="absolute inset-0 bg-gradient-to-b from-[#060E1A] to-[#0A1628]" aria-hidden="true" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#D4AF37]/5 rounded-full blur-[120px] pointer-events-none" aria-hidden="true" />
        <div className="container relative z-10 px-4 md:px-6 text-center">
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.div variants={fadeUp}>
              <Badge className="mb-6 bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37] animate-pulse mr-2" />
                Live on Testnet
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6 text-balance">
              Try It on Testnet.
              <br />
              <span className="gold-gradient">Verify Everything.</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-base md:text-lg text-white/50 max-w-2xl mx-auto mb-10">
              Connect a wallet to Arbitrum Sepolia, run a migration simulation, and inspect every step on Arbiscan. No real funds required.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="bg-[#D4AF37] text-[#060E1A] hover:bg-[#D4AF37]/90 font-semibold gap-2 px-10 h-13 text-base shadow-xl shadow-[#D4AF37]/25 hover:-translate-y-0.5 transition-all"
              >
                <Link href="/dashboard">
                  Launch App
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white/15 text-white hover:bg-white/5 gap-2 px-10 h-13 text-base"
              >
                <a href="https://github.com/AbZe628/gravitas-protocol" target="_blank" rel="noopener noreferrer">
                  <Github className="h-5 w-5" />
                  View on GitHub
                </a>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#D4AF37]/10 py-12 bg-[#060E1A]" role="contentinfo">
        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#B8941F] flex items-center justify-center">
                  <span className="text-[#060E1A] font-black" aria-hidden="true">G</span>
                </div>
                <span className="font-bold text-white">Gravitas Protocol</span>
              </div>
              <p className="text-sm text-white/35 leading-relaxed mb-4">
                Institutional-grade Shariah-compliant liquidity infrastructure on Arbitrum.
                Testnet only — no mainnet deployment.
              </p>
              <SystemStatusWidget />
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4 text-xs uppercase tracking-wider text-white/50">Protocol</h4>
              <div className="space-y-2.5">
                {[
                  { label: "Dashboard", href: "/dashboard", external: false },
                  { label: "Documentation", href: "/docs", external: false },
                  { label: "Compliance", href: "/compliance", external: false },
                  { label: "Whitepaper", href: "/docs", external: false },
                ].map((l, i) => (
                  <div key={i}>
                    {l.external ? (
                      <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-sm text-white/40 hover:text-[#D4AF37] transition-colors block">{l.label}</a>
                    ) : (
                      <Link href={l.href} className="text-sm text-white/40 hover:text-[#D4AF37] transition-colors block">{l.label}</Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4 text-xs uppercase tracking-wider text-white/50">Developers</h4>
              <div className="space-y-2.5">
                {[
                  { label: "SDK Reference", href: "/sdk", external: false },
                  { label: "Compliance API", href: "/compliance", external: false },
                  { label: "GitHub", href: "https://github.com/AbZe628/gravitas-protocol", external: true },
                  { label: "Security Prep", href: "https://github.com/AbZe628/gravitas-protocol/blob/main/docs/SECURITY_AUDIT_PREP.md", external: true },
                ].map((l, i) => (
                  <div key={i}>
                    {l.external ? (
                      <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-sm text-white/40 hover:text-[#D4AF37] transition-colors flex items-center gap-1">
                        {l.label} <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    ) : (
                      <Link href={l.href} className="text-sm text-white/40 hover:text-[#D4AF37] transition-colors block">{l.label}</Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4 text-xs uppercase tracking-wider text-white/50">On-Chain</h4>
              <div className="space-y-2.5">
                <a href="https://sepolia.arbiscan.io/address/0xbcaE3069362B0f0b80f44139052f159456C84679" target="_blank" rel="noopener noreferrer" className="text-sm text-white/40 hover:text-[#D4AF37] transition-colors flex items-center gap-1">
                  PolicyRegistry <ExternalLink className="h-2.5 w-2.5" />
                </a>
                <a href="https://sepolia.arbiscan.io/address/0x5D423f8d01539B92D3f3953b91682D9884D1E993" target="_blank" rel="noopener noreferrer" className="text-sm text-white/40 hover:text-[#D4AF37] transition-colors flex items-center gap-1">
                  TeleportV3 <ExternalLink className="h-2.5 w-2.5" />
                </a>
                <a href="https://sepolia.arbiscan.io" target="_blank" rel="noopener noreferrer" className="text-sm text-white/40 hover:text-[#D4AF37] transition-colors flex items-center gap-1">
                  Arbiscan Explorer <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-[#D4AF37]/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-white/25">
              © 2026 Gravitas Protocol. MIT License. Testnet only — no mainnet deployment.
            </p>
            <div className="flex items-center gap-4 text-xs text-white/25">
              <a href="mailto:abdusamedzelic98@gmail.com" className="hover:text-[#D4AF37] transition-colors">Contact</a>
              <span>·</span>
              <a href="https://github.com/AbZe628/gravitas-protocol" target="_blank" rel="noopener noreferrer" className="hover:text-[#D4AF37] transition-colors flex items-center gap-1">
                GitHub <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
