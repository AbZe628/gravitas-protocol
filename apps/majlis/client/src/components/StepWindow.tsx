import type { ReactNode } from 'react';
import { useI18n } from '../lib/i18n.js';

/**
 * A window, not a page.
 *
 * ── the criticism this answers ────────────────────────────────────────────
 *
 * > It looks like a web page, not an application.
 *
 * And it did. Every screen here was one column scrolling down a cream page:
 * a serif heading, paragraphs, an underlined link, another heading. That is
 * the shape of a document, and no amount of cutting words out of it changes
 * what it is. The earlier passes made the document shorter and it stayed a
 * document.
 *
 * What makes a thing read as an application is not decoration. It is that the
 * work sits in a frame that does not move: a strip across the top saying where
 * in the run you are, the work in the middle, the acts in a bar along the
 * bottom that is always in the same place, and the reference material in a
 * pane beside it rather than stacked above it. The frame stays; the contents
 * change as you go.
 *
 * ── the parts ─────────────────────────────────────────────────────────────
 *
 * `steps`   the strip. Each one is pressable, so a member can go back and look
 *           at what they answered without losing their place.
 * `aside`   the pane that does not change: the question, and what is not being
 *           decided. It scrolls on its own, so reading it never moves the work.
 * `acts`    the bar. One primary act on the right where a hand expects it,
 *           everything else to the left of it.
 *
 * ── and it is a real height ───────────────────────────────────────────────
 *
 * The window fills what is left of the viewport and the two panes scroll
 * inside it. That is the difference a person actually feels: the act bar is
 * where it was a minute ago instead of somewhere below the fold.
 */

export interface Step {
  id: string;
  /** `01`. Shown in the strip. */
  ordinal: string;
  /** Answered, open, or still to do. Decides how it is drawn. */
  state: 'done' | 'here' | 'todo' | 'contested';
  onOpen: () => void;
}

export default function StepWindow({
  title,
  chips,
  steps,
  heading,
  children,
  aside,
  acts,
  consequences,
}: {
  title: string;
  chips?: ReactNode;
  steps: readonly Step[];
  /** What this step is, in the strip's own words: "Step 2 of 6". */
  heading: string;
  children: ReactNode;
  aside?: ReactNode;
  acts: ReactNode;
  /**
   * What the acts in the bar will cause, said before any of them is pressed.
   *
   * The owner asked where these buttons lead, and it was a fair question:
   * *not met* puts a clause in the draft the bank receives, with a line saying
   * the agreement must provide for it, and *does not apply* drafts no clause
   * at all. Neither button said so. A person pressing one had no way to know
   * what they were causing, which is the opposite of a guided path.
   */
  consequences?: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <div className="flex h-[calc(100vh-7.5rem)] min-h-[560px] flex-col overflow-hidden rounded-sheet bg-raised shadow-card lg:h-[calc(100vh-6rem)]">
      {/* ── the title bar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-3.5 sm:px-6">
        <h1 className="min-w-0 flex-1 truncate font-display text-[17px] leading-tight tracking-[-0.014em] text-paper">
          {title}
        </h1>
        {chips}
      </div>

      {/* ── the strip: where in the run this is ───────────────────────── */}
      {steps.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto border-b border-line bg-ink/40 px-5 py-2.5 sm:px-6">
          {steps.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={s.onOpen}
              aria-current={s.state === 'here' ? 'step' : undefined}
              title={`${t('win.step')} ${s.ordinal}`}
              className={
                'grid h-7 w-7 shrink-0 place-items-center rounded-lg font-mono text-[11px] transition-colors ' +
                (s.state === 'here'
                  ? 'bg-lapis font-semibold text-white'
                  : s.state === 'done'
                    ? 'bg-[#EBF3EF] text-settled'
                    : s.state === 'contested'
                      ? 'bg-[#FBF1DF] text-gold'
                      : 'bg-raised text-muted shadow-ring')
              }
            >
              {s.ordinal}
            </button>
          ))}
        </div>
      )}

      {/* ── the work, and the pane beside it ──────────────────────────── */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            {heading}
          </div>
          {children}
        </div>

        {aside && (
          <aside className="min-h-0 shrink-0 overflow-y-auto border-line px-5 py-5 sm:px-6 lg:w-[320px] lg:border-s">
            {aside}
          </aside>
        )}
      </div>

      {/* ── the act bar, always in the same place ─────────────────────── */}
      {/*
        The end padding clears the guide bubble, which is fixed to that corner.
        Without it the primary act sits underneath the bubble and a member
        presses the wrong thing — found by looking at the screen rather than
        by reasoning about it.
      */}
      <div className="border-t border-line bg-ink/40">
        {consequences && (
          <div className="px-5 pt-3 sm:px-6">{consequences}</div>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-3 sm:px-6 lg:pe-[7.5rem]">
          {acts}
        </div>
      </div>
    </div>
  );
}
