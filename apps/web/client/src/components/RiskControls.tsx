import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

interface RiskControlsProps {
  maxSlippage: number;
  onSlippageChange: (value: number) => void;
  maxMoveBps: number;
  cooldownMinutes: number;
  onCooldownChange?: (value: number) => void;
}

export function RiskControls({
  maxSlippage,
  onSlippageChange,
  maxMoveBps,
  cooldownMinutes,
  onCooldownChange,
}: RiskControlsProps) {
  const [showWarning, setShowWarning] = useState(false);

  const handleSlippageChange = (value: number) => {
    onSlippageChange(value);
    setShowWarning(value > 5);
  };

  return (
    <Card className="border-[#D4AF37]/15 bg-[#0A1628]/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-white text-base">Risk Controls</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-[#D4AF37]/60 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="bg-[#0A1628] border-[#D4AF37]/20 text-white text-xs max-w-xs">
                Configure slippage tolerance and migration constraints. Higher slippage = higher execution risk.
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <CardDescription className="text-white/40 text-xs">
          On-chain enforced parameters for atomic migrations
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Max Slippage */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-white text-sm font-medium">Max Slippage</Label>
            <div className="text-right">
              <span className="text-lg font-bold text-[#D4AF37]">{maxSlippage.toFixed(2)}%</span>
              <span className="text-[10px] text-white/40 ml-1 font-mono">({(maxSlippage * 100).toFixed(0)} bps)</span>
            </div>
          </div>
          <Slider
            value={[maxSlippage]}
            onValueChange={(val) => handleSlippageChange(val[0])}
            min={0.01}
            max={10}
            step={0.01}
            className="w-full"
          />
          <div className="flex items-start gap-2 text-xs text-white/50">
            <span className="text-[#D4AF37] mt-0.5">→</span>
            <span>
              Maximum acceptable price movement during swap. Lower = safer but may fail if market moves. Recommended: 0.5% - 2%
            </span>
          </div>
          {showWarning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span className="text-xs text-amber-300">High slippage tolerance increases execution risk and MEV exposure.</span>
            </motion.div>
          )}
        </motion.div>

        {/* Max Move BPS */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-white text-sm font-medium">Max Move (On-Chain)</Label>
            <div className="text-right">
              <span className="text-lg font-bold text-white/70">{(maxMoveBps / 100).toFixed(2)}%</span>
              <span className="text-[10px] text-white/40 ml-1 font-mono">{maxMoveBps} bps</span>
            </div>
          </div>
          <div className="w-full h-2 rounded-full bg-[#D4AF37]/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] transition-all"
              style={{ width: `${Math.min((maxMoveBps / 500) * 100, 100)}%` }}
            />
          </div>
          <div className="flex items-start gap-2 text-xs text-white/50">
            <span className="text-[#D4AF37] mt-0.5">→</span>
            <span>
              Protocol-enforced limit on tick range movement. Set by governance. Current: {maxMoveBps} bps ({(maxMoveBps / 100).toFixed(2)}%)
            </span>
          </div>
        </motion.div>

        {/* Cooldown Period */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-white text-sm font-medium">Cooldown Period</Label>
            <div className="text-right">
              <span className="text-lg font-bold text-white/70">{cooldownMinutes}m</span>
              <span className="text-[10px] text-white/40 ml-1 font-mono">{cooldownMinutes * 60}s</span>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-[#D4AF37]/5 border border-[#D4AF37]/15">
            <p className="text-xs text-white/60">
              Minimum time between migrations for the same position. Prevents rapid-fire execution and flash loan attacks.
            </p>
          </div>
        </motion.div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-3 rounded-lg bg-green-500/5 border border-green-500/20"
        >
          <p className="text-xs text-green-400 font-medium mb-1">✓ All parameters are on-chain enforced</p>
          <p className="text-[10px] text-white/40">
            These settings are verified at contract execution time. Transactions that violate these constraints will revert on-chain.
          </p>
        </motion.div>
      </CardContent>
    </Card>
  );
}
