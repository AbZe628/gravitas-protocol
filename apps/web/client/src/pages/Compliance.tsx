import { usePageMeta } from "@/lib/pageMeta";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useReadContract } from "wagmi";
import { ARBISCAN, CONTRACTS, DEPLOYMENT } from "@/lib/wagmi";
import {
  Shield, CheckCircle, XCircle, Search, ExternalLink,
  ChevronRight, AlertTriangle, Menu, X
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
    name: "isExecutor",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "currentVersion",
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
  positive,
  negative,
}: {
  title: string;
  placeholder: string;
    functionName: "isAssetCompliant" | "isExecutor";
  description: string;
  positive: string;
  negative: string;
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
    <Card className="border border-gold/10 bg-canvas/60 backdrop-blur">
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
            className="bg-abyss border-gold/20 text-white font-mono text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
          />
          <Button
            onClick={handleCheck}
            className="bg-gold text-abyss hover:bg-gold/90 shrink-0"
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
                <div className="h-4 w-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Querying on-chain...</span>
              </div>
            ) : isError ? (
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">The registry did not answer. Check the address and try again.</span>
              </div>
            ) : data ? (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="h-5 w-5" />
                <div>
                  <p className="font-semibold">Yes</p>
                  <p className="text-xs text-green-300/80">{positive}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-400">
                <XCircle className="h-5 w-5" />
                <div>
                  <p className="font-semibold">No</p>
                  <p className="text-xs text-red-300/80">{negative}</p>
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
  usePageMeta("Compliance", "Compliance enforced at the moment of execution rather than reported afterwards, and how a board confirms that what runs is what it decided.");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const { data: policyVersion } = useReadContract({
    address: CONTRACTS.POLICY_REGISTRY as `0x${string}`,
    abi: POLICY_REGISTRY_ABI,
    functionName: "currentVersion",
    chainId: 421614,
  });

  return (
    <div className="min-h-screen bg-abyss text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gold/10 bg-abyss/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-gold to-gold-deep flex items-center justify-center">
                  <span className="text-abyss font-black">G</span>
                </div>
                <span className="font-bold text-white hidden sm:inline">Gravitas</span>
              </div>
            </Link>
            <ChevronRight className="h-4 w-4 text-white/50" />
            <span className="text-white/60 text-sm">Compliance</span>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="text-white/60 hover:text-white">
              <a href="/">Website</a>
            </Button>
            <Button asChild size="sm" className="bg-gold text-abyss hover:bg-gold/90 font-semibold">
              <Link href="/dashboard">Launch App</Link>
            </Button>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-white/60 hover:text-gold transition-colors"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden border-t border-gold/10 bg-canvas/95 backdrop-blur"
          >
            <div className="px-4 py-4 space-y-3">
              <a href="/" className="block px-4 py-2 text-white/60 hover:text-gold hover:bg-gold/10 rounded-lg transition-colors">Website</a>
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 text-white/60 hover:text-gold hover:bg-gold/10 rounded-lg transition-colors">Dashboard</Link>
            </div>
          </motion.div>
        )}
      </nav>

      <div className="pt-16">
        {/* Hero */}
        <section className="relative py-16 md:py-24 border-b border-gold/10">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_srgb,var(--color-gold)_4%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_srgb,var(--color-gold)_4%,transparent)_1px,transparent_1px)] bg-[size:48px_48px]" />
          <div className="container relative z-10 px-4 md:px-6">
            <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-3xl">
              <motion.div variants={fadeUp}>
                <Badge className="mb-4 bg-gold/10 border-gold/30 text-gold">
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
                  <Card className="border border-gold/20 bg-canvas/60">
                    <CardContent className="pt-6">
                      <p className="text-sm text-white/60 mb-1">Policy Version</p>
                      <p className="text-2xl md:text-3xl font-bold text-gold">
                        {policyVersion !== undefined ? `v${policyVersion.toString()}` : "—"}
                      </p>
                      <p className="text-xs text-white/50 mt-1">On-chain governance version</p>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div variants={fadeUp}>
                  <Card className="border border-green-500/20 bg-green-500/5">
                    <CardContent className="pt-6">
                      <p className="text-sm text-white/60 mb-1">Registry Status</p>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                        <p className="text-2xl md:text-3xl font-bold text-green-400">Active</p>
                      </div>
                      <p className="text-xs text-white/50 mt-1">Arbitrum Sepolia</p>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div variants={fadeUp}>
                  <Card className="border border-gold/20 bg-canvas/60">
                    <CardContent className="pt-6">
                      <p className="text-sm text-white/60 mb-1">Contract Address</p>
                      <code className="text-xs md:text-sm font-mono text-gold break-all">0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23</code>
                      <div className="mt-2">
                        <a
                          href="https://sepolia.arbiscan.io/address/0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23"
                          target="_blank" rel="noopener noreferrer"
                        >
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-white/60 hover:text-gold text-xs">
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
                    description="Ask the registry whether a token is covered by the current ruling"
                    positive="The board has approved this token. A migration touching it will pass the asset check."
                    negative="This token is not on the approved list. Any migration touching it reverts."
                  />
                </motion.div>
                <motion.div variants={fadeUp}>
                  <AddressChecker
                    title="Executor Authorization Check"
                    placeholder="0x... (executor address)"
                    functionName="isExecutor"
                    description="Ask the registry whether an address may submit migrations"
                    positive="The registry lists this address as an executor. It may submit migrations — against intents their owners signed."
                    negative="The registry does not list this address. Any migration it submits reverts."
                  />
                </motion.div>
              </div>

              {/* What the registry actually enforces */}
              <motion.h3 variants={fadeUp} className="text-xl md:text-2xl font-bold mb-2">What the registry enforces</motion.h3>
              <motion.p variants={fadeUp} className="text-white/60 mb-6 max-w-3xl leading-relaxed">
                The registry is not a document. It is the contract every other contract asks before it moves
                anything, and it answers in the same transaction that would do the moving.
              </motion.p>

              <div className="grid md:grid-cols-3 gap-4 mb-12">
                {[
                  {
                    title: "Assets",
                    body: "A migration touching a token that is not on the approved list reverts. Both tokens of a position are checked, every time, not once at onboarding.",
                  },
                  {
                    title: "Routers",
                    body: "Liquidity may only be re-added through a venue the board has authorized. An unlisted router is refused before any approval is granted.",
                  },
                  {
                    title: "Executors",
                    body: "Only listed addresses may submit a migration. The position owner still signs the intent, so an executor cannot move what it was not asked to.",
                  },
                ].map((item) => (
                  <motion.div key={item.title} variants={fadeUp}>
                    <Card className="h-full border border-gold/10 bg-canvas/60">
                      <CardContent className="pt-6">
                        <p className="font-semibold text-white mb-2">{item.title}</p>
                        <p className="text-sm text-white/60 leading-relaxed">{item.body}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* The pause, and why it is not a formality */}
              <motion.div variants={fadeUp} className="rounded-2xl border border-gold/20 bg-canvas/50 p-5 md:p-6 mb-12">
                <p className="font-semibold text-white mb-2">Withdrawing the ruling stops execution</p>
                <p className="text-sm md:text-base text-white/60 leading-relaxed mb-3">
                  The registry can be paused. While it is, every verifier reverts rather than answering, and
                  a migration that depends on one cannot complete. That is deliberate: a pause is the board
                  saying it no longer stands behind the ruling, and code about to move value has to fail
                  closed the moment that happens rather than run on the last answer it heard.
                </p>
                <p className="text-sm md:text-base text-white/60 leading-relaxed">
                  Every change is recorded on chain as well as applied. Each one increments the policy
                  version and folds the previous hash, the field, the subject and the new status into a new
                  one — so the current hash commits to the entire history that produced it, and a version
                  cannot be quietly rewritten to say something it never said.
                </p>
              </motion.div>

              {/* Deployment */}
              <motion.h3 variants={fadeUp} className="text-xl md:text-2xl font-bold mb-2">Deployed contracts</motion.h3>
              <motion.p variants={fadeUp} className="text-white/60 mb-6 max-w-3xl leading-relaxed">
                All four are live on Arbitrum Sepolia and verified, so the source behind each address can be
                read on Arbiscan rather than taken on trust.
              </motion.p>

              <div className="grid sm:grid-cols-2 gap-4 mb-12">
                {DEPLOYMENT.map((contract) => (
                  <motion.div key={contract.address} variants={fadeUp}>
                    <Card className="h-full border border-gold/10 bg-canvas/60">
                      <CardContent className="pt-6">
                        <p className="font-semibold text-white mb-1">{contract.name}</p>
                        <p className="text-sm text-white/60 mb-3 leading-relaxed">{contract.role}</p>
                        <code className="text-[11px] md:text-xs font-mono text-gold break-all">{contract.address}</code>
                        <div className="mt-2">
                          <a href={ARBISCAN + contract.address} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-white/60 hover:text-gold text-xs">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View on Arbiscan
                            </Button>
                          </a>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Who decides */}
              <motion.div variants={fadeUp} className="rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/[0.07] to-transparent p-6 md:p-8">
                <p className="text-lg md:text-xl font-bold text-white mb-2">Who changes the list</p>
                <p className="text-sm md:text-base text-white/60 leading-relaxed mb-5 max-w-3xl">
                  Nothing on this page decides anything. What an address is permitted to do is a ruling, and
                  rulings are made by the Shariah board in Majlis — where permitting is slow and reversible,
                  restricting is fast, and every decision carries the reasoning that produced it.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button asChild className="bg-gold text-abyss hover:bg-gold/90 font-semibold">
                    <a href="https://majlis.gravitasprotocol.xyz" target="_blank" rel="noopener noreferrer">
                      Open Majlis
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="border-gold/30 text-white hover:bg-gold/10">
                    <Link href="/docs">Read the documentation</Link>
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-gold/10 py-8 bg-abyss">
        <div className="container px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/50">
            © 2026 Gravitas Protocol. Built for institutional DeFi.
          </p>
          <div className="flex items-center gap-4 text-xs text-white/50">
            <span>BUSL-1.1</span>
            <span>·</span>
            <a href="https://github.com/AbZe628/gravitas-protocol" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
