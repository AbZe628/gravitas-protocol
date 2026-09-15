import { useEffect, useState } from 'react';
import { oversight, type DayToDay, type TermCarried } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Gaps } from './page.js';

/**
 * The six questions every ruling answers, in the same six places.
 *
 * ── what this is for ──────────────────────────────────────────────────────
 *
 * *The tangible share must stay above fifty-one per cent* tells a person about
 * to place a trade almost nothing. It does not say where the share is read
 * from, that it moves during the day without anybody acting, that it is tested
 * before every transaction, that the transaction simply will not go through,
 * or who finds out.
 *
 * Those five things are known. They were shown in one place only — on a matter,
 * before the vote — and vanished the moment the matter carried. So a board
 * could read what its ruling would do while deciding it, and never again.
 *
 * ── an unanswered question is answered ────────────────────────────────────
 *
 * A ruling that fixes no figure has nothing measuring it, and the honest
 * answer to *how is it measured* is that only a person reading the file can
 * tell. That is said here, in that place. An empty box would let a board
 * assume the software has it covered, which is the more expensive mistake.
 *
 * ── the sentences are ours, the words in them are the board's ─────────────
 *
 * The server sends facts. Everything a reader sees that is not in quotation
 * marks is built from the dictionaries, so this is Arabic on an Arabic screen.
 * The statement and each term's meaning are the board's own writing and are
 * printed exactly as written, in the serif, never translated.
 */

/** One of the six. The number is part of the promise: same six, same order. */
function Question({
  n,
  heading,
  children,
}: {
  n: number;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <li className="border-t border-line py-4 first:border-t-0 first:pt-0">
      <div className="mb-1.5 flex items-baseline gap-2.5">
        <span className="font-mono text-note tabular-nums text-muted">{n}</span>
        <span className="text-label font-bold uppercase tracking-caps text-muted">
          {heading}
        </span>
      </div>
      <div className="max-w-[62ch] text-body leading-loose text-sand">{children}</div>
    </li>
  );
}

/** The board's own words, set the way the board's words are set everywhere. */
function Said({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-display text-lead leading-relaxed text-paper">{children}</p>
  );
}

/** A term, with its figure beside the board's sentence about it. */
function Term({ term }: { term: TermCarried }) {
  return (
    <li>
      <Said>{term.meaning}</Said>
      <p className="mt-0.5 break-all font-mono text-note text-muted">
        {term.key} = {term.value}
        {term.unit ? ` ${term.unit}` : ''}
      </p>
    </li>
  );
}

export default function WhatItMeans({ ruleId }: { ruleId: string }) {
  const { t } = useI18n();
  const [d, setD] = useState<DayToDay | null>(null);

  useEffect(() => {
    let live = true;
    oversight
      .dayToDay(ruleId)
      /*
       * A 200 carrying something else — a proxy's error page, an older server
       * that has no such route — must not render as six empty answers. The
       * same guard `Carrying.tsx` makes, for the same reason.
       */
      .then((x) => live && Array.isArray(x?.limits) && Array.isArray(x?.behaviours) && setD(x))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [ruleId]);

  if (!d) return null;

  return (
    <section className="mt-8">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-sub leading-snug tracking-tight text-paper">
          {t('six.title')}
        </h2>
        {d.attached && d.carrier && (
          <span className="text-note text-muted">
            {t('six.readBy')} {d.carrier}
          </span>
        )}
      </div>
      <p className="mb-4 max-w-[62ch] text-ui leading-relaxed text-muted">{t('six.lead')}</p>

      <ol className="rounded-sheet bg-raised px-6 py-5 shadow-ring">
        <Question n={1} heading={t('six.q1')}>
          <Said>{d.statement}</Said>
        </Question>

        {/*
          Four honest answers, not one with holes in it.

          A ruling with a figure and a source is measured. A ruling with a
          figure and no source has one somebody types in. A ruling with no
          figure at all is not measured — but if the board listed what it is
          checked against, that list is the answer and it is printed, because
          dropping it would lose the substance of the ruling to a technicality
          about the word *measured*.
        */}
        <Question n={2} heading={t('six.q2')}>
          <p>
            {d.figures.length > 0
              ? d.names.length > 0
                ? t('six.measured.fromASource')
                : t('six.measured.figureNoSource')
              : d.names.length > 0
                ? t('six.measured.againstAList')
                : t('six.measured.nothingMeasures')}
          </p>
          {(d.names.length > 0 || d.figures.length > 0) && (
            <ul className="mt-3 space-y-3">
              {[...d.names, ...d.figures].map((term) => (
                <Term key={term.key} term={term} />
              ))}
            </ul>
          )}
        </Question>

        <Question n={3} heading={t('six.q3')}>
          <p>
            {d.moves === 'with_what_it_is_read_from'
              ? t('six.moves.withSource')
              : t('six.moves.onlyBoard')}
          </p>
        </Question>

        <Question n={4} heading={t('six.q4')}>
          <p>
            {d.attached ? t('six.checked.everyTransaction') : t('six.checked.whenSomeoneLooks')}
          </p>
        </Question>

        <Question n={5} heading={t('six.q5')}>
          {d.behaviours.length > 0 ? (
            <ul className="space-y-3">
              {d.behaviours.map((b) => (
                <Term key={b.key} term={b} />
              ))}
            </ul>
          ) : (
            <p>{t('six.fails.nothingSays')}</p>
          )}
        </Question>

        <Question n={6} heading={t('six.q6')}>
          <p>{d.attached ? t('six.told.attached') : t('six.told.notAttached')}</p>
        </Question>
      </ol>

      <Gaps items={d.limits} />
    </section>
  );
}
