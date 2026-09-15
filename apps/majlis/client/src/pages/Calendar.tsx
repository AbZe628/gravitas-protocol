import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { oversight, type Cadence, type Calendar as CalendarData, type CalendarEntry } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Division, Gaps, Nothing } from '../components/page.js';
import { ListPage, Row, Rows } from '../components/shapes.js';
import { DateText, ErrorText, Loading } from '../components/ui.js';

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

/**
 * One date, as a row.
 *
 * No age in the left column: what a person reads here is when a thing lands,
 * not how long it has been standing. The date takes the right-hand column, in
 * red where it has already passed.
 */
function entryRow(entry: CalendarEntry, t: (k: string) => string) {
  return (
    <Row
      key={entry.id}
      to={linkFor(entry) ?? '/rules'}
      phase="deciding"
      kind={t(`cal.kind.${entry.kind}`)}
      title={entry.title}
      overdue={entry.overdue}
      note={
        <>
          {entry.note}
          {entry.waitingOn.length > 0 && (
            <span className="mt-0.5 block text-note">
              {t('cal.notYetFrom')} {entry.waitingOn.join(', ')}
            </span>
          )}
        </>
      }
      standing={
        <span
          className={
            entry.overdue ? 'text-ui font-semibold text-breach' : 'text-ui text-muted'
          }
        >
          <DateText iso={entry.at} />
        </span>
      }
    />
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
          ? 'bg-breachtint shadow-ringbreach'
          : 'bg-raised shadow-ring')
      }
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5 text-ui">
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

          <p className="mt-2 max-w-[62ch] text-ui leading-relaxed text-muted">{cadence.note}</p>
        </div>

        {/*
          Convened or not, said plainly and in the same place either way. The
          act is a link rather than a form: convening asks for a date and an
          agenda, and that belongs on the meetings screen where the rest of the
          sitting lives.
        */}
        <div className="shrink-0">
          {nextConvened ? (
            <Link to="/meetings" className="block text-ui text-lapis">
              {t('meet.nextConvened')} <DateText iso={nextConvened} />
            </Link>
          ) : (
            <Link
              to="/meetings"
              className="inline-block rounded-xl bg-lapis px-4 py-2 text-ui font-semibold text-white shadow-act"
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
    <ListPage
      phase="deciding"
      title={t('cal.title')}
      says={t('cal.intro')}
      live={
        entries.length > 0 ? (
          <span className="text-ui text-muted">
            <span className="font-mono tabular-nums text-paper">{entries.length}</span>{' '}
            <span>{t('cal.entries')}</span>
          </span>
        ) : undefined
      }
    >
      {/*
        The three places a date on this page comes from.

        Sittings, what members undertook, and the reviews all left the rail
        when it was cut to the nine places the drawing shows. Every one of
        them is a date the board is held to, which is what this page already
        is — so this is where they belong rather than three more lines in a
        rail somebody has to read past every day.
      */}
      <nav className="mb-7 flex flex-wrap gap-2">
        {[
          ['/meetings', 'cal.toSittings'],
          ['/undertakings', 'cal.toUndertakings'],
          ['/examinations', 'cal.toReviews'],
        ].map(([to, key]) => (
          <Link
            key={to}
            to={to}
            className="rounded-xl bg-raised px-4 py-2 text-ui font-semibold text-lapis shadow-ring"
          >
            {t(key)}
          </Link>
        ))}
      </nav>

      {/*
        The rhythm first, because it is the only obligation on this page with a
        supervisor behind it and the only one that comes with something to do.
        The download used to sit here, above every date: a person opening this
        screen was offered a file before they were told what was late.
      */}
      <Rhythm cadence={cadence} nextConvened={nextConvened} />

      {entries.length === 0 ? (
        <Nothing>{t('cal.none')}</Nothing>
      ) : (
        grouped.map((g) => (
          <Division key={g.band} heading={`${t(`cal.band.${g.band}`)} · ${g.items.length}`}>
            <Rows>{g.items.map((e) => entryRow(e, t))}</Rows>
          </Division>
        ))
      )}

      {/*
        On the page rather than in a footnote. A calendar trusted to be complete
        and missing the six-month cadence would be worse than none at all.
      */}
      {Array.isArray(data.gaps) && data.gaps.length > 0 && <Gaps items={data.gaps} />}

      {/*
        Last, because taking the dates away with you is what you do once you
        have read them, not before.
      */}
      <a
        href={oversight.hrefs.calendarFeed()}
        className="mt-7 block rounded-card shadow-ring bg-raised px-4 py-3 transition-colors hover:text-paper"
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-body font-medium">{t('cal.feed')}</span>
          <span className="shrink-0 text-label font-bold uppercase tracking-caps text-muted">
            {t('cal.download')}
          </span>
        </div>
        <p className="mt-1 text-ui leading-relaxed text-muted">{t('cal.feedNote')}</p>
      </a>
    </ListPage>
  );
}
