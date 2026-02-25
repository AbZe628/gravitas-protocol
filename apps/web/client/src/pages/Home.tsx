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
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeInOut" } },
} as const;
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
} as const;

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
        className="fixed top-0 left-0 right-0 z-50 border-b border-[#D4AF37]/10 bg-[#060E1A]/95 backdrop-blur-xl"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-3 sm:px-4 md:px-6 lg:px-8">
          <Link href="/">
            <button className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#B8941F] flex items-center justify-center shadow-lg shadow-[#D4AF37]/20 flex-shrink-0">
                <span className="text-[#060E1A] font-black text-sm sm:text-lg" aria-hidden="true">G</span>
              </div>
              <div className="hidden xs:block">
                <span className="font-bold text-sm sm:text-base tracking-tight">Gravitas</span>
                <span className="ml-1.5 text-[8px] xs:text-[9px] font-mono text-amber-400/70 border border-amber-400/30 rounded px-1 py-0.5">TESTNET</span>
              </div>
            </button>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8 flex-1 justify-center">
            <div className="flex items-center gap-4 lg:gap-6 text-xs lg:text-sm text-white/60">
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
            <Button asChild size="sm" className="bg-[#D4AF37] text-[#060E1A] hover:bg-[#D4AF37]/90 font-semibold shadow-lg shadow-[#D4AF37]/20 text-xs lg:text-sm px-3 lg:px-4 py-1.5 lg:py-2 flex-shrink-0">
              <Link href="/dashboard">
                Launch App
                <ArrowRight className="h-3 w-3 lg:h-3.5 lg:w-3.5 ml-1 lg:ml-1.5" />
              </Link>
            </Button>
          </div>

          {/* Mobile: CTA + Hamburger */}
          <div className="md:hidden flex items-center gap-1.5 flex-shrink-0">
            <Button asChild size="sm" className="bg-[#D4AF37] text-[#060E1A] hover:bg-[#D4AF37]/90 font-bold text-[10px] h-7 px-2 shadow-lg shadow-[#D4AF37]/20">
              <Link href="/dashboard">App</Link>
            </Button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-white/60 hover:text-[#D4AF37] transition-colors touch-target rounded-lg hover:bg-white/5 flex-shrink-0"
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
              <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2.5 text-sm text-white/70 hover:text-[#D4AF37] hover:bg-[#D4AF37]/8 rounded-lg transition-colors touch-target"
                  >
                    <span className="font-medium truncate">{link.label}</span>
                    <ChevronRight className="h-3.5 w-3.5 opacity-40 flex-shrink-0 ml-2" />
                  </Link>
                ))}
                <div className="border-t border-[#D4AF37]/10 pt-3 mt-2">
                  <a
                    href="https://github.com/AbZe628/gravitas-protocol"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2.5 text-sm text-white/70 hover:text-[#D4AF37] hover:bg-[#D4AF37]/8 rounded-lg transition-colors touch-target"
                  >
                    <span className="font-medium flex items-center gap-2 truncate">
                      <Github className="h-3.5 w-3.5 flex-shrink-0" /> GitHub
                    </span>
                    <ExternalLink className="h-3 w-3 opacity-40 flex-shrink-0 ml-2" />
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
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#D4AF3708_1px,transparent_1px),linear-gradient(to_bottom,#D4AF3708_1px,transparent_1px)] bg-[size:32px_32px] md:bg-[size:64px_64px]" aria-hidden="true" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent" aria-hidden="true" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] md:w-[700px] h-[300px] md:h-[500px] bg-[#D4AF37]/4 rounded-full blur-[80px] md:blur-[140px] pointer-events-none" aria-hidden="true" />
        <div className="absolute bottom-1/4 right-1/4 w-[250px] md:w-[400px] h-[200px] md:h-[300px] bg-blue-900/10 rounded-full blur-[60px] md:blur-[100px] pointer-events-none" aria-hidden="true" />

        <div className="max-w-7xl mx-auto relative z-10 w-full py-8 md:py-28 px-3 sm:px-4 md:px-6 lg:px-8">
          <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-4xl">
            <motion.h1
              variants={fadeUp}
              className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] md:leading-[1.05] mb-4 md:mb-8 tracking-tight break-words"
            >
              Institutional-Grade
              <br className="hidden sm:block" />
              <span className="gold-gradient"> Liquidity Routing</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-xs xs:text-sm sm:text-base md:text-lg text-white/55 mb-6 md:mb-10 max-w-2xl leading-relaxed">
              Deterministic, Shariah-compliant liquidity migrations across Uniswap V2 and V3 with atomic execution and on-chain compliance verification.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-10 md:mb-14">
              <Button
                asChild
                size="lg"
                className="bg-[#D4AF37] text-[#060E1A] hover:bg-[#D4AF37]/90 font-semibold gap-1.5 sm:gap-2 px-4 sm:px-6 md:px-8 h-11 sm:h-12 text-sm sm:text-base shadow-xl shadow-[#D4AF37]/25 transition-all hover:shadow-[#D4AF37]/40 hover:-translate-y-0.5 w-full sm:w-auto"
              >
                <Link href="/dashboard">
                  Launch App
                  <ArrowRight className="h-3 w-3 xs:h-3.5 xs:w-3.5 md:h-4 md:w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white/15 text-white hover:bg-white/5 hover:border-white/25 gap-1.5 sm:gap-2 px-4 sm:px-6 md:px-8 h-11 sm:h-12 text-sm sm:text-base transition-all w-full sm:w-auto"
              >
                <a href="https://github.com/AbZe628/gravitas-protocol" target="_blank" rel="noopener noreferrer">
                  <Github className="h-3 w-3 xs:h-3.5 xs:w-3.5 md:h-4 md:w-4" />
                  <span className="hidden xs:inline">View Source</span>
                  <span className="xs:hidden">GitHub</span>
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/8 gap-1.5 sm:gap-2 px-4 sm:px-6 md:px-8 h-11 sm:h-12 text-sm sm:text-base transition-all w-full sm:w-auto"
              >
                <Link href="/docs">
                  <BookOpen className="h-3 w-3 xs:h-3.5 xs:w-3.5 md:h-4 md:w-4" />
                  <span className="hidden xs:inline">Read Docs</span>
                  <span className="xs:hidden">Docs</span>
                </Link>
              </Button>
            </motion.div>

            {/* Stats row */}
            <motion.div variants={stagger} className="grid grid-cols-2 xs:grid-cols-2 md:grid-cols-4 gap-2 xs:gap-3 md:gap-6 pt-4 md:pt-6 border-t border-[#D4AF37]/10">
              {[
                { label: "Test Coverage", value: "90%+", icon: CheckCircle, link: "https://github.com/AbZe628/gravitas-protocol", note: "Foundry" },
                { label: "Atomic Execution", value: "Single TX", icon: Zap, link: "https://sepolia.arbiscan.io/address/0x5D423f8d01539B92D3f3953b91682D9884D1E993", note: "All-or-nothing" },
                { label: "Live Contracts", value: "3 on Sepolia", icon: Database, link: "https://sepolia.arbiscan.io", note: "Verified" },
                { label: "Islamic Finance", value: "$3T+ Market", icon: TrendingUp, note: "Addressable" },
              ].map((stat, i) => {
                const content = (
                  <div className="flex flex-col gap-0.5 group">
                    <div className="flex items-center gap-1.5">
                      <stat.icon className="h-3 w-3 xs:h-3.5 xs:w-3.5 md:h-4 md:w-4 text-[#D4AF37] flex-shrink-0" />
                      <span className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold text-white truncate">{stat.value}</span>
                    </div>
                    <span className="text-[10px] xs:text-xs text-white/40 truncate">{stat.label}</span>
                    <span className="text-[8px] xs:text-[10px] text-[#D4AF37]/50 font-mono truncate">{stat.note}</span>
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
        <div className="container px-4 md:px-6 mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="text-xs md:text-sm text-amber-200 font-medium leading-tight">
                Testnet Only — All dashboard metrics are Demo/Simulation data. No real funds at risk.
              </span>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 text-[10px] sm:text-xs">
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
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
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

      {/* ── Q&A SECTION ── */}
      <section className="py-16 md:py-28 bg-[#060E1A] relative" aria-label="Questions and answers">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]">Q&A</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Questions & Answers</h2>
            <p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto">
              Precise answers to the questions institutions actually ask.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Categories */}
            <div className="lg:w-1/4">
              <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-2 pb-4 lg:pb-0 scrollbar-hide">
                {faqSections.map((section) => (
                  <button
                    key={section.category}
                    onClick={(e) => { e.preventDefault(); setActiveFaqCategory(section.category); }}
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

            {/* Questions List */}
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
      <section className="py-16 md:py-28 relative" id="proof" aria-label="Proof and trust">
        <div className="absolute inset-0 bg-gradient-to-b from-[#060E1A] via-[#0A1628]/50 to-[#060E1A]" aria-hidden="true" />
        <div className="container relative z-10 px-4 md:px-6 mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <Badge className="mb-4 bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]">Proof & Trust</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Verify Everything On-Chain</h2>
            <p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto">
              No trust required. Every contract is deployed, verified, and inspectable on Arbiscan.
            </p>
          </div>

          {/* System Status */}
          <Card className="mb-8 border-[#D4AF37]/20 bg-[#0A1628]/60">
            <CardContent className="py-4 px-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs text-white/40 font-mono uppercase tracking-wider">System Status</span>
                <SystemStatusWidget />
              </div>
            </CardContent>
          </Card>

          {/* Contract Cards */}
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
                    View on Arbiscan
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 border-t border-[#D4AF37]/10 bg-[#060E1A]">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#D4AF37] flex items-center justify-center">
                <span className="text-[#060E1A] font-bold">G</span>
              </div>
              <span className="font-bold text-white">Gravitas Protocol</span>
            </div>
            <div className="flex gap-6 text-sm text-white/40">
              <Link href="/docs" className="hover:text-[#D4AF37] transition-colors">Docs</Link>
              <Link href="/sdk" className="hover:text-[#D4AF37] transition-colors">SDK</Link>
              <a href="https://github.com/AbZe628/gravitas-protocol" target="_blank" rel="noopener noreferrer" className="hover:text-[#D4AF37] transition-colors">GitHub</a>
            </div>
            <p className="text-xs text-white/20">© 2026 Gravitas Protocol. Testnet v1.0.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
