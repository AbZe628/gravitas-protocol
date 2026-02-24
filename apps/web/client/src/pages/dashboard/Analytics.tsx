import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";
import { TrendingUp, Activity, Users, Zap, DollarSign, Shield } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
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
  contentStyle: {
    backgroundColor: "#0F1E35",
    border: "1px solid rgba(212,175,55,0.2)",
    borderRadius: "8px",
    color: "#fff",
  },
  labelStyle: { color: "#fff" },
};

export default function Analytics() {
  const kpis = [
    { label: "Total Migrations", value: "1,247", change: "+23.1%", icon: Zap, color: "text-[#D4AF37]" },
    { label: "Total Volume", value: "$2.4M", change: "+18.4%", icon: DollarSign, color: "text-green-400" },
    { label: "Unique Users", value: "342", change: "+15.2%", icon: Users, color: "text-blue-400" },
    { label: "Gas Saved/Tx", value: "~2,000", change: "Yul inline", icon: Activity, color: "text-purple-400" },
    { label: "Compliance Rate", value: "100%", change: "All-time", icon: Shield, color: "text-[#D4AF37]" },
    { label: "Protocol Revenue", value: "$1,847", change: "+31.2%", icon: TrendingUp, color: "text-green-400" },
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi, i) => (
          <motion.div key={i} variants={itemVariants}>
            <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
              <CardContent className="pt-4 pb-4">
                <kpi.icon className={`h-4 w-4 ${kpi.color} mb-2`} />
                <p className="text-xl font-bold text-white">{kpi.value}</p>
                <p className="text-xs text-white/40 mt-0.5">{kpi.label}</p>
                <Badge className="mt-1 bg-transparent border-white/10 text-white/40 text-xs px-1">{kpi.change}</Badge>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* TVL & Volume */}
      <motion.div variants={itemVariants}>
        <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">TVL & Volume Growth</CardTitle>
            <CardDescription className="text-white/70">6-month protocol performance</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorTvl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#D4AF37" opacity={0.1} />
                <XAxis dataKey="month" stroke="#fff" opacity={0.5} tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" stroke="#fff" opacity={0.5} tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v/1000000).toFixed(1)}M`} />
                <YAxis yAxisId="right" orientation="right" stroke="#fff" opacity={0.5} tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} />
                <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [
                  name === "tvl" ? `$${(v/1000000).toFixed(2)}M` : `$${(v/1000).toFixed(0)}K`,
                  name === "tvl" ? "TVL" : "Volume"
                ]} />
                <Legend formatter={(v) => v === "tvl" ? "TVL" : "Volume"} />
                <Area yAxisId="left" type="monotone" dataKey="tvl" stroke="#D4AF37" strokeWidth={2} fill="url(#colorTvl)" />
                <Area yAxisId="right" type="monotone" dataKey="volume" stroke="#60a5fa" strokeWidth={2} fill="url(#colorVol)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Daily Migrations & Fee Distribution */}
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Daily Migrations by Type</CardTitle>
              <CardDescription className="text-white/70">V2 vs V3 migration volume</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyMigrations}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D4AF37" opacity={0.1} />
                  <XAxis dataKey="day" stroke="#fff" opacity={0.5} tick={{ fontSize: 12 }} />
                  <YAxis stroke="#fff" opacity={0.5} tick={{ fontSize: 12 }} />
                  <Tooltip {...tooltipStyle} />
                  <Legend />
                  <Bar dataKey="v2" name="V2 Migrations" fill="#D4AF37" opacity={0.8} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="v3" name="V3 Migrations" fill="#60a5fa" opacity={0.8} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Fee Tier Distribution</CardTitle>
              <CardDescription className="text-white/70">Migration target fee tiers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="60%" height={220}>
                  <PieChart>
                    <Pie data={feeDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                      {feeDistribution.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, "Share"]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3 flex-1">
                  {feeDistribution.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-white/70">{item.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-white">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Gas Optimization */}
      <motion.div variants={itemVariants}>
        <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Gas Optimization (Yul Inline Assembly)</CardTitle>
                <CardDescription className="text-white/70">Avg gas cost vs savings from Yul-optimized dust refunds</CardDescription>
              </div>
              <Badge className="bg-green-500/10 border-green-500/20 text-green-400">~2,000 gas saved/tx</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={gasData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D4AF37" opacity={0.1} />
                <XAxis dataKey="week" stroke="#fff" opacity={0.5} tick={{ fontSize: 12 }} />
                <YAxis stroke="#fff" opacity={0.5} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v.toFixed(4)}`} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v.toFixed(4)} ETH`, ""]} />
                <Legend />
                <Line type="monotone" dataKey="avgGas" name="Avg Gas Cost" stroke="#D4AF37" strokeWidth={2} dot={{ fill: "#D4AF37", r: 4 }} />
                <Line type="monotone" dataKey="savings" name="Gas Saved (Yul)" stroke="#4ade80" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: "#4ade80", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Top Pairs */}
      <motion.div variants={itemVariants}>
        <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Top Trading Pairs</CardTitle>
            <CardDescription className="text-white/70">Most migrated liquidity pairs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPairs.map((pair, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-[#0A1628]/50 border border-[#D4AF37]/20">
                  <div className="flex items-center gap-4">
                    <div className="h-8 w-8 rounded-full bg-[#D4AF37] flex items-center justify-center text-[#0A1628] font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-white">{pair.pair}</p>
                      <p className="text-sm text-white/50">{pair.migrations} migrations</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">{pair.volume}</p>
                    <p className="text-sm text-white/50">Total Volume</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Protocol Health */}
      <motion.div variants={itemVariants}>
        <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#D4AF37]" />
              Protocol Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { label: "Compliance Rate", value: "100%", status: "excellent", desc: "All migrations Shariah-compliant" },
                { label: "Revert Rate", value: "0.8%", status: "good", desc: "Low failed transaction rate" },
                { label: "Avg Slippage", value: "0.12%", status: "excellent", desc: "Well within tolerance" },
                { label: "Uptime", value: "99.9%", status: "excellent", desc: "Arbitrum Sepolia reliability" },
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-xl border border-[#D4AF37]/10 bg-[#0A1628]/40">
                  <p className="text-xs text-white/40 mb-2 uppercase tracking-wider">{item.label}</p>
                  <p className={`text-2xl font-bold mb-1 ${item.status === "excellent" ? "text-green-400" : "text-[#D4AF37]"}`}>{item.value}</p>
                  <p className="text-xs text-white/40">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
