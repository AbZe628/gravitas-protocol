import { DOORS, type Phase } from './spine.js';

/**
 * What you do on each screen, and where you go afterwards.
 *
 * ── why this file exists ──────────────────────────────────────────────────
 *
 * Twenty-six screens were inventoried by opening every one of them as a board
 * member. Every single one is a noun with a list under it — *Meetings*, *The
 * register*, *Briefings*, *Calculations* — and not one of them says where you
 * are in a process, what you are meant to do there, or where you go next.
 * Three of them (`/register`, `/calendar`, `/assistant`) offered no act at all.
 *
 * The result is what it was reported as: *"cijela je samo jedna naslagana
 * zbrka informacija koja ne govori nikome nista"*. A scholar who has never
 * seen the application cannot learn it by reading it, because the screens
 * describe themselves and never address the reader.
 *
 * ── why it is one table rather than an edit to each screen ────────────────
 *
 * Because a screen must not be able to forget. If every page were asked to
 * declare its own next steps, the ones that most need them are exactly the
 * ones that would be missed — they are already the thinnest. The frame reads
 * this table and renders the same three things on every route, so a dead end
 * is impossible by construction rather than by discipline.
 *
 * ── the three things every screen gets ────────────────────────────────────
 *
 *   1. where this sits in the four phases, with the current one lit
 *   2. one plain line saying what **you** do here, addressed to the reader
 *   3. what to do next, as real links, at the foot
 *
 * Everything here is an i18n key. Nothing in this file is English.
 */

export interface NextStep {
  to: string;
  /** i18n key. What the reader would call this, as an action. */
  label: string;
}

export interface Journey {
  phase: Phase | null;
  /**
   * What you do here, addressed to the reader, in the imperative or the
   * second person. Never a description of the screen.
   *
   *   bad   "The register lists what the bank holds."
   *   good  "Find a holding and see the ruling that allows it."
   */
  does: string;
  /** Where a person goes from here. One to three, never more. */
  next: readonly NextStep[];
}

/**
 * Keyed by route pattern. A record route uses its list's pattern with `/*`.
 * Longest match wins, so `/register/*` beats `/register`.
 */
