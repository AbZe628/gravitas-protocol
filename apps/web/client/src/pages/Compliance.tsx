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
  ChevronRight, Home, AlertTriangle, Menu, X
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
        <div className="flex flex-col sm:flex-row gap-2">
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
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
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#B8941F] flex items-center justify-center">
                  <span className="text-[#060E1A] font-black">G</span>
                </div>
                <span className="font-bold text-white hidden sm:inline">Gravitas</span>
              </div>
            </Link>
            <ChevronRight className="h-4 w-4 text-white/30" />
            <span className="text-white/60 text-sm">Compliance</span>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="text-white/60 hover:text-white">
              <Link href="/"><Home className="h-4 w-4 mr-2" />Home</Link>
            </Button>
            <Button asChild size="sm" className="bg-[#D4AF37] text-[#060E1A] hover:bg-[#D4AF37]/90 font-semibold">
              <Link href="/dashboard">Launch App</Link>
            </Button>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-white/60 hover:text-[#D4AF37] transition-colors"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden border-t border-[#D4AF37]/10 bg-[#0A1628]/95 backdrop-blur"
          >
            <div className="px-4 py-4 space-y-3">
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 text-white/60 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-lg transition-colors">Home</Link>
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 text-white/60 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-lg transition-colors">Dashboard</Link>
            </div>
          </motion.div>
        )}
      </nav>

      <div className="pt-16">
        {/* Hero */}
        <section className="relative py-16 md:py-24 border-b border-[#D4AF37]/10">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#D4AF3706_1px,transparent_1px),linear-gradient(to_bottom,#D4AF3706_1px,transparent_1px)] bg-[size:48px_48px]" />
          <div className="container relative z-10 px-4 md:px-6">
            <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-3xl">
              <motion.div variants={fadeUp}>
                <Badge className="mb-4 bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]">
                  <Shield className="h-3 w-3 mr-2" />
                  Shariah Compliance Framework
                </Badge>
              </motion.div>
              <motion.h1 variants={fadeUp} className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                Compliance by Design
              </motion.h1>
              <motion.p variants={fadeUp} className="text-base md:text-lg lg:text-xl text-white/50 leading-relaxed">
                Gravitas Protocol treats Shariah compliance as a technical requirement, not a marketing label.
                Every migration is validated against the on-chain GravitasPolicyRegistry before execution.
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* Policy Registry Status */}
        <section className="py-12 md:py-16">
          <div className="container px-4 md:px-6">
            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <motion.h2 variants={fadeUp} className="text-2xl md:text-3xl font-bold mb-8">
                Live Policy Registry
              </motion.h2>

              <div className="grid md:grid-cols-3 gap-6 mb-12">
                <motion.div variants={fadeUp}>
                  <Card className="border border-[#D4AF37]/20 bg-[#0A1628]/60">
                    <CardContent className="pt-6">
                      <p className="text-sm text-white/40 mb-1">Policy Version</p>
                      <p className="text-2xl md:text-3xl font-bold text-[#D4AF37]">
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
                        <p className="text-2xl md:text-3xl font-bold text-green-400">Active</p>
                      </div>
                      <p className="text-xs text-white/30 mt-1">Arbitrum Sepolia</p>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div variants={fadeUp}>
                  <Card className="border border-[#D4AF37]/20 bg-[#0A1628]/60">
                    <CardContent className="pt-6">
                      <p className="text-sm text-white/40 mb-1">Contract Address</p>
                      <code className="text-xs md:text-sm font-mono text-[#D4AF37] break-all">0xbcaE...4679</code>
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
              <motion.h3 variants={fadeUp} className="text-xl md:text-2xl font-bold mb-6">On-Chain Compliance Checker</motion.h3>
              <div className="grid md:grid-cols-2 gap-6 mb-12">
                <motion.div variants={fadeUp}>
                  <AddressChecker
                    title="Asset Compliance Check"
                    placeholder="0x... (token address)"
                    functionName="isAssetCompliant"
                    description="Verify if a token is on the Shariah-compliant whitelist"
                  />
                </motion.div>
                <motion.div variants={fadeUp}>
                  <AddressChecker
                    title="Executor Authorization Check"
                    placeholder="0x... (executor address)"
                    functionName="isExecutorAuthorized"
                    description="Verify if an executor is authorized to perform migrations"
                  />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#D4AF37]/10 py-8 bg-[#060E1A]">
        <div className="container px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/30">
            © 2026 Gravitas Protocol. Built for institutional DeFi.
          </p>
          <div className="flex items-center gap-4 text-xs text-white/30">
            <span>MIT License</span>
            <span>·</span>
            <a href="https://github.com/AbZe628/gravitas-protocol" target="_blank" rel="noopener noreferrer" className="hover:text-[#D4AF37] transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
