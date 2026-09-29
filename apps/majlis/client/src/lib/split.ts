import { useEffect, useState } from 'react';

/**
 * A list beside the thing that is open — the shape every application on a
 * desk or a tablet takes, and the one this was missing.
 *
 * ── what it was ───────────────────────────────────────────────────────────
 *
 * Pressing a row on *what needs you* replaced the list with the row's screen.
 * The list was gone: to look at the next thing a member went back, found
 * their place again, and pressed again. Every row was a trip. It is how a web
 * page moves from page to page, and it is the first thing the owner named —
 * *an application, not a web page with buttons*.
 *
 * ── what it is ────────────────────────────────────────────────────────────
 *
 * On a desk, opening a row keeps the list, narrowed, in a column down the
 * side, with the row lit; the work opens beside it. The next row is one press
 * away, or one arrow key. The addresses do not change — `/incidents/:id` is
 * still `/incidents/:id` — only how a wide screen draws them.
 *
 * The rail gives its place to the list while something is open, the way a
 * tablet's mail puts its mailboxes away while a message is being read. That
 * keeps the work as wide as it was, so no screen inside it has to be
 * re-laid-out for a narrower pane; the rail is one press away in the column.
 *
 * ── and which list ────────────────────────────────────────────────────────
 *
 * The one the member came from, where that list holds this kind of thing —
 * a breach opened from the list of breaches keeps that list beside it, the
 * same breach opened from the queue keeps the queue. Arriving at an address
 * directly, the list it most belongs to.
 */

interface Opens {
  /** The addresses of one kind of thing that open beside a list. */
  detail: RegExp;
  /** The lists that hold it, the first being the one it most belongs to. */
  lists: readonly string[];
}

const OPENS: readonly Opens[] = [
  { detail: /^\/matters\/[^/]+$/, lists: ['/', '/record', '/rules'] },
  { detail: /^\/incidents\/[^/]+$/, lists: ['/', '/incidents'] },
  { detail: /^\/questions\/[^/]+$/, lists: ['/', '/questions'] },
  { detail: /^\/undertakings\/[^/]+$/, lists: ['/', '/undertakings'] },
  { detail: /^\/rules\/[^/]+$/, lists: ['/rules', '/record', '/'] },
  { detail: /^\/register\/[^/]+$/, lists: ['/register'] },
  { detail: /^\/library\/[^/]+$/, lists: ['/library'] },
];

/** Every list that can stand in the column. */
export const COLUMN_LISTS: readonly string[] = [...new Set(OPENS.flatMap((o) => o.lists))];

const KEY = 'majlis.list';
let remembered: string | null = null;
try {
  remembered = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(KEY) : null;
} catch {
  /* storage refused: the list is chosen by kind alone */
}

/** Note the list a member is looking at, so what they open from it keeps it. */
export function rememberList(path: string): void {
  if (!COLUMN_LISTS.includes(path) || remembered === path) return;
  remembered = path;
  try {
    sessionStorage.setItem(KEY, path);
  } catch {
    /* storage refused */
  }
}

/** The list to draw beside this address, or null where it is not a thing that opens. */
export function listFor(path: string): string | null {
  const opens = OPENS.find((o) => o.detail.test(path));
  if (!opens) return null;
  return remembered && opens.lists.includes(remembered) ? remembered : opens.lists[0];
}

/**
 * Where the member was before here — so a phone's way back can tell whether
 * the history's back is the list, or somewhere else the list is not.
 */
let previous: string | null = null;
let current: string | null = null;

export function notePath(path: string): void {
  if (path === current) return;
  previous = current;
  current = path;
}

export function cameFrom(): string | null {
  return previous;
}

/** For the tests: forget the list, as a fresh page load would. */
export function forgetList(): void {
  remembered = null;
  lastOpened = null;
  previous = null;
  current = null;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* storage refused */
  }
}

/**
 * The row a member last opened, so the list can light it when they come back.
 *
 * Back from a thing to the list, a member should see where they were rather
 * than search for it — the row they came from is lit for a moment and fades.
 */
let lastOpened: string | null = null;

/** A line's address, without the part of the screen it points into. */
const bare = (to: string) => to.split('#')[0];

export function rememberOpened(to: string): void {
  lastOpened = bare(to);
}

export function wasJustOpened(to: string): boolean {
  return lastOpened !== null && lastOpened === bare(to);
}

/**
 * The title of a list, for the column's head and a phone's way back.
 *
 * `/` is the queue for a member, and the queue's own name is the one a member
 * knows it by; every other list is named as the rail names it.
 */
export const LIST_TITLES: Readonly<Record<string, string>> = {
  '/': 'needs.title',
  '/record': 'rail.record',
  '/rules': 'rail.rulings',
  '/incidents': 'rail.events',
  '/register': 'rail.register',
  '/library': 'rail.library',
  '/questions': 'queue.title',
  '/undertakings': 'und.title',
};

/**
 * Whether the window is a desk's — wide enough for a list and a thing side by
 * side. The same breakpoint the rail appears at.
 *
 * Without `matchMedia`, under a test runner, it answers *no*: a list beside a
 * screen is something a test asks for by rendering the column itself.
 */
export function useDeskWide(): boolean {
  const query = '(min-width: 1024px)';
  const [wide, setWide] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(query);
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}
