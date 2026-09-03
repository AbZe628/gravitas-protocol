import { useI18n } from '../lib/i18n.js';

/**
 * The documents the record produces.
 *
 * These are whole pages designed for print, not data this interface renders.
 * That is why nothing here fetches: a link opens the document in its own tab and
 * the reader saves it with the browser, which is both simpler than a download
 * button and the thing a scholar actually wants — a tab they can read, print, or
 * send on.
 *
 * The label says where the click goes. A control called "Fatwa" that silently
 * opens a new tab has surprised the reader; one that says it opens the document
 * has not. Small, but this is the surface a bank will look at hardest.
 */

export function DocumentLink({
  href,
  label,
  note,
  emphasis,
}: {
  href: string;
  label: string;
  note: string;
  emphasis?: boolean;
}) {
  const { t } = useI18n();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className={
        'block rounded-lg border px-4 py-3 transition-colors ' +
        (emphasis
          ? 'border-gold/60 bg-gold/[0.06] hover:bg-gold/[0.1]'
          : 'border-line bg-surface hover:border-muted')
      }
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className={'text-[14px] font-medium ' + (emphasis ? 'text-goldsoft' : '')}>{label}</span>
        <span className="shrink-0 text-[11px] uppercase tracking-wider text-muted">
          {t('doc.opens')}
        </span>
      </div>
      <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{note}</p>
    </a>
  );
}

/**
 * A year to ask the annual report for.
 *
 * Offers the current year and the four before it and nothing else. A free date
 * field would invite a request for a year the record does not cover, and the
 * honest answer to that — an empty report — reads like a fault.
 */
export function YearPicker({
  year,
  onChange,
}: {
  year: number;
  onChange: (y: number) => void;
}) {
  const now = new Date().getUTCFullYear();
  const years = [0, 1, 2, 3, 4].map((n) => now - n);

  return (
    <select
      value={year}
      onChange={(e) => onChange(Number(e.target.value))}
      className="rounded border border-line bg-surface px-2 py-1 text-[13px] tabular-nums"
    >
      {years.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
}
