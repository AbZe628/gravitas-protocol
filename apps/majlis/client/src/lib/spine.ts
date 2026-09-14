/**
 * The four doors.
 *
 * A question arrives. The board decides it. The decision governs the bank.
 * Somebody checks the bank obeyed. That is the whole of what a Shariah board
 * does, in the order it does it, and it is the whole of this application.
 *
 * ── why this file exists at all ───────────────────────────────────────────
 *
 * The navigation used to be written out three times: once in the rail, once
 * in the tab bar, once on a page called *Everything else*. They disagreed.
 * `Coming` and `Record` appeared twice each, `Everything else` held twelve
 * links in four headings nobody had picked, and a member hunting for the
 * register had three places to look and no way to guess which.
 *
 * So the structure is data, in one file, and every surface reads it. A screen
 * that is not listed here does not appear in the navigation anywhere, which
 * is a fault this file makes visible instead of hiding.
 *
 * ── the rule for where something goes ─────────────────────────────────────
 *
 * A screen belongs to the phase a person is *in* when they open it, not the
 * phase of the data it shows. The register lists holdings, which were decided
 * long ago — but a person opens it to find out what the bank may do now, so
 * it is **in force** and not **deciding**.
 *
 * Two screens belong to no phase and say so: who the board is, and search,
 * which crosses all four by definition.
 *
 * ── nothing was removed ───────────────────────────────────────────────────
 *
 * Every destination that existed still exists, at the same address. What
 * changed is which heading it sits under. That was the constraint from the
 * start: simplify without losing anything.
 */

export type Phase = 'asked' | 'deciding' | 'inforce' | 'checked';

/**
 * The bank's three. Kept a separate type from the board's four rather than
 * widened into them: things that count per phase — the numbers on the four
 * doors — are about the board's work, and a union would have made the
 * compiler ask for a count of *I owe* in the middle of the board's rail.
 */
export type DeskPhase = 'iasked' | 'bindsme' | 'iowe';

/** Either set, for the parts of the frame both kinds of person share. */
export type AnyPhase = Phase | DeskPhase;

export const PHASES: readonly Phase[] = ['asked', 'deciding', 'inforce', 'checked'];

export interface Destination {
  to: string;
  /** The i18n key for its name. */
  label: string;
  /** The i18n key for the line under it. Shown where there is room. */
  note: string;
  /**
   * True where this is the phase's main screen — the one its row on the
   * arrival page and its tab both open. Exactly one per phase.
   */
  main?: boolean;
  /**
   * Only shown where the installation can honestly offer it.
   *
   * A control that cannot be honoured is absent rather than disabled, which
   * is the rule the whole application follows. The assistant is the only one
   * so far.
   */
  needs?: 'assistant';
}

export interface Door<P extends AnyPhase = Phase> {
  phase: P;
  /** `01` to `04`. The order is the sequence a question travels, so it is information. */
  ordinal: string;
  /** i18n keys. */
  label: string;
  /** One plain sentence saying what this phase is. */
  meaning: string;
  /** The colour this phase is entitled to, from the token vocabulary. */
  tone: 'lapis' | 'attention' | 'settled' | 'breach';
  destinations: readonly Destination[];
}

/**
 * The rail, as it was drawn.
 *
 * ── why this is not the four doors ────────────────────────────────────────
 *
 * `design/Main.dc.html` shows three groups and nine destinations. The rail
 * that was built has five groups and seventeen, and the owner rejected the
 * interface twice before anybody opened the drawing. Almost three times as
 * many places to look is not a matter of taste, and it is the whole of
 * *I cannot find my way at all*.
 *
 * The four doors stay, below, and they stay for what they are actually good
 * at: naming the phase a matter is in, and colouring a record by it. They
 * stopped being the navigation.
 *
 * ── what happened to the other eight ──────────────────────────────────────
 *
 * Nothing was deleted and no address changed. Each one is reached from where
 * it belongs, which is what the drawing implies rather than a rail entry:
 *
 *   `/questions`, `/classic`   the arrival screen is the queue of everything
 *                              waiting, questions and matters together
 *   `/ask`                     from the queue, where a member enters one on
 *                              the institution's behalf
 *   `/check`                   from the contract library, which is what you
 *                              are checking a draft against
 *   `/meetings`, `/undertakings`, `/examinations`
 *                              from `Coming`, which is where every date the
 *                              board is held to already lives
 *   `/briefings`               from `The record`
 *   `/settings`                from the member's own name in the header
 *   `/assistant`               the drawing shows it as a status line at the
 *                              foot of the rail, not as a place to go
 *
 * A destination that is in neither this list nor one of those places is
 * unreachable, and `Reachable.test.tsx` fails rather than letting it hide.
 */
export interface RailGroup {
  /** The i18n key for the heading. Three of them, as drawn. */
  label: string;
  destinations: readonly Destination[];
}

