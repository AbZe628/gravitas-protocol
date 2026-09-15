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

export function Loading() {
  const { t } = useI18n();
  return <div className="py-10 text-center text-sm text-muted">{t('common.loading')}</div>;
}

export function ErrorText() {
  const { t } = useI18n();
  return <div className="py-10 text-center text-sm text-breach">{t('common.error')}</div>;
}
