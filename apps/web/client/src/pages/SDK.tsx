import { usePageMeta } from "@/lib/pageMeta";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Code2, Package, Copy, CheckCheck, ChevronRight,
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
    <div className="rounded-xl border border-gold/10 bg-abyss overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gold/10 bg-canvas/50">
        <span className="text-xs text-white/60 font-mono">{title || language}</span>
        <Button size="sm" variant="ghost" onClick={copy} className="h-6 px-2 text-white/50 hover:text-gold">
          {copied ? <CheckCheck className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed">
        <code className="text-gold/90 font-mono">{code}</code>
      </pre>
    </div>
  );
}

export default function SDK() {
  usePageMeta("SDK", "The TypeScript SDK for Gravitas Protocol: install it, read the policy registry, and route through Teleport with a single view call.");

  return (
    <div className="min-h-screen bg-abyss text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gold/10 bg-abyss/90 backdrop-blur-xl" role="navigation">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6 mx-auto max-w-7xl">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link href="/dashboard">
              <div className="flex items-center gap-2 cursor-pointer shrink-0">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-gold to-gold-deep flex items-center justify-center">
                  <span className="text-abyss font-black text-sm">G</span>
                </div>
                <span className="font-bold text-white hidden sm:block">Gravitas</span>
              </div>
            </Link>
            <ChevronRight className="h-4 w-4 text-white/50 shrink-0" />
            <span className="text-white/60 text-sm truncate">SDK Reference</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Button asChild variant="ghost" size="sm" className="text-white/60 hover:text-white hidden sm:flex">
              <a href="/">Website</a>
            </Button>
            <Button asChild size="sm" className="bg-gold text-abyss hover:bg-gold/90 font-semibold text-xs sm:text-sm px-3 sm:px-4">
              <Link href="/dashboard">Launch App</Link>
            </Button>
          </div>
        </div>
      </nav>

      <div className="pt-16">
        {/* Hero */}
        <section className="relative py-24 border-b border-gold/10">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_srgb,var(--color-gold)_4%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_srgb,var(--color-gold)_4%,transparent)_1px,transparent_1px)] bg-[size:48px_48px]" />
          <div className="container relative z-10">
            <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-3xl">
              <motion.div variants={fadeUp}>
                <Badge className="mb-4 bg-gold/10 border-gold/30 text-gold">
                  <Package className="h-3 w-3 mr-2" />
                  TypeScript SDK
                </Badge>
              </motion.div>
              <motion.h1 variants={fadeUp} className="text-5xl font-bold mb-4">
                Gravitas SDK
              </motion.h1>
              <motion.p variants={fadeUp} className="text-xl text-white/50 leading-relaxed mb-6">
                Typed end to end, with the compliance check built into the path rather than
                bolted beside it: a migration that would break the ruling fails before a wallet
                is ever asked to sign it.
              </motion.p>
              <motion.div variants={fadeUp} className="flex gap-3">
                <Badge className="bg-white/5 border-white/10 text-white/60">v2.0.0</Badge>
                <Badge className="bg-white/5 border-white/10 text-white/60">TypeScript</Badge>
                <Badge className="bg-white/5 border-white/10 text-white/60">ESM + CJS</Badge>
                <Badge className="bg-amber-400/10 border-amber-400/25 text-amber-300">Testnet</Badge>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <div className="container py-16 max-w-5xl mx-auto">
          <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-16">

            {/* Installation */}
            <motion.section variants={fadeUp}>
              <div className="flex items-center gap-3 mb-6">
                <Terminal className="h-6 w-6 text-gold" />
                <h2 className="text-2xl font-bold">Installation</h2>
              </div>

              <div className="rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-4 mb-6">
                <p className="text-sm text-white/80 font-medium mb-1">Not on the public registry yet</p>
                <p className="text-sm text-white/60 leading-relaxed">
                  <code className="font-mono text-gold text-xs">npm install @gravitas/sdk</code> returns 404
                  today. Publishing waits on the independent audit, so that a package with this name cannot be
                  installed before the code behind it has been reviewed. Build it from the repository instead.
                </p>
              </div>

              <CodeBlock
                title="Build once, then reference by path"
                language="bash"
                code={`git clone https://github.com/AbZe628/gravitas-protocol.git
cd gravitas-protocol/gravitas-sdk
npm install && npm run build

# from your own project
npm install /path/to/gravitas-protocol/gravitas-sdk`}
              />

              <p className="text-sm text-white/60 mt-4 leading-relaxed">
                It brings <code className="font-mono text-gold text-xs">viem</code> ^2 and
                <code className="font-mono text-gold text-xs"> zod</code> ^3 with it, and ships ESM, CJS and
                type declarations.
              </p>
            </motion.section>

            {/* GravitasClient */}
            <motion.section variants={fadeUp}>
              <div className="flex items-center gap-3 mb-2">
                <Code2 className="h-6 w-6 text-gold" />
                <h2 className="text-2xl font-bold">GravitasClient</h2>
              </div>
              <p className="text-white/60 mb-6">The entry point. Four fields, all required.</p>

              <CodeBlock
                title="Initialize the client"
                code={`import { GravitasClient } from '@gravitas/sdk';

const client = new GravitasClient({
  rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
  chainId: 421614,
  registryAddress: '0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23',
  teleportV3Address: '0x6702C2CE6eD58ca3934eBBd785CaC1De8DCd85B4',
});

client.compliance;      // ComplianceService — a property, not a call
client.migration();     // a fresh MigrationBuilder
client.publicClient;    // the underlying viem client, if you need it`}
              />

              <div className="mt-6 grid md:grid-cols-2 gap-4">
                {[
                  { prop: "rpcUrl", type: "string", desc: "Must parse as a URL, or construction throws." },
                  { prop: "chainId", type: "number", desc: "421614 for Arbitrum Sepolia." },
                  { prop: "registryAddress", type: "Address", desc: "GravitasPolicyRegistry." },
                  { prop: "teleportV3Address", type: "Address", desc: "TeleportV3, and the EIP-712 verifying contract." },
                ].map((prop, i) => (
                  <div key={i} className="p-3 rounded-lg border border-gold/10 bg-canvas/40">
                    <code className="text-sm font-mono text-gold">{prop.prop}</code>
                    <p className="text-xs text-white/50 mt-0.5">{prop.type}</p>
                    <p className="text-xs text-white/60 mt-1">{prop.desc}</p>
                  </div>
                ))}
              </div>

              <p className="text-sm text-white/60 mt-4 leading-relaxed">
                There is no signer and no timeout field — the schema rejects anything it does not recognise.
                The SDK reads and simulates; signing and sending stay with your wallet client, so a private
                key never passes through it.
              </p>
            </motion.section>

            {/* Compliance API */}
            <motion.section variants={fadeUp}>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-6 w-6 text-gold" />
                <h2 className="text-2xl font-bold">ComplianceService</h2>
              </div>
              <p className="text-white/60 mb-6">
                Reached at <code className="font-mono text-gold text-sm">client.compliance</code>. The
                validators throw and name what was refused; the readers return a value to render.
              </p>

              <CodeBlock
                title="Validators — throw on refusal"
                code={`await client.compliance.validateAsset(token);
await client.compliance.validateTokens(token0, token1);
await client.compliance.validateRouter(router);
await client.compliance.validateExecutor(executor);

// All of the above, in one call, before you build anything.
await client.compliance.performPreFlightCheck(token0, token1, executor);`}
              />

              <div className="mt-6">
                <CodeBlock
                  title="Readers — return a value"
                  code={`const status = await client.compliance.getComplianceStatus(token0, token1);
// { tokenACompliant: boolean, tokenBCompliant: boolean, pairCompliant: boolean }

const version = await client.compliance.getPolicyVersion();
// bigint — increments on every change the board makes`}
                />
              </div>

              <div className="mt-6 rounded-xl border border-gold/20 bg-canvas/50 p-4">
                <p className="text-sm text-white/80 font-medium mb-2">Why these read the gated getters</p>
                <p className="text-sm text-white/60 leading-relaxed">
                  The registry can answer compliance from a public mapping or from a verifier that carries
                  <code className="font-mono text-gold text-xs"> whenNotPaused</code>. The mapping keeps
                  answering while the registry is paused; the verifier reverts. A pause is the board
                  withdrawing its ruling, so anything about to move value has to fail closed when it happens —
                  which is why the SDK reads the verifier and not the mapping.
                </p>
              </div>
            </motion.section>

            {/* Migration Builder */}
            <motion.section variants={fadeUp}>
              <div className="flex items-center gap-3 mb-2">
                <Zap className="h-6 w-6 text-gold" />
                <h2 className="text-2xl font-bold">MigrationBuilder</h2>
              </div>
              <p className="text-white/60 mb-6">
                Describes one migration of a Uniswap V3 position. Every setter returns the builder, and
                nothing is validated until you call <code className="font-mono text-gold text-sm">build()</code>,
                <code className="font-mono text-gold text-sm"> simulate()</code> or
                <code className="font-mono text-gold text-sm"> encodeCalldata()</code>.
              </p>

              <div className="space-y-6">
                <CodeBlock
                  title="Describe it"
                  code={`const migration = client.migration()
  .tokenId(123n)                 // Uniswap V3 position NFT
  .newFee(3000)                  // 100, 500, 3000 or 10000
  .ticks(-887220, 887220)        // both divisible by that tier's spacing
  .slippage(1n, 1n, 0n, 0n)      // mint0Min, mint1Min, decrease0Min, decrease1Min
  .deadline(BigInt(Math.floor(Date.now() / 1000) + 3600));

// Optional rebalancing swap on the way through.
migration.withSwap(true, amountIn, minOut, 3000);`}
                />

                <div className="rounded-xl border border-gold/25 bg-gold/[0.06] p-4">
                  <p className="text-sm text-white/80 font-medium mb-1">Both mint minimums must exceed zero</p>
                  <p className="text-sm text-white/60 leading-relaxed">
                    <code className="font-mono text-gold text-xs">slippage(0n, 0n, 0n, 0n)</code> reverts on
                    chain with <code className="font-mono text-gold text-xs">TV3: Zero slippage not allowed</code>.
                    A position that would accept any amount at all is not protected against an adverse move,
                    and TeleportV3 will not open one. The last two arguments bound what leaves the old
                    position and may be zero.
                  </p>
                </div>

                <CodeBlock
                  title="Simulate it"
                  code={`// A signature of the right shape is enough to simulate.
const probe = ('0x' + '00'.repeat(65)) as \`0x\${string}\`;

const result = await migration.simulate(userAddress, probe);
console.log(result.request);

// simulate() runs the compliance pre-flight first, so a non-compliant
// position throws ShariahViolationError before any RPC simulation runs.`}
                />

                <CodeBlock
                  title="Sign it and submit it"
                  code={`import { buildMigrationTypedData } from '@gravitas/sdk';

// The signature covers exactly these parameters, so read them back out.
const params = migration.build();

const nonce = await client.publicClient.readContract({
  address: teleportV3Address,
  abi: [{
    name: 'nonces', type: 'function', stateMutability: 'view',
    inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }],
  }],
  functionName: 'nonces',
  args: [owner],
});

const typedData = buildMigrationTypedData(params, nonce, teleportV3Address, 421614);
const signature = await walletClient.signTypedData({ account: owner, ...typedData });

// Raw calldata, for a multisig or a relayer to submit.
const calldata = migration.encodeCalldata(signature);`}
                />
              </div>

              <div className="mt-6 rounded-xl border border-gold/20 bg-canvas/50 p-4">
                <p className="text-sm text-white/80 font-medium mb-2">There is no V2 builder</p>
                <p className="text-sm text-white/60 leading-relaxed">
                  TeleportV2 is called directly, as
                  <code className="font-mono text-gold text-xs"> migrateLiquidityV2</code> with nine arguments,
                  by an address the registry lists as an executor. It is not wrapped by this SDK, because
                  Arbitrum Sepolia hosts no Uniswap V2 deployment for it to route through and a builder that
                  cannot be exercised is a builder nobody has tested.
                </p>
              </div>
            </motion.section>

            {/* Full example */}
            <motion.section variants={fadeUp}>
              <div className="flex items-center gap-3 mb-2">
                <Code2 className="h-6 w-6 text-gold" />
                <h2 className="text-2xl font-bold">End to end</h2>
              </div>
              <p className="text-white/60 mb-6">
                The whole path in one file: check the ruling, describe the move, simulate it, have the owner
                sign it, submit it.
              </p>

              <CodeBlock
                title="migrate.ts"
                code={`import { createWalletClient, custom, type Address } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { GravitasClient, buildMigrationTypedData } from '@gravitas/sdk';

const TELEPORT_V3 = '0x6702C2CE6eD58ca3934eBBd785CaC1De8DCd85B4' as const;
const REGISTRY = '0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23' as const;

const client = new GravitasClient({
  rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
  chainId: 421614,
  registryAddress: REGISTRY,
  teleportV3Address: TELEPORT_V3,
});

export async function migrate(tokenId: bigint, owner: Address) {
  const wallet = createWalletClient({
    account: owner,
    chain: arbitrumSepolia,
    transport: custom(window.ethereum),
  });

  const migration = client
    .migration()
    .tokenId(tokenId)
    .newFee(3000)
    .ticks(-887220, 887220)
    .slippage(1n, 1n, 0n, 0n)
    .deadline(BigInt(Math.floor(Date.now() / 1000) + 3600));

  // Simulate first. This also runs the compliance pre-flight, so a
  // non-compliant position fails here rather than in the wallet.
  const probe = ('0x' + '00'.repeat(65)) as \`0x\${string}\`;
  await migration.simulate(owner, probe);

  const nonce = await client.publicClient.readContract({
    address: TELEPORT_V3,
    abi: [{
      name: 'nonces', type: 'function', stateMutability: 'view',
      inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }],
    }],
    functionName: 'nonces',
    args: [owner],
  });

  const typedData = buildMigrationTypedData(
    migration.build(), nonce as bigint, TELEPORT_V3, 421614,
  );
  const signature = await wallet.signTypedData({ account: owner, ...typedData });

  // Simulate once more with the real signature, then send.
  const { request } = await migration.simulate(owner, signature);
  return wallet.writeContract(request);
}`}
              />
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
                        <Card className="border border-gold/10 bg-canvas/60 hover:border-gold/30 transition-all cursor-pointer group h-full">
                          <CardHeader className="pb-3">
                            <item.icon className="h-5 w-5 text-gold mb-2" />
                            <CardTitle className="text-white text-sm group-hover:text-gold transition-colors">{item.title}</CardTitle>
                            <p className="text-xs text-white/60">{item.desc}</p>
                          </CardHeader>
                        </Card>
                      </a>
                    ) : (
                      <Link href={item.href}>
                        <Card className="border border-gold/10 bg-canvas/60 hover:border-gold/30 transition-all cursor-pointer group h-full">
                          <CardHeader className="pb-3">
                            <item.icon className="h-5 w-5 text-gold mb-2" />
                            <CardTitle className="text-white text-sm group-hover:text-gold transition-colors">{item.title}</CardTitle>
                            <p className="text-xs text-white/60">{item.desc}</p>
                          </CardHeader>
                        </Card>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </motion.section>

            {/* CTA */}
            <motion.div variants={fadeUp} className="border border-gold/20 rounded-2xl p-8 bg-gradient-to-br from-gold/5 to-transparent text-center">
              <h3 className="text-2xl font-bold mb-2">Ready to build?</h3>
              <p className="text-white/50 mb-6">Launch the dashboard or explore the full documentation.</p>
              <div className="flex gap-4 justify-center">
                <Button asChild className="bg-gold text-abyss hover:bg-gold/90 font-semibold gap-2">
                  <Link href="/dashboard">Launch App <ArrowRight className="h-4 w-4" /></Link>
                </Button>
                <Button asChild variant="outline" className="border-gold/30 text-white hover:bg-gold/10 gap-2">
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
