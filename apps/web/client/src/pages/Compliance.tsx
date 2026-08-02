import { useState } from "react";
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
import Footer from "@/components/Footer";
import GeometryBackground from "@/components/GeometryBackground";
import BytecodeNotice from "@/components/BytecodeNotice";

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
    <div className="g-panel-raised p-8 bg-ink/40">
      <div className="mb-8">
        <h3 className="text-xl font-bold text-paper mb-3">{title}</h3>
        <p className="text-sm text-muted leading-relaxed">{description}</p>
      </div>
      
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder={placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="bg-ink border-line text-paper font-mono text-sm h-12 focus:border-gold transition-colors"
            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
          />
          <Button
            onClick={handleCheck}
            className="bg-gold text-ink hover:bg-goldsoft shrink-0 font-bold h-12 px-6 rounded-sm"
            disabled={isLoading}
          >
            {isLoading ? <div className="h-4 w-4 border-2 border-ink border-t-transparent rounded-full animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {address && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-6 rounded-xl border ${
              isLoading ? "border-line bg-surface/50" :
              isError ? "border-red-500/20 bg-red-500/5" :
              data ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"
            }`}
          >
            {isLoading ? (
              <div className="flex items-center gap-3 text-muted">
                <div className="h-4 w-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Querying on-chain registry...</span>
              </div>
            ) : isError ? (
              <div className="flex items-center gap-3 text-red-400">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-sm font-bold">Error querying contract</span>
              </div>
            ) : data ? (
              <div className="flex items-center gap-4 text-green-400">
                <CheckCircle className="h-6 w-6 shrink-0" />
                <div>
                  <p className="font-bold">Compliant ✓</p>
                  <p className="text-xs opacity-70">This address passes Shariah compliance checks</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 text-red-400">
                <XCircle className="h-6 w-6 shrink-0" />
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
    <div className="min-h-screen bg-ink text-paper selection:bg-gold/30 selection:text-goldsoft">
      <Header />

      <main className="pt-20">
        {/* HERO */}
        <section className="relative py-32 md:py-48 overflow-hidden">
          <GeometryBackground variant="simple" className="opacity-40" />
          <div className="container relative z-10">
            <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-4xl">
              <motion.div variants={fadeUp} className="mb-10">
                <span className="px-4 py-1.5 rounded-full bg-gold/5 border border-gold/20 text-goldsoft text-[10px] uppercase tracking-[0.2em] font-bold">
                  <Shield className="h-3 w-3 inline mr-2 mb-0.5" />
                  Policy Registry v1.0
                </span>
              </motion.div>
              <motion.h1 variants={fadeUp} className="display-xl mb-10">
                Compliance by Design
              </motion.h1>
              <motion.p variants={fadeUp} className="prose-institutional text-lg md:text-xl text-sand/80">
                Gravitas Protocol treats Shariah compliance as a technical requirement. Every migration is validated against the on-chain Policy Registry before execution.
              </motion.p>
            </motion.div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-surface hadid-sweep border-t border-gold/10" />
        </section>

        {/* REGISTRY STATUS */}
        <section className="relative py-32 bg-surface">
          <div className="container relative z-10">
            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <div className="grid md:grid-cols-3 gap-8 mb-32">
                {[
                  {
                    label: "Policy Version",
                    value: policyVersion !== undefined ? `v${policyVersion.toString()}` : "—",
                    desc: "Active governance version"
                  },
                  {
                    label: "Registry Status",
                    value: "Active",
                    desc: "Arbitrum Sepolia Testnet",
                    status: true
                  },
                  {
                    label: "Contract Address",
                    value: "0xbcaE...4679",
                    desc: "View on Arbiscan",
                    link: "https://sepolia.arbiscan.io/address/0xbcaE3069362B0f0b80f44139052f159456C84679"
                  }
                ].map((item, i) => (
                  <motion.div key={i} variants={fadeUp} className="g-panel p-8 bg-ink/20 hover:border-gold/30 transition-colors">
                    <p className="text-[10px] uppercase tracking-widest text-muted font-bold mb-6">{item.label}</p>
                    <div className="flex items-center gap-3 mb-2">
                      {item.status && <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
                      <p className={`text-4xl font-display ${item.status ? 'text-green-500' : 'text-goldsoft'}`}>
                        {item.value}
                      </p>
                    </div>
                    {item.link ? (
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-xs text-muted hover:text-paper flex items-center gap-2 mt-4 transition-colors">
                        <ExternalLink size={12} /> {item.desc}
                      </a>
                    ) : (
                      <p className="text-xs text-muted mt-4">{item.desc}</p>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* CHECKERS */}
              <motion.div variants={fadeUp} className="mb-16">
                <span className="text-[10px] uppercase tracking-[0.2em] text-gold font-bold mb-6 block">On-Chain Verification</span>
                <h2 className="text-3xl md:text-4xl mb-6">Real-Time Registry Query</h2>
                <p className="prose-institutional text-lg text-sand/70">Direct query interface for the GravitasPolicyRegistry smart contract.</p>
              </motion.div>
              
              <div className="grid lg:grid-cols-2 gap-10">
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
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-ink hadid-sweep border-t border-gold/10" />
        </section>

        {/* DETAILS */}
        <section className="py-48 bg-ink">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-32 items-center">
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={stagger}
              >
                <motion.span variants={fadeUp} className="text-[10px] uppercase tracking-[0.2em] text-gold font-bold mb-6 block">Governance</motion.span>
                <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl mb-10">Registry Oversight</motion.h2>
                <div className="space-y-12">
                  <motion.p variants={fadeUp} className="prose-institutional text-lg text-sand/70 leading-relaxed">
                    The GravitasPolicyRegistry is a permissioned whitelist that acts as the source of truth for all protocol executions. For a migration to proceed, both the source and target tokens must be whitelisted.
                  </motion.p>
                  <div className="grid gap-10">
                    {[
                      {
                        icon: Scale,
                        title: "Advisory Oversight",
                        desc: "Policy decisions are guided by a board of Shariah scholars and institutional risk officers."
                      },
                      {
                        icon: Building2,
                        title: "Institutional Control",
                        desc: "Registry ownership will be transferred to a multi-signature wallet with timelock governance."
                      }
                    ].map((item, i) => (
                      <motion.div key={i} variants={fadeUp} className="flex gap-6">
                        <div className="mt-1 h-10 w-10 rounded-lg bg-gold/5 border border-gold/20 flex items-center justify-center shrink-0">
                          <item.icon className="h-5 w-5 text-gold" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-paper mb-2">{item.title}</h4>
                          <p className="text-sm text-muted leading-relaxed max-w-md">{item.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
              >
                <div className="g-panel-raised p-10 bg-surface/30">
                  <h3 className="text-[10px] uppercase tracking-[0.2em] text-gold font-bold mb-10">Technical Specification</h3>
                  <div className="space-y-10">
                    <div className="border-b border-line pb-10">
                      <p className="text-[10px] uppercase tracking-widest text-muted font-bold mb-4">Function: areTokensCompliant</p>
                      <code className="text-xs text-goldsoft block bg-ink p-6 rounded-xl border border-line font-mono overflow-x-auto leading-relaxed">
                        function areTokensCompliant(address tokenA, address tokenB) external view returns (bool)
                      </code>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted font-bold mb-6">Execution Flow</p>
                      <ol className="space-y-6">
                        {[
                          "TeleportV3 receives migration intent.",
                          "Contract calls PolicyRegistry.areTokensCompliant().",
                          "If false, transaction reverts immediately.",
                          "If true, atomic migration proceeds."
                        ].map((step, i) => (
                          <li key={i} className="flex gap-4 text-sm text-sand/80 items-start">
                            <span className="h-6 w-6 rounded-full bg-gold/10 text-gold flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                  
                  <div className="mt-12">
                    <BytecodeNotice />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
