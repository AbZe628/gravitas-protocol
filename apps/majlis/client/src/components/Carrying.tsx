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
    <div className="mb-6 rounded-sheet bg-raised/75 px-6 py-5 shadow-ring">
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-label font-bold uppercase tracking-caps text-muted">{t('carry.title')}</span>
        {/*
          The distinction, as a badge, because it is the one thing on this panel
          a scholar should carry away even if they read nothing else.
        */}
        <span
          className={
            'rounded-full px-2.5 py-0.5 text-label font-bold uppercase tracking-label ' +
            (carrying.attached
              ? 'bg-settledtint text-settled shadow-ringsettled'
              : 'bg-black/[0.045] text-sand')
          }
        >
          {t(`carry.cadence.${carrying.cadence}`)}
        </span>
      </div>

      {/* The sentence itself, at reading size rather than as a caption. */}
      <p className="max-w-[62ch] text-body leading-loose text-sand">{carrying.whenChecked}</p>

      <p className="mt-3 max-w-[62ch] border-s-2 border-line ps-4 text-ui leading-relaxed text-muted">
        {carrying.drift}
      </p>

      {/*
        Holding by holding, where a chain is attached.

        The sentences above answer for the installation, and for a bank that
        holds both kinds that is only half true: a ruling over a conventional
        holding is carried out by people exactly as it would be with no chain
        anywhere. This is the part the handbook asks for and the part that was
        wrong — one ruling, two ways of carrying it out, said in one place.

        Absent where nothing is attached. There is then nothing to distinguish,
        and a line saying so on every ruling would make the ordinary
        installation look like a reduced one.
      */}
      {carrying.carriedOut?.attached && !carrying.carriedOut.namesNoHolding && (
        <div className="mt-4 rounded-card bg-ink px-5 py-4">
          <p className="max-w-[62ch] text-ui leading-relaxed text-paper">
            {carrying.carriedInAWord}
          </p>

          <div className="mt-3 space-y-2.5">
            {[
              { held: carrying.carriedOut.byContract, how: 'carry.byContract' },
              { held: carrying.carriedOut.byPeople, how: 'carry.byPeople' },
            ]
              .filter((group) => group.held.length > 0)
              .map((group) => (
                <div key={group.how}>
                  <div className="mb-1 text-label font-bold uppercase tracking-caps text-muted">
                    {t(group.how)}
                  </div>
                  <ul className="space-y-1">
                    {group.held.map((h) => (
                      <li key={h.assetId} className="text-ui leading-snug text-sand">
                        {h.name}
                        {/*
                          Where the answer came from. "The board said so" and
                          "this has a contract address, so it is read as one"
                          are different answers, and a board that was never
                          asked should be able to see that it was never asked.
                        */}
                        <span className="ms-2 text-note text-muted">{t(`carry.basis.${h.basis}`)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </div>
      )}

      {carrying.terms.length > 0 && (
        <div className="mt-4">
          <div className="mb-2.5 text-label font-bold uppercase tracking-caps text-muted">
            {t('carry.terms')}
          </div>
          <ul className="space-y-2.5">
            {carrying.terms.map((term) => (
              <li key={term.key} className="flex items-center justify-between gap-6 rounded-xl bg-ink px-5 py-3.5">
                <div className="min-w-0">
                  {/*
                    The board's own words first, never rewritten on the way
                    through, and the identifier under them. This led with the
                    key — the same fault as the terms panel and the examination
                    finding: the software's name for a thing set above the
                    sentence the board actually wrote.
                  */}
                  <p className="text-body leading-snug text-paper">{term.meaning}</p>
                  <div className="mt-1 font-mono text-label text-muted opacity-70">{term.key}</div>
                  {term.onBreach && (
                    <p className="mt-1.5 text-note leading-snug text-gold">
                      {t('carry.onBreach')} {term.onBreach}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-end">
                  <div className="font-mono text-sub font-medium tabular-nums tracking-tight text-lapis">
                    {term.value}
                  </div>
                  {term.unit && <div className="mt-0.5 text-note text-muted">{term.unit}</div>}
                </div>
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
      <div className="mt-5 border-t border-line pt-4">
        <div className="mb-1.5 text-label font-bold uppercase tracking-caps text-muted">
          {t('carry.limits')}
        </div>
        <ul className="space-y-1.5">
          {carrying.limits.map((limit, i) => (
            <li key={i} className="flex items-baseline gap-3 text-ui leading-relaxed text-muted">
              <span className="relative top-[-5px] h-px w-3.5 shrink-0 bg-line" />
              <span>{limit}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
