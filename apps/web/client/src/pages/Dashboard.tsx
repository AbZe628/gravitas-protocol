import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { Wallet, ExternalLink, Copy, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CONTRACTS } from "@/lib/wagmi";

export default function Dashboard() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [copied, setCopied] = useState<string | null>(null);

  // Auto-switch to Arbitrum Sepolia if connected to wrong network
  useEffect(() => {
    if (isConnected && chain?.id !== arbitrumSepolia.id) {
      switchChain({ chainId: arbitrumSepolia.id });
    }
  }, [isConnected, chain, switchChain]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-heading font-bold text-xl">G</span>
            </div>
            <div>
              <h1 className="text-xl font-heading font-bold">Gravitas Protocol</h1>
              <p className="text-xs text-muted-foreground">Shariah-Compliant Liquidity Routing</p>
            </div>
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center gap-3">
            {isConnected ? (
              <>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium">{formatAddress(address!)}</span>
                </div>
                <Button onClick={() => disconnect()} variant="outline" size="sm">
                  Disconnect
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => connect({ connector: connectors[0] })}
                className="gap-2"
              >
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {!isConnected ? (
          <Card className="max-w-2xl mx-auto mt-12">
            <CardHeader>
              <CardTitle>Connect Your Wallet</CardTitle>
              <CardDescription>
                Connect your wallet to interact with the Gravitas Protocol smart contracts on Arbitrum Sepolia.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => connect({ connector: connectors[0] })}
                className="w-full gap-2"
                size="lg"
              >
                <Wallet className="h-5 w-5" />
                Connect MetaMask
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Network Status */}
            {chain?.id !== arbitrumSepolia.id && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive">Wrong Network</CardTitle>
                  <CardDescription>
                    Please switch to Arbitrum Sepolia to interact with the protocol.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => switchChain({ chainId: arbitrumSepolia.id })}
                    variant="destructive"
                  >
                    Switch to Arbitrum Sepolia
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Contract Addresses */}
            <Card>
              <CardHeader>
                <CardTitle>Contract Addresses</CardTitle>
                <CardDescription>Deployed on Arbitrum Sepolia</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">Policy Registry</p>
                    <p className="text-xs text-muted-foreground font-mono">{CONTRACTS.POLICY_REGISTRY}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(CONTRACTS.POLICY_REGISTRY, 'Policy Registry')}
                    >
                      {copied === 'Policy Registry' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      asChild
                    >
                      <a 
                        href={`https://sepolia.arbiscan.io/address/${CONTRACTS.POLICY_REGISTRY}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">Teleport V3</p>
                    <p className="text-xs text-muted-foreground font-mono">{CONTRACTS.TELEPORT_V3}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(CONTRACTS.TELEPORT_V3, 'Teleport V3')}
                    >
                      {copied === 'Teleport V3' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      asChild
                    >
                      <a 
                        href={`https://sepolia.arbiscan.io/address/${CONTRACTS.TELEPORT_V3}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contract Interactions */}
            <Tabs defaultValue="registry" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="registry">Policy Registry</TabsTrigger>
                <TabsTrigger value="v2">Teleport V2</TabsTrigger>
                <TabsTrigger value="v3">Teleport V3</TabsTrigger>
              </TabsList>

              <TabsContent value="registry" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Policy Registry</CardTitle>
                    <CardDescription>
                      View and manage Shariah compliance policies
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Read-only interface coming soon. See implementation guide in TODO.md.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="v2" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Teleport V2</CardTitle>
                    <CardDescription>
                      Migrate Uniswap V2 liquidity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Transaction interface coming soon. See implementation guide in TODO.md.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="v3" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Teleport V3</CardTitle>
                    <CardDescription>
                      Atomic Uniswap V3 position migration with EIP-712 signatures
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      EIP-712 signing interface coming soon. See implementation guide in TODO.md.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
}
