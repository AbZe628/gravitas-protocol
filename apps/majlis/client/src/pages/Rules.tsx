import { useEffect, useState } from 'react';
import { api, oversight, type ReviewStatus, type Rule } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Card, DateText, ErrorText, Loading, Sources, Tag } from '../components/ui.js';
import { DocumentLink } from '../components/Documents.js';

/**
 * What is in force, and when each of it comes back to the board.
 *
 * The review state belongs here rather than on a page of its own. A scholar
 * looking at a rule and a scholar wondering when it is next examined are the
 * same person on the same errand, and a separate screen would mean the answer
 * is somewhere they have to remember to go.
 *
 * A rule nothing will ever bring back is called out as loudly as one that is
 * late, because it is the same failure further along: a ruling quietly
 * governing a structure that has changed. The difference is only that nobody
 * has noticed yet.
 */

function ReviewLine({ review }: { review: ReviewStatus | undefined }) {
  const { t } = useI18n();
  if (!review) return null;

  if (review.state === 'unscheduled') {
    return (
      <div className="mt-3 border-t border-line pt-2.5 text-[12px] leading-relaxed">
        <Tag tone="warn">{t('review.unscheduled')}</Tag>
        <p className="mt-1.5 text-muted">{t('review.unscheduledNote')}</p>
      </div>
    );
  }

  if (review.state === 'not_applicable') return null;

  const days = Math.round(Math.abs(review.daysUntilDue ?? 0));
  return (
    <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-line pt-2.5 text-[12px]">
      {review.overdue ? (
        <>
          <Tag tone="warn">{t('review.overdue')}</Tag>
          <span className="tabular-nums text-warn">
            {days} {t('attention.days')}
          </span>
        </>
      ) : review.state === 'due' ? (
        <Tag tone="gold">{t('review.due')}</Tag>
      ) : (
        <span className="text-muted">
          {t('review.next')} <DateText iso={review.dueAt} />
        </span>
      )}
    </div>
  );
}

export default function Rules() {
  const { t } = useI18n();
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [reviews, setReviews] = useState<Map<string, ReviewStatus>>(new Map());
  const [dueCount, setDueCount] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.rules().then(setRules).catch(() => setFailed(true));
    // A failure here takes nothing off the page: the rules render without
    // their review state rather than the page refusing to load.
    oversight
      .reviews()
      .then((r) => {
        setReviews(new Map((r.items ?? []).map((x) => [x.ruleId, x])));
        setDueCount(r.due ?? 0);
      })
      .catch(() => undefined);
  }, []);

  if (failed) return <ErrorText />;
  if (!rules) return <Loading />;

  return (
    <div>
      <h1 className="mb-1 text-[19px] font-semibold">{t('nav.rules')}</h1>

      <div className="mb-5 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[13px] text-muted">
        <span className="tabular-nums">
          {rules.length} {t('rule.inForce')}
        </span>
        {dueCount > 0 && (
          <span className="text-goldsoft tabular-nums">
            {dueCount} {t('review.dueCount')}
          </span>
        )}
      </div>

      <div className="mb-7">
        <DocumentLink
          href={oversight.hrefs.manual()}
          label={t('doc.manual')}
          note={t('doc.manualNote')}
        />
      </div>

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

              <ReviewLine review={reviews.get(r.id)} />

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
