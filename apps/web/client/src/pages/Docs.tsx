import { usePageMeta } from "@/lib/pageMeta";
import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ARBISCAN, DEPLOYMENT } from "@/lib/wagmi";
import { motion } from "framer-motion";
import {
  BookOpen, Code2, Shield, Zap, Copy, CheckCheck,
  ExternalLink, ChevronRight, Terminal, Package, FileCode, Menu, X
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
    <div className="relative group rounded-xl border border-gold/10 bg-abyss overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gold/10 bg-canvas/50">
        <span className="text-xs text-white/50 font-mono">{language}</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={copy}
          className="h-6 px-2 text-white/50 hover:text-gold"
        >
          {copied ? <CheckCheck className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <div className="overflow-x-auto overflow-y-hidden max-h-96 sm:max-h-full">
        <pre className="p-3 sm:p-4 text-xs sm:text-sm min-w-min">
        <code className="text-gold/90 font-mono whitespace-pre-wrap break-words sm:whitespace-pre">{code}</code>
      </pre>
      </div>
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
  usePageMeta("Documentation", "How Gravitas routes liquidity under an approved Shariah ruling — the registry, the checker interface, and integration for institutions.");

  const [activeSection, setActiveSection] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const clicked = useRef<string | null>(null);

  /* Take the reader to the section. scroll-mt on each heading clears the fixed nav. */
  const goTo = useCallback((id: string) => {
    setActiveSection(id);
    clicked.current = id;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", "#" + id);
    window.setTimeout(() => { clicked.current = null; }, 700);
  }, []);

  /* And let the sidebar follow the reader, so the highlight is where their eyes are. */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (clicked.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-72px 0px -70% 0px", threshold: 0 },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  /* A link that arrives with #section should land on it, not at the top. */
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id || !sections.some((s) => s.id === id)) return;
    window.setTimeout(() => goTo(id), 120);
  }, [goTo]);

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
            <span className="text-white/60 text-sm">Documentation</span>
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
            className="md:hidden border-t border-gold/10 bg-canvas/95 backdrop-blur max-h-[60vh] overflow-y-auto"
          >
            <div className="px-4 py-4 space-y-2">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    goTo(s.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all text-left ${
                    activeSection === s.id
                      ? "bg-gold/15 text-gold"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <s.icon className="h-4 w-4 shrink-0" />
                  {s.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </nav>

      <div className="flex flex-col lg:flex-row pt-16">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 fixed left-0 top-16 bottom-0 border-r border-gold/10 bg-abyss/80 backdrop-blur overflow-y-auto">
          <div className="p-4">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Documentation</p>
            <nav className="space-y-1">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => goTo(s.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all text-left ${
                    activeSection === s.id
                      ? "bg-gold/15 text-gold"
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
          <div className="max-w-4xl mx-auto px-4 md:px-6 py-12">
            <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-12">

              {/* Overview */}
              <motion.section variants={fadeUp} className="scroll-mt-24" id="overview">
                <Badge className="mb-4 bg-gold/10 border-gold/30 text-gold">Documentation</Badge>
                <h1 className="text-3xl md:text-4xl font-bold mb-4">Gravitas Protocol Docs</h1>
                <p className="text-base md:text-lg text-white/60 leading-relaxed mb-6">
                  Gravitas Protocol is an institutional-grade, Shariah-compliant liquidity infrastructure
                  built on Arbitrum. This documentation covers everything you need to integrate
                  with the protocol — from the TypeScript SDK to direct contract interactions.
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { icon: Terminal, title: "Quick Start", desc: "From clone to a simulated migration", to: "quickstart" as const },
                    { icon: Package, title: "SDK Reference", desc: "Every method the TypeScript SDK exposes", href: "/sdk" },
                    { icon: Shield, title: "Compliance API", desc: "Query the policy registry live", href: "/compliance" },
                  ].map((card, i) => {
                    const body = (
                      <Card className="h-full border border-gold/10 bg-canvas/60 hover:border-gold/30 transition-all cursor-pointer group">
                        <CardHeader className="pb-3">
                          <card.icon className="h-5 w-5 text-gold mb-2" />
                          <CardTitle className="text-white text-sm group-hover:text-gold transition-colors">{card.title}</CardTitle>
                          <p className="text-xs text-white/60">{card.desc}</p>
                        </CardHeader>
                      </Card>
                    );
                    return card.to ? (
                      <button key={i} type="button" onClick={() => goTo(card.to)} className="text-left">{body}</button>
                    ) : (
                      <Link key={i} href={card.href!}>{body}</Link>
                    );
                  })}
                </div>
              </motion.section>

              {/* Quick Start */}
              <motion.section variants={fadeUp} className="scroll-mt-24" id="quickstart">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
                  <Terminal className="h-6 w-6 text-gold" />
                  Quick Start
                </h2>
                <p className="text-white/60 mb-6">
                  Four steps from an empty file to a simulated migration. Every call below is one the
                  SDK actually exposes; where the shape is easy to get wrong, it says why.
                </p>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-white/80">1. Build the SDK</h3>
                    <p className="text-sm text-white/60 mb-3">
                      The package is not on the public registry yet — publishing waits on the independent
                      audit. Build it from the repository and reference it by path.
                    </p>
                    <CodeBlock code={`git clone https://github.com/AbZe628/gravitas-protocol.git
cd gravitas-protocol/gravitas-sdk
npm install
npm run build`} language="bash" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-white/80">2. Initialize the client</h3>
                    <CodeBlock code={`import { GravitasClient } from '@gravitas/sdk';

const client = new GravitasClient({
  rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
  chainId: 421614,
  registryAddress: '0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23',
  teleportV3Address: '0x6702C2CE6eD58ca3934eBBd785CaC1De8DCd85B4',
});`} language="typescript" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-white/80">3. Ask the registry first</h3>
                    <CodeBlock code={`// compliance is a property, not a method call.
const status = await client.compliance.getComplianceStatus(token0, token1);

if (!status.pairCompliant) {
  throw new Error('This pair is not covered by the current ruling');
}

// Or let it raise: validateTokens throws ShariahViolationError and
// names the token that failed, which is what you want in a log.
await client.compliance.validateTokens(token0, token1);`} language="typescript" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-white/80">4. Simulate before you sign</h3>
                    <CodeBlock code={`// Simulation needs a signature of the right shape, not a valid one.
const probe = ('0x' + '00'.repeat(65)) as \`0x\${string}\`;

const result = await client.migration()
  .tokenId(123n)
  .newFee(3000)               // 100, 500, 3000 or 10000 — nothing else
  .ticks(-887220, 887220)     // both divisible by the tier's spacing
  .slippage(1n, 1n, 0n, 0n)   // both mint minimums must exceed zero
  .deadline(BigInt(Math.floor(Date.now() / 1000) + 3600))
  .simulate(userAddress, probe);

console.log(result.request);`} language="typescript" />
                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-gold/25 bg-gold/[0.06] p-4">
                  <p className="text-sm text-white/80 font-medium mb-1">Zero slippage is refused on chain</p>
                  <p className="text-sm text-white/60 leading-relaxed">
                    <code className="font-mono text-gold text-xs">slippage(0n, 0n, 0n, 0n)</code> reverts with
                    <code className="font-mono text-gold text-xs"> TV3: Zero slippage not allowed</code>. A new
                    position that would accept any amount at all is not protected, and TeleportV3 will not open
                    one. The first two arguments are the mint minimums and both must exceed zero; the last two
                    bound what comes back out of the old position and may be zero.
                  </p>
                </div>
              </motion.section>

              {/* SDK Installation */}
              <motion.section variants={fadeUp} className="scroll-mt-24" id="sdk">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
                  <Package className="h-6 w-6 text-gold" />
                  SDK Installation
                </h2>
                <p className="text-white/60 mb-6">
                  <code className="font-mono text-gold text-sm">@gravitas/sdk</code> v2.0.0 — TypeScript,
                  built on viem, with runtime validation by zod.
                </p>

                <div className="rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-4 mb-6">
                  <p className="text-sm text-white/80 font-medium mb-1">Not yet on the public registry</p>
                  <p className="text-sm text-white/60 leading-relaxed">
                    <code className="font-mono text-gold text-xs">npm install @gravitas/sdk</code> returns 404
                    today, and will until the audit is finished. Until then the package is consumed from the
                    repository — the instructions below are the ones that work.
                  </p>
                </div>

                <CodeBlock code={`# Build it once
git clone https://github.com/AbZe628/gravitas-protocol.git
cd gravitas-protocol/gravitas-sdk
npm install && npm run build

# Then reference it from your project
npm install /path/to/gravitas-protocol/gravitas-sdk`} language="bash" />

                <h3 className="text-lg font-semibold mt-8 mb-3 text-white/80">Client configuration</h3>
                <p className="text-sm text-white/60 mb-4">
                  Four fields, all required. The schema rejects anything missing or malformed at construction
                  time rather than at the first call.
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    { prop: "rpcUrl", type: "string", desc: "Must parse as a URL." },
                    { prop: "chainId", type: "number", desc: "421614 for Arbitrum Sepolia." },
                    { prop: "registryAddress", type: "0x…", desc: "GravitasPolicyRegistry." },
                    { prop: "teleportV3Address", type: "0x…", desc: "TeleportV3, and the EIP-712 verifying contract." },
                  ].map((prop, i) => (
                    <div key={i} className="p-3 rounded-lg border border-gold/10 bg-canvas/40">
                      <code className="text-sm font-mono text-gold">{prop.prop}</code>
                      <p className="text-xs text-white/50 mt-0.5">{prop.type}</p>
                      <p className="text-xs text-white/60 mt-1">{prop.desc}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-white/60 mt-4 leading-relaxed">
                  There is no <code className="font-mono text-gold text-xs">signer</code> field. The SDK reads
                  and simulates; signing and sending stay with your wallet client, so a private key never
                  passes through it.
                </p>
              </motion.section>

              {/* Contract Addresses */}
              <motion.section variants={fadeUp} className="scroll-mt-24" id="contracts">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
                  <FileCode className="h-6 w-6 text-gold" />
                  Contract Addresses
                </h2>
                <p className="text-white/60 mb-6">
                  Four contracts, deployed 23 August 2026 on Arbitrum Sepolia (chain 421614) and verified.
                  The bytecode at each address is built from the source in this repository at the commit
                  that deployed it.
                </p>

                <div className="space-y-4">
                  {DEPLOYMENT.map((contract) => (
                    <Card key={contract.address} className="border border-gold/10 bg-canvas/60">
                      <CardContent className="pt-4">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-white mb-1">{contract.name}</h4>
                            <p className="text-sm text-white/60 mb-3">{contract.role}</p>
                            <code className="text-xs md:text-sm font-mono text-gold bg-abyss px-3 py-1 rounded-lg border border-gold/10 break-all">
                              {contract.address}
                            </code>
                          </div>
                          <a href={ARBISCAN + contract.address} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="border-gold/30 text-gold hover:bg-gold/10 shrink-0 whitespace-nowrap">
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

              {/* Compliance API */}
              <motion.section variants={fadeUp} className="scroll-mt-24" id="compliance">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
                  <Shield className="h-6 w-6 text-gold" />
                  Compliance API
                </h2>
                <p className="text-white/60 mb-6">
                  <code className="font-mono text-gold text-sm">client.compliance</code> is a property holding
                  a ComplianceService. The validators throw; the readers return.
                </p>

                <CodeBlock code={`// Throw on failure — the message names what was refused.
await client.compliance.validateAsset(token);       // ShariahViolationError
await client.compliance.validateTokens(t0, t1);     // ShariahViolationError
await client.compliance.validateRouter(router);     // Error
await client.compliance.validateExecutor(executor); // UnauthorizedExecutorError

// Everything at once, before building anything.
await client.compliance.performPreFlightCheck(token0, token1, executor);

// Return rather than throw — for a screen that has to render a state.
const status = await client.compliance.getComplianceStatus(t0, t1);
// { tokenACompliant, tokenBCompliant, pairCompliant }

const version = await client.compliance.getPolicyVersion();`} language="typescript" />

                <div className="mt-6 rounded-xl border border-gold/20 bg-canvas/50 p-4">
                  <p className="text-sm text-white/80 font-medium mb-2">Two ways to ask the same question</p>
                  <p className="text-sm text-white/60 leading-relaxed">
                    The registry answers compliance twice. The public mappings —
                    <code className="font-mono text-gold text-xs"> isAssetCompliant</code>,
                    <code className="font-mono text-gold text-xs"> isExecutor</code>,
                    <code className="font-mono text-gold text-xs"> isRouterAuthorized</code> — are plain storage
                    reads and keep answering even while the registry is paused. The verifiers —
                    <code className="font-mono text-gold text-xs"> verifyAssetCompliance</code> and its
                    siblings — carry <code className="font-mono text-gold text-xs">whenNotPaused</code> and
                    revert instead.
                  </p>
                  <p className="text-sm text-white/60 leading-relaxed mt-2">
                    That difference is the point. A pause is the board withdrawing its ruling, and anything
                    about to move value must fail closed when it happens. The SDK reads the verifiers for
                    exactly that reason. Read the mappings only where a stale answer is harmless.
                  </p>
                </div>
              </motion.section>

              {/* TeleportV2 */}
              <motion.section variants={fadeUp} className="scroll-mt-24" id="teleport-v2">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
                  <Zap className="h-6 w-6 text-gold" />
                  TeleportV2
                </h2>
                <p className="text-white/60 mb-6">
                  The constant-product path: burn an LP position at one factory and re-add it through an
                  authorized router, in one call, with no intermediate custody.
                </p>

                <CodeBlock code={`function migrateLiquidityV2(
    address factoryFrom,
    address routerTo,
    address tokenA,
    address tokenB,
    uint256 lpAmount,
    uint256 amountAMin,
    uint256 amountBMin,
    uint256 deadline,
    address recipient
) external;`} language="solidity" />

                <div className="mt-6 space-y-3">
                  {[
                    { k: "Caller", v: "onlyAuthorized — the registry must list the caller as an executor." },
                    { k: "Destination", v: "routerTo must be authorized in the registry, or the call reverts." },
                    { k: "Assets", v: "Both tokens are checked against the ruling in the same transaction." },
                    { k: "Policy", v: "setPolicy(cooldownSeconds, maxMoveBps) bounds how often and how far liquidity may move." },
                  ].map((row) => (
                    <div key={row.k} className="flex flex-col sm:flex-row gap-1 sm:gap-4 text-sm">
                      <span className="text-gold font-medium sm:w-32 shrink-0">{row.k}</span>
                      <span className="text-white/60">{row.v}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-4">
                  <p className="text-sm text-white/80 font-medium mb-1">Deployed, but not exercisable on this network</p>
                  <p className="text-sm text-white/60 leading-relaxed">
                    Arbitrum Sepolia hosts no Uniswap V2 deployment. TeleportV2 is live and verified at its
                    address and its tests pass, but there is no pair on this testnet for it to migrate. Better
                    stated here than discovered by an integrator halfway through a build.
                  </p>
                </div>
              </motion.section>

              {/* TeleportV3 */}
              <motion.section variants={fadeUp} className="scroll-mt-24" id="teleport-v3">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
                  <Zap className="h-6 w-6 text-gold" />
                  TeleportV3
                </h2>
                <p className="text-white/60 mb-6">
                  A concentrated-liquidity position moves in one transaction, against an intent its owner
                  signed. The executor submits; the owner authorizes. They need not be the same party.
                </p>

                <h3 className="text-lg font-semibold mb-3 text-white/80">Signing an intent</h3>
                <CodeBlock code={`import { buildMigrationTypedData } from '@gravitas/sdk';

const migration = client.migration()
  .tokenId(123n)
  .newFee(3000)
  .ticks(-887220, 887220)
  .slippage(1n, 1n, 0n, 0n)
  .deadline(BigInt(Math.floor(Date.now() / 1000) + 3600));

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

// Simulate with the real signature, then submit it.
await migration.simulate(owner, signature);
const calldata = migration.encodeCalldata(signature);`} language="typescript" />

                <h3 className="text-lg font-semibold mt-8 mb-3 text-white/80">What the contract checks</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    { k: "Fee tier", v: "100, 500, 3000 or 10000. Anything else reverts." },
                    { k: "Tick spacing", v: "1, 10, 60 and 200 respectively. Both ticks must divide evenly." },
                    { k: "Mint minimums", v: "Both strictly greater than zero." },
                    { k: "Signature", v: "EIP-712 over the full parameter set plus the owner's nonce." },
                    { k: "Executor", v: "The submitter must be authorized in the registry." },
                    { k: "Assets", v: "Both tokens of the position must be compliant at execution time." },
                  ].map((row) => (
                    <div key={row.k} className="p-3 rounded-lg border border-gold/10 bg-canvas/40">
                      <p className="text-sm text-gold font-medium">{row.k}</p>
                      <p className="text-xs text-white/60 mt-1">{row.v}</p>
                    </div>
                  ))}
                </div>

                <p className="text-sm text-white/60 mt-4 leading-relaxed">
                  The EIP-712 domain is <code className="font-mono text-gold text-xs">GravitasTeleportV3</code>,
                  version <code className="font-mono text-gold text-xs">1</code>, with TeleportV3 as the
                  verifying contract. The nonce increments on use, so an intent is spent once.
                </p>
              </motion.section>

              {/* Error Reference */}
              <motion.section variants={fadeUp} className="scroll-mt-24" id="errors">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
                  <Code2 className="h-6 w-6 text-gold" />
                  Error Reference
                </h2>
                <p className="text-white/60 mb-6">
                  The revert strings the contracts actually emit, and what each one means when it appears in
                  a failed transaction.
                </p>

                <h3 className="text-lg font-semibold mb-3 text-white/80">TeleportV3</h3>
                <div className="space-y-2 mb-8">
                  {[
                    ["TV3: Zero slippage not allowed", "A mint minimum was zero. Both must exceed it."],
                    ["TV3: Unsupported fee", "Fee tier is not 100, 500, 3000 or 10000."],
                    ["TV3: Invalid tick spacing", "A tick is not divisible by the tier's spacing."],
                    ["TV3: Invalid ticks", "Lower tick is not below upper."],
                    ["TV3: Invalid signature", "The signature does not recover to the position owner over these exact parameters and nonce."],
                    ["TV3: Not authorized executor", "The registry does not list the submitter."],
                    ["TV3: Non-compliant assets", "A token of the position is not covered by the current ruling."],
                    ["TV3: Deadline expired", "The intent's deadline is in the past."],
                    ["TV3: No liquidity", "The position holds nothing to migrate."],
                    ["TV3: Swap exceeds available", "The rebalancing swap asks for more than the position released."],
                  ].map(([code, meaning]) => (
                    <div key={code} className="flex flex-col sm:flex-row gap-1 sm:gap-4 p-3 rounded-lg border border-gold/10 bg-canvas/40">
                      <code className="text-xs font-mono text-gold sm:w-64 shrink-0">{code}</code>
                      <span className="text-sm text-white/60">{meaning}</span>
                    </div>
                  ))}
                </div>

                <h3 className="text-lg font-semibold mb-3 text-white/80">GravitasPolicyRegistry</h3>
                <div className="space-y-2 mb-8">
                  {[
                    ["GPR: Asset not Shariah-compliant", "The asset is not on the approved list, or the check ran while the registry was paused."],
                    ["GPR: Calling contract not an authorized executor", "The caller is not an executor."],
                    ["GPR: Invalid asset address", "The zero address was passed to a setter."],
                    ["GPR: Invalid router address", "The zero address was passed to a setter."],
                    ["GPR: Invalid executor address", "The zero address was passed to a setter."],
                  ].map(([code, meaning]) => (
                    <div key={code} className="flex flex-col sm:flex-row gap-1 sm:gap-4 p-3 rounded-lg border border-gold/10 bg-canvas/40">
                      <code className="text-xs font-mono text-gold sm:w-64 shrink-0">{code}</code>
                      <span className="text-sm text-white/60">{meaning}</span>
                    </div>
                  ))}
                </div>

                <h3 className="text-lg font-semibold mb-3 text-white/80">SDK</h3>
                <div className="space-y-2">
                  {[
                    ["ShariahViolationError", "A token failed the ruling. Thrown by validateAsset and validateTokens."],
                    ["UnauthorizedExecutorError", "The executor is not authorized. Thrown by validateExecutor."],
                    ["InvalidMigrationParamsError", "Parameters failed validation before anything was sent."],
                    ["ZodError", "A required field was never set, or set to the wrong type. Thrown by build(), simulate() and encodeCalldata()."],
                  ].map(([code, meaning]) => (
                    <div key={code} className="flex flex-col sm:flex-row gap-1 sm:gap-4 p-3 rounded-lg border border-gold/10 bg-canvas/40">
                      <code className="text-xs font-mono text-gold sm:w-64 shrink-0">{code}</code>
                      <span className="text-sm text-white/60">{meaning}</span>
                    </div>
                  ))}
                </div>
              </motion.section>

            </motion.div>
          </div>
        </main>
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
