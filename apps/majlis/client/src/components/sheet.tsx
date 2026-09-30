import { Link, useLocation, useNavigationType } from 'react-router-dom';
import { Button } from './Button';
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react';
import { Chevron } from './ui.js';
import { wasJustOpened, rememberOpened } from '../lib/split.js';

/**
 * Whether this list is drawn in the column beside a thing that is open.
 *
 * The same list, narrower: on a desk, opening a row puts the list in a column
 * down the side and the row's work beside it (see the list column in
 * Shell.tsx). A table does not fit 340 pixels, so a list told it is in the
 * column draws the phone's lines whatever the width of the window.
 */
export const InTheColumn = createContext(false);

/**
 * A list with columns, which is what an application shows and a page does not.
 *
 * ── what was here, and why it read as a page ──────────────────────────────
 *
 * Every list in this application drew the same block: a small capitalised
 * kind, a title set in the display serif underneath it, a muted line under
 * that, and something on the right. Three lines and roughly a hundred pixels
 * for one record, whatever the record was. Ten to a screen on a desk.
 *
 * It is a perfectly good way to lay out an article and it is not how software
 * lists things. The complaint it produces is exactly the one the owner made
 * and kept making: every screen looks the same, and none of them looks like
 * an application. They looked the same because they *were* the same — one
 * shape stacked down a page, with nothing to line up against.
 *
 * A list in an application is a table. Named columns across the top, one line
 * per record, every field under its own heading so the eye runs **down** a
 * column and compares: every date in one place, every owner in one place,
 * every figure right-aligned in tabular numerals. That is what makes twenty
 * records legible where ten were, and it is what makes two different screens
 * feel like two views of one machine rather than two pages.
 *
 * ── a phone is not a small desk ───────────────────────────────────────────
 *
 * Four columns in 390 pixels is four columns of one word each. Below the
 * `sm` breakpoint every line stacks, and stacked is the shape that was here
 * before — which is the right shape there and the wrong one on a desk.
 *
 * ── why the whole line opens ──────────────────────────────────────────────
 *
 * A table where only the title is a link makes a person aim at six words in
 * a row forty pixels tall. The link is on the title, where a screen reader
 * announces it, and it is stretched over the line with `after:absolute`, so
 * there is one link and it is the size of the row. Anything that must stay
 * pressable on its own — an act, a second link — is given `relative` and
 * sits above it.
 */

export interface Column {
  /** The heading, in the reader's words. Empty for a column that needs none. */
  head: string;
  /** A CSS grid track: `1fr`, `8rem`, `minmax(0,2fr)`. */
  width: string;
  /** Figures, dates, anything read as a quantity. */
  end?: boolean;
  /**
   * What this column becomes on a phone, where there is no table.
   *
   * ── the fault this closes ─────────────────────────────────────────────
   *
   * The first attempt stacked the cells in column order, so a line read:
   * QUESTION, then *take it up as a matter*, then *the board*, then 76,
   * and only then **Interbank liquidity through a commodity sale**. The
   * act before the thing it acts on, the number before either. Nobody can
   * read that, and it is most of what was wrong with the phone.
   *
   * A phone line is not a row of columns in a narrow space. It is a title,
   * a figure beside it, and one quiet line underneath — so the columns say
   * which of those they are.
   *
   *   `lead`     the title. One column, and it carries the link.
   *   `trailing` the one figure that sits on the title's line.
   *   `under`    joined into the line beneath, separated by a dot.
   *   `hide`     not on a phone at all. A desk has room; a phone does not,
   *              and four facts under a title is the stack again.
   *
   * Unset: the first column leads, the rest go under. That default is
   * wrong often enough that every list here says what it means.
   */
  phone?: 'lead' | 'trailing' | 'under' | 'hide';
}

/**
 * The header and the lines share one grid, declared once.
 *
 * Two separate grids drift the moment a column's content is wider than its
 * heading, and a table whose headings do not sit over their columns is worse
 * than no headings at all.
 *
 * ── as a variable, not as the property ────────────────────────────────────
 *
 * This was written straight into `style` as `gridTemplateColumns`, and an
 * inline style beats every class there is — including the `grid-cols-1` that
 * was supposed to stack the cells on a phone. So the stacking never happened
 * once: a phone drew six columns in 390 pixels, every cell crushed to two or
 * three characters, on every list in the application. It went out that way
 * and it is the single worst thing in here.
 *
 * The width goes into a custom property instead, and a class applies it from
 * `sm` upwards. Below that there is nothing to override and the cells stack,
 * which is what a phone needs and what a table is not.
 */
