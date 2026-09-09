import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { oversight, type Cadence, type Calendar as CalendarData, type CalendarEntry } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { PageHead } from '../components/page.js';
import { DateText, ErrorText, Loading, Tag } from '../components/ui.js';

/**
 * What is coming.
 *
 * The fifth of the six surfaces, and the one that answers a question none of the
 * others do: not what needs me now, but what is going to.
 *
 * Grouped by how close it is rather than by kind, because a scholar planning a
 * week does not think "show me my ratification windows" — they think about what
 * lands before they travel. Something already past sits at the top and says so.
 *
 * The gaps are on the page, not in a footnote. A calendar missing the one
 * obligation with a regulatory floor behind it — the six-month meeting cadence,
 * which this system does not record — would be worse than no calendar, because
 * it would be trusted.
 */

const DAY = 86_400_000;

type Band = 'overdue' | 'week' | 'month' | 'later';

function bandOf(entry: CalendarEntry, now: number): Band {
  if (entry.overdue) return 'overdue';
  const days = (new Date(entry.at).getTime() - now) / DAY;
  if (days <= 7) return 'week';
  if (days <= 31) return 'month';
  return 'later';
}

const BANDS: Band[] = ['overdue', 'week', 'month', 'later'];

/** Where the entry points. A rule and an incident are not matters. */
function linkFor(entry: CalendarEntry): string | null {
  if (entry.kind === 'timelock_ends' || entry.kind === 'ratification_due') {
    return `/matters/${entry.subject}`;
  }
  if (entry.kind === 'rectification_due') return '/incidents';
  // The cadence entry is about the board rather than about a rule, and sending
  // it to the rules would be the one link on this page that lied.
  if (entry.kind === 'meeting_due') return '/meetings';
  return '/rules';
}

