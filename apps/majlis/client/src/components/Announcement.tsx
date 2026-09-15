import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n.js';
import { rowKey, useNews } from '../lib/news.js';
import type { QueueRow } from '../lib/api.js';

/**
 * The thing that appears by itself when a question arrives.
 *
 * ── the sentence, in full ─────────────────────────────────────────────────
 *
 * > A question comes in from the bank with a PDF. **A notification pops
 * > immediately.**
 *
 * A dot on a bell is not that. A dot is something a member finds when they
 * happen to look at the masthead, and the whole point of this one is that they
 * should not have to be looking. So it appears without being asked, says what
 * arrived and from whom, and offers the one press that opens it.
 *
 * ── it stays until it is dealt with ───────────────────────────────────────
 *
 * No timer. An announcement that fades after five seconds is a promise that
 * the member was watching the screen at the moment it arrived, and a scholar
 * reading a contract was not. It goes when they press it, dismiss it, or open
 * the bell — all three being *I have seen this*.
 *
 * ── and it does not stack into a wall ─────────────────────────────────────
 *
 * Two at most, and only the kinds `N-02` names as loud. Everything else waits
 * in the bell. Three stacked announcements are dismissed without being read,
 * which is worse than not announcing.
 *
 * ── it does not move if the member has asked for less movement ────────────
 *
 * The slide is a convenience, never the way it is said: with movement reduced
 * it simply is where it is, and everything it says is still said.
 */
export default function Announcement() {
  const { announcing } = useNews();
  if (announcing.length === 0) return null;

  return (
    <div
      /*
       * Announced to a screen reader as it arrives, but politely — it waits
       * for whatever the member is having read to them to finish, rather than
       * cutting across a sentence.
       */
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed end-4 top-16 z-[60] flex w-[min(340px,calc(100vw-2rem))] flex-col gap-2 lg:top-20"
    >
      {announcing.map((row) => (
        <One key={rowKey(row)} row={row} />
      ))}
    </div>
  );
}

function One({ row }: { row: QueueRow }) {
  const { t } = useI18n();
  const { quieten } = useNews();

  /* Escape puts it away, like every other window in this application. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') quieten(rowKey(row));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [quieten, row]);

  return (
    <div
      className={
        'pointer-events-auto overflow-hidden rounded-card bg-raised shadow-sheeted ' +
        'motion-safe:animate-[arrive_200ms_ease-out] ' +
        (row.overdue ? 'border-s-[3px] border-breach' : 'border-s-[3px] border-lapis')
      }
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <span
            className={
              'text-label font-bold uppercase tracking-caps ' +
              (row.overdue ? 'text-breach' : 'text-lapis')
            }
          >
            {t(`needs.kind.${row.kind}`)}
          </span>
          <p className="mt-1 font-display text-body leading-snug text-paper">{row.title}</p>
          {row.next && (
            <p className="mt-0.5 text-note leading-snug text-muted">
              {row.next}
              {row.whoName ? ` · ${row.whoName}` : ''}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => quieten(rowKey(row))}
          aria-label={t('announce.dismiss')}
          className="-me-1 -mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-faint hover:bg-ink hover:text-paper"
        >
          <span aria-hidden="true" className="text-lead leading-none">
            &times;
          </span>
        </button>
      </div>

      <Link
        to={row.to}
        onClick={() => quieten(rowKey(row))}
        className="block border-t border-line px-4 py-2 text-ui font-bold text-lapis hover:bg-lapistint"
      >
        {t('announce.open')}
      </Link>

      <style>{`@keyframes arrive{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
