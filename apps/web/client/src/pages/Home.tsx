import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Shield, Zap, Lock, ExternalLink, Github,
  BookOpen, Code2, FileText, ChevronRight, CheckCircle,
  TrendingUp, Users, Globe, Award, ArrowUpRight, Layers,
  Cpu, Database, Network
} from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-[#060E1A] text-white overflow-x-hidden">

      {/* ── TOP NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#D4AF37]/10 bg-[#060E1A]/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#B8941F] flex items-center justify-center shadow-lg shadow-[#D4AF37]/20">
              <span className="text-[#060E1A] font-black text-lg">G</span>
            </div>
            <span className="font-bold text-lg tracking-tight">Gravitas Protocol</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-white/60">
            <Link href="/docs" className="hover:text-[#D4AF37] transition-colors cursor-pointer">Docs</Link>
            <Link href="/compliance" className="hover:text-[#D4AF37] transition-colors cursor-pointer">Compliance</Link>
            <Link href="/sdk" className="hover:text-[#D4AF37] transition-colors cursor-pointer">SDK</Link>
            <Link href="/whitepaper" className="hover:text-[#D4AF37] transition-colors cursor-pointer">Whitepaper</Link>
            <a
              href="https://github.com/AbZe628/gravitas-protocol"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#D4AF37] transition-colors"
            >
              <Github className="h-4 w-4" />
            </a>
          </div>
          <Button asChild size="sm" className="bg-[#D4AF37] text-[#060E1A] hover:bg-[#D4AF37]/90 font-semibold">
            <Link href="/dashboard">Launch App</Link>
          </Button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center pt-16">
        {/* Background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#D4AF3708_1px,transparent_1px),linear-gradient(to_bottom,#D4AF3708_1px,transparent_1px)] bg-[size:64px_64px]" />
        {/* Radial glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-[#D4AF37]/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="container relative z-10 py-24">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="max-w-4xl"
          >
            <motion.div variants={fadeUp}>
              <Badge className="mb-6 px-4 py-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-semibold tracking-wider uppercase">
                <Shield className="h-3 w-3 mr-2" />
                Shariah-Compliant DeFi Infrastructure · Arbitrum Sepolia
              </Badge>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-6xl lg:text-7xl xl:text-8xl font-bold leading-[1.05] mb-6 tracking-tight">
              Institutional-Grade
              <br />
              <span className="bg-gradient-to-r from-[#D4AF37] via-[#F4D03F] to-[#D4AF37] bg-clip-text text-transparent">
                Liquidity Routing
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-xl text-white/60 mb-10 max-w-2xl leading-relaxed">
              Gravitas Protocol enables deterministic, Shariah-compliant liquidity migrations across
              Uniswap V2 and V3 with atomic execution guarantees, EIP-712 signatures, and
              institutional-grade security — targeting the $3T+ Islamic Finance market.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-4 mb-16">
              <Button asChild size="lg" className="bg-[#D4AF37] text-[#060E1A] hover:bg-[#D4AF37]/90 font-semibold gap-2 px-8 h-12 text-base shadow-xl shadow-[#D4AF37]/20">
                <Link href="/dashboard">
                  Launch App
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/5 gap-2 px-8 h-12 text-base">
                <Link href="/whitepaper">
                  <FileText className="h-5 w-5" />
                  Read Whitepaper
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="text-white/60 hover:text-white gap-2 px-6 h-12">
                <a href="https://github.com/AbZe628/gravitas-protocol" target="_blank" rel="noopener noreferrer">
                  <Github className="h-5 w-5" />
                  GitHub
                </a>
              </Button>
            </motion.div>

            {/* Stats row */}
            <motion.div variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: "Test Coverage", value: "90%+", icon: CheckCircle },
                { label: "Gas Optimized", value: "~2K saved", icon: Zap },
                { label: "Contracts Deployed", value: "3 Live", icon: Database },
                { label: "Target Market", value: "$3T+", icon: TrendingUp },
              ].map((stat, i) => (
                <motion.div key={i} variants={fadeUp} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-[#D4AF37]">
                    <stat.icon className="h-4 w-4" />
                    <span className="text-2xl font-bold text-white">{stat.value}</span>
                  </div>
                  <span className="text-sm text-white/40">{stat.label}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── CONTRACTS LIVE BANNER ── */}
      <section className="border-y border-[#D4AF37]/10 bg-[#0A1628]/50 py-6">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-white/60">Live on Arbitrum Sepolia Testnet</span>
            </div>
            <div className="flex flex-wrap gap-6 text-sm">
              <a
                href="https://sepolia.arbiscan.io/address/0xbcaE3069362B0f0b80f44139052f159456C84679"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/60 hover:text-[#D4AF37] transition-colors"
              >
                <span className="font-mono">PolicyRegistry: 0xbcaE...4679</span>
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href="https://sepolia.arbiscan.io/address/0x5D423f8d01539B92D3f3953b91682D9884D1E993"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/60 hover:text-[#D4AF37] transition-colors"
              >
                <span className="font-mono">TeleportV3: 0x5D42...E993</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-32">
        <div className="container">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <motion.div variants={fadeUp}>
              <Badge className="mb-4 bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]">Core Features</Badge>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-bold mb-4">
              Built for Institutions
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-white/50 max-w-2xl mx-auto">
              Enterprise-grade infrastructure designed for banks, funds, and institutional traders
              requiring Shariah compliance and deterministic execution.
            </motion.p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-6"
          >
            {[
              {
                icon: Shield,
                title: "Shariah Compliant",
                description: "Built-in policy registry ensures all transactions meet Islamic finance principles with automated compliance checks. No Riba, no Gharar, no Maysir.",
                badge: "AAOIFI Standards",
              },
              {
                icon: Zap,
                title: "Atomic Execution",
                description: "All-or-nothing transaction guarantees with deterministic routing eliminate partial execution risks and MEV exposure across Uniswap V2/V3.",
                badge: "Zero MEV Risk",
              },
              {
                icon: Lock,
                title: "EIP-712 Signatures",
                description: "Secure, human-readable transaction signing with nonce-based replay protection for institutional custody solutions and multi-sig workflows.",
                badge: "Institutional Grade",
              },
              {
                icon: Layers,
                title: "Multi-Protocol Support",
                description: "Seamlessly migrate liquidity between Uniswap V2 LP positions and V3 NFT positions with a single atomic transaction on Arbitrum.",
                badge: "V2 + V3",
              },
              {
                icon: Cpu,
                title: "Gas Optimized",
                description: "Yul assembly optimizations in dust refund operations save ~2,000 gas per migration. Thoroughly tested and audited for safety.",
                badge: "~2K Gas Saved",
              },
              {
                icon: Code2,
                title: "TypeScript SDK",
                description: "Stripe-like developer experience with a fully typed SDK. Build institutional integrations in minutes with pre-flight compliance checks.",
                badge: "npm ready",
              },
            ].map((feature, i) => (
              <motion.div key={i} variants={fadeUp}>
                <Card className="border border-[#D4AF37]/10 bg-[#0A1628]/60 backdrop-blur hover:border-[#D4AF37]/30 transition-all duration-300 group h-full">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 flex items-center justify-center mb-4 group-hover:from-[#D4AF37]/30 transition-all">
                      <feature.icon className="h-6 w-6 text-[#D4AF37]" />
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-white text-lg">{feature.title}</CardTitle>
                      <Badge className="bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20 text-xs shrink-0">{feature.badge}</Badge>
                    </div>
                    <CardDescription className="text-white/50 leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── ARCHITECTURE ── */}
      <section className="py-32 bg-[#0A1628]/40 border-y border-[#D4AF37]/10">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <motion.div variants={fadeUp}>
                <Badge className="mb-4 bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]">Architecture</Badge>
              </motion.div>
              <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-bold mb-6">
                Protocol Architecture
              </motion.h2>
              <motion.p variants={fadeUp} className="text-lg text-white/50 mb-8 leading-relaxed">
                Gravitas Protocol consists of three core smart contracts deployed on Arbitrum,
                providing a complete infrastructure for Shariah-compliant liquidity management.
              </motion.p>

              <motion.div variants={stagger} className="space-y-4">
                {[
                  {
                    num: "01",
                    title: "GravitasPolicyRegistry",
                    desc: "Risk & Compliance Oracle — maintains whitelist of Shariah-compliant assets, authorized executors, and routers. All migrations validated here.",
                    link: "https://sepolia.arbiscan.io/address/0xbcaE3069362B0f0b80f44139052f159456C84679",
                  },
                  {
                    num: "02",
                    title: "TeleportV2",
                    desc: "Atomic migrations for Uniswap V2 LP positions with cooldown protection and maxMoveBps slippage control.",
                    link: null,
                  },
                  {
                    num: "03",
                    title: "TeleportV3",
                    desc: "EIP-712 signed migrations for Uniswap V3 NFT positions with optional rebalancing, nonce management, and gas-optimized dust refunds.",
                    link: "https://sepolia.arbiscan.io/address/0x5D423f8d01539B92D3f3953b91682D9884D1E993",
                  },
                ].map((item, i) => (
                  <motion.div key={i} variants={fadeUp} className="flex gap-5 p-4 rounded-xl border border-[#D4AF37]/10 bg-[#060E1A]/50 hover:border-[#D4AF37]/25 transition-colors">
                    <div className="shrink-0 h-10 w-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                      <span className="text-[#D4AF37] font-bold text-sm">{item.num}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white">{item.title}</h3>
                        {item.link && (
                          <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-[#D4AF37]/60 hover:text-[#D4AF37]">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <p className="text-sm text-white/50">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <Card className="border border-[#D4AF37]/20 bg-[#0A1628]/80 backdrop-blur">
                <CardHeader className="border-b border-[#D4AF37]/10">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Network className="h-5 w-5 text-[#D4AF37]" />
                    Deployment Information
                  </CardTitle>
                  <CardDescription className="text-white/50">Arbitrum Sepolia Testnet · Chain ID 421614</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  {[
                    { label: "Policy Registry", addr: "0xbcaE3069362B0f0b80f44139052f159456C84679", short: "0xbcaE...4679" },
                    { label: "TeleportV3", addr: "0x5D423f8d01539B92D3f3953b91682D9884D1E993", short: "0x5D42...E993" },
                  ].map((c, i) => (
                    <div key={i} className="p-4 rounded-xl bg-[#060E1A]/60 border border-[#D4AF37]/10">
                      <p className="text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">{c.label}</p>
                      <div className="flex items-center justify-between gap-2">
                        <code className="text-sm font-mono text-[#D4AF37]">{c.short}</code>
                        <a
                          href={`https://sepolia.arbiscan.io/address/${c.addr}`}
                          target="_blank" rel="noopener noreferrer"
                        >
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-white/40 hover:text-[#D4AF37]">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </a>
                      </div>
                    </div>
                  ))}

                  <div className="pt-2 space-y-2">
                    {[
                      "✅ 90%+ test coverage enforced",
                      "✅ Deterministic mocks & fuzz testing",
                      "✅ CI/CD bank-grade pipeline",
                      "✅ Internal security review passed",
                      "✅ EIP-712 replay protection",
                    ].map((item, i) => (
                      <p key={i} className="text-xs text-white/50 flex items-center gap-2">
                        <span>{item}</span>
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── SHARIAH COMPLIANCE ── */}
      <section className="py-32">
        <div className="container">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <motion.div variants={fadeUp}>
              <Badge className="mb-4 bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]">Islamic Finance</Badge>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-bold mb-4">
              Shariah Compliance by Design
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-white/50 max-w-2xl mx-auto">
              Not a marketing label — a technical requirement. Targeting the $3 Trillion+ Islamic Finance market
              with provable on-chain compliance.
            </motion.p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
          >
            {[
              { principle: "No Riba", arabic: "ربا", desc: "Revenue via service fees only. Zero interest-based mechanisms.", icon: "⚖️" },
              { principle: "No Gharar", arabic: "غرر", desc: "Deterministic routing eliminates all execution uncertainty.", icon: "🎯" },
              { principle: "No Maysir", arabic: "ميسر", desc: "Gambling and speculative assets filtered at the protocol level.", icon: "🛡️" },
              { principle: "Asset Halal", arabic: "حلال", desc: "Whitelist-based compliance oracle validates every asset.", icon: "✅" },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp}>
                <Card className="border border-[#D4AF37]/10 bg-[#0A1628]/60 backdrop-blur text-center p-6 hover:border-[#D4AF37]/30 transition-all h-full">
                  <div className="text-4xl mb-3">{item.icon}</div>
                  <div className="text-[#D4AF37] text-lg font-bold mb-1">{item.principle}</div>
                  <div className="text-white/30 text-sm font-arabic mb-3">{item.arabic}</div>
                  <p className="text-sm text-white/50">{item.desc}</p>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Certification roadmap */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="border border-[#D4AF37]/20 bg-[#0A1628]/60 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Award className="h-5 w-5 text-[#D4AF37]" />
                  Certification Roadmap
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    { phase: "Phase 1", title: "Self-Regulation", timeline: "Current", status: "✅ Active", desc: "Internal AAOIFI standards adherence. Policy registry enforces compliance programmatically." },
                    { phase: "Phase 2", title: "Shariah Advisory Board", timeline: "Q3 2026", status: "🔄 Planned", desc: "Engagement with recognized Shariah scholars for formal advisory board formation." },
                    { phase: "Phase 3", title: "Shariah Seal", timeline: "2027", status: "📋 Future", desc: "Formal certification for GCC market integration and institutional adoption." },
                  ].map((phase, i) => (
                    <div key={i} className="p-4 rounded-xl bg-[#060E1A]/50 border border-[#D4AF37]/10">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20 text-xs">{phase.phase}</Badge>
                        <span className="text-xs text-white/40">{phase.timeline}</span>
                      </div>
                      <h4 className="font-semibold text-white mb-1">{phase.title}</h4>
                      <p className="text-xs text-[#D4AF37] mb-2">{phase.status}</p>
                      <p className="text-xs text-white/50">{phase.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ── QUICK LINKS ── */}
      <section className="py-20 bg-[#0A1628]/40 border-y border-[#D4AF37]/10">
        <div className="container">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-4 gap-4"
          >
            {[
              { icon: BookOpen, title: "Documentation", desc: "Integration guides, API reference, and examples", href: "/docs", external: false },
              { icon: Shield, title: "Compliance", desc: "Shariah principles and policy registry details", href: "/compliance", external: false },
              { icon: Code2, title: "SDK Reference", desc: "TypeScript SDK for institutional integrations", href: "/sdk", external: false },
              { icon: FileText, title: "Whitepaper", desc: "Full technical specification and business model", href: "/whitepaper", external: false },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp}>
                <Link href={item.href}>
                  <Card className="border border-[#D4AF37]/10 bg-[#060E1A]/60 backdrop-blur hover:border-[#D4AF37]/30 transition-all duration-300 cursor-pointer group h-full">
                    <CardHeader className="pb-3">
                      <item.icon className="h-6 w-6 text-[#D4AF37] mb-2" />
                      <CardTitle className="text-white text-base group-hover:text-[#D4AF37] transition-colors flex items-center gap-2">
                        {item.title}
                        <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </CardTitle>
                      <CardDescription className="text-white/40 text-sm">{item.desc}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/5 via-transparent to-[#D4AF37]/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#D4AF37]/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="container relative z-10 text-center">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div variants={fadeUp}>
              <Badge className="mb-6 bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]">
                <Globe className="h-3 w-3 mr-2" />
                Ready for Institutional Adoption
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-6xl font-bold mb-6">
              The Future of
              <br />
              <span className="bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] bg-clip-text text-transparent">
                Compliant DeFi
              </span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-xl text-white/50 mb-10 max-w-2xl mx-auto">
              Connect your wallet and start interacting with Shariah-compliant liquidity infrastructure
              built for the next generation of institutional DeFi.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-4 justify-center">
              <Button asChild size="lg" className="bg-[#D4AF37] text-[#060E1A] hover:bg-[#D4AF37]/90 font-semibold gap-2 px-10 h-14 text-lg shadow-2xl shadow-[#D4AF37]/20">
                <Link href="/dashboard">
                  Launch Dashboard
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-[#D4AF37]/30 text-white hover:bg-[#D4AF37]/10 gap-2 px-10 h-14 text-lg">
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
      <footer className="border-t border-[#D4AF37]/10 py-12 bg-[#060E1A]">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#B8941F] flex items-center justify-center">
                  <span className="text-[#060E1A] font-black">G</span>
                </div>
                <span className="font-bold text-white">Gravitas Protocol</span>
              </div>
              <p className="text-sm text-white/40 leading-relaxed">
                Institutional-grade Shariah-compliant liquidity infrastructure on Arbitrum.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Protocol</h4>
              <div className="space-y-2">
                {[
                  { label: "Dashboard", href: "/dashboard", external: false },
                  { label: "Documentation", href: "/docs", external: false },
                  { label: "Whitepaper", href: "/whitepaper", external: false },
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
              <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Developers</h4>
              <div className="space-y-2">
                {[
                  { label: "SDK Reference", href: "/sdk", external: false },
                  { label: "Compliance API", href: "/compliance", external: false },
                  { label: "GitHub", href: "https://github.com/AbZe628/gravitas-protocol", external: true },
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
              <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">On-Chain</h4>
              <div className="space-y-2">
                <a href="https://sepolia.arbiscan.io/address/0xbcaE3069362B0f0b80f44139052f159456C84679" target="_blank" rel="noopener noreferrer" className="text-sm text-white/40 hover:text-[#D4AF37] transition-colors flex items-center gap-1">
                  PolicyRegistry <ExternalLink className="h-3 w-3" />
                </a>
                <a href="https://sepolia.arbiscan.io/address/0x5D423f8d01539B92D3f3953b91682D9884D1E993" target="_blank" rel="noopener noreferrer" className="text-sm text-white/40 hover:text-[#D4AF37] transition-colors flex items-center gap-1">
                  TeleportV3 <ExternalLink className="h-3 w-3" />
                </a>
                <a href="https://sepolia.arbiscan.io" target="_blank" rel="noopener noreferrer" className="text-sm text-white/40 hover:text-[#D4AF37] transition-colors flex items-center gap-1">
                  Arbiscan <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-[#D4AF37]/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-white/30">
              © 2026 Gravitas Protocol. Built for institutional DeFi.
            </p>
            <div className="flex items-center gap-4 text-xs text-white/30">
              <span>MIT License</span>
              <span>·</span>
              <a href="mailto:abdusamedzelic98@gmail.com" className="hover:text-[#D4AF37] transition-colors">abdusamedzelic98@gmail.com</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
