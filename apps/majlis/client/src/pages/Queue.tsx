import { useContext, useEffect, useRef, useState } from 'react';
import { useRevision } from '../lib/pulse.js';
import { useNavigate } from 'react-router-dom';
import { governance, oversight, type QueueRow } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { ListPage } from '../components/shapes.js';
import { Sheet, Line, Mark, Figure, InTheColumn, type Column } from '../components/sheet.js';
import { Nothing } from '../components/page.js';
import { ErrorText, Loading, Rows } from '../components/ui.js';
import { useStillThere } from '../lib/stillThere.js';
import { useIdentity } from '../lib/identity.js';
import { keep, kept } from '../lib/kept.js';
import { nameOf, useMembers } from '../lib/members.js';
import { holdingOf } from '../lib/holding.js';
import OnThisRow from '../components/OnThisRow.js';
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

/**
 * The queue as it was last read, and for whom.
 *
 * Opening a row on a desk puts this list in the column beside the work, which
 * is a second drawing of the same list — and it drew *Loading* where a moment
 * before it had drawn the rows, so the list the member had just pressed
 * vanished and came back. It draws what it last had and reads again, the way
 * it already does whenever the record moves. Kept against the member it was
 * read for, so a second person signing in on the same window never meets the
 * first one's list.
 */
interface LastRead {
  who: string;
  rows: QueueRow[];
  overdue: number;
}

/**
 * And how it was narrowed. The column and the way back both draw the list the
 * member was looking at, not the list as it opens — a row picked from
 * *everyone* is not in *yours*, and a list that drops the line whose work is
 * open beside it has lost the one thing the column is for.
 */
interface Narrowed {
  onlyMine: boolean;
  only: QueuePhase | null;
}
const narrowed = (): Narrowed => kept<Narrowed>('queue.narrowed') ?? { onlyMine: true, only: null };

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
  /*
   * The act's own column, unheaded.
   *
   * A heading over it would be a word repeated down every row that carries a
   * button and a blank over every row that does not. What the button says is
   * the heading.
   */
  { head: '', width: '6.5rem', end: true, phone: 'hide' },
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
/**
 * The one press a row carries: take it on, or hand it back to the board.
 *
 * ── what a member had to do instead ───────────────────────────────────────
 *
 * Nine rows saying what needs them, and taking one on meant opening it,
 * finding the panel beside the work and pressing there — then coming back for
 * the next. Triage is the one thing this screen is for and it was the one
 * thing that could not be done on it.
 *
 * ── one press, and only one ───────────────────────────────────────────────
 *
 * Taking something on and handing it back need nothing typed and nothing
 * chosen, so they belong on the row. Placing it with a named colleague needs a
 * choice, and putting it off needs a reason: both belong on the record the row
 * opens. A row carries one press.
 *
 * ── and only where the server would allow it ──────────────────────────────
 *
 * `holdingOf` is the same reading the panel makes, from the same rule the
 * route refuses on. A breach waiting on the bank's own filing is not holdable
 * and carries no button at all — a control that cannot be honoured is absent,
 * not disabled.
 */
function RowAct({
  row,
  onMove,
}: {
  row: QueueRow;
  onMove: (row: QueueRow, to: string | null) => void;
}) {
  const { t } = useI18n();
  const { identity } = useIdentity();
  const members = useMembers();

  const can = holdingOf({
    holdable: row.holdable,
    holder: row.holder ?? null,
    identity,
    members,
  });
  if (!can || !can.mayMove) return null;

  /*
   * Handing back what a colleague holds is the chair's and the secretary's.
   *
   * Written as *free or mine*, this row offered the chair nothing on work in a
   * colleague's hands while the panel beside that same work offered *put it
   * back* — the row and the panel disagreeing about the same rule, which is
   * the fault `holdingOf` exists to prevent. `mayMove` already carries the
   * office; reading it again here was the second opinion.
   */
  const take = can.free;

  return (
    <Button
      type="button"
      /*
        Which row it is, for anyone not seeing it.

        Nine buttons all reading *Take it*: tabbing through them, or reading
        them aloud, gave the same two words nine times with nothing saying
        which line each belonged to. The line says it to the eye by being
        beside it, and that is not something the machine can see.
      */
      aria-label={t(take ? 'needs.takeThis' : 'needs.handBackThis', { what: row.title })}
      onClick={() => onMove(row, take ? can.me : null)}
      className={
        'inline-flex min-h-[44px] items-center rounded-xl px-3 py-1.5 text-note font-medium transition-all lg:min-h-0 ' +
        (take
          ? 'bg-raised text-lapis shadow-ring hover:bg-lapistint'
          : 'text-muted hover:text-paper')
      }
    >
      {t(take ? 'needs.take' : 'needs.handBack')}
    </Button>
  );
}

