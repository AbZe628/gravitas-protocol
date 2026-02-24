import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    name: "cooldownPeriod",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "maxMoveBps",
    outputs: [{ name: "", type: "uint16" }],
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
const tvlData = [
  { date: "Jan", value: 1200000 },
  { date: "Feb", value: 1450000 },
  { date: "Mar", value: 1680000 },
  { date: "Apr", value: 1920000 },
  { date: "May", value: 2150000 },
  { date: "Jun", value: 2400000 },
];

const volumeData = [
  { date: "Mon", volume: 145000 },
  { date: "Tue", volume: 182000 },
  { date: "Wed", volume: 156000 },
  { date: "Thu", volume: 198000 },
  { date: "Fri", volume: 224000 },
  { date: "Sat", volume: 189000 },
  { date: "Sun", volume: 167000 },
];

function ContractAddress({ label, address, short, href }: { label: string; address: string; short: string; href: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="p-3 rounded-lg bg-[#0A1628]/50 border border-[#D4AF37]/10">
      <p className="text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">{label}</p>
      <div className="flex items-center justify-between gap-2">
        <code className="text-sm font-mono text-[#D4AF37]">{short}</code>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={copy} className="h-6 w-6 p-0 text-white/30 hover:text-[#D4AF37]">
            {copied ? <CheckCheck className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
          <a href={href} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/30 hover:text-[#D4AF37]">
              <ExternalLink className="h-3 w-3" />
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Overview() {
  const { data: cooldownPeriod } = useReadContract({
    address: CONTRACTS.TELEPORT_V3 as `0x${string}`,
    abi: TELEPORT_V3_ABI,
    functionName: "cooldownPeriod",
    chainId: 421614,
  });

  const { data: maxMoveBps } = useReadContract({
    address: CONTRACTS.TELEPORT_V3 as `0x${string}`,
    abi: TELEPORT_V3_ABI,
    functionName: "maxMoveBps",
    chainId: 421614,
  });

  const { data: policyVersion } = useReadContract({
    address: CONTRACTS.POLICY_REGISTRY as `0x${string}`,
    abi: POLICY_REGISTRY_ABI,
    functionName: "getPolicyVersion",
    chainId: 421614,
  });

  const stats = [
    { title: "Total Value Locked", value: "$2.4M", change: "+12.3%", trend: "up", icon: DollarSign },
    { title: "24h Volume", value: "$224K", change: "+8.7%", trend: "up", icon: Activity },
    { title: "Active Users", value: "342", change: "+15.2%", trend: "up", icon: Users },
    { title: "Migrations", value: "1,247", change: "+23.1%", trend: "up", icon: ArrowUpRight },
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
            <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur hover:border-[#D4AF37]/40 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-white/70">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-[#D4AF37]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="flex items-center gap-1 mt-1">
                  {stat.trend === "up" ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={`text-xs ${stat.trend === "up" ? "text-green-500" : "text-red-500"}`}>
                    {stat.change}
                  </span>
                  <span className="text-xs text-white/50 ml-1">vs last period</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Total Value Locked</CardTitle>
              <CardDescription className="text-white/70">6-month TVL trend</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={tvlData}>
                  <defs>
                    <linearGradient id="colorTvl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D4AF37" opacity={0.1} />
                  <XAxis dataKey="date" stroke="#fff" opacity={0.5} tick={{ fontSize: 12 }} />
                  <YAxis stroke="#fff" opacity={0.5} tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v/1000000).toFixed(1)}M`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0F1E35", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "8px" }}
                    labelStyle={{ color: "#fff" }}
                    formatter={(v: number) => [`$${(v/1000000).toFixed(2)}M`, "TVL"]}
                  />
                  <Area type="monotone" dataKey="value" stroke="#D4AF37" strokeWidth={2} fill="url(#colorTvl)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Weekly Volume</CardTitle>
              <CardDescription className="text-white/70">Last 7 days trading volume</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={volumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D4AF37" opacity={0.1} />
                  <XAxis dataKey="date" stroke="#fff" opacity={0.5} tick={{ fontSize: 12 }} />
                  <YAxis stroke="#fff" opacity={0.5} tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0F1E35", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "8px" }}
                    labelStyle={{ color: "#fff" }}
                    formatter={(v: number) => [`$${(v/1000).toFixed(0)}K`, "Volume"]}
                  />
                  <Line type="monotone" dataKey="volume" stroke="#D4AF37" strokeWidth={2} dot={{ fill: "#D4AF37", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Protocol Parameters & Contract Addresses */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur h-full">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-[#D4AF37]" />
                Protocol Parameters
              </CardTitle>
              <CardDescription className="text-white/70">
                Live on-chain configuration from TeleportV3
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-4 rounded-xl bg-[#0A1628]/50 border border-[#D4AF37]/10">
                <p className="text-xs text-white/40 mb-1 uppercase tracking-wider">Cooldown Period</p>
                <p className="text-2xl font-bold text-white">
                  {cooldownPeriod !== undefined ? `${Number(cooldownPeriod) / 60} min` : (
                    <span className="text-white/30 text-lg">Querying...</span>
                  )}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#0A1628]/50 border border-[#D4AF37]/10">
                <p className="text-xs text-white/40 mb-1 uppercase tracking-wider">Max Price Movement</p>
                <p className="text-2xl font-bold text-white">
                  {maxMoveBps !== undefined ? `${Number(maxMoveBps) / 100}%` : (
                    <span className="text-white/30 text-lg">Querying...</span>
                  )}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#0A1628]/50 border border-[#D4AF37]/10">
                <p className="text-xs text-white/40 mb-1 uppercase tracking-wider">Policy Version</p>
                <p className="text-2xl font-bold text-white">
                  {policyVersion !== undefined ? `v${policyVersion.toString()}` : (
                    <span className="text-white/30 text-lg">Querying...</span>
                  )}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#0A1628]/50 border border-[#D4AF37]/10">
                <p className="text-xs text-white/40 mb-1 uppercase tracking-wider">Network</p>
                <Badge className="bg-[#D4AF37] text-[#0A1628] mt-1">Arbitrum Sepolia · Chain 421614</Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur h-full">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#D4AF37]" />
                Deployed Contracts
              </CardTitle>
              <CardDescription className="text-white/70">
                Verified on Arbitrum Sepolia
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ContractAddress
                label="GravitasPolicyRegistry"
                address="0xbcaE3069362B0f0b80f44139052f159456C84679"
                short="0xbcaE...4679"
                href="https://sepolia.arbiscan.io/address/0xbcaE3069362B0f0b80f44139052f159456C84679"
              />
              <ContractAddress
                label="TeleportV3"
                address="0x5D423f8d01539B92D3f3953b91682D9884D1E993"
                short="0x5D42...E993"
                href="https://sepolia.arbiscan.io/address/0x5D423f8d01539B92D3f3953b91682D9884D1E993"
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
                <Button asChild size="sm" variant="outline" className="flex-1 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 text-xs">
                  <Link href="/compliance">
                    <Shield className="h-3 w-3 mr-1" />
                    Compliance Check
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="flex-1 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 text-xs">
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
        <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
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
                  <div className="p-4 rounded-xl border border-[#D4AF37]/10 bg-[#0A1628]/30 hover:border-[#D4AF37]/30 hover:bg-[#0A1628]/50 transition-all cursor-pointer group">
                    <div className="text-2xl mb-2">{action.icon}</div>
                    <p className="font-semibold text-white text-sm group-hover:text-[#D4AF37] transition-colors">{action.label}</p>
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
