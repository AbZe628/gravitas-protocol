import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, oversight, type ReviewStatus, type Rule } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { mayDeliberate, useIdentity } from '../lib/identity.js';
import ReconsiderThis from '../components/ReconsiderThis.js';
import { DocumentLink } from '../components/Documents.js';
import { Nothing } from '../components/page.js';
import { ActionPanel, Facts, RecordPage } from '../components/shapes.js';
import { DateText, ErrorText, Loading, Section, Sources, Tag } from '../components/ui.js';

/**
 * One ruling in force.
 *
 * This is the most consequential record in the application — it is what the
 * board decided, in the board's words, with the figures it fixed — and it had
 * no page of its own. It was a card in a column of cards, so a ruling could
 * not be linked to, sent to anybody, or opened from the register that it
 * governs.
 *
 * ── the review date decides whether there is an act ───────────────────────
 *
 * A ruling whose date has passed is waiting on the board and the panel says
 * so. One not yet due is not waiting on anybody, and offering to reconsider
 * it would invite a board to reopen everything it has ever decided. A ruling
 * nothing will ever bring back is the loudest of the three: it is the same
 * failure as an overdue one, further along, with nobody having noticed.
 */

export default function RuleDetail() {
  const { id = '' } = useParams();
  const { t } = useI18n();
  const { identity } = useIdentity();

  const [rules, setRules] = useState<Rule[] | null>(null);
  const [review, setReview] = useState<ReviewStatus | undefined>(undefined);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api
      .rules()
      .then((r) => (Array.isArray(r) ? setRules(r) : setFailed(true)))
      .catch(() => setFailed(true));
    // A failure here takes nothing off the page: the ruling renders without
    // its review state rather than the page refusing to load.
    oversight
      .reviews()
      .then((r) => setReview((r.items ?? []).find((x) => x.ruleId === id)))
      .catch(() => undefined);
  }, [id]);

  if (failed) return <ErrorText />;
  if (!rules) return <Loading />;

  const rule = rules.find((r) => r.id === id);
  if (!rule) return <Nothing>{t('rule.notFound')}</Nothing>;

  const canOpen = mayDeliberate(identity?.role);
  const unscheduled = review?.state === 'unscheduled';
  const dueNow = Boolean(review?.overdue) || review?.state === 'due';

  const next = unscheduled
    ? t('review.unscheduledNote')
    : dueNow
      ? t('rule.nextDue')
      : t('rule.nextStands');

  const aside = (
    <>
      <ActionPanel next={next}>
        {/*
          The act, only where the date has actually passed or nothing will ever
          bring this back. A control that cannot be honoured is absent rather
          than shown greyed out.
        */}
        {(dueNow || unscheduled) && <ReconsiderThis rule={rule} canOpen={canOpen} />}
      </ActionPanel>

      <Facts
        rows={[
          { label: t('rule.version'), value: rule.version },
          {
            label: t('rule.inForceFrom'),
            value: rule.inForceFrom ? <DateText iso={rule.inForceFrom} /> : '—',
          },
          {
            label: t('review.next'),
            value: review?.dueAt ? <DateText iso={review.dueAt} /> : t('review.unscheduled'),
          },
        ]}
      />

      <div className="mt-3.5">
        <DocumentLink
          href={oversight.hrefs.manual()}
          label={t('doc.manual')}
          note={t('doc.manualNote')}
        />
      </div>
    </>
  );

  return (
    <RecordPage
      phase="inforce"
      title={rule.title}
      states={
        <>
          <Tag tone="gold">
            {t('rule.version')} {rule.version}
          </Tag>
          {rule.parameterHashVerified ? (
            <Tag tone="ok">{t('rule.hashOk')}</Tag>
          ) : (
            <Tag tone="warn">{t('rule.hashBad')}</Tag>
          )}
          {review?.overdue ? <Tag tone="warn">{t('review.overdue')}</Tag> : null}
          {unscheduled ? <Tag tone="warn">{t('review.unscheduled')}</Tag> : null}
        </>
      }
      aside={aside}
    >
      {/* The board's own words, set the way the board's words are set. */}
      <Section title={t('rule.statement')}>
        <p className="max-w-[62ch] font-display text-[17px] leading-[1.6] text-paper">
          {rule.statement}
        </p>
      </Section>

      <Section title={t('rule.parameters')}>
        <dl className="space-y-3">
          {rule.parameters.map((p) => (
            <div key={p.key} className="rounded-card bg-raised px-4 py-3 shadow-ring">
              <dt className="break-all font-mono text-[12.5px] text-lapis">
                {p.key} = {p.value}
                {p.unit ? <span className="text-muted"> {p.unit}</span> : null}
              </dt>
              <dd className="mt-1 text-[13px] leading-[1.6] text-sand">{p.meaning}</dd>
            </div>
          ))}
        </dl>

        {/*
          The hash is what a later reader checks the figures against. It is
          named rather than left as a line of characters under a card.
        */}
        <p className="mt-3 text-[11.5px] text-muted">
          {t('rule.hashLabel')} <span className="break-all font-mono">{rule.parameterHash}</span>
        </p>
      </Section>

      <Sources sources={rule.sources} />
    </RecordPage>
  );
}
