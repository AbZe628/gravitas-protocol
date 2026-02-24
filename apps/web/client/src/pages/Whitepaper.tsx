import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  FileText, ChevronRight, Home, ExternalLink, ArrowRight,
  TrendingUp, Shield, Zap, DollarSign, Users, Globe, Award
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

export default function Whitepaper() {
  return (
    <div className="min-h-screen bg-[#060E1A] text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#D4AF37]/10 bg-[#060E1A]/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#B8941F] flex items-center justify-center">
                  <span className="text-[#060E1A] font-black">G</span>
                </div>
                <span className="font-bold text-white">Gravitas</span>
              </div>
            </Link>
            <ChevronRight className="h-4 w-4 text-white/30" />
            <span className="text-white/60 text-sm">Whitepaper</span>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="text-white/60 hover:text-white">
              <Link href="/"><Home className="h-4 w-4 mr-2" />Home</Link>
            </Button>
            <Button asChild size="sm" className="bg-[#D4AF37] text-[#060E1A] hover:bg-[#D4AF37]/90 font-semibold">
              <Link href="/dashboard">Launch App</Link>
            </Button>
          </div>
        </div>
      </nav>

      <div className="pt-16">
        {/* Hero */}
        <section className="relative py-24 border-b border-[#D4AF37]/10">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#D4AF3706_1px,transparent_1px),linear-gradient(to_bottom,#D4AF3706_1px,transparent_1px)] bg-[size:48px_48px]" />
          <div className="container relative z-10">
            <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-4xl">
              <motion.div variants={fadeUp}>
                <Badge className="mb-4 bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]">
                  <FileText className="h-3 w-3 mr-2" />
                  Technical Whitepaper · v1.0 · February 2026
                </Badge>
              </motion.div>
              <motion.h1 variants={fadeUp} className="text-5xl lg:text-6xl font-bold mb-4 leading-tight">
                Gravitas Protocol
                <br />
                <span className="bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] bg-clip-text text-transparent">
                  Technical Specification
                </span>
              </motion.h1>
              <motion.p variants={fadeUp} className="text-xl text-white/50 leading-relaxed mb-8">
                Institutional-Grade Shariah-Compliant Liquidity Infrastructure for the
                $3 Trillion+ Islamic Finance Market
              </motion.p>
              <motion.div variants={fadeUp} className="flex gap-4">
                <a href="https://github.com/AbZe628/gravitas-protocol/blob/main/docs/whitepaper.md" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="border-[#D4AF37]/30 text-white hover:bg-[#D4AF37]/10 gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Full Whitepaper on GitHub
                  </Button>
                </a>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <div className="container py-16 max-w-5xl mx-auto">
          <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-16">

            {/* Executive Summary */}
            <motion.section variants={fadeUp}>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                  <span className="text-[#D4AF37] font-bold text-sm">01</span>
                </div>
                <h2 className="text-3xl font-bold">Executive Summary</h2>
              </div>
              <div className="prose prose-invert max-w-none">
                <p className="text-white/60 leading-relaxed text-lg mb-6">
                  Gravitas Protocol is a <strong className="text-white">deep-tech infrastructure layer</strong> designed
                  to solve the fragmentation of liquidity in Decentralized Finance (DeFi). We provide
                  <strong className="text-white"> deterministic routing and liquidity migration logic</strong> that allows
                  capital to move efficiently across DEX ecosystems without friction, high costs, or technical opacity.
                </p>
                <p className="text-white/60 leading-relaxed text-lg">
                  <strong className="text-white">Strategic Positioning</strong>: Built from the ground up with
                  Shariah compliance as a core governance principle, positioning the protocol as a primary
                  gateway for the <strong className="text-[#D4AF37]">$3 Trillion+ Islamic Finance market</strong> to
                  enter the Web3 ecosystem.
                </p>
              </div>
            </motion.section>

            {/* The Problem */}
            <motion.section variants={fadeUp}>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                  <span className="text-[#D4AF37] font-bold text-sm">02</span>
                </div>
                <h2 className="text-3xl font-bold">The Problem: Liquidity Fragmentation</h2>
              </div>
              <p className="text-white/60 leading-relaxed mb-6">
                Currently, liquidity in DeFi is siloed. Moving capital from one protocol to another is
                expensive, risky, and manual — making institutional adoption nearly impossible.
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { icon: DollarSign, title: "Expensive", desc: "Multiple approvals and gas fees for each migration step. Institutions lose 0.5–2% per migration cycle.", color: "border-red-500/20 bg-red-500/5" },
                  { icon: Zap, title: "Risky", desc: "Exposure to slippage and MEV bots during multi-step migrations. Partial execution leaves capital stranded.", color: "border-orange-500/20 bg-orange-500/5" },
                  { icon: Users, title: "Manual", desc: "Institutional players cannot automate liquidity movement securely at scale without custom infrastructure.", color: "border-yellow-500/20 bg-yellow-500/5" },
                ].map((item, i) => (
                  <Card key={i} className={`border ${item.color}`}>
                    <CardHeader>
                      <item.icon className="h-6 w-6 text-white/60 mb-2" />
                      <CardTitle className="text-white">{item.title}</CardTitle>
                      <p className="text-sm text-white/50">{item.desc}</p>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </motion.section>

            {/* The Solution */}
            <motion.section variants={fadeUp}>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                  <span className="text-[#D4AF37] font-bold text-sm">03</span>
                </div>
                <h2 className="text-3xl font-bold">The Solution: Deterministic Liquidity Routing</h2>
              </div>
              <p className="text-white/60 leading-relaxed mb-8">
                Gravitas acts as the middleware layer enabling "Deterministic Liquidity Routing." Users or
                institutions define an intent, and Gravitas executes the migration atomically with guaranteed outcomes.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { principle: "Deterministic Execution", impl: "Transactions revert entirely if parameters are not met — no partial execution risk." },
                  { principle: "Gharar Elimination", impl: "Users know exactly what they receive before execution via simulation API." },
                  { principle: "Policy-Constrained Routing", impl: "All migrations validated against Shariah parameters in GravitasPolicyRegistry." },
                  { principle: "Atomic Migration", impl: "Remove Liquidity → Swap → Add Liquidity in ONE transaction on Arbitrum." },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-xl border border-[#D4AF37]/10 bg-[#0A1628]/40">
                    <div className="h-2 w-2 rounded-full bg-[#D4AF37] mt-2 shrink-0" />
                    <div>
                      <h4 className="font-semibold text-white mb-1">{item.principle}</h4>
                      <p className="text-sm text-white/50">{item.impl}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* Technical Architecture */}
            <motion.section variants={fadeUp}>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                  <span className="text-[#D4AF37] font-bold text-sm">04</span>
                </div>
                <h2 className="text-3xl font-bold">Technical Architecture</h2>
              </div>

              <div className="space-y-4">
                {[
                  {
                    name: "GravitasPolicyRegistry",
                    role: "Risk & Compliance Oracle",
                    desc: "Maintains whitelist of Shariah-compliant assets and authorized executors. All migrations are validated here before execution. Supports governance upgrades via policy versioning.",
                    addr: "0xbcaE3069362B0f0b80f44139052f159456C84679",
                  },
                  {
                    name: "TeleportV2",
                    role: "V2 Migration Engine",
                    desc: "Atomic migrations for Uniswap V2 LP positions. Features cooldown protection (configurable seconds), maxMoveBps slippage control, and full compliance validation.",
                    addr: null,
                  },
                  {
                    name: "TeleportV3",
                    role: "V3 Migration Engine",
                    desc: "EIP-712 signed migrations for Uniswap V3 NFT positions. Supports optional rebalancing, nonce-based replay protection, and Yul-optimized dust refunds saving ~2,000 gas per migration.",
                    addr: "0x5D423f8d01539B92D3f3953b91682D9884D1E993",
                  },
                ].map((contract, i) => (
                  <Card key={i} className="border border-[#D4AF37]/10 bg-[#0A1628]/60">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-white">{contract.name}</h4>
                            <Badge className="bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20 text-xs">{contract.role}</Badge>
                          </div>
                          {contract.addr && (
                            <code className="text-xs font-mono text-[#D4AF37]/70">{contract.addr}</code>
                          )}
                        </div>
                        {contract.addr && (
                          <a href={`https://sepolia.arbiscan.io/address/${contract.addr}`} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="ghost" className="text-white/30 hover:text-[#D4AF37] h-7">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </a>
                        )}
                      </div>
                      <p className="text-sm text-white/50">{contract.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.section>

            {/* Business Model */}
            <motion.section variants={fadeUp}>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                  <span className="text-[#D4AF37] font-bold text-sm">05</span>
                </div>
                <h2 className="text-3xl font-bold">Business Model</h2>
              </div>
              <p className="text-white/60 leading-relaxed mb-6">
                Gravitas utilizes a diversified, sustainable revenue model that scales with volume and adoption.
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { icon: TrendingUp, stream: "Migration Fees", desc: "0.05–0.1% per atomic migration. Scales linearly with TVL and volume.", projection: "Primary Revenue" },
                  { icon: DollarSign, stream: "SDK Licensing", desc: "Enterprise SDK licenses for institutional integrations. Annual subscription model.", projection: "Recurring Revenue" },
                  { icon: Shield, stream: "Compliance API", desc: "Subscription access to compliance oracle for third-party DeFi protocols.", projection: "High Margin" },
                ].map((item, i) => (
                  <Card key={i} className="border border-[#D4AF37]/20 bg-[#0A1628]/60">
                    <CardHeader>
                      <item.icon className="h-6 w-6 text-[#D4AF37] mb-2" />
                      <CardTitle className="text-white">{item.stream}</CardTitle>
                      <Badge className="w-fit bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20 text-xs">{item.projection}</Badge>
                      <p className="text-sm text-white/50 mt-2">{item.desc}</p>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </motion.section>

            {/* Market Opportunity */}
            <motion.section variants={fadeUp}>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                  <span className="text-[#D4AF37] font-bold text-sm">06</span>
                </div>
                <h2 className="text-3xl font-bold">Market Opportunity</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border border-[#D4AF37]/20 bg-gradient-to-br from-[#D4AF37]/5 to-transparent">
                  <CardContent className="pt-6">
                    <Globe className="h-8 w-8 text-[#D4AF37] mb-3" />
                    <p className="text-4xl font-bold text-[#D4AF37] mb-1">$3T+</p>
                    <p className="font-semibold text-white mb-2">Islamic Finance Market</p>
                    <p className="text-sm text-white/50">
                      The global Islamic finance industry manages over $3 trillion in assets,
                      with 1.8 billion Muslims seeking Shariah-compliant financial products.
                      Currently, less than 0.1% of this capital is deployed in DeFi.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border border-[#D4AF37]/20 bg-[#0A1628]/60">
                  <CardContent className="pt-6">
                    <TrendingUp className="h-8 w-8 text-[#D4AF37] mb-3" />
                    <p className="text-4xl font-bold text-white mb-1">$200B+</p>
                    <p className="font-semibold text-white mb-2">DeFi TVL (Addressable)</p>
                    <p className="text-sm text-white/50">
                      Total DeFi TVL represents the addressable market for liquidity migration
                      infrastructure. Gravitas captures value from every migration event
                      across Uniswap V2 and V3 ecosystems.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </motion.section>

            {/* Security */}
            <motion.section variants={fadeUp}>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                  <span className="text-[#D4AF37] font-bold text-sm">07</span>
                </div>
                <h2 className="text-3xl font-bold">Security & Audit Status</h2>
              </div>
              <div className="space-y-3">
                {[
                  { type: "Internal Security Review", status: "✅ Completed", report: "proof-of-quality/INTERNAL_REVIEW.md", color: "border-green-500/20 bg-green-500/5" },
                  { type: "Foundry Fuzz Testing (90%+ coverage)", status: "✅ Passing", report: "CI/CD enforced", color: "border-green-500/20 bg-green-500/5" },
                  { type: "External Audit (OpenZeppelin)", status: "📋 Planned Q2 2026", report: null, color: "border-yellow-500/20 bg-yellow-500/5" },
                  { type: "Formal Verification", status: "📋 Planned Q3 2026", report: null, color: "border-white/10 bg-white/5" },
                ].map((audit, i) => (
                  <div key={i} className={`flex items-center justify-between p-4 rounded-xl border ${audit.color}`}>
                    <div>
                      <p className="font-medium text-white">{audit.type}</p>
                      {audit.report && <p className="text-xs text-white/40 mt-0.5">{audit.report}</p>}
                    </div>
                    <Badge className="bg-transparent border-white/10 text-white/60">{audit.status}</Badge>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* Team */}
            <motion.section variants={fadeUp}>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                  <span className="text-[#D4AF37] font-bold text-sm">08</span>
                </div>
                <h2 className="text-3xl font-bold">Team</h2>
              </div>
              <Card className="border border-[#D4AF37]/20 bg-[#0A1628]/60">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8941F] flex items-center justify-center shrink-0">
                      <span className="text-[#060E1A] font-black text-2xl">A</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Abdusamed Zelic</h3>
                      <p className="text-[#D4AF37] mb-2">Founder & Lead Architect</p>
                      <p className="text-white/50">
                        Deep-tech engineer with focus on smart contract security and protocol architecture.
                        Building institutional-grade DeFi infrastructure for the Islamic Finance market.
                      </p>
                      <div className="flex gap-3 mt-3">
                        <a href="https://github.com/AbZe628" target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-white/40 hover:text-[#D4AF37] text-xs gap-1">
                            <ExternalLink className="h-3 w-3" />
                            GitHub
                          </Button>
                        </a>
                        <a href="mailto:abdusamedzelic98@gmail.com">
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-white/40 hover:text-[#D4AF37] text-xs">
                            abdusamedzelic98@gmail.com
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.section>

            {/* CTA */}
            <motion.div variants={fadeUp} className="border border-[#D4AF37]/20 rounded-2xl p-8 bg-gradient-to-br from-[#D4AF37]/5 to-transparent text-center">
              <Award className="h-10 w-10 text-[#D4AF37] mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Explore the Protocol</h3>
              <p className="text-white/50 mb-6">
                Launch the app, read the documentation, or explore the source code on GitHub.
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Button asChild className="bg-[#D4AF37] text-[#060E1A] hover:bg-[#D4AF37]/90 font-semibold gap-2">
                  <Link href="/dashboard">Launch App <ArrowRight className="h-4 w-4" /></Link>
                </Button>
                <Button asChild variant="outline" className="border-[#D4AF37]/30 text-white hover:bg-[#D4AF37]/10 gap-2">
                  <a href="https://github.com/AbZe628/gravitas-protocol" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    GitHub Repository
                  </a>
                </Button>
              </div>
            </motion.div>

          </motion.div>
        </div>
      </div>
    </div>
  );
}
