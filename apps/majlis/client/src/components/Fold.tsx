import { useId, useState, type ReactNode } from 'react';

/**
 * A part of a record, shut until somebody wants it.
 *
 * ── the measurement this comes from ───────────────────────────────────────
 *
 * The matter screen laid eight parts out one under another: 1,103 words and
 * 4,849 pixels, with the first thing a member could actually do 1,072 pixels
 * down. Nothing on it was wrong. All of it at once was.
 *
 * So a part is now a row you can open, and the row carries enough to decide
 * whether to open it. That last half is the whole difference between folding
 * and hiding: a row reading only *The figures* makes a person open all eight
 * to find anything, which is worse than the wall it replaced.
 *
 * ── what stays open ───────────────────────────────────────────────────────
 *
 * Whatever the caller says is open, and it should be little. On a matter it is
 * the question itself and nothing else: a member who has just been told what
 * to do next needs the question in front of them and can ask for the rest.
 *
 * A part that is *contested* — a committee that split, a condition the board
 * disagrees on — is passed `alwaysOpen`, and then it cannot be folded at all.
 * A disagreement somebody has to press to find is a disagreement that gets
 * missed, and this application exists to stop exactly that.
 */

export default function Fold({
  heading,
  summary,
  children,
  open: initiallyOpen = false,
  alwaysOpen = false,
}: {
  heading: string;
  /** One line on the closed row: what is inside, and whether it matters. */
  summary?: ReactNode;
  children: ReactNode;
  open?: boolean;
  /** For a part nobody may fold away. It is drawn open with no control. */
  alwaysOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen || alwaysOpen);
  const bodyId = useId();

  if (alwaysOpen) {
    return (
      <section className="border-t border-line py-5 first:border-t-0 first:pt-0">
        <h2 className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
          {heading}
        </h2>
        {children}
      </section>
    );
  }

  return (
    <section className="border-t border-line first:border-t-0">
      <h2>
        <button
          type="button"
          onClick={() => setOpen((was) => !was)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex w-full items-baseline gap-3 py-4 text-start"
        >
          <span
            aria-hidden="true"
            className={
              'mt-[3px] shrink-0 text-[10px] text-muted transition-transform ' +
              (open ? 'rotate-90' : '')
            }
          >
            ▶
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] leading-[1.4] text-paper">{heading}</span>
            {summary && !open && (
              <span className="mt-0.5 block text-[12.5px] leading-[1.5] text-muted">{summary}</span>
            )}
          </span>
        </button>
      </h2>

      {open && (
        <div id={bodyId} className="ps-6 pb-6">
          {children}
        </div>
      )}
    </section>
  );
}
