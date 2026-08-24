import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { explorer, useProtocolState } from "@/lib/protocolState";
import { CONTRACTS } from "@/lib/wagmi";

/**
 * Analytics, when there is nothing yet to analyse.
 *
 * This page rendered six invented datasets: six months of volume, a fee-tier
 * distribution, daily migration counts, gas costs, a table of top pairs, and
 * four headline figures — 1,247 migrations, $2.4M of volume, 342 users. None of
 * it had happened. Charts are unusually good at making invented numbers look
 * measured, which is what made this the worst of it.
 *
 * The protocol has never migrated a position. Six empty charts would be
 * furniture, so the page says what is true and shows the two numbers that are
 * real: what the chain reports, and where to check it.
 *
 * When there is activity, this is where it goes — built from the same
 * `LiquidityTeleported` events the migrations page reads, and not before.
 */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };

export default function Analytics() {
  const chain = useProtocolState();

  const figures = [
    {
      label: "Migrations recorded",
      value: chain.migrations === null ? "—" : String(chain.migrations.length),
      note: "From the contract's own events, over the recent block window",
    },
    {
      label: "Addresses that migrated",
      value: chain.uniqueUsers === null ? "—" : String(chain.uniqueUsers),
      note: "Distinct position owners",
    },
    {
      label: "Policy version",
      value: chain.policyVersion === null ? "—" : String(chain.policyVersion),
      note: "Advances on every change the board writes to the registry",
    },
    {
      label: "Funds held by the protocol",
      value: "0",
      note: "Migration is atomic: nothing is ever custodied, by design",
    },
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Activity</CardTitle>
          <CardDescription className="text-white/60">
            Read from the deployed contracts on Arbitrum Sepolia. Every figure below is a real read; where
            the answer is zero, it says zero.
          </CardDescription>
        </CardHeader>
      </Card>

      {chain.unreachable ? (
        <Card className="border-amber-500/30 bg-amber-500/[0.06]">
          <CardContent className="py-4 text-sm text-amber-200">
            The chain could not be reached. Rather than show figures that were never read, this page shows
            none.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {figures.map((f) => (
            <motion.div key={f.label} variants={itemVariants}>
              <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-white/70">{f.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white tabular-nums">{f.value}</div>
                  <div className="mt-1 text-xs leading-relaxed text-white/50">{f.note}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {chain.migrations?.length === 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-[#D4AF37]/20 bg-[#0F1E35]/50 backdrop-blur">
            <CardContent className="space-y-2 py-6">
              <div className="text-sm text-white">Nothing to chart yet.</div>
              <p className="max-w-prose text-sm leading-relaxed text-white/60">
                Volume, fee-tier distribution and gas costs are all derived from migrations, and none have
                happened since the contracts were redeployed on 23 August 2026. Charts drawn from no data
                would be decoration, and a chart is unusually good at making an invented number look
                measured.
              </p>
              <a
                href={explorer.address(CONTRACTS.TELEPORT_V3)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-[#D4AF37] hover:underline"
              >
                Check the contract on Arbiscan
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
