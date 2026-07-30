import type { ReactNode } from 'react';
import type { SourceRef } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-muted mb-2.5">
        {title}
      </h2>
      <div className="text-[15px] leading-[1.65] text-paper/90">{children}</div>
    </section>
  );
}

export function Card({ children, accent }: { children: ReactNode; accent?: boolean }) {
  return (
    <div
      className={
        'rounded-lg border p-4 ' +
        (accent ? 'border-gold/60 bg-gold/[0.06]' : 'border-line bg-surface')
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
  tone?: 'neutral' | 'gold' | 'warn' | 'ok';
}) {
  const tones = {
    neutral: 'border-line text-muted',
    gold: 'border-gold/60 text-goldsoft',
    warn: 'border-warn/60 text-warn',
    ok: 'border-emerald-700/60 text-emerald-400',
  } as const;
  return (
    <span
      className={
        'inline-block rounded border px-2 py-0.5 text-[11px] uppercase tracking-wider ' + tones[tone]
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
      <div className="text-[11px] uppercase tracking-wider text-muted mb-1.5">
        {t('matter.sources')}
      </div>
      <ul className="space-y-1">
        {sources.map((s, i) => (
          <li key={`${s.ref}-${i}`} className="text-[13px] text-muted">
            <span className="text-goldsoft">{s.kind}</span>
            <span className="mx-1.5 opacity-40">·</span>
            <span className="font-mono text-[12px] break-all">{s.ref}</span>
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
  return <div className="py-10 text-center text-muted text-sm">{t('common.loading')}</div>;
}

export function ErrorText() {
  const { t } = useI18n();
  return <div className="py-10 text-center text-warn text-sm">{t('common.error')}</div>;
}
