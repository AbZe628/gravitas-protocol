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
  Zap, Info, ExternalLink, Search
} from "lucide-react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSignTypedData,
} from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CONTRACTS } from "@/lib/wagmi";

// ─── ABIs ─────────────────────────────────────────────────────────────────────
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
  {
    inputs: [
      {
        components: [
          { name: "tokenId", type: "uint256" },
          { name: "newFee", type: "uint24" },
          { name: "newTickLower", type: "int24" },
          { name: "newTickUpper", type: "int24" },
          { name: "amount0MinMint", type: "uint256" },
          { name: "amount1MinMint", type: "uint256" },
          { name: "amount0MinDecrease", type: "uint256" },
          { name: "amount1MinDecrease", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "executeSwap", type: "bool" },
          { name: "zeroForOne", type: "bool" },
          { name: "swapAmountIn", type: "uint256" },
          { name: "swapAmountOutMin", type: "uint256" },
          { name: "swapFeeTier", type: "uint24" },
        ],
        name: "params",
        type: "tuple",
      },
      { name: "signature", type: "bytes" },
    ],
    name: "executeAtomicMigration",
    outputs: [
      { name: "newTokenId", type: "uint256" },
      { name: "newLiquidity", type: "uint128" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const TELEPORT_V2_ABI = [
  {
    inputs: [
      { name: "factoryFrom", type: "address" },
      { name: "routerTo", type: "address" },
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "lpAmount", type: "uint256" },
      { name: "amountAMin", type: "uint256" },
      { name: "amountBMin", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    name: "migrateLiquidityV2",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// TeleportV2 contract address — update when deployed to mainnet
const TELEPORT_V2_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

// ─── EIP-712 Domain & Types ────────────────────────────────────────────────────
const EIP712_DOMAIN = {
  name: "GravitasTeleportV3",
  version: "1",
  chainId: arbitrumSepolia.id,
  verifyingContract: CONTRACTS.TELEPORT_V3 as `0x${string}`,
} as const;

const EIP712_TYPES = {
  MigrationIntent: [
    { name: "tokenId", type: "uint256" },
    { name: "newFee", type: "uint24" },
    { name: "newTickLower", type: "int24" },
    { name: "newTickUpper", type: "int24" },
    { name: "deadline", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

// ─── Compliance Checker ────────────────────────────────────────────────────────
function ComplianceChecker() {
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
          <div
            className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${
              isCompliant
                ? "border-green-500/20 bg-green-500/5 text-green-400"
                : "border-red-500/20 bg-red-500/5 text-red-400"
            }`}
          >
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

// ─── Contract Stats ────────────────────────────────────────────────────────────
function ContractStats({ address }: { address?: string }) {
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

// ─── Main Migrate Component ────────────────────────────────────────────────────
export default function Migrate() {
  const { isConnected, address } = useAccount();

  // V2 form state
  const [v2Form, setV2Form] = useState({
    factoryFrom: "",
    routerTo: "",
    tokenA: "",
    tokenB: "",
    amountLiquidity: "",
    amountAMin: "0",
    amountBMin: "0",
  });

  // V3 form state
  const [v3Form, setV3Form] = useState({
    tokenId: "",
    newFee: "3000",
    tickLower: "-887220",
    tickUpper: "887220",
    amount0MinMint: "1",
    amount1MinMint: "1",
    amount0MinDecrease: "0",
    amount1MinDecrease: "0",
  });

  // V3 multi-step state
  const [step, setStep] = useState<"form" | "execute">("form");
  const [v3Signature, setV3Signature] = useState<`0x${string}` | undefined>(undefined);
  const [v3Deadline, setV3Deadline] = useState<bigint>(BigInt(0));

  // Nonce for EIP-712
  const { data: userNonce } = useReadContract({
    address: CONTRACTS.TELEPORT_V3 as `0x${string}`,
    abi: TELEPORT_V3_ABI,
    functionName: "nonces",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address },
    chainId: 421614,
  });

  // V2 write contract
  const { writeContractAsync: writeV2, isPending: v2Pending } = useWriteContract();
  const [v2TxHash, setV2TxHash] = useState<`0x${string}` | undefined>(undefined);
  const { isLoading: v2Confirming, isSuccess: v2Confirmed } = useWaitForTransactionReceipt({ hash: v2TxHash });

  // V3 EIP-712 sign
  const { signTypedDataAsync, isPending: v3Signing } = useSignTypedData();

  // V3 execute write contract
  const { writeContractAsync: writeV3, isPending: v3Executing } = useWriteContract();
  const [v3TxHash, setV3TxHash] = useState<`0x${string}` | undefined>(undefined);
  const { isLoading: v3Confirming, isSuccess: v3Confirmed } = useWaitForTransactionReceipt({ hash: v3TxHash });

  // V2 Migration Handler
  const handleV2Migrate = async () => {
    if (!isConnected || !address) { toast.error("Please connect your wallet"); return; }
    const { factoryFrom, routerTo, tokenA, tokenB, amountLiquidity, amountAMin, amountBMin } = v2Form;
    if (!factoryFrom || !routerTo || !tokenA || !tokenB || !amountLiquidity) {
      toast.error("Please fill in all required fields");
      return;
    }
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);
    try {
      const hash = await writeV2({
        address: TELEPORT_V2_ADDRESS,
        abi: TELEPORT_V2_ABI,
        functionName: "migrateLiquidityV2",
        args: [
          factoryFrom as `0x${string}`,
          routerTo as `0x${string}`,
          tokenA as `0x${string}`,
          tokenB as `0x${string}`,
          BigInt(amountLiquidity),
          BigInt(amountAMin || "0"),
          BigInt(amountBMin || "0"),
          deadline,
          address as `0x${string}`,
        ],
        chainId: arbitrumSepolia.id,
      });
      setV2TxHash(hash);
      toast.info(`V2 migration submitted: ${hash.slice(0, 10)}...`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      toast.error(msg.includes("User rejected") || msg.includes("user rejected") ? "Rejected by user" : msg.slice(0, 100));
    }
  };

  // V3 EIP-712 Sign Handler
  const handleV3Sign = async () => {
    if (!isConnected || !address) { toast.error("Please connect your wallet"); return; }
    if (!v3Form.tokenId) { toast.error("Please enter a Token ID"); return; }
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);
    setV3Deadline(deadline);
    try {
      const sig = await signTypedDataAsync({
        domain: EIP712_DOMAIN,
        types: EIP712_TYPES,
        primaryType: "MigrationIntent",
        message: {
          tokenId: BigInt(v3Form.tokenId),
          newFee: parseInt(v3Form.newFee) as 500 | 3000 | 10000,
          newTickLower: parseInt(v3Form.tickLower),
          newTickUpper: parseInt(v3Form.tickUpper),
          deadline,
          nonce: userNonce ?? BigInt(0),
        },
      });
      setV3Signature(sig);
      setStep("execute");
      toast.success("EIP-712 intent signed. Click Execute to submit the migration.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Signing failed";
      toast.error(msg.includes("User rejected") || msg.includes("user rejected") ? "Signature rejected" : msg.slice(0, 100));
    }
  };

  // V3 Execute Handler
  const handleV3Execute = async () => {
    if (!v3Signature || !address) { toast.error("Please sign the migration intent first"); return; }
    try {
      const hash = await writeV3({
        address: CONTRACTS.TELEPORT_V3 as `0x${string}`,
        abi: TELEPORT_V3_ABI,
        functionName: "executeAtomicMigration",
        args: [
          {
            tokenId: BigInt(v3Form.tokenId),
            newFee: parseInt(v3Form.newFee) as 500 | 3000 | 10000,
            newTickLower: parseInt(v3Form.tickLower),
            newTickUpper: parseInt(v3Form.tickUpper),
            amount0MinMint: BigInt(v3Form.amount0MinMint || "1"),
            amount1MinMint: BigInt(v3Form.amount1MinMint || "1"),
            amount0MinDecrease: BigInt(v3Form.amount0MinDecrease || "0"),
            amount1MinDecrease: BigInt(v3Form.amount1MinDecrease || "0"),
            deadline: v3Deadline,
            executeSwap: false,
            zeroForOne: false,
            swapAmountIn: BigInt(0),
            swapAmountOutMin: BigInt(0),
            swapFeeTier: 3000,
          },
          v3Signature,
        ],
        chainId: arbitrumSepolia.id,
      });
      setV3TxHash(hash);
      toast.info(`V3 migration submitted: ${hash.slice(0, 10)}...`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      toast.error(msg.includes("User rejected") || msg.includes("user rejected") ? "Rejected by user" : msg.slice(0, 100));
    }
  };

  const handleV3Reset = () => {
    setStep("form");
    setV3Signature(undefined);
    setV3TxHash(undefined);
  };

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

      <ComplianceChecker />

      <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#D4AF37]" />
            Atomic Liquidity Migration
          </CardTitle>
          <CardDescription className="text-white/70">
            Migrate your liquidity positions atomically with on-chain compliance verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="v3">
            <TabsList className="bg-[#0A1628]/50 border border-[#D4AF37]/20 w-full grid grid-cols-2 mb-6">
              <TabsTrigger value="v3" className="data-[state=active]:bg-[#D4AF37]/20 data-[state=active]:text-[#D4AF37] text-white/60">
                V3 Migration (EIP-712)
              </TabsTrigger>
              <TabsTrigger value="v2" className="data-[state=active]:bg-[#D4AF37]/20 data-[state=active]:text-[#D4AF37] text-white/60">
                V2 Migration
              </TabsTrigger>
            </TabsList>

            {/* ── V3 Tab ── */}
            <TabsContent value="v3">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <ContractStats address={address} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Token ID (NFT Position)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 12345"
                      value={v3Form.tokenId}
                      onChange={(e) => setV3Form({ ...v3Form, tokenId: e.target.value })}
                      className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white"
                      disabled={!isConnected || step === "execute"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-sm">New Fee Tier</Label>
                    <Select
                      value={v3Form.newFee}
                      onValueChange={(val) => setV3Form({ ...v3Form, newFee: val })}
                      disabled={!isConnected || step === "execute"}
                    >
                      <SelectTrigger className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0F1E35] border-[#D4AF37]/20">
                        <SelectItem value="500" className="text-white">0.05% (Stable)</SelectItem>
                        <SelectItem value="3000" className="text-white">0.3% (Standard)</SelectItem>
                        <SelectItem value="10000" className="text-white">1% (Exotic)</SelectItem>
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
                      disabled={!isConnected || step === "execute"}
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
                      disabled={!isConnected || step === "execute"}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Min Amount0 (Mint)</Label>
                    <Input
                      type="number"
                      placeholder="1"
                      value={v3Form.amount0MinMint}
                      onChange={(e) => setV3Form({ ...v3Form, amount0MinMint: e.target.value })}
                      className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white"
                      disabled={!isConnected || step === "execute"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Min Amount1 (Mint)</Label>
                    <Input
                      type="number"
                      placeholder="1"
                      value={v3Form.amount1MinMint}
                      onChange={(e) => setV3Form({ ...v3Form, amount1MinMint: e.target.value })}
                      className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white"
                      disabled={!isConnected || step === "execute"}
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
                    <span className="text-sm font-medium text-white">~0.0024 ETH</span>
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

                {!v3Confirmed ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={handleV3Sign}
                      disabled={!isConnected || v3Signing || step === "execute"}
                      variant={step === "execute" ? "outline" : "default"}
                      className={`flex-1 h-11 font-semibold ${
                        step !== "execute"
                          ? "bg-[#D4AF37] text-[#0A1628] hover:bg-[#D4AF37]/90"
                          : "border-green-500/30 text-green-500"
                      }`}
                    >
                      {v3Signing ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing...</>
                      ) : step === "execute" ? (
                        <><CheckCircle2 className="mr-2 h-4 w-4" />Signed</>
                      ) : (
                        <>Sign Migration (EIP-712)</>
                      )}
                    </Button>
                    <Button
                      onClick={handleV3Execute}
                      disabled={!isConnected || v3Executing || v3Confirming || step !== "execute"}
                      className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-30"
                    >
                      {v3Executing || v3Confirming ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{v3Confirming ? "Confirming..." : "Executing..."}</>
                      ) : (
                        <>Execute Migration <ArrowRight className="ml-2 h-4 w-4" /></>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Alert className="border-green-500/30 bg-green-500/5">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <AlertDescription className="text-green-400 text-sm">
                        Migration executed successfully!{" "}
                        <a
                          href={`https://sepolia.arbiscan.io/tx/${v3TxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline inline-flex items-center gap-1"
                        >
                          View on Arbiscan <ExternalLink className="h-3 w-3" />
                        </a>
                      </AlertDescription>
                    </Alert>
                    <Button
                      onClick={handleV3Reset}
                      variant="outline"
                      className="w-full border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                    >
                      New Migration
                    </Button>
                  </div>
                )}
              </motion.div>
            </TabsContent>

            {/* ── V2 Tab ── */}
            <TabsContent value="v2">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Factory Address (Source)</Label>
                    <Input
                      placeholder="0x..."
                      value={v2Form.factoryFrom}
                      onChange={(e) => setV2Form({ ...v2Form, factoryFrom: e.target.value })}
                      className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white font-mono text-sm"
                      disabled={!isConnected}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Router Address (Destination)</Label>
                    <Input
                      placeholder="0x..."
                      value={v2Form.routerTo}
                      onChange={(e) => setV2Form({ ...v2Form, routerTo: e.target.value })}
                      className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white font-mono text-sm"
                      disabled={!isConnected}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Token A Address</Label>
                    <Input
                      placeholder="0x..."
                      value={v2Form.tokenA}
                      onChange={(e) => setV2Form({ ...v2Form, tokenA: e.target.value })}
                      className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white font-mono text-sm"
                      disabled={!isConnected}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Token B Address</Label>
                    <Input
                      placeholder="0x..."
                      value={v2Form.tokenB}
                      onChange={(e) => setV2Form({ ...v2Form, tokenB: e.target.value })}
                      className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white font-mono text-sm"
                      disabled={!isConnected}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-white text-sm">LP Amount (wei)</Label>
                  <Input
                    type="number"
                    placeholder="Amount of LP tokens to migrate"
                    value={v2Form.amountLiquidity}
                    onChange={(e) => setV2Form({ ...v2Form, amountLiquidity: e.target.value })}
                    className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white"
                    disabled={!isConnected}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Min Amount A (slippage)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={v2Form.amountAMin}
                      onChange={(e) => setV2Form({ ...v2Form, amountAMin: e.target.value })}
                      className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white"
                      disabled={!isConnected}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Min Amount B (slippage)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={v2Form.amountBMin}
                      onChange={(e) => setV2Form({ ...v2Form, amountBMin: e.target.value })}
                      className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white"
                      disabled={!isConnected}
                    />
                  </div>
                </div>

                <Alert className="border-amber-500/30 bg-amber-500/5">
                  <Info className="h-4 w-4 text-amber-400" />
                  <AlertDescription className="text-amber-300/80 text-sm">
                    V2 migration requires prior approval of LP tokens to the TeleportV2 contract.
                    Ensure both tokens are Shariah-compliant and the router is authorized in the PolicyRegistry.
                  </AlertDescription>
                </Alert>

                {v2Confirmed && v2TxHash ? (
                  <Alert className="border-green-500/30 bg-green-500/5">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-400 text-sm">
                      V2 Migration confirmed!{" "}
                      <a
                        href={`https://sepolia.arbiscan.io/tx/${v2TxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline inline-flex items-center gap-1"
                      >
                        View on Arbiscan <ExternalLink className="h-3 w-3" />
                      </a>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Button
                    onClick={handleV2Migrate}
                    disabled={!isConnected || v2Pending || v2Confirming}
                    className="w-full h-11 bg-[#D4AF37] text-[#0A1628] hover:bg-[#D4AF37]/90 font-semibold"
                  >
                    {v2Pending || v2Confirming ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{v2Confirming ? "Confirming..." : "Submitting..."}</>
                    ) : (
                      <>Migrate V2 Liquidity <ArrowRight className="ml-2 h-4 w-4" /></>
                    )}
                  </Button>
                )}
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
