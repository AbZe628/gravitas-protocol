import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, Activity, DollarSign } from "lucide-react";
import { motion } from "framer-motion";

const migrationData = [
  { month: "Jan", v2: 45, v3: 32 },
  { month: "Feb", v2: 52, v3: 41 },
  { month: "Mar", v2: 61, v3: 55 },
  { month: "Apr", v2: 48, v3: 68 },
  { month: "May", v2: 55, v3: 82 },
  { month: "Jun", v2: 63, v3: 95 },
];

const protocolDistribution = [
  { name: "Uniswap V2", value: 45, color: "#D4AF37" },
  { name: "Uniswap V3", value: 55, color: "#F4D03F" },
];

const topPairs = [
  { pair: "WETH/USDC", volume: "$1.2M", migrations: 234 },
  { pair: "WBTC/WETH", volume: "$890K", migrations: 156 },
  { pair: "DAI/USDC", volume: "$650K", migrations: 128 },
  { pair: "LINK/WETH", volume: "$420K", migrations: 89 },
  { pair: "UNI/WETH", volume: "$310K", migrations: 67 },
];

export default function Analytics() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total Migrations", value: "1,247", icon: Activity, color: "#D4AF37" },
          { label: "Unique Users", value: "342", icon: Users, color: "#F4D03F" },
          { label: "Total Volume", value: "$2.4M", icon: DollarSign, color: "#D4AF37" },
          { label: "Avg. Migration", value: "$1,924", icon: TrendingUp, color: "#F4D03F" },
        ].map((metric, index) => (
          <Card key={index} className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/70">{metric.label}</CardTitle>
              <metric.icon className="h-4 w-4" style={{ color: metric.color }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{metric.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Migration Trends */}
        <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Migration Trends</CardTitle>
            <CardDescription className="text-white/70">V2 vs V3 migrations over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={migrationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D4AF37" opacity={0.1} />
                <XAxis dataKey="month" stroke="#fff" opacity={0.5} />
                <YAxis stroke="#fff" opacity={0.5} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F1E35",
                    border: "1px solid rgba(212, 175, 55, 0.2)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#fff" }}
                />
                <Bar dataKey="v2" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                <Bar dataKey="v3" fill="#F4D03F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Protocol Distribution */}
        <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Protocol Distribution</CardTitle>
            <CardDescription className="text-white/70">Migration volume by protocol</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={protocolDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {protocolDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F1E35",
                    border: "1px solid rgba(212, 175, 55, 0.2)",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Pairs */}
      <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Top Trading Pairs</CardTitle>
          <CardDescription className="text-white/70">Most migrated liquidity pairs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topPairs.map((pair, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-lg bg-[#0A1628]/50 border border-[#D4AF37]/20"
              >
                <div className="flex items-center gap-4">
                  <Badge className="bg-[#D4AF37] text-[#0A1628] w-8 h-8 rounded-full flex items-center justify-center">
                    {index + 1}
                  </Badge>
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
  );
}
