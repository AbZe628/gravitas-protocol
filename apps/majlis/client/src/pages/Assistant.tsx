import { useState } from 'react';
import { api, type AssistantExchange } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Sources, Tag } from '../components/ui.js';

export default function Assistant() {
  const { t } = useI18n();
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [thread, setThread] = useState<AssistantExchange[]>([]);

  async function submit() {
    const q = question.trim();
    if (q.length < 3 || busy) return;
    setBusy(true);
    setError(false);
    try {
      const result = await api.ask(q);
      setThread((prev) => [...prev, result]);
      setQuestion('');
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-[19px] font-semibold">{t('asst.title')}</h1>

      <div className="mb-6 rounded-lg border border-gold/40 bg-gold/[0.05] px-4 py-3 text-[13px] leading-relaxed text-paper/85">
        {t('asst.limits')}
      </div>

      {thread.length === 0 && !busy && (
        <p className="mb-6 text-[13px] text-muted">{t('asst.empty')}</p>
      )}

      <ul className="mb-6 space-y-5">
        {thread.map((x) => (
          <li key={x.id}>
            <div className="mb-2 rounded-lg border border-line px-3.5 py-2.5 text-[14px]">
              {x.question}
            </div>
            <div className="rounded-lg border border-line bg-surface px-3.5 py-3">
              {(x.declinedAsRuling || x.escalated) && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {x.declinedAsRuling && <Tag tone="warn">{t('asst.declined')}</Tag>}
                  {x.escalated && <Tag tone="gold">{t('asst.escalated')}</Tag>}
                </div>
              )}
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{x.answer}</p>
              <Sources sources={x.sources} />
            </div>
          </li>
        ))}
      </ul>

      {error && <div className="mb-4 text-[13px] text-warn">{t('asst.error')}</div>}

      <div className="sticky bottom-16 md:bottom-4">
        <div className="flex gap-2 rounded-lg border border-line bg-surface p-2">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
            }}
            rows={2}
            placeholder={t('asst.placeholder')}
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] outline-none placeholder:text-muted"
          />
          <button
            type="button"
            onClick={submit}
            disabled={busy || question.trim().length < 3}
            className="self-end rounded bg-gold/20 px-4 py-2 text-[13px] text-goldsoft transition-colors hover:bg-gold/30 disabled:opacity-40"
          >
            {busy ? t('asst.thinking') : t('asst.send')}
          </button>
        </div>
      </div>
    </div>
  );
}
