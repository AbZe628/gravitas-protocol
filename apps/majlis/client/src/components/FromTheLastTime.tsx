import { useEffect, useState } from 'react';
import { oversight, type Computation } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';

/**
 * The figures this board used the last time it did this.
 *
 * ── why the register cannot help here, and this can ───────────────────────
 *
 * Tradability takes its composition straight from the register, because the
 * register holds exactly that. Screening, purification and zakat want money —
 * market capitalisation, interest-bearing debt, total revenue — and the
 * register holds none of it. It keeps compositions in basis points, not a
 * balance sheet, and pretending otherwise would put invented figures in front
 * of a board.
 *
 * What the board does have is every calculation it has already recorded, with
 * the figures it used. Most of a quarterly screening is the same as last
 * quarter's: the currency, the source document, the fields that did not move.
 * Retyping all of it to change two numbers is the work this removes, and it is
 * also where the errors come from.
 *
 * ── it fills, and it does not compute ─────────────────────────────────────
 *
 * Nothing is calculated here and no result is carried over. What comes across
 * is what the board itself entered, with the period it covered and the source
 * it named, so a scholar can see what they are inheriting and change what has
 * changed. A figure carried silently would be last quarter's answer wearing
 * this quarter's date.
 */
export default function FromTheLastTime({
  kind,
  onTake,
}: {
  /** Only calculations of the same kind: a zakat cannot seed a screening. */
  kind: string;
  onTake: (from: Computation) => void;
}) {
  const { t } = useI18n();
  const [past, setPast] = useState<Computation[] | null>(null);
  const [took, setTook] = useState<string | null>(null);

  useEffect(() => {
    oversight
      .computations({ kind })
      .then((r) => {
        const rows = Array.isArray(r?.history) ? r.history : [];
        setPast(
          rows
            .map((h) => h.computation)
            .filter((c): c is Computation => !!c && c.kind === kind)
            .sort((a, b) => (a.periodTo < b.periodTo ? 1 : -1))
            .slice(0, 3),
        );
      })
      // The panel is a shortcut. Losing it costs nothing the form cannot do.
      .catch(() => setPast(null));
  }, [kind]);

  if (!past || past.length === 0) return null;

  return (
    <section className="mb-6 rounded-card bg-raised px-4 py-4 shadow-ring">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {t('lasttime.title')}
      </div>
      <p className="mb-3 max-w-[62ch] text-[12.5px] leading-[1.6] text-muted">{t('lasttime.note')}</p>

      <ul className="flex flex-wrap gap-2">
        {past.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => {
                onTake(c);
                setTook(c.id);
              }}
              className={
                'rounded-xl px-3.5 py-2.5 text-start text-[13px] leading-snug transition-all ' +
                (took === c.id
                  ? 'bg-ink font-semibold text-paper shadow-card'
                  : 'bg-ink/60 text-sand shadow-ring hover:text-paper')
              }
            >
              {c.periodFrom} — {c.periodTo}
              <span className="mt-0.5 block text-[11px] font-normal text-muted">
                {c.source ? c.source.slice(0, 40) : t('lasttime.noSource')}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
