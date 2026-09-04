import { useEffect, useState } from 'react';
import { oversight, type ComputationList, type HistoryEntry } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Steps } from './calc.js';
import { Tag } from './ui.js';

/**
 * What the board has noted, and what happened to each.
 *
 * ── the superseded and the withdrawn are here on purpose ──────────────────
 *
 * A list showing only the survivor would hide the revision, and the revision
 * is the part worth reading: a board that corrected a zakat figure twice
 * should see that it did, and an auditor asking why the figure changed should
 * find the answer here rather than in somebody's memory.
 *
 * So each entry says what state it is in. A superseded one names what replaced
 * it. A withdrawn one carries the reason and the name of whoever withdrew it,
 * because a figure that left the record without either is a figure that
 * vanished.
 *
 * ── and none of it is a verdict ───────────────────────────────────────────
 *
 * The working is under every figure, the note saying what the calculation did
 * not answer travels with it, and nothing here says a board agreed with what
 * it noted.
 */

function tone(state: HistoryEntry['state']): 'warn' | 'ok' | undefined {
  if (state === 'withdrawn') return 'warn';
  if (state === 'standing') return 'ok';
  return undefined;
}

function Entry({ entry }: { entry: HistoryEntry }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const c = entry.computation;

  return (
    <li
      className={
        'rounded-lg border px-4 py-3 ' +
        (entry.state === 'standing' ? 'border-line' : 'border-line/60 opacity-75')
      }
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <Tag tone={tone(entry.state)}>{t(`recorded.${entry.state}`)}</Tag>
        <span className="text-[13px] font-medium">{t(`calc.tab.${c.kind}`)}</span>
        <span className="font-mono text-[12px] tabular-nums text-muted">
          {c.periodFrom} – {c.periodTo}
        </span>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[12.5px] text-muted">{c.headline}</span>
        <span className="font-mono text-[15px] tabular-nums">
          {c.amount} {c.currency}
        </span>
      </div>

      <p className="mt-1 text-[12px] leading-relaxed text-muted">
        {t('recorded.by')} {c.recordedBy} · {c.recordedAt.slice(0, 10)} · {c.source}
      </p>

      {/*
        A figure that left the record without a reason and a name is a figure
        that vanished, so both are shown rather than filed behind a click.
      */}
      {entry.state === 'withdrawn' && (
        <p className="mt-1.5 rounded border border-warn/40 px-2.5 py-1.5 text-[12px] leading-relaxed text-warn">
          {t('recorded.withdrawnBy')} {c.withdrawnBy} — {c.withdrawalReason}
        </p>
      )}
      {entry.state === 'superseded' && entry.replacedBy && (
        <p className="mt-1.5 text-[12px] text-muted">
          {t('recorded.replacedBy')} <span className="font-mono">{entry.replacedBy.slice(0, 8)}</span>
        </p>
      )}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mt-2 text-[12px] text-muted underline underline-offset-2 hover:text-paper"
      >
        {open ? t('recorded.hideWorking') : t('recorded.showWorking')}
      </button>

      {open && (
        <div className="mt-2">
          <p className="mb-2 text-[12.5px] leading-relaxed text-muted">{c.methodStated}</p>
          <Steps steps={c.steps} />
          {/* Carried from the server, so nothing here can soften it. */}
          <p className="mt-2 text-[12px] leading-relaxed text-muted">{c.note}</p>
        </div>
      )}
    </li>
  );
}

export default function Recorded({ kind, assetId }: { kind?: string; assetId?: string }) {
  const { t } = useI18n();
  const [data, setData] = useState<ComputationList | null>(null);

  useEffect(() => {
    oversight
      .computations({ kind, assetId })
      .then((d) => {
        // A payload that is not the shape this expects is treated as nothing
        // recorded. A panel is not worth taking a page down for.
        if (!d || !Array.isArray(d.history)) return;
        setData(d);
      })
      .catch(() => undefined);
  }, [kind, assetId]);

  if (!data) return null;

  if (data.history.length === 0) {
    return <p className="text-[12.5px] leading-relaxed text-muted">{t('recorded.none')}</p>;
  }

  // Newest first: a reader opening this wants the current figure, and the
  // revisions behind it in the order they were made.
  const entries = [...data.history].reverse();

  return (
    <div>
      <ul className="space-y-2">
        {entries.map((e) => (
          <Entry key={e.computation.id} entry={e} />
        ))}
      </ul>
      <p className="mt-3 rounded border border-line bg-surface/60 px-3 py-2.5 text-[12.5px] leading-relaxed text-muted">
        {data.whatRecordingMeans}
      </p>
    </div>
  );
}
