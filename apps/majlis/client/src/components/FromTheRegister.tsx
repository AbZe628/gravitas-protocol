import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { oversight, type AssetStanding, type Composition } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';

/**
 * Take the figures from what the board already holds.
 *
 * ── the fault this exists to end ──────────────────────────────────────────
 *
 * `TradabilityInput` wants `{ asOf, source, parts }`. The register holds, for
 * `asset-mixed-pool`, exactly `{ asOf, source, parts }` — the same three
 * fields, the same shape, already in the record:
 *
 *     asOf   2026-06-30
 *     source Pool net asset value breakdown (illustrative)
 *     parts  Leased equipment 31%, Leased property 19%,
 *            Trade receivables 33%, Cash 17%
 *
 * And the screen asked a scholar to type all of it in by hand, four rows of
 * basis points, a date and a provenance line. That is the whole of *"koje
 * podatke da stavi tamo, iz kojih dokumenata, neće valjda napamet pisati"*.
 *
 * A calculator that cannot see the register is not a feature of this
 * application; it is a pocket calculator sitting inside it.
 *
 * ── what it does ──────────────────────────────────────────────────────────
 *
 * Lists the holdings whose composition the board actually has, and fills the
 * form from the one that is chosen — figures, the date they were measured, and
 * the document they came from, which is the provenance the record needs and
 * which nobody would ever retype accurately.
 *
 * Holdings with no composition are listed too, and say so, because a scholar
 * looking for one needs to know it is absent rather than hidden. That is where
 * the board asks the institution for it, and the absence is where that
 * conversation starts.
 */
export default function FromTheRegister({
  onTake,
  chosenId,
}: {
  /** Fill the form. The provenance travels with the figures, never separately. */
  onTake: (from: { assetId: string; name: string; composition: Composition }) => void;
  chosenId?: string | null;
}) {
  const { t } = useI18n();
  const [assets, setAssets] = useState<AssetStanding[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    oversight
      .register()
      .then((r) => (Array.isArray(r?.assets) ? setAssets(r.assets) : setFailed(true)))
      .catch(() => setFailed(true));
  }, []);

  // The register failing takes this panel off the screen and leaves the form
  // usable by hand. It is a shortcut, not a gate.
  if (failed || !assets) return null;

  const withFigures = assets.filter((a) => a.asset.composition && !a.asset.retiredAt);
  const without = assets.filter((a) => !a.asset.composition && !a.asset.retiredAt);

  return (
    <section className="mb-6 rounded-card bg-raised px-4 py-4 shadow-ring">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {t('fromreg.title')}
      </div>
      <p className="mb-3 max-w-[62ch] text-[12.5px] leading-[1.6] text-muted">
        {t('fromreg.note')}
      </p>

      {withFigures.length === 0 ? (
        <p className="text-[12.5px] leading-[1.6] text-muted">{t('fromreg.noneHaveFigures')}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {withFigures.map((a) => {
            const c = a.asset.composition as Composition;
            const on = chosenId === a.asset.id;
            return (
              <li key={a.asset.id}>
                <button
                  type="button"
                  onClick={() => onTake({ assetId: a.asset.id, name: a.asset.name, composition: c })}
                  className={
                    'rounded-xl px-3.5 py-2.5 text-start text-[13px] leading-snug transition-all ' +
                    (on
                      ? 'bg-ink font-semibold text-paper shadow-card'
                      : 'bg-ink/60 text-sand shadow-ring hover:text-paper')
                  }
                >
                  {a.asset.name}
                  <span className="mt-0.5 block text-[11px] font-normal text-muted">
                    {c.parts.length} {t('fromreg.parts')}
                    <span className="mx-1.5 opacity-40">·</span>
                    {(c.asOf ?? '').slice(0, 10)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/*
        Named, not hidden. A scholar hunting for a holding that is not offered
        needs to know the board has no composition for it, because that is a
        thing to go and get rather than a thing the screen forgot.
      */}
      {without.length > 0 && (
        <p className="mt-3.5 border-t border-line pt-3 text-[12px] leading-[1.6] text-muted">
          {t('fromreg.withoutFigures')}{' '}
          {without.map((a, i) => (
            <span key={a.asset.id}>
              {i > 0 && <span className="opacity-40">, </span>}
              <Link to={`/register/${a.asset.id}`} className="underline underline-offset-2 hover:text-paper">
                {a.asset.name}
              </Link>
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
