import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, oversight, type Passage, type ReviewStatus, type Rule } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { mayDeliberate, useIdentity } from '../lib/identity.js';
import ReconsiderThis from '../components/ReconsiderThis.js';
import HowOftenItComesBack from '../components/HowOftenItComesBack.js';
import Holding from '../components/Holding.js';
import { DocumentLink } from '../components/Documents.js';
import WhatItMeans from '../components/WhatItMeans.js';
import { Nothing } from '../components/page.js';
import { ActionPanel, Facts, RecordPage } from '../components/shapes.js';
import { DateText, ErrorText, Loading, Section, Sources, Tag } from '../components/ui.js';
import WorkWindow, { type WorkPanel } from '../components/WorkWindow.js';

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
  /** The review's reading, for who is carrying it. Not required; without it nothing is offered. */
  const [passage, setPassage] = useState<Passage | null>(null);
  const [failed, setFailed] = useState(false);

  const readPassage = () =>
    oversight
      .passageOf('review', id)
      .then((p) => setPassage(Array.isArray(p?.groups) ? p : null))
      .catch(() => setPassage(null));

  /*
   * Where the ruling stands on coming back, read on its own.
   *
   * Both of these, after an act, and not only the passage. Saying how often a
   * ruling comes back landed, the step closed and the ruling left the queue —
   * and this page went on saying *no review scheduled* in its chip and beside
   * its facts, because the review status had been read once when the page
   * opened and nothing read it again. The record was right and the screen was
   * a version behind, which is worse than either.
   */
  const readReview = () =>
    oversight
      .reviewOf(id)
      .then((r) => setReview(r && typeof r.state === 'string' ? r : undefined))
      .catch(() => undefined);

  const readAgain = () => {
    void readPassage();
    void readReview();
  };

  useEffect(() => {
    void readPassage();
    api
      .rules()
      .then((r) => (Array.isArray(r) ? setRules(r) : setFailed(true)))
      .catch(() => setFailed(true));
    // A failure here takes nothing off the page: the ruling renders without
    // its review state rather than the page refusing to load.
    void readReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (failed) return <ErrorText />;
  if (!rules) return <Loading />;

  const rule = rules.find((r) => r.id === id);
  if (!rule) return <Nothing>{t('rule.notFound')}</Nothing>;

  const canOpen = mayDeliberate(identity?.role);
  const unscheduled = review?.state === 'unscheduled';
  /*
   * The board has said it does not come back on a date. Not the same as
   * `unscheduled`, which is nobody having answered — and for a while both read
   * as *no review scheduled* beside the facts, so a board that had answered
   * was shown its own decision as the gap it had just closed.
   */
  const noClock = review?.state === 'no_clock';
  const nextReview = review?.dueAt ? (
    <DateText iso={review.dueAt} />
  ) : noClock ? (
    t('review.notOnAClock')
  ) : (
    t('review.unscheduled')
  );
  /*
   * Saying how often a ruling comes back is a signatory's, because it is the
   * board deciding when it will look at its own ruling again. The route
   * refuses the rest, and a control that cannot be honoured is absent.
   */
  const maySayInterval = identity?.role === 'signatory';
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
        {/*
          Who is bringing it back before the board. Offered only where the
          server says there is something left for the board to do — a ruling
          whose review is years away has nothing to take on.
        */}
        {passage && <Holding passage={passage} onChanged={readAgain} />}
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
            value: nextReview,
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

  const states = (
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
  );

  /* The ruling's own text, after its statement: the six answers, the fingerprint, what it rests on. */
  const theRest = (
    <>
      {/*
        The terms are not listed here first.

        They were, and the page then printed every term twice: once as a list
        under a heading, and again inside the six answers, split across the
        questions each one belongs to. On a ruling that fixes no figure at all
        the heading was also a small lie, since it said *the figures this
        fixes* above a set of categories.

        Each term is shown once, under the question it answers. A term that
        says what happens on a breach appears at question five, where somebody
        is looking for it, rather than third in a list where it reads as a
        setting.
      */}
      <WhatItMeans ruleId={rule.id} />

      {/*
        The fingerprint is what a later reader checks the terms against, so it
        follows them rather than leading. Named, not left as a bare line of
        characters.
      */}
      <p className="mt-4 text-note text-muted">
        {t('rule.hashLabel')} <span className="break-all font-mono">{rule.parameterHash}</span>
      </p>

      <Sources sources={rule.sources} />
    </>
  );

  /*
   * A ruling that is waiting on the board is work, and is drawn as work.
   *
   * Its review has come round, or nothing will ever bring it back: the queue
   * opens it for that, and what a member arriving from there needs first is
   * the window every piece of work is — where the review stands, whose it is,
   * the one act — with the ruling itself beside it and its text underneath.
   * A ruling nobody is waiting on is a record to read, and keeps the record's
   * page: a window with nothing to do in it would be a frame around a document.
   */
  const reviewing = passage !== null && passage.next !== null && passage.next.whose !== 'clock';
  if (reviewing && passage) {
    const panels: WorkPanel[] = [
      {
        key: 'interval',
        /*
         * Saying how often, not reopening the ruling. The act here was
         * *look at this again*, which raises a matter about the ruling — the
         * only thing on the screen that could be pressed, so the step read as
         * answerable when nothing could answer it.
         */
        action: unscheduled ? (
          <HowOftenItComesBack rule={rule} canSay={maySayInterval} onSaid={readAgain} />
        ) : undefined,
      },
      {
        key: 'due',
        detail: review?.dueAt ? <DateText iso={review.dueAt} /> : undefined,
        summary: review?.dueAt ? <DateText iso={review.dueAt} /> : undefined,
      },
      {
        key: 'look',
        detail: <p className="max-w-[62ch] text-ui leading-relaxed text-sand">{next}</p>,
        action: dueNow ? <ReconsiderThis rule={rule} canOpen={canOpen} asAct /> : undefined,
      },
    ];
    return (
      <div className="space-y-8">
        <WorkWindow
          passage={passage}
          title={rule.title}
          chips={states}
          panels={panels}
          facts={[
            { label: t('rule.version'), value: rule.version },
            { label: t('rule.inForceFrom'), value: rule.inForceFrom ? <DateText iso={rule.inForceFrom} /> : '—' },
            { label: t('review.next'), value: nextReview },
          ]}
          documentLabel={t('rule.statement')}
          document={<p>{rule.statement}</p>}
          holding={(step) => <Holding passage={passage} step={step} onChanged={readAgain} />}
          holdingAll={<Holding passage={passage} onChanged={readAgain} />}
        />
        <section aria-label={t('rule.statement')}>{theRest}</section>
      </div>
    );
  }

  return (
    <RecordPage
      phase="inforce"
      title={rule.title}
      states={states}
      aside={aside}
    >
      {/* The board's own words, set the way the board's words are set. */}
      <Section title={t('rule.statement')}>
        <p className="max-w-[62ch] font-read text-sub leading-relaxed text-paper">
          {rule.statement}
        </p>
      </Section>

      {theRest}
    </RecordPage>
  );
}
