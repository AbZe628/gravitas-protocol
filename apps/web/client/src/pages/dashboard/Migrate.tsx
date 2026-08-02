import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowRight, AlertCircle, Loader2, CheckCircle2, Shield,
  Zap, Info, ExternalLink, Search
} from "lucide-react";
import { WalletButton } from "@/components/WalletModal";
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
import { decodeContractError } from "@/lib/errorDecoder";

// ABIs
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

const TELEPORT_V2_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

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
    { name: "nonce", type: "uint256" },
  ],
} as const;

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
    <div className="g-panel p-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-5 w-5 text-[var(--g-gold)]" />
        <h3 className="text-[var(--g-text-base)] font-bold text-[var(--g-paper)]">Compliance Verification</h3>
      </div>
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Asset address (0x...)"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            className="bg-[var(--g-navy)] border-[var(--g-line)] text-[var(--g-paper)] font-mono text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
          />
          <Button onClick={handleCheck} className="bg-[var(--g-gold)] text-[var(--g-navy)] font-bold px-4" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
        {checkAddress && !isLoading && (
          <div className={`p-4 rounded-[var(--g-radius)] border text-xs font-bold uppercase tracking-widest flex items-center gap-3 ${
            isCompliant ? "border-green-500/20 bg-green-500/5 text-green-400" : "border-red-500/20 bg-red-500/5 text-red-400"
          }`}>
            {isCompliant ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {isCompliant ? "Asset is Shariah-compliant" : "Asset not whitelisted"}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Migrate() {
  const { isConnected, address } = useAccount();
  const [v2Form, setV2Form] = useState({ factoryFrom: "", routerTo: "", tokenA: "", tokenB: "", amountLiquidity: "", amountAMin: "0", amountBMin: "0" });
  const [v3Form, setV3Form] = useState({ tokenId: "", newFee: "3000", tickLower: "-887220", tickUpper: "887220", amount0MinMint: "1", amount1MinMint: "1", amount0MinDecrease: "0", amount1MinDecrease: "0" });
  const [step, setStep] = useState<"form" | "execute">("form");
  const [v3Signature, setV3Signature] = useState<`0x${string}` | undefined>(undefined);
  const [v3Deadline, setV3Deadline] = useState<bigint>(BigInt(0));

  const { data: userNonce } = useReadContract({
    address: CONTRACTS.TELEPORT_V3 as `0x${string}`,
    abi: TELEPORT_V3_ABI,
    functionName: "nonces",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address },
    chainId: 421614,
  });

  const { writeContractAsync: writeV2, isPending: v2Pending } = useWriteContract();
  const [v2TxHash, setV2TxHash] = useState<`0x${string}` | undefined>(undefined);
  const { isLoading: v2Confirming, isSuccess: v2Confirmed } = useWaitForTransactionReceipt({ hash: v2TxHash });

  const { signTypedDataAsync, isPending: v3Signing } = useSignTypedData();
  const { writeContractAsync: writeV3, isPending: v3Executing } = useWriteContract();
  const [v3TxHash, setV3TxHash] = useState<`0x${string}` | undefined>(undefined);
  const { isLoading: v3Confirming, isSuccess: v3Confirmed } = useWaitForTransactionReceipt({ hash: v3TxHash });

  const handleV2Migrate = async () => {
    if (!isConnected || !address) { toast.error("Connect wallet"); return; }
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);
    try {
      const hash = await writeV2({
        address: TELEPORT_V2_ADDRESS,
        abi: TELEPORT_V2_ABI,
        functionName: "migrateLiquidityV2",
        args: [v2Form.factoryFrom as `0x${string}`, v2Form.routerTo as `0x${string}`, v2Form.tokenA as `0x${string}`, v2Form.tokenB as `0x${string}`, BigInt(v2Form.amountLiquidity), BigInt(v2Form.amountAMin), BigInt(v2Form.amountBMin), deadline, address as `0x${string}`],
        chainId: arbitrumSepolia.id,
      });
      setV2TxHash(hash);
    } catch (err: unknown) { toast.error(decodeContractError(err)); }
  };

  const handleV3Sign = async () => {
    if (!isConnected || !address) { toast.error("Connect wallet"); return; }
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);
    setV3Deadline(deadline);
    try {
      const sig = await signTypedDataAsync({
        domain: EIP712_DOMAIN,
        types: EIP712_TYPES,
        primaryType: "MigrationIntent",
        message: { tokenId: BigInt(v3Form.tokenId), newFee: parseInt(v3Form.newFee) as 500 | 3000 | 10000, newTickLower: parseInt(v3Form.tickLower), newTickUpper: parseInt(v3Form.tickUpper), amount0MinMint: BigInt(v3Form.amount0MinMint), amount1MinMint: BigInt(v3Form.amount1MinMint), amount0MinDecrease: BigInt(v3Form.amount0MinDecrease), amount1MinDecrease: BigInt(v3Form.amount1MinDecrease), deadline, executeSwap: false, zeroForOne: false, swapAmountIn: BigInt(0), swapAmountOutMin: BigInt(0), swapFeeTier: 3000, nonce: userNonce ?? BigInt(0) },
      });
      setV3Signature(sig);
      setStep("execute");
    } catch (err: unknown) { toast.error(decodeContractError(err)); }
  };

  const handleV3Execute = async () => {
    if (!v3Signature) return;
    try {
      const hash = await writeV3({
        address: CONTRACTS.TELEPORT_V3 as `0x${string}`,
        abi: TELEPORT_V3_ABI,
        functionName: "executeAtomicMigration",
        args: [{ tokenId: BigInt(v3Form.tokenId), newFee: parseInt(v3Form.newFee) as 500 | 3000 | 10000, newTickLower: parseInt(v3Form.tickLower), newTickUpper: parseInt(v3Form.tickUpper), amount0MinMint: BigInt(v3Form.amount0MinMint), amount1MinMint: BigInt(v3Form.amount1MinMint), amount0MinDecrease: BigInt(v3Form.amount0MinDecrease), amount1MinDecrease: BigInt(v3Form.amount1MinDecrease), deadline: v3Deadline, executeSwap: false, zeroForOne: false, swapAmountIn: BigInt(0), swapAmountOutMin: BigInt(0), swapFeeTier: 3000 }, v3Signature],
        chainId: arbitrumSepolia.id,
      });
      setV3TxHash(hash);
    } catch (err: unknown) { toast.error(decodeContractError(err)); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="g-label text-[var(--g-gold-soft)] mb-4 block">Liquidity Teleportation</span>
          <h1 className="g-display">Protocol Migration</h1>
        </div>
        <div className="w-full md:w-80">
          <ComplianceChecker />
        </div>
      </div>

      {!isConnected ? (
        <div className="g-panel-raised p-16 text-center">
          <Zap className="h-12 w-12 text-[var(--g-gold)] mx-auto mb-6 opacity-40" />
          <h3 className="text-xl font-bold mb-4">Connection Required</h3>
          <p className="text-[var(--g-muted)] mb-8 max-w-sm mx-auto">Access the Gravitas teleportation engine by connecting your institutional wallet.</p>
          <WalletButton />
        </div>
      ) : (
        <Tabs defaultValue="v3" className="space-y-8">
          <TabsList className="grid grid-cols-2 w-full max-w-md bg-[var(--g-surface)] border border-[var(--g-line)] p-1 rounded-[var(--g-radius)]">
            <TabsTrigger value="v3" className="data-[state=active]:bg-[var(--g-gold)] data-[state=active]:text-[var(--g-navy)] font-bold py-2">
              Uniswap V3 Engine
            </TabsTrigger>
            <TabsTrigger value="v2" className="data-[state=active]:bg-[var(--g-gold)] data-[state=active]:text-[var(--g-navy)] font-bold py-2">
              V2 Legacy Router
            </TabsTrigger>
          </TabsList>

          <TabsContent value="v3">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="g-panel-raised p-8">
                  <div className="flex items-center gap-3 mb-8">
                    <Zap className="h-6 w-6 text-[var(--g-gold)]" />
                    <h3 className="text-xl font-bold">Atomic V3 Migration</h3>
                  </div>

                  {step === "form" ? (
                    <div className="space-y-8">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="g-label text-[var(--g-muted)]">Position Token ID</Label>
                          <Input value={v3Form.tokenId} onChange={(e) => setV3Form({...v3Form, tokenId: e.target.value})} className="bg-[var(--g-navy)] border-[var(--g-line)] text-[var(--g-paper)] font-mono" placeholder="12345" />
                        </div>
                        <div className="space-y-2">
                          <Label className="g-label text-[var(--g-muted)]">New Fee Tier</Label>
                          <Select value={v3Form.newFee} onValueChange={(v) => setV3Form({...v3Form, newFee: v})}>
                            <SelectTrigger className="bg-[var(--g-navy)] border-[var(--g-line)] text-[var(--g-paper)]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[var(--g-navy)] border-[var(--g-line)] text-[var(--g-paper)]">
                              <SelectItem value="500">0.05%</SelectItem>
                              <SelectItem value="3000">0.3%</SelectItem>
                              <SelectItem value="10000">1.0%</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="g-label text-[var(--g-muted)]">Lower Tick</Label>
                          <Input value={v3Form.tickLower} onChange={(e) => setV3Form({...v3Form, tickLower: e.target.value})} className="bg-[var(--g-navy)] border-[var(--g-line)] text-[var(--g-paper)] font-mono" />
                        </div>
                        <div className="space-y-2">
                          <Label className="g-label text-[var(--g-muted)]">Upper Tick</Label>
                          <Input value={v3Form.tickUpper} onChange={(e) => setV3Form({...v3Form, tickUpper: e.target.value})} className="bg-[var(--g-navy)] border-[var(--g-line)] text-[var(--g-paper)] font-mono" />
                        </div>
                      </div>

                      <Button onClick={handleV3Sign} disabled={v3Signing} className="w-full bg-[var(--g-gold)] text-[var(--g-navy)] font-bold py-6">
                        {v3Signing ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign Migration Intent"}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-8 py-4">
                      <div className="p-6 rounded-[var(--g-radius)] bg-green-400/5 border border-green-400/20">
                        <div className="flex items-center gap-3 mb-2 text-green-400">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="font-bold">Intent Signed</span>
                        </div>
                        <p className="text-xs text-green-400/70 font-mono break-all opacity-60">{v3Signature}</p>
                      </div>
                      <div className="flex gap-4">
                        <Button onClick={() => setStep("form")} variant="outline" className="flex-1 border-[var(--g-line)] text-[var(--g-muted)]">Back</Button>
                        <Button onClick={handleV3Execute} disabled={v3Executing || v3Confirming} className="flex-[2] bg-[var(--g-gold)] text-[var(--g-navy)] font-bold">
                          {v3Executing || v3Confirming ? <Loader2 className="h-5 w-5 animate-spin" /> : "Execute Migration"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {v3Confirmed && v3TxHash && (
                    <Alert className="mt-8 border-green-500/30 bg-green-500/5 text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>Migration successful. <a href={`https://sepolia.arbiscan.io/tx/${v3TxHash}`} target="_blank" className="underline">View tx</a></AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="g-panel p-6">
                  <h4 className="g-label text-[var(--g-muted)] mb-4">Protocol Safety</h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-xs text-[var(--g-paper-dim)]">
                      <Shield className="h-4 w-4 text-[var(--g-gold)] opacity-50" />
                      <span>EIP-712 Intent Binding</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--g-paper-dim)]">
                      <Shield className="h-4 w-4 text-[var(--g-gold)] opacity-50" />
                      <span>Atomic Fee-Rebalancing</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--g-paper-dim)]">
                      <Shield className="h-4 w-4 text-[var(--g-gold)] opacity-50" />
                      <span>Shariah-Policy Enforcement</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="v2">
            <div className="g-panel-raised p-8 max-w-3xl">
              <div className="flex items-center gap-3 mb-8">
                <History className="h-6 w-6 text-[var(--g-gold)]" />
                <h3 className="text-xl font-bold">Legacy V2 Migration</h3>
              </div>
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="g-label text-[var(--g-muted)]">Source Factory</Label>
                    <Input value={v2Form.factoryFrom} onChange={(e) => setV2Form({...v2Form, factoryFrom: e.target.value})} className="bg-[var(--g-navy)] border-[var(--g-line)] text-[var(--g-paper)] font-mono" placeholder="0x..." />
                  </div>
                  <div className="space-y-2">
                    <Label className="g-label text-[var(--g-muted)]">Target Router</Label>
                    <Input value={v2Form.routerTo} onChange={(e) => setV2Form({...v2Form, routerTo: e.target.value})} className="bg-[var(--g-navy)] border-[var(--g-line)] text-[var(--g-paper)] font-mono" placeholder="0x..." />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="g-label text-[var(--g-muted)]">Token A</Label>
                    <Input value={v2Form.tokenA} onChange={(e) => setV2Form({...v2Form, tokenA: e.target.value})} className="bg-[var(--g-navy)] border-[var(--g-line)] text-[var(--g-paper)] font-mono" placeholder="0x..." />
                  </div>
                  <div className="space-y-2">
                    <Label className="g-label text-[var(--g-muted)]">Token B</Label>
                    <Input value={v2Form.tokenB} onChange={(e) => setV2Form({...v2Form, tokenB: e.target.value})} className="bg-[var(--g-navy)] border-[var(--g-line)] text-[var(--g-paper)] font-mono" placeholder="0x..." />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="g-label text-[var(--g-muted)]">LP Token Amount</Label>
                  <Input value={v2Form.amountLiquidity} onChange={(e) => setV2Form({...v2Form, amountLiquidity: e.target.value})} className="bg-[var(--g-navy)] border-[var(--g-line)] text-[var(--g-paper)] font-mono" placeholder="1000000000000000000" />
                </div>
                <Button onClick={handleV2Migrate} disabled={v2Pending || v2Confirming} className="w-full bg-[var(--g-gold)] text-[var(--g-navy)] font-bold py-6">
                  {v2Pending || v2Confirming ? <Loader2 className="h-5 w-5 animate-spin" /> : "Migrate Legacy Liquidity"}
                </Button>
                {v2Confirmed && v2TxHash && (
                  <Alert className="border-green-500/30 bg-green-500/5 text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>V2 migration confirmed. <a href={`https://sepolia.arbiscan.io/tx/${v2TxHash}`} target="_blank" className="underline">View tx</a></AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
