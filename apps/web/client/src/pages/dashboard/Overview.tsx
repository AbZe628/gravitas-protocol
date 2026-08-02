import { useAccount, useReadContract } from "wagmi";
import { motion } from "framer-motion";
import { 
  Activity, 
  ArrowUpRight, 
  Users, 
  Zap, 
  ExternalLink, 
  Copy, 
  Check,
  ShieldCheck,
  Globe,
  CheckCheck
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { useState } from "react";
import { CONTRACTS } from "@/lib/wagmi";

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

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

function StatCard({ label, value, icon: Icon, change, trend }: any) {
  return (
    <div className="g-panel p-8 bg-surface/40 hover:bg-surface/60 transition-all group">
      <div className="flex justify-between items-start mb-6">
        <div className="h-12 w-12 rounded-xl bg-gold/5 border border-gold/20 flex items-center justify-center group-hover:border-gold/40 transition-colors">
          <Icon className="h-6 w-6 text-gold" />
        </div>
        {change && (
          <span className={`text-[10px] font-bold px-2 py-1 rounded border ${trend === "up" ? "text-green-400 bg-green-400/10 border-green-400/20" : "text-red-400 bg-red-400/10 border-red-400/20"}`}>
            {change}
          </span>
        )}
      </div>
      <p className="text-[10px] uppercase tracking-widest text-muted font-bold mb-2">{label}</p>
      <h3 className="text-3xl font-display font-bold text-paper g-numeric">{value}</h3>
    </div>
  );
}

function ContractAddress({ label, address, short, href }: any) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 bg-ink/40 border border-line rounded-xl hover:border-gold/30 transition-colors group">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-bold text-paper group-hover:text-goldsoft transition-colors">{label}</span>
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-paper transition-colors">
          <ExternalLink size={14} />
        </a>
      </div>
      <div className="flex items-center gap-3 bg-ink p-3 rounded-lg border border-line/50">
        <code className="text-[11px] font-mono text-goldsoft truncate flex-1">{short}</code>
        <button onClick={copy} className="text-muted hover:text-gold transition-colors">
          {copied ? <CheckCheck size={14} className="text-green-400" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}

export default function Overview() {
  const { address } = useAccount();

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

  return (
    <div className="space-y-12">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-paper mb-2">Protocol Overview</h1>
          <p className="text-muted text-sm font-medium">Real-time institutional liquidity and infrastructure health.</p>
        </div>
        {address && (
          <div className="flex items-center gap-4 p-4 bg-gold/5 border border-gold/20 rounded-xl">
            <div className="h-8 w-8 rounded-full bg-gold/10 flex items-center justify-center">
              <Users size={16} className="text-gold" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted font-bold">Active Wallet</p>
              <p className="text-xs font-mono text-paper">{address.slice(0, 6)}...{address.slice(-4)}</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Stats Grid */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Value Locked" value="$2.4M" icon={ShieldCheck} change="+12.3%" trend="up" />
        <StatCard label="24h Volume" value="$224K" icon={Activity} change="+8.7%" trend="up" />
        <StatCard label="Active Users" value="342" icon={Users} change="+15.2%" trend="up" />
        <StatCard label="Migrations" value="1,247" icon={Zap} change="+23.1%" trend="up" />
      </motion.div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-2 gap-8">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="g-panel-raised p-8 bg-surface/30">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-lg font-bold text-paper">Total Value Locked</h3>
              <p className="text-xs text-muted mt-1">Institutional liquidity depth</p>
            </div>
            <span className="text-[10px] uppercase tracking-widest text-muted font-bold">6 Month View</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tvlData}>
                <defs>
                  <linearGradient id="colorTvl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C9A845" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#C9A845" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#22314F" vertical={false} />
                <XAxis dataKey="date" stroke="#7C8BA5" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#7C8BA5" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v/1000000).toFixed(1)}M`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0C1A33', border: '1px solid #22314F', borderRadius: '8px' }}
                  itemStyle={{ color: '#E3C878' }}
                  formatter={(v: number) => [`$${(v/1000000).toFixed(2)}M`, "TVL"]}
                />
                <Area type="monotone" dataKey="value" stroke="#C9A845" fillOpacity={1} fill="url(#colorTvl)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="g-panel-raised p-8 bg-surface/30">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-lg font-bold text-paper">Migration Volume</h3>
              <p className="text-xs text-muted mt-1">Weekly teleportation activity</p>
            </div>
            <span className="text-[10px] uppercase tracking-widest text-muted font-bold">Weekly View</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#22314F" vertical={false} />
                <XAxis dataKey="date" stroke="#7C8BA5" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#7C8BA5" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0C1A33', border: '1px solid #22314F', borderRadius: '8px' }}
                  itemStyle={{ color: '#E3C878' }}
                  formatter={(v: number) => [`$${(v/1000).toFixed(0)}K`, "Volume"]}
                />
                <Line type="monotone" dataKey="volume" stroke="#C9A845" strokeWidth={2} dot={{ fill: "#C9A845", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Protocol Details */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="grid lg:grid-cols-2 gap-8">
        <div className="g-panel p-8 bg-deep/20 border-gold/10">
          <div className="flex items-center gap-4 mb-10">
            <Zap className="text-gold" size={24} />
            <h3 className="text-lg font-bold text-paper">Protocol Parameters</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-5 bg-ink/40 rounded-xl border border-line">
              <span className="text-[10px] uppercase tracking-widest text-muted font-bold">Status</span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${isPaused ? 'text-amber-400 bg-amber-400/10 border border-amber-400/20' : 'text-green-400 bg-green-400/10 border border-green-400/20'}`}>
                {isPaused !== undefined ? (isPaused ? "PAUSED" : "ACTIVE") : "LOADING..."}
              </span>
            </div>
            <div className="flex justify-between items-center p-5 bg-ink/40 rounded-xl border border-line">
              <span className="text-[10px] uppercase tracking-widest text-muted font-bold">Policy Version</span>
              <span className="text-xs font-bold text-paper g-numeric">
                {policyVersion !== undefined ? `v${policyVersion.toString()}` : "LOADING..."}
              </span>
            </div>
            <div className="flex justify-between items-center p-5 bg-ink/40 rounded-xl border border-line">
              <span className="text-[10px] uppercase tracking-widest text-muted font-bold">Network</span>
              <span className="text-[10px] font-bold text-gold bg-gold/5 px-3 py-1 rounded border border-gold/20 uppercase tracking-widest">
                Arbitrum Sepolia
              </span>
            </div>
          </div>
        </div>

        <div className="g-panel p-8 bg-surface/20">
          <div className="flex items-center gap-4 mb-10">
            <ShieldCheck className="text-gold" size={24} />
            <h3 className="text-lg font-bold text-paper">Core Infrastructure</h3>
          </div>
          <div className="space-y-6">
            <ContractAddress 
              label="POLICY REGISTRY" 
              address={CONTRACTS.POLICY_REGISTRY} 
              short="0xbcaE...4679"
              href={`https://sepolia.arbiscan.io/address/${CONTRACTS.POLICY_REGISTRY}`} 
            />
            <ContractAddress 
              label="TELEPORT ENGINE" 
              address={CONTRACTS.TELEPORT_V3} 
              short="0x5D42...E993"
              href={`https://sepolia.arbiscan.io/address/${CONTRACTS.TELEPORT_V3}`} 
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
