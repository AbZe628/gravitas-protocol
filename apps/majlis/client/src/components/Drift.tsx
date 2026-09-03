import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { oversight, type Drift, type DriftReport } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Tag } from './ui.js';

/**
 * What has moved under a ruling.
 *
 * The board decided on a composition. The composition changed. Nobody acted and
 * nobody was told, and today that is found at the audit. This is the only panel
 * in the application reporting something nobody asked it to look for.
 *
 * ── how it is allowed to say it ───────────────────────────────────────────
 *
 * **The question comes from the server, verbatim.** It is not assembled here
 * from parts, because an interface that composed the sentence could soften it
 * into a conclusion or sharpen it into one, and the same words have to travel
 * with the figures wherever they go.
 *
 * **Both figures, always.** What the board set and what the holding now reads,
 * beside each other. A single number would be an assertion; two numbers and a
 * date are something a scholar can check.
 *
 * **It offers to raise the question, and does not raise it.** The control leads
 * to the holding, where putting it to the board is already one click. Nothing
 * here writes.
 *
 * And the unwatched terms are on the panel rather than behind it. A threshold
 * nothing is checking is how the drift above it goes unnoticed in the first
 * place, so hiding it under a disclosure would be hiding the cause.
 */

function Row({ drift }: { drift: Drift }) {
  const { t } = useI18n();

  return (
    <li>
      <Link to={`/register/${drift.assetId}`} className="block">
        <div className="rounded-lg border border-warn/50 bg-warn/[0.05] px-4 py-3 transition-colors hover:border-warn/70">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Tag tone="warn">{t(`drift.${drift.term.bound}`)}</Tag>
            {/*
              What the board set, and what it now reads. Two figures rather than
              one, because one would be an assertion.
            */}
            <span className="font-mono text-[12.5px] tabular-nums">
              <span className="text-warn">{drift.observed.percent}%</span>
              <span className="mx-1.5 text-muted">·</span>
              <span className="text-muted">
                {t('drift.against')} {(Number(drift.term.value) / 100).toFixed(2)}%
              </span>
            </span>
          </div>

          <div className="text-[14px] font-medium leading-snug">{drift.assetName}</div>

          {/* The server's own words. Not reassembled here. */}
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{drift.questionForBoard}</p>
        </div>
      </Link>
    </li>
  );
}

/** For the dashboard: everything that has moved, across the register. */
export default function DriftPanel() {
  const { t } = useI18n();
  const [data, setData] = useState<DriftReport | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    oversight
      .drift()
      .then((d) => {
        // A response that is not the shape this expects is treated as nothing
        // to report. A panel is not worth taking the dashboard down for.
        if (!d || !Array.isArray(d.drifting)) {
          setFailed(true);
          return;
        }
        setData(d);
      })
      .catch(() => setFailed(true));
  }, []);

  if (failed || !data) return null;

  const nothing = data.drifting.length === 0 && data.unwatched.length === 0 && data.unmeasured.length === 0;
  if (nothing) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-[15px] font-semibold">{t('drift.title')}</h2>

      {data.drifting.length > 0 && (
        <ul className="mb-3 space-y-2">
          {data.drifting.map((d) => (
            <Row key={`${d.assetId}-${d.term.key}`} drift={d} />
          ))}
        </ul>
      )}

      {/*
        On the panel, not behind it. A threshold nothing checks is how a
        crossing goes unnoticed, so hiding the cause under a disclosure would
        defeat the panel above it.
      */}
      {(data.unwatched.length > 0 || data.unmeasured.length > 0) && (
        <div className="rounded-lg border border-line px-4 py-3">
          <div className="mb-2 text-[11px] uppercase tracking-wider text-muted">
            {t('drift.notChecked')}
          </div>
          <ul className="space-y-2">
            {data.unwatched.map((u, i) => (
              <li key={`u${i}`} className="text-[12.5px] leading-relaxed text-muted">
                <Link to={`/register/${u.assetId}`} className="underline underline-offset-2 hover:text-fg">
                  <span className="font-mono text-[11.5px]">{u.key}</span>
                </Link>
                <span className="mx-1.5 opacity-40">·</span>
                {u.reason}
              </li>
            ))}
            {data.unmeasured.map((u, i) => (
              <li key={`m${i}`} className="text-[12.5px] leading-relaxed text-muted">
                <Link to={`/register/${u.assetId}`} className="underline underline-offset-2 hover:text-fg">
                  {u.assetName}
                </Link>
                <span className="mx-1.5 opacity-40">·</span>
                {u.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/**
 * For one holding: what has moved on this one.
 *
 * Sits above the composition it concerns, so a reader looking at 50.00% sees
 * immediately that the board set 51.00% rather than working it out from two
 * places on the page.
 */
export function DriftForAsset({ assetId }: { assetId: string }) {
  const { t } = useI18n();
  const [drifting, setDrifting] = useState<Drift[] | null>(null);

  useEffect(() => {
    oversight
      .drift()
      .then((d) => {
        if (!d || !Array.isArray(d.drifting)) return;
        setDrifting(d.drifting.filter((x) => x.assetId === assetId));
      })
      .catch(() => undefined);
  }, [assetId]);

  if (!drifting || drifting.length === 0) return null;

  return (
    <div className="mb-6 rounded-lg border border-warn/60 bg-warn/[0.06] px-4 py-3.5">
      <div className="mb-2 text-[13px] font-semibold text-warn">{t('drift.onThisHolding')}</div>
      <ul className="space-y-2.5">
        {drifting.map((d) => (
          <li key={d.term.key} className="text-[12.5px] leading-relaxed">
            <p className="text-muted">{d.questionForBoard}</p>
            <p className="mt-1 text-[12px] text-muted">
              <Link
                to={`/matters/${d.matterId}`}
                className="font-mono underline underline-offset-2 hover:text-fg"
              >
                {d.matterId}
              </Link>
              <span className="mx-1.5 opacity-40">·</span>
              {d.term.meaning}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
