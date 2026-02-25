import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, Lock, AlertCircle, Loader2, CheckCircle2,
  ExternalLink, Settings, Users, Sliders, RefreshCw, Home
} from "lucide-react";
import { Link } from "wouter";
import { WalletButton } from "@/components/WalletModal";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CONTRACTS } from "@/lib/wagmi";
import { decodeContractError } from "@/lib/errorDecoder";

// ─── ABIs ────────────────────────────────────────────────────────────────────
const POLICY_REGISTRY_ABI = [
  {
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "currentVersion",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "asset", type: "address" }],
    name: "isAssetCompliant",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "router", type: "address" }],
    name: "isRouterAuthorized",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "executor", type: "address" }],
    name: "isExecutor",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "asset", type: "address" },
      { name: "status", type: "bool" },
    ],
    name: "setAssetCompliance",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "router", type: "address" },
      { name: "status", type: "bool" },
    ],
    name: "setRouterAuthorization",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "executor", type: "address" },
      { name: "status", type: "bool" },
    ],
    name: "setExecutorStatus",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const TELEPORT_V2_ABI = [
  {
    inputs: [],
    name: "cooldownSeconds",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "maxMoveBps",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "_cooldownSeconds", type: "uint256" },
      { name: "_maxMoveBps", type: "uint256" },
    ],
    name: "setPolicy",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// ─── TELEPORT V2 ADDRESS (same as registry for now — update when deployed) ──
const TELEPORT_V2_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

