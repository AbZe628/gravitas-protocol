import { Link } from 'react-router-dom';
import { Button } from './Button';
import { useEffect, useState, type ReactNode } from 'react';

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

export function Sheet({
  columns,
  children,
}: {
  columns: readonly Column[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-card bg-raised shadow-ring">
      {/*
        The headings, held at the top of the scroll.

        A column heading that scrolls away takes the meaning of every figure
        under it with it, on exactly the long lists where that matters most.
      */}
      <div
        role="row"
        style={{ ['--cols' as string]: template(columns) }}
        className="sticky top-0 z-[1] hidden gap-4 border-b border-line bg-raised px-5 py-2.5 sm:grid sm:[grid-template-columns:var(--cols)]"
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

      <ul className="[&>li+li]:border-t [&>li+li]:border-line">{children}</ul>
    </div>
  );
}

export function Line({
  to,
  onPress,
  columns,
  cells,
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
  /** A line that is past its date, or otherwise marked. */
  tone?: 'plain' | 'breach';
}) {
  const wide = useWide();

  const roleOf = (i: number): 'lead' | 'trailing' | 'under' | 'hide' =>
    columns[i]?.phone ?? (i === 0 ? 'lead' : 'under');

  const leadAt = columns.findIndex((_, i) => roleOf(i) === 'lead');
  const lead = leadAt === -1 ? 0 : leadAt;
  const trailing = columns.findIndex((_, i) => roleOf(i) === 'trailing');
  const under = cells
    .map((cell, i) => ({ cell, i }))
    .filter(({ i }) => roleOf(i) === 'under');

  /** The title, as the one link, stretched over the whole line. */
  const opener = (cell: ReactNode, phone: boolean) => {
    const shape =
      'block truncate text-start after:absolute after:inset-0 hover:underline hover:underline-offset-[3px] ' +
      (phone ? 'text-lead text-paper' : 'text-body text-paper');
    return onPress ? (
      <Button type="button" onClick={onPress} className={'w-full ' + shape}>
        {cell}
      </Button>
    ) : (
      <Link to={to ?? '#'} className={shape}>
        {cell}
      </Link>
    );
  };

  const mark =
    tone === 'breach'
      ? 'border-s-[3px] border-breach bg-breachtint'
      : 'hover:bg-ink/[0.025]';

  /*
    A phone is not a narrow desk.

    The columns become a title with one figure beside it and a quiet line
    underneath — not the same cells in the same order with less room, which
    is what produced a line whose title came fourth, after the act, the
    owner and the number.
  */
  if (!wide) {
    return (
      <li className={'relative px-5 py-3 ' + mark}>
        <div className="flex items-baseline gap-3">
          <div className="min-w-0 flex-1">{opener(cells[lead], true)}</div>
          {trailing !== -1 && <div className="shrink-0">{cells[trailing]}</div>}
        </div>
        {under.length > 0 && (
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            {under.map(({ cell, i }, n) => (
              <span key={i} className="flex min-w-0 items-baseline gap-2">
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
      </li>
    );
  }

  return (
    <li
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
