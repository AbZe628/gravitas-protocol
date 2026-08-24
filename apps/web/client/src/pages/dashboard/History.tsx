import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { ExternalLink, CheckCheck, Copy, ArrowRight } from "lucide-react";
import { explorer, short, useProtocolState, type Migration } from "@/lib/protocolState";
import { CONTRACTS } from "@/lib/wagmi";

/**
 * Migrations that actually happened.
 *
 * This page used to render an array called `mockTransactions`: seven entries
 * with invented pairs, dollar amounts, gas costs, block numbers and transaction
 * hashes made of repeating hex. Clicking one led to an Arbiscan page that does
 * not exist. It was presented as history, under a heading that said history,
 * with no indication anywhere that none of it had happened.
 *
 * It now reads `LiquidityTeleported` from the deployed contract. The event
 * carries the transaction, the block, the owner, the position ids, the new fee
 * tier and whether a rebalancing swap ran — so those are the columns. There is
 * no pair name and no dollar value because the event does not carry them, and
 * inventing them is what this page is being fixed for.
 *
 * On a protocol that has not migrated anything, the honest rendering is an
 * empty one that says so.
 */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const FEE_LABEL: Record<number, string> = {
  100: "0.01%",
  500: "0.05%",
  3000: "0.3%",
  10000: "1%",
};

function Row({ migration }: { migration: Migration }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(migration.hash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <motion.div variants={itemVariants}>
      <Card className="border-gold/20 bg-surface/50 backdrop-blur">
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 py-4">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-white/40">Transaction</div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-white">{short(migration.hash)}</span>
              <button
                type="button"
                onClick={copy}
                aria-label="Copy the transaction hash"
                className="text-white/40 hover:text-white"
              >
                {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <a
                href={explorer.tx(migration.hash)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open on Arbiscan"
                className="text-white/40 hover:text-white"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wide text-white/40">Position</div>
            <div className="flex items-center gap-1.5 font-mono text-sm text-white tabular-nums">
              #{String(migration.oldTokenId)}
              <ArrowRight className="h-3 w-3 text-white/40" />#{String(migration.newTokenId)}
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wide text-white/40">New fee tier</div>
            <div className="text-sm text-white tabular-nums">
              {FEE_LABEL[migration.newFee] ?? `${migration.newFee}`}
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wide text-white/40">Block</div>
            <div className="font-mono text-sm text-white tabular-nums">{String(migration.blockNumber)}</div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wide text-white/40">Owner</div>
            <a
              href={explorer.address(migration.user)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm text-white hover:text-gold"
            >
              {short(migration.user)}
            </a>
          </div>

          {migration.swapExecuted && (
            <Badge variant="outline" className="border-gold/40 text-gold">
              Rebalancing swap
            </Badge>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function History() {
  const chain = useProtocolState();

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <Card className="border-gold/20 bg-surface/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Migrations</CardTitle>
          <CardDescription className="text-white/60">
            Read from the <span className="font-mono">LiquidityTeleported</span> events of the deployed
            TeleportV3, over the recent block window the public endpoint will serve. Nothing on this page
            is illustrative.
          </CardDescription>
        </CardHeader>
      </Card>

      {chain.loading && <p className="text-sm text-white/50">Reading the chain…</p>}

      {chain.unreachable && (
        <Card className="border-amber-500/30 bg-amber-500/[0.06]">
          <CardContent className="py-4 text-sm text-amber-200">
            The chain could not be reached, so this page has nothing to show. It is not reporting zero
            migrations — it does not know.
          </CardContent>
        </Card>
      )}

      {chain.migrations?.length === 0 && (
        <Card className="border-gold/20 bg-surface/50 backdrop-blur">
          <CardContent className="space-y-2 py-6">
            <div className="text-sm text-white">No migrations yet.</div>
            <p className="max-w-prose text-sm leading-relaxed text-white/60">
              The contracts were redeployed on 23 August 2026 and nothing has been migrated through them
              since. This is the real state of the protocol on Arbitrum Sepolia rather than an empty
              placeholder waiting for data.
            </p>
            <a
              href={explorer.address(CONTRACTS.TELEPORT_V3)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-gold hover:underline"
            >
              Check for yourself on Arbiscan
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </CardContent>
        </Card>
      )}

      {chain.migrations && chain.migrations.length > 0 && (
        <div className="space-y-3">
          {chain.migrations.map((m) => (
            <Row key={m.hash + String(m.oldTokenId)} migration={m} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
