import { useEffect, useRef, useState } from 'react';
import { useRevision } from '../lib/pulse.js';
import { Link, useNavigate } from 'react-router-dom';
import { governance, type QueueRow } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { ListPage } from '../components/shapes.js';
import { Sheet, Line, Mark, Figure, type Column } from '../components/sheet.js';
import { Nothing } from '../components/page.js';
import { ErrorText, Loading } from '../components/ui.js';
import { useStillThere } from '../lib/stillThere.js';
import { useIdentity } from '../lib/identity.js';
import { nameOf, useMembers } from '../lib/members.js';
import type { QueuePhase } from '../lib/api.js';
import { Button } from '../components/Button';

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
  deciding: 'text-goldink',
  inforce: 'text-settled',
  checked: 'text-breach',
};

/*
  On a phone: what it is, how long it has stood there, and one quiet line
  saying what to do and whose it is. The stage is dropped there — the kind
  is already the first two words of the act, and a fifth fact under a title
  is the stack this was built to get rid of.
*/
const COLS = (t: (k: string) => string): readonly Column[] => [
  { head: t('col.what'), width: 'minmax(0,2.4fr)', phone: 'lead' },
  { head: t('col.stage'), width: '8rem', phone: 'hide' },
  { head: t('col.next'), width: 'minmax(0,1.9fr)', phone: 'under' },
  { head: t('col.with'), width: '8rem', phone: 'under' },
  { head: t('col.days'), width: '4.5rem', end: true, phone: 'trailing' },
];

/**
 * One waiting thing, as a line of a table.
 *
 * The four facts were stacked: kind, then title, then the act and its owner
 * underneath, with the age in a column of its own to the left — a hundred
 * pixels a row and nine to a screen. They are five columns now, and the
 * thing a member came to do is that everything under WITH can be read in one
 * sweep, and everything under DAYS compared without reading a word.
 */
function Row({ row, n }: { row: QueueRow; n?: number }) {
  const { t, say } = useI18n();
  const members = useMembers();

  /*
    Whom it is with, by name.

    The server sends a scholar id, and this column drew it as it came —
    `member-a`, a string from a configuration file, in the column a board reads
    to see who is holding something up. The board's list says what they are
    called. Where somebody carries the whole of it but the step is everyone's
    — the vote — the role stays first and the person follows it.
  */
  const whom = row.who
    ? nameOf(members, row.who)
    : [row.whose ? t(`passage.whose.${row.whose}`) : '', row.holder ? nameOf(members, row.holder) : '']
        .filter(Boolean)
        .join(' · ');

  return (
    <Line
      to={row.to}
      columns={COLS(t)}
      tone={row.overdue ? 'breach' : 'plain'}
      cells={[
        <span className="flex min-w-0 items-baseline gap-2">
          {/*
            The key that opens this line, on the line.

            The first nine only: past that a member is scanning rather than
            reaching, and a tenth cap would be decoration. Hidden on a phone,
            where there is no key to press.
          */}
          {n !== undefined && n < 10 && (
            <kbd
              aria-hidden="true"
              className="hidden h-5 w-5 shrink-0 place-items-center rounded border border-line font-mono text-label font-medium text-faint lg:grid"
            >
              {n}
            </kbd>
          )}
          <span className="truncate">{row.title}</span>
        </span>,
        <span className="block truncate">
          <Mark tone={TONE[row.phase]}>{t(`needs.kind.${row.kind}`)}</Mark>
          {row.overdue && (
            <span className="mt-0.5 block text-label font-bold uppercase tracking-caps text-breach">
              {t('needs.overdue')}
            </span>
          )}
        </span>,
        /*
          The act, and beside it in its own column whose it is. The commonest
          way anything here stalls is that every side believes it is with the
          other, so the owner is never left to be inferred — and in a column
          it can be read down the list rather than one line at a time.
        */
        <span className="block truncate text-ui text-paper">
          {row.next ? say(row.next) : <span className="text-muted">{t('needs.nothingToDo')}</span>}
        </span>,
        <span className="block truncate text-ui text-muted">
          {whom}
        </span>,
        <Figure tone={row.overdue ? 'text-breach' : 'text-muted'}>{row.days}</Figure>,
      ]}
    />
  );
}

