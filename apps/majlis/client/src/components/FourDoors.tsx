import { Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n.js';
import { DOORS, mainOf, type Phase } from '../lib/spine.js';

/**
 * The whole application, in four rows.
 *
 * A member should be able to open Majlis and know the state of the entire
 * board in about six seconds: what is waiting, what is being decided, what is
 * standing, and what nobody has checked. Four rows, four numbers, four plain
 * sentences.
 *
 * ── the three counters this replaces ──────────────────────────────────────
 *
 * The arrival screen used to carry three numbers under a heading that said
 * *what is happening*, and they were the three that happened to be easy to
 * fetch. One of them counted holdings that had drifted and linked to a page
 * where the word *moved* never appeared, so following the signal led nowhere.
 * Another read "1 holdings".
 *
 * These four are not a selection. They are the four phases, so the row a
 * reader wants always exists — and each opens the screen that actually
 * answers it.
 *
 * ── no plural ever has to be got right ────────────────────────────────────
 *
 * The word under each number is written so that it reads correctly at one and
 * at forty: *waiting*, *open*, *in force*, *never looked at*. Arabic has a
 * dual as well as a plural and Urdu agrees differently again; a naive
 * pluraliser gets all three wrong, and a correct one is a lot of machinery for
 * a problem that disappears if the noun is simply left out.
 */

export interface DoorCounts {
  /** Null where the count could not be read. The row then shows no number. */
  asked: number | null;
  deciding: number | null;
  inforce: number | null;
  /** Holdings nobody has examined. */
  checked: number | null;
  /** Holdings that have left the limits a ruling set. Drawn separately. */
  moved: number | null;
  /** The longest a question has waited, in days. */
  longestWaitDays: number | null;
}

const COUNT_KEY: Record<Phase, string> = {
  asked: 'spine.asked.count',
  deciding: 'spine.deciding.count',
  inforce: 'spine.inforce.count',
  checked: 'spine.checked.count',
};

const FIGURE: Record<string, string> = {
  lapis: 'text-lapis',
  attention: 'text-gold',
  settled: 'text-settled',
  breach: 'text-gold',
};

const EDGE: Record<string, string> = {
  lapis: 'bg-lapis/50',
  attention: 'bg-gold',
  settled: 'bg-settled/50',
  breach: 'bg-gold/75',
};

export default function FourDoors({ counts }: { counts: DoorCounts }) {
  const { t } = useI18n();

  return (
    <ul className="space-y-2.5">
      {DOORS.map((door) => {
        const n = counts[door.phase];

        /*
         * What this row says on its right, in one line.
         *
         * Drift earns the sentence over the count, because a holding that has
         * left the board's limits is the one thing on this screen that is
         * actively wrong. Where nothing is wrong the row says so rather than
         * showing a zero, which reads as missing data.
         */
        const moved = door.phase === 'checked' && (counts.moved ?? 0) > 0;
        const quiet = n === 0 && !moved;

        return (
          <li key={door.phase}>
            <Link
              to={mainOf(door)}
              className="relative flex items-center gap-5 overflow-hidden rounded-card bg-raised/60 py-4 pe-5 ps-7 shadow-ring transition-shadow hover:shadow-card sm:gap-7 sm:py-5"
            >
              {/* The phase's one colour, as a rule down the edge. */}
              <span
                className={'absolute inset-y-0 start-0 w-[3px] ' + EDGE[door.tone]}
                aria-hidden="true"
              />

              <div className="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-5">
                <div className="sm:w-[186px] sm:shrink-0">
                  <div className="flex items-baseline gap-2.5">
                    <span className="font-mono text-[11px] text-muted">{door.ordinal}</span>
                    <span className="font-display text-[19px] leading-none tracking-[-0.018em] text-paper sm:text-[21px]">
                      {t(door.label)}
                    </span>
                  </div>
                  <div className="mt-1.5 text-[12.5px] leading-[1.5] text-muted">
                    {t(door.meaning)}
                  </div>
                </div>

                {/* What is true right now, in one line. */}
                <div className="mt-2 min-w-0 text-[13px] leading-[1.5] text-sand sm:mt-0 sm:flex-1">
                  {moved ? (
                    <span className="text-gold">
                      {counts.moved} · {t('spine.moved')}
                    </span>
                  ) : quiet ? (
                    <span className="text-settled">{t('spine.nothingHere')}</span>
                  ) : door.phase === 'asked' && counts.longestWaitDays !== null ? (
                    <span>
                      {t('spine.longestWait')}{' '}
                      <span className="font-mono tabular-nums">{counts.longestWaitDays}</span>{' '}
                      {t('guided.days')}
                    </span>
                  ) : null}
                </div>
              </div>

              {n !== null && (
                <div className="shrink-0 text-end">
                  <div
                    className={
                      'font-display text-[28px] leading-none tabular-nums tracking-[-0.03em] sm:text-[32px] ' +
                      FIGURE[door.tone]
                    }
                  >
                    {n}
                  </div>
                  <div className="mt-1.5 text-[11px] leading-tight text-muted">
                    {t(COUNT_KEY[door.phase])}
                  </div>
                </div>
              )}

              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                className="shrink-0 text-line rtl:rotate-180"
                aria-hidden="true"
              >
                <path d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
