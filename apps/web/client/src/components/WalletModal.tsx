import { useState } from "react";
import { useConnect, useDisconnect, useAccount } from "wagmi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, LogOut, ExternalLink, Copy, CheckCheck, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Wallet icons as SVG strings
const WALLET_ICONS: Record<string, string> = {
  MetaMask: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M35.6 3L22.1 12.7l2.5-5.9L35.6 3z" fill="#E2761B"/><path d="M4.4 3l13.4 9.8-2.4-5.9L4.4 3z" fill="#E4761B"/><path d="M30.7 27.6l-3.6 5.5 7.7 2.1 2.2-7.5-6.3-.1z" fill="#E4761B"/><path d="M2.9 27.7l2.2 7.5 7.7-2.1-3.6-5.5-6.3.1z" fill="#E4761B"/><path d="M12.4 18.1l-2.1 3.2 7.5.3-.3-8.1-5.1 4.6z" fill="#E4761B"/><path d="M27.6 18.1l-5.2-4.7-.2 8.2 7.5-.3-2.1-3.2z" fill="#E4761B"/><path d="M12.8 33.1l4.5-2.2-3.9-3-.6 5.2z" fill="#E4761B"/><path d="M22.7 30.9l4.5 2.2-.6-5.2-3.9 3z" fill="#E4761B"/></svg>`,
  "Coinbase Wallet": `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="20" fill="#0052FF"/><path d="M20 8C13.4 8 8 13.4 8 20s5.4 12 12 12 12-5.4 12-12S26.6 8 20 8zm0 18.5c-3.6 0-6.5-2.9-6.5-6.5s2.9-6.5 6.5-6.5 6.5 2.9 6.5 6.5-2.9 6.5-6.5 6.5z" fill="white"/><rect x="16" y="18" width="8" height="4" rx="1" fill="white"/></svg>`,
  WalletConnect: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="20" fill="#3B99FC"/><path d="M12.5 17.5c4.1-4 10.9-4 15 0l.5.5c.2.2.2.5 0 .7l-1.7 1.7c-.1.1-.3.1-.4 0l-.7-.7c-2.9-2.8-7.5-2.8-10.4 0l-.7.7c-.1.1-.3.1-.4 0l-1.7-1.7c-.2-.2-.2-.5 0-.7l.5-.5zm18.5 3.5l1.5 1.5c.2.2.2.5 0 .7l-6.8 6.6c-.2.2-.5.2-.7 0l-4.8-4.7c-.1-.1-.2-.1-.4 0l-4.8 4.7c-.2.2-.5.2-.7 0L7.5 23.2c-.2-.2-.2-.5 0-.7l1.5-1.5c.2-.2.5-.2.7 0l4.8 4.7c.1.1.2.1.4 0l4.8-4.7c.2-.2.5-.2.7 0l4.8 4.7c.1.1.2.1.4 0l4.8-4.7c.2-.2.5-.2.7 0z" fill="white"/></svg>`,
  Injected: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="20" fill="#1A1A2E"/><path d="M20 10c-5.5 0-10 4.5-10 10s4.5 10 10 10 10-4.5 10-10S25.5 10 20 10zm0 3c1.7 0 3 1.3 3 3s-1.3 3-3 3-3-1.3-3-3 1.3-3 3-3zm0 14c-2.5 0-4.7-1.3-6-3.2.1-2 4-3 6-3s5.9 1 6 3c-1.3 1.9-3.5 3.2-6 3.2z" fill="#D4AF37"/></svg>`,
};

