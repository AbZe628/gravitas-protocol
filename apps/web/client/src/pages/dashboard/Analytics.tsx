import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";
import { TrendingUp, Activity, Users, Zap, DollarSign, Shield, Target, Fuel, Clock } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
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
  { name: "0.01%", value: 12, color: "#C9A845" },
  { name: "0.05%", value: 28, color: "#E3C878" },
  { name: "0.3%", value: 45, color: "#7C8BA5" },
  { name: "1%", value: 15, color: "#22314F" },
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

function MiniStat({ label, value, icon: Icon, change }: any) {
  return (
    <div className="g-panel p-6 bg-surface/30 group">
      <div className="flex items-center gap-4 mb-4">
        <div className="h-8 w-8 rounded-lg bg-gold/5 border border-gold/20 flex items-center justify-center group-hover:border-gold/40 transition-colors">
          <Icon className="h-4 w-4 text-gold" />
        </div>
        <span className="text-[10px] uppercase tracking-widest text-muted font-bold">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <h4 className="text-xl font-display font-bold text-paper g-numeric">{value}</h4>
        <span className="text-[10px] font-bold text-green-400">{change}</span>
      </div>
    </div>
  );
}

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
    <div className="space-y-12">
      <motion.div initial="hidden" animate="visible" variants={fadeUp}>
        <h1 className="text-3xl font-display font-bold text-paper mb-2">Protocol Analytics</h1>
        <p className="text-muted text-sm font-medium">Deep insights into institutional liquidity flows and execution efficiency.</p>
      </motion.div>

      {/* KPI Grid */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {kpis.map((kpi, i) => (
          <MiniStat key={i} label={kpi.label} value={kpi.value} icon={kpi.icon} change={kpi.change} />
        ))}
      </motion.div>

      {/* Protocol Performance */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="g-panel-raised p-10 bg-surface/30">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h3 className="text-xl font-bold text-paper">Protocol Performance</h3>
            <p className="text-xs text-muted mt-1">TVL and Volume growth trajectory</p>
          </div>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-gold" />
              <span className="text-[10px] uppercase tracking-widest text-muted font-bold">TVL</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-400" />
              <span className="text-[10px] uppercase tracking-widest text-muted font-bold">Volume</span>
            </div>
          </div>
        </div>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorTvl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C9A845" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#C9A845" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#22314F" vertical={false} />
              <XAxis dataKey="month" stroke="#7C8BA5" fontSize={10} tickLine={false} axisLine={false} dy={10} />
              <YAxis yAxisId="left" stroke="#7C8BA5" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v/1000000).toFixed(1)}M`} />
              <YAxis yAxisId="right" orientation="right" stroke="#7C8BA5" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0C1A33', border: '1px solid #22314F', borderRadius: '8px' }}
                itemStyle={{ color: '#E3C878' }}
                formatter={(v: number, name: string) => [
                  name === "tvl" ? `$${(v/1000000).toFixed(2)}M` : `$${(v/1000).toFixed(0)}K`,
                  name === "tvl" ? "TVL" : "Volume"
                ]}
              />
              <Area yAxisId="left" type="monotone" dataKey="tvl" stroke="#C9A845" strokeWidth={2} fill="url(#colorTvl)" />
              <Area yAxisId="right" type="monotone" dataKey="volume" stroke="#60a5fa" strokeWidth={2} fill="url(#colorVol)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Daily Migrations & Fee Distribution */}
      <div className="grid lg:grid-cols-2 gap-8">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="g-panel-raised p-8 bg-surface/30">
          <div className="mb-8">
            <h3 className="text-lg font-bold text-paper">Migration Activity</h3>
            <p className="text-xs text-muted mt-1">V2 to V3 engine utilization</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyMigrations}>
                <CartesianGrid strokeDasharray="3 3" stroke="#22314F" vertical={false} />
                <XAxis dataKey="day" stroke="#7C8BA5" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#7C8BA5" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(201, 168, 69, 0.05)' }}
                  contentStyle={{ backgroundColor: '#0C1A33', border: '1px solid #22314F', borderRadius: '8px' }}
                />
                <Bar dataKey="v2" name="V2 Migrations" fill="#C9A845" opacity={0.6} radius={[4, 4, 0, 0]} />
                <Bar dataKey="v3" name="V3 Migrations" fill="#60a5fa" opacity={0.6} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="g-panel-raised p-8 bg-surface/30">
          <div className="mb-8">
            <h3 className="text-lg font-bold text-paper">Target Fee Distribution</h3>
            <p className="text-xs text-muted mt-1">Preferred liquidity fee tiers</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-10">
            <div className="h-[200px] w-full max-w-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={feeDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={6} dataKey="value">
                    {feeDistribution.map((entry, index) => (
                      <Cell key={index} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0C1A33', border: '1px solid #22314F', borderRadius: '8px' }}
                    formatter={(v: number) => [`${v}%`, "Share"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3 w-full">
              {feeDistribution.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-ink/40 rounded-xl border border-line group hover:border-gold/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] font-bold text-paper uppercase tracking-widest">{item.name}</span>
                  </div>
                  <span className="text-xs font-bold text-goldsoft g-numeric">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Gas Optimization */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="g-panel-raised p-8 bg-surface/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
          <div>
            <h3 className="text-lg font-bold text-paper">Gas Efficiency</h3>
            <p className="text-xs text-muted mt-1">Yul-optimized assembly performance</p>
          </div>
          <div className="text-[10px] font-bold text-green-400 bg-green-400/10 px-4 py-1.5 rounded-full border border-green-400/20 uppercase tracking-[0.2em]">
            ~2,000 GAS SAVED / TX
          </div>
        </div>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={gasData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#22314F" vertical={false} />
              <XAxis dataKey="week" stroke="#7C8BA5" fontSize={10} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="#7C8BA5" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(4)}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0C1A33', border: '1px solid #22314F', borderRadius: '8px' }}
                formatter={(v: number) => [`${v.toFixed(4)} ETH`, ""]}
              />
              <Line type="monotone" dataKey="avgGas" name="Avg Gas Cost" stroke="#C9A845" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="savings" name="Gas Saved (Yul)" stroke="#4ade80" strokeWidth={2} strokeDasharray="6 6" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Top Pairs */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="g-panel-raised p-8 bg-surface/30">
        <div className="mb-10">
          <h3 className="text-lg font-bold text-paper">Institutional Pairs</h3>
          <p className="text-xs text-muted mt-1">Top liquidity migration targets</p>
        </div>
        <div className="space-y-4">
          {topPairs.map((pair, index) => (
            <div key={index} className="flex items-center justify-between p-5 bg-ink/40 rounded-xl border border-line group hover:border-gold/30 transition-all">
              <div className="flex items-center gap-6">
                <span className="text-xs font-bold text-gold opacity-30 group-hover:opacity-100 transition-opacity g-numeric">0{index + 1}</span>
                <div>
                  <p className="text-sm font-bold text-paper">{pair.pair}</p>
                  <p className="text-[10px] text-muted uppercase tracking-widest mt-1">{pair.migrations} migrations</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-paper g-numeric">{pair.volume}</p>
                <p className="text-[10px] text-muted uppercase tracking-widest mt-1">24h Volume</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
