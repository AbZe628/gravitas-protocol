import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { oversight, type Calendar as CalendarData, type CalendarEntry } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
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
        'rounded-lg border px-4 py-3 ' +
        (entry.overdue ? 'border-warn/60 bg-warn/[0.06]' : 'border-line bg-surface')
      }
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <Tag tone={entry.overdue ? 'warn' : undefined}>{t(`cal.kind.${entry.kind}`)}</Tag>
        <span className={entry.overdue ? 'text-[12px] text-warn' : 'text-[12px] text-muted'}>
          <DateText iso={entry.at} />
        </span>
      </div>
      <div className="text-[14px] font-medium leading-snug">{entry.title}</div>
      <p className="mt-1 text-[12px] leading-relaxed text-muted">{entry.note}</p>
      {entry.waitingOn.length > 0 && (
        <p className="mt-1.5 text-[11.5px] text-muted">
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

export default function Calendar() {
  const { t } = useI18n();
  const [data, setData] = useState<CalendarData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    oversight
      .calendar()
      .then(setData)
      .catch(() => setFailed(true));
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
      <h1 className="mb-1 text-[19px] font-semibold">{t('cal.title')}</h1>
      <p className="mb-5 text-[13px] leading-relaxed text-muted">{t('cal.intro')}</p>

      <a
        href={oversight.hrefs.calendarFeed()}
        className="mb-7 block rounded-lg border border-line bg-surface px-4 py-3 transition-colors hover:border-muted"
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[14px] font-medium">{t('cal.feed')}</span>
          <span className="shrink-0 text-[11px] uppercase tracking-wider text-muted">
            {t('cal.download')}
          </span>
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{t('cal.feedNote')}</p>
      </a>

      {entries.length === 0 ? (
        <p className="text-[14px] text-muted">{t('cal.none')}</p>
      ) : (
        grouped.map((g) => (
          <section key={g.band} className="mb-7">
            <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-muted">
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
        <div className="mt-8 rounded-lg border border-line px-4 py-3">
          <div className="mb-2 text-[11px] uppercase tracking-wider text-muted">
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
    </div>
  );
}
