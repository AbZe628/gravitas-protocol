import { useState } from 'react';
import { api, type AssistantExchange } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { useHealth } from '../lib/health.js';
import { mayDeliberate, useIdentity } from '../lib/identity.js';
import RaiseAMatter from '../components/RaiseAMatter.js';
import { Nothing } from '../components/page.js';
import { PageHead } from '../components/page.js';
import { Sources, Tag } from '../components/ui.js';

export default function Assistant() {
  const { t } = useI18n();
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [thread, setThread] = useState<AssistantExchange[]>([]);
  const health = useHealth();
  const { identity } = useIdentity();

  /*
   * Off unless a key is configured, which is most installations. Until the
   * health answers, nothing is claimed either way.
   */
  const off = health?.assistantKind === 'off';

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
      <PageHead
        title={t('asst.title')}
        says={t('asst.lead')}
      />

      <div className="mb-6 rounded-card shadow-[0_0_0_0.5px_rgba(176,132,48,0.24)] bg-[#FBF4E4] px-4 py-3 text-[13px] leading-relaxed text-sand">
        {t('asst.limits')}
      </div>

      {/*
        "Nothing asked yet" belongs only where something could have been. On an
        installation with no assistant it read as a second, weaker version of
        the sentence at the bottom of the page saying there is nothing to ask.
      */}
      {thread.length === 0 && !busy && !off && (
        <p className="mb-6 text-[13px] text-muted">{t('asst.empty')}</p>
      )}

      <ul className="mb-6 space-y-5">
        {thread.map((x) => (
          <li key={x.id}>
            <div className="mb-2.5 rounded-card bg-black/[0.035] px-5 py-3 text-[14px] text-sand">
              {x.question}
            </div>
            <div className="rounded-card bg-raised px-5 py-4 shadow-card">
              {(x.declinedAsRuling || x.escalated) && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {x.declinedAsRuling && <Tag tone="breach">{t('asst.declined')}</Tag>}
                  {x.escalated && <Tag tone="gold">{t('asst.escalated')}</Tag>}
                </div>
              )}
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{x.answer}</p>
              <Sources sources={x.sources} />

              {/*
                What follows an answer. It is not a ruling and never becomes
                one by being read — the escalation tag was already saying to
                put it to the board, without giving anybody a way to.
              */}
              <RaiseAMatter
                boardId="demo-board"
                title={x.question.slice(0, 120)}
                proposal={x.question}
                direction="permit"
                origin="institution_request"
                label={t('asst.putToBoard')}
                note={t('asst.notARuling')}
                canOpen={mayDeliberate(identity?.role)}
              />
            </div>
          </li>
        ))}
      </ul>

      {error && <div className="mb-4 text-[13px] text-breach">{t('asst.error')}</div>}

      {/*
        Absent, not disabled. A question box on an installation with no
        assistant is a control that lies, and the lie is only discovered
        after somebody has written out their question.
      */}
      {off ? (
        <Nothing>{t('asst.isOff')}</Nothing>
      ) : (
      <div className="sticky bottom-16 md:bottom-4">
        <div className="flex gap-2 rounded-sheet bg-raised p-2.5 shadow-card">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
            }}
            rows={2}
            placeholder={t('asst.placeholder')}
            aria-label={t('asst.placeholder')}
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] outline-none placeholder:text-muted"
          />
          <button
            type="button"
            onClick={submit}
            disabled={busy || question.trim().length < 3}
            className="self-end rounded bg-lapis px-4 py-2 text-[13px] text-white font-semibold shadow-act transition-colors hover:bg-lapis disabled:opacity-40"
          >
            {busy ? t('asst.thinking') : t('asst.send')}
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
