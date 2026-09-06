import { Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n.js';

/**
 * What a scholar reads first.
 *
 * The failure this exists to fix, in the words it was reported in: *a Shariah
 * board would come in once, say we do not need this, and go back to how they
 * worked before.* Everything was thrown together with no order and no path —
 * twelve navigation items, no explanation, nothing telling a person who had
 * never seen it what any of it was for.
 *
 * That judgement was right, and it is not fixed by another feature. It is fixed
 * by the first screen answering, in a scholar's own language and before
 * anything else: **what is this, what do I do here, and why would I bother.**
 *
 * ── four kinds of work, because there are four ────────────────────────────
 *
 * A board's year is not one undifferentiated stream. It is a product that
 * cannot launch without a ruling; something that already happened and is now on
 * a thirty-day clock; an instrument whose figures have to be worked before
 * anyone can rule on it; and a review that falls due with nobody whose job it
 * is to notice. They differ in what is being decided and in what is running
 * out, and naming them separately is most of the orientation a person needs.
 *
 * Each one says where it starts. A panel that explained the work without
 * saying where to begin it would be a poster.
 *
 * ── and what it will never do ─────────────────────────────────────────────
 *
 * Said here rather than discovered later, because it is the reason a board can
 * use this at all: nothing signs, nothing rules, nothing re-rules. A scholar
 * deciding whether this is worth their afternoon is entitled to know that on
 * the first screen rather than in documentation.
 *
 * ── it gets out of the way ────────────────────────────────────────────────
 *
 * Shown at the top while a board is new to this, and folded to a single line
 * once somebody has work waiting — at which point what needs them is the more
 * useful thing to lead with. The choice is remembered per browser, and a
 * cleared one simply shows it again, which is the harmless failure.
 */

const KINDS = ['product', 'incident', 'screening', 'review'] as const;

const WHERE: Record<(typeof KINDS)[number], string> = {
  product: '/',
  incident: '/incidents',
  screening: '/calculations',
  review: '/calendar',
};

export default function WhatThisIs({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  const { t } = useI18n();

  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="mb-5 text-[12.5px] text-muted underline decoration-line underline-offset-4 transition-colors hover:text-paper"
      >
        {t('intro.reopen')}
      </button>
    );
  }

  return (
    <section className="mb-6 rounded-card shadow-ring bg-raised px-4 py-4 sm:px-5">
      <h2 className="text-[17px] font-semibold tracking-tight">{t('intro.title')}</h2>
      <p className="mt-1.5 max-w-prose text-[13.5px] leading-relaxed">{t('intro.lede')}</p>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {KINDS.map((kind) => (
          <Link
            key={kind}
            to={WHERE[kind]}
            className="group rounded-xl shadow-ring px-3.5 py-3 transition-colors hover:text-paper"
          >
            <div className="text-[13px] font-medium">{t(`intro.${kind}`)}</div>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">{t(`intro.${kind}.body`)}</p>
            {/* What is running out. It is the thing that differs between them. */}
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-lapis">
              {t(`intro.${kind}.clock`)}
            </p>
          </Link>
        ))}
      </div>

      {/*
        The refusals, on the first screen. A scholar deciding whether this is
        worth an afternoon is entitled to know what it will not do before they
        spend one.
      */}
      <div className="mt-4 border-t border-line pt-3.5">
        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
          {t('intro.never')}
        </div>
        <ul className="space-y-1.5">
          {['sign', 'rule', 'rerule'].map((k) => (
            <li key={k} className="flex gap-2 text-[12.5px] leading-relaxed text-muted">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted" />
              <span>{t(`intro.never.${k}`)}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className="mt-3.5 rounded-xl shadow-ring px-3 py-1 text-[12px] text-muted transition-colors hover:text-paper"
      >
        {t('intro.hide')}
      </button>
    </section>
  );
}
