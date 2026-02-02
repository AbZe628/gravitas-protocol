import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowRight, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function Migrate() {
  const { isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [v2Form, setV2Form] = useState({
    pairAddress: "",
    lpAmount: "",
    routerTo: "",
  });
  const [v3Form, setV3Form] = useState({
    tokenId: "",
    poolAddress: "",
    amount0: "",
    amount1: "",
  });

  const handleV2Migrate = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet");
      return;
    }
    setIsLoading(true);
    // Simulate transaction
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Migration successful!");
    }, 2000);
  };

  const handleV3Migrate = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet");
      return;
    }
    setIsLoading(true);
    // Simulate transaction
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Migration successful!");
    }, 2000);
  };

  const estimatedGas = "0.0024 ETH (~$4.50)";

  return (
    <div className="space-y-6">
      {!isConnected && (
        <Alert className="border-[#D4AF37]/30 bg-[#0F1E35]/50">
          <AlertCircle className="h-4 w-4 text-[#D4AF37]" />
          <AlertDescription className="text-white/70">
            Connect your wallet to start migrating liquidity positions
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Migrate Liquidity</CardTitle>
          <CardDescription className="text-white/70">
            Atomically migrate your Uniswap positions with Shariah compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="v2" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-[#0A1628]/50">
              <TabsTrigger
                value="v2"
                className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0A1628]"
              >
                Uniswap V2
              </TabsTrigger>
              <TabsTrigger
                value="v3"
                className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0A1628]"
              >
                Uniswap V3
              </TabsTrigger>
            </TabsList>

            <TabsContent value="v2" className="space-y-4 mt-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="pairAddress" className="text-white">
                    Pair Address
                  </Label>
                  <Input
                    id="pairAddress"
                    placeholder="0x..."
                    value={v2Form.pairAddress}
                    onChange={(e) => setV2Form({ ...v2Form, pairAddress: e.target.value })}
                    className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white"
                    disabled={!isConnected}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lpAmount" className="text-white">
                    LP Token Amount
                  </Label>
                  <Input
                    id="lpAmount"
                    type="number"
                    placeholder="0.0"
                    value={v2Form.lpAmount}
                    onChange={(e) => setV2Form({ ...v2Form, lpAmount: e.target.value })}
                    className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white"
                    disabled={!isConnected}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="routerTo" className="text-white">
                    Destination Router
                  </Label>
                  <Input
                    id="routerTo"
                    placeholder="0x..."
                    value={v2Form.routerTo}
                    onChange={(e) => setV2Form({ ...v2Form, routerTo: e.target.value })}
                    className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white"
                    disabled={!isConnected}
                  />
                </div>

                <div className="p-4 rounded-lg bg-[#0A1628]/50 border border-[#D4AF37]/20">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-white/70">Estimated Gas</span>
                    <span className="text-sm font-medium text-white">{estimatedGas}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/70">Slippage Tolerance</span>
                    <Badge className="bg-[#D4AF37]/20 text-[#D4AF37]">0.5%</Badge>
                  </div>
                </div>

                <Button
                  onClick={handleV2Migrate}
                  disabled={!isConnected || isLoading}
                  className="w-full bg-[#D4AF37] text-[#0A1628] hover:bg-[#D4AF37]/90"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Migrating...
                    </>
                  ) : (
                    <>
                      Migrate V2 Position
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </motion.div>
            </TabsContent>

            <TabsContent value="v3" className="space-y-4 mt-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="tokenId" className="text-white">
                    Position Token ID
                  </Label>
                  <Input
                    id="tokenId"
                    type="number"
                    placeholder="12345"
                    value={v3Form.tokenId}
                    onChange={(e) => setV3Form({ ...v3Form, tokenId: e.target.value })}
                    className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white"
                    disabled={!isConnected}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="poolAddress" className="text-white">
                    Pool Address
                  </Label>
                  <Input
                    id="poolAddress"
                    placeholder="0x..."
                    value={v3Form.poolAddress}
                    onChange={(e) => setV3Form({ ...v3Form, poolAddress: e.target.value })}
                    className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white"
                    disabled={!isConnected}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount0" className="text-white">
                      Token0 Amount
                    </Label>
                    <Input
                      id="amount0"
                      type="number"
                      placeholder="0.0"
                      value={v3Form.amount0}
                      onChange={(e) => setV3Form({ ...v3Form, amount0: e.target.value })}
                      className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white"
                      disabled={!isConnected}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount1" className="text-white">
                      Token1 Amount
                    </Label>
                    <Input
                      id="amount1"
                      type="number"
                      placeholder="0.0"
                      value={v3Form.amount1}
                      onChange={(e) => setV3Form({ ...v3Form, amount1: e.target.value })}
                      className="bg-[#0A1628]/50 border-[#D4AF37]/20 text-white"
                      disabled={!isConnected}
                    />
                  </div>
                </div>

                <Alert className="border-[#D4AF37]/30 bg-[#0A1628]/30">
                  <CheckCircle2 className="h-4 w-4 text-[#D4AF37]" />
                  <AlertDescription className="text-white/70">
                    EIP-712 signature required for V3 migrations
                  </AlertDescription>
                </Alert>

                <div className="p-4 rounded-lg bg-[#0A1628]/50 border border-[#D4AF37]/20">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-white/70">Estimated Gas</span>
                    <span className="text-sm font-medium text-white">{estimatedGas}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/70">Max Price Movement</span>
                    <Badge className="bg-[#D4AF37]/20 text-[#D4AF37]">5%</Badge>
                  </div>
                </div>

                <Button
                  onClick={handleV3Migrate}
                  disabled={!isConnected || isLoading}
                  className="w-full bg-[#D4AF37] text-[#0A1628] hover:bg-[#D4AF37]/90"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Migrating...
                    </>
                  ) : (
                    <>
                      Sign & Migrate V3 Position
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </motion.div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">How to Migrate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-white/70">
          <div className="flex gap-3">
            <Badge className="bg-[#D4AF37] text-[#0A1628] h-6 w-6 rounded-full flex items-center justify-center">
              1
            </Badge>
            <p>Enter your Uniswap position details (pair address or token ID)</p>
          </div>
          <div className="flex gap-3">
            <Badge className="bg-[#D4AF37] text-[#0A1628] h-6 w-6 rounded-full flex items-center justify-center">
              2
            </Badge>
            <p>Review gas estimate and slippage tolerance</p>
          </div>
          <div className="flex gap-3">
            <Badge className="bg-[#D4AF37] text-[#0A1628] h-6 w-6 rounded-full flex items-center justify-center">
              3
            </Badge>
            <p>Sign the transaction (EIP-712 signature for V3)</p>
          </div>
          <div className="flex gap-3">
            <Badge className="bg-[#D4AF37] text-[#0A1628] h-6 w-6 rounded-full flex items-center justify-center">
              4
            </Badge>
            <p>Wait for atomic execution and check History tab for confirmation</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
