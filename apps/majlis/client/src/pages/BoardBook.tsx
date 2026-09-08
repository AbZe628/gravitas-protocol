import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type BoardBook as Book } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Loading, ErrorText } from '../components/ui.js';
import { State } from '../components/kit.js';
import { Division, Gaps, Nothing, Part, PageHead } from '../components/page.js';

/**
 * The board book: everything for one sitting, in one document.
 *
 * A director on every corporate board in the world gets this a few days
 * before a meeting and reads it on the way there. It is the one thing Diligent,
 * Boardvantage, Convene and BoardEffect all have and Majlis did not, and the
 * pieces had been here the whole time — the agenda knew which matters it
 * named, and every matter could already assemble its own pack.
 *
 * ── the last section is the one no corporate portal needs ─────────────────
 *
 * *Since the board last met* is the standing business: rulings whose review
 * date has passed, holdings that have left the limits a ruling set, holdings
 * nobody has examined. A corporate board's papers are the papers for the
 * items on the agenda. A Shariah board's are those, plus the question of
 * whether the last set of decisions is still being honoured — and the market
 * does not wait for somebody to draw up an agenda.
 *
 * ── nobody is absent until somebody says so ───────────────────────────────
 *
 * Before a meeting every member is unrecorded, not absent. The distinction is
 * the difference between a list and an accusation, and it is carried in the
 * data as `present: null` rather than fixed up here.
 */

function day(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 10);
}

const STANDING_TONE: Record<string, 'breach' | 'attention' | 'plain'> = {
  moved: 'breach',
  review_due: 'attention',
  never_examined: 'plain',
};