function WalletIcon({ name }: { name: string }) {
  const svg = WALLET_ICONS[name] || WALLET_ICONS["Injected"];
  return (
    <div
      className="h-10 w-10 rounded-xl flex items-center justify-center overflow-hidden shrink-0"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

interface WalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WalletModal({ open, onOpenChange }: WalletModalProps) {
  const { connectors, connect, isPending, variables } = useConnect({
    mutation: {
      onSuccess: () => {
        onOpenChange(false);
        toast.success("Wallet connected");
      },
      onError: (error) => {
        const msg = error.message || "Connection failed";
        if (msg.toLowerCase().includes("user rejected") || msg.toLowerCase().includes("user denied")) {
          toast.error("Connection rejected");
        } else if (msg.toLowerCase().includes("already processing")) {
          toast.error("Connection request already pending — check your wallet");
        } else {
          toast.error(msg.slice(0, 80));
        }
      },
    },
  });

  const displayConnectors = connectors.filter((c) => {
    // Deduplicate: skip injected if MetaMask is also present
    if (c.id === "injected" && connectors.some((x) => x.id === "metaMask")) return false;
    return true;
  });

  const getConnectorLabel = (id: string, name: string) => {
    if (id === "metaMask") return "MetaMask";
    if (id === "coinbaseWallet") return "Coinbase Wallet";
    if (id === "walletConnect") return "WalletConnect";
    if (id === "injected") return "Browser Wallet";
    return name;
  };

  const getConnectorDescription = (id: string) => {
    if (id === "metaMask") return "Connect using MetaMask browser extension";
    if (id === "coinbaseWallet") return "Coinbase Wallet — mobile or extension";
    if (id === "walletConnect") return "Scan with any WalletConnect-compatible wallet";
    if (id === "injected") return "Use your browser's built-in wallet";
    return "Connect your wallet";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0A1628] border border-[#D4AF37]/20 text-white max-w-sm w-full p-0 gap-0 rounded-2xl overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-[#D4AF37]/10">
          <DialogTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <Wallet className="h-5 w-5 text-[#D4AF37]" />
            Connect Wallet
          </DialogTitle>
          <DialogDescription className="text-white/50 text-sm mt-1">
            Select a wallet to connect to Arbitrum Sepolia
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 py-4 space-y-2">
          {displayConnectors.map((connector) => {
            const label = getConnectorLabel(connector.id, connector.name);
            const description = getConnectorDescription(connector.id);
            const isConnecting = isPending && variables?.connector === connector;

            return (
              <button
                key={connector.id}
                onClick={() => connect({ connector })}
                disabled={isPending}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border border-[#D4AF37]/10 hover:border-[#D4AF37]/30 hover:bg-[#D4AF37]/5 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed group text-left"
              >
                <WalletIcon name={label} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white group-hover:text-[#D4AF37] transition-colors truncate">
                    {label}
                  </p>
                  <p className="text-xs text-white/40 truncate mt-0.5">{description}</p>
                </div>
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 text-[#D4AF37] animate-spin shrink-0" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-white/10 group-hover:bg-[#D4AF37]/50 transition-colors shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        <div className="px-6 pb-5 pt-1">
          <p className="text-[11px] text-white/25 text-center leading-relaxed">
            By connecting, you agree to interact with Arbitrum Sepolia testnet contracts.
            No real funds are at risk.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ConnectedWalletProps {
  address: string;
  chainName?: string;
  onDisconnect: () => void;
  compact?: boolean;
}

export function ConnectedWallet({ address, chainName, onDisconnect, compact = false }: ConnectedWalletProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0F1E35]/80 border border-[#D4AF37]/20">
          <div className="h-2 w-2 rounded-full bg-green-400 shrink-0" />
          <span className="text-xs font-mono text-white/70">
            {address.slice(0, 6)}…{address.slice(-4)}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDisconnect}
          className="h-8 w-8 text-white/40 hover:text-red-400 hover:bg-red-400/10"
          title="Disconnect"
        >
          <LogOut className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-xl bg-[#0F1E35]/50 border border-[#D4AF37]/10">
        <p className="text-xs text-white/40 mb-1.5 uppercase tracking-wider font-medium">Connected</p>
        <div className="flex items-center justify-between gap-2">
          <code className="text-xs font-mono text-white/80 break-all leading-relaxed">
            {address.slice(0, 10)}…{address.slice(-8)}
          </code>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="h-6 w-6 text-white/30 hover:text-[#D4AF37]"
              title="Copy address"
            >
              {copied ? <CheckCheck className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
            </Button>
            <a
              href={`https://sepolia.arbiscan.io/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="icon" className="h-6 w-6 text-white/30 hover:text-[#D4AF37]" title="View on Arbiscan">
                <ExternalLink className="h-3 w-3" />
              </Button>
            </a>
          </div>
        </div>
        {chainName && (
          <Badge className="mt-2 bg-green-500/15 text-green-400 border-green-500/25 text-[11px] font-medium">
            {chainName}
          </Badge>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onDisconnect}
        className="w-full border-[#D4AF37]/20 text-white/60 hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/5 h-9 text-xs transition-all"
      >
        <LogOut className="h-3 w-3 mr-2" />
        Disconnect
      </Button>
    </div>
  );
}

interface WalletButtonProps {
  className?: string;
  size?: "sm" | "default" | "lg";
  compact?: boolean;
}

export function WalletButton({ className = "", size = "default", compact = false }: WalletButtonProps) {
  const [open, setOpen] = useState(false);
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    if (compact) {
      return (
        <ConnectedWallet
          address={address}
          chainName={chain?.name}
          onDisconnect={() => disconnect()}
          compact
        />
      );
    }
    return (
      <ConnectedWallet
        address={address}
        chainName={chain?.name}
        onDisconnect={() => disconnect()}
      />
    );
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size={size}
        className={`bg-[#D4AF37] text-[#0A1628] hover:bg-[#D4AF37]/90 font-semibold shadow-lg shadow-[#D4AF37]/20 ${className}`}
      >
        <Wallet className="h-4 w-4 mr-2" />
        Connect Wallet
      </Button>
      <WalletModal open={open} onOpenChange={setOpen} />
    </>
  );
}
