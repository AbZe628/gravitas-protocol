import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";
import { TrendingUp, Activity, Users, Zap, DollarSign, Shield } from "lucide-react";

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const monthlyData = [
  { month: "Sep", tvl: 800000, volume: 120000, migrations: 45 },
  { month: "Oct", tvl: 1100000, volume: 180000, migrations: 72 },
  { month: "Nov", tvl: 1350000, volume: 220000, migrations: 98 },
  { month: "Dec", tvl: 1600000, volume: 280000, migrations: 134 },
  { month: "Jan", tvl: 2000000, volume: 340000, migrations: 189 },
  { month: "Feb", tvl: 2400000, volume: 420000, migrations: 247 },
];

const feeDistribution = [
  { name: "0.01%", value: 12, color: "#D4AF37" },
  { name: "0.05%", value: 28, color: "#F4D03F" },
  { name: "0.3%", value: 45, color: "#B8941F" },
  { name: "1%", value: 15, color: "#8B6914" },
];

const dailyMigrations = [
  { day: "Mon", v2: 12, v3: 18 },
  { day: "Tue", v2: 19, v3: 24 },
  { day: "Wed", v2: 15, v3: 21 },
  { day: "Thu", v2: 22, v3: 31 },
  { day: "Fri", v2: 28, v3: 38 },
  { day: "Sat", v2: 18, v3: 25 },
  { day: "Sun", v2: 14, v3: 19 },
];

const gasData = [
  { week: "W1", avgGas: 0.0021, savings: 0.0008 },
  { week: "W2", avgGas: 0.0019, savings: 0.0009 },
  { week: "W3", avgGas: 0.0024, savings: 0.0007 },
  { week: "W4", avgGas: 0.0022, savings: 0.0010 },
  { week: "W5", avgGas: 0.0018, savings: 0.0012 },
  { week: "W6", avgGas: 0.0020, savings: 0.0011 },
];

const topPairs = [
  { pair: "WETH/USDC", volume: "$1.2M", migrations: 234 },
  { pair: "WBTC/WETH", volume: "$890K", migrations: 156 },
  { pair: "DAI/USDC", volume: "$650K", migrations: 128 },
  { pair: "LINK/WETH", volume: "$420K", migrations: 89 },
  { pair: "UNI/WETH", volume: "$310K", migrations: 67 },
];

const tooltipStyle = {
  contentStyle: { backgroundColor: "var(--g-navy)", border: "1px solid var(--g-line)", borderRadius: "var(--g-radius)" },
  labelStyle: { color: "var(--g-paper)", fontWeight: 700 },
  itemStyle: { color: "var(--g-gold-soft)" },
};

