import { useEffect, useState } from 'react';
import { oversight } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Nothing } from './page.js';

/**
 * The committees a board keeps.
 *
 * Listed on the page that says who this board is, because that is what a
 * committee is: some of the people above it, with a remit the board wrote.
 *
 * ── keeping none is an answer ─────────────────────────────────────────────
 *
 * A board that reads everything in the room keeps no committees, and that is a
 * way of working rather than a gap. An empty list with nothing beside it reads
 * as a feature that failed to load, so the sentence is there instead — which
 * is the same rule the rest of this application follows.
 *
 * ── and nothing here forms one ────────────────────────────────────────────
 *
 * There is no *new committee* button. A committee is formed in a matter the
 * board settled, so it carries the decision it came from; one created from a
 * settings page would be a standing body brought into existence by whoever
 * had this screen open, which is the thing this whole application says cannot
 * happen.
 */

interface Held {
  committee: {
    id: string;
    name: string;
    remit: string;
    members: string[];
    convenor?: string;
    formedIn: string;
    formedAt: string;
    dissolvedAt?: string;
  };
  memberNames: string[];
  convenorName: string | null;
  summary: { waiting: number; reported: number; withdrawn: number; notUnanimous: number };
}

export default function TheCommittees() {
  const { t } = useI18n();
  const [held, setHeld] = useState<Held[] | null>(null);
  const [keepsNone, setKeepsNone] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    oversight
      .committees()
      .then((r) => {
        if (!r || !Array.isArray(r.committees)) {
          setFailed(true);
          return;
        }
        setHeld(r.committees);
        setKeepsNone(r.keepsNone);
      })
      .catch(() => setFailed(true));
  }, []);

  if (failed) return <Nothing>{t('cttee.unavailable')}</Nothing>;
  if (!held) return <p className="text-[13px] text-muted">{t('common.loading')}</p>;
  if (keepsNone) return <Nothing>{t('set.keepsNoCommittees')}</Nothing>;

  return (
    <ul className="space-y-2.5">
      {held.map(({ committee: c, memberNames, convenorName, summary }) => (
        <li key={c.id} className="rounded-sheet bg-raised/75 px-6 py-5 shadow-ring">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="font-display text-[19px] leading-snug tracking-[-0.014em]">
              {c.name}
            </span>
            {summary.waiting > 0 && (
              <span className="text-[12px] text-gold">
                <span className="font-mono tabular-nums">{summary.waiting}</span>{' '}
                {t('set.carrying')}
              </span>
            )}
          </div>

          <p className="mt-2 max-w-[62ch] text-[13px] leading-[1.6] text-sand">{c.remit}</p>

          <p className="mt-3 text-[12.5px] leading-[1.6] text-muted">{memberNames.join(', ')}</p>
          {convenorName && (
            <p className="mt-1 text-[12px] text-muted">
              {t('set.convenor')}: {convenorName}
            </p>
          )}

          {/* Where its authority comes from, which is a decision and not a setting. */}
          <p className="mt-2.5 font-mono text-[11.5px] text-muted">{c.formedIn}</p>

          {c.dissolvedAt && (
            <p className="mt-2 text-[12px] text-muted">
              {t('cttee.state.withdrawn')}
              <span className="mx-1.5 opacity-40">·</span>
              <span className="font-mono">{c.dissolvedAt.slice(0, 10)}</span>
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
