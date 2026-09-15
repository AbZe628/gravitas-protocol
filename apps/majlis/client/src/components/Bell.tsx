import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n.js';
import { rowKey, useNews } from '../lib/news.js';

/**
 * What arrived while the member was looking at something else.
 *
 * ── the bell and the queue are not the same thing ─────────────────────────
 *
 * The queue answers *what is waiting on me* and is true whether or not anybody
 * is looking. The bell answers *what appeared since I last looked*, which is
 * only meaningful to one person in one session. Building them as one thing
 * would mean either a queue that forgets or a bell that never stops ringing.
 *
 * The derivation is in `lib/news.tsx`, shared with the announcement that
 * appears by itself — so the two can never disagree about what is new.
 *
 * ── looking is the whole of clearing it ───────────────────────────────────
 *
 * Opening the panel marks what is in it as seen. There is no badge to clear
 * and no *mark all read*: the member looked, so it is no longer new. Anything
 * still needing them is still in the queue, where it belongs.
 */
export default function Bell() {
  const { t } = useI18n();
  const { fresh, looked } = useNews();
  const [open, setOpen] = useState(false);

  const close = () => {
    setOpen(false);
    looked();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-label={fresh.length > 0 ? `${t('bell.title')} — ${fresh.length}` : t('bell.title')}
        className="relative grid h-9 w-9 place-items-center rounded-full text-sand transition-colors hover:bg-raised hover:text-paper"
      >
        <Glyph />
        {fresh.length > 0 && (
          <span
            aria-hidden="true"
            className="absolute end-1.5 top-1.5 h-2 w-2 rounded-full bg-breach ring-2 ring-ink"
          />
        )}
      </button>

      {open && (
        <>
          {/* Pressing anywhere else puts it away, and counts as having looked. */}
          <div className="fixed inset-0 z-40" onMouseDown={close} />

          <div
            role="dialog"
            aria-label={t('bell.title')}
            className="absolute end-0 z-50 mt-2 w-[330px] overflow-hidden rounded-sheet bg-raised shadow-sheeted"
          >
            <p className="border-b border-line px-4 py-2.5 text-label font-bold uppercase tracking-caps text-faint">
              {t('bell.title')}
            </p>

            {fresh.length === 0 ? (
              <p className="px-4 py-4 text-ui leading-snug text-muted">{t('bell.nothing')}</p>
            ) : (
              <ul className="max-h-[50vh] overflow-y-auto py-1">
                {fresh.map((row) => (
                  <li key={rowKey(row)}>
                    <Link to={row.to} onClick={close} className="block px-4 py-2.5 hover:bg-ink">
                      <span
                        className={
                          'text-label font-bold uppercase tracking-caps ' +
                          (row.overdue ? 'text-breach' : 'text-lapis')
                        }
                      >
                        {t(`needs.kind.${row.kind}`)}
                      </span>
                      <span className="mt-0.5 block text-body leading-snug text-paper">
                        {row.title}
                      </span>
                      {row.next && (
                        <span className="mt-0.5 block text-note text-muted">{row.next}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <p className="border-t border-line px-4 py-2 text-note leading-snug text-muted">
              {t('bell.saysWhatItIs')}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

/** A bell, drawn rather than fetched, so it carries the frame's own colour. */
function Glyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 2.6c-2.9 0-5 2.2-5 5.1 0 4-1.4 5-1.4 5h12.8s-1.4-1-1.4-5c0-2.9-2.1-5.1-5-5.1Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M8.2 15.2a1.9 1.9 0 0 0 3.6 0"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
