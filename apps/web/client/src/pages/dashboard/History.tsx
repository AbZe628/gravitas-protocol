import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { ExternalLink, Search, Filter, CheckCircle2, XCircle, Clock, ArrowRight, Copy, CheckCheck } from "lucide-react";

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const mockTransactions = [
  { id: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b", type: "V3", status: "success", pair: "WETH/USDC", from: "0.3% Fee", to: "0.05% Fee", amount: "$12,450", gas: "0.0024 ETH", timestamp: "2026-02-24 14:32:11", block: "12847291" },
  { id: "0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c", type: "V2", status: "success", pair: "WBTC/WETH", from: "Uniswap V2", to: "Uniswap V2", amount: "$8,920", gas: "0.0019 ETH", timestamp: "2026-02-24 13:15:44", block: "12847156" },
  { id: "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d", type: "V3", status: "success", pair: "DAI/USDC", from: "1% Fee", to: "0.01% Fee", amount: "$5,200", gas: "0.0022 ETH", timestamp: "2026-02-24 11:48:22", block: "12847023" },
  { id: "0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e", type: "V2", status: "failed", pair: "LINK/WETH", from: "Uniswap V2", to: "Uniswap V2", amount: "$3,100", gas: "0.0008 ETH", timestamp: "2026-02-24 10:22:05", block: "12846891" },
  { id: "0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f", type: "V3", status: "success", pair: "UNI/WETH", from: "0.3% Fee", to: "0.05% Fee", amount: "$7,840", gas: "0.0021 ETH", timestamp: "2026-02-23 22:11:33", block: "12846712" },
  { id: "0x6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a", type: "V3", status: "pending", pair: "AAVE/WETH", from: "1% Fee", to: "0.3% Fee", amount: "$15,600", gas: "0.0025 ETH", timestamp: "2026-02-23 20:55:18", block: "12846598" },
];

function TxRow({ tx }: { tx: typeof mockTransactions[0] }) {
  const [copied, setCopied] = useState(false);
  const shortHash = `${tx.id.slice(0, 8)}...${tx.id.slice(-6)}`;
  const copy = () => {
    navigator.clipboard.writeText(tx.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-[var(--g-surface)] rounded-[var(--g-radius)] border border-[var(--g-line)] hover:border-[var(--g-gold)]/30 transition-all gap-4">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="shrink-0">
          {tx.status === "success" ? <CheckCircle2 className="h-5 w-5 text-green-400" /> : tx.status === "failed" ? <XCircle className="h-5 w-5 text-red-400" /> : <Clock className="h-5 w-5 text-amber-400 animate-pulse" />}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--g-navy)] border border-[var(--g-line)] text-[var(--g-gold-soft)]">{tx.type}</span>
            <span className="text-sm font-bold text-[var(--g-paper)]">{tx.pair}</span>
            <div className="flex items-center gap-2 text-[10px] text-[var(--g-muted)] uppercase tracking-widest">
              <span>{tx.from}</span>
              <ArrowRight className="h-2.5 w-2.5 opacity-30" />
              <span>{tx.to}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <code className="text-[10px] font-mono text-[var(--g-muted)] g-numeric">{shortHash}</code>
            <button onClick={copy} className="text-[var(--g-muted)] hover:text-[var(--g-gold-soft)] transition-colors">
              {copied ? <CheckCheck className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-6 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
        <div className="text-right">
          <p className="text-sm font-bold text-[var(--g-paper)] g-numeric">{tx.amount}</p>
          <p className="text-[10px] text-[var(--g-muted)] uppercase tracking-widest">{tx.gas} gas</p>
        </div>
        <a href={`https://sepolia.arbiscan.io/tx/${tx.id}`} target="_blank" rel="noopener noreferrer" className="p-2 text-[var(--g-muted)] hover:text-[var(--g-gold-soft)] transition-colors">
          <ExternalLink className="h-4 w-4" />
        </a>
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
    <div className="space-y-8">
      {/* Header & Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h3 className="text-[var(--g-text-base)] font-bold text-[var(--g-paper)]">Teleport Log</h3>
          <p className="text-[var(--g-text-xs)] text-[var(--g-muted)]">Historical migration ledger</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--g-muted)]" />
            <Input placeholder="Search hash..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-[var(--g-navy)] border-[var(--g-line)] text-sm w-full sm:w-64" />
          </div>
          <div className="flex gap-1 p-1 bg-[var(--g-surface)] rounded-[var(--g-radius)] border border-[var(--g-line)]">
            {(["all", "v3", "v2"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${filter === f ? "bg-[var(--g-gold)] text-[var(--g-navy)]" : "text-[var(--g-muted)] hover:text-[var(--g-paper)]"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="g-panel p-20 text-center">
            <Filter className="h-8 w-8 mx-auto mb-4 opacity-20" />
            <p className="text-[var(--g-muted)]">No records found matching criteria</p>
          </div>
        ) : (
          filtered.map((tx, i) => <TxRow key={i} tx={tx} />)
        )}
      </div>

      <div className="flex justify-center pt-8">
        <a href="https://sepolia.arbiscan.io/address/0x5D423f8d01539B92D3f3953b91682D9884D1E993" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="border-[var(--g-line)] text-[var(--g-muted)] hover:text-[var(--g-paper)] text-[10px] uppercase tracking-widest font-bold px-8">
            View All on Explorer
          </Button>
        </a>
      </div>
    </div>
  );
}
