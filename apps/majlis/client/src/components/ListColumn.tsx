import { Suspense, useEffect, useRef, type ComponentType } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '../lib/i18n.js';
import { LIST_TITLES } from '../lib/split.js';
import { useLineKeys } from '../lib/lineKeys.js';
import { Incidents, Library, Queue, Register, WhatStands } from '../screens.js';
import { Button } from './Button';
import { InTheColumn } from './sheet.js';
import { Loading } from './ui.js';

/**
 * The list, kept beside the thing opened from it.
 *
 * See `lib/split.ts` for why. This is the drawing: the list's own screen,
 * told it is in the column (`InTheColumn`), so each list draws its phone
 * lines, one line of head and none of its page furniture — and the line
 * whose work is open is lit, because every line already knows the address
 * it opens.
 *
 * Nothing here re-reads what the list reads or re-draws what it draws. A
 * list added to the column is a line in `SCREEN` and a line in `OPENS`.
 */
const SCREEN: Readonly<Record<string, ComponentType>> = {
  '/': Queue,
  '/record': WhatStands,
  '/rules': WhatStands,
  '/incidents': Incidents,
  '/register': Register,
  '/library': Library,
};

export default function ListColumn({
  list,
  railOpen,
  onRail,
}: {
  list: string;
  railOpen: boolean;
  onRail: () => void;
}) {
  const { t } = useI18n();
  const here = useLocation();
  const root = useRef<HTMLElement>(null);
  const Screen = SCREEN[list];

  /*
   * The lit line stays in sight.
   *
   * Opened from far down the list, or moved to with a key, the line whose
   * work is open could sit under the fold of a column the member is not
   * looking at. Its rows arrive after the column does, so it is looked for
   * until it is there.
   */
  useEffect(() => {
    let frame = 0;
    const until = performance.now() + 2000;
    const find = () => {
      const lit = root.current?.querySelector('a[data-line][aria-current="page"]');
      if (lit) {
        const line = lit.closest('li');
        if (line && typeof line.scrollIntoView === 'function') line.scrollIntoView({ block: 'nearest' });
        return;
      }
      if (performance.now() < until) frame = requestAnimationFrame(find);
    };
    find();
    return () => cancelAnimationFrame(frame);
  }, [here.pathname]);

  /* The next thing, without the mouse — see `lib/lineKeys.ts`. */
  useLineKeys(root, { opens: true, on: true });

  if (!Screen) return null;
  const title = t(LIST_TITLES[list] ?? 'needs.title');

  return (
    <aside
      ref={root}
      aria-label={title}
      className="fixed inset-y-0 start-0 z-20 hidden w-[320px] flex-col bg-surface/70 shadow-[1px_0_0_rgba(25,23,19,0.055)] backdrop-blur-xl lg:flex"
    >
      <div className="flex items-center gap-1 px-3 pb-2 pt-4">
        {/*
          The places, one press away.

          The rail gives its room to the list while something is open, and
          comes back over it from here — the way a tablet puts its mailboxes
          away while a message is being read and keeps the button that brings
          them back in the same corner.
        */}
        <Button
          type="button"
          onClick={onRail}
          aria-expanded={railOpen}
          aria-label={t(railOpen ? 'split.hideRail' : 'split.showRail')}
          title={t(railOpen ? 'split.hideRail' : 'split.showRail')}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-raised/60 hover:text-paper"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="rtl:-scale-x-100">
            <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
            <path d="M9 4.5v15" />
          </svg>
        </Button>
        {/*
          The list's name, which is also the way to have it back whole: the
          work beside it closes and the list takes the window.
        */}
        <Link
          to={list}
          title={t('split.fullList')}
          className="min-w-0 truncate rounded-lg px-2 py-1 font-display text-title leading-tight tracking-title text-paper transition-colors hover:bg-raised/60"
        >
          {title}
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-10">
        <InTheColumn.Provider value={true}>
          <Suspense fallback={<Loading bare />}>
            <Screen />
          </Suspense>
        </InTheColumn.Provider>
      </div>
    </aside>
  );
}
