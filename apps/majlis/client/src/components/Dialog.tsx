import { useEffect, useRef, type ReactNode } from 'react';
import { useI18n } from '../lib/i18n.js';
import { Button } from './Button';

/**
 * A window that opens over the work, says what an act will do, and does it.
 *
 * ── why this exists ───────────────────────────────────────────────────────
 *
 * > It must not be solved only on those buttons. He clicks *not met*, a window
 * > opens saying what *not met* means, what it has to say, it is sent back to
 * > the bank with the reason. Every button on every page.
 *
 * An act with a consequence outside this screen does not happen because
 * somebody pressed a word in a bar. It opens a window, the window says what is
 * about to happen and to whom, the member writes the reason, and then it
 * happens. That is the difference between an application and a page of
 * buttons, and it is also the difference between a record somebody can defend
 * and one they cannot.
 *
 * ── what it does for a keyboard, because that is not optional ─────────────
 *
 * Escape closes it. Focus moves into it when it opens and returns to whatever
 * opened it when it closes. The backdrop closes it too, because a window that
 * can only be left by finding the right button is a trap.
 *
 * ── and it never closes itself on a refusal ───────────────────────────────
 *
 * The caller decides. A window that vanished when the server said no would
 * take the member's typing with it.
 */

export default function Dialog({
  open,
  title,
  onClose,
  children,
  acts,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** The bar at the foot. The act that closes the window belongs here. */
  acts: ReactNode;
}) {
  const { t } = useI18n();
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;

    opener.current = document.activeElement;
    // The first thing a person can type into, or the panel itself.
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      {/* The ground behind it, which also closes it. */}
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
        className="relative flex max-h-[88vh] w-full max-w-[560px] flex-col overflow-hidden rounded-sheet bg-raised shadow-card outline-none"
      >
        <div className="border-b border-line px-5 py-3.5 sm:px-6">
          <h2 className="font-display text-sub leading-tight tracking-title text-paper">
            {title}
          </h2>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-ink/40 px-5 py-3 sm:px-6">
          {acts}
        </div>
      </div>
    </div>
  );
}
