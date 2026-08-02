import { useEffect, useState } from 'react';
import { api, type Briefing } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Card, DateText, ErrorText, Loading, Sources, Tag } from '../components/ui.js';

export default function Briefings() {
  const { t } = useI18n();
  const [items, setItems] = useState<Briefing[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.briefings().then(setItems).catch(() => setFailed(true));
  }, []);

  if (failed) return <ErrorText />;
  if (!items) return <Loading />;

  return (
    <div>
      <h1 className="mb-5 text-[19px] font-semibold">{t('nav.briefings')}</h1>
      <ul className="space-y-5">
        {items.map((b) => (
          <li key={b.id}>
            <Card>
              <div className="mb-2 text-[12px] text-muted">
                <DateText iso={b.publishedAt} />
                <span className="mx-1.5 opacity-40">·</span>
                {t('brief.raisedBy')} {t(`brief.raisedBy.${b.raisedBy}`)}
              </div>
              <h2 className="text-[15px] font-medium leading-snug">{b.title}</h2>

              <div className="mt-4 text-[11px] uppercase tracking-wider text-muted">
                {t('brief.whatChanged')}
              </div>
              <p className="mt-1 text-[14px] text-paper/85">{b.whatChanged}</p>

              <div className="mt-3.5 text-[11px] uppercase tracking-wider text-muted">
                {t('brief.whyChanged')}
              </div>
              <p className="mt-1 text-[14px] text-paper/85">{b.whyChanged}</p>

              {b.touchesRules.length > 0 && (
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {b.touchesRules.map((r) => (
                    <Tag key={r}>{r}</Tag>
                  ))}
                </div>
              )}

              <div className="mt-4 rounded border border-gold/40 bg-gold/[0.06] p-3">
                <div className="text-[11px] uppercase tracking-wider text-goldsoft">
                  {t('brief.question')}
                </div>
                <p className="mt-1.5 text-[14px] leading-relaxed">{b.questionForBoard}</p>
              </div>

              <Sources sources={b.sources} />
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