export const RAIL: readonly RailGroup[] = [
  {
    label: 'rail.work',
    destinations: [
      { to: '/', label: 'rail.needsYou', note: 'rail.needsYou.note', main: true },
      { to: '/incidents', label: 'rail.events', note: 'rail.events.note' },
      { to: '/calendar', label: 'rail.coming', note: 'rail.coming.note' },
    ],
  },
  {
    label: 'rail.stands',
    destinations: [
      { to: '/rules', label: 'rail.rulings', note: 'rail.rulings.note', main: true },
      { to: '/record', label: 'rail.record', note: 'rail.record.note' },
      { to: '/search', label: 'rail.search', note: 'rail.search.note' },
    ],
  },
  {
    label: 'rail.hold',
    destinations: [
      { to: '/register', label: 'rail.register', note: 'rail.register.note', main: true },
      { to: '/library', label: 'rail.library', note: 'rail.library.note' },
      { to: '/calculations', label: 'rail.calculations', note: 'rail.calculations.note' },
    ],
  },
];

/** Every address the rail itself offers. Used by the reachability test. */
export const RAIL_ROUTES: readonly string[] = RAIL.flatMap((g) =>
  g.destinations.map((d) => d.to),
);

export const DOORS: readonly Door[] = [
  {
    phase: 'asked',
    ordinal: '01',
    label: 'door.asked',
    meaning: 'door.asked.meaning',
    tone: 'lapis',
    destinations: [
      { to: '/questions', label: 'door.asked.queue', note: 'door.asked.queue.note', main: true },
      { to: '/ask', label: 'door.asked.put', note: 'door.asked.put.note' },
    ],
  },
  {
    phase: 'deciding',
    ordinal: '02',
    label: 'door.deciding',
    meaning: 'door.deciding.meaning',
    tone: 'attention',
    destinations: [
      { to: '/classic', label: 'door.deciding.open', note: 'door.deciding.open.note', main: true },
      { to: '/meetings', label: 'door.deciding.sittings', note: 'door.deciding.sittings.note' },
      { to: '/undertakings', label: 'door.deciding.undertaken', note: 'door.deciding.undertaken.note' },
      { to: '/calendar', label: 'door.deciding.dates', note: 'door.deciding.dates.note' },
    ],
  },
  {
    phase: 'inforce',
    ordinal: '03',
    label: 'door.inforce',
    meaning: 'door.inforce.meaning',
    tone: 'settled',
    destinations: [
      { to: '/rules', label: 'door.inforce.stands', note: 'door.inforce.stands.note', main: true },
      { to: '/register', label: 'door.inforce.register', note: 'door.inforce.register.note' },
      { to: '/library', label: 'door.inforce.contracts', note: 'door.inforce.contracts.note' },
      { to: '/check', label: 'door.inforce.check', note: 'door.inforce.check.note' },
      { to: '/calculations', label: 'door.inforce.figures', note: 'door.inforce.figures.note' },
      { to: '/briefings', label: 'door.inforce.papers', note: 'door.inforce.papers.note' },
    ],
  },
  {
    phase: 'checked',
    ordinal: '04',
    label: 'door.checked',
    meaning: 'door.checked.meaning',
    tone: 'breach',
    destinations: [
      {
        to: '/examinations',
        label: 'door.checked.reviews',
        note: 'door.checked.reviews.note',
        main: true,
      },
      { to: '/incidents', label: 'door.checked.breaches', note: 'door.checked.breaches.note' },
    ],
  },
];

/**
 * The bank's three doors.
 *
 * ── measured, not assumed ────────────────────────────────────────────────
 *
 * A bank signed in and was given the board's entire navigation: seventeen
 * destinations and four doors, every one of them a screen for deciding
 * things a bank does not decide. `/questions` — the board's own triage
 * queue — opened with the instruction *take a question up as a matter, or
 * say why you are not*. `/meetings` offered *convene a sitting*. `/matters`
 * answered in two hundred characters whose only heading was the footer's.
 * `/holdings` answered in fifty-five and had no heading at all.
 *
 * The acts were correctly absent, which is the rule working. The screens
 * were not, which is the rule being applied to controls and not to
 * navigation. A bank was left to work out for itself which of twenty-one
 * places were meant for it.
 *
 * ── why these three and not four ─────────────────────────────────────────
 *
 * A bank is not deciding anything, so it has no *deciding*. What it has is
 * three questions, and they are the only three it ever asks: what did I put
 * to the board and what came back, what may I do and not do, and what do I
 * still owe. Each door is one of those questions in the first person,
 * because a bank opening this is not administering a board — it is finding
 * out where it stands.
 *
 * *I owe* is the one that had nothing at all. `GET /disclosure` has
 * assembled it since the incident work was written — how many breaches were
 * found actual, what money is owed to charity and to whom, whether it is
 * paid, which rectification steps remain — and nothing in the application
 * ever called it.
 */