function Entry({ entry }: { entry: CalendarEntry }) {
  const { t } = useI18n();
  const to = linkFor(entry);

  const body = (
    <div
      className={
        'rounded-card px-5 py-4 ' +
        (entry.overdue
          ? 'bg-[#FCF0EE] shadow-[0_0_0_0.5px_rgba(154,56,48,0.2)]'
          : 'bg-raised shadow-ring')
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <Tag tone={entry.overdue ? 'breach' : undefined}>{t(`cal.kind.${entry.kind}`)}</Tag>
        <span className={entry.overdue ? 'text-[12px] font-semibold text-breach' : 'text-[12px] text-muted'}>
          <DateText iso={entry.at} />
        </span>
      </div>
      <div className="max-w-[46ch] font-display text-[18px] leading-snug tracking-[-0.012em]">
        {entry.title}
      </div>
      <p className="mt-2 max-w-[62ch] text-[12.5px] leading-[1.6] text-muted">{entry.note}</p>
      {entry.waitingOn.length > 0 && (
        <p className="mt-3 border-t border-line pt-2.5 text-[11.5px] text-muted">
          {t('cal.notYetFrom')} {entry.waitingOn.join(', ')}
        </p>
      )}
    </div>
  );

  return to ? (
    <Link to={to} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

/**
 * How often this board meets, and whether it is late.
 *
 * The one thing this screen has to answer and never did. It lives on
 * `/api/meetings` as `cadence` — last held, due by, whether a meeting is
 * already convened — and the calendar simply never asked for it, so a board
 * whose only obligation with a supervisory floor behind it is *meet every two
 * months* read "Nothing is due."
 *
 * It carries the act, because a screen that tells you a meeting is due and
 * makes you go and find where to convene one is a screen that has told you off
 * rather than helped you.
 */
function Rhythm({ cadence, nextConvened }: { cadence: Cadence | null; nextConvened: string | null }) {
  const { t } = useI18n();
  if (!cadence) return null;

  return (
    <section
      className={
        'mb-7 rounded-card px-5 py-4 ' +
        (cadence.overdue
          ? 'bg-[#FCF0EE] shadow-[0_0_0_0.5px_rgba(154,56,48,0.2)]'
          : 'bg-raised shadow-ring')
      }
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5 text-[13px]">
            {cadence.lastHeldAt && (
              <span className="text-muted">
                {t('meet.lastHeld')}{' '}
                <span className="text-paper">
                  <DateText iso={cadence.lastHeldAt} />
                </span>
              </span>
            )}
            <span className={cadence.overdue ? 'font-semibold text-breach' : 'text-muted'}>
              {t('meet.dueBy')}{' '}
              <span className={cadence.overdue ? '' : 'text-paper'}>
                <DateText iso={cadence.dueBy} />
              </span>
            </span>
          </div>

          <p className="mt-2 max-w-[62ch] text-[12.5px] leading-[1.6] text-muted">{cadence.note}</p>
        </div>

        {/*
          Convened or not, said plainly and in the same place either way. The
          act is a link rather than a form: convening asks for a date and an
          agenda, and that belongs on the meetings screen where the rest of the
          sitting lives.
        */}
        <div className="shrink-0">
          {nextConvened ? (
            <Link to="/meetings" className="block text-[13px] text-lapis">
              {t('meet.nextConvened')} <DateText iso={nextConvened} />
            </Link>
          ) : (
            <Link
              to="/meetings"
              className="inline-block rounded-xl bg-lapis px-4 py-2 text-[13px] font-semibold text-white shadow-act"
            >
              {t('meet.convene')}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export default function Calendar() {
  const { t } = useI18n();
  const [data, setData] = useState<CalendarData | null>(null);
  const [cadence, setCadence] = useState<Cadence | null>(null);
  const [nextConvened, setNextConvened] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    oversight
      .calendar()
      .then(setData)
      .catch(() => setFailed(true));

    /*
     * Its own request, and its failure costs only the rhythm block. The dates
     * a board is held to must still render when the meetings service is down.
     */
    oversight
      .meetings()
      .then((m) => {
        setCadence(m?.cadence ?? null);
        setNextConvened(m?.cadence?.nextConvenedAt ?? null);
      })
      .catch(() => setCadence(null));
  }, []);

  if (failed) return <ErrorText />;
  if (!data) return <Loading />;

  const now = Date.now();
  const entries = Array.isArray(data.entries) ? data.entries : [];
  const grouped = BANDS.map((band) => ({
    band,
    items: entries.filter((e) => bandOf(e, now) === band),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <PageHead
        phase="deciding"
        title={t('cal.title')}
        says={t('cal.intro')}
      />

      {/*
        The rhythm first, because it is the only obligation on this page with a
        supervisor behind it and the only one that comes with something to do.
        The download used to sit here, above every date: a person opening this
        screen was offered a file before they were told what was late.
      */}
      <Rhythm cadence={cadence} nextConvened={nextConvened} />

      {entries.length === 0 ? (
        <p className="mb-7 text-[14px] text-muted">{t('cal.none')}</p>
      ) : (
        grouped.map((g) => (
          <section key={g.band} className="mb-7">
            <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
              {t(`cal.band.${g.band}`)}
            </h2>
            <ul className="space-y-2.5">
              {g.items.map((e) => (
                <li key={e.id}>
                  <Entry entry={e} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {/*
        On the page rather than in a footnote. A calendar trusted to be complete
        and missing the six-month cadence would be worse than none at all.
      */}
      {Array.isArray(data.gaps) && data.gaps.length > 0 && (
        <div className="mt-8 rounded-card shadow-ring px-4 py-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
            {t('cal.notHere')}
          </div>
          <ul className="space-y-2">
            {data.gaps.map((g, i) => (
              <li key={i} className="text-[12.5px] leading-relaxed text-muted">
                {g}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/*
        Last, because taking the dates away with you is what you do once you
        have read them, not before.
      */}
      <a
        href={oversight.hrefs.calendarFeed()}
        className="mt-7 block rounded-card shadow-ring bg-raised px-4 py-3 transition-colors hover:text-paper"
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[14px] font-medium">{t('cal.feed')}</span>
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
            {t('cal.download')}
          </span>
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{t('cal.feedNote')}</p>
      </a>
    </div>
  );
}
