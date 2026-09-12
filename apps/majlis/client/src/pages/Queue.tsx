import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { governance, type QueueRow } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Nothing } from '../components/page.js';
import { ErrorText, Loading } from '../components/ui.js';
import { useStillThere } from '../lib/stillThere.js';
import type { QueuePhase } from '../lib/api.js';

/**
 * Everything waiting on somebody, in one list.
 *
 * ── what this replaces ────────────────────────────────────────────────────
 *
 * An arrival screen with no heading at all, under a bar reading
 * `01 Asked › 02 Deciding › 03 In force › 04 Checked` — the same bar that
 * opened every other screen, so moving between them changed nothing at the
 * top. Below it, the four stages again as large cards, and the same four a
 * third time down the left rail. Whether anything was actually waiting lived
 * on five other screens, and a member had to know which five.
 *
 * ── the idea a person learns once ─────────────────────────────────────────
 *
 * Everything in this record is one kind of thing — something waiting on
 * somebody — and every row answers the same four questions: what it is, what
 * is next, whose that is, and how long it has stood there.
 *
 * A scholar does not arrive thinking *I will look at the sittings now*. They
 * arrive thinking **what needs me**, and until now nothing answered that.
 *
 * ── ordered by what is waiting, never by what sounds grave ────────────────
 *
 * Overdue first, then longest-waiting, and the server decides it — see
 * `services/queue.ts`. A breach does not outrank a question because breaches
 * sound worse. What the software is entitled to know is how long something
 * has waited and whether a clock has run out; whether a thing is *serious* is
 * a reading, and readings belong to the board.
 *
 * ── the filters do not rebuild the cupboards ──────────────────────────────
 *
 * Four chips, by stage, and *everything* is the default and comes first. They
 * narrow one list rather than opening five, which is the difference between a
 * filter and the navigation this screen exists to replace.
 */

const PHASES: readonly QueuePhase[] = ['asked', 'deciding', 'inforce', 'checked'];

/** The stage's own colour, from the vocabulary the doors already use. */
const TONE: Record<QueuePhase, string> = {
  asked: 'text-lapis',
  deciding: 'text-[#8A6524]',
  inforce: 'text-settled',
  checked: 'text-breach',
};

function Row({ row }: { row: QueueRow }) {
  const { t } = useI18n();

  return (
    <li>
      <Link
        to={row.to}
        className={
          'flex gap-5 rounded-card px-5 py-4 transition-all hover:-translate-y-px hover:shadow-card ' +
          (row.overdue
            ? 'bg-[#FCF0EE] shadow-[0_0_0_0.5px_rgba(154,56,48,0.22)]'
            : 'bg-raised shadow-ring')
        }
      >
        {/*
          How long it has stood here, first and largest. It is the one figure
          on the row that is a fact about now rather than about the record,
          and it is what a person scans for.
        */}
        <div className="w-[4.5rem] shrink-0 text-end">
          <div
            className={
              'font-mono text-[22px] leading-none tabular-nums ' +
              (row.overdue ? 'text-breach' : '')
            }
          >
            {row.days}
          </div>
          <div className="mt-1 text-[10.5px] uppercase tracking-[0.12em] text-muted">
            {t('needs.daysHere')}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span
              className={
                'text-[10px] font-bold uppercase tracking-[0.14em] ' + TONE[row.phase]
              }
            >
              {t(`needs.kind.${row.kind}`)}
            </span>
            {row.overdue && (
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-breach">
                {t('needs.overdue')}
              </span>
            )}
          </div>

          <div className="font-display text-[16.5px] leading-snug">{row.title}</div>

          {/*
            The act and whose it is, on one line. The commonest way anything
            here stalls is that every side believes it is with the other, so
            the owner is never left to be inferred.
          */}
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 text-[12.5px]">
            {row.next ? (
              <>
                <span className="text-paper">{row.next}</span>
                <span className="text-muted">
                  ·{' '}
                  {row.whoName ?? (row.whose ? t(`passage.whose.${row.whose}`) : '')}
                </span>
              </>
            ) : (
              <span className="text-muted">{t('needs.nothingToDo')}</span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

export default function Queue() {
  const { t } = useI18n();
  const [rows, setRows] = useState<QueueRow[] | null>(null);
  const [overdue, setOverdue] = useState(0);
  const [only, setOnly] = useState<QueuePhase | null>(null);
  const [failed, setFailed] = useState(false);
  /** A failed refresh keeps a screen that is already there. */
  const there = useStillThere();

  useEffect(() => {
    governance
      .queue()
      .then((q) => {
        there.arrived();
        setRows(Array.isArray(q.rows) ? q.rows : []);
        setOverdue(q.overdue ?? 0);
      })
      .catch(() => there.lost(setFailed));
  }, []);

  if (failed) return <ErrorText />;
  if (!rows) return <Loading />;

  const shown = only === null ? rows : rows.filter((r) => r.phase === only);
  const countOf = (p: QueuePhase) => rows.filter((r) => r.phase === p).length;

  return (
    <div>
      {/*
        The heading is the first thing, and it is a heading. The screen it
        replaces had no <h1> at all: a person arrived somewhere with no name.
      */}
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h1 className="font-display text-[30px] leading-[1.1] tracking-[-0.024em] text-paper">
          {t('needs.title')}
        </h1>
        <div className="text-[13px] text-muted">
          <span className="font-mono tabular-nums text-paper">{rows.length}</span>{' '}
          {t('needs.waiting')}
          {overdue > 0 && (
            <>
              <span className="mx-2 opacity-40">·</span>
              <span className="font-mono tabular-nums text-breach">{overdue}</span>{' '}
              <span className="text-breach">{t('needs.overdue')}</span>
            </>
          )}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOnly(null)}
          className={
            'rounded-full px-3.5 py-1.5 text-[12px] transition-all ' +
            (only === null
              ? 'bg-lapis font-semibold text-white'
              : 'bg-raised text-sand shadow-ring hover:text-paper')
          }
        >
          {t('needs.everything')}
        </button>
        {/*
          A stage with nothing in it is not offered. A chip that filters to an
          empty list is a control that cannot be honoured, and this
          application's rule is that those are absent rather than disabled.
        */}
        {PHASES.filter((p) => countOf(p) > 0).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setOnly(p)}
            className={
              'rounded-full px-3.5 py-1.5 text-[12px] transition-all ' +
              (only === p
                ? 'bg-lapis font-semibold text-white'
                : 'bg-raised text-sand shadow-ring hover:text-paper')
            }
          >
            {t(`door.${p}`)}
            <span className="ms-1.5 font-mono tabular-nums opacity-60">{countOf(p)}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <Nothing>{t(rows.length === 0 ? 'queue.nothing' : 'queue.noneHere')}</Nothing>
      ) : (
        <ul className="space-y-2">
          {shown.map((r) => (
            <Row key={r.kind + r.id} row={r} />
          ))}
        </ul>
      )}

      {/*
        What this list cannot see. Said in place rather than left for somebody
        to discover: a question that arrived by email and was never entered
        here is not waiting as far as this screen is concerned, and a member
        who believes the list is complete will stop looking.
      */}
      <p className="mt-6 max-w-[62ch] text-[12px] leading-[1.6] text-muted">
        {t('needs.limits')}
      </p>
    </div>
  );
}