function Row({
  row,
  n,
  onMove,
  onMenu,
  mePutOff,
}: {
  row: QueueRow;
  n?: number;
  onMove: (row: QueueRow, to: string | null) => void;
  onMenu: () => void;
  /** Whether this reader is one of the members who set it aside. */
  mePutOff: boolean;
}) {
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
      onMenu={onMenu}
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
              className="hidden h-5 w-5 shrink-0 place-items-center rounded border border-line font-mono text-label font-medium text-muted lg:grid"
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
          {/*
            Who has stepped back from it, said on the row.

            The half that makes setting aside a record rather than a snooze: a
            row nobody has touched in two months, with three members having
            each put it off, is telling a chair something no count of days can.
            The reader's own is said by the chip above, not twice here.
          */}
          {(row.putOff?.length ?? 0) > (mePutOff ? 1 : 0) && (
            <span className="ms-2 text-note text-goldink">
              {t('needs.othersPutOff', {
                n: (row.putOff?.length ?? 0) - (mePutOff ? 1 : 0),
              })}
            </span>
          )}
        </span>,
        <span className="block truncate text-ui text-muted">
          {whom}
        </span>,
        <Figure tone={row.overdue ? 'text-breach' : 'text-muted'}>{row.days}</Figure>,
      ]}
      act={<RowAct row={row} onMove={onMove} />}
    />
  );
}

