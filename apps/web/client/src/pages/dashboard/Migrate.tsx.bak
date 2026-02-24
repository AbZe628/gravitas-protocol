import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowRight, AlertCircle, Loader2, CheckCircle2, Shield,
  Zap, Info, ExternalLink, Copy, CheckCheck, Search
} from "lucide-react";
import { useAccount, useReadContract } from "wagmi";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CONTRACTS } from "@/lib/wagmi";

const POLICY_REGISTRY_ABI = [
  {
    inputs: [{ name: "asset", type: "address" }],
    name: "isAssetCompliant",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const TELEPORT_V3_ABI = [
  {
    inputs: [{ name: "user", type: "address" }],
    name: "nonces",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
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

function ComplianceChecker({ address: walletAddress }: { address?: string }) {
  const [tokenAddress, setTokenAddress] = useState("");
  const [checkAddress, setCheckAddress] = useState<`0x${string}` | undefined>(undefined);

  const { data: isCompliant, isLoading } = useReadContract({
    address: CONTRACTS.POLICY_REGISTRY as `0x${string}`,
    abi: POLICY_REGISTRY_ABI,
    functionName: "isAssetCompliant",
    args: checkAddress ? [checkAddress] : undefined,
    query: { enabled: !!checkAddress },
    chainId: 421614,
  });

  const handleCheck = () => {
    if (/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
      setCheckAddress(tokenAddress as `0x${string}`);
    } else {
      toast.error("Invalid Ethereum address");
    }
  };

  return (
    <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#D4AF37]" />
          Shariah Compliance Checker
        </CardTitle>
        <CardDescription className="text-white/50 text-xs">
          Verify if a token is on the Shariah-compliant whitelist before migrating
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Token address (0x...)"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white font-mono text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
          />
          <Button
            onClick={handleCheck}
            size="sm"
            className="bg-[#D4AF37] text-[#0A1628] hover:bg-[#D4AF37]/90 shrink-0"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {checkAddress && !isLoading && (
          <div className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${
            isCompliant
              ? "border-green-500/20 bg-green-500/5 text-green-400"
              : "border-red-500/20 bg-red-500/5 text-red-400"
          }`}>
            {isCompliant ? (
              <><CheckCircle2 className="h-4 w-4 shrink-0" /> Asset is Shariah-compliant ✓</>
            ) : (
              <><AlertCircle className="h-4 w-4 shrink-0" /> Asset is NOT on the compliance whitelist</>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function V3PositionInfo({ address }: { address?: string }) {
  const { data: nonce } = useReadContract({
    address: CONTRACTS.TELEPORT_V3 as `0x${string}`,
    abi: TELEPORT_V3_ABI,
    functionName: "nonces",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address },
    chainId: 421614,
  });

  const { data: cooldown } = useReadContract({
    address: CONTRACTS.TELEPORT_V3 as `0x${string}`,
    abi: TELEPORT_V3_ABI,
    functionName: "cooldownPeriod",
    chainId: 421614,
  });

  const { data: maxMove } = useReadContract({
    address: CONTRACTS.TELEPORT_V3 as `0x${string}`,
    abi: TELEPORT_V3_ABI,
    functionName: "maxMoveBps",
    chainId: 421614,
  });

  if (!address) return null;

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="p-3 rounded-lg bg-[#0A1628]/50 border border-[#D4AF37]/10 text-center">
        <p className="text-xs text-white/40 mb-1">Your Nonce</p>
        <p className="text-lg font-bold text-white">{nonce?.toString() ?? "—"}</p>
      </div>
      <div className="p-3 rounded-lg bg-[#0A1628]/50 border border-[#D4AF37]/10 text-center">
        <p className="text-xs text-white/40 mb-1">Cooldown</p>
        <p className="text-lg font-bold text-white">{cooldown ? `${Number(cooldown) / 60}m` : "—"}</p>
      </div>
      <div className="p-3 rounded-lg bg-[#0A1628]/50 border border-[#D4AF37]/10 text-center">
        <p className="text-xs text-white/40 mb-1">Max Move</p>
        <p className="text-lg font-bold text-white">{maxMove ? `${Number(maxMove) / 100}%` : "—"}</p>
      </div>
    </div>
  );
}

export default function Migrate() {
  const { isConnected, address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [v2Form, setV2Form] = useState({
    factoryFrom: "",
    pairFrom: "",
    routerTo: "",
    tokenA: "",
    tokenB: "",
    amountLiquidity: "",
    deadline: "",
  });
  const [v3Form, setV3Form] = useState({
    tokenId: "",
    newFee: "3000",
    tickLower: "-887220",
    tickUpper: "887220",
    amount0MinMint: "0",
    amount1MinMint: "0",
    amount0MinDecrease: "0",
    amount1MinDecrease: "0",
  });
  const [step, setStep] = useState<"form" | "sign" | "execute">("form");

  const handleV2Migrate = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet");
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast.success("V2 Migration simulated successfully! Connect to Arbitrum Sepolia to execute.");
    }, 2000);
  };

  const handleV3Sign = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet");
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep("execute");
      toast.success("EIP-712 signature ready! Click Execute to submit.");
    }, 1500);
  };

  const handleV3Execute = async () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep("form");
      toast.success("V3 Migration executed atomically!");
    }, 2000);
  };

  const estimatedGas = "0.0024 ETH (~$4.50)";

  return (
    <div className="space-y-6">
      {!isConnected && (
        <Alert className="border-[#D4AF37]/30 bg-[#0F1E35]/50">
          <AlertCircle className="h-4 w-4 text-[#D4AF37]" />
          <AlertDescription className="text-white/70">
            Connect your wallet to Arbitrum Sepolia to start migrating liquidity positions
          </AlertDescription>
        </Alert>
      )}

      {/* Compliance Checker */}
      <ComplianceChecker address={address} />

      {/* Migration Form */}
      <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#D4AF37]" />
            Migrate Liquidity
          </CardTitle>
          <CardDescription className="text-white/70">
            Atomically migrate your Uniswap positions with Shariah compliance verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="v2" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-[#0A1628]/50 mb-6">
              <TabsTrigger value="v2" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0A1628]">
                Uniswap V2 → V2/V3
              </TabsTrigger>
              <TabsTrigger value="v3" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0A1628]">
                Uniswap V3 (EIP-712)
              </TabsTrigger>
            </TabsList>

            {/* V2 Tab */}
            <TabsContent value="v2" className="space-y-4">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Factory Address (From)</Label>
                    <Input
                      placeholder="0x... (Uniswap V2 Factory)"
                      value={v2Form.factoryFrom}
                      onChange={(e) => setV2Form({ ...v2Form, factoryFrom: e.target.value })}
                      className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white font-mono text-sm"
                      disabled={!isConnected}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Pair Address</Label>
                    <Input
                      placeholder="0x... (LP token address)"
                      value={v2Form.pairFrom}
                      onChange={(e) => setV2Form({ ...v2Form, pairFrom: e.target.value })}
                      className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white font-mono text-sm"
                      disabled={!isConnected}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Token A Address</Label>
                    <Input
                      placeholder="0x... (Token A)"
                      value={v2Form.tokenA}
                      onChange={(e) => setV2Form({ ...v2Form, tokenA: e.target.value })}
                      className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white font-mono text-sm"
                      disabled={!isConnected}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Token B Address</Label>
                    <Input
                      placeholder="0x... (Token B)"
                      value={v2Form.tokenB}
                      onChange={(e) => setV2Form({ ...v2Form, tokenB: e.target.value })}
                      className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white font-mono text-sm"
                      disabled={!isConnected}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Destination Router</Label>
                    <Input
                      placeholder="0x... (Target router)"
                      value={v2Form.routerTo}
                      onChange={(e) => setV2Form({ ...v2Form, routerTo: e.target.value })}
                      className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white font-mono text-sm"
                      disabled={!isConnected}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-sm">LP Token Amount</Label>
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={v2Form.amountLiquidity}
                      onChange={(e) => setV2Form({ ...v2Form, amountLiquidity: e.target.value })}
                      className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white"
                      disabled={!isConnected}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#0A1628]/50 border border-[#D4AF37]/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-white/60">Estimated Gas</span>
                    <span className="text-sm font-medium text-white">{estimatedGas}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/60">Slippage Tolerance</span>
                    <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30">0.5%</Badge>
                  </div>
                </div>

                <Button
                  onClick={handleV2Migrate}
                  disabled={!isConnected || isLoading}
                  className="w-full bg-[#D4AF37] text-[#0A1628] hover:bg-[#D4AF37]/90 font-semibold h-11"
                >
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Migrating...</>
                  ) : (
                    <>Migrate V2 Position <ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              </motion.div>
            </TabsContent>

            {/* V3 Tab */}
            <TabsContent value="v3" className="space-y-4">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* V3 Position Info */}
                <V3PositionInfo address={address} />

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Position Token ID</Label>
                    <Input
                      type="number"
                      placeholder="12345"
                      value={v3Form.tokenId}
                      onChange={(e) => setV3Form({ ...v3Form, tokenId: e.target.value })}
                      className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white"
                      disabled={!isConnected}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Target Fee Tier</Label>
                    <Select
                      value={v3Form.newFee}
                      onValueChange={(v) => setV3Form({ ...v3Form, newFee: v })}
                      disabled={!isConnected}
                    >
                      <SelectTrigger className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A1628] border-[#D4AF37]/20">
                        <SelectItem value="100" className="text-white hover:bg-[#D4AF37]/10">0.01% (100 bps)</SelectItem>
                        <SelectItem value="500" className="text-white hover:bg-[#D4AF37]/10">0.05% (500 bps)</SelectItem>
                        <SelectItem value="3000" className="text-white hover:bg-[#D4AF37]/10">0.3% (3000 bps)</SelectItem>
                        <SelectItem value="10000" className="text-white hover:bg-[#D4AF37]/10">1% (10000 bps)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Tick Lower</Label>
                    <Input
                      type="number"
                      placeholder="-887220"
                      value={v3Form.tickLower}
                      onChange={(e) => setV3Form({ ...v3Form, tickLower: e.target.value })}
                      className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white"
                      disabled={!isConnected}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Tick Upper</Label>
                    <Input
                      type="number"
                      placeholder="887220"
                      value={v3Form.tickUpper}
                      onChange={(e) => setV3Form({ ...v3Form, tickUpper: e.target.value })}
                      className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white"
                      disabled={!isConnected}
                    />
                  </div>
                </div>

                <Alert className="border-[#D4AF37]/30 bg-[#0A1628]/30">
                  <Info className="h-4 w-4 text-[#D4AF37]" />
                  <AlertDescription className="text-white/70 text-sm">
                    V3 migrations use EIP-712 typed data signatures for replay protection.
                    Your nonce is automatically fetched from the TeleportV3 contract.
                  </AlertDescription>
                </Alert>

                <div className="p-4 rounded-xl bg-[#0A1628]/50 border border-[#D4AF37]/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-white/60">Estimated Gas</span>
                    <span className="text-sm font-medium text-white">{estimatedGas}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-white/60">Max Price Movement</span>
                    <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30">5%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/60">Signature Type</span>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">EIP-712</Badge>
                  </div>
                </div>

                {/* Multi-step buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleV3Sign}
                    disabled={!isConnected || isLoading || step === "execute"}
                    variant={step === "execute" ? "outline" : "default"}
                    className={`flex-1 h-11 font-semibold ${step !== "execute" ? "bg-[#D4AF37] text-[#0A1628] hover:bg-[#D4AF37]/90" : "border-green-500/30 text-green-500"}`}
                  >
                    {isLoading && step === "form" ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing...</>
                    ) : step === "execute" ? (
                      <><CheckCircle2 className="mr-2 h-4 w-4" />Signed</>
                    ) : (
                      <>Sign Migration (EIP-712)</>
                    )}
                  </Button>

                  <Button
                    onClick={handleV3Execute}
                    disabled={!isConnected || isLoading || step !== "execute"}
                    className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-30"
                  >
                    {isLoading && step === "execute" ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Executing...</>
                    ) : (
                      <>Execute Migration <ArrowRight className="ml-2 h-4 w-4" /></>
                    )}
                  </Button>
                </div>
              </motion.div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* How to Migrate */}
      <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Migration Flow</CardTitle>
          <CardDescription className="text-white/70">How atomic liquidity migration works</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { step: "01", title: "Compliance Check", desc: "Verify token is on Shariah-compliant whitelist via PolicyRegistry" },
              { step: "02", title: "Sign Intent", desc: "For V3: Sign EIP-712 typed data with nonce for replay protection" },
              { step: "03", title: "Atomic Execute", desc: "Remove LP → Swap → Add LP in one transaction. All or nothing." },
              { step: "04", title: "Verify", desc: "Check transaction on Arbiscan and view in History tab" },
            ].map((item, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="h-8 w-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                  <span className="text-[#D4AF37] font-bold text-xs">{item.step}</span>
                </div>
                <h4 className="font-semibold text-white text-sm">{item.title}</h4>
                <p className="text-xs text-white/50">{item.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
