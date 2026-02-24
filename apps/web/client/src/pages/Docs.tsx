import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  BookOpen, Code2, Shield, Zap, ArrowRight, Copy, CheckCheck,
  ExternalLink, ChevronRight, Home, Terminal, Package, FileCode
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
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
    <div className="relative group rounded-xl border border-[#D4AF37]/10 bg-[#060E1A] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#D4AF37]/10 bg-[#0A1628]/50">
        <span className="text-xs text-white/30 font-mono">{language}</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={copy}
          className="h-6 px-2 text-white/30 hover:text-[#D4AF37]"
        >
          {copied ? <CheckCheck className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm">
        <code className="text-[#D4AF37]/90 font-mono">{code}</code>
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
  { id: "teleport-v2", label: "TeleportV2", icon: Zap },
  { id: "teleport-v3", label: "TeleportV3", icon: Zap },
  { id: "errors", label: "Error Reference", icon: Code2 },
];

export default function Docs() {
  const [activeSection, setActiveSection] = useState("overview");

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
            <span className="text-white/60 text-sm">Documentation</span>
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

      <div className="flex pt-16">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 fixed left-0 top-16 bottom-0 border-r border-[#D4AF37]/10 bg-[#060E1A]/80 backdrop-blur overflow-y-auto">
          <div className="p-4">
            <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Documentation</p>
            <nav className="space-y-1">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all text-left ${
                    activeSection === s.id
                      ? "bg-[#D4AF37]/15 text-[#D4AF37]"
                      : "text-white/50 hover:text-white hover:bg-white/5"
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
        <main className="flex-1 lg:ml-64 min-h-screen">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-12">

              {/* Overview */}
              <motion.section variants={fadeUp} id="overview">
                <Badge className="mb-4 bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]">Documentation</Badge>
                <h1 className="text-4xl font-bold mb-4">Gravitas Protocol Docs</h1>
                <p className="text-lg text-white/60 leading-relaxed mb-6">
                  Gravitas Protocol is an institutional-grade, Shariah-compliant liquidity infrastructure
                  built on Arbitrum. This documentation covers everything you need to integrate
                  with the protocol — from the TypeScript SDK to direct contract interactions.
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { icon: Terminal, title: "Quick Start", desc: "Get up and running in 5 minutes", href: "#quickstart" },
                    { icon: Package, title: "SDK Reference", desc: "Full TypeScript SDK documentation", href: "/sdk" },
                    { icon: Shield, title: "Compliance API", desc: "Policy registry integration guide", href: "/compliance" },
                  ].map((card, i) => (
                    <Link key={i} href={card.href}>
                      <Card className="border border-[#D4AF37]/10 bg-[#0A1628]/60 hover:border-[#D4AF37]/30 transition-all cursor-pointer group">
                        <CardHeader className="pb-3">
                          <card.icon className="h-5 w-5 text-[#D4AF37] mb-2" />
                          <CardTitle className="text-white text-sm group-hover:text-[#D4AF37] transition-colors">{card.title}</CardTitle>
                          <p className="text-xs text-white/40">{card.desc}</p>
                        </CardHeader>
                      </Card>
                    </Link>
                  ))}
                </div>
              </motion.section>

              {/* Quick Start */}
              <motion.section variants={fadeUp} id="quickstart">
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                  <Terminal className="h-6 w-6 text-[#D4AF37]" />
                  Quick Start
                </h2>
                <p className="text-white/50 mb-6">Get the Gravitas SDK installed and make your first migration in minutes.</p>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-white/80">1. Install the SDK</h3>
                    <CodeBlock code="npm install @gravitas/sdk" language="bash" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-white/80">2. Initialize the client</h3>
                    <CodeBlock code={`import { GravitasClient } from '@gravitas/sdk';

const client = new GravitasClient({
  rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
  chainId: 421614,
  registryAddress: '0xbcaE3069362B0f0b80f44139052f159456C84679',
  teleportV3Address: '0x5D423f8d01539B92D3f3953b91682D9884D1E993',
});`} language="typescript" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-white/80">3. Check compliance & simulate</h3>
                    <CodeBlock code={`// Check if an asset is Shariah-compliant
const isCompliant = await client.compliance().isAssetCompliant(tokenAddress);

if (!isCompliant) {
  throw new Error('Asset is not Shariah-compliant');
}

// Build and simulate a V3 migration
const result = await client.migration()
  .tokenId(123n)
  .newFee(3000)
  .ticks(-887220, 887220)
  .slippage(0n, 0n, 0n, 0n)
  .deadline(BigInt(Math.floor(Date.now() / 1000) + 3600))
  .simulate(userAddress);

console.log('Estimated gas:', result.gasEstimate);`} language="typescript" />
                  </div>
                </div>
              </motion.section>

              {/* Contract Addresses */}
              <motion.section variants={fadeUp} id="contracts">
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                  <FileCode className="h-6 w-6 text-[#D4AF37]" />
                  Contract Addresses
                </h2>
                <p className="text-white/50 mb-6">All contracts are deployed and verified on Arbitrum Sepolia (Chain ID: 421614).</p>

                <div className="space-y-4">
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
                    <Card key={i} className="border border-[#D4AF37]/10 bg-[#0A1628]/60">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-white mb-1">{contract.name}</h4>
                            <p className="text-sm text-white/50 mb-3">{contract.desc}</p>
                            <code className="text-sm font-mono text-[#D4AF37] bg-[#060E1A] px-3 py-1 rounded-lg border border-[#D4AF37]/10">
                              {contract.address}
                            </code>
                          </div>
                          <a href={contract.link} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 shrink-0">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Arbiscan
                            </Button>
                          </a>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.section>

              {/* Error Reference */}
              <motion.section variants={fadeUp} id="errors">
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                  <Code2 className="h-6 w-6 text-[#D4AF37]" />
                  Error Reference
                </h2>
                <p className="text-white/50 mb-6">Custom error selectors and their human-readable descriptions.</p>

                <div className="space-y-3">
                  {[
                    { error: "AssetNotCompliant", desc: "The asset is not on the Shariah-compliant whitelist in PolicyRegistry.", code: "0x1a2b3c4d" },
                    { error: "CooldownNotMet", desc: "The cooldown period between migrations has not elapsed.", code: "0x2b3c4d5e" },
                    { error: "InvalidSignature", desc: "The EIP-712 signature is invalid or has been replayed.", code: "0x3c4d5e6f" },
                    { error: "MaxMoveBpsExceeded", desc: "Price movement exceeds the maximum allowed basis points.", code: "0x4d5e6f7a" },
                    { error: "ExecutorNotAuthorized", desc: "The executor address is not authorized in PolicyRegistry.", code: "0x5e6f7a8b" },
                    { error: "DeadlineExpired", desc: "The transaction deadline has passed.", code: "0x6f7a8b9c" },
                  ].map((err, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-[#D4AF37]/10 bg-[#0A1628]/40">
                      <code className="text-xs font-mono text-[#D4AF37] bg-[#060E1A] px-2 py-1 rounded shrink-0">{err.error}</code>
                      <p className="text-sm text-white/60">{err.desc}</p>
                    </div>
                  ))}
                </div>
              </motion.section>

              {/* CTA */}
              <motion.div variants={fadeUp} className="border border-[#D4AF37]/20 rounded-2xl p-8 bg-gradient-to-br from-[#D4AF37]/5 to-transparent text-center">
                <h3 className="text-2xl font-bold mb-2">Ready to integrate?</h3>
                <p className="text-white/50 mb-6">Launch the app or explore the SDK reference for deeper integration.</p>
                <div className="flex gap-4 justify-center">
                  <Button asChild className="bg-[#D4AF37] text-[#060E1A] hover:bg-[#D4AF37]/90 font-semibold gap-2">
                    <Link href="/dashboard">Launch App <ArrowRight className="h-4 w-4" /></Link>
                  </Button>
                  <Button asChild variant="outline" className="border-[#D4AF37]/30 text-white hover:bg-[#D4AF37]/10 gap-2">
                    <Link href="/sdk">SDK Reference</Link>
                  </Button>
                </div>
              </motion.div>

            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
