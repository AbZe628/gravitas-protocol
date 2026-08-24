import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProtocolState } from "@/lib/protocolState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, Users, Activity, ArrowUpRight, ExternalLink, Shield, Zap, CheckCircle, Copy, CheckCheck } from "lucide-react";
import { useReadContract } from "wagmi";
import { CONTRACTS } from "@/lib/wagmi";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { Link } from "wouter";

const TELEPORT_V3_ABI = [
  {
    inputs: [],
    name: "paused",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const POLICY_REGISTRY_ABI = [
  {
    inputs: [],
    name: "getPolicyVersion",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Mock data for charts

function ContractAddress({ label, address, short, href }: { label: string; address: string; short: string; href: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="p-3 rounded-lg bg-canvas/50 border border-gold/10">
      <p className="text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">{label}</p>
      <div className="flex items-center justify-between gap-2">
        <code className="text-sm font-mono text-gold">{short}</code>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={copy} className="h-6 w-6 p-0 text-white/30 hover:text-gold">
            {copied ? <CheckCheck className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
          <a href={href} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/30 hover:text-gold">
              <ExternalLink className="h-3 w-3" />
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Overview() {
  const { data: isPaused } = useReadContract({
    address: CONTRACTS.TELEPORT_V3 as `0x${string}`,
    abi: TELEPORT_V3_ABI,
    functionName: "paused",
    chainId: 421614,
  });

  const { data: policyVersion } = useReadContract({
    address: CONTRACTS.POLICY_REGISTRY as `0x${string}`,
    abi: POLICY_REGISTRY_ABI,
    functionName: "getPolicyVersion",
    chainId: 421614,
  });

  /*
   * Four figures used to be written in here: $2.4M locked, $224K of daily
   * volume, 342 active users, 1,247 migrations, each with a percentage change
   * "vs last period". None of them came from anywhere. The protocol has never
   * held funds — the marketing page says exactly that, while this page was
   * claiming millions — and a dashboard that invents its own numbers is worse
   * than one with none, because a reader cannot tell which of the rest are real.
   *
   * These are read from the chain. Where the true answer is zero it says zero.
   */
  const chain = useProtocolState();

  const stats = [
    {
      title: "Policy version",
      value: chain.policyVersion === null ? "—" : String(chain.policyVersion),
      note: "Every change to the registry advances it",
      icon: Activity,
    },
    {
      title: "Registry",
      value: chain.registryPaused === null ? "—" : chain.registryPaused ? "Paused" : "Live",
      note: "Pausing halts every compliance check",
      icon: DollarSign,
    },
    {
      title: "Migrations",
      value: chain.migrations === null ? "—" : String(chain.migrations.length),
      note: "Recorded on chain in the recent window",
      icon: ArrowUpRight,
    },
    {
      title: "Addresses migrated",
      value: chain.uniqueUsers === null ? "—" : String(chain.uniqueUsers),
      note: "Distinct owners, not visits",
      icon: Users,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div key={index} variants={itemVariants}>
            <Card className="border-gold/20 bg-surface/50 backdrop-blur hover:border-gold/40 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-white/70">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-gold" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white tabular-nums">{stat.value}</div>
                <div className="mt-1 text-xs text-white/50">{stat.note}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/*
        Two charts stood here: a six-month total-value-locked trend rising to
        $2.4M, and a week of trading volume peaking near $240K. Both were drawn
        from arrays written into this file. The protocol has never held funds and
        has never migrated a position, so every point on both was invented — and a
        chart is unusually good at making an invented number look measured.

        They come back when there is something to plot, built from the same
        LiquidityTeleported events the migrations page reads.
      */}

      {/* Protocol Parameters & Contract Addresses */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="border-gold/20 bg-surface/50 backdrop-blur h-full">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-gold" />
                Protocol Parameters
              </CardTitle>
              <CardDescription className="text-white/70">
                Live on-chain configuration from TeleportV3
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-4 rounded-xl bg-canvas/50 border border-gold/10">
                <p className="text-xs text-white/40 mb-1 uppercase tracking-wider">Protocol Status</p>
                <p className="text-2xl font-bold text-white">
                  {isPaused !== undefined ? (isPaused ? "🔴 Paused" : "🟢 Active") : (
                    <span className="text-white/30 text-lg">Querying...</span>
                  )}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-canvas/50 border border-gold/10">
                <p className="text-xs text-white/40 mb-1 uppercase tracking-wider">Policy Version</p>
                <p className="text-2xl font-bold text-white">
                  {policyVersion !== undefined ? `v${policyVersion.toString()}` : (
                    <span className="text-white/30 text-lg">Querying...</span>
                  )}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-canvas/50 border border-gold/10">
                <p className="text-xs text-white/40 mb-1 uppercase tracking-wider">Network</p>
                <Badge className="bg-gold text-canvas mt-1">Arbitrum Sepolia · Chain 421614</Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-gold/20 bg-surface/50 backdrop-blur h-full">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-gold" />
                Deployed Contracts
              </CardTitle>
              <CardDescription className="text-white/70">
                Verified on Arbitrum Sepolia
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ContractAddress
                label="GravitasPolicyRegistry"
                address="0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23"
                short="0x6f3b…3F23"
                href="https://sepolia.arbiscan.io/address/0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23"
              />
              <ContractAddress
                label="TeleportV3"
                address="0x6702C2CE6eD58ca3934eBBd785CaC1De8DCd85B4"
                short="0x6702…85B4"
                href="https://sepolia.arbiscan.io/address/0x6702C2CE6eD58ca3934eBBd785CaC1De8DCd85B4"
              />

              <div className="pt-2 space-y-2">
                {[
                  "✅ 90%+ test coverage enforced by CI",
                  "✅ Deterministic mocks & fuzz testing",
                  "✅ Internal security review passed",
                  "✅ EIP-712 replay protection",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                    <p className="text-xs text-white/50">{item.replace("✅ ", "")}</p>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex gap-2">
                <Button asChild size="sm" variant="outline" className="flex-1 border-gold/30 text-gold hover:bg-gold/10 text-xs">
                  <Link href="/compliance">
                    <Shield className="h-3 w-3 mr-1" />
                    Compliance Check
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="flex-1 border-gold/30 text-gold hover:bg-gold/10 text-xs">
                  <Link href="/docs">
                    Docs
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <Card className="border-gold/20 bg-surface/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
            <CardDescription className="text-white/70">Common tasks and navigation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Migrate V2", desc: "Uniswap V2 → V2/V3", href: "/dashboard/migrate", icon: "⚡" },
                { label: "Migrate V3", desc: "EIP-712 signed", href: "/dashboard/migrate", icon: "🔐" },
                { label: "View Analytics", desc: "Protocol statistics", href: "/dashboard/analytics", icon: "📊" },
                { label: "Transaction History", desc: "Past migrations", href: "/dashboard/history", icon: "📋" },
              ].map((action, i) => (
                <Link key={i} href={action.href}>
                  <div className="p-4 rounded-xl border border-gold/10 bg-canvas/30 hover:border-gold/30 hover:bg-canvas/50 transition-all cursor-pointer group">
                    <div className="text-2xl mb-2">{action.icon}</div>
                    <p className="font-semibold text-white text-sm group-hover:text-gold transition-colors">{action.label}</p>
                    <p className="text-xs text-white/40 mt-0.5">{action.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

    </motion.div>
  );
}
