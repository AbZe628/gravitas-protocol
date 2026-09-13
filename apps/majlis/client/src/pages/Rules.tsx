import { useEffect, useState } from 'react';
import { api, oversight, type ReviewStatus, type Rule } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { DocumentLink } from '../components/Documents.js';
import { Nothing } from '../components/page.js';
import { ListPage, Row, Rows } from '../components/shapes.js';
import { DateText, ErrorText, Loading } from '../components/ui.js';
import { State, type Tone } from '../components/kit.js';

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
 *
 * ── the ruling itself is a page now ───────────────────────────────────────
 *
 * This screen used to print every ruling in full — statement, figures, hash
 * and sources — so the most consequential record in the application existed
 * only as a card in a column and could not be linked to. Each one has its own
 * page; what is left here is the list, and the one fact a member scans for,
 * which is whether it is due back.
 */

/** Where a ruling stands with its review, and the one colour that is entitled to. */
function reviewTone(review: ReviewStatus | undefined): Tone {
  if (!review) return 'plain';
  if (review.overdue || review.state === 'unscheduled') return 'breach';
  if (review.state === 'due') return 'attention';
  return 'settled';
}

function reviewWord(review: ReviewStatus | undefined, t: (k: string) => string): string {
  if (!review) return t('rule.inForce');
  if (review.state === 'unscheduled') return t('review.unscheduled');
  if (review.overdue) return t('review.overdue');
  if (review.state === 'due') return t('review.due');
  return t('rule.inForce');
}

export default function Rules({ embedded = false }: { embedded?: boolean }) {
  const { t } = useI18n();
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [reviews, setReviews] = useState<Map<string, ReviewStatus>>(new Map());
  const [dueCount, setDueCount] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api
      .rules()
      .then((r) => (Array.isArray(r) ? setRules(r) : setFailed(true)))
      .catch(() => setFailed(true));
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

  const list =
    rules.length === 0 ? (
      <Nothing>{t('rule.none')}</Nothing>
    ) : (
      <Rows>
        {rules.map((r) => {
          const review = reviews.get(r.id);
          return (
            <Row
              key={r.id}
              to={`/rules/${r.id}`}
              phase="inforce"
              kind={`${t('rule.version')} ${r.version}`}
              title={r.title}
              note={
                <>
                  <span className="line-clamp-2">{r.statement}</span>
                  {r.inForceFrom && (
                    <span className="mt-0.5 block text-[11.5px]">
                      {t('rule.inForceFrom')} <DateText iso={r.inForceFrom} />
                    </span>
                  )}
                </>
              }
              standing={<State tone={reviewTone(review)}>{reviewWord(review, t)}</State>}
            />
          );
        })}
      </Rows>
    );

  const live = (
    <span className="text-[13px] text-muted">
      <span className="font-mono tabular-nums text-paper">{rules.length}</span>{' '}
      <span>{t('rule.inForce')}</span>
      {dueCount > 0 && (
        <>
          <span className="mx-2 opacity-40">·</span>
          <span className="font-mono tabular-nums text-goldsoft">{dueCount}</span>{' '}
          <span className="text-goldsoft">{t('review.dueCount')}</span>
        </>
      )}
    </span>
  );

  /*
   * Inside "What stands" this is one of two views under a heading that is
   * already set, so it contributes the list and nothing above it. On its own
   * path it is a list screen like every other.
   */
  if (embedded) {
    return (
      <div>
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
          {live}
          <DocumentLink
            href={oversight.hrefs.manual()}
            label={t('doc.manual')}
            note={t('doc.manualNote')}
          />
        </div>
        {list}
      </div>
    );
  }

  return (
    <ListPage
      phase="inforce"
      title={t('nav.rules')}
      says={t('rule.lead')}
      live={live}
      act={
        <DocumentLink
          href={oversight.hrefs.manual()}
          label={t('doc.manual')}
          note={t('doc.manualNote')}
        />
      }
    >
      {list}
    </ListPage>
  );
}
