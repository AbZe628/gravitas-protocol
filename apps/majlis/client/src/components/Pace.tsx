import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { oversight, type PaceResponse, type Wait } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';

/**
 * How long the board takes, and what is waiting on it now.
 *
 * Every other panel in this application is personal: what *you* owe. This one
 * is institutional, and it is the only figure here that measures the board
 * rather than its decisions. It is also the number the product exists for — a
 * board that decides well in eleven weeks and one that decides equally well in
 * four days are indistinguishable in a record that does not measure this.
 *
 * Three rules of presentation.
 *
 * **No badge, no count in red.** A strip of quiet text. The point is that a
 * scholar can see the cost without being shouted at about it, and an interface
 * that manufactures urgency about a figure nobody can act on in the next minute
 * is training people to ignore it.
 *
 * **It says when it is approximate.** Where an arrival was never recorded the
 * figure covers only the part this system saw, and the panel says so rather
 * than presenting an understated number as exact.
 *
 * **It never names who is late.** The wait is on the board, and the row that
 * has waited longest is a link to the matter rather than to a person. Whose
 * step it is belongs on the matter, where the reason is also visible.
 */

/**
 * Whole days.
 *
 * The figures arrive to one decimal because that is what the arithmetic
 * produces, and showing it would be false precision: nothing a board does turns
 * on eight tenths of a day, and a headline reading "75.8 days" invites a reader
 * to trust the number more exactly than it deserves. Anything under a day is
 * said in words rather than rounded to zero.
 */
function days(n: number): string {
  return String(Math.round(n));
}

function isSubDay(n: number): boolean {
  return n < 1;
}

export default function Pace() {
  const { t } = useI18n();
  const [data, setData] = useState<PaceResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    oversight
      .pace()
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  // A panel is not worth taking the page down for, and "0 days" implied by a
  // failed request would be worse than saying nothing.
  if (failed || !data || !Array.isArray(data.boards) || data.boards.length === 0) return null;

  const board = data.boards[0];
  const longest: Wait | null = board.longestOpen;

  const nothingYet = board.medianDays === null && board.open === 0;
  if (nothingYet) return null;

  return (
    <section className="mb-5 rounded-lg border border-line bg-surface/40 px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5">
        {board.medianDays !== null && (
          <span className="text-[13px]">
            <span className="text-muted">{t('pace.median')} </span>
            <span className="font-medium tabular-nums">
              {isSubDay(board.medianDays) ? t('pace.underADay') : `${days(board.medianDays)} ${t('attention.days')}`}
            </span>
          </span>
        )}

        {board.open > 0 && (
          <span className="text-[13px]">
            <span className="text-muted">{t('pace.waitingNow')} </span>
            <span className="font-medium tabular-nums">{board.open}</span>
          </span>
        )}

        {/* A range is only information when the ends differ. One settled matter
            produces "76–76", which reads as a figure and carries none. */}
        {board.settled > 1 && board.fastestDays !== board.slowestDays && (
          <span className="text-[12px] text-muted tabular-nums">
            {t('pace.range')} {days(board.fastestDays ?? 0)}–{days(board.slowestDays ?? 0)}{' '}
            {t('attention.days')}
          </span>
        )}
      </div>

      {longest && (
        <p className="mt-2 text-[12px] leading-relaxed text-muted">
          {t('pace.longest')}{' '}
          <Link to={`/matters/${longest.matterId}`} className="underline underline-offset-2 hover:text-fg">
            {longest.title}
          </Link>
          <span className="mx-1.5 opacity-40">·</span>
          <span className="tabular-nums">
            {isSubDay(longest.days) ? t('pace.underADay') : `${days(longest.days)} ${t('attention.days')}`}
          </span>
        </p>
      )}

      {board.approximate && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted opacity-80">{t('pace.partial')}</p>
      )}
    </section>
  );
}

/**
 * How long one matter has been waiting, for a row in a list.
 *
 * Returns null rather than "0 days" for a matter nobody is waiting on. A
 * timelock is time passing on purpose and says so instead of counting.
 */
export function WaitingFor({ wait }: { wait: Wait | undefined }) {
  const { t } = useI18n();
  if (!wait || wait.phase === 'settled') return null;

  if (wait.onTheClock) {
    return <span className="text-[12px] text-muted">{t('pace.onTheClock')}</span>;
  }

  return (
    <span className="text-[12px] text-muted tabular-nums">
      {t('pace.waiting')}{' '}
      {isSubDay(wait.days) ? t('pace.underADay') : `${days(wait.days)} ${t('attention.days')}`}
      {wait.partial ? '*' : ''}
    </span>
  );
}