export const DESK_DOORS: readonly Door<DeskPhase>[] = [
  {
    phase: 'iasked',
    ordinal: '01',
    label: 'desk.asked',
    meaning: 'desk.asked.meaning',
    tone: 'lapis',
    destinations: [{ to: '/ask', label: 'desk.asked.put', note: 'desk.asked.put.note', main: true }],
  },
  {
    phase: 'bindsme',
    ordinal: '02',
    label: 'desk.binds',
    meaning: 'desk.binds.meaning',
    tone: 'settled',
    destinations: [
      { to: '/binds-me', label: 'desk.binds.rulings', note: 'desk.binds.rulings.note', main: true },
      { to: '/may-deal', label: 'desk.binds.deal', note: 'desk.binds.deal.note' },
      { to: '/library', label: 'desk.binds.contracts', note: 'desk.binds.contracts.note' },
      { to: '/check', label: 'desk.binds.check', note: 'desk.binds.check.note' },
    ],
  },
  {
    phase: 'iowe',
    ordinal: '03',
    label: 'desk.owe',
    meaning: 'desk.owe.meaning',
    tone: 'breach',
    destinations: [
      { to: '/i-owe', label: 'desk.owe.outstanding', note: 'desk.owe.outstanding.note', main: true },
      { to: '/undertakings', label: 'desk.owe.undertaken', note: 'desk.owe.undertaken.note' },
    ],
  },
];

/** Which of the bank's three a path is inside, or null. */
export function deskPhaseOf(path: string): DeskPhase | null {
  let best: { phase: DeskPhase; length: number } | null = null;
  for (const door of DESK_DOORS) {
    for (const d of door.destinations) {
      if (path === d.to || path.startsWith(d.to + '/')) {
        if (!best || d.to.length > best.length) best = { phase: door.phase, length: d.to.length };
      }
    }
  }
  return best?.phase ?? null;
}

/**
 * Every screen a bank is meant to be on.
 *
 * Used to tell an institution that has landed on one of the board's screens
 * that it is the board's, rather than showing it an empty version with the
 * board's instructions across the top.
 */
export const DESK_ROUTES: readonly string[] = [
  ...DESK_DOORS.flatMap((d) => d.destinations.map((x) => x.to)),
  '/settings',
  '/search',
  '/account',
  /*
   * Its own breaches. Not a door of its own — a desk does not arrive asking
   * to read the breach register — but *what I owe* links to the board's
   * record of each event, and a link that landed on *this one is the
   * board's* would be this file contradicting itself one screen later.
   */
  '/incidents',
];

/**
 * Whether a bank has anything to do at this address.
 *
 * Arrival is always the bank's: it is a different screen for a desk than for
 * a member, decided in `App`, and not a board screen with parts removed.
 */
export function isDeskRoute(path: string): boolean {
  if (path === '/') return true;
  return DESK_ROUTES.some((r) => path === r || path.startsWith(r + '/'));
}

/**
 * The two that belong to no phase.
 *
 * Kept apart rather than forced under one, because forcing them is exactly
 * how the old *Everything else* page ended up with four headings nobody had
 * chosen. Who the board is, is not a step in deciding anything; search
 * crosses all four by definition.
 */
export const BESIDES: readonly Destination[] = [
  { to: '/settings', label: 'besides.board', note: 'besides.board.note' },
  { to: '/search', label: 'besides.search', note: 'besides.search.note' },
  { to: '/assistant', label: 'besides.assistant', note: 'besides.assistant.note', needs: 'assistant' },
];

/** The screen a phase's row and tab open. */
export function mainOf(door: Door<AnyPhase>): string {
  return (door.destinations.find((d) => d.main) ?? door.destinations[0]).to;
}

/**
 * Which phase a path is inside, or null.
 *
 * Used to light the right tab on a screen that is not itself a listed
 * destination — a single matter, one holding, one incident. Those are opened
 * *from* a phase and a person is still in it.
 */
export function phaseOf(path: string): Phase | null {
  // Longest match wins, so `/register/x` finds `/register` rather than `/`.
  let best: { phase: Phase; length: number } | null = null;
  for (const door of DOORS) {
    for (const d of door.destinations) {
      if (path === d.to || path.startsWith(d.to + '/')) {
        if (!best || d.to.length > best.length) best = { phase: door.phase, length: d.to.length };
      }
    }
  }
  if (best) return best.phase;

  // The screens that are reached from a phase but are not listed under one.
  if (path.startsWith('/matters/')) return 'deciding';
  if (path.startsWith('/classic/')) return 'deciding';
  if (path.startsWith('/record')) return 'inforce';
  return null;
}
