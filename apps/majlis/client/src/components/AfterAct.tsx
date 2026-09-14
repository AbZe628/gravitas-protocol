import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n.js';

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

  return (
    <div>
      <div className="mb-4 rounded-card bg-[#EBF3EF] px-5 py-4 shadow-[0_0_0_0.5px_rgba(44,107,87,0.18)]">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-settled">
          {t('after.done')}
        </div>
        <p className="max-w-[58ch] text-[13.5px] leading-[1.6] text-paper">{did}</p>
        {means && (
          <p className="mt-2 max-w-[58ch] text-[12.5px] leading-[1.6] text-sand">{means}</p>
        )}
      </div>

      {children}

      <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
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
                <span className="text-[13.5px] font-semibold text-lapis">{n.label}</span>
                {n.says && (
                  <span className="mt-0.5 block text-[12px] leading-[1.5] text-muted">{n.says}</span>
                )}
              </Link>
            ) : (
              <button
                type="button"
                onClick={n.onPress}
                className="block w-full rounded-card bg-ink px-4 py-3 text-start shadow-ring transition-shadow hover:shadow-card"
              >
                <span className="text-[13.5px] font-semibold text-lapis">{n.label}</span>
                {n.says && (
                  <span className="mt-0.5 block text-[12px] leading-[1.5] text-muted">{n.says}</span>
                )}
              </button>
            )}
          </li>
        ))}

        {/*
          Stopping is one of the things that follows, and it is named rather
          than left as an X in a corner.
        */}
        <li>
          <button
            type="button"
            onClick={onClose}
            className="text-[12.5px] text-muted underline decoration-line underline-offset-4"
          >
            {t('after.nothingMore')}
          </button>
        </li>
      </ul>
    </div>
  );
}
