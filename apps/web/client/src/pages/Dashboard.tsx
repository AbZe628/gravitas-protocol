import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ArrowLeft, Menu, ExternalLink, RefreshCw, CheckCircle2, Clock, Copy, Wallet } from "lucide-react";
import { useLocation } from "wouter";
import { useAccount, useConnect, useDisconnect, useSwitchChain, useReadContract, useWatchContractEvent } from "wagmi";
import { arbitrumSepolia } from 'wagmi/chains';
import { formatEther } from "viem";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CONTRACTS } from "@/lib/wagmi";

// Contract ABIs (minimal for reading)
const POLICY_REGISTRY_ABI = [
  {
    inputs: [{ name: "token", type: "address" }],
    name: "isTokenAllowed",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "router", type: "address" }],
    name: "isRouterAllowed",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

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
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "amountIn", type: "uint256" },
      { indexed: false, name: "amountOut", type: "uint256" },
    ],
    name: "AtomicLiquidityMigrated",
    type: "event",
  },
] as const;

interface MigrationEvent {
  user: string;
  amountIn: string;
  amountOut: string;
  timestamp: number;
  txHash: string;
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [recentEvents, setRecentEvents] = useState<MigrationEvent[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  // Auto-switch to Arbitrum Sepolia
  useEffect(() => {
    if (isConnected && chain?.id !== arbitrumSepolia.id) {
      switchChain({ chainId: arbitrumSepolia.id });
    }
  }, [isConnected, chain, switchChain]);

  // Read Policy Registry data
  const { data: policyOwner } = useReadContract({
    address: CONTRACTS.POLICY_REGISTRY as `0x${string}`,
    abi: POLICY_REGISTRY_ABI,
    functionName: "owner",
    chainId: 421614,
  });

  // Read TeleportV3 parameters
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

  // Watch for migration events
  useWatchContractEvent({
    address: CONTRACTS.TELEPORT_V3 as `0x${string}`,
    abi: TELEPORT_V3_ABI,
    eventName: "AtomicLiquidityMigrated",
    chainId: 421614,
    onLogs(logs) {
      const newEvents = logs.map((log) => ({
        user: log.args.user || "",
        amountIn: formatEther(log.args.amountIn || 0n),
        amountOut: formatEther(log.args.amountOut || 0n),
        timestamp: Date.now(),
        txHash: log.transactionHash || "",
      }));
      setRecentEvents((prev) => [...newEvents, ...prev].slice(0, 10));
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied`);
    setTimeout(() => setCopied(null), 2000);
  };

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
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#0F1E35] to-[#0A1628]">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 w-full border-b border-[#D4AF37]/20 bg-[#0A1628]/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="text-[#D4AF37] hover:text-[#D4AF37]/80"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-white">Dashboard</h1>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-[#D4AF37]">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] bg-[#0A1628] border-[#D4AF37]/20">
              <nav className="flex flex-col gap-4 mt-8">
                <Button
                  variant="ghost"
                  onClick={() => {
                    navigate("/");
                    setMobileMenuOpen(false);
                  }}
                  className="justify-start text-white hover:text-[#D4AF37]"
                >
                  Home
                </Button>
                {isConnected ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      disconnect();
                      setMobileMenuOpen(false);
                    }}
                    className="justify-start text-white hover:text-[#D4AF37]"
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      connect({ connector: connectors[0] });
                      setMobileMenuOpen(false);
                    }}
                    className="justify-start text-[#D4AF37]"
                  >
                    <Wallet className="h-4 w-4 mr-2" />
                    Connect Wallet
                  </Button>
                )}
                <Separator className="bg-[#D4AF37]/20" />
                <a
                  href={`https://sepolia.arbiscan.io/address/${CONTRACTS.TELEPORT_V3}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-white/70 hover:text-[#D4AF37]"
                >
                  View on Arbiscan
                  <ExternalLink className="h-4 w-4" />
                </a>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden lg:block sticky top-0 z-50 w-full border-b border-[#D4AF37]/20 bg-[#0A1628]/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="text-[#D4AF37] hover:text-[#D4AF37]/80"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            <Separator orientation="vertical" className="h-6 bg-[#D4AF37]/20" />
            <h1 className="text-xl font-semibold text-white">Protocol Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            {isConnected ? (
              <>
                <Badge variant="outline" className="border-[#D4AF37] text-[#D4AF37]">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => disconnect()}
                  className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10"
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                onClick={() => connect({ connector: connectors[0] })}
                className="bg-[#D4AF37] text-[#0A1628] hover:bg-[#D4AF37]/90"
              >
                <Wallet className="h-4 w-4 mr-2" />
                Connect Wallet
              </Button>
            )}
            <a
              href={`https://sepolia.arbiscan.io/address/${CONTRACTS.TELEPORT_V3}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10">
                <ExternalLink className="h-4 w-4 mr-2" />
                Arbiscan
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Connection Status */}
          {!isConnected && (
            <motion.div variants={itemVariants}>
              <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Connect Your Wallet</CardTitle>
                  <CardDescription className="text-white/70">
                    Connect your wallet to interact with Gravitas Protocol contracts on Arbitrum Sepolia
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => connect({ connector: connectors[0] })}
                    className="bg-[#D4AF37] text-[#0A1628] hover:bg-[#D4AF37]/90"
                  >
                    <Wallet className="h-4 w-4 mr-2" />
                    Connect MetaMask
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Protocol Stats */}
          <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-3">
            <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-white/70">Cooldown Period</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {cooldownPeriod ? `${Number(cooldownPeriod) / 60} min` : "Loading..."}
                </div>
                <p className="text-xs text-white/50 mt-1">Minimum time between migrations</p>
              </CardContent>
            </Card>

            <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-white/70">Max Price Movement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {maxMoveBps ? `${Number(maxMoveBps) / 100}%` : "Loading..."}
                </div>
                <p className="text-xs text-white/50 mt-1">Maximum allowed slippage</p>
              </CardContent>
            </Card>

            <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-white/70">Policy Owner</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-mono text-white break-all">
                  {policyOwner ? `${policyOwner.slice(0, 10)}...${policyOwner.slice(-8)}` : "Loading..."}
                </div>
                <p className="text-xs text-white/50 mt-1">Governance address</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contract Tabs */}
          <motion.div variants={itemVariants}>
            <Tabs defaultValue="teleportv3" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-[#0F1E35]/50 border border-[#D4AF37]/20">
                <TabsTrigger
                  value="teleportv3"
                  className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0A1628]"
                >
                  TeleportV3
                </TabsTrigger>
                <TabsTrigger
                  value="policy"
                  className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0A1628]"
                >
                  Policy Registry
                </TabsTrigger>
                <TabsTrigger
                  value="events"
                  className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0A1628]"
                >
                  Recent Events
                </TabsTrigger>
              </TabsList>

              <TabsContent value="teleportv3" className="space-y-4">
                <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-white">TeleportV3 Contract</CardTitle>
                    <CardDescription className="text-white/70">
                      Uniswap V3 liquidity migration with EIP-712 signatures
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-[#0A1628]/50">
                      <span className="text-white/70">Contract Address</span>
                      <div className="flex items-center gap-2">
                        <code className="text-[#D4AF37] text-sm font-mono">
                          {CONTRACTS.TELEPORT_V3.slice(0, 10)}...{CONTRACTS.TELEPORT_V3.slice(-8)}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(CONTRACTS.TELEPORT_V3, 'Address')}
                          className="text-[#D4AF37] hover:bg-[#D4AF37]/10"
                        >
                          {copied === 'Address' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-[#0A1628]/50">
                      <span className="text-white/70">Network</span>
                      <Badge className="bg-[#D4AF37] text-[#0A1628]">Arbitrum Sepolia</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-[#0A1628]/50">
                      <span className="text-white/70">Status</span>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-green-500">Active</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="policy" className="space-y-4">
                <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-white">Policy Registry</CardTitle>
                    <CardDescription className="text-white/70">
                      Shariah-compliant asset and router whitelisting
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-[#0A1628]/50">
                      <span className="text-white/70">Contract Address</span>
                      <code className="text-[#D4AF37] text-sm font-mono">
                        {CONTRACTS.POLICY_REGISTRY.slice(0, 10)}...{CONTRACTS.POLICY_REGISTRY.slice(-8)}
                      </code>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-[#0A1628]/50">
                      <span className="text-white/70">Owner</span>
                      <code className="text-[#D4AF37] text-sm font-mono">
                        {policyOwner ? `${policyOwner.slice(0, 6)}...${policyOwner.slice(-4)}` : "Loading..."}
                      </code>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-[#0A1628]/50">
                      <span className="text-white/70">Governance</span>
                      <Badge variant="outline" className="border-[#D4AF37] text-[#D4AF37]">
                        Multi-sig
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="events" className="space-y-4">
                <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white">Recent Migrations</CardTitle>
                        <CardDescription className="text-white/70">
                          Live migration events from TeleportV3
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10"
                        onClick={() => window.location.reload()}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {recentEvents.length === 0 ? (
                      <div className="text-center py-8 text-white/50">
                        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No recent events. Watching for new migrations...</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentEvents.map((event, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-4 rounded-lg bg-[#0A1628]/50 hover:bg-[#0A1628]/70 transition-colors"
                          >
                            <div className="space-y-1">
                              <p className="text-sm font-mono text-white">
                                {event.user.slice(0, 10)}...{event.user.slice(-8)}
                              </p>
                              <p className="text-xs text-white/50">
                                In: {parseFloat(event.amountIn).toFixed(4)} → Out: {parseFloat(event.amountOut).toFixed(4)}
                              </p>
                            </div>
                            <a
                              href={`https://sepolia.arbiscan.io/tx/${event.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#D4AF37] hover:text-[#D4AF37]/80"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