function template(columns: readonly Column[]): string {
  return columns.map((c) => c.width).join(' ');
}

/**
 * Whether there is room for columns.
 *
 * The first version drew both layouts and let `sm:hidden` decide, which put
 * every cell in the document twice: harmless to look at, and a screen reader
 * read every row of every list twice over. It is one tree now, and which one
 * is a question asked of the browser rather than of the stylesheet.
 *
 * Without `matchMedia` — under a test runner — it answers *desk*, because
 * that is the layout the assertions were written against and a guard that
 * quietly changed what they measure would be worse than no guard.
 */
function useWide(): boolean {
  const query = '(min-width: 640px)';
  const [wide, setWide] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(query);
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  return wide;
}

/**
 * How wide a table has to be before its columns can be read.
 *
 * Every fixed column at its width, the title at no less than fourteen
 * characters' room and any other shared column at eight, the gaps between
 * them and the line's own padding. Measured in the root's units, which is
 * what the widths are written in.
 */
function needs(columns: readonly Column[]): number {
  const rem =
    typeof document !== 'undefined'
      ? parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      : 16;
  const lead = Math.max(0, columns.findIndex((c) => c.phone === 'lead'));
  const each = columns.map((c, i) => {
    const w = c.width.trim();
    const n = parseFloat(w);
    if (/^[\d.]+rem$/.test(w)) return n * rem;
    if (/^[\d.]+px$/.test(w)) return n;
    return (i === lead ? 14 : 8) * rem;
  });
  return each.reduce((a, b) => a + b, 0) + 16 * (columns.length - 1) + 40;
}

/**
 * Whether the table this line is in has room for its columns — `null` for a
 * line drawn outside any table, which then asks the window instead.
 */
const Fits = createContext<boolean | null>(null);

export function Sheet({
  columns,
  children,
}: {
  columns: readonly Column[];
  children: ReactNode;
}) {
  const column = useContext(InTheColumn);
  /*
   * Columns where there is room for them, lines where there is not — asked
   * of the table's own width, not the window's.
   *
   * The window was the wrong thing to ask. At 1024 pixels it is a desk, but
   * the table sits in 616 of them beside the rail and the shelf, and the
   * list of breaches has 512 pixels of fixed columns: the title's share came
   * to nothing, and every breach on the screen was a row of stages with no
   * name. Measured live; no test could see it, because under a test runner
   * nothing has a width. The same question answers the list column beside a
   * matter, a tablet held upright and a phone, with one rule.
   */
  const box = useRef<HTMLDivElement>(null);
  const [fits, setFits] = useState(true);
  const widths = columns.map((c) => c.width).join('|');
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const need = needs(columns);
    const measure = () => setFits(el.clientWidth >= need);
    measure();
    const seen = new ResizeObserver(measure);
    seen.observe(el);
    return () => seen.disconnect();
    // The widths are what the need is made of; `columns` is rebuilt every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widths]);
  const wide = fits && !column;

  return (
    <Fits.Provider value={wide}>
    <div ref={box} className="overflow-hidden rounded-card bg-raised shadow-ring">
      {/*
        The headings, held at the top of the scroll.

        A column heading that scrolls away takes the meaning of every figure
        under it with it, on exactly the long lists where that matters most.
      */}
      {wide && (
      <div
        role="row"
        style={{ ['--cols' as string]: template(columns) }}
        className="sticky top-0 z-[1] grid gap-4 border-b border-line bg-raised px-5 py-2.5 [grid-template-columns:var(--cols)]"
      >
        {columns.map((c, i) => (
          <div
            key={i}
            role="columnheader"
            className={
              'text-label font-bold uppercase tracking-caps text-muted ' +
              (c.end ? 'text-end' : '')
            }
          >
            {c.head}
          </div>
        ))}
      </div>
      )}

      <ul className="[&>li+li]:border-t [&>li+li]:border-line">{children}</ul>
    </div>
    </Fits.Provider>
  );
}

