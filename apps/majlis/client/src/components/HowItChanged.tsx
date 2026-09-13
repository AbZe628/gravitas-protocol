import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { oversight, type AdoptedStructure } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { DateText } from './ui.js';

/**
 * Every time this board changed its mind about a contract shape.
 *
 * ── what the handbook promised, and what was there ────────────────────────
 *
 * The library is supposed to show the nineteen shapes, their conditions, and
 * **this board's amendments with their history**. The last part was a route
 * that worked and a screen that never asked, so a shape showed what the board
 * holds today and nothing about how it got there. A board that adopted a shape
 * in 2025, amended it in 2026 and declined part of it later read as a board
 * that had always thought this.
 *
 * ── the current standing is not repeated here ─────────────────────────────
 *
 * What the board holds now is at the top of the page. This is what came
 * before it, oldest last, each entry naming the decision it was made under.
 * A version that is still in force is not listed twice.
 */

export default function HowItChanged({ structureId }: { structureId: string }) {
  const { t } = useI18n();
  const [history, setHistory] = useState<
    { adoption: AdoptedStructure; replacedBy: string | null }[] | null
  >(null);

  useEffect(() => {
    let live = true;
    oversight
      .adoptionHistory(structureId)
      .then((r) => live && Array.isArray(r?.history) && setHistory(r.history))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [structureId]);

  /* Nothing before what stands is not a gap: most shapes were decided once. */
  const earlier = (history ?? []).filter((h) => h.replacedBy !== null);
  if (earlier.length === 0) return null;

  return (
    <section className="mt-8 border-t border-line pt-6">
      <h2 className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {t('adopt.howItChanged')}
      </h2>
      <p className="mb-4 max-w-[62ch] text-[12.5px] leading-[1.6] text-muted">
        {t('adopt.howItChangedLead')}
      </p>

      <ol className="space-y-3">
        {earlier.map(({ adoption }) => (
          <li key={adoption.id} className="rounded-card bg-raised px-5 py-4 shadow-ring">
            <div className="mb-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[12px] text-muted">
              <span className="text-[10px] font-bold uppercase tracking-[0.13em]">
                {t(`adopt.${adoption.standing}`)}
              </span>
              <DateText iso={adoption.decidedAt} />
              <span>{adoption.decidedBy}</span>
            </div>

            {/* The board's own words for what it changed, where it said. */}
            {adoption.amendments.length > 0 && (
              <ul className="space-y-1.5 border-s-2 border-gold/50 ps-4">
                {adoption.amendments.map((a, i) => (
                  <li key={i} className="font-display text-[14.5px] leading-[1.55] text-paper">
                    {a}
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-2 text-[11.5px] text-muted">
              {t('adopt.under')}{' '}
              <Link
                to={`/matters/${adoption.matterId}`}
                className="font-mono underline underline-offset-2 hover:text-paper"
              >
                {adoption.matterId}
              </Link>
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
