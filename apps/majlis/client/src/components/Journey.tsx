import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '../lib/i18n.js';
import { journeyFor, DESK_BAR, PHASE_BAR } from '../lib/journey.js';
import { isInstitution, useIdentity } from '../lib/identity.js';

/**
 * Whose bar and whose words these are.
 *
 * Read once per component rather than threaded through, because every one of
 * the three asks the same question and a component that forgot to ask would
 * silently show a bank the board's line — which is the fault this overlay
 * exists to close.
 */
function useDesk(): boolean {
  const { identity } = useIdentity();
  return isInstitution(identity?.role);
}

/**
 * The three things every screen owes a reader who has never seen this before.
 *
 * A Shariah scholar is not going to be trained on software. They will be given
 * a link and an hour. Everything they need in order to use this has to be on
 * the screen they are looking at:
 *
 *   1. **Where am I** — the four phases, current one lit, at the top.
 *   2. **What do I do here** — one line, addressed to me, under the phases.
 *   3. **What happens next** — real links, at the foot, on every screen.
 *
 * All three come from `lib/journey.ts` and are rendered by the frame, so no
 * screen can be missing them and no screen can be a dead end.
 */

/**
 * Where this screen sits, as four steps.
 *
 * A question is asked, the board decides it, the decision governs the bank,
 * somebody checks the bank obeyed. That is the whole of the work and it is the
 * whole of the application, so it is drawn at the top of everything rather
 * than being something a reader has to infer from a rail.
 *
 * Each step is a link, because knowing where you are is only half of it.
 */
export function PhaseBar() {
  const { t } = useI18n();
  const desk = useDesk();
  const here = journeyFor(useLocation().pathname, desk);
  const at = here?.phase ?? null;

  // A bank was shown the board's four stages above every screen, including
  // its own. None of them is a place a bank stands.
  const bar = desk ? DESK_BAR : PHASE_BAR;
  const index = at ? bar.findIndex((p) => p.phase === at) : -1;

  return (
    <nav aria-label={t('journey.where')} className="mb-6 overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1">
        {bar.map((p, i) => {
          const current = p.phase === at;
          const passed = index >= 0 && i < index;
          return (
            <li key={p.phase} className="flex items-center gap-1">
              <Link
                to={p.to}
                aria-current={current ? 'step' : undefined}
                className={
                  'flex items-baseline gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] leading-none transition-colors ' +
                  (current
                    ? 'bg-lapis font-bold text-white'
                    : passed
                      ? 'text-sand hover:text-paper'
                      : 'text-muted hover:text-sand')
                }
              >
                <span className="font-mono text-[10px] opacity-70">{p.ordinal}</span>
                {t(p.label)}
              </Link>
              {i < bar.length - 1 && (
                <span aria-hidden="true" className="text-[11px] text-muted opacity-30">
                  ›
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * What you do here, in the second person.
 *
 * Distinct from the sentence a page already carries about what it *is*. Every
 * screen described itself and none addressed the reader, which is why a
 * scholar could read a whole screen and still not know whether anything on it
 * was theirs to touch.
 */
export function WhatYouDo() {
  const { t } = useI18n();
  const here = journeyFor(useLocation().pathname, useDesk());
  if (!here) return null;

  return (
    <p className="mb-6 flex gap-2.5 text-[13.5px] leading-[1.6] text-paper">
      <span aria-hidden="true" className="mt-[7px] h-[6px] w-[6px] shrink-0 rounded-full bg-lapis" />
      <span className="max-w-[64ch]">{t(here.does)}</span>
    </p>
  );
}

/**
 * What happens next, at the foot of every screen.
 *
 * This is the part that turns twenty-six filing drawers into paths. Three of
 * the screens offered no act and no onward link at all, and every one of them
 * ended by simply stopping. A reader who finishes a screen and is offered
 * nothing concludes, correctly, that the application has nothing more.
 */
export function WhatNext() {
  const { t } = useI18n();
  const path = useLocation().pathname;
  const here = journeyFor(path, useDesk());
  if (!here || here.next.length === 0) return null;

  const onward = here.next.filter((n) => n.to !== path);
  if (onward.length === 0) return null;

  return (
    <section className="mt-12 border-t border-line pt-6">
      <h2 className="mb-3.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {t('journey.next')}
      </h2>
      <ul className="flex flex-wrap gap-2.5">
        {onward.map((n) => (
          <li key={n.to}>
            <Link
              to={n.to}
              className="inline-flex items-center gap-2 rounded-xl bg-raised px-4 py-2.5 text-[13px] text-paper shadow-ring transition-all hover:-translate-y-px hover:shadow-card"
            >
              {t(n.label)}
              <span aria-hidden="true" className="text-muted">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
