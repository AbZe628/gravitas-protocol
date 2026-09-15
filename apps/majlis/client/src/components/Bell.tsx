import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { governance, type QueueRow } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { useRevision, whatIsNew } from '../lib/pulse.js';

/**
 * What arrived while the member was looking at something else.
 *
 * ── the sentence this exists to make true ─────────────────────────────────
 *
 * > A question comes in from the bank — a notification pops immediately.
 *
 * The first line of the whole specification, and nothing stood behind it. The
 * relay in `services/notice.ts` composes words for the *bank*; inside the
 * application there was no bell at all, so a member found out that a question
 * had arrived by reloading a page.
 *
 * ── the queue is the state; the bell is the change ────────────────────────
 *
 * They are not the same thing and must not be built as one. The queue answers
 * *what is waiting on me* and is true whether or not anybody is looking. The
 * bell answers *what appeared since I last looked*, which is only meaningful
 * to one person in one session.
 *
 * So nothing is stored. The bell holds the queue it last showed the member,
 * compares it with the queue that arrives when the record moves, and the
 * difference is the news. Something that stops being true stops being news the
 * moment it does, and there is no flag anywhere to go stale — the rule the
 * whole record is built on.
 *
 * ── it does not follow the member around ──────────────────────────────────
 *
 * Opening the panel marks what is in it as seen. There is no badge that has to
 * be cleared and no *mark all read*: the member looked, so it is no longer new.
 * Anything still needing them is still in the queue, where it belongs.
 */
export default function Bell() {
  const { t } = useI18n();
  const revision = useRevision();

  const [open, setOpen] = useState(false);
  const [fresh, setFresh] = useState<QueueRow[]>([]);
  /** The queue as it stood when the member last looked. Never rendered. */
  const seen = useRef<QueueRow[] | null>(null);

  useEffect(() => {
    let current = true;
    governance
      .queue()
      .then((q) => {
        if (!current) return;
        const rows = Array.isArray(q.rows) ? q.rows : [];

        /*
         * The first read establishes what *was already there*. Without this a
         * member opening the application would be told that all eleven of
         * their standing items had just arrived.
         */
        if (seen.current === null) {
          seen.current = rows;
          return;
        }

        const arrived = whatIsNew(seen.current, rows, (r) => r.to);
        if (arrived.length > 0) setFresh((had) => [...arrived, ...had]);
        seen.current = rows;
      })
      .catch(() => {
        /* No bell is honest. A bell that rings for a failed request is not. */
      });
    return () => {
      current = false;
    };
  }, [revision]);

  const look = () => {
    setOpen((was) => {
      if (was) return false;
      return true;
    });
  };

  const close = () => {
    setOpen(false);
    /* Looked at it, so it is no longer new. Nothing to clear anywhere else. */
    setFresh([]);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={look}
        aria-expanded={open}
        aria-label={
          fresh.length > 0
            ? `${t('bell.title')} — ${fresh.length}`
            : t('bell.title')
        }
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
              <p className="px-4 py-4 text-ui leading-snug text-muted">
                {t('bell.nothing')}
              </p>
            ) : (
              <ul className="max-h-[50vh] overflow-y-auto py-1">
                {fresh.map((row) => (
                  <li key={row.to}>
                    <Link
                      to={row.to}
                      onClick={close}
                      className="block px-4 py-2.5 hover:bg-ink"
                    >
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
                        <span className="mt-0.5 block text-note text-muted">
                          {row.next}
                        </span>
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
      <path d="M8.2 15.2a1.9 1.9 0 0 0 3.6 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
