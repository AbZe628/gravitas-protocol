import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

/**
 * The parts screens are built from.
 *
 * The application had one visual device — a one-pixel border at one radius —
 * and used it for everything: a warning, a ruling, a navigation entry, a note,
 * a form. Fifteen identical rectangles down a page read as fifteen unrelated
 * things, and a reader looking for the important one had nothing to look for.
 *
 * So: three kinds of surface, four states that are visibly different, one
 * button that looks like the primary act and one that does not.
 *
 * ── elevation, not outline ────────────────────────────────────────────────
 *
 * Nothing here draws a border. A surface is a white sheet lifted off the
 * vellum by a half-pixel ring and two soft shadows, and the one thing on a
 * screen that matters carries a third. That is the difference a reader sees
 * before reading a word, which is the whole point of having it.
 *
 * ── state has a colour, and each colour has one job ───────────────────────
 *
 *   `settled`   what holds — in force, met, recorded, done
 *   `attention` time running out, and nothing else
 *   `breach`    overdue, refused, a threshold crossed
 *   `lapis`     the board's own acts — put a question, record a position
 *
 * A scholar can then see that six conditions are met without reading six
 * lines, which is the whole point of a state having a colour.
 *
 * The reference is apps/majlis/design/*.dc.html; the rules are in
 * docs/DESIGN.md.
 */

// ── surfaces ──────────────────────────────────────────────────────────────

/**
 * A card, which is a thing you can act on or go into.
 *
 * Prose, notes and explanations are not cards — putting them in one was most
 * of why nothing on a page looked more important than anything else. `lead`
 * is for the single card a screen is actually about; there is at most one.
 */
export function Card({
  children,
  to,
  tone = 'plain',
  lead = false,
  className = '',
}: {
  children: ReactNode;
  to?: string;
  tone?: 'plain' | 'quiet' | 'settled' | 'attention' | 'breach';
  lead?: boolean;
  className?: string;
}) {
  /*
   * A toned card says its colour with a half-pixel ring rather than a border,
   * so the tone reads without the card gaining an outline the plain one lacks.
   */
  const edge: Record<string, string> = {
    plain: '',
    quiet: '',
    settled: 'shadow-[0_0_0_0.5px_rgba(44,107,87,0.22)]',
    attention: 'shadow-[0_0_0_0.5px_rgba(176,132,48,0.24)]',
    breach: 'shadow-[0_0_0_0.5px_rgba(154,56,48,0.2)]',
  };

  // A quiet card is translucent, so the sweep behind the page shows through it.
  const ground = tone === 'quiet' ? 'bg-raised/70 shadow-ring' : 'bg-raised';
  const depth = edge[tone] || (lead ? 'shadow-lift' : 'shadow-card');

  const shape = `relative block overflow-hidden rounded-sheet px-6 py-5 transition-all ${ground} ${depth} ${className}`;

  if (to) {
    return (
      <Link to={to} className={shape + ' hover:-translate-y-px hover:shadow-lift'}>
        {children}
      </Link>
    );
  }
  return <div className={shape}>{children}</div>;
}

/**
 * The rule down the edge of a card, which tapers the way a nib lifts off the
 * page rather than sitting there as a flat bar.
 *
 * Put it inside a `Card` — the card is already `relative` and clipped. It is
 * the one place the sweep that crosses each screen appears at the scale of a
 * component, and it is why a card that matters does not need a border to say
 * so.
 */
export function Edge({ tone = 'attention' }: { tone?: Tone }) {
  const fill: Record<Tone, string> = {
    settled: '#2C6B57',
    attention: '#B08430',
    breach: '#9A3830',
    lapis: '#164470',
    plain: '#E8E1D4',
  };
  return (
    <svg
      aria-hidden="true"
      width="12"
      height="240"
      viewBox="0 0 12 240"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-y-0 start-0 h-full"
    >
      <path
        d="M0 0 C 5 30, 5 68, 3.8 120 C 2.9 166, 1.6 202, 0 240 Z"
        fill={fill[tone]}
      />
    </svg>
  );
}

/**
 * A rail: a coloured edge and space, with no box.
 *
 * For the one thing on a screen that matters most, where a card would put it
 * in a container beside other containers.
 */
export function Rail({
  children,
  tone = 'attention',
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  const edge: Record<Tone, string> = {
    lapis: 'border-lapis',
    settled: 'border-settled',
    attention: 'border-attention',
    breach: 'border-breach',
    plain: 'border-line',
  };
  return <div className={'border-s-[3px] ps-5 ' + edge[tone]}>{children}</div>;
}

// ── state ─────────────────────────────────────────────────────────────────

export type Tone = 'settled' | 'attention' | 'breach' | 'lapis' | 'plain';

/**
 * What something is, as a word with a colour.
 *
 * Every status in the old interface was the same grey pill, so `in force`,
 * `overdue` and `in deliberation` were three words a reader had to actually
 * read. They are now three colours a reader can see.
 */
export function State({ tone = 'plain', children }: { tone?: Tone; children: ReactNode }) {
  const paint: Record<Tone, string> = {
    settled: 'bg-[#EBF3EF] text-settled shadow-[0_0_0_0.5px_rgba(44,107,87,0.18)]',
    attention: 'bg-[#FBF4E4] text-gold shadow-[0_0_0_0.5px_rgba(176,132,48,0.22)]',
    breach: 'bg-[#FCF0EE] text-breach shadow-[0_0_0_0.5px_rgba(154,56,48,0.18)]',
    lapis: 'bg-[#EAF1F7] text-lapis shadow-[0_0_0_0.5px_rgba(22,68,112,0.18)]',
    plain: 'bg-black/[0.045] text-sand',
  };
  return (
    <span
      className={
        'inline-flex items-center rounded-full px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.1em] ' +
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
 * Lapis, because the board's own acts are lapis. It was gold, from when gold
 * was the accent; gold now means the clock and nothing else. A solid control
 * carries a shadow in its own colour rather than a grey one — a grey shadow
 * under a coloured button is the detail that reads as unfinished.
 */
export function Act({
  children,
  onClick,
  to,
  disabled,
  tone = 'lapis',
}: {
  children: ReactNode;
  onClick?: () => void;
  to?: string;
  disabled?: boolean;
  tone?: 'lapis' | 'gold';
}) {
  const paint =
    tone === 'gold'
      ? 'bg-gradient-to-br from-goldsoft to-[#A67A28] shadow-actgold'
      : 'bg-gradient-to-br from-lapissoft to-[#143E67] shadow-act';

  const shape =
    'inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[14px] font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40 ' +
    paint;

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
    attention: 'text-gold',
    breach: 'text-breach',
    lapis: 'text-lapis',
    plain: 'text-paper',
  };

  const body = (
    <>
      <div
        className={
          'font-display text-[40px] leading-[0.92] tabular-nums tracking-[-0.028em] ' + paint[tone]
        }
      >
        {n}
      </div>
      <div className="mt-3 max-w-[24ch] text-[13px] leading-[1.5] text-muted">{of}</div>
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
