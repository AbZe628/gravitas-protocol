import { useEffect, useState } from 'react';
import { api, oversight, type AssistantExchange, type Health, type MatterSummary } from '../lib/api.js';
import { Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n.js';
import { Card, DateText, ErrorText, Loading, Tag } from '../components/ui.js';
import { DocumentLink, YearPicker } from '../components/Documents.js';

/** Everything this board has settled, newest first. */
const SETTLED = ['in_force', 'rejected', 'lapsed', 'withdrawn'];

function Decided({ matters }: { matters: MatterSummary[] | null }) {
  const { t } = useI18n();

  if (matters === null) return <p className="mb-6 text-[13px] text-muted">{t('common.loading')}</p>;

  const settled = matters
    .filter((m) => SETTLED.includes(m.status))
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt));

  return (
    <div className="mb-8">
      <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
        {t('decided.heading')}
      </h2>

      {settled.length === 0 ? (
        <p className="rounded-card bg-raised/60 px-5 py-4 text-[13px] leading-[1.6] text-muted shadow-ring">
          {t('decided.none')}
        </p>
      ) : (
        <ul className="space-y-2">
          {settled.map((m) => (
            <li key={m.id}>
              <Link
                to={`/matters/${m.id}`}
                className="block rounded-card bg-raised/75 px-5 py-4 shadow-ring transition-shadow hover:shadow-card"
              >
                <div className="mb-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  {/*
                    The two facts a reader scans for, before the title: what
                    became of it, and which way it went. A list of titles with
                    the outcome buried in the sentence is a list nobody can
                    read at a glance.
                  */}
                  <Tag tone={m.status === 'in_force' ? 'ok' : 'neutral'}>
                    {t(`matter.status.${m.status}`)}
                  </Tag>
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                    {t(`matter.direction.${m.direction}`)}
                  </span>
                  <span className="font-mono text-[11.5px] text-muted">
                    {m.openedAt.slice(0, 10)}
                  </span>
                </div>
                <div className="max-w-[52ch] font-display text-[16.5px] leading-snug text-paper">
                  {m.title}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Record({ embedded = false }: { embedded?: boolean }) {
  const { t } = useI18n();
  const [log, setLog] = useState<AssistantExchange[] | null>(null);
  const [decided, setDecided] = useState<MatterSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [exporting, setExporting] = useState(false);
  const [year, setYear] = useState(new Date().getUTCFullYear());

  useEffect(() => {
    api
      .assistantLog()
      .then((r) => (Array.isArray(r) ? setLog(r) : setFailed(true)))
      .catch(() => setFailed(true));
    api.health().then(setHealth).catch(() => setHealth(null));
    api
      .matters()
      .then((r) => setDecided(Array.isArray(r) ? r : []))
      .catch(() => setDecided([]));
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
      {!embedded && (<h1 className="mb-5 font-display font-normal leading-[1.12] tracking-[-0.024em] text-[30px] sm:text-[34px]">{t('record.title')}</h1>)}

      {/*
        What the board decided, which is what this page is named after and
        what it did not contain. Settled first and newest first: a decision
        made last week is the one somebody is looking for.
      */}
      <Decided matters={decided} />

      {health?.recordSince && (
        <div className="mb-5 rounded-card shadow-ring bg-raised px-4 py-3">
          <div className="text-[13px] text-paper">
            {t('record.since')} <DateText iso={health.recordSince} />
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{t('record.notDurable')}</p>
        </div>
      )}

      {/*
        The year's work, assembled. Above the raw export because it is the
        document a person reads; the JSON below it is what a system consumes,
        and offering the machine-readable one first would have the priorities
        the wrong way round.
      */}
      <div className="mb-4">
        <div className="mb-2 flex items-center gap-2 text-[13px] text-muted">
          <span>{t('doc.year')}</span>
          <YearPicker year={year} onChange={setYear} />
        </div>
        <DocumentLink
          href={oversight.hrefs.annual(year)}
          label={t('doc.annual')}
          note={t('doc.annualNote')}
        />
      </div>

      <Card>
        <div className="text-[15px] font-medium">{t('record.export')}</div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{t('record.exportNote')}</p>
        <button
          type="button"
          onClick={exportAudit}
          disabled={exporting}
          className="mt-3 rounded bg-lapis px-4 py-2 text-[13px] text-white font-semibold shadow-act transition-colors hover:bg-lapis disabled:opacity-40"
        >
          {exporting ? t('common.loading') : t('record.export')}
        </button>
      </Card>

      <h2 className="mb-2 mt-8 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
        {t('record.assistantLog')}
      </h2>
      <p className="mb-4 text-[13px] leading-relaxed text-muted">{t('record.assistantLogNote')}</p>

      {failed ? (
        <ErrorText />
      ) : !log ? (
        <Loading />
      ) : log.length === 0 ? (
        <p className="text-[13px] text-muted">{t('common.none')}</p>
      ) : (
        <ul className="space-y-3">
          {log.map((x) => (
            <li key={x.id} className="rounded-card shadow-ring p-3.5">
              <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[12px] text-muted">
                <DateText iso={x.at} />
                {x.declinedAsRuling && <Tag tone="warn">{t('asst.declined')}</Tag>}
                {x.escalated && <Tag tone="gold">{t('asst.escalated')}</Tag>}
              </div>
              <div className="text-[14px]">{x.question}</div>
              <div className="mt-1.5 text-[13px] text-sand line-clamp-3">{x.answer}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
