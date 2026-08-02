import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { ExternalLink, Search, Filter, CheckCircle2, XCircle, Clock, ArrowRight, Copy, CheckCheck } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const mockTransactions = [
  {
    id: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    type: "V3",
    status: "success",
    pair: "WETH/USDC",
    from: "0.3% Fee",
    to: "0.05% Fee",
    amount: "$12,450",
    gas: "0.0024 ETH",
    timestamp: "2026-02-24 14:32:11",
    block: "12847291",
  },
  {
    id: "0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c",
    type: "V2",
    status: "success",
    pair: "WBTC/WETH",
    from: "Uniswap V2",
    to: "Uniswap V2",
    amount: "$8,920",
    gas: "0.0019 ETH",
    timestamp: "2026-02-24 13:15:44",
    block: "12847156",
  },
  {
    id: "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d",
    type: "V3",
    status: "success",
    pair: "DAI/USDC",
    from: "1% Fee",
    to: "0.01% Fee",
    amount: "$5,200",
    gas: "0.0022 ETH",
    timestamp: "2026-02-24 11:48:22",
    block: "12847023",
  },
  {
    id: "0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e",
    type: "V2",
    status: "failed",
    pair: "LINK/WETH",
    from: "Uniswap V2",
    to: "Uniswap V2",
    amount: "$3,100",
    gas: "0.0008 ETH",
    timestamp: "2026-02-24 10:22:05",
    block: "12846891",
  },
  {
    id: "0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f",
    type: "V3",
    status: "success",
    pair: "UNI/WETH",
    from: "0.3% Fee",
    to: "0.05% Fee",
    amount: "$7,840",
    gas: "0.0021 ETH",
    timestamp: "2026-02-23 22:11:33",
    block: "12846712",
  },
  {
    id: "0x6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a",
    type: "V3",
    status: "pending",
    pair: "AAVE/WETH",
    from: "1% Fee",
    to: "0.3% Fee",
    amount: "$15,600",
    gas: "0.0025 ETH",
    timestamp: "2026-02-23 20:55:18",
    block: "12846598",
  },
  {
    id: "0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
    type: "V2",
    status: "success",
    pair: "COMP/WETH",
    from: "Uniswap V2",
    to: "Uniswap V2",
    amount: "$2,340",
    gas: "0.0018 ETH",
    timestamp: "2026-02-23 18:30:09",
    block: "12846445",
  },
];

function TxRow({ tx }: { tx: typeof mockTransactions[0] }) {
  const [copied, setCopied] = useState(false);
  const shortHash = `${tx.id.slice(0, 10)}...${tx.id.slice(-8)}`;
  const copy = () => {
    navigator.clipboard.writeText(tx.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-[#D4AF37]/10 bg-[#0A1628]/40 hover:border-[#D4AF37]/30 transition-all gap-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {tx.status === "success" ? (
          <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
        ) : tx.status === "failed" ? (
          <XCircle className="h-5 w-5 text-red-400 shrink-0" />
        ) : (
          <Clock className="h-5 w-5 text-yellow-400 shrink-0 animate-pulse" />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`text-xs ${tx.type === "V3" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30"}`}>
              {tx.type}
            </Badge>
            <span className="font-semibold text-white">{tx.pair}</span>
            <span className="text-white/40 text-sm">{tx.from}</span>
            <ArrowRight className="h-3 w-3 text-white/30" />
            <span className="text-white/40 text-sm">{tx.to}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-xs font-mono text-white/30">{shortHash}</code>
            <button onClick={copy} className="text-white/20 hover:text-[#D4AF37] transition-colors">
              {copied ? <CheckCheck className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
            <span className="text-xs text-white/20">Block #{tx.block}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right hidden sm:block">
          <p className="font-semibold text-white">{tx.amount}</p>
          <p className="text-xs text-white/40">{tx.gas} gas</p>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-xs text-white/40">{tx.timestamp}</p>
          <Badge className={`text-xs mt-1 ${
            tx.status === "success" ? "bg-green-500/10 text-green-400 border-green-500/20" :
            tx.status === "failed" ? "bg-red-500/10 text-red-400 border-red-500/20" :
            "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
          }`}>{tx.status}</Badge>
        </div>
        <a href={`https://sepolia.arbiscan.io/tx/${tx.id}`} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white/30 hover:text-[#D4AF37]">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </a>
      </div>
    </motion.div>
  );
}

export default function History() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "v2" | "v3" | "success" | "failed">("all");

  const filtered = mockTransactions.filter((tx) => {
    const matchSearch = search === "" ||
      tx.pair.toLowerCase().includes(search.toLowerCase()) ||
      tx.id.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ? true :
      filter === "v2" ? tx.type === "V2" :
      filter === "v3" ? tx.type === "V3" :
      filter === "success" ? tx.status === "success" :
      filter === "failed" ? tx.status === "failed" : true;
    return matchSearch && matchFilter;
  });

  const stats = {
    total: mockTransactions.length,
    success: mockTransactions.filter(t => t.status === "success").length,
    failed: mockTransactions.filter(t => t.status === "failed").length,
    pending: mockTransactions.filter(t => t.status === "pending").length,
    volume: "$55,450",
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-white" },
          { label: "Success", value: stats.success, color: "text-green-400" },
          { label: "Failed", value: stats.failed, color: "text-red-400" },
          { label: "Pending", value: stats.pending, color: "text-yellow-400" },
          { label: "Volume", value: stats.volume, color: "text-[#D4AF37]" },
        ].map((s, i) => (
          <motion.div key={i} variants={itemVariants}>
            <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
              <CardContent className="pt-4 pb-4 text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Transaction List */}
      <motion.div variants={itemVariants}>
        <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-white">Transaction History</CardTitle>
                <CardDescription className="text-white/70">All migration transactions on Arbitrum Sepolia</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  placeholder="Search pair or tx hash..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-[#0A1628]/50 border-[#D4AF37]/20 text-white text-sm"
                />
              </div>
            </div>
            {/* Filter Tabs */}
            <div className="flex gap-2 flex-wrap mt-2">
              {(["all", "v2", "v3", "success", "failed"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all capitalize ${
                    filter === f
                      ? "bg-[#D4AF37] text-[#0A1628]"
                      : "bg-[#0A1628]/50 text-white/50 hover:text-white border border-[#D4AF37]/10"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-white/30">
                  <Filter className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p>No transactions found</p>
                </div>
              ) : (
                filtered.map((tx, i) => <TxRow key={i} tx={tx} />)
              )}
            </div>
            {filtered.length > 0 && (
              <div className="mt-6 flex items-center justify-between text-sm text-white/40">
                <span>Showing {filtered.length} of {mockTransactions.length} transactions</span>
                <a href="https://sepolia.arbiscan.io/address/0x5D423f8d01539B92D3f3953b91682D9884D1E993" target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="ghost" className="text-white/40 hover:text-[#D4AF37] text-xs gap-1">
                    <ExternalLink className="h-3 w-3" />
                    View all on Arbiscan
                  </Button>
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
