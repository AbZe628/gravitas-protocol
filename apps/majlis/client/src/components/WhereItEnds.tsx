import { useEffect, useState } from 'react';
import { api, oversight, type EnforcementSnapshot, type Matter } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { DocumentLink } from './Documents.js';

/**
 * What this board's ruling becomes.
 *
 * Majlis serves two worlds and always has. A Shariah board inside a
 * conventional bank rules on products with no chain anywhere near it; a board
 * supervising an on-chain policy registry rules on terms a contract reads. The
 * model has carried both since `services/enforcement.ts` was written —
 * enforcement is an adapter and its default is nothing, and a bank that leaves
 * it off is running the ordinary installation rather than a degraded one.
 *
 * What was missing is that a board could not see which of the two it was in.
 * The application knew; it never said. So a scholar closing a vote had no
 * answer to the question that actually matters to them at that moment: *what
 * happens now, and is there anything left for me to do?*
 *
 * The two answers are genuinely different, and neither is a lesser version of
 * the other.
 *
 * **Nothing attached.** The ruling is a document. It is assembled from the
 * record — the question, the terms, who voted and why, the dissent — and
 * somebody sends it. Majlis does not send it, and says so, because a board
 * that assumed the bank had been told would be assuming the one thing this
 * application cannot do.
 *
 * **A registry attached.** The terms are read before every transaction that
 * depends on them, and a transaction that would breach one does not execute.
 * There is nothing to send and no interval to drift in. The document still
 * exists, because a chain is not a record a person can read, but it is the
 * account of the decision rather than the instrument of it.
 */

const SETTLED = ['in_force', 'timelock', 'rejected', 'lapsed', 'withdrawn'];

export default function WhereItEnds({ matter }: { matter: Matter }) {
  const { t } = useI18n();
  const [enforcement, setEnforcement] = useState<EnforcementSnapshot | null>(null);

  useEffect(() => {
    let live = true;
    api
      .enforcement()
      .then((e) => live && e && typeof e.kind === 'string' && setEnforcement(e))
      // Not knowing is a state: the panel says nothing rather than guessing at
      // which world this board is in, which is the one thing it must not do.
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  // Only once there is a decision to end anywhere.
  if (!SETTLED.includes(matter.status) || !enforcement) return null;

  const onChain = enforcement.kind === 'gravitas-registry' && enforcement.configured;

  return (
    <div className="mb-7 rounded-sheet bg-raised px-6 py-5 shadow-card">
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
          {t('ends.title')}
        </span>
        <span
          className={
            'rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] ' +
            (onChain
              ? 'bg-[#EBF3EF] text-settled shadow-[0_0_0_0.5px_rgba(44,107,87,0.18)]'
              : 'bg-black/[0.045] text-sand')
          }
        >
          {t(onChain ? 'ends.enforced' : 'ends.document')}
        </span>
      </div>

      <p className="max-w-[62ch] font-display text-[17px] leading-[1.55]">
        {t(onChain ? 'ends.enforcedWhat' : 'ends.documentWhat')}
      </p>

      <p className="mt-3 max-w-[62ch] text-[12.5px] leading-[1.6] text-muted">
        {t(onChain ? 'ends.enforcedNote' : 'ends.documentNote')}
      </p>

      {/*
        Where the terms are read, when they are. The address rather than a
        reassurance: a board told "it is enforced" and given nothing to check
        has been asked to take the application's word for it.
      */}
      {onChain && enforcement.address && (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-card bg-ink px-4 py-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
            {t('ends.readAt')}
          </span>
          <span className="break-all font-mono text-[11.5px] text-lapis">{enforcement.address}</span>
          {enforcement.reachable === false && (
            <span className="text-[11.5px] text-breach">{t('ends.unreachable')}</span>
          )}
        </div>
      )}

      <div className="mt-5 space-y-2.5">
        <DocumentLink
          emphasis={!onChain}
          href={oversight.hrefs.fatwa(matter.id)}
          label={t('doc.fatwa')}
          note={t(onChain ? 'ends.documentIsRecord' : 'doc.fatwaNote')}
        />

        {/*
          The draft is offered only where the matter was judged against a
          contract shape. The route refuses otherwise, and a link that leads to
          a refusal is a link that lied — the rule the whole application follows
          for a control the installation cannot honour.
        */}
        {matter.structureId && (
          <DocumentLink
            href={oversight.hrefs.contract(matter.id)}
            label={t('doc.contract')}
            note={t('doc.contractNote')}
          />
        )}
      </div>
    </div>
  );
}
