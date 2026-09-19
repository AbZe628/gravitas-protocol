import type { ReactNode } from 'react';
import type { SourceRef } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';

/**
 * The oldest primitives in the application, and the most used — twenty-five
 * files import from here.
 *
 * They keep their exported shapes exactly, because changing an API across
 * twenty-five call sites in the same pass as a palette is how a change like
 * this goes wrong. What moved is only what they paint: a surface is now lifted
 * by shadow rather than fenced by a one-pixel border, and `ok` is the
 * `settled` green rather than a stray Tailwind emerald.
 *
 * See docs/DESIGN.md.
 */

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="mb-2.5 text-label font-bold uppercase tracking-caps text-muted">
        {title}
      </h2>
      <div className="text-lead leading-relaxed text-sand">{children}</div>
    </section>
  );
}

export function Card({ children, accent }: { children: ReactNode; accent?: boolean }) {
  return (
    <div
      className={
        'rounded-card p-4 ' +
        (accent ? 'bg-raised shadow-pickgold' : 'bg-raised shadow-card')
      }
    >
      {children}
    </div>
  );
}

export function Tag({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'gold' | 'warn' | 'ok' | 'breach';
}) {
  /*
   * A pill is a tinted ground with a half-pixel ring of its own colour, not an
   * outlined box. On a light ground an outline is loud and a tint is legible.
   */
  const tones = {
    neutral: 'bg-black/[0.045] text-sand',
    gold: 'bg-goldtint text-gold shadow-ringgold',
    warn: 'bg-goldtint text-gold shadow-ringgold',
    ok: 'bg-settledtint text-settled shadow-ringsettled',
    // The fourth state the palette has and this had no name for: overdue,
    // refused, a threshold crossed. Callers were reaching for 'warn', which
    // is gold, which is a clock that is still running.
    breach: 'bg-breachtint text-breach shadow-ringbreach',
  } as const;
  return (
    <span
      className={
        'inline-block rounded-full px-2.5 py-0.5 text-label font-bold uppercase tracking-label ' +
        tones[tone]
      }
    >
      {children}
    </span>
  );
}

export function Sources({ sources }: { sources: SourceRef[] }) {
  const { t } = useI18n();
  if (!sources.length) return null;
  return (
    <div className="mt-3 border-t border-line pt-3">
      <div className="mb-1.5 text-label font-bold uppercase tracking-caps text-muted">
        {t('matter.sources')}
      </div>
      <ul className="space-y-1">
        {sources.map((s, i) => (
          <li key={`${s.ref}-${i}`} className="text-ui text-muted">
            <span className="text-lapis">{s.kind}</span>
            <span className="mx-1.5 opacity-40">·</span>
            <span className="break-all font-mono text-note">{s.ref}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DateText({ iso }: { iso: string | null }) {
  if (!iso) return <span className="text-muted">—</span>;
  const d = new Date(iso);
  return (
    <time dateTime={iso} className="tabular-nums">
      {d.toISOString().slice(0, 10)}
    </time>
  );
}

/**
 * Waiting, said out loud.
 *
 * `role="status"` with `aria-live="polite"` means a screen reader announces
 * this when it arrives, and waits for a gap rather than cutting the member
 * off mid-sentence. `aria-busy` says the region is not finished, so a reader
 * that would otherwise read the half-built screen holds off.
 *
 * Before this, a member working by ear pressed something and heard nothing at
 * all: not while it waited, not when it failed, not when it arrived.
 */
export function Loading() {
  const { t } = useI18n();
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="py-10 text-center text-sm text-muted"
    >
      {t('common.loading')}
    </div>
  );
}

/**
 * A failure, said out loud, and said what it means.
 *
 * ── what this replaced ────────────────────────────────────────────────────
 *
 * Three words — *Could not load.* — on every screen in the application, in
 * every kind of failure. Measured across twenty screens with the server
 * returning 500 to everything: the same three words each time.
 *
 * They say what failed and nothing else. A member who sees them on the
 * register can reasonably read *the register is empty*; on a matter, *this
 * matter is gone*. The record is untouched and the screen does not say so.
 *
 * ── the three things a failure has to say ─────────────────────────────────
 *
 * What failed — reading, not writing. What it does not mean — the record
 * stands, nothing was lost. What to do — try again, and what it means if
 * trying again does not help.
 *
 * `role="alert"` rather than `status`: a refusal interrupts, because the
 * member may already have moved on believing the thing went through. It is
 * the one announcement on a screen allowed to cut across.
 */
export function ErrorText({ what }: { what?: string } = {}) {
  const { t } = useI18n();
  return (
    <div
      role="alert"
      className="mx-auto max-w-[56ch] rounded-card bg-breachtint px-5 py-4 text-ui leading-relaxed text-breach shadow-ringbreach"
    >
      <p className="font-semibold">
        {what ? `${t('common.error.what')} ${what}.` : t('common.error')}
      </p>
      <p className="mt-1.5 text-sand">{t('common.error.means')}</p>
      <p className="mt-1.5 text-muted">{t('common.error.todo')}</p>
    </div>
  );
}
