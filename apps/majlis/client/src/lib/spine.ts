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

export interface Door {
  phase: Phase;
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
export function mainOf(door: Door): string {
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
