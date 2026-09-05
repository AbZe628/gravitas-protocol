import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

/**
 * The parts screens are built from.
 *
 * The application had one visual device — a one-pixel border at one radius —
 * and used it for everything: a warning, a ruling, a navigation entry, a note,
 * a form. Fifteen identical rectangles down a page read as fifteen unrelated
 * things, and a reader looking for the important one had nothing to look for.
 * Colour was in the same state: 449 uses of `text-muted` and 223 of
 * `border-line`, with the accent and the alarm sharing one hex and nothing at
 * all for what holds.
 *
 * So: three kinds of surface, four states that are visibly different, one
 * button that looks like the primary act and one that does not.
 *
 * ── state has a colour, and each colour has one job ───────────────────────
 *
 *   `settled`   what holds — in force, met, recorded, done
 *   `attention` time running out, and nothing else
 *   `breach`    overdue, refused, a threshold crossed
 *   `gold`      the board's own — its words, its authority, its acts
 *
 * A scholar can then see that six conditions are met without reading six
 * lines, which is the whole point of a state having a colour.
 */

// ── surfaces ──────────────────────────────────────────────────────────────

/**
 * A card, which is a thing you can act on or go into.
 *
 * Raised off the ground rather than outlined on it. Prose, notes and
 * explanations are not cards — putting them in one was most of why nothing on
 * a page looked more important than anything else.
 */
export function Card({
  children,
  to,
  tone = 'plain',
  className = '',
}: {
  children: ReactNode;
  to?: string;
  tone?: 'plain' | 'settled' | 'attention' | 'breach' | 'gold';
  className?: string;
}) {
  const edge: Record<string, string> = {
    plain: 'border-line',
    settled: 'border-settled/40',
    attention: 'border-attention/50',
    breach: 'border-breach/50',
    gold: 'border-gold/50',
  };

  const shape =
    'block rounded-card border bg-raised px-5 py-4 shadow-card transition-all ' + edge[tone];

  if (to) {
    return (
      <Link to={to} className={shape + ' hover:-translate-y-px hover:shadow-lift ' + className}>
        {children}
      </Link>
    );
  }
  return <div className={shape + ' ' + className}>{children}</div>;
}

/**
 * A rail: a coloured edge and space, with no box.
 *
 * For the one thing on a screen that matters most. A card would put it in a
 * container beside other containers; a rail sets it apart by making the page
 * itself point at it.
 */
export function Rail({
  children,
  tone = 'gold',
}: {
  children: ReactNode;
  tone?: 'gold' | 'settled' | 'attention' | 'breach' | 'plain';
}) {
  const edge: Record<string, string> = {
    gold: 'border-gold',
    settled: 'border-settled',
    attention: 'border-attention',
    breach: 'border-breach',
    plain: 'border-line',
  };
  return <div className={'border-s-[3px] ps-5 ' + edge[tone]}>{children}</div>;
}

// ── state ─────────────────────────────────────────────────────────────────

export type Tone = 'settled' | 'attention' | 'breach' | 'gold' | 'plain';

/**
 * What something is, as a word with a colour.
 *
 * Every status in the old interface was the same grey pill, so `in force`,
 * `overdue` and `in deliberation` were three words a reader had to actually
 * read. They are now three colours a reader can see.
 */
export function State({ tone = 'plain', children }: { tone?: Tone; children: ReactNode }) {
  const paint: Record<Tone, string> = {
    settled: 'border-settled/40 bg-settled/10 text-settled',
    attention: 'border-attention/40 bg-attention/10 text-attention',
    breach: 'border-breach/40 bg-breach/10 text-breach',
    gold: 'border-gold/40 bg-gold/10 text-gold',
    plain: 'border-line bg-white/[0.03] text-sand',
  };
  return (
    <span
      className={
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] ' +
        paint[tone]
      }
    >
      {children}
    </span>
  );
}

/**
 * The tone a matter's status should be shown in.
 *
 * Kept here so one table decides it. Two screens disagreeing about whether
 * `timelock` is settled or waiting is the kind of drift nobody notices and
 * everybody is confused by.
 */
export function toneForStatus(status: string): Tone {
  if (status === 'in_force') return 'settled';
  if (status === 'rejected' || status === 'lapsed') return 'breach';
  if (status === 'voting' || status === 'timelock') return 'attention';
  return 'plain';
}

// ── acts ──────────────────────────────────────────────────────────────────

/**
 * The primary act of a screen. Filled, and there is at most one.
 *
 * Every button used to be an outlined rectangle, so the thing a reader came to
 * do looked exactly like the thing that cancels it.
 */
export function Act({
  children,
  onClick,
  to,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  to?: string;
  disabled?: boolean;
}) {
  const shape =
    'inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-[14px] font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-40';

  if (to) {
    return (
      <Link to={to} className={shape}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={shape}>
      {children}
    </button>
  );
}

/** Everything else a reader may do. Quiet, and never a box. */
export function Quiet({
  children,
  onClick,
  to,
}: {
  children: ReactNode;
  onClick?: () => void;
  to?: string;
}) {
  const shape =
    'text-[13px] text-muted underline decoration-line underline-offset-4 transition-colors hover:text-paper';

  if (to) {
    return (
      <Link to={to} className={shape}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={shape}>
      {children}
    </button>
  );
}

/**
 * A figure worth looking at, with what it counts underneath.
 *
 * Numbers were previously the same size as the prose around them, so the one
 * fact on a screen a scholar could take in at a glance had to be read for.
 */
export function Figure({
  n,
  of,
  to,
  tone = 'plain',
}: {
  n: number | string;
  of: string;
  to?: string;
  tone?: Tone;
}) {
  const paint: Record<Tone, string> = {
    settled: 'text-settled',
    attention: 'text-attention',
    breach: 'text-breach',
    gold: 'text-gold',
    plain: 'text-paper',
  };

  const body = (
    <>
      <div className={'font-display text-[34px] leading-none tabular-nums ' + paint[tone]}>{n}</div>
      <div className="mt-2 max-w-[24ch] text-[13px] leading-[1.45] text-muted">{of}</div>
    </>
  );

  if (to) {
    return (
      <Link to={to} className="group block transition-opacity hover:opacity-80">
        {body}
      </Link>
    );
  }
  return <div>{body}</div>;
}