export const JOURNEY: Readonly<Record<string, Journey>> = {
  '/': {
    phase: null,
    does: 'do.home',
    next: [
      { to: '/questions', label: 'do.next.queue' },
      { to: '/classic', label: 'do.next.open' },
      { to: '/calendar', label: 'do.next.dates' },
    ],
  },

  // ── 01 asked ────────────────────────────────────────────────────────────
  '/questions': {
    phase: 'asked',
    does: 'do.questions',
    next: [
      { to: '/classic', label: 'do.next.open' },
      { to: '/library', label: 'do.next.shapes' },
    ],
  },
  '/ask': {
    phase: 'asked',
    does: 'do.ask',
    next: [{ to: '/questions', label: 'do.next.queue' }],
  },

  // ── 02 deciding ─────────────────────────────────────────────────────────
  '/classic': {
    phase: 'deciding',
    does: 'do.open',
    next: [
      { to: '/questions', label: 'do.next.queue' },
      { to: '/meetings', label: 'do.next.meetings' },
      { to: '/rules', label: 'do.next.stands' },
    ],
  },
  '/matters/*': {
    phase: 'deciding',
    does: 'do.matter',
    next: [
      { to: '/classic', label: 'do.next.open' },
      { to: '/check', label: 'do.next.check' },
    ],
  },
  '/meetings': {
    phase: 'deciding',
    does: 'do.meetings',
    next: [
      { to: '/undertakings', label: 'do.next.undertaken' },
      { to: '/calendar', label: 'do.next.dates' },
    ],
  },
  '/meetings/*': {
    phase: 'deciding',
    does: 'do.book',
    next: [
      { to: '/meetings', label: 'do.next.meetings' },
      { to: '/classic', label: 'do.next.open' },
    ],
  },
  '/undertakings': {
    phase: 'deciding',
    does: 'do.undertakings',
    next: [{ to: '/meetings', label: 'do.next.meetings' }],
  },
  '/calendar': {
    phase: 'deciding',
    does: 'do.calendar',
    next: [
      { to: '/meetings', label: 'do.next.meetings' },
      { to: '/rules', label: 'do.next.stands' },
    ],
  },

  // ── 03 in force ─────────────────────────────────────────────────────────
  '/rules': {
    phase: 'inforce',
    does: 'do.rules',
    next: [
      { to: '/register', label: 'do.next.register' },
      { to: '/examinations', label: 'do.next.examine' },
    ],
  },
  /*
   * The same screen at its other address. It answers, so it gets a journey;
   * a route that renders and has no onward step is the dead end this file
   * exists to make impossible.
   */
  '/record': {
    phase: 'inforce',
    does: 'do.rules',
    next: [
      { to: '/register', label: 'do.next.register' },
      { to: '/examinations', label: 'do.next.examine' },
    ],
  },
  '/register': {
    phase: 'inforce',
    does: 'do.register',
    next: [
      { to: '/examinations', label: 'do.next.examine' },
      { to: '/rules', label: 'do.next.stands' },
    ],
  },
  '/register/*': {
    phase: 'inforce',
    does: 'do.holding',
    next: [
      { to: '/register', label: 'do.next.register' },
      { to: '/calculations', label: 'do.next.figures' },
    ],
  },
  '/library': {
    phase: 'inforce',
    does: 'do.library',
    next: [
      { to: '/check', label: 'do.next.check' },
      { to: '/classic', label: 'do.next.open' },
    ],
  },
  '/check': {
    phase: 'inforce',
    does: 'do.check',
    next: [
      { to: '/library', label: 'do.next.shapes' },
      { to: '/ask', label: 'do.next.ask' },
    ],
  },
  '/calculations': {
    phase: 'inforce',
    does: 'do.calculations',
    next: [
      { to: '/register', label: 'do.next.register' },
      { to: '/ask', label: 'do.next.ask' },
    ],
  },
  '/briefings': {
    phase: 'inforce',
    does: 'do.briefings',
    next: [
      { to: '/ask', label: 'do.next.ask' },
      { to: '/rules', label: 'do.next.stands' },
    ],
  },

  // ── 04 checked ──────────────────────────────────────────────────────────
  '/examinations': {
    phase: 'checked',
    does: 'do.examinations',
    next: [
      { to: '/incidents', label: 'do.next.breaches' },
      { to: '/register', label: 'do.next.register' },
    ],
  },
  '/incidents': {
    phase: 'checked',
    does: 'do.incidents',
    next: [
      { to: '/examinations', label: 'do.next.examine' },
      { to: '/rules', label: 'do.next.stands' },
    ],
  },
  '/incidents/*': {
    phase: 'checked',
    does: 'do.incident',
    next: [
      { to: '/incidents', label: 'do.next.breaches' },
      { to: '/calculations', label: 'do.next.figures' },
    ],
  },

  // ── beside the four ─────────────────────────────────────────────────────
  '/search': {
    phase: null,
    does: 'do.search',
    next: [{ to: '/rules', label: 'do.next.stands' }],
  },
  '/settings': {
    phase: null,
    does: 'do.settings',
    next: [{ to: '/meetings', label: 'do.next.meetings' }],
  },
  '/assistant': {
    phase: null,
    does: 'do.assistant',
    next: [{ to: '/ask', label: 'do.next.ask' }],
  },
};

/**
 * The journey for a path, or null.
 *
 * Longest pattern wins so a record inherits its list's phase but keeps its own
 * line and its own next steps. A `/classic/*` bookmark falls back to the
 * screen it is the older form of.
 */
export function journeyFor(path: string): Journey | null {
  const match = (p: string): Journey | null => {
    if (JOURNEY[p]) return JOURNEY[p];

    /*
     * Longest stem wins, so `/register/x` finds `/register/*` and not `/`.
     * The first version compared the stem against the wrong string and gave
     * `/classic/matters/…` the journey of the matters list, which told a
     * reader looking at one matter to go and look at the matters.
     */
    let best: { stem: string; j: Journey } | null = null;
    for (const [key, j] of Object.entries(JOURNEY)) {
      if (!key.endsWith('/*')) continue;
      const stem = key.slice(0, -2);
      if (p === stem || p.startsWith(stem + '/')) {
        if (!best || stem.length > best.stem.length) best = { stem, j };
      }
    }
    return best ? best.j : null;
  };

  const direct = match(path);
  if (direct) return direct;

  /*
   * The older form of a screen gets the journey of the screen it is the older
   * form of — after the patterns have been tried on the stripped path, not
   * only the exact addresses.
   */
  if (path.startsWith('/classic')) {
    const stripped = path.slice('/classic'.length) || '/classic';
    const inherited = stripped === '/classic' ? null : match(stripped);
    if (inherited) return inherited;
    return JOURNEY['/classic'];
  }

  return null;
}

/** The four phases in order, for the bar at the top of every screen. */
export const PHASE_BAR = DOORS.map((d) => ({
  phase: d.phase,
  ordinal: d.ordinal,
  label: d.label,
  to: (d.destinations.find((x) => x.main) ?? d.destinations[0]).to,
}));
