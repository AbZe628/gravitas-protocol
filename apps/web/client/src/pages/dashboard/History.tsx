import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, ArrowUpRight, CheckCircle2, Clock } from "lucide-react";
import { motion } from "framer-motion";

const mockHistory = [
  {
    txHash: "0x1234...5678",
    type: "V3 Migration",
    from: "WETH/USDC V2",
    to: "WETH/USDC V3",
    amount: "$12,450",
    status: "completed",
    timestamp: "2 hours ago",
  },
  {
    txHash: "0xabcd...efgh",
    type: "V2 Migration",
    from: "WBTC/WETH V2",
    to: "WBTC/WETH V2",
    amount: "$8,920",
    status: "completed",
    timestamp: "5 hours ago",
  },
  {
    txHash: "0x9876...5432",
    type: "V3 Migration",
    from: "DAI/USDC V3",
    to: "DAI/USDC V3",
    amount: "$6,540",
    status: "pending",
    timestamp: "1 day ago",
  },
  {
    txHash: "0xfedc...ba98",
    type: "V2 Migration",
    from: "LINK/WETH V2",
    to: "LINK/WETH V3",
    amount: "$4,230",
    status: "completed",
    timestamp: "2 days ago",
  },
  {
    txHash: "0x1111...2222",
    type: "V3 Migration",
    from: "UNI/WETH V2",
    to: "UNI/WETH V3",
    amount: "$3,180",
    status: "completed",
    timestamp: "3 days ago",
  },
];

export default function History() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Migration History</CardTitle>
          <CardDescription className="text-white/70">
            Your recent liquidity migrations on Arbitrum Sepolia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockHistory.map((tx, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-lg bg-[#0A1628]/50 border border-[#D4AF37]/20 hover:border-[#D4AF37]/40 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge
                        className={`${
                          tx.status === "completed"
                            ? "bg-green-500/20 text-green-500 border-green-500/30"
                            : "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
                        }`}
                      >
                        {tx.status === "completed" ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : (
                          <Clock className="h-3 w-3 mr-1" />
                        )}
                        {tx.status}
                      </Badge>
                      <span className="text-sm text-white/50">{tx.timestamp}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">{tx.from}</span>
                      <ArrowUpRight className="h-4 w-4 text-[#D4AF37]" />
                      <span className="font-medium text-white">{tx.to}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-white/70">
                      <span>Type: {tx.type}</span>
                      <span>•</span>
                      <span>Amount: {tx.amount}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-white/70 bg-[#0A1628]/50 px-2 py-1 rounded">
                      {tx.txHash}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10"
                      asChild
                    >
                      <a
                        href={`https://sepolia.arbiscan.io/tx/${tx.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white/70">Total Migrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">5</div>
            <p className="text-xs text-white/50 mt-1">All time</p>
          </CardContent>
        </Card>
        <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white/70">Total Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">$35,320</div>
            <p className="text-xs text-white/50 mt-1">Across all migrations</p>
          </CardContent>
        </Card>
        <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white/70">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">100%</div>
            <p className="text-xs text-white/50 mt-1">4/4 completed</p>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
