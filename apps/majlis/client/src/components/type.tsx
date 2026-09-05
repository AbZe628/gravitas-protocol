import type { ReactNode } from 'react';

/**
 * The typographic system, which existed and was never used.
 *
 * `tailwind.config.js` has carried a display serif, a body sans and a mono
 * since the beginning. Nothing in the application ever set `font-display`, so
 * every screen rendered in one sans face at sizes between eleven and fifteen
 * pixels — a page of undifferentiated grey where a title, a section heading, a
 * sentence of explanation and a caption all looked the same. A reader could not
 * tell what was important because nothing said so.
 *
 * ── five roles, and no sizes outside them ─────────────────────────────────
 *
 * A scale is only a scale if the steps are far enough apart to read as
 * different. Eleven, twelve, twelve and a half, thirteen and thirteen and a
 * half are one size with rounding error, and that is what this replaces.
 *
 *   `Display`  the one thing this screen is about — serif, and large enough
 *              that a reader's eye lands on it before anything else
 *   `Title`    the divisions within it
 *   `Body`     what is read — set at a size somebody would actually read
 *   `Label`    what a thing is, above it
 *   `Note`     what a reader may want and does not have to have
 *
 * ── the serif carries the meaning ─────────────────────────────────────────
 *
 * Everything a board wrote — a question, a ruling, a member's reasoning — is
 * set in the display face. Everything the application says about it is sans.
 * That is not decoration: a scholar can tell at a glance whose words they are
 * reading, and no legend is needed to learn it.
 */

export function Display({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h1
      className={
        'font-display text-[30px] leading-[1.15] tracking-[-0.01em] text-paper sm:text-[36px] ' +
        className
      }
      style={{ textWrap: 'balance' }}
    >
      {children}
    </h1>
  );
}

export function Title({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={'font-display text-[20px] leading-snug text-paper ' + className}>{children}</h2>
  );
}

/**
 * What is read.
 *
 * Fifteen rather than twelve and a half. The old size was chosen for density on
 * a page that had too much on it, and the answer to too much on a page is not a
 * smaller face.
 */
export function Body({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={'max-w-[62ch] text-[15px] leading-[1.6] text-sand ' + className}>{children}</p>
  );
}

/** What a thing is. Above it, quiet, and never competing with it. */
export function Label({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={
        'text-[11px] font-medium uppercase tracking-[0.12em] text-muted ' + className
      }
    >
      {children}
    </div>
  );
}

export function Note({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={'max-w-[62ch] text-[13px] leading-[1.55] text-muted ' + className}>{children}</p>
  );
}

/**
 * The board's own words, set apart.
 *
 * A ruling, a member's reasoning, a question as it was asked. Serif, and given
 * a rule down the side rather than a box: the point is that these words are
 * quoted, not that they are in a container.
 */
export function Quoted({ children }: { children: ReactNode }) {
  return (
    <blockquote className="border-s-2 border-gold/50 ps-4 font-display text-[17px] leading-[1.55] text-paper">
      {children}
    </blockquote>
  );
}

/**
 * Explanation a reader may want and does not have to have.
 *
 * The application had grown four-line paragraphs on every panel explaining why
 * each thing was as it was. Every one of them is true and worth having, and put
 * on the screen unasked they are a wall a scholar reads past — so they move
 * here, one line to open, and the screen keeps its shape.
 *
 * Not a tooltip and not a modal: it opens in place, prints, and is reachable by
 * keyboard because it is a `details` element and nothing more.
 */
export function Why({ children, label }: { children: ReactNode; label: string }) {
  return (
    <details className="group mt-2">
      <summary className="cursor-pointer list-none text-[12.5px] text-muted underline decoration-line underline-offset-4 transition-colors hover:text-sand">
        {label}
      </summary>
      <div className="mt-2 border-s border-line ps-3">
        <Note>{children}</Note>
      </div>
    </details>
  );
}

/**
 * A division of a screen, made with space rather than with a border.
 *
 * Everything used to be a bordered box at the same radius and padding, which
 * meant nothing was grouped: fifteen equal rectangles down a page read as
 * fifteen unrelated things. Space groups; a border only encloses, and should be
 * spent on the one or two things that genuinely need setting apart.
 */
export function Block({
  label,
  children,
  className = '',
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={'mt-10 first:mt-0 ' + className}>
      {label && <Label className="mb-3">{label}</Label>}
      {children}
    </section>
  );
}
