import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Download, Search, Filter } from "lucide-react";
import { motion } from "framer-motion";

interface Transaction {
  id: string;
  type: "V2" | "V3";
  status: "success" | "pending" | "failed";
  pair: string;
  from: string;
  to: string;
  amount: string;
  gas: string;
  timestamp: string;
  block: string;
  txHash: string;
}

interface TransactionHistoryTableProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

export function TransactionHistoryTable({ transactions, isLoading }: TransactionHistoryTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "V2" | "V3">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "pending" | "failed">("all");

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        tx.pair.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.txHash.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || tx.type === typeFilter;
      const matchesStatus = statusFilter === "all" || tx.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [transactions, searchTerm, typeFilter, statusFilter]);

  const handleExportCSV = () => {
    const headers = ["Type", "Pair", "Status", "Amount", "Gas", "Timestamp", "TX Hash"];
    const rows = filteredTransactions.map((tx) => [
      tx.type,
      tx.pair,
      tx.status,
      tx.amount,
      tx.gas,
      tx.timestamp,
      tx.txHash,
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gravitas-history-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "pending":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "failed":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      default:
        return "bg-white/5 text-white/60 border-white/10";
    }
  };

  const getTypeColor = (type: string) => {
    return type === "V3" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-purple-500/10 text-purple-400 border-purple-500/20";
  };

  return (
    <Card className="border-[#D4AF37]/15 bg-[#0A1628]/40">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-white text-base">Transaction History</CardTitle>
            <CardDescription className="text-white/40 text-xs">
              {filteredTransactions.length} of {transactions.length} migrations
            </CardDescription>
          </div>
          <Button
            onClick={handleExportCSV}
            size="sm"
            variant="outline"
            className="border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/8 gap-2 w-full sm:w-auto"
            disabled={filteredTransactions.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input
              placeholder="Search pair or TX hash..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-[#0A1628]/50 border-[#D4AF37]/15 text-white text-sm"
            />
          </div>

          <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val as any)}>
            <SelectTrigger className="bg-[#0A1628]/50 border-[#D4AF37]/15 text-white text-sm">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-[#0A1628] border-[#D4AF37]/15">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="V2">V2 Only</SelectItem>
              <SelectItem value="V3">V3 Only</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as any)}>
            <SelectTrigger className="bg-[#0A1628]/50 border-[#D4AF37]/15 text-white text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-[#0A1628] border-[#D4AF37]/15">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Table */}
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow className="border-[#D4AF37]/10 hover:bg-transparent">
                <TableHead className="text-white/60 text-xs font-mono">Type</TableHead>
                <TableHead className="text-white/60 text-xs font-mono">Pair</TableHead>
                <TableHead className="text-white/60 text-xs font-mono">Status</TableHead>
                <TableHead className="text-white/60 text-xs font-mono text-right">Amount</TableHead>
                <TableHead className="text-white/60 text-xs font-mono text-right">Gas</TableHead>
                <TableHead className="text-white/60 text-xs font-mono">Timestamp</TableHead>
                <TableHead className="text-white/60 text-xs font-mono text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2 text-white/40">
                      <div className="h-2 w-2 rounded-full bg-[#D4AF37] animate-pulse" />
                      Loading transactions...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-white/40 text-sm">No transactions found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((tx, i) => (
                  <motion.tr
                    key={tx.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-[#D4AF37]/10 hover:bg-[#D4AF37]/5 transition-colors"
                  >
                    <TableCell>
                      <Badge className={`${getTypeColor(tx.type)} border text-[10px] font-mono`}>
                        {tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white/70 text-xs font-mono">{tx.pair}</TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(tx.status)} border text-[10px]`}>
                        {tx.status === "success" ? "✓" : tx.status === "pending" ? "⧗" : "✕"} {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white/70 text-xs text-right font-mono">{tx.amount}</TableCell>
                    <TableCell className="text-white/70 text-xs text-right font-mono">{tx.gas}</TableCell>
                    <TableCell className="text-white/50 text-xs font-mono">{tx.timestamp}</TableCell>
                    <TableCell className="text-right">
                      <a
                        href={`https://sepolia.arbiscan.io/tx/${tx.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#D4AF37]/60 hover:text-[#D4AF37] transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        {filteredTransactions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-3 border-t border-[#D4AF37]/10 grid grid-cols-3 gap-3 text-center"
          >
            <div>
              <p className="text-[10px] text-white/40 mb-1">Successful</p>
              <p className="text-sm font-bold text-green-400">
                {filteredTransactions.filter((t) => t.status === "success").length}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-white/40 mb-1">Pending</p>
              <p className="text-sm font-bold text-amber-400">
                {filteredTransactions.filter((t) => t.status === "pending").length}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-white/40 mb-1">Failed</p>
              <p className="text-sm font-bold text-red-400">
                {filteredTransactions.filter((t) => t.status === "failed").length}
              </p>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
