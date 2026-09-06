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
      <h2 className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
        {title}
      </h2>
      <div className="text-[15px] leading-[1.65] text-sand">{children}</div>
    </section>
  );
}

export function Card({ children, accent }: { children: ReactNode; accent?: boolean }) {
  return (
    <div
      className={
        'rounded-card p-4 ' +
        (accent ? 'bg-raised shadow-[0_0_0_1px_rgba(176,132,48,0.3),0_1px_2px_rgba(25,23,19,0.045),0_12px_24px_-14px_rgba(25,23,19,0.16)]' : 'bg-raised shadow-card')
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
    gold: 'bg-[#FBF4E4] text-gold shadow-[0_0_0_0.5px_rgba(176,132,48,0.22)]',
    warn: 'bg-[#FBF4E4] text-gold shadow-[0_0_0_0.5px_rgba(176,132,48,0.22)]',
    ok: 'bg-[#EBF3EF] text-settled shadow-[0_0_0_0.5px_rgba(44,107,87,0.18)]',
    // The fourth state the palette has and this had no name for: overdue,
    // refused, a threshold crossed. Callers were reaching for 'warn', which
    // is gold, which is a clock that is still running.
    breach: 'bg-[#FCF0EE] text-breach shadow-[0_0_0_0.5px_rgba(154,56,48,0.18)]',
  } as const;
  return (
    <span
      className={
        'inline-block rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] ' +
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
      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
        {t('matter.sources')}
      </div>
      <ul className="space-y-1">
        {sources.map((s, i) => (
          <li key={`${s.ref}-${i}`} className="text-[13px] text-muted">
            <span className="text-lapis">{s.kind}</span>
            <span className="mx-1.5 opacity-40">·</span>
            <span className="break-all font-mono text-[12px]">{s.ref}</span>
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
