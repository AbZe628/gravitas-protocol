import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n.js';
import { DOORS, type Phase } from '../lib/spine.js';

/**
 * One shape for every page.
 *
 * The matter pack showed what a page in this application should look like: a
 * reader knows where they are, what the page is, what needs them, and where
 * the seams are — in that order, before they read a word of content. Every
 * other screen was built at a different time to a different idea, so a scholar
 * learned twenty-two layouts instead of one.
 *
 * This is that shape, written once. A page assembles it:
 *
 *     <PageHead phase="inforce" title={…} says={…} live={…} />
 *     <Part n="01" heading={…}>…</Part>
 *     <Gaps items={…} />
 *
 * ── why the parts are numbered ────────────────────────────────────────────
 *
 * Only where they are a sequence. A pack is read in order and each part means
 * something different after the one above it, so the numbers carry
 * information. A list of holdings is not a sequence and does not get them —
 * numbering everything would be the decoration this file exists to avoid.
 *
 * ── every page names what it cannot say ───────────────────────────────────
 *
 * `Gaps` is the same component everywhere, in the same place, at the same
 * size. A screen that quietly showed nothing where it had nothing would be
 * read as a screen with nothing wrong, and those are different claims.
 */

/** Where this page sits, so a reader is never lost. */
function Breadcrumb({ phase, tail }: { phase?: Phase; tail?: string }) {
  const { t } = useI18n();
  const door = DOORS.find((d) => d.phase === phase);
  if (!door) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2.5 text-[12.5px] text-muted">
      <Link to={door.destinations[0].to} className="transition-colors hover:text-paper">
        {t(door.label)}
      </Link>
      {tail && (
        <>
          <span className="opacity-40">/</span>
          <span className="font-mono">{tail}</span>
        </>
      )}
    </div>
  );
}

/**
 * The head of a page.
 *
 * `says` is one plain sentence about what this page is for, and it is not
 * optional. A heading alone tells a scholar what a screen is called, which is
 * not the same as telling them what it does.
 *
 * `live` is the one fact about right now that belongs beside the title — how
 * long the longest thing has waited, how many have never been examined. It is
 * where a page earns its place rather than being a list somebody has to
 * interpret.
 */
export function PageHead({
  phase,
  tail,
  title,
  says,
  live,
  act,
}: {
  phase?: Phase;
  tail?: string;
  title: ReactNode;
  says: string;
  live?: ReactNode;
  /** The one thing a reader might come here to do. */
  act?: ReactNode;
}) {
  return (
    <header className="mb-8">
      <Breadcrumb phase={phase} tail={tail} />

      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          {live && <div className="mb-3 flex flex-wrap items-center gap-2.5">{live}</div>}
          <h1
            className="max-w-[24ch] font-display text-[32px] font-normal leading-[1.1] tracking-[-0.026em] text-paper sm:text-[38px]"
            style={{ textWrap: 'balance' }}
          >
            {title}
          </h1>
          <p className="mt-3 max-w-[62ch] text-[13.5px] leading-[1.65] text-muted">{says}</p>
        </div>
        {act && <div className="shrink-0">{act}</div>}
      </div>
    </header>
  );
}

/**
 * A numbered part of a sequence.
 *
 * Lifted out of the matter pack so every page that reads in order uses the
 * same one. The number sits in its own narrow column so the headings line up
 * whether a part is one line or forty.
 */
export function Part({
  n,
  heading,
  children,
}: {
  n: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-line py-6 first:border-t-0 first:pt-0">
      <div className="flex gap-5">
        <span className="w-5 shrink-0 pt-1 font-mono text-[11px] text-muted">{n}</span>
        <div className="min-w-0 flex-1">
          <div className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            {heading}
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}

/**
 * A division of a page that is not a sequence.
 *
 * Same heading treatment as `Part`, without the number, so a list page and a
 * pack page read as the same application.
 */
export function Division({
  heading,
  children,
  note,
}: {
  heading: string;
  children: ReactNode;
  note?: string;
}) {
  return (
    <section className="border-t border-line py-6 first:border-t-0 first:pt-0">
      <div className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {heading}
      </div>
      {note && <p className="mb-4 max-w-[62ch] text-[12.5px] leading-[1.6] text-muted">{note}</p>}
      {children}
    </section>
  );
}

/**
 * What this page could not tell you.
 *
 * The same component, in the same place, at the same size, on every screen
 * that has one. Never muted and never collapsed: a gap a reader has to open a
 * disclosure to find is a gap the page has decided they do not need.
 *
 * Renders nothing when there is nothing — but a page that can have gaps and
 * passes an empty list is saying it checked, which is different from a page
 * that never asked.
 */
export function Gaps({ items }: { items: readonly string[] }) {
  const { t } = useI18n();
  if (items.length === 0) return null;

  return (
    <section className="border-t border-line py-6">
      <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {t('pack.gaps')}
      </div>
      <ul className="space-y-2.5">
        {items.map((gap, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-[7px] h-[7px] w-[7px] shrink-0 rounded-full bg-gold/70" />
            <span className="max-w-[62ch] text-[13.5px] leading-[1.65] text-sand">{gap}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * A list with nothing in it, answered rather than left blank.
 *
 * An empty screen is the commonest way an application tells somebody there is
 * nothing here, when what is true is that nothing has happened yet. The two
 * read identically and only one of them is correct.
 */
export function Nothing({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-card bg-raised/60 px-5 py-4 text-[13px] leading-[1.65] text-muted shadow-ring">
      {children}
    </p>
  );
}

/**
 * The page's two columns: what is read, and what is done.
 *
 * The act column is sticky on a wide screen and falls under the content on a
 * narrow one. A member who has read to the bottom should not have to scroll
 * back up to act.
 */
export function TwoColumns({ children, aside }: { children: ReactNode; aside: ReactNode }) {
  return (
    <div className="flex flex-col gap-9 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1">{children}</div>
      <div className="w-full shrink-0 lg:sticky lg:top-6 lg:w-[352px]">{aside}</div>
    </div>
  );
}
