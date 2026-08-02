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
  ExternalLink, Settings, Users, Sliders, RefreshCw
} from "lucide-react";
import { WalletButton } from "@/components/WalletModal";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CONTRACTS } from "@/lib/wagmi";
import { decodeContractError } from "@/lib/errorDecoder";
import Header from "@/components/Header";
import ParametricField from "@/design/ParametricField";

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

const TELEPORT_V2_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

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
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="g-label text-[var(--g-muted)]">Token Address</Label>
        <Input
          placeholder="0x..."
          value={assetAddress}
          onChange={(e) => setAssetAddress(e.target.value)}
          className="bg-[var(--g-navy)] border-[var(--g-line)] text-[var(--g-paper)] font-mono text-sm focus:border-[var(--g-gold)]"
        />
      </div>
      <div className="flex gap-4">
        <Button
          onClick={() => handleSetCompliance(true)}
          disabled={isPending || isConfirming}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
        >
          {isPending || isConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="mr-2 h-4 w-4" />Whitelist Asset</>}
        </Button>
        <Button
          onClick={() => handleSetCompliance(false)}
          disabled={isPending || isConfirming}
          variant="outline"
          className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10 font-bold"
        >
          {isPending || isConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <><AlertCircle className="mr-2 h-4 w-4" />Blacklist Asset</>}
        </Button>
      </div>
      {isConfirmed && pendingTxHash && (
        <Alert className="border-green-500/30 bg-green-500/5 text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Transaction confirmed. <a href={`https://sepolia.arbiscan.io/tx/${pendingTxHash}`} target="_blank" rel="noopener noreferrer" className="underline">View on Arbiscan</a>
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
    <div className="space-y-8">
      <div className="space-y-4">
        <h4 className="g-label text-[var(--g-muted)]">DEX Router Authorization</h4>
        <Input
          placeholder="Router Address (0x...)"
          value={routerAddress}
          onChange={(e) => setRouterAddress(e.target.value)}
          className="bg-[var(--g-navy)] border-[var(--g-line)] text-[var(--g-paper)] font-mono text-sm"
        />
        <div className="flex gap-4">
          <Button onClick={() => handleSetRouter(true)} disabled={routerPending || routerConfirming} className="flex-1 bg-[var(--g-gold)] text-[var(--g-navy)] font-bold">
            {routerPending || routerConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Authorize"}
          </Button>
          <Button onClick={() => handleSetRouter(false)} disabled={routerPending || routerConfirming} variant="outline" className="flex-1 border-red-500/50 text-red-400 font-bold">
            {routerPending || routerConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Revoke"}
          </Button>
        </div>
      </div>

      <Separator className="bg-[var(--g-line)]" />

      <div className="space-y-4">
        <h4 className="g-label text-[var(--g-muted)]">Protocol Executor Management</h4>
        <Input
          placeholder="Executor Address (0x...)"
          value={executorAddress}
          onChange={(e) => setExecutorAddress(e.target.value)}
          className="bg-[var(--g-navy)] border-[var(--g-line)] text-[var(--g-paper)] font-mono text-sm"
        />
        <div className="flex gap-4">
          <Button onClick={() => handleSetExecutor(true)} disabled={executorPending || executorConfirming} className="flex-1 bg-[var(--g-gold)] text-[var(--g-navy)] font-bold">
            {executorPending || executorConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Authorize"}
          </Button>
          <Button onClick={() => handleSetExecutor(false)} disabled={executorPending || executorConfirming} variant="outline" className="flex-1 border-red-500/50 text-red-400 font-bold">
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
    <div className="min-h-screen bg-[var(--g-navy)] text-[var(--g-paper)]">
      <Header />

      <main className="pt-24 pb-20">
        <section className="relative py-20 overflow-hidden">
          <ParametricField 
            className="absolute inset-0 w-full h-full pointer-events-none opacity-20" 
            anchor={{ x: 0.5, y: 0.5 }}
            scale={0.8}
            shells={4}
          />
          <div className="container px-6 mx-auto max-w-7xl relative z-10">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} className="max-w-3xl mx-auto text-center">
              <span className="g-label mb-4 block text-[var(--g-gold-soft)]">Administrative Console</span>
              <h1 className="g-display mb-6">Policy Governance</h1>
              <p className="g-prose text-[var(--g-paper-dim)] mx-auto">
                Authorized management of the Gravitas Policy Registry. Governance actions require owner privileges and emit on-chain audit events.
              </p>
            </motion.div>
          </div>
        </section>

        <div className="container px-6 mx-auto max-w-4xl">
          {!isConnected ? (
            <div className="g-panel-raised p-12 text-center">
              <Lock className="h-12 w-12 text-[var(--g-gold)] mx-auto mb-6 opacity-40" />
              <h3 className="text-xl font-bold mb-4">Restricted Access</h3>
              <p className="text-[var(--g-muted)] mb-8">Connect your administrative wallet to manage protocol policies.</p>
              <WalletButton />
            </div>
          ) : !isOwner ? (
            <div className="g-panel-raised p-12 text-center border-red-500/20">
              <Shield className="h-12 w-12 text-red-400 mx-auto mb-6 opacity-40" />
              <h3 className="text-xl font-bold mb-4 text-red-400">Unauthorized</h3>
              <p className="text-[var(--g-muted)] mb-8">Your address is not recognized as the Registry Owner.</p>
              <div className="p-4 bg-[var(--g-navy)] rounded border border-[var(--g-line)] text-xs font-mono text-[var(--g-muted)]">
                Connected: {address}
              </div>
            </div>
          ) : (
            <Tabs defaultValue="assets" className="space-y-8">
              <TabsList className="grid grid-cols-2 bg-[var(--g-surface)] border border-[var(--g-line)] p-1 rounded-[var(--g-radius)]">
                <TabsTrigger value="assets" className="data-[state=active]:bg-[var(--g-gold)] data-[state=active]:text-[var(--g-navy)] font-bold py-2 transition-all">
                  <Sliders className="h-4 w-4 mr-2" /> Asset Policy
                </TabsTrigger>
                <TabsTrigger value="infrastructure" className="data-[state=active]:bg-[var(--g-gold)] data-[state=active]:text-[var(--g-navy)] font-bold py-2 transition-all">
                  <Settings className="h-4 w-4 mr-2" /> Infrastructure
                </TabsTrigger>
              </TabsList>

              <TabsContent value="assets">
                <div className="g-panel-raised p-8">
                  <div className="flex items-center gap-3 mb-8">
                    <Building2 className="h-6 w-6 text-[var(--g-gold)]" />
                    <h3 className="text-xl font-bold">Asset Whitelisting</h3>
                  </div>
                  <AssetManagement />
                </div>
              </TabsContent>

              <TabsContent value="infrastructure">
                <div className="g-panel-raised p-8">
                  <div className="flex items-center gap-3 mb-8">
                    <Users className="h-6 w-6 text-[var(--g-gold)]" />
                    <h3 className="text-xl font-bold">Authorized Entities</h3>
                  </div>
                  <RouterExecutorManagement />
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>

      <footer className="bg-[var(--g-navy)] border-t border-[var(--g-line)] py-12">
        <div className="container px-6 mx-auto max-w-7xl flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="text-[var(--g-text-xs)] text-[var(--g-muted)]">
            © 2026 Gravitas Protocol Governance.
          </div>
          <div className="flex gap-6 text-[var(--g-text-xs)] text-[var(--g-muted)]">
            <a href="https://sepolia.arbiscan.io/address/0xbcaE3069362B0f0b80f44139052f159456C84679" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--g-paper)] transition-colors">Arbiscan</a>
            <Link href="/" className="hover:text-[var(--g-paper)] transition-colors">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Building2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  );
}