export default function Queue() {
  const { t } = useI18n();
  const { identity } = useIdentity();
  /** The board's own list, for the rule about who may carry what. */
  const seated = useMembers();
  const last = kept<LastRead>('queue.read');
  const had = last && last.who === identity?.scholarId ? last : null;
  const [rows, setRows] = useState<QueueRow[] | null>(had?.rows ?? null);
  const [overdue, setOverdue] = useState(had?.overdue ?? 0);
  /**
   * Beside the work rather than the work itself. The numbers that open a line
   * are the queue's own keys only while the queue is the screen: beside a
   * matter, `1` is *met*, and a press cannot mean two things.
   */
  const column = useContext(InTheColumn);
  const [only, setOnlyHere] = useState<QueuePhase | null>(() => narrowed().only);
  const setOnly = (p: QueuePhase | null) => {
    keep<Narrowed>('queue.narrowed', { ...narrowed(), only: p });
    setOnlyHere(p);
  };
  /**
   * Narrowed to this member's own steps on arrival.
   *
   * The screen's name is a claim, and a list that opens with three of its ten
   * rows waiting on somebody else does not keep it. Everything is still one
   * press away, with its count on the chip, so nothing is hidden — what
   * changes is which of the two questions the screen answers first.
   */
  const [onlyMine, setOnlyMineHere] = useState(() => narrowed().onlyMine);
  const setOnlyMine = (k: boolean) => {
    keep<Narrowed>('queue.narrowed', { ...narrowed(), onlyMine: k });
    setOnlyMineHere(k);
  };
  const [failed, setFailed] = useState(false);
  /** A failed refresh keeps a screen that is already there. */
  const there = useStillThere();
  /**
   * Read again after the member moved something, without waiting for a pulse.
   *
   * The queue re-reads whenever the record moves, and the record moving is
   * something this screen can now cause. Without this the row a member had
   * just taken on went on saying *take it* until the next pulse arrived.
   */
  const [again, setAgain] = useState(0);
  /**
   * What the member just did, drawn before the server has answered.
   *
   * The button is offered only where the server's own rule allows the act, so
   * the result is not in doubt: the new holder is drawn at once and the read
   * that follows replaces it. A refusal puts the row back as it was and says
   * so — silently keeping the optimistic answer would leave the list claiming
   * a member holds something they do not.
   */
  const [moved, setMoved] = useState<Record<string, string | null>>({});
  const [refused, setRefused] = useState<string | null>(null);
  /**
   * The row whose other acts are open, and whether the set-aside ones are shown.
   *
   * Two separate things. A row a member has set aside is not gone — it is
   * behind a chip with its own count, like every other narrowing on this
   * screen — and *set aside* is a third answer to *whose*, not a fourth stage.
   */
  const [menuFor, setMenuFor] = useState<QueueRow | null>(null);
  const [showAside, setShowAside] = useState(false);

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
  /**
   * And the act, for the same reason.
   *
   * The handler is bound once and this is rebuilt on every render, so a
   * handler that closed over the first one would write from a stale reading of
   * what has already been moved.
   */
  const onScreenTake = useRef<(row: QueueRow) => void>(() => {});

  useEffect(() => {
    if (column) return;
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

      /*
       * Take on the row the member is standing on.
       *
       * The line the keyboard is on is the focused one — `j` and `k` move
       * focus between the lines and the line lights from that — so there is no
       * second cursor to keep in step with the first. Read from the page for
       * the same reason the digits are.
       *
       * It does exactly what the button does, from the same rule: where the
       * row carries no act, this does nothing rather than reaching past it.
       */
      if (e.key === 't' && !e.shiftKey) {
        const lines = [...document.querySelectorAll<HTMLAnchorElement>('a[data-line]')];
        const at = lines.indexOf(document.activeElement as HTMLAnchorElement);
        const standing = at === -1 ? undefined : onScreen.current[at];
        if (!standing) return;
        e.preventDefault();
        onScreenTake.current(standing);
        return;
      }

      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > 9) return;
      const row = onScreen.current[n - 1];
      if (!row) return;
      e.preventDefault();
      navigate(row.to);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, column]);

  useEffect(() => {
    let current = true;
    governance
      .queue()
      .then((q) => {
        if (!current) return;
        there.arrived();
        const read = Array.isArray(q.rows) ? q.rows : [];
        setRows(read);
        setOverdue(q.overdue ?? 0);
        if (identity?.scholarId)
          keep<LastRead>('queue.read', { who: identity.scholarId, rows: read, overdue: q.overdue ?? 0 });
      })
      .catch(() => {
        if (current) there.lost(setFailed);
      });
    return () => {
      current = false;
    };
    /* `there` is a stable handle; re-reading is driven by the count alone. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, again]);

  if (failed) return <ErrorText />;
  if (!rows) return <Loading />;

  const keyOf = (r: QueueRow) => r.kind + ':' + r.id;

  async function move(row: QueueRow, to: string | null) {
    const at = keyOf(row);
    setRefused(null);
    setMoved((m) => ({ ...m, [at]: to }));
    try {
      await oversight.assign({ ofKind: row.kind, ofId: row.id, to });
      setAgain((n) => n + 1);
    } catch (e) {
      setMoved((m) => {
        const { [at]: _gone, ...rest } = m;
        return rest;
      });
      setRefused(e instanceof Error && e.message ? e.message : t('hold.failed'));
    }
  }

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
   *
   * And a step you have already said yours on is not yours, however long it
   * stays open for the others: a cast vote sat here under *yours* as a vote
   * to cast, fifty-five days old, for the member who had cast it.
   */
  const mine = (r: QueueRow) => {
    const me = identity?.scholarId;
    if (me && r.heard?.includes(me)) return false;
    if (r.who) return r.who === me;
    if (r.holder && r.holder === me && (r.whose === 'board' || r.whose === 'signatory')) return true;
    if (r.whose === 'board') return true;
    if (r.whose === 'signatory') return identity?.role === 'signatory';
    return false;
  };

  /*
   * With what the member has just done to it, before the server has said so.
   *
   * Applied before the filters rather than at the row, because taking
   * something on changes which list it belongs to: a row taken on under
   * *everyone* has to move into *yours* at once, and one handed back has to
   * leave. Drawn from the row that arrives next, so this lasts one read.
   */
  const asMoved = (r: QueueRow): QueueRow =>
    keyOf(r) in moved ? { ...r, holder: moved[keyOf(r)] ?? undefined } : r;

  const all = rows.map(asMoved);

  /**
   * What this member has set aside until a later day.
   *
   * Their own only. Another member stepping back from something says nothing
   * about whether this one should look at it, and a list that thinned out
   * because a colleague was busy would be the screen deciding what the board
   * attends to.
   */
  const setAside = (r: QueueRow) => (r.putOff ?? []).some((p) => p.by === identity?.scholarId);
  const asideCount = all.filter(setAside).length;

  /*
   * Off the list by default, and never off the count.
   *
   * The figure at the top still says how many are waiting and how many are
   * past their date, because they are. What a member has decided to come back
   * to on Tuesday is still waiting on the board on Tuesday.
   */
  const onTheList = showAside ? all : all.filter((r) => !setAside(r));
  const mineCount = onTheList.filter(mine).length;
  const byOwner = onlyMine ? onTheList.filter(mine) : onTheList;
  const shown = only === null ? byOwner : byOwner.filter((r) => r.phase === only);
  onScreen.current = shown;
  /**
   * What `t` does, decided from the same rule the button is drawn from.
   *
   * Taking on only: handing something back is a different act, and a key that
   * did one thing on some rows and the opposite on others would be a key
   * nobody could press without reading the row first.
   */
  onScreenTake.current = (row) => {
    const can = holdingOf({
      holdable: row.holdable,
      holder: row.holder ?? null,
      identity,
      members: seated,
    });
    if (can?.mayMove && can.free && can.me) void move(row, can.me);
  };
  const countOf = (p: QueuePhase) => byOwner.filter((r) => r.phase === p).length;
  const isMine = (r: QueueRow) => (r.putOff ?? []).some((p) => p.by === identity?.scholarId);

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
          <span className="font-mono tabular-nums text-paper">{all.length}</span>{' '}
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
        {mineCount > 0 && mineCount < onTheList.length && (
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
                <span className="ms-1.5 font-mono tabular-nums text-muted">
                  {k ? mineCount : onTheList.length}
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
      {/*
        What this member set aside, behind a chip with its own count.

        Not hidden and not deleted: it is one press away with the number on it,
        which is the same treatment every other narrowing on this screen gets.
        Absent where nothing is set aside — a chip reading nought is a control
        that cannot change anything.
      */}
      {asideCount > 0 && (
        <Button
          type="button"
          aria-pressed={showAside}
          onClick={() => setShowAside(!showAside)}
          className={
            'inline-flex min-h-[44px] items-center rounded-full px-4 py-1.5 text-note transition-all lg:min-h-0 ' +
            (showAside
              ? 'bg-[#F7F0E2] font-semibold text-goldink shadow-ringgold'
              : 'bg-raised text-sand shadow-ring hover:text-paper')
          }
        >
          {t('needs.setAside')}
          <span className="ms-1.5 font-mono tabular-nums text-muted">{asideCount}</span>
        </Button>
      )}
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
            <span className="ms-1.5 font-mono tabular-nums text-muted">{countOf(p)}</span>
          </Button>
        ))}
    </>
  );

  return (
    <ListPage title={t('needs.title')} says="" live={counts} filters={filters} limits={t('needs.limits')}>
      {/*
        A refusal, said on the screen the act was pressed on.

        The button is only drawn where the rule allows the act, so this should
        not happen — and when it does, the member is owed the server's own
        words rather than a row that quietly snaps back.
      */}
      {refused && (
        <p
          role="alert"
          className="mb-4 max-w-[62ch] rounded-xl bg-breachtint px-3.5 py-2.5 text-ui text-breach shadow-ringbreach"
        >
          {refused}
        </p>
      )}

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
            all.length === 0
              ? 'queue.nothing'
              : only === null && onlyMine
                ? 'needs.noneMine'
                : 'queue.noneHere',
          )}
        </Nothing>
      ) : (
        <Sheet columns={COLS(t)}>
          {shown.map((r, i) => (
            <Row
              key={keyOf(r)}
              row={r}
              n={column ? undefined : i + 1}
              onMove={move}
              onMenu={() => setMenuFor(r)}
              mePutOff={isMine(r)}
            />
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
      {/*
        Everything else this row can do. Reached by right-click, by the Menu
        key, and by a long press on a phone — a window rather than a strip of
        four words, because every act here says what it does before it does it.
      */}
      {menuFor && (
        <OnThisRow
          row={menuFor}
          open={true}
          onClose={() => setMenuFor(null)}
          onChanged={() => setAgain((n) => n + 1)}
        />
      )}

      <nav aria-label={t('needs.allQuestions')} className="mt-6">
        <Rows
          items={[
            { to: '/questions', label: t('needs.allQuestions') },
            { to: '/classic', label: t('needs.allMatters') },
          ]}
        />
      </nav>
    </ListPage>
  );
}
