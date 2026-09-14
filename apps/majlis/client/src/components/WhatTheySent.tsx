import { useState } from 'react';
import type { Checklist as ChecklistData, Matter } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';

/**
 * What arrived, what is being asked, and what you will need to answer it.
 *
 * ── the owner's description, which this is ────────────────────────────────
 *
 * > He enters the question, and on the side it tells him: this is what they
 * > sent, they are asking for this and this. The system recognises straight
 * > away, for that specific question, which toolkits to offer in the next
 * > steps. He reads it and says *I understand* — and step one opens.
 *
 * ── none of it is guessed ─────────────────────────────────────────────────
 *
 * Every line comes from the record:
 *
 *   what they sent      the documents attached to the matter
 *   what they ask       the institution's own words, never rewritten
 *   judged as           the contract shape the board is holding it against
 *   what you will need  the shape's conditions, and the calculators that
 *                       shape names — `structure.calculations`, which the
 *                       library has carried all along and no screen ever said
 *
 * That last one is the answer to *which toolkits for this question*, and it
 * needed no model: a sukuk question attracts the purification and late-payment
 * calculators because the sukuk shape says so, in the board's own library.
 *
 * ── where an assistant would help, and where it is not here ───────────────
 *
 * With one configured, the figures in the document are read out and arrive in
 * the calculators already filled, for a member to check rather than type. This
 * installation has none, and the panel says so in one line rather than leaving
 * a member to wonder why nothing was filled in. **It never pretends to have
 * read anything.**
 */

const TOOL_KEYS: Record<string, string> = {
  screening: 'calc.tab.screening',
  purification: 'calc.tab.purification',
  zakat: 'calc.tab.zakat',
  profit_distribution: 'calc.tab.profit_distribution',
  late_payment: 'calc.tab.late_payment',
  tradability: 'calc.tab.tradability',
};

export default function WhatTheySent({
  matter,
  list,
  assistantOn,
  onStart,
}: {
  matter: Matter;
  list: ChecklistData | null;
  /** Whether this installation has a model configured at all. */
  assistantOn: boolean;
  onStart: () => void;
}) {
  const { t } = useI18n();
  const [read, setRead] = useState(false);

  const documents = (matter.sources ?? []).filter((s) => s.kind === 'document');
  const shape = list?.structure ?? null;
  const conditions = list?.conditions?.length ?? 0;
  const tools = shape?.calculations ?? [];

  if (read) return null;

  return (
    <section className="mb-7 rounded-sheet bg-raised p-6 shadow-card sm:p-7">
      <h2 className="mb-4 font-display text-[21px] font-normal leading-[1.16] tracking-[-0.02em]">
        {t('sent.title')}
      </h2>

      <dl className="space-y-4">
        {/* What arrived. */}
        <div>
          <dt className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            {t('sent.whatArrived')}
          </dt>
          <dd className="text-[13.5px] leading-[1.55] text-paper">
            {documents.length === 0 ? (
              <span className="text-muted">{t('sent.nothingAttached')}</span>
            ) : (
              <ul className="space-y-1">
                {documents.map((d, i) => (
                  <li key={i}>{d.label}</li>
                ))}
              </ul>
            )}
          </dd>
        </div>

        {/* What they are asking, in their words. */}
        <div>
          <dt className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            {t('sent.whatTheyAsk')}
          </dt>
          <dd className="max-w-[62ch] font-display text-[15px] leading-[1.55] text-paper">
            {matter.proposal}
          </dd>
        </div>

        {/* What it is being held against. */}
        {shape && (
          <div>
            <dt className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
              {t('sent.judgedAs')}
            </dt>
            <dd className="text-[13.5px] leading-[1.55] text-paper">{shape.name}</dd>
          </div>
        )}

        {/*
          What the work will be, before it starts.

          The number of conditions and the calculators this shape attracts. A
          member should know what they are being asked to do before they are
          three steps into doing it.
        */}
        <div>
          <dt className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            {t('sent.youWillNeed')}
          </dt>
          <dd className="text-[13.5px] leading-[1.55] text-paper">
            <div>
              <span className="font-mono tabular-nums">{conditions}</span> {t('sent.conditions')}
            </div>
            {tools.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {tools.map((kind) => (
                  <span
                    key={kind}
                    className="rounded-full bg-ink px-3 py-1 text-[12px] text-sand shadow-ring"
                  >
                    {t(TOOL_KEYS[kind] ?? kind)}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-2 max-w-[58ch] text-[12px] leading-[1.6] text-muted">
              {t(tools.length > 0 ? 'sent.toolsNote' : 'sent.noToolsNote')}
            </p>
          </dd>
        </div>
      </dl>

      {/*
        Whether the figures arrive filled in, said before the member meets an
        empty calculator and wonders why.
      */}
      <p className="mt-5 max-w-[60ch] border-t border-line pt-4 text-[12.5px] leading-[1.6] text-muted">
        {t(assistantOn ? 'sent.willFill' : 'sent.willNotFill')}
      </p>

      <button
        type="button"
        onClick={() => {
          setRead(true);
          onStart();
        }}
        className="mt-4 rounded-card bg-lapis px-6 py-3 text-[14px] font-bold text-white shadow-act"
      >
        {t('sent.understood')}
      </button>
    </section>
  );
}
