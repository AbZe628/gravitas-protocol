import { useEffect, useState } from 'react';
import { oversight, type Carrying as Carrying_ } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';

/**
 * What these terms will do once the board has ruled.
 *
 * A scholar sets a threshold and knows exactly what it means in fiqh. What
 * almost nobody arriving from a classical board has been told is **when it gets
 * checked** — and that is the difference between the fatwa they have written a
 * hundred times and the one they are writing here.
 *
 * A condition in an ordinary fatwa is checked when somebody looks: next
 * meeting, next quarter, at the audit. A condition attached to an enforcing
 * registry is read before every transaction that depends on it, and the
 * transaction that would breach it does not execute. There is no interval to
 * drift in.
 *
 * That changes what the board is doing when it sets a number, so it is put in
 * front of them on the matter itself rather than left in documentation nobody
 * opens.
 *
 * ── it is not the assistant, and that is deliberate ───────────────────────
 *
 * Nothing on this panel is generated. It comes from the matter's own terms and
 * the enforcement adapter's own snapshot, so it is right, it is the same every
 * time, and it works in the installations that have no assistant — which is
 * most of them. A certainty routed through a language model would read like an
 * opinion and could be got wrong.
 *
 * ── and the honest case gets the same room ────────────────────────────────
 *
 * Where nothing is attached the panel does not shrink to a warning. It says
 * what actually holds: the institution carries this out with what it already
 * uses, Majlis cannot see whether it does, and the interval between checks is
 * therefore real and is the board's to rule about. That is the ordinary
 * installation, not a degraded one, and it is presented as such.
 */

export default function Carrying({ matterId }: { matterId: string }) {
  const { t } = useI18n();
  const [carrying, setCarrying] = useState<Carrying_ | null>(null);

  useEffect(() => {
    let live = true;
    oversight
      .carrying(matterId)
      /*
       * The shape is checked, not assumed.
       *
       * A 200 carrying something else — a proxy's error page, an older server,
       * a route that moved — used to take the whole matter page down with a
       * read of `undefined.length`. This panel is an explanation of the matter
       * below it, and an explanation that can destroy the thing it explains is
       * worse than no explanation. Found by the governance tests, which stub
       * one response for every request.
       */
      .then((c) => live && Array.isArray(c?.terms) && Array.isArray(c?.limits) && setCarrying(c))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [matterId]);

  if (!carrying) return null;

  return (
    <div className="mb-6 rounded-card shadow-ring bg-raised px-4 py-3.5">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">{t('carry.title')}</span>
        {/*
          The distinction, as a badge, because it is the one thing on this panel
          a scholar should carry away even if they read nothing else.
        */}
        <span
          className={
            'rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] ' +
            (carrying.attached
              ? 'bg-[#EBF3EF] text-settled shadow-[0_0_0_0.5px_rgba(44,107,87,0.18)]'
              : 'bg-black/[0.045] text-sand')
          }
        >
          {t(`carry.cadence.${carrying.cadence}`)}
        </span>
      </div>

      {/* The sentence itself, at reading size rather than as a caption. */}
      <p className="max-w-prose text-[13.5px] leading-relaxed">{carrying.whenChecked}</p>

      <p className="mt-2.5 max-w-prose border-s-2 border-line ps-3 text-[12.5px] leading-relaxed text-muted">
        {carrying.drift}
      </p>

      {carrying.terms.length > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
            {t('carry.terms')}
          </div>
          <ul className="space-y-2">
            {carrying.terms.map((term) => (
              <li key={term.key} className="rounded-xl shadow-ring px-3 py-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono text-[12.5px]">{term.key}</span>
                  <span className="font-mono text-[13px] tabular-nums text-goldsoft">
                    {term.value}
                    {term.unit && <span className="ms-1 text-[11.5px] text-muted">{term.unit}</span>}
                  </span>
                </div>
                {/* The board's own words. Never rewritten on the way through. */}
                <p className="mt-1 text-[12px] leading-relaxed text-muted">{term.meaning}</p>
                {term.onBreach && (
                  <p className="mt-1.5 text-[12px] leading-relaxed text-warn">
                    {t('carry.onBreach')} {term.onBreach}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/*
        What Majlis cannot see, named in place. A panel that explained the
        mechanism and left out its own blind spots would be the more impressive
        and the less honest of the two.
      */}
      <div className="mt-4 border-t border-line pt-3">
        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
          {t('carry.limits')}
        </div>
        <ul className="space-y-1.5">
          {carrying.limits.map((limit, i) => (
            <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-muted">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted" />
              <span>{limit}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