export default function Queue() {
  const { t } = useI18n();
  const [rows, setRows] = useState<QueueRow[] | null>(null);
  const [overdue, setOverdue] = useState(0);
  const [only, setOnly] = useState<QueuePhase | null>(null);
  /**
   * Narrowed to this member's own steps on arrival.
   *
   * The screen's name is a claim, and a list that opens with three of its ten
   * rows waiting on somebody else does not keep it. Everything is still one
   * press away, with its count on the chip, so nothing is hidden — what
   * changes is which of the two questions the screen answers first.
   */
  const [onlyMine, setOnlyMine] = useState(true);
  const { identity } = useIdentity();
  const [failed, setFailed] = useState(false);
  /** A failed refresh keeps a screen that is already there. */
  const there = useStillThere();

  /*
   * The queue re-reads itself whenever the record moves.
   *
   * This is the first screen a member sees and the whole of what is waiting on
   * them, and until now it was whatever it had been at the moment the page
   * loaded. `useStillThere` already keeps the screen that is there when a
   * refresh fails, so a re-read that goes wrong costs nothing: the member
   * keeps the rows they had rather than being shown an empty list.
   */
  const revision = useRevision();
  const navigate = useNavigate();

  /**
   * The rows as they are on the screen, for the keyboard to reach.
   *
   * A ref rather than a dependency: the handler is bound once, and what it
   * reads has to be what is on the screen at the moment of the press, not
   * what was there when it was bound.
   */
  const onScreen = useRef<QueueRow[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inABox =
        e.target instanceof HTMLElement &&
        (e.target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName));
      if (inABox || e.ctrlKey || e.metaKey || e.altKey) return;
      /*
       * A window is open somewhere over this. Read from the page rather than
       * from state, and here that is the honest way round: the window in
       * question belongs to the frame — the palette, the bell, the key sheet —
       * and this screen has no way to know about any of them. Where a screen
       * owns its own windows it reads its own state instead, as the matter
       * screen does.
       */
      if (document.querySelector('[role="dialog"]')) return;

      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > 9) return;
      const row = onScreen.current[n - 1];
      if (!row) return;
      e.preventDefault();
      navigate(row.to);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  useEffect(() => {
    let current = true;
    governance
      .queue()
      .then((q) => {
        if (!current) return;
        there.arrived();
        setRows(Array.isArray(q.rows) ? q.rows : []);
        setOverdue(q.overdue ?? 0);
      })
      .catch(() => {
        if (current) there.lost(setFailed);
      });
    return () => {
      current = false;
    };
    /* `there` is a stable handle; re-reading is driven by the count alone. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);

  if (failed) return <ErrorText />;
  if (!rows) return <Loading />;

  /**
   * Whether this row's next step is this member's own.
   *
   * The screen is called *what needs you* and ten rows answered it, three of
   * which were waiting on the institution or on another member. Both belong
   * on the list — a board wants to see that the desk has been sitting on
   * something for forty-four days — but a member arriving to find out what is
   * theirs had to read the owner off every row and do the filtering by eye.
   *
   * Named on the row, so the rule here is only a reading of what the row
   * already says: a step with somebody's name on it is theirs and nobody
   * else's; a step on this side of the table of something you carry is yours;
   * a step that is the board's is every member's, and a step reserved to the
   * signatories is every signatory's. Everything else — the institution, its
   * liaison, a clock — is somebody else's, which is worth knowing and is not
   * yours to do.
   */
  const mine = (r: QueueRow) => {
    const me = identity?.scholarId;
    if (r.who) return r.who === me;
    if (r.holder && r.holder === me && (r.whose === 'board' || r.whose === 'signatory')) return true;
    if (r.whose === 'board') return true;
    if (r.whose === 'signatory') return identity?.role === 'signatory';
    return false;
  };

  const mineCount = rows.filter(mine).length;
  const byOwner = onlyMine ? rows.filter(mine) : rows;
  const shown = only === null ? byOwner : byOwner.filter((r) => r.phase === only);
  onScreen.current = shown;
  const countOf = (p: QueuePhase) => byOwner.filter((r) => r.phase === p).length;

  /*
    The same head as every other list.

    This screen had its own: a heading, a count beside it, the chips in a
    block of their own, all written here. Ten screens out of thirty-four
    used the shared shape and the rest each had a head of their own, which
    is the reason the application reads as a set of pages rather than as
    one thing. The parts are identical — heading, the one live fact, the
    filters, what the list cannot see — so they are the shared component
    now, and moving them moves every screen at once.
  */
  const counts = (
    <div className="text-ui text-muted">
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
  );

  const filters = (
    <>
      {/*
          Whose, before which stage.

          Offered only where there is a difference to see: a member whose
          every row is already theirs gains nothing from a control that
          filters to the same list, and this application does not draw
          controls that cannot change anything.
        */}
        {mineCount > 0 && mineCount < rows.length && (
          /*
            A recess with the chosen one raised out of it, not a round chip.

            Whose and which stage are two different questions, and as two
            rows of identical pills they read as one: *Yours* lit beside
            *Everything* lit, on a list showing seven of ten. Two devices,
            so the shape itself says which question is being answered —
            the same recess the language switch and the record's two views
            already use.
          */
          <div
            role="group"
            aria-label={t('needs.title')}
            className="flex shrink-0 gap-0.5 rounded-xl bg-paper/[0.045] p-[3px]"
          >
            {[true, false].map((k) => (
              <Button
                key={String(k)}
                type="button"
                aria-pressed={onlyMine === k}
                onClick={() => setOnlyMine(k)}
                className={
                  'inline-flex min-h-[44px] items-center rounded-lg px-3.5 py-1.5 text-note transition-all lg:min-h-0 ' +
                  (onlyMine === k
                    ? 'bg-raised font-semibold text-paper shadow-hairline'
                    : 'text-muted hover:text-sand')
                }
              >
                {t(k ? 'needs.mine' : 'needs.everyone')}
                <span className="ms-1.5 font-mono tabular-nums opacity-60">
                  {k ? mineCount : rows.length}
                </span>
              </Button>
            ))}
          </div>
        )}
      {/*
          Which filter is on, said to the machine as well as painted.

          The chips carried their state in colour alone: a member driving this
          from the keyboard, or reading it aloud, was given four identical
          controls and no way to tell which one was already chosen. Pressing
          the one that is on does nothing, correctly — and looked, to anyone
          not seeing the colour, like a control that does nothing at all.
        */}
        <Button
          type="button"
          aria-pressed={only === null}
          onClick={() => setOnly(null)}
          className={
            'inline-flex min-h-[44px] items-center rounded-full px-4 py-1.5 text-note transition-all lg:min-h-0 ' +
            (only === null
              ? 'bg-lapistint font-semibold text-lapis shadow-ring'
              : 'bg-raised text-sand shadow-ring hover:text-paper')
          }
        >
          {t('needs.everything')}
        </Button>
        {/*
          A stage with nothing in it is not offered. A chip that filters to an
          empty list is a control that cannot be honoured, and this
          application's rule is that those are absent rather than disabled.
        */}
        {PHASES.filter((p) => countOf(p) > 0).map((p) => (
          <Button
            key={p}
            type="button"
            aria-pressed={only === p}
            onClick={() => setOnly(p)}
            className={
              'inline-flex min-h-[44px] items-center rounded-full px-4 py-1.5 text-note transition-all lg:min-h-0 ' +
              (only === p
                ? 'bg-lapistint font-semibold text-lapis shadow-ring'
                : 'bg-raised text-sand shadow-ring hover:text-paper')
            }
          >
            {t(`door.${p}`)}
            <span className="ms-1.5 font-mono tabular-nums opacity-60">{countOf(p)}</span>
          </Button>
        ))}
    </>
  );

  return (
    <ListPage title={t('needs.title')} says="" live={counts} filters={filters} limits={t('needs.limits')}>
      {shown.length === 0 ? (
        /*
          Three different emptinesses, and they are not the same claim.

          Nothing waiting on anybody, nothing at the stage you picked, and
          nothing waiting on you while the list still has work on it. The
          last one used to read as the second, which told a member there was
          work at the other stages when what was true is that the work is
          with somebody else.
        */
        <Nothing>
          {t(
            rows.length === 0
              ? 'queue.nothing'
              : only === null && onlyMine
                ? 'needs.noneMine'
                : 'queue.noneHere',
          )}
        </Nothing>
      ) : (
        <Sheet columns={COLS(t)}>
          {shown.map((r, i) => (
            <Row key={r.kind + r.id} row={r} n={i + 1} />
          ))}
        </Sheet>
      )}

      {/*
        The two full lists, at the end of the queue.

        Their own note said what they are: wanted occasionally, by somebody
        looking for a question that is not waiting on anybody. They stood
        above the list — a third block of controls between a member and the
        first thing asked of them, on the one screen that is supposed to say
        what to do next. Occasional things go after the work, not in front
        of it.
      */}
      <nav className="mt-6 flex flex-wrap gap-x-5 gap-y-1">
        {[
          ['/questions', 'needs.allQuestions'],
          ['/classic', 'needs.allMatters'],
        ].map(([to, key]) => (
          <Link
            key={to}
            to={to}
            className="inline-flex min-h-[44px] items-center text-ui text-muted underline decoration-line underline-offset-4 hover:text-paper lg:min-h-0"
          >
            {t(key)}
          </Link>
        ))}
      </nav>
    </ListPage>
  );
}
