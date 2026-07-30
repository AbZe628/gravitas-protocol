import { useEffect, useState } from 'react';
import { api, type Rule } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Card, DateText, ErrorText, Loading, Sources, Tag } from '../components/ui.js';

export default function Rules() {
  const { t } = useI18n();
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.rules().then(setRules).catch(() => setFailed(true));
  }, []);

  if (failed) return <ErrorText />;
  if (!rules) return <Loading />;

  return (
    <div>
      <h1 className="mb-5 text-[19px] font-semibold">{t('nav.rules')}</h1>
      <ul className="space-y-4">
        {rules.map((r) => (
          <li key={r.id}>
            <Card>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Tag tone="gold">
                  {t('rule.version')} {r.version}
                </Tag>
                {r.parameterHashVerified ? (
                  <Tag tone="ok">{t('rule.hashOk')}</Tag>
                ) : (
                  <Tag tone="warn">{t('rule.hashBad')}</Tag>
                )}
              </div>
              <h2 className="text-[15px] font-medium leading-snug">{r.title}</h2>
              <div className="mt-1 text-[12px] text-muted">
                {t('rule.inForceFrom')} <DateText iso={r.inForceFrom} />
              </div>

              <div className="mt-3 text-[11px] uppercase tracking-wider text-muted">
                {t('rule.statement')}
              </div>
              <p className="mt-1 text-[14px] text-paper/85">{r.statement}</p>

              <dl className="mt-4 space-y-2.5 border-t border-line pt-3">
                {r.parameters.map((p) => (
                  <div key={p.key}>
                    <dt className="font-mono text-[12px] text-goldsoft break-all">
                      {p.key} = {p.value}
                      {p.unit ? <span className="text-muted"> {p.unit}</span> : null}
                    </dt>
                    <dd className="mt-0.5 text-[13px] text-paper/70">{p.meaning}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-3 font-mono text-[10px] break-all text-muted">
                {r.parameterHash}
              </div>

              <Sources sources={r.sources} />
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
