import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n.js';
import { Button } from './Button';

/**
 * What just happened, and the one or two things that follow from it.
 *
 * ── the rule this exists to keep ──────────────────────────────────────────
 *
 * > Every button must have a guide to the next step, depending on what it
 * > does.
 *
 * An act used to end by closing a panel and reloading. The record moved and
 * the member was left looking at a list, to work out for themselves what they
 * had just caused and what to do about it. *Take this shape* is the plain
 * example: it changes what the board judges every murabaha by from that moment
 * on, and it ended in silence.
 *
 * So an act ends here instead: a line saying what is now true, a line saying
 * what it means, and the things that follow as buttons. Never more than three
 * — a list of everything possible is the same silence with more words.
 *
 * ── the next steps depend on where you were ───────────────────────────────
 *
 * The same act followed from two places leads two different ways, and the
 * caller passes what applies. Taking a shape from inside a matter sends you
 * back to the matter with the conditions now the board's own; taking it from
 * the library on its own sends you to checking a draft against it. Neither is
 * a guess this component makes.
 *
 * ── and there is always a way to stop ─────────────────────────────────────
 *
 * The last act is closing. A member who has done the thing and wants to go
 * back to what they were doing is not a member who failed to pick something.
 */

export interface Next {
  label: string;
  /** Where it goes, or what it does. One of the two, never both. */
  to?: string;
  onPress?: () => void;
  /** Why this is the thing to do next. One short line. */
  says?: string;
}

export default function AfterAct({
  did,
  means,
  next,
  onClose,
  children,
}: {
  /** What is now true, in one sentence, in the past tense. */
  did: string;
  /** What it means from now on. The consequence, not the act. */
  means?: string;
  next: readonly Next[];
  onClose: () => void;
  children?: ReactNode;
}) {
  const { t } = useI18n();

  /*
   * Measured: the question put to the board landed at y=1244 in a 900-pixel
   * window, below the fold, because the form above it empties on success and
   * the card shrinks under the press. A confirmation nobody sees is the
   * silence this component was written to end.
   */
  const here = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = here.current;
    if (!el) return;
    /*
     * Asked for, not assumed. `scrollIntoView` is missing under jsdom, and a
     * component that throws in the commit phase takes the screen down with it
     * — which is a worse outcome than a confirmation the member has to look
     * for. The same guard covers any environment that does not offer it.
     */
    el.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    /* So the keyboard carries on from what just happened, not from the top. */
    el.focus?.({ preventScroll: true });
  }, []);

  return (
    <div ref={here} tabIndex={-1} className="scroll-mt-24 focus:outline-none">
      <div className="mb-4 rounded-card bg-settledtint px-5 py-4 shadow-ringsettled">
        <div className="mb-1 text-label font-bold uppercase tracking-caps text-settled">
          {t('after.done')}
        </div>
        <p className="max-w-[58ch] text-body leading-relaxed text-paper">{did}</p>
        {means && (
          <p className="mt-2 max-w-[58ch] text-ui leading-relaxed text-sand">{means}</p>
        )}
      </div>

      {children}

      <div className="mb-2 text-label font-bold uppercase tracking-caps text-muted">
        {t('after.next')}
      </div>

      <ul className="space-y-2">
        {next.slice(0, 3).map((n, i) => (
          <li key={i}>
            {n.to ? (
              <Link
                to={n.to}
                className="block rounded-card bg-ink px-4 py-3 shadow-ring transition-shadow hover:shadow-card"
              >
                <span className="text-body font-semibold text-lapis">{n.label}</span>
                {n.says && (
                  <span className="mt-0.5 block text-note leading-snug text-muted">{n.says}</span>
                )}
              </Link>
            ) : (
              <Button
                type="button"
                onClick={n.onPress}
                className="block w-full rounded-card bg-ink px-4 py-3 text-start shadow-ring transition-shadow hover:shadow-card"
              >
                <span className="text-body font-semibold text-lapis">{n.label}</span>
                {n.says && (
                  <span className="mt-0.5 block text-note leading-snug text-muted">{n.says}</span>
                )}
              </Button>
            )}
          </li>
        ))}

        {/*
          Stopping is one of the things that follows, and it is named rather
          than left as an X in a corner.
        */}
        <li>
          <Button
            type="button"
            onClick={onClose}
            className="text-ui text-muted underline decoration-line underline-offset-4"
          >
            {t('after.nothingMore')}
          </Button>
        </li>
      </ul>
    </div>
  );
}
