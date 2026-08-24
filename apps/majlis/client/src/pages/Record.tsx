import { useEffect, useState } from 'react';
import { api, type AssistantExchange, type Health } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Card, DateText, Tag } from '../components/ui.js';

export default function Record() {
  const { t } = useI18n();
  const [log, setLog] = useState<AssistantExchange[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.assistantLog().then(setLog).catch(() => setLog([]));
    api.health().then(setHealth).catch(() => setHealth(null));
  }, []);

  async function exportAudit() {
    setExporting(true);
    try {
      const boards = await api.boards();
      if (!boards.length) return;
      const data = await api.exportBoard(boards[0].id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `majlis-audit-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <h1 className="mb-5 text-[19px] font-semibold">{t('record.title')}</h1>

      {health?.recordSince && (
        <div className="mb-5 rounded-lg border border-line bg-surface/40 px-4 py-3">
          <div className="text-[13px] text-paper">
            {t('record.since')} <DateText iso={health.recordSince} />
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{t('record.notDurable')}</p>
        </div>
      )}

      <Card>
        <div className="text-[15px] font-medium">{t('record.export')}</div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{t('record.exportNote')}</p>
        <button
          type="button"
          onClick={exportAudit}
          disabled={exporting}
          className="mt-3 rounded bg-gold/20 px-4 py-2 text-[13px] text-goldsoft transition-colors hover:bg-gold/30 disabled:opacity-40"
        >
          {exporting ? t('common.loading') : t('record.export')}
        </button>
      </Card>

      <h2 className="mb-2 mt-8 text-[13px] font-semibold uppercase tracking-[0.14em] text-muted">
        {t('record.assistantLog')}
      </h2>
      <p className="mb-4 text-[13px] leading-relaxed text-muted">{t('record.assistantLogNote')}</p>

      {log.length === 0 ? (
        <p className="text-[13px] text-muted">{t('common.none')}</p>
      ) : (
        <ul className="space-y-3">
          {log.map((x) => (
            <li key={x.id} className="rounded-lg border border-line p-3.5">
              <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[12px] text-muted">
                <DateText iso={x.at} />
                {x.declinedAsRuling && <Tag tone="warn">{t('asst.declined')}</Tag>}
                {x.escalated && <Tag tone="gold">{t('asst.escalated')}</Tag>}
              </div>
              <div className="text-[14px]">{x.question}</div>
              <div className="mt-1.5 text-[13px] text-paper/70 line-clamp-3">{x.answer}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
