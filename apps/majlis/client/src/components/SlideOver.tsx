import { useEffect, useRef, type ReactNode } from 'react';
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
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
        className="relative flex h-full w-full max-w-[720px] flex-col overflow-hidden bg-raised shadow-card outline-none"
      >
        <div className="flex items-start gap-4 border-b border-line px-5 py-3.5 sm:px-6">
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