// ─── Asset Management Tab ────────────────────────────────────────────────────
function AssetManagement() {
  const [assetAddress, setAssetAddress] = useState("");
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | undefined>(undefined);

  const { writeContractAsync, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: pendingTxHash,
  });

  const handleSetCompliance = async (status: boolean) => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(assetAddress)) {
      toast.error("Invalid Ethereum address");
      return;
    }
    try {
      const hash = await writeContractAsync({
        address: CONTRACTS.POLICY_REGISTRY as `0x${string}`,
        abi: POLICY_REGISTRY_ABI,
        functionName: "setAssetCompliance",
        args: [assetAddress as `0x${string}`, status],
        chainId: arbitrumSepolia.id,
      });
      setPendingTxHash(hash);
      toast.info(`Transaction submitted: ${hash.slice(0, 10)}...`);
    } catch (err: unknown) {
      toast.error(decodeContractError(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-white text-sm">Token Address</Label>
        <Input
          placeholder="0x..."
          value={assetAddress}
          onChange={(e) => setAssetAddress(e.target.value)}
          className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white font-mono text-sm"
        />
      </div>
      <div className="flex gap-3">
        <Button
          onClick={() => handleSetCompliance(true)}
          disabled={isPending || isConfirming}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
        >
          {isPending || isConfirming ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isConfirming ? "Confirming..." : "Submitting..."}</>
          ) : (
            <><CheckCircle2 className="mr-2 h-4 w-4" />Whitelist Asset</>
          )}
        </Button>
        <Button
          onClick={() => handleSetCompliance(false)}
          disabled={isPending || isConfirming}
          variant="outline"
          className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10 font-semibold"
        >
          {isPending || isConfirming ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
          ) : (
            <><AlertCircle className="mr-2 h-4 w-4" />Blacklist Asset</>
          )}
        </Button>
      </div>
      {isConfirmed && pendingTxHash && (
        <Alert className="border-green-500/30 bg-green-500/5">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-400 text-sm">
            Transaction confirmed.{" "}
            <a
              href={`https://sepolia.arbiscan.io/tx/${pendingTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              View on Arbiscan
            </a>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ─── Router/Executor Management Tab ─────────────────────────────────────────
function RouterExecutorManagement() {
  const [routerAddress, setRouterAddress] = useState("");
  const [executorAddress, setExecutorAddress] = useState("");
  const [routerTxHash, setRouterTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [executorTxHash, setExecutorTxHash] = useState<`0x${string}` | undefined>(undefined);

  const { writeContractAsync: writeRouter, isPending: routerPending } = useWriteContract();
  const { writeContractAsync: writeExecutor, isPending: executorPending } = useWriteContract();

  const { isLoading: routerConfirming, isSuccess: routerConfirmed } = useWaitForTransactionReceipt({ hash: routerTxHash });
  const { isLoading: executorConfirming, isSuccess: executorConfirmed } = useWaitForTransactionReceipt({ hash: executorTxHash });

  const handleSetRouter = async (status: boolean) => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(routerAddress)) {
      toast.error("Invalid router address");
      return;
    }
    try {
      const hash = await writeRouter({
        address: CONTRACTS.POLICY_REGISTRY as `0x${string}`,
        abi: POLICY_REGISTRY_ABI,
        functionName: "setRouterAuthorization",
        args: [routerAddress as `0x${string}`, status],
        chainId: arbitrumSepolia.id,
      });
      setRouterTxHash(hash);
      toast.info(`Router tx submitted: ${hash.slice(0, 10)}...`);
    } catch (err: unknown) {
      toast.error(decodeContractError(err));
    }
  };

  const handleSetExecutor = async (status: boolean) => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(executorAddress)) {
      toast.error("Invalid executor address");
      return;
    }
    try {
      const hash = await writeExecutor({
        address: CONTRACTS.POLICY_REGISTRY as `0x${string}`,
        abi: POLICY_REGISTRY_ABI,
        functionName: "setExecutorStatus",
        args: [executorAddress as `0x${string}`, status],
        chainId: arbitrumSepolia.id,
      });
      setExecutorTxHash(hash);
      toast.info(`Executor tx submitted: ${hash.slice(0, 10)}...`);
    } catch (err: unknown) {
      toast.error(decodeContractError(err));
    }
  };

  return (
    <div className="space-y-6">
      {/* Router Section */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-white/80 uppercase tracking-wider">DEX Router Authorization</h4>
        <div className="space-y-2">
          <Label className="text-white text-sm">Router Address</Label>
          <Input
            placeholder="0x..."
            value={routerAddress}
            onChange={(e) => setRouterAddress(e.target.value)}
            className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white font-mono text-sm"
          />
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => handleSetRouter(true)}
            disabled={routerPending || routerConfirming}
            className="flex-1 bg-[#D4AF37] text-[#0A1628] hover:bg-[#D4AF37]/90 font-semibold text-sm"
          >
            {routerPending || routerConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Authorize Router"}
          </Button>
          <Button
            onClick={() => handleSetRouter(false)}
            disabled={routerPending || routerConfirming}
            variant="outline"
            className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10 text-sm"
          >
            {routerPending || routerConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Revoke Router"}
          </Button>
        </div>
        {routerConfirmed && routerTxHash && (
          <p className="text-xs text-green-400">
            ✓ Confirmed.{" "}
            <a href={`https://sepolia.arbiscan.io/tx/${routerTxHash}`} target="_blank" rel="noopener noreferrer" className="underline">
              View tx
            </a>
          </p>
        )}
      </div>

      <Separator className="bg-[#D4AF37]/10" />

      {/* Executor Section */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Protocol Executor Management</h4>
        <div className="space-y-2">
          <Label className="text-white text-sm">Executor Address</Label>
          <Input
            placeholder="0x..."
            value={executorAddress}
            onChange={(e) => setExecutorAddress(e.target.value)}
            className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white font-mono text-sm"
          />
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => handleSetExecutor(true)}
            disabled={executorPending || executorConfirming}
            className="flex-1 bg-[#D4AF37] text-[#0A1628] hover:bg-[#D4AF37]/90 font-semibold text-sm"
          >
            {executorPending || executorConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Authorize Executor"}
          </Button>
          <Button
            onClick={() => handleSetExecutor(false)}
            disabled={executorPending || executorConfirming}
            variant="outline"
            className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10 text-sm"
          >
            {executorPending || executorConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Revoke Executor"}
          </Button>
        </div>
        {executorConfirmed && executorTxHash && (
          <p className="text-xs text-green-400">
            ✓ Confirmed.{" "}
            <a href={`https://sepolia.arbiscan.io/tx/${executorTxHash}`} target="_blank" rel="noopener noreferrer" className="underline">
              View tx
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Policy Updates Tab ───────────────────────────────────────────────────────
function PolicyUpdates() {
  const [cooldown, setCooldown] = useState("");
  const [maxBps, setMaxBps] = useState("");
  const [policyTxHash, setPolicyTxHash] = useState<`0x${string}` | undefined>(undefined);

  const { writeContractAsync, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: policyTxHash });

  const { data: currentCooldown } = useReadContract({
    address: TELEPORT_V2_ADDRESS,
    abi: TELEPORT_V2_ABI,
    functionName: "cooldownSeconds",
    chainId: arbitrumSepolia.id,
    query: { enabled: TELEPORT_V2_ADDRESS !== "0x0000000000000000000000000000000000000000" },
  });

  const { data: currentMaxBps } = useReadContract({
    address: TELEPORT_V2_ADDRESS,
    abi: TELEPORT_V2_ABI,
    functionName: "maxMoveBps",
    chainId: arbitrumSepolia.id,
    query: { enabled: TELEPORT_V2_ADDRESS !== "0x0000000000000000000000000000000000000000" },
  });

  const handleSetPolicy = async () => {
    const cooldownVal = parseInt(cooldown);
    const bpsVal = parseInt(maxBps);
    if (isNaN(cooldownVal) || cooldownVal < 0 || cooldownVal > 604800) {
      toast.error("Cooldown must be between 0 and 604800 seconds (7 days)");
      return;
    }
    if (isNaN(bpsVal) || bpsVal <= 0 || bpsVal > 10000) {
      toast.error("Max Move BPS must be between 1 and 10000");
      return;
    }
    try {
      const hash = await writeContractAsync({
        address: TELEPORT_V2_ADDRESS,
        abi: TELEPORT_V2_ABI,
        functionName: "setPolicy",
        args: [BigInt(cooldownVal), BigInt(bpsVal)],
        chainId: arbitrumSepolia.id,
      });
      setPolicyTxHash(hash);
      toast.info(`Policy update submitted: ${hash.slice(0, 10)}...`);
    } catch (err: unknown) {
      toast.error(decodeContractError(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-[#0A1628]/50 border border-[#D4AF37]/10 text-center">
          <p className="text-xs text-white/40 mb-1">Current Cooldown</p>
          <p className="text-xl font-bold text-white">
            {currentCooldown !== undefined ? `${Number(currentCooldown) / 60}m` : "N/A"}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-[#0A1628]/50 border border-[#D4AF37]/10 text-center">
          <p className="text-xs text-white/40 mb-1">Current Max Move</p>
          <p className="text-xl font-bold text-white">
            {currentMaxBps !== undefined ? `${Number(currentMaxBps) / 100}%` : "N/A"}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-white text-sm">
            New Cooldown (seconds)
            <span className="text-white/40 ml-2 text-xs">max: 604800 (7 days)</span>
          </Label>
          <Input
            type="number"
            placeholder="900 (= 15 minutes)"
            value={cooldown}
            onChange={(e) => setCooldown(e.target.value)}
            className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-white text-sm">
            New Max Move BPS
            <span className="text-white/40 ml-2 text-xs">100 BPS = 1%, max: 10000</span>
          </Label>
          <Input
            type="number"
            placeholder="2000 (= 20%)"
            value={maxBps}
            onChange={(e) => setMaxBps(e.target.value)}
            className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white"
          />
        </div>
        <Button
          onClick={handleSetPolicy}
          disabled={isPending || isConfirming}
          className="w-full bg-[#D4AF37] text-[#0A1628] hover:bg-[#D4AF37]/90 font-semibold h-11"
        >
          {isPending || isConfirming ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isConfirming ? "Confirming..." : "Submitting..."}</>
          ) : (
            <><Settings className="mr-2 h-4 w-4" />Update Policy Parameters</>
          )}
        </Button>
        {isConfirmed && policyTxHash && (
          <Alert className="border-green-500/30 bg-green-500/5">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-400 text-sm">
              Policy updated.{" "}
              <a href={`https://sepolia.arbiscan.io/tx/${policyTxHash}`} target="_blank" rel="noopener noreferrer" className="underline">
                View on Arbiscan
              </a>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────
export default function Admin() {
  const { address, isConnected, chain } = useAccount();

  const { data: registryOwner, isLoading: ownerLoading, refetch: refetchOwner } = useReadContract({
    address: CONTRACTS.POLICY_REGISTRY as `0x${string}`,
    abi: POLICY_REGISTRY_ABI,
    functionName: "owner",
    chainId: arbitrumSepolia.id,
    query: { enabled: isConnected },
  });

  const { data: policyVersion } = useReadContract({
    address: CONTRACTS.POLICY_REGISTRY as `0x${string}`,
    abi: POLICY_REGISTRY_ABI,
    functionName: "currentVersion",
    chainId: arbitrumSepolia.id,
  });

  const isOwner =
    isConnected &&
    address &&
    registryOwner &&
    address.toLowerCase() === (registryOwner as string).toLowerCase();

  const isWrongNetwork = isConnected && chain?.id !== arbitrumSepolia.id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#0F1E35] to-[#0A1628] p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#B8941F] flex items-center justify-center">
                <Shield className="h-4 w-4 text-[#0A1628]" />
              </div>
              <h1 className="text-2xl font-bold text-white">Admin Control Panel</h1>
            </div>
            <p className="text-white/50 text-sm ml-11">
              GravitasPolicyRegistry — Protected by <code className="text-[#D4AF37]">registry.owner()</code>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm" className="border-white/15 text-white/60 hover:text-white hover:bg-white/5">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Link>
            </Button>
            {policyVersion !== undefined && (
              <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30">
                Policy v{policyVersion.toString()}
              </Badge>
            )}
            <a
              href={`https://sepolia.arbiscan.io/address/${CONTRACTS.POLICY_REGISTRY}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10">
                <ExternalLink className="h-3 w-3 mr-1" />
                Arbiscan
              </Button>
            </a>
          </div>
        </motion.div>

        {/* Access Gate */}
        {!isConnected && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-[#D4AF37]/30 bg-[#0F1E35]/50">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-[#D4AF37] shrink-0 mt-0.5" />
              <p className="text-sm text-white/70 leading-snug">
                Connect your wallet to verify ownership. This panel is restricted to the registry owner.
              </p>
            </div>
            <WalletButton size="sm" className="shrink-0" />
          </div>
        )}

        {isWrongNetwork && (
          <Alert className="border-red-500/30 bg-red-500/5">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-400">
              Wrong network detected. Please switch to <strong>Arbitrum Sepolia</strong>.
            </AlertDescription>
          </Alert>
        )}

        {isConnected && !isWrongNetwork && !ownerLoading && !isOwner && (
          <Alert className="border-red-500/30 bg-red-500/5">
            <Lock className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-400">
              <strong>Access Denied.</strong> Your wallet ({address?.slice(0, 6)}...{address?.slice(-4)}) is not the
              registry owner.
              <br />
              <span className="text-xs text-white/40 mt-1 block">
                Registry owner: {registryOwner ? `${(registryOwner as string).slice(0, 10)}...${(registryOwner as string).slice(-8)}` : "Loading..."}
              </span>
            </AlertDescription>
          </Alert>
        )}

        {ownerLoading && isConnected && (
          <div className="flex items-center gap-3 text-white/50 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifying ownership on-chain...
          </div>
        )}

        {/* Owner Status Card */}
        {isConnected && !isWrongNetwork && registryOwner && (
          <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${isOwner ? "bg-green-400" : "bg-red-400"}`} />
                  <div>
                    <p className="text-xs text-white/40">Connected Wallet</p>
                    <p className="text-sm font-mono text-white">{address?.slice(0, 10)}...{address?.slice(-8)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isOwner ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Owner Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-red-500/30 text-red-400">
                      Not Owner
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetchOwner()}
                    className="text-white/40 hover:text-white"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin Tabs — only shown to owner */}
        {isOwner && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Tabs defaultValue="assets">
              <TabsList className="bg-[#0A1628]/50 border border-[#D4AF37]/20 w-full grid grid-cols-3">
                <TabsTrigger value="assets" className="data-[state=active]:bg-[#D4AF37]/20 data-[state=active]:text-[#D4AF37] text-white/60 text-xs sm:text-sm">
                  <Shield className="h-3 w-3 mr-1 sm:mr-2" />
                  Assets
                </TabsTrigger>
                <TabsTrigger value="routers" className="data-[state=active]:bg-[#D4AF37]/20 data-[state=active]:text-[#D4AF37] text-white/60 text-xs sm:text-sm">
                  <Users className="h-3 w-3 mr-1 sm:mr-2" />
                  Routers
                </TabsTrigger>
                <TabsTrigger value="policy" className="data-[state=active]:bg-[#D4AF37]/20 data-[state=active]:text-[#D4AF37] text-white/60 text-xs sm:text-sm">
                  <Sliders className="h-3 w-3 mr-1 sm:mr-2" />
                  Policy
                </TabsTrigger>
              </TabsList>

              <TabsContent value="assets">
                <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur mt-4">
                  <CardHeader>
                    <CardTitle className="text-white text-base flex items-center gap-2">
                      <Shield className="h-4 w-4 text-[#D4AF37]" />
                      Asset Compliance Management
                    </CardTitle>
                    <CardDescription className="text-white/50 text-sm">
                      Whitelist or blacklist tokens in the Shariah-compliance registry via{" "}
                      <code className="text-[#D4AF37]">setAssetCompliance()</code>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AssetManagement />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="routers">
                <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur mt-4">
                  <CardHeader>
                    <CardTitle className="text-white text-base flex items-center gap-2">
                      <Users className="h-4 w-4 text-[#D4AF37]" />
                      Router & Executor Management
                    </CardTitle>
                    <CardDescription className="text-white/50 text-sm">
                      Authorize DEX routers and protocol executors via{" "}
                      <code className="text-[#D4AF37]">setRouterAuthorization()</code> and{" "}
                      <code className="text-[#D4AF37]">setExecutorStatus()</code>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RouterExecutorManagement />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="policy">
                <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur mt-4">
                  <CardHeader>
                    <CardTitle className="text-white text-base flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-[#D4AF37]" />
                      Policy Parameter Updates
                    </CardTitle>
                    <CardDescription className="text-white/50 text-sm">
                      Update <code className="text-[#D4AF37]">cooldownSeconds</code> and{" "}
                      <code className="text-[#D4AF37]">maxMoveBps</code> on the TeleportV2 contract
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PolicyUpdates />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}

        {/* Security Notice */}
        <Card className="border-[#D4AF37]/10 bg-[#0A1628]/30">
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-3">
              <Lock className="h-4 w-4 text-[#D4AF37] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1">Security Notice</p>
                <p className="text-xs text-white/40">
                  All write operations require on-chain ownership verification against{" "}
                  <code className="text-[#D4AF37]">registry.owner()</code>. Transactions are signed locally and
                  submitted directly to Arbitrum Sepolia. No private keys are stored or transmitted.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
