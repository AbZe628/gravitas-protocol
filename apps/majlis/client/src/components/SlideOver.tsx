import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '../lib/i18n.js';
import { Button } from './Button';

/**
 * A panel that slides in from the side and is worked in.
 *
 * ── what it is for ────────────────────────────────────────────────────────
 *
 * > Where there are several choices, like those contracts, put it in a slide
 * > that opens. When he opens a contract it opens a separate window and he
 * > works in it. Like everything — every item, every toolkit.
 *
 * A list of nineteen contract shapes is a list of choices. Pressing one should
 * not navigate away from where you were and lose it; it should open beside the
 * list, wide enough to work in, and close back to exactly where you were. That
 * is what a slide-over is for and it is the difference between choosing from a
 * list and being taken somewhere.
 *
 * ── the same discipline as Dialog ─────────────────────────────────────────
 *
 * Escape closes it, focus moves in and returns, the ground behind it closes
 * it, and it never closes itself. The two differ only in where they come from
 * and how wide: a dialog is a decision about one act, a slide-over is a place
 * to do work.
 *
 * ── it is a real height, and it scrolls itself ────────────────────────────
 *
 * Full height against the edge, its own header and foot. Nothing inside it
 * moves the page behind it.
 *
 * ── and on a phone it comes up from the foot ──────────────────────────────
 *
 * Measured at 375 × 812: it arrived as 375 × 812 at the origin — the whole
 * screen, covering what the member was reading, with the calculations taking
 * the top third and five hundred pixels of nothing under them. A panel that
 * is the screen is a screen, and a member who opened one to look something up
 * had lost the thing they opened it from.
 *
 * It comes up from the foot now, at two heights: enough to work in, and
 * nearly the whole screen for the one that needs it, with what you were
 * reading still above it. The height is changed by pressing the grip, not by
 * dragging it — the board's owner was asked about gestures on a phone and
 * said not for now, and a press is the one way that works for somebody
 * driving this from a keyboard anyway.
 */

export default function SlideOver({
  open,
  title,
  says,
  onClose,
  children,
  acts,
}: {
  open: boolean;
  title: string;
  /** One line under the title, where the thing needs introducing. */
  says?: string;
  onClose: () => void;
  children: ReactNode;
  /** The bar at the foot. Absent where there is nothing to do but read. */
  acts?: ReactNode;
}) {
  const { t } = useI18n();
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;

    opener.current = document.activeElement;
    const first = panel.current?.querySelector<HTMLElement>(
      'textarea, input, button, [tabindex]:not([tabindex="-1"])',
    );
    (first ?? panel.current)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);

  /*
   * Which of the two heights, on a phone. Reset every time it opens: the
   * height a member wanted for the contract library is not a decision about
   * the next thing they open.
   */
  const [tall, setTall] = useState(false);
  useEffect(() => {
    if (open) setTall(false);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-stretch sm:justify-end">
      <Button
        type="button"
        aria-label={t('common.cancel')}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-paper/35 backdrop-blur-[2px]"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={
          'relative flex w-full max-w-[720px] flex-col overflow-hidden bg-raised shadow-card outline-none ' +
          'rounded-t-[20px] transition-[height] duration-200 sm:h-full sm:rounded-none ' +
          (tall ? 'h-[92svh]' : 'h-[62svh]')
        }
      >
        {/*
          The grip, and it is a control rather than a decoration.

          It says the sheet has another height and gives the member it with
          one press. Hidden from a reader of the screen only in the sense that
          the bar itself is: the button it sits in is named, and what it does
          is said in words.
        */}
        <Button
          type="button"
          onClick={() => setTall(!tall)}
          aria-expanded={tall}
          aria-label={t(tall ? 'sheet.lower' : 'sheet.raise')}
          className="grid w-full shrink-0 place-items-center py-2.5 sm:hidden"
        >
          <span aria-hidden="true" className="block h-[5px] w-10 rounded-full bg-line" />
        </Button>

        <div className="flex items-start gap-4 border-b border-line px-5 pb-3.5 pt-1 sm:px-6 sm:pt-3.5">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-sub leading-tight tracking-title text-paper">
              {title}
            </h2>
            {says && <p className="mt-1 text-note leading-snug text-muted">{says}</p>}
          </div>
          <Button
            type="button"
            onClick={onClose}
            aria-label={t('common.cancel')}
            className="shrink-0 rounded-lg px-2 py-1 text-lead leading-none text-muted hover:bg-ink hover:text-paper"
          >
            ×
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        {acts && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-ink/40 px-5 py-3 sm:px-6">
            {acts}
          </div>
        )}
      </div>
    </div>
  );
}
