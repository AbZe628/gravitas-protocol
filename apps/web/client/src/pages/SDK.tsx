import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Code2, Package, Copy, CheckCheck, ChevronRight, Home,
  Terminal, Zap, Shield, ArrowRight, ExternalLink, BookOpen
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

function CodeBlock({ code, language = "typescript", title }: { code: string; language?: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rounded-xl border border-[#D4AF37]/10 bg-[#060E1A] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#D4AF37]/10 bg-[#0A1628]/50">
        <span className="text-xs text-white/40 font-mono">{title || language}</span>
        <Button size="sm" variant="ghost" onClick={copy} className="h-6 px-2 text-white/30 hover:text-[#D4AF37]">
          {copied ? <CheckCheck className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed">
        <code className="text-[#D4AF37]/90 font-mono">{code}</code>
      </pre>
    </div>
  );
}

export default function SDK() {
  return (
    <div className="min-h-screen bg-[#060E1A] text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#D4AF37]/10 bg-[#060E1A]/90 backdrop-blur-xl" role="navigation">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6 mx-auto max-w-7xl">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer shrink-0">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#B8941F] flex items-center justify-center">
                  <span className="text-[#060E1A] font-black text-sm">G</span>
                </div>
                <span className="font-bold text-white hidden sm:block">Gravitas</span>
              </div>
            </Link>
            <ChevronRight className="h-4 w-4 text-white/30 shrink-0" />
            <span className="text-white/60 text-sm truncate">SDK Reference</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Button asChild variant="ghost" size="sm" className="text-white/60 hover:text-white hidden sm:flex">
              <Link href="/"><Home className="h-4 w-4 mr-2" />Home</Link>
            </Button>
            <Button asChild size="sm" className="bg-[#D4AF37] text-[#060E1A] hover:bg-[#D4AF37]/90 font-semibold text-xs sm:text-sm px-3 sm:px-4">
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
                  <Package className="h-3 w-3 mr-2" />
                  TypeScript SDK
                </Badge>
              </motion.div>
              <motion.h1 variants={fadeUp} className="text-5xl font-bold mb-4">
                Gravitas SDK
              </motion.h1>
              <motion.p variants={fadeUp} className="text-xl text-white/50 leading-relaxed mb-6">
                A Stripe-like developer experience for institutional DeFi integrations.
                Fully typed, pre-flight compliance checks, and a fluent builder API.
              </motion.p>
              <motion.div variants={fadeUp} className="flex gap-3">
                <Badge className="bg-white/5 border-white/10 text-white/60">v1.0.0</Badge>
                <Badge className="bg-white/5 border-white/10 text-white/60">TypeScript</Badge>
                <Badge className="bg-white/5 border-white/10 text-white/60">ESM + CJS</Badge>
                <Badge className="bg-green-500/10 border-green-500/20 text-green-400">Stable</Badge>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <div className="container py-16 max-w-5xl mx-auto">
          <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-16">

            {/* Installation */}
            <motion.section variants={fadeUp}>
              <div className="flex items-center gap-3 mb-6">
                <Terminal className="h-6 w-6 text-[#D4AF37]" />
                <h2 className="text-2xl font-bold">Installation</h2>
              </div>
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                {[
                  { pm: "npm", cmd: "npm install @gravitas/sdk" },
                  { pm: "yarn", cmd: "yarn add @gravitas/sdk" },
                  { pm: "pnpm", cmd: "pnpm add @gravitas/sdk" },
                ].map((item, i) => (
                  <CodeBlock key={i} code={item.cmd} language={item.pm} />
                ))}
              </div>
            </motion.section>

            {/* GravitasClient */}
            <motion.section variants={fadeUp}>
              <div className="flex items-center gap-3 mb-2">
                <Code2 className="h-6 w-6 text-[#D4AF37]" />
                <h2 className="text-2xl font-bold">GravitasClient</h2>
              </div>
              <p className="text-white/50 mb-6">The main entry point for all SDK interactions.</p>

              <CodeBlock
                title="Initialize client"
                code={`import { GravitasClient } from '@gravitas/sdk';

const client = new GravitasClient({
  rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
  chainId: 421614,
  registryAddress: '0xbcaE3069362B0f0b80f44139052f159456C84679',
  teleportV3Address: '0x5D423f8d01539B92D3f3953b91682D9884D1E993',
});`}
              />

              <div className="mt-6 grid md:grid-cols-3 gap-4">
                {[
                  { prop: "rpcUrl", type: "string", desc: "Arbitrum Sepolia RPC endpoint" },
                  { prop: "chainId", type: "number", desc: "Chain ID (421614 for Arbitrum Sepolia)" },
                  { prop: "registryAddress", type: "`0x${string}`", desc: "GravitasPolicyRegistry contract address" },
                  { prop: "teleportV3Address", type: "`0x${string}`", desc: "TeleportV3 contract address" },
                  { prop: "signer", type: "Signer (optional)", desc: "Ethers.js signer for write operations" },
                  { prop: "timeout", type: "number (optional)", desc: "Request timeout in milliseconds" },
                ].map((prop, i) => (
                  <div key={i} className="p-3 rounded-lg border border-[#D4AF37]/10 bg-[#0A1628]/40">
                    <code className="text-sm font-mono text-[#D4AF37]">{prop.prop}</code>
                    <p className="text-xs text-white/30 mt-0.5">{prop.type}</p>
                    <p className="text-xs text-white/50 mt-1">{prop.desc}</p>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* Compliance API */}
            <motion.section variants={fadeUp}>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-6 w-6 text-[#D4AF37]" />
                <h2 className="text-2xl font-bold">Compliance API</h2>
              </div>
              <p className="text-white/50 mb-6">Pre-flight Shariah compliance checks before any migration.</p>

              <CodeBlock
                title="compliance.ts"
                code={`const compliance = client.compliance();

// Check if an asset is Shariah-compliant
const isCompliant = await compliance.isAssetCompliant(
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' // USDC
);

// Check if an executor is authorized
const isAuthorized = await compliance.isExecutorAuthorized(
  '0x...' // executor address
);

// Get current policy version
const version = await compliance.getPolicyVersion();

// Run full pre-flight check (throws if any check fails)
await compliance.preflight({
  tokenA: '0x...',
  tokenB: '0x...',
  executor: '0x...',
});`}
              />
            </motion.section>

            {/* Migration Builder */}
            <motion.section variants={fadeUp}>
              <div className="flex items-center gap-3 mb-2">
                <Zap className="h-6 w-6 text-[#D4AF37]" />
                <h2 className="text-2xl font-bold">Migration Builder</h2>
              </div>
              <p className="text-white/50 mb-6">Fluent builder API for constructing and executing migrations.</p>

              <div className="space-y-6">
                <CodeBlock
                  title="V3 Migration (simulate)"
                  code={`const result = await client.migration()
  .tokenId(123n)                    // Uniswap V3 NFT position ID
  .newFee(3000)                     // Target fee tier (500, 3000, 10000)
  .ticks(-887220, 887220)           // tickLower, tickUpper
  .slippage(0n, 0n, 0n, 0n)        // amount0Min/Max for decrease/mint
  .deadline(BigInt(Math.floor(Date.now() / 1000) + 3600))
  .simulate(userAddress);

console.log('Gas estimate:', result.gasEstimate);
console.log('Expected output:', result.expectedAmounts);`}
                />

                <CodeBlock
                  title="V3 Migration (execute with EIP-712)"
                  code={`// Step 1: Build migration params
const migration = client.migration()
  .tokenId(123n)
  .newFee(3000)
  .ticks(-887220, 887220)
  .slippage(0n, 0n, 0n, 0n)
  .deadline(BigInt(Math.floor(Date.now() / 1000) + 3600));

// Step 2: Get current nonce
const nonce = await migration.getNonce(userAddress);

// Step 3: Sign with EIP-712
const signature = await migration.sign(signer, nonce);

// Step 4: Execute atomically
const tx = await migration.execute(signature);
const receipt = await tx.wait();

console.log('Migration successful:', receipt.transactionHash);`}
                />

                <CodeBlock
                  title="V2 Migration"
                  code={`const tx = await client.migrationV2()
  .pair('0x...')                    // Uniswap V2 pair address
  .lpAmount(BigInt('1000000000000000000')) // LP token amount (1 LP)
  .routerTo('0x...')                // Destination router
  .deadline(BigInt(Math.floor(Date.now() / 1000) + 3600))
  .execute();

const receipt = await tx.wait();`}
                />
              </div>
            </motion.section>

            {/* SDK Snippet Generator */}
            <motion.section variants={fadeUp}>
              <div className="flex items-center gap-3 mb-2">
                <Code2 className="h-6 w-6 text-[#D4AF37]" />
                <h2 className="text-2xl font-bold">SDK Snippet Generator</h2>
              </div>
              <p className="text-white/50 mb-6">Generate ready-to-use code snippets for your integration.</p>

              <Card className="border border-[#D4AF37]/10 bg-[#0A1628]/60">
                <CardHeader>
                  <CardTitle className="text-white text-base">Example Integration</CardTitle>
                  <CardDescription className="text-white/50">Copy this snippet to get started immediately</CardDescription>
                </CardHeader>
                <CardContent>
                  <CodeBlock
                    title="Full integration example"
                    code={`import { GravitasClient } from '@gravitas/sdk';
import { ethers } from 'ethers';

async function migratePosition(tokenId: bigint) {
  // Initialize provider and signer
  const provider = new ethers.JsonRpcProvider(
    'https://sepolia-rollup.arbitrum.io/rpc'
  );
  const signer = new ethers.Wallet(process.env.WALLET_SIGNER_KEY!, provider);

  // Initialize Gravitas client
  const client = new GravitasClient({
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    chainId: 421614,
    registryAddress: '0xbcaE3069362B0f0b80f44139052f159456C84679',
    teleportV3Address: '0x5D423f8d01539B92D3f3953b91682D9884D1E993',
    signer,
  });

  // Pre-flight compliance check
  await client.compliance().preflight({
    tokenA: '0x...', // your token addresses
    tokenB: '0x...',
    executor: await signer.getAddress(),
  });

  // Build and execute migration
  const migration = client.migration()
    .tokenId(tokenId)
    .newFee(3000)
    .ticks(-887220, 887220)
    .slippage(0n, 0n, 0n, 0n)
    .deadline(BigInt(Math.floor(Date.now() / 1000) + 3600));

  const nonce = await migration.getNonce(await signer.getAddress());
  const signature = await migration.sign(signer, nonce);
  const tx = await migration.execute(signature);

  console.log('Migration tx:', tx.hash);
  return await tx.wait();
}`}
                  />
                </CardContent>
              </Card>
            </motion.section>

            {/* Resources */}
            <motion.section variants={fadeUp}>
              <h2 className="text-2xl font-bold mb-6">Resources</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { icon: BookOpen, title: "Documentation", desc: "Full API reference and guides", href: "/docs", external: false },
                  { icon: Shield, title: "Compliance API", desc: "Shariah compliance integration", href: "/compliance", external: false },
                  { icon: ExternalLink, title: "GitHub", desc: "Source code and examples", href: "https://github.com/AbZe628/gravitas-protocol", external: true },
                ].map((item, i) => (
                  <div key={i}>
                    {item.external ? (
                      <a href={item.href} target="_blank" rel="noopener noreferrer">
                        <Card className="border border-[#D4AF37]/10 bg-[#0A1628]/60 hover:border-[#D4AF37]/30 transition-all cursor-pointer group h-full">
                          <CardHeader className="pb-3">
                            <item.icon className="h-5 w-5 text-[#D4AF37] mb-2" />
                            <CardTitle className="text-white text-sm group-hover:text-[#D4AF37] transition-colors">{item.title}</CardTitle>
                            <p className="text-xs text-white/40">{item.desc}</p>
                          </CardHeader>
                        </Card>
                      </a>
                    ) : (
                      <Link href={item.href}>
                        <Card className="border border-[#D4AF37]/10 bg-[#0A1628]/60 hover:border-[#D4AF37]/30 transition-all cursor-pointer group h-full">
                          <CardHeader className="pb-3">
                            <item.icon className="h-5 w-5 text-[#D4AF37] mb-2" />
                            <CardTitle className="text-white text-sm group-hover:text-[#D4AF37] transition-colors">{item.title}</CardTitle>
                            <p className="text-xs text-white/40">{item.desc}</p>
                          </CardHeader>
                        </Card>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </motion.section>

            {/* CTA */}
            <motion.div variants={fadeUp} className="border border-[#D4AF37]/20 rounded-2xl p-8 bg-gradient-to-br from-[#D4AF37]/5 to-transparent text-center">
              <h3 className="text-2xl font-bold mb-2">Ready to build?</h3>
              <p className="text-white/50 mb-6">Launch the dashboard or explore the full documentation.</p>
              <div className="flex gap-4 justify-center">
                <Button asChild className="bg-[#D4AF37] text-[#060E1A] hover:bg-[#D4AF37]/90 font-semibold gap-2">
                  <Link href="/dashboard">Launch App <ArrowRight className="h-4 w-4" /></Link>
                </Button>
                <Button asChild variant="outline" className="border-[#D4AF37]/30 text-white hover:bg-[#D4AF37]/10 gap-2">
                  <a href="https://github.com/AbZe628/gravitas-protocol" target="_blank" rel="noopener noreferrer">
                    GitHub <ExternalLink className="h-4 w-4" />
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
