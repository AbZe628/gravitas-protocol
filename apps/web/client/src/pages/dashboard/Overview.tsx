import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Users, Activity, ArrowUpRight } from "lucide-react";
import { useReadContract } from "wagmi";
import { CONTRACTS } from "@/lib/wagmi";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

const TELEPORT_V3_ABI = [
  {
    inputs: [],
    name: "cooldownPeriod",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "maxMoveBps",
    outputs: [{ name: "", type: "uint16" }],
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

export default function Overview() {
  const [todos, setTodos] = useState([
    { id: 1, text: "Connect Wallet to Arbitrum Sepolia", completed: true },
    { id: 2, text: "Review Shariah Compliance Policy", completed: true },
    { id: 3, text: "Simulate V3 Liquidity Migration", completed: false },
    { id: 4, text: "Execute Atomic Teleport", completed: false },
    { id: 5, text: "Verify Transaction on Arbiscan", completed: false },
  ]);

  const toggleTodo = (id: number) => {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const { data: cooldownPeriod } = useReadContract({
    address: CONTRACTS.TELEPORT_V3 as `0x${string}`,
    abi: TELEPORT_V3_ABI,
    functionName: "cooldownPeriod",
    chainId: 421614,
  });

  const { data: maxMoveBps } = useReadContract({
    address: CONTRACTS.TELEPORT_V3 as `0x${string}`,
    abi: TELEPORT_V3_ABI,
    functionName: "maxMoveBps",
    chainId: 421614,
  });

  const stats = [
    {
      title: "Total Value Locked",
      value: "$2.4M",
      change: "+12.3%",
      trend: "up",
      icon: DollarSign,
    },
    {
      title: "24h Volume",
      value: "$224K",
      change: "+8.7%",
      trend: "up",
      icon: Activity,
    },
    {
      title: "Active Users",
      value: "342",
      change: "+15.2%",
      trend: "up",
      icon: Users,
    },
    {
      title: "Migrations",
      value: "1,247",
      change: "+23.1%",
      trend: "up",
      icon: ArrowUpRight,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div key={index} variants={itemVariants}>
            <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-white/70">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-[#D4AF37]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="flex items-center gap-1 mt-1">
                  {stat.trend === "up" ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={`text-xs ${stat.trend === "up" ? "text-green-500" : "text-red-500"}`}>
                    {stat.change}
                  </span>
                  <span className="text-xs text-white/50 ml-1">vs last period</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Total Value Locked</CardTitle>
              <CardDescription className="text-white/70">6-month TVL trend</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={tvlData}>
                  <defs>
                    <linearGradient id="colorTvl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D4AF37" opacity={0.1} />
                  <XAxis dataKey="date" stroke="#fff" opacity={0.5} />
                  <YAxis stroke="#fff" opacity={0.5} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F1E35",
                      border: "1px solid rgba(212, 175, 55, 0.2)",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#D4AF37"
                    strokeWidth={2}
                    fill="url(#colorTvl)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Weekly Volume</CardTitle>
              <CardDescription className="text-white/70">Last 7 days trading volume</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={volumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D4AF37" opacity={0.1} />
                  <XAxis dataKey="date" stroke="#fff" opacity={0.5} />
                  <YAxis stroke="#fff" opacity={0.5} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F1E35",
                      border: "1px solid rgba(212, 175, 55, 0.2)",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="volume"
                    stroke="#D4AF37"
                    strokeWidth={2}
                    dot={{ fill: "#D4AF37", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Protocol Parameters & Todo List */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur h-full">
            <CardHeader>
              <CardTitle className="text-white">Protocol Parameters</CardTitle>
              <CardDescription className="text-white/70">
                Current configuration for TeleportV3 contract
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="p-4 rounded-lg bg-[#0A1628]/50 border border-[#D4AF37]/20">
                <p className="text-sm text-white/50 mb-1">Cooldown Period</p>
                <p className="text-2xl font-bold text-white">
                  {cooldownPeriod ? `${Number(cooldownPeriod) / 60} min` : "Loading..."}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-[#0A1628]/50 border border-[#D4AF37]/20">
                <p className="text-sm text-white/50 mb-1">Max Price Movement</p>
                <p className="text-2xl font-bold text-white">
                  {maxMoveBps ? `${Number(maxMoveBps) / 100}%` : "Loading..."}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-[#0A1628]/50 border border-[#D4AF37]/20">
                <p className="text-sm text-white/50 mb-1">Network</p>
                <Badge className="bg-[#D4AF37] text-[#0A1628] mt-2">Arbitrum Sepolia</Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur h-full">
            <CardHeader>
              <CardTitle className="text-white">MVP Launch Checklist</CardTitle>
              <CardDescription className="text-white/70">
                Track your progress through the Gravitas Protocol
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {todos.map((todo) => (
                  <div key={todo.id} className="flex items-center space-x-3 p-3 rounded-lg bg-[#0A1628]/30 border border-[#D4AF37]/10">
                    <Checkbox 
                      id={`todo-${todo.id}`} 
                      checked={todo.completed} 
                      onCheckedChange={() => toggleTodo(todo.id)}
                      className="border-[#D4AF37] data-[state=checked]:bg-[#D4AF37] data-[state=checked]:text-[#0A1628]"
                    />
                    <label 
                      htmlFor={`todo-${todo.id}`}
                      className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${todo.completed ? 'text-white/40 line-through' : 'text-white'}`}
                    >
                      {todo.text}
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