export function Line({
  to,
  onPress,
  columns,
  cells,
  act,
  onMenu,
  tone,
}: {
  /** Where the line opens. The link is the title and covers the line. */
  to?: string;
  /**
   * Opens it beside the list rather than navigating to it.
   *
   * A list of choices — nineteen contract shapes — should not take a member
   * off the list when they look at one. Given instead of `to`, never as well.
   */
  onPress?: () => void;
  columns: readonly Column[];
  /** One per column, in order. The first is the one the link is put on. */
  cells: readonly ReactNode[];
  /**
   * One press that belongs to this line, done without leaving the list.
   *
   * ── why it needs its own slot ─────────────────────────────────────────
   *
   * The link over a line is stretched across the whole of it — `after:inset-0`
   * — so that a press anywhere opens it. Anything interactive placed in a cell
   * is under that sheet and cannot be pressed at all: it looks like a button,
   * takes focus from the keyboard, and does nothing to a pointer. Found by
   * putting *take it* in a cell and pressing it.
   *
   * So the act is raised above the sheet, and it is one act. A line carries
   * one press; anything that needs a choice or a reason belongs on the record
   * the line opens.
   *
   * The caller supplies a column for it, like every other cell.
   */
  act?: ReactNode;
  /**
   * Everything else this line can do, asked for the way a list is asked.
   *
   * Right-click, the Menu key (which a browser sends here as the same event,
   * so the keyboard gets it for nothing), and a long press on a phone. What
   * opens is the caller's, and in this application it is a window that says
   * what each act does rather than a strip of four words.
   */
  onMenu?: () => void;
  /** A line that is past its date, or otherwise marked. */
  tone?: 'plain' | 'breach';
}) {
  const column = useContext(InTheColumn);
  const fits = useContext(Fits);
  const byWindow = useWide();
  const wide = (fits ?? byWindow) && !column;
  const here = useLocation();
  const returning = useNavigationType() === 'POP';

  /*
   * The line whose work is open beside the list, lit — the way a list in any
   * application marks what you are looking at. And the line just come back
   * from, lit for a moment, so a member returning to the list sees where
   * they were rather than hunting for it. Only coming back: a list reached
   * afresh from the rail has nowhere the member was.
   */
  const open = to !== undefined && (to === here.pathname || to === here.pathname + here.hash);
  const back = to !== undefined && !open && returning && wasJustOpened(to);

  const roleOf = (i: number): 'lead' | 'trailing' | 'under' | 'hide' =>
    columns[i]?.phone ?? (i === 0 ? 'lead' : 'under');

  const leadAt = columns.findIndex((_, i) => roleOf(i) === 'lead');
  const lead = leadAt === -1 ? 0 : leadAt;
  const trailing = columns.findIndex((_, i) => roleOf(i) === 'trailing');
  /* A cell with nothing in it is left out of the line, or it leaves its `·` behind. */
  const under = cells
    .map((cell, i) => ({ cell, i }))
    .filter(({ cell, i }) => roleOf(i) === 'under' && cell !== null && cell !== undefined && cell !== false && cell !== '');

  /** The title, as the one link, stretched over the whole line. */
  const opener = (cell: ReactNode, phone: boolean) => {
    /* The whole line shows where the keyboard is, so the words need no box of their own. */
    const shape =
      'block truncate text-start after:absolute after:inset-0 focus-visible:outline-none ' +
      (phone ? 'text-body text-paper' : 'text-body text-paper');
    return onPress ? (
      <Button type="button" onClick={onPress} className={'w-full ' + shape}>
        {cell}
      </Button>
    ) : (
      <Link
        to={to ?? '#'}
        aria-current={open ? 'page' : undefined}
        data-line=""
        onClick={() => to && rememberOpened(to)}
        className={shape}
      >
        {cell}
      </Link>
    );
  };

  /**
   * A long press is the phone's right-click.
   *
   * Held for half a second without the finger wandering: a press that moved is
   * the list being scrolled, which is what a finger on a list is usually
   * doing, and opening a window under a scroll would make the list unusable.
   * The timer is cleared on move and on lift.
   */
  const held = useRef<ReturnType<typeof setTimeout> | null>(null);
  const from = useRef<{ x: number; y: number } | null>(null);
  const stopHolding = () => {
    if (held.current) clearTimeout(held.current);
    held.current = null;
    from.current = null;
  };
  const longPress = onMenu
    ? {
        onContextMenu: (e: { preventDefault: () => void }) => {
          e.preventDefault();
          onMenu();
        },
        onTouchStart: (e: TouchEvent) => {
          const touch = e.touches[0];
          from.current = { x: touch.clientX, y: touch.clientY };
          held.current = setTimeout(() => {
            stopHolding();
            onMenu();
          }, 500);
        },
        onTouchMove: (e: TouchEvent) => {
          const touch = e.touches[0];
          const start = from.current;
          if (!start) return;
          if (Math.abs(touch.clientX - start.x) > 8 || Math.abs(touch.clientY - start.y) > 8) {
            stopHolding();
          }
        },
        onTouchEnd: stopHolding,
        onTouchCancel: stopHolding,
      }
    : {};

  /* The line the keyboard is on, lit the way the pointer lights it. */
  const onIt =
    '[&:has(a:focus-visible)]:bg-lapistint/60 [&:has(a:focus-visible)]:ring-2 [&:has(a:focus-visible)]:ring-inset [&:has(a:focus-visible)]:ring-lapis/50 ';
  const mark = onIt + (open
    ? tone === 'breach'
      ? 'border-s-[3px] border-breach bg-lapistint'
      : 'bg-lapistint'
    : tone === 'breach'
      ? 'border-s-[3px] border-breach bg-breachtint'
      : 'hover:bg-ink/[0.025] ' + (back ? 'line-returned' : ''));

  /*
    A phone is not a narrow desk.

    The columns become a title with one figure beside it and a quiet line
    underneath — not the same cells in the same order with less room, which
    is what produced a line whose title came fourth, after the act, the
    owner and the number.
  */
  if (!wide) {
    return (
      <li {...longPress} className={'relative flex items-center gap-3 py-3 pe-4 ps-5 ' + mark}>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3">
            <div className="min-w-0 flex-1">{opener(cells[lead], true)}</div>
            {trailing !== -1 && <div className="shrink-0">{cells[trailing]}</div>}
          </div>
          {/*
            One line under the title, never two.

            It wrapped, and what wrapped was the owner, which then opened its
            own line with the separator in front of it — *· the board* on a
            line of its own under every question. The first fact gives way
            and is cut short; the ones after it keep their place, because
            whose a thing is, is the part a member scans the list for.
          */}
          {under.length > 0 && (
            <div className="mt-0.5 flex min-w-0 items-baseline gap-x-2">
              {under.map(({ cell, i }, n) => (
                <span
                  key={i}
                  className={n === 0 ? 'min-w-0 truncate' : 'flex shrink-0 items-baseline gap-2'}
                >
                  {n > 0 && (
                    <span aria-hidden="true" className="text-note text-muted">
                      ·
                    </span>
                  )}
                  {cell}
                </span>
              ))}
            </div>
          )}

          {/*
            The act gets a line of its own, and takes it from neither of the
            other two.

            Beside the title it cut every title on the screen — *Interbank
            liquidity…*, *Charging for a late inst…*. Moved to the end of the
            line under it, it cut the act instead: *Take i… · Board Member A*,
            which is the one sentence on the row saying what to do. A phone has
            vertical room and not horizontal, and a control is not a fact, so
            it stops sharing a line with them. Only rows that offer one get the
            line. Found by reading the list at 375, twice.
          */}
          {act && <div className="relative z-[1] mt-1.5 flex justify-end">{act}</div>}
        </div>
        {/* What opens something else says so, as every list on the device does. */}
        {(to !== undefined || onPress) && <Chevron />}
      </li>
    );
  }

  return (
    <li
      {...longPress}
      style={{ ['--cols' as string]: template(columns) }}
      className={
        'relative grid min-h-[44px] items-center gap-x-4 px-5 py-2.5 [grid-template-columns:var(--cols)] ' +
        mark
      }
    >
      {cells.map((cell, i) => (
        <div key={i} className={'min-w-0 ' + (columns[i]?.end ? 'text-end' : '')}>
          {i === lead ? opener(cell, false) : cell}
        </div>
      ))}
      {act && <div className="relative z-[1] min-w-0 text-end">{act}</div>}
    </li>
  );
}

/**
 * A cell that is a state, a kind, or anything else read at a glance.
 *
 * Small capitals rather than a pill: a column of eleven pills is a column of
 * eleven boxes, and the box is what the eye lands on instead of the word.
 */
export function Mark({ tone, children }: { tone?: string; children: ReactNode }) {
  return (
    <span
      className={
        'block truncate text-label font-bold uppercase tracking-caps ' + (tone ?? 'text-muted')
      }
    >
      {children}
    </span>
  );
}

/** A cell that is a figure or a date. Tabular, so the column lines up. */
export function Figure({
  children,
  tone,
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span className={'block font-mono text-note tabular-nums ' + (tone ?? 'text-muted')}>
      {children}
    </span>
  );
}
