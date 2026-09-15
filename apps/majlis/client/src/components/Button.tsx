import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

/**
 * A control that does something, and says which of five things it is doing.
 *
 * ── the fault this closes ─────────────────────────────────────────────────
 *
 * There were 197 bare `<button>` elements here and no component behind any of
 * them. Counted, not remembered. Three things follow from that, and all three
 * were visible in the running application:
 *
 *   **Three of the five states could not exist.** *Dead*, *working* and
 *   *failed* are not marks a person paints on one button at a time — they are
 *   behaviour, and behaviour has to live somewhere. Spread across 197 hand
 *   written class strings it lived nowhere, so a button that was doing
 *   something looked exactly like one that was not, and a second press sent
 *   the act twice.
 *
 *   **The act bar was never at the same height twice.** Every button chose its
 *   own padding, so the bar under one screen sat four pixels from where it sat
 *   under the next. Nobody can name that when they see it; everybody feels it,
 *   and what they call it is *this looks like a web page*.
 *
 *   **Focus was invisible.** `outline-none` appeared 49 times and
 *   `focus-visible` none. A member driving this from the keyboard — which is
 *   the whole point of an instrument — could not see where they were.
 *
 * ── what it does not do ───────────────────────────────────────────────────
 *
 * It does not take colour away from the caller. Every property already written
 * on the 197 is forwarded and comes *after* the base, so a screen that had a
 * reason to look a particular way still does. What the base owns is the part
 * that must never differ: height, radius, the focus ring, and what happens
 * when the control is dead or working.
 *
 * `busy` is the state that only a component can hold. While it is true the
 * button refuses a second press, says so to a screen reader, and keeps its
 * label — a control whose words change under the cursor has moved, and a
 * person who is mid-press cannot tell whether they hit what they aimed at.
 */

export type ButtonTone = 'act' | 'quiet' | 'grave' | 'bare';

/*
 * The base is behaviour only — no colour, no size, no radius.
 *
 * This is deliberate and it is what made a one-pass migration of 197 controls
 * safe. Tailwind resolves two conflicting utilities by their order in the
 * generated stylesheet, not by their order in the attribute, so a base that
 * set `bg-raised` under a caller's `bg-lapis` would have flipped an unknown
 * number of buttons to the wrong colour with nothing to warn us. Owning only
 * what nobody had written by hand leaves nothing to collide with.
 *
 * `tone` and `size` are what a screen opts into once it is rebuilt. Until it
 * does, its own classes are untouched and it still gains the three things it
 * never had: a visible focus ring, a real dead state, and a control that
 * refuses the second press.
 */
const BASE =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lapis ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-ink ' +
  'disabled:cursor-not-allowed disabled:opacity-40 aria-busy:cursor-progress';

/** Heights are the reason the act bar lands on the same pixel twice. */
const SIZE = {
  sm: 'inline-flex items-center justify-center gap-1.5 h-7 rounded-md px-2.5 text-note font-bold',
  md: 'inline-flex items-center justify-center gap-2 h-9 rounded-lg px-3.5 text-ui font-bold',
} as const;

const TONE: Record<ButtonTone, string> = {
  /** The board's own act. One per bar, on the end. */
  act: 'bg-lapis text-raised shadow-act hover:bg-lapissoft',
  /** Everything else that is still an act. */
  quiet: 'bg-raised text-sand shadow-ring hover:text-paper',
  /** An act that takes something away, or cannot be walked back. */
  grave: 'bg-raised text-breach shadow-ringbreach hover:bg-breachtint',
  /** A control that is not a button on the screen, only to the machine. */
  bare: 'bg-transparent text-sand hover:text-paper',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Omit to keep the screen's own colours. Pass one once the screen is rebuilt. */
  tone?: ButtonTone;
  /** Omit to keep the screen's own height and padding. */
  size?: keyof typeof SIZE;
  /** True while the act is in flight. Refuses a second press, keeps the label. */
  busy?: boolean;
  /**
   * Why this control cannot be pressed, in words a member can act on.
   *
   * A dead button with no reason beside it is the commonest way an interface
   * lies: it looks like the person did something wrong when the truth is that
   * the screen knows something it has not said. Passing this puts the sentence
   * on the control for a screen reader, and callers put it in the act bar for
   * everybody else.
   */
  whyDead?: string;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { tone, size, busy = false, whyDead, disabled, className = '', type, children, ...rest },
  ref,
) {
  const dead = disabled || busy;
  const dress = `${size ? SIZE[size] : ''} ${tone ? TONE[tone] : ''}`.trim();
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      disabled={dead}
      aria-busy={busy || undefined}
      aria-disabled={dead || undefined}
      title={whyDead && dead ? whyDead : rest.title}
      className={`${BASE}${dress ? ' ' + dress : ''}${className ? ' ' + className : ''}`}
      {...rest}
    >
      {busy ? <Spinner /> : null}
      {children}
    </button>
  );
});

/**
 * The mark that says the act is in flight.
 *
 * Beside the label rather than instead of it, and it does not push the words —
 * a label that jumps sideways when you press it reads as a misfire.
 */
function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-3 w-3 shrink-0 animate-spin rounded-full border-[1.5px] border-current border-t-transparent opacity-70 motion-reduce:animate-none"
    />
  );
}

/**
 * The bar the acts sit in, at the foot of a working window.
 *
 * It exists so the bar is in the same place on every screen — the second law
 * of docs/FLOW.md §35, and the one a person feels without being able to name
 * it. `why` is the sentence that says what is missing when the main act is
 * dead; it sits at the far end, where a reason belongs, rather than appearing
 * as a toast after the press.
 */
export function ActBar({
  why,
  children,
  className = '',
}: {
  why?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex shrink-0 items-center gap-2 border-t border-line bg-raised px-5 py-3 lg:px-8 ${className}`}
    >
      {why ? <p className="me-auto max-w-[44ch] text-note leading-snug text-muted">{why}</p> : <span className="me-auto" />}
      {children}
    </div>
  );
}