export default function Analytics() {
  const kpis = [
    { label: "Total Migrations", value: "1,247", change: "+23.1%", icon: Zap },
    { label: "Total Volume", value: "$2.4M", change: "+18.4%", icon: DollarSign },
    { label: "Unique Users", value: "342", change: "+15.2%", icon: Users },
    { label: "Gas Saved/Tx", value: "~2,000", change: "Yul inline", icon: Activity },
    { label: "Compliance Rate", value: "100%", change: "All-time", icon: Shield },
    { label: "Protocol Revenue", value: "$1,847", change: "+31.2%", icon: TrendingUp },
  ];

  return (
    <div className="space-y-8">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={i} variants={itemVariants} initial="hidden" animate="visible">
            <div className="g-panel p-6">
              <kpi.icon className="h-4 w-4 text-[var(--g-gold)] mb-4 opacity-50" />
              <p className="text-xl font-bold text-[var(--g-paper)] g-numeric mb-1">{kpi.value}</p>
              <p className="g-label text-[10px] text-[var(--g-muted)]">{kpi.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* TVL & Volume */}
      <motion.div variants={itemVariants} initial="hidden" animate="visible">
        <div className="g-panel p-8">
          <div className="mb-8">
            <h3 className="text-[var(--g-text-base)] font-bold text-[var(--g-paper)]">Protocol Performance</h3>
            <p className="text-[var(--g-text-xs)] text-[var(--g-muted)]">TVL and Volume growth trajectory</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorTvl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#D4AF37" opacity={0.05} vertical={false} />
              <XAxis dataKey="month" stroke="var(--g-muted)" opacity={0.5} tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" stroke="var(--g-muted)" opacity={0.5} tick={{ fontSize: 10, fontWeight: 700 }} tickFormatter={(v) => `$${(v/1000000).toFixed(1)}M`} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" stroke="var(--g-muted)" opacity={0.5} tick={{ fontSize: 10, fontWeight: 700 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [
                name === "tvl" ? `$${(v/1000000).toFixed(2)}M` : `$${(v/1000).toFixed(0)}K`,
                name === "tvl" ? "TVL" : "Volume"
              ]} />
              <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
              <Area yAxisId="left" type="monotone" dataKey="tvl" stroke="var(--g-gold)" strokeWidth={2} fill="url(#colorTvl)" />
              <Area yAxisId="right" type="monotone" dataKey="volume" stroke="#60a5fa" strokeWidth={2} fill="url(#colorVol)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Daily Migrations & Fee Distribution */}
      <div className="grid lg:grid-cols-2 gap-8">
        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <div className="g-panel p-8">
            <div className="mb-8">
              <h3 className="text-[var(--g-text-base)] font-bold text-[var(--g-paper)]">Migration Activity</h3>
              <p className="text-[var(--g-text-xs)] text-[var(--g-muted)]">V2 to V3 engine utilization</p>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyMigrations}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D4AF37" opacity={0.05} vertical={false} />
                <XAxis dataKey="day" stroke="var(--g-muted)" opacity={0.5} tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--g-muted)" opacity={0.5} tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="v2" name="V2 Migrations" fill="var(--g-gold)" opacity={0.6} radius={[2, 2, 0, 0]} />
                <Bar dataKey="v3" name="V3 Migrations" fill="#60a5fa" opacity={0.6} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <div className="g-panel p-8">
            <div className="mb-8">
              <h3 className="text-[var(--g-text-base)] font-bold text-[var(--g-paper)]">Target Fee Distribution</h3>
              <p className="text-[var(--g-text-xs)] text-[var(--g-muted)]">Preferred liquidity fee tiers</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={feeDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value">
                    {feeDistribution.map((entry, index) => (
                      <Cell key={index} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, "Share"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full space-y-3">
                {feeDistribution.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-[var(--g-surface)] rounded border border-[var(--g-line)]">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[10px] font-bold text-[var(--g-paper)]">{item.name}</span>
                    </div>
                    <span className="text-[10px] font-bold text-[var(--g-gold-soft)] g-numeric">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Gas Optimization */}
      <motion.div variants={itemVariants} initial="hidden" animate="visible">
        <div className="g-panel p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h3 className="text-[var(--g-text-base)] font-bold text-[var(--g-paper)]">Gas Efficiency</h3>
              <p className="text-[var(--g-text-xs)] text-[var(--g-muted)]">Yul-optimized assembly performance</p>
            </div>
            <div className="text-[10px] font-bold text-green-400 bg-green-400/10 px-3 py-1 rounded-full border border-green-400/20 uppercase tracking-widest">
              ~2,000 GAS SAVED / TX
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={gasData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D4AF37" opacity={0.05} vertical={false} />
              <XAxis dataKey="week" stroke="var(--g-muted)" opacity={0.5} tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis stroke="var(--g-muted)" opacity={0.5} tick={{ fontSize: 10, fontWeight: 700 }} tickFormatter={(v) => `${v.toFixed(4)}`} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v.toFixed(4)} ETH`, ""]} />
              <Line type="monotone" dataKey="avgGas" name="Avg Gas Cost" stroke="var(--g-gold)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="savings" name="Gas Saved (Yul)" stroke="#4ade80" strokeWidth={2} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Top Pairs */}
      <motion.div variants={itemVariants} initial="hidden" animate="visible">
        <div className="g-panel p-8">
          <div className="mb-8">
            <h3 className="text-[var(--g-text-base)] font-bold text-[var(--g-paper)]">Institutional Pairs</h3>
            <p className="text-[var(--g-text-xs)] text-[var(--g-muted)]">Top liquidity migration targets</p>
          </div>
          <div className="space-y-4">
            {topPairs.map((pair, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-[var(--g-surface)] rounded-[var(--g-radius)] border border-[var(--g-line)] group hover:border-[var(--g-gold)]/30 transition-all">
                <div className="flex items-center gap-6">
                  <span className="text-xs font-bold text-[var(--g-gold)] opacity-40 group-hover:opacity-100 transition-opacity g-numeric">0{index + 1}</span>
                  <div>
                    <p className="text-sm font-bold text-[var(--g-paper)]">{pair.pair}</p>
                    <p className="text-[10px] text-[var(--g-muted)] uppercase tracking-widest">{pair.migrations} migrations</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[var(--g-paper)] g-numeric">{pair.volume}</p>
                  <p className="text-[10px] text-[var(--g-muted)] uppercase tracking-widest">24h Volume</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
