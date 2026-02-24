import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useReadContract } from "wagmi";
import { CONTRACTS } from "@/lib/wagmi";
import {
  Shield, CheckCircle, XCircle, Search, ExternalLink,
  ChevronRight, Home, Award, BookOpen, AlertTriangle
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const POLICY_REGISTRY_ABI = [
  {
    inputs: [{ name: "asset", type: "address" }],
    name: "isAssetCompliant",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "executor", type: "address" }],
    name: "isExecutorAuthorized",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getPolicyVersion",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

function AddressChecker({
  title,
  placeholder,
  functionName,
  description,
}: {
  title: string;
  placeholder: string;
  functionName: "isAssetCompliant" | "isExecutorAuthorized";
  description: string;
}) {
  const [input, setInput] = useState("");
  const [address, setAddress] = useState<`0x${string}` | undefined>(undefined);

  const { data, isLoading, isError } = useReadContract({
    address: CONTRACTS.POLICY_REGISTRY as `0x${string}`,
    abi: POLICY_REGISTRY_ABI,
    functionName,
    args: address ? [address] : undefined,
    query: { enabled: !!address },
    chainId: 421614,
  });

  const handleCheck = () => {
    if (/^0x[a-fA-F0-9]{40}$/.test(input)) {
      setAddress(input as `0x${string}`);
    }
  };

  return (
    <Card className="border border-[#D4AF37]/10 bg-[#0A1628]/60 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-white text-lg">{title}</CardTitle>
        <CardDescription className="text-white/50">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder={placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="bg-[#060E1A] border-[#D4AF37]/20 text-white font-mono text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
          />
          <Button
            onClick={handleCheck}
            className="bg-[#D4AF37] text-[#060E1A] hover:bg-[#D4AF37]/90 shrink-0"
            disabled={isLoading}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {address && (
          <div className={`p-4 rounded-xl border ${
            isLoading ? "border-white/10 bg-white/5" :
            isError ? "border-red-500/20 bg-red-500/5" :
            data ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"
          }`}>
            {isLoading ? (
              <div className="flex items-center gap-2 text-white/50">
                <div className="h-4 w-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Querying on-chain...</span>
              </div>
            ) : isError ? (
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Error querying contract</span>
              </div>
            ) : data ? (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="h-5 w-5" />
                <div>
                  <p className="font-semibold">Compliant ✓</p>
                  <p className="text-xs text-green-400/70">This address passes Shariah compliance checks</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-400">
                <XCircle className="h-5 w-5" />
                <div>
                  <p className="font-semibold">Not Compliant ✗</p>
                  <p className="text-xs text-red-400/70">This address is not on the compliance whitelist</p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Compliance() {
  const { data: policyVersion } = useReadContract({
    address: CONTRACTS.POLICY_REGISTRY as `0x${string}`,
    abi: POLICY_REGISTRY_ABI,
    functionName: "getPolicyVersion",
    chainId: 421614,
  });

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
            <span className="text-white/60 text-sm">Compliance</span>
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
            <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-3xl">
              <motion.div variants={fadeUp}>
                <Badge className="mb-4 bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]">
                  <Shield className="h-3 w-3 mr-2" />
                  Shariah Compliance Framework
                </Badge>
              </motion.div>
              <motion.h1 variants={fadeUp} className="text-5xl font-bold mb-4">
                Compliance by Design
              </motion.h1>
              <motion.p variants={fadeUp} className="text-xl text-white/50 leading-relaxed">
                Gravitas Protocol treats Shariah compliance as a technical requirement, not a marketing label.
                Every migration is validated against the on-chain GravitasPolicyRegistry before execution.
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* Policy Registry Status */}
        <section className="py-16">
          <div className="container">
            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <motion.h2 variants={fadeUp} className="text-3xl font-bold mb-8">
                Live Policy Registry
              </motion.h2>

              <div className="grid md:grid-cols-3 gap-6 mb-12">
                <motion.div variants={fadeUp}>
                  <Card className="border border-[#D4AF37]/20 bg-[#0A1628]/60">
                    <CardContent className="pt-6">
                      <p className="text-sm text-white/40 mb-1">Policy Version</p>
                      <p className="text-3xl font-bold text-[#D4AF37]">
                        {policyVersion !== undefined ? `v${policyVersion.toString()}` : "—"}
                      </p>
                      <p className="text-xs text-white/30 mt-1">On-chain governance version</p>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div variants={fadeUp}>
                  <Card className="border border-green-500/20 bg-green-500/5">
                    <CardContent className="pt-6">
                      <p className="text-sm text-white/40 mb-1">Registry Status</p>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                        <p className="text-2xl font-bold text-green-400">Active</p>
                      </div>
                      <p className="text-xs text-white/30 mt-1">Arbitrum Sepolia</p>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div variants={fadeUp}>
                  <Card className="border border-[#D4AF37]/20 bg-[#0A1628]/60">
                    <CardContent className="pt-6">
                      <p className="text-sm text-white/40 mb-1">Contract Address</p>
                      <code className="text-sm font-mono text-[#D4AF37]">0xbcaE...4679</code>
                      <div className="mt-2">
                        <a
                          href="https://sepolia.arbiscan.io/address/0xbcaE3069362B0f0b80f44139052f159456C84679"
                          target="_blank" rel="noopener noreferrer"
                        >
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-white/40 hover:text-[#D4AF37] text-xs">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View on Arbiscan
                          </Button>
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Compliance Checkers */}
              <motion.h3 variants={fadeUp} className="text-xl font-bold mb-6">On-Chain Compliance Checker</motion.h3>
              <div className="grid md:grid-cols-2 gap-6 mb-12">
                <motion.div variants={fadeUp}>
                  <AddressChecker
                    title="Asset Compliance Check"
                    placeholder="0x... (token address)"
                    functionName="isAssetCompliant"
                    description="Check if a token address is on the Shariah-compliant asset whitelist"
                  />
                </motion.div>
                <motion.div variants={fadeUp}>
                  <AddressChecker
                    title="Executor Authorization Check"
                    placeholder="0x... (executor address)"
                    functionName="isExecutorAuthorized"
                    description="Check if an executor address is authorized to perform migrations"
                  />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Shariah Principles */}
        <section className="py-16 bg-[#0A1628]/40 border-y border-[#D4AF37]/10">
          <div className="container">
            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <motion.div variants={fadeUp} className="text-center mb-12">
                <Badge className="mb-4 bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]">Islamic Finance Principles</Badge>
                <h2 className="text-3xl font-bold mb-4">Four Pillars of Compliance</h2>
                <p className="text-white/50 max-w-2xl mx-auto">
                  Each principle is enforced programmatically through the GravitasPolicyRegistry smart contract.
                </p>
              </motion.div>

              <div className="grid md:grid-cols-2 gap-6">
                {[
                  {
                    arabic: "ربا",
                    principle: "No Riba (Interest)",
                    color: "from-[#D4AF37]/20 to-[#D4AF37]/5",
                    border: "border-[#D4AF37]/20",
                    implementation: [
                      "Revenue model based exclusively on service fees",
                      "Zero interest-based lending or borrowing mechanisms",
                      "Fee structure: 0.05–0.1% per atomic migration",
                    ],
                  },
                  {
                    arabic: "غرر",
                    principle: "No Gharar (Uncertainty)",
                    color: "from-blue-500/10 to-blue-500/5",
                    border: "border-blue-500/20",
                    implementation: [
                      "Deterministic routing — exact output known before execution",
                      "Atomic transactions revert entirely if parameters not met",
                      "EIP-712 signatures provide human-readable intent verification",
                    ],
                  },
                  {
                    arabic: "ميسر",
                    principle: "No Maysir (Gambling)",
                    color: "from-purple-500/10 to-purple-500/5",
                    border: "border-purple-500/20",
                    implementation: [
                      "Gambling and speculative tokens filtered at protocol level",
                      "Asset whitelist maintained by governance",
                      "Automated pre-flight compliance checks in SDK",
                    ],
                  },
                  {
                    arabic: "حلال",
                    principle: "Asset Halal Verification",
                    color: "from-green-500/10 to-green-500/5",
                    border: "border-green-500/20",
                    implementation: [
                      "On-chain whitelist of Shariah-compliant tokens",
                      "Authorized executor registry for institutional actors",
                      "Policy version tracking for governance upgrades",
                    ],
                  },
                ].map((item, i) => (
                  <motion.div key={i} variants={fadeUp}>
                    <Card className={`border ${item.border} bg-gradient-to-br ${item.color} backdrop-blur h-full`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-white text-xl mb-1">{item.principle}</CardTitle>
                            <span className="text-3xl text-white/20">{item.arabic}</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {item.implementation.map((point, j) => (
                            <li key={j} className="flex items-start gap-2 text-sm text-white/60">
                              <CheckCircle className="h-4 w-4 text-[#D4AF37] shrink-0 mt-0.5" />
                              {point}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Certification */}
        <section className="py-16">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-3 mb-8">
                <Award className="h-6 w-6 text-[#D4AF37]" />
                <h2 className="text-3xl font-bold">Certification Roadmap</h2>
              </div>

              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-px bg-[#D4AF37]/20" />
                <div className="space-y-8">
                  {[
                    {
                      phase: "Phase 1",
                      title: "Self-Regulation",
                      timeline: "Current",
                      status: "active",
                      desc: "Internal AAOIFI standards adherence. Policy registry enforces compliance programmatically. All contracts deployed and verified on Arbitrum Sepolia with real on-chain activity.",
                    },
                    {
                      phase: "Phase 2",
                      title: "Shariah Advisory Board",
                      timeline: "Q3 2026",
                      status: "planned",
                      desc: "Engagement with recognized Shariah scholars for formal advisory board formation. External review of smart contract logic and fee structures.",
                    },
                    {
                      phase: "Phase 3",
                      title: "Formal Shariah Seal",
                      timeline: "2027",
                      status: "future",
                      desc: "Formal certification for GCC market integration. Enables institutional adoption by Islamic banks and sovereign wealth funds.",
                    },
                  ].map((phase, i) => (
                    <div key={i} className="flex gap-6 pl-12 relative">
                      <div className={`absolute left-4 top-1 h-4 w-4 rounded-full border-2 ${
                        phase.status === "active" ? "bg-green-400 border-green-400" :
                        phase.status === "planned" ? "bg-[#D4AF37] border-[#D4AF37]" :
                        "bg-white/10 border-white/20"
                      }`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className="bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37] text-xs">{phase.phase}</Badge>
                          <span className="font-semibold text-white">{phase.title}</span>
                          <span className="text-sm text-white/40">{phase.timeline}</span>
                        </div>
                        <p className="text-sm text-white/50">{phase.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="py-16 border-t border-[#D4AF37]/10">
          <div className="container text-center">
            <h3 className="text-2xl font-bold mb-4">Explore the Protocol</h3>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button asChild className="bg-[#D4AF37] text-[#060E1A] hover:bg-[#D4AF37]/90 font-semibold gap-2">
                <Link href="/dashboard">Launch App</Link>
              </Button>
              <Button asChild variant="outline" className="border-[#D4AF37]/30 text-white hover:bg-[#D4AF37]/10 gap-2">
                <Link href="/docs"><BookOpen className="h-4 w-4" />Documentation</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
