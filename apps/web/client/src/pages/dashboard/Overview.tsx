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
    <div className="p-4 rounded-[var(--g-radius)] bg-[var(--g-navy)] border border-[var(--g-line)] group">
      <p className="g-label text-[10px] text-[var(--g-muted)] mb-2">{label}</p>
      <div className="flex items-center justify-between gap-4">
        <code className="text-xs font-mono text-[var(--g-gold-soft)] g-numeric">{short}</code>
        <div className="flex gap-2">
          <button onClick={copy} className="text-[var(--g-muted)] hover:text-[var(--g-gold-soft)] transition-colors">
            {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--g-muted)] hover:text-[var(--g-gold-soft)] transition-colors">
            <ExternalLink className="h-3.5 w-3.5" />
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

  const stats = [
    { title: "Total Value Locked", value: "$2.4M", change: "+12.3%", trend: "up", icon: DollarSign },
    { title: "24h Volume", value: "$224K", change: "+8.7%", trend: "up", icon: Activity },
    { title: "Active Users", value: "342", change: "+15.2%", trend: "up", icon: Users },
    { title: "Migrations", value: "1,247", change: "+23.1%", trend: "up", icon: ArrowUpRight },
  ];

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div key={index} variants={itemVariants} initial="hidden" animate="visible">
            <div className="g-panel p-6 hover:border-[var(--g-gold)]/30 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <p className="g-label text-[10px] text-[var(--g-muted)]">{stat.title}</p>
                <stat.icon className="h-4 w-4 text-[var(--g-gold)] opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-2xl font-bold text-[var(--g-paper)] g-numeric mb-2">{stat.value}</div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${stat.trend === "up" ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"}`}>
                  {stat.change}
                </span>
                <span className="text-[10px] text-[var(--g-muted)]">vs last period</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-8 lg:grid-cols-2">
        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <div className="g-panel p-8">
            <div className="mb-8">
              <h3 className="text-[var(--g-text-base)] font-bold text-[var(--g-paper)]">Total Value Locked</h3>
              <p className="text-[var(--g-text-xs)] text-[var(--g-muted)]">Institutional liquidity depth</p>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={tvlData}>
                <defs>
                  <linearGradient id="colorTvl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#D4AF37" opacity={0.05} vertical={false} />
                <XAxis dataKey="date" stroke="var(--g-muted)" opacity={0.5} tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--g-muted)" opacity={0.5} tick={{ fontSize: 10, fontWeight: 700 }} tickFormatter={(v) => `$${(v/1000000).toFixed(1)}M`} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--g-navy)", border: "1px solid var(--g-line)", borderRadius: "var(--g-radius)" }}
                  labelStyle={{ color: "var(--g-paper)", fontWeight: 700 }}
                  itemStyle={{ color: "var(--g-gold-soft)" }}
                  formatter={(v: number) => [`$${(v/1000000).toFixed(2)}M`, "TVL"]}
                />
                <Area type="monotone" dataKey="value" stroke="var(--g-gold)" strokeWidth={2} fill="url(#colorTvl)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <div className="g-panel p-8">
            <div className="mb-8">
              <h3 className="text-[var(--g-text-base)] font-bold text-[var(--g-paper)]">Migration Volume</h3>
              <p className="text-[var(--g-text-xs)] text-[var(--g-muted)]">Weekly teleportation activity</p>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D4AF37" opacity={0.05} vertical={false} />
                <XAxis dataKey="date" stroke="var(--g-muted)" opacity={0.5} tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--g-muted)" opacity={0.5} tick={{ fontSize: 10, fontWeight: 700 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--g-navy)", border: "1px solid var(--g-line)", borderRadius: "var(--g-radius)" }}
                  labelStyle={{ color: "var(--g-paper)", fontWeight: 700 }}
                  itemStyle={{ color: "var(--g-gold-soft)" }}
                  formatter={(v: number) => [`$${(v/1000).toFixed(0)}K`, "Volume"]}
                />
                <Line type="monotone" dataKey="volume" stroke="var(--g-gold)" strokeWidth={2} dot={{ fill: "var(--g-gold)", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Protocol Details */}
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="g-panel p-8">
          <div className="flex items-center gap-3 mb-8">
            <Zap className="h-5 w-5 text-[var(--g-gold)]" />
            <h3 className="text-[var(--g-text-base)] font-bold text-[var(--g-paper)]">Protocol Parameters</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-[var(--g-surface)] rounded-[var(--g-radius)] border border-[var(--g-line)]">
              <span className="g-label text-[10px] text-[var(--g-muted)]">STATUS</span>
              <span className="text-xs font-bold text-[var(--g-paper)]">
                {isPaused !== undefined ? (isPaused ? "PAUSED" : "ACTIVE") : "LOADING..."}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-[var(--g-surface)] rounded-[var(--g-radius)] border border-[var(--g-line)]">
              <span className="g-label text-[10px] text-[var(--g-muted)]">POLICY VERSION</span>
              <span className="text-xs font-bold text-[var(--g-paper)] g-numeric">
                {policyVersion !== undefined ? `v${policyVersion.toString()}` : "LOADING..."}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-[var(--g-surface)] rounded-[var(--g-radius)] border border-[var(--g-line)]">
              <span className="g-label text-[10px] text-[var(--g-muted)]">NETWORK</span>
              <span className="text-[10px] font-bold text-[var(--g-gold-soft)] bg-[var(--g-gold-wash)] px-2 py-0.5 rounded border border-[var(--g-gold)]/20">
                ARBITRUM SEPOLIA
              </span>
            </div>
          </div>
        </div>

        <div className="g-panel p-8">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="h-5 w-5 text-[var(--g-gold)]" />
            <h3 className="text-[var(--g-text-base)] font-bold text-[var(--g-paper)]">Core Infrastructure</h3>
          </div>
          <div className="space-y-4">
            <ContractAddress
              label="POLICY REGISTRY"
              address="0xbcaE3069362B0f0b80f44139052f159456C84679"
              short="0xbcaE...4679"
              href="https://sepolia.arbiscan.io/address/0xbcaE3069362B0f0b80f44139052f159456C84679"
            />
            <ContractAddress
              label="TELEPORT ENGINE"
              address="0x5D423f8d01539B92D3f3953b91682D9884D1E993"
              short="0x5D42...E993"
              href="https://sepolia.arbiscan.io/address/0x5D423f8d01539B92D3f3953b91682D9884D1E993"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
