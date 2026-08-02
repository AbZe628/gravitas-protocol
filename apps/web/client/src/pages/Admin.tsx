import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, Lock, AlertCircle, Loader2, CheckCircle2,
  ExternalLink, Settings, Users, Sliders, Building2
} from "lucide-react";
import { WalletButton } from "@/components/WalletModal";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CONTRACTS } from "@/lib/wagmi";
import { decodeContractError } from "@/lib/errorDecoder";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GeometryBackground from "@/components/GeometryBackground";

// ABIs
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

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

function AssetManagement() {
  const [assetAddress, setAssetAddress] = useState("");
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | undefined>(undefined);
  const { writeContractAsync, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: pendingTxHash });

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
    <div className="space-y-10">
      <div className="space-y-4">
        <Label className="text-[10px] uppercase tracking-widest text-muted font-bold">Token Address</Label>
        <Input
          placeholder="0x..."
          value={assetAddress}
          onChange={(e) => setAssetAddress(e.target.value)}
          className="bg-ink border-line text-paper font-mono text-sm h-12 focus:border-gold"
        />
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          onClick={() => handleSetCompliance(true)}
          disabled={isPending || isConfirming}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold h-12 rounded-sm"
        >
          {isPending || isConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="mr-2 h-4 w-4" />Whitelist Asset</>}
        </Button>
        <Button
          onClick={() => handleSetCompliance(false)}
          disabled={isPending || isConfirming}
          variant="outline"
          className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10 font-bold h-12 rounded-sm"
        >
          {isPending || isConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <><AlertCircle className="mr-2 h-4 w-4" />Blacklist Asset</>}
        </Button>
      </div>
      {isConfirmed && pendingTxHash && (
        <Alert className="border-green-500/30 bg-green-500/5 text-green-400 rounded-xl">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Transaction confirmed. <a href={`https://sepolia.arbiscan.io/tx/${pendingTxHash}`} target="_blank" rel="noopener noreferrer" className="underline font-bold">View on Arbiscan</a>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

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
    <div className="space-y-16">
      <div className="space-y-6">
        <h4 className="text-[10px] uppercase tracking-widest text-muted font-bold">DEX Router Authorization</h4>
        <Input
          placeholder="Router Address (0x...)"
          value={routerAddress}
          onChange={(e) => setRouterAddress(e.target.value)}
          className="bg-ink border-line text-paper font-mono text-sm h-12 focus:border-gold"
        />
        <div className="flex gap-4">
          <Button onClick={() => handleSetRouter(true)} disabled={routerPending || routerConfirming} className="flex-1 bg-gold text-ink font-bold h-12 rounded-sm hover:bg-goldsoft">
            {routerPending || routerConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Authorize"}
          </Button>
          <Button onClick={() => handleSetRouter(false)} disabled={routerPending || routerConfirming} variant="outline" className="flex-1 border-red-500/50 text-red-400 font-bold h-12 rounded-sm hover:bg-red-500/5">
            {routerPending || routerConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Revoke"}
          </Button>
        </div>
      </div>

      <Separator className="bg-line" />

      <div className="space-y-6">
        <h4 className="text-[10px] uppercase tracking-widest text-muted font-bold">Protocol Executor Management</h4>
        <Input
          placeholder="Executor Address (0x...)"
          value={executorAddress}
          onChange={(e) => setExecutorAddress(e.target.value)}
          className="bg-ink border-line text-paper font-mono text-sm h-12 focus:border-gold"
        />
        <div className="flex gap-4">
          <Button onClick={() => handleSetExecutor(true)} disabled={executorPending || executorConfirming} className="flex-1 bg-gold text-ink font-bold h-12 rounded-sm hover:bg-goldsoft">
            {executorPending || executorConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Authorize"}
          </Button>
          <Button onClick={() => handleSetExecutor(false)} disabled={executorPending || executorConfirming} variant="outline" className="flex-1 border-red-500/50 text-red-400 font-bold h-12 rounded-sm hover:bg-red-500/5">
            {executorPending || executorConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Revoke"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  const { address, isConnected } = useAccount();
  const { data: owner } = useReadContract({
    address: CONTRACTS.POLICY_REGISTRY as `0x${string}`,
    abi: POLICY_REGISTRY_ABI,
    functionName: "owner",
    chainId: arbitrumSepolia.id,
  });

  const isOwner = address && owner && address.toLowerCase() === owner.toLowerCase();

  return (
    <div className="min-h-screen bg-ink text-paper selection:bg-gold/30 selection:text-goldsoft">
      <Header />

      <main className="pt-20 pb-32">
        <section className="relative py-32 md:py-48 overflow-hidden">
          <GeometryBackground variant="simple" className="opacity-30" />
          <div className="container relative z-10 text-center">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} className="max-w-4xl mx-auto">
              <span className="px-4 py-1.5 rounded-full bg-gold/5 border border-gold/20 text-goldsoft text-[10px] uppercase tracking-[0.2em] font-bold mb-10 inline-block">
                Administrative Console
              </span>
              <h1 className="display-xl mb-10">Policy Governance</h1>
              <p className="prose-institutional text-lg md:text-xl text-sand/80 mx-auto">
                Authorized management of the Gravitas Policy Registry. Governance actions require owner privileges and emit on-chain audit events.
              </p>
            </motion.div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-surface hadid-sweep border-t border-gold/10" />
        </section>

        <div className="container relative z-10 -mt-16">
          <div className="max-w-4xl mx-auto">
            {!isConnected ? (
              <div className="g-panel-raised p-16 text-center bg-surface/40 backdrop-blur-xl">
                <div className="h-20 w-20 rounded-2xl bg-gold/5 border border-gold/20 flex items-center justify-center mx-auto mb-10">
                  <Lock className="h-10 w-10 text-gold opacity-40" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Restricted Access</h3>
                <p className="text-muted mb-12 max-w-sm mx-auto leading-relaxed">Connect your administrative wallet to manage protocol policies.</p>
                <WalletButton />
              </div>
            ) : !isOwner ? (
              <div className="g-panel-raised p-16 text-center bg-surface/40 backdrop-blur-xl border-red-500/20">
                <div className="h-20 w-20 rounded-2xl bg-red-500/5 border border-red-500/20 flex items-center justify-center mx-auto mb-10">
                  <Shield className="h-10 w-10 text-red-400 opacity-40" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-red-400">Unauthorized</h3>
                <p className="text-muted mb-12 max-w-sm mx-auto leading-relaxed">Your address is not recognized as the Registry Owner.</p>
                <div className="p-4 bg-ink/60 rounded-xl border border-line text-xs font-mono text-muted break-all">
                  Connected: {address}
                </div>
              </div>
            ) : (
              <Tabs defaultValue="assets" className="space-y-12">
                <TabsList className="grid grid-cols-2 bg-surface border border-line p-1.5 rounded-xl h-16">
                  <TabsTrigger value="assets" className="data-[state=active]:bg-gold data-[state=active]:text-ink font-bold py-3 rounded-lg transition-all text-sm uppercase tracking-widest">
                    <Sliders className="h-4 w-4 mr-3" /> Asset Policy
                  </TabsTrigger>
                  <TabsTrigger value="infrastructure" className="data-[state=active]:bg-gold data-[state=active]:text-ink font-bold py-3 rounded-lg transition-all text-sm uppercase tracking-widest">
                    <Settings className="h-4 w-4 mr-3" /> Infrastructure
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="assets">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="g-panel-raised p-12 bg-surface/40 backdrop-blur-xl">
                    <div className="flex items-center gap-4 mb-12">
                      <div className="h-12 w-12 rounded-xl bg-gold/5 border border-gold/20 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-gold" />
                      </div>
                      <h3 className="text-2xl font-bold">Asset Whitelisting</h3>
                    </div>
                    <AssetManagement />
                  </motion.div>
                </TabsContent>

                <TabsContent value="infrastructure">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="g-panel-raised p-12 bg-surface/40 backdrop-blur-xl">
                    <div className="flex items-center gap-4 mb-12">
                      <div className="h-12 w-12 rounded-xl bg-gold/5 border border-gold/20 flex items-center justify-center">
                        <Users className="h-6 w-6 text-gold" />
                      </div>
                      <h3 className="text-2xl font-bold">Authorized Entities</h3>
                    </div>
                    <RouterExecutorManagement />
                  </motion.div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
