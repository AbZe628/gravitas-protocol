import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useReadContract } from "wagmi";
import { CONTRACTS } from "@/lib/wagmi";
import {
  Shield, CheckCircle, XCircle, Search, ExternalLink,
  AlertTriangle, Cpu, Scale, Lock
} from "lucide-react";
import Header from "@/components/Header";
import ParametricField from "@/design/ParametricField";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
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
}: {
  title: string;
  placeholder: string;
    functionName: "isAssetCompliant" | "isExecutor";
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
    <div className="g-panel-raised p-6">
      <div className="mb-6">
        <h3 className="text-[var(--g-text-lg)] font-bold text-[var(--g-paper)] mb-2">{title}</h3>
        <p className="text-[var(--g-text-sm)] text-[var(--g-muted)]">{description}</p>
      </div>
      
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder={placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="bg-[var(--g-navy)] border-[var(--g-line)] text-[var(--g-paper)] font-mono text-sm focus:border-[var(--g-gold)] transition-colors"
            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
          />
          <Button
            onClick={handleCheck}
            className="bg-[var(--g-gold)] text-[var(--g-navy)] hover:bg-[var(--g-gold-soft)] shrink-0 font-bold"
            disabled={isLoading}
          >
            {isLoading ? <div className="h-4 w-4 border-2 border-[var(--g-navy)] border-t-transparent rounded-full animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {address && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-[var(--g-radius)] border ${
              isLoading ? "border-[var(--g-line)] bg-[var(--g-surface)]" :
              isError ? "border-red-500/20 bg-red-500/5" :
              data ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"
            }`}
          >
            {isLoading ? (
              <div className="flex items-center gap-2 text-[var(--g-muted)]">
                <div className="h-4 w-4 border-2 border-[var(--g-gold)] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Querying on-chain registry...</span>
              </div>
            ) : isError ? (
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Error querying contract</span>
              </div>
            ) : data ? (
              <div className="flex items-center gap-3 text-green-400">
                <CheckCircle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-bold">Compliant ✓</p>
                  <p className="text-xs opacity-70">This address passes Shariah compliance checks</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-red-400">
                <XCircle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-bold">Not Compliant ✗</p>
                  <p className="text-xs opacity-70">This address is not on the compliance whitelist</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function Compliance() {
  const { data: policyVersion } = useReadContract({
    address: CONTRACTS.POLICY_REGISTRY as `0x${string}`,
    abi: POLICY_REGISTRY_ABI,
    functionName: "currentVersion",
    chainId: 421614,
  });

  return (
    <div className="min-h-screen bg-[var(--g-navy)] text-[var(--g-paper)]">
      <Header />

      <main className="pt-24">
        {/* HERO */}
        <section className="relative py-24 md:py-32 overflow-hidden">
          <ParametricField 
            className="absolute inset-0 w-full h-full pointer-events-none opacity-30" 
            anchor={{ x: 0.1, y: 0.5 }}
            scale={0.6}
            shells={6}
          />
          <div className="container relative z-10 px-6 mx-auto max-w-7xl">
            <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-3xl">
              <motion.div variants={fadeUp} className="mb-6">
                <span className="g-label px-3 py-1 rounded-full bg-[var(--g-gold-wash)] border border-[var(--g-gold)]/20 text-[var(--g-gold-soft)]">
                  <Shield className="h-3 w-3 inline mr-2 mb-0.5" />
                  Policy Registry v1.0
                </span>
              </motion.div>
              <motion.h1 variants={fadeUp} className="g-display mb-6">
                Compliance by Design
              </motion.h1>
              <motion.p variants={fadeUp} className="g-prose text-[var(--g-text-lg)] text-[var(--g-paper-dim)]">
                Gravitas Protocol treats Shariah compliance as a technical requirement. Every migration is validated against the on-chain Policy Registry before execution.
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* REGISTRY STATUS */}
        <section className="g-seam py-20 bg-[var(--g-surface)]">
          <div className="container px-6 mx-auto max-w-7xl">
            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <div className="grid md:grid-cols-3 gap-6 mb-20">
                <motion.div variants={fadeUp} className="g-panel p-6">
                  <p className="g-label mb-2">Policy Version</p>
                  <p className="text-3xl font-bold text-[var(--g-gold-soft)] g-numeric">
                    {policyVersion !== undefined ? `v${policyVersion.toString()}` : "—"}
                  </p>
                  <p className="text-[var(--g-text-xs)] text-[var(--g-muted)] mt-2">Active governance version</p>
                </motion.div>
                <motion.div variants={fadeUp} className="g-panel p-6">
                  <p className="g-label mb-2">Registry Status</p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-3xl font-bold text-green-500">Active</p>
                  </div>
                  <p className="text-[var(--g-text-xs)] text-[var(--g-muted)] mt-2">Arbitrum Sepolia Testnet</p>
                </motion.div>
                <motion.div variants={fadeUp} className="g-panel p-6">
                  <p className="g-label mb-2">Contract Address</p>
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-[var(--g-gold)] opacity-50" />
                    <code className="text-sm font-mono text-[var(--g-gold-soft)] g-numeric">0xbcaE...4679</code>
                  </div>
                  <div className="mt-4">
                    <a
                      href="https://sepolia.arbiscan.io/address/0xbcaE3069362B0f0b80f44139052f159456C84679"
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[var(--g-text-xs)] text-[var(--g-muted)] hover:text-[var(--g-paper)] transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View on Arbiscan
                    </a>
                  </div>
                </motion.div>
              </div>

              {/* CHECKERS */}
              <motion.div variants={fadeUp} className="mb-10">
                <h2 className="g-display text-[var(--g-text-xl)] mb-4">On-Chain Verification</h2>
                <p className="g-prose text-[var(--g-muted)]">Direct query interface for the GravitasPolicyRegistry smart contract.</p>
              </motion.div>
              
              <div className="grid md:grid-cols-2 gap-8">
                <motion.div variants={fadeUp}>
                  <AddressChecker
                    title="Asset Compliance"
                    placeholder="0x... (token address)"
                    functionName="isAssetCompliant"
                    description="Verify if a token is on the Shariah-compliant whitelist."
                  />
                </motion.div>
                <motion.div variants={fadeUp}>
                  <AddressChecker
                    title="Executor Authorization"
                    placeholder="0x... (executor address)"
                    functionName="isExecutor"
                    description="Verify if an address is authorized to execute migrations."
                  />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* DETAILS */}
        <section className="py-32 bg-[var(--g-navy)]">
          <div className="container px-6 mx-auto max-w-7xl">
            <div className="grid lg:grid-cols-2 gap-20">
              <div>
                <h2 className="g-display text-[var(--g-text-xl)] mb-8">Registry Governance</h2>
                <div className="g-prose text-[var(--g-paper-dim)] space-y-6">
                  <p>
                    The GravitasPolicyRegistry is a permissioned whitelist that acts as the source of truth for all protocol executions. For a migration to proceed, both the source and target tokens must be whitelisted.
                  </p>
                  <ul className="space-y-4">
                    <li className="flex gap-4">
                      <Scale className="h-6 w-6 text-[var(--g-gold)] shrink-0" />
                      <div>
                        <h4 className="font-bold text-[var(--g-paper)]">Advisory Oversight</h4>
                        <p className="text-[var(--g-text-sm)]">Policy decisions are guided by a board of Shariah scholars and institutional risk officers.</p>
                      </div>
                    </li>
                    <li className="flex gap-4">
                      <Building2 className="h-6 w-6 text-[var(--g-gold)] shrink-0" />
                      <div>
                        <h4 className="font-bold text-[var(--g-paper)]">Institutional Control</h4>
                        <p className="text-[var(--g-text-sm)]">Registry ownership will be transferred to a multi-signature wallet with timelock governance.</p>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="g-panel p-8">
                <h3 className="g-label mb-6">Technical Specification</h3>
                <div className="space-y-6">
                  <div className="border-b border-[var(--g-line)] pb-4">
                    <p className="text-[var(--g-text-xs)] text-[var(--g-muted)] uppercase mb-2">Function: areTokensCompliant</p>
                    <code className="text-xs text-[var(--g-paper)] block bg-[var(--g-navy)] p-3 rounded border border-[var(--g-line)]">
                      function areTokensCompliant(address tokenA, address tokenB) external view returns (bool)
                    </code>
                  </div>
                  <div>
                    <p className="text-[var(--g-text-xs)] text-[var(--g-muted)] uppercase mb-2">Execution Flow</p>
                    <ol className="text-[var(--g-text-sm)] text-[var(--g-paper-dim)] space-y-3 list-decimal list-inside">
                      <li>TeleportV3 receives migration intent.</li>
                      <li>Contract calls PolicyRegistry.areTokensCompliant().</li>
                      <li>If false, transaction reverts immediately.</li>
                      <li>If true, atomic migration proceeds.</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[var(--g-navy)] border-t border-[var(--g-line)] py-12">
        <div className="container px-6 mx-auto max-w-7xl flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="text-[var(--g-text-xs)] text-[var(--g-muted)]">
            © 2026 Gravitas Protocol. All policy changes are emitted as on-chain events.
          </div>
          <div className="flex gap-6 text-[var(--g-text-xs)] text-[var(--g-muted)]">
            <a href="https://github.com/AbZe628/gravitas-protocol" className="hover:text-[var(--g-paper)] transition-colors">GitHub</a>
            <a href="/docs" className="hover:text-[var(--g-paper)] transition-colors">Documentation</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