export default function BoardBook() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const [book, setBook] = useState<Book | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.book(id).then(setBook).catch(() => setFailed(true));
  }, [id]);

  if (failed) return <ErrorText />;
  if (!book) return <Loading />;

  const items = book.items ?? [];
  const expected = book.expected ?? [];

  /*
   * This sitting's first, then what is still open from before. The order is
   * the order a chair reads them in: what we agreed today, then what we have
   * not yet done from last time.
   */
  const undertaken = [
    ...(book.undertakings?.fromThisSitting ?? []),
    ...(book.undertakings?.stillOpenFromBefore ?? []),
  ];

  return (
    <article>
      <PageHead
        phase="deciding"
        tail={book.meetingId}
        title={t('book.title')}
        says={t('book.lead')}
        live={
          <>
            <State tone="plain">{day(book.at)}</State>
            <span className="text-[12.5px] text-muted">
              {items.length} {t('book.items')}
            </span>
          </>
        }
      />

      {/*
        The agenda, in the secretary's order. Every item that is a matter
        carries its whole pack; every item that is not says so, because an
        empty section under a heading reads as a matter with nothing in it.
      */}
      {items.length === 0 ? (
        <Nothing>{t('book.noAgenda')}</Nothing>
      ) : (
        items.map((entry) => (
          <Part
            key={entry.number}
            n={String(entry.number).padStart(2, '0')}
            heading={entry.item}
          >
            {entry.pack ? (
              <>
                <p className="max-w-[58ch] font-display text-[16px] leading-[1.6]">
                  {entry.pack.question.text}
                </p>

                {entry.pack.figures.terms.length > 0 && (
                  <ul className="mt-4 space-y-1.5">
                    {entry.pack.figures.terms.map((term) => (
                      <li key={term.key} className="flex flex-wrap items-baseline gap-x-3">
                        <span className="font-mono text-[13px] text-lapis">
                          {term.value}
                          {term.unit ? ` ${term.unit}` : ''}
                        </span>
                        <span className="text-[12.5px] text-muted">{term.meaning}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* The seams come with the papers, not after them. */}
                {entry.pack.gaps.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {entry.pack.gaps.map((gap, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="mt-[7px] h-[6px] w-[6px] shrink-0 rounded-full bg-gold/70" />
                        <span className="max-w-[58ch] text-[12.5px] leading-[1.6] text-sand">
                          {gap}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <Link
                  to={`/matters/${entry.matterId}`}
                  className="mt-4 inline-block text-[13px] font-semibold text-lapis underline decoration-line underline-offset-4"
                >
                  {t('book.openMatter')}
                </Link>
              </>
            ) : entry.missing ? (
              <p className="max-w-[58ch] text-[13px] leading-[1.65] text-breach">
                {t('book.itemMissing')}
              </p>
            ) : (
              <p className="max-w-[58ch] text-[13px] leading-[1.65] text-muted">
                {t('book.itemNotAMatter')}
              </p>
            )}
          </Part>
        ))
      )}

      {/*
        The standing business. Whether or not anybody put it on the agenda —
        which is exactly why it is here and not there.
      */}
      <Division heading={t('book.sinceWeMet')} note={t('book.sinceWeMetNote')}>
        {(book.sinceWeMet ?? []).length === 0 ? (
          <Nothing>{t('book.nothingStanding')}</Nothing>
        ) : (
          <ul className="space-y-2">
            {book.sinceWeMet.map((s, i) => (
              <li key={i} className="rounded-card bg-ink px-4 py-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <State tone={STANDING_TONE[s.kind] ?? 'plain'}>{t(`book.kind.${s.kind}`)}</State>
                  <span className="text-[13.5px] font-semibold">{s.what}</span>
                </div>
                <p className="mt-1.5 max-w-[58ch] text-[12.5px] leading-[1.6] text-muted">
                  {s.note}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Division>

      {/*
        What was agreed to. Both this sitting's and what is still open from
        before, because a director reading the papers wants to know what they
        undertook last time as much as what is on the agenda this time.
      */}
      <Division heading={t('book.undertaken')} note={t('book.undertakenNote')}>
        {undertaken.length === 0 ? (
          <Nothing>{t('book.nothingUndertaken')}</Nothing>
        ) : (
          <ul className="space-y-2">
            {undertaken.map((u) => (
              <li key={u.id} className="rounded-card bg-ink px-4 py-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <State tone={u.state === 'open' ? 'attention' : 'plain'}>
                    {t(`book.state.${u.state}`)}
                  </State>
                  <span className="text-[13px] font-semibold">{u.who}</span>
                  {u.dueAt ? (
                    <span className="font-mono text-[12px] text-muted">{day(u.dueAt)}</span>
                  ) : (
                    <span className="text-[12px] text-muted">{t('book.noDate')}</span>
                  )}
                </div>
                <p className="mt-1.5 max-w-[58ch] text-[13px] leading-[1.6] text-sand">{u.what}</p>
                {u.outcome && (
                  <p className="mt-1.5 max-w-[58ch] text-[12.5px] leading-[1.6] text-muted">
                    {u.outcome.said}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Division>

      <Division heading={t('book.expected')}>
        <ul className="space-y-2">
          {expected.map((e) => (
            <li key={e.scholarId} className="flex items-center gap-3">
              <span
                className={
                  'h-[7px] w-[7px] shrink-0 rounded-full ' +
                  (e.present === true ? 'bg-settled' : e.present === false ? 'bg-breach' : 'bg-line')
                }
              />
              <span className="min-w-0 flex-1 truncate text-[13px]">{e.name}</span>
              <span className="shrink-0 text-[12px] text-muted">
                {/* Unrecorded, never absent by default. */}
                {e.present === true
                  ? t('meet.present')
                  : e.present === false
                    ? t('meet.absent')
                    : t('book.notRecorded')}
                {e.note ? ` · ${e.note}` : ''}
              </span>
            </li>
          ))}
        </ul>
      </Division>

      <Gaps items={book.gaps ?? []} />

      <p className="mt-8 max-w-[62ch] text-[12px] leading-[1.6] text-muted">{t('book.print')}</p>
    </article>
  );
}
