import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Filter, 
  ExternalLink, 
  Copy, 
  Check, 
  ArrowRight, 
  Zap, 
  History as HistoryIcon,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  XCircle,
  CheckCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CONTRACTS } from "@/lib/wagmi";

const mockTransactions = [
  { id: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b", type: "V3", status: "success", pair: "WETH/USDC", from: "0.3% Fee", to: "0.05% Fee", amount: "$12,450", gas: "0.0024 ETH", timestamp: "2026-02-24 14:32:11", block: "12847291" },
  { id: "0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c", type: "V2", status: "success", pair: "WBTC/WETH", from: "Uniswap V2", to: "Uniswap V2", amount: "$8,920", gas: "0.0019 ETH", timestamp: "2026-02-24 13:15:44", block: "12847156" },
  { id: "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d", type: "V3", status: "success", pair: "DAI/USDC", from: "1% Fee", to: "0.01% Fee", amount: "$5,200", gas: "0.0022 ETH", timestamp: "2026-02-24 11:48:22", block: "12847023" },
  { id: "0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e", type: "V2", status: "failed", pair: "LINK/WETH", from: "Uniswap V2", to: "Uniswap V2", amount: "$3,100", gas: "0.0008 ETH", timestamp: "2026-02-24 10:22:05", block: "12846891" },
  { id: "0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f", type: "V3", status: "success", pair: "UNI/WETH", from: "0.3% Fee", to: "0.05% Fee", amount: "$7,840", gas: "0.0021 ETH", timestamp: "2026-02-23 22:11:33", block: "12846712" },
  { id: "0x6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a", type: "V3", status: "pending", pair: "AAVE/WETH", from: "1% Fee", to: "0.3% Fee", amount: "$15,600", gas: "0.0025 ETH", timestamp: "2026-02-23 20:55:18", block: "12846598" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

function TxRow({ tx }: { tx: typeof mockTransactions[0] }) {
  const [copied, setCopied] = useState(false);
  const shortHash = `${tx.id.slice(0, 8)}...${tx.id.slice(-6)}`;
  const copy = () => {
    navigator.clipboard.writeText(tx.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="g-panel p-6 bg-surface/20 hover:bg-surface/40 transition-all group"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="h-12 w-12 rounded-xl bg-gold/5 border border-gold/20 flex items-center justify-center shrink-0">
            {tx.type === 'V3' ? <Zap size={20} className="text-gold" /> : <ArrowRightLeft size={20} className="text-gold" />}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-sm font-bold text-paper">{tx.pair}</span>
              <span className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded border ${
                tx.status === 'success' ? 'text-green-400 bg-green-400/10 border-green-400/20' : 
                tx.status === 'failed' ? 'text-red-400 bg-red-400/10 border-red-400/20' : 
                'text-amber-400 bg-amber-400/10 border-amber-400/20'
              }`}>
                {tx.status}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted font-medium uppercase tracking-widest">
              <span>{tx.from}</span>
              <ArrowRight size={10} className="opacity-30" />
              <span className="text-goldsoft">{tx.to}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 lg:gap-12 flex-1 lg:justify-items-center">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted font-bold mb-1">Hash</p>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono text-paper">{shortHash}</code>
              <button onClick={copy} className="text-muted hover:text-gold transition-colors">
                {copied ? <CheckCheck size={12} className="text-green-400" /> : <Copy size={12} />}
              </button>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted font-bold mb-1">Amount</p>
            <p className="text-sm font-bold text-paper g-numeric">{tx.amount}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted font-bold mb-1">Gas Cost</p>
            <p className="text-sm text-sand/80 font-mono">{tx.gas}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted font-bold mb-1">Timestamp</p>
            <div className="flex items-center gap-2 text-[10px] text-muted font-medium">
              <Clock size={12} />
              <span>{tx.timestamp.split(' ')[0]}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <a 
            href={`https://sepolia.arbiscan.io/tx/${tx.id}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="h-10 w-10 rounded-lg border border-line flex items-center justify-center text-muted hover:text-gold hover:border-gold/30 transition-all"
          >
            <ExternalLink size={16} />
          </a>
        </div>
      </div>
    </motion.div>
  );
}

export default function History() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "v2" | "v3" | "success" | "failed">("all");

  const filtered = mockTransactions.filter((tx) => {
    const matchSearch = search === "" || tx.pair.toLowerCase().includes(search.toLowerCase()) || tx.id.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" ? true : filter === "v2" ? tx.type === "V2" : filter === "v3" ? tx.type === "V3" : filter === "success" ? tx.status === "success" : filter === "failed" ? tx.status === "failed" : true;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-10">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-paper mb-2">Teleport Log</h1>
          <p className="text-muted text-sm font-medium">Audit trail of institutional liquidity migrations.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <Input 
              placeholder="Search hash..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 bg-surface/30 border-line text-paper h-12 rounded-xl focus:border-gold"
            />
          </div>
          <div className="flex bg-surface border border-line p-1 rounded-xl">
            {(["all", "v3", "v2"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-[10px] uppercase tracking-widest font-bold rounded-lg transition-all ${
                  filter === f ? 'bg-gold text-ink shadow-lg' : 'text-muted hover:text-paper'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div 
        initial="hidden" 
        animate="visible" 
        variants={fadeUp}
        className="space-y-4"
      >
        {filtered.length > 0 ? (
          filtered.map((tx, i) => (
            <TxRow key={i} tx={tx} />
          ))
        ) : (
          <div className="g-panel p-20 text-center bg-surface/10 border-dashed">
            <Filter className="h-12 w-12 text-muted mx-auto mb-6 opacity-20" />
            <h3 className="text-lg font-bold text-paper mb-2">No Records Found</h3>
            <p className="text-sm text-muted">Try adjusting your search or filters.</p>
          </div>
        )}
      </motion.div>

      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="pt-10">
        <div className="g-panel p-8 bg-deep/20 border-gold/10 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="h-12 w-12 rounded-xl bg-gold/5 border border-gold/20 flex items-center justify-center">
              <HistoryIcon className="text-gold" size={24} />
            </div>
            <div>
              <h4 className="text-lg font-bold text-paper mb-1">On-Chain Audit Trail</h4>
              <p className="text-xs text-muted max-w-md">All protocol interactions are permanently recorded on Arbitrum Sepolia. The Teleport engine emits events for every migration.</p>
            </div>
          </div>
          <a 
            href={`https://sepolia.arbiscan.io/address/${CONTRACTS.TELEPORT_V3}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full sm:w-auto"
          >
            <Button variant="outline" className="w-full border-gold text-gold hover:bg-gold/10 h-12 px-8 font-bold rounded-sm transition-all">
              View All on Explorer <ExternalLink className="ml-3" size={16} />
            </Button>
          </a>
        </div>
      </motion.div>
    </div>
  );
}
