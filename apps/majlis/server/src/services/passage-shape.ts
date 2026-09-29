/**
 * The grammar of work, apart from any one kind of work.
 *
 * ── why this is its own file ──────────────────────────────────────────────
 *
 * The grammar was written for matters and lived inside the matter's own
 * reading, which made it look like a matter's private business. It is not. A
 * reported breach, a question at the desk, an undertaking given at a sitting
 * and a ruling whose review has come round are all the same thing: something
 * that stands somewhere, with one act next, belonging to somebody, waiting on
 * something nameable.
 *
 * Because the grammar was not reachable, three more were written. The queue
 * kept a hand table of six breach stages. The breach screen kept nine steps in
 * a component, with `current: i.stage === 'reported'` written out by hand, and
 * different words for the same acts. Questions, undertakings, reviews and
 * register holdings got none at all — which is why they are the screens that
 * feel like a list and a button rather than like work.
 *
 * So the vocabulary lives here and each kind writes only its own reading of
 * the record. One grammar, five readings.
 *
 * ── what a reading may and may not do ─────────────────────────────────────
 *
 * Nothing is stored and nothing can be ticked off by hand. A step is done when
 * the thing it describes is in the record, and it stops being done if the
 * thing is withdrawn — the same way status and standing are derived
 * everywhere else in this application.
 *
 * A reading says what is in the record and what is not. It never says the work
 * is *ready* — that a question is well enough put to decide, that a plan is
 * good enough to endorse. Those are rulings, and the board makes them.
 */

/** Where a step stands. `ahead` means its turn has not come. */
export type StepState = 'done' | 'open' | 'ahead' | 'skipped' | 'not_applicable';

/**
 * Whose act it is.
 *
 * Named on every step, because the commonest way anything here stalls is that
 * everyone believes it is with somebody else.
 *
 * A role and not a person. Which person, of the people who could, is doing
 * it is a separate record — see `assignment.ts` — written onto the step as
 * `who` after the reading, so the reading itself never knows.
 */
export type Whose = 'board' | 'signatory' | 'liaison' | 'institution' | 'software' | 'clock';

/**
 * A sentence the server wants said, and what to put in its gaps.
 *
 * ── why these are not words ───────────────────────────────────────────────
 *
 * They were. Every act, every reason and every sentence about what stands in
 * the way was written in English and rendered exactly as written. The
 * application is in three languages, and this is the one text that tells a
 * member what to do: so the chrome was in Arabic and the work was in English,
 * on the screen a board opens first. Nobody noticed because everybody testing
 * it reads English.
 *
 * The server says **which** sentence and **with what figures**. What the
 * sentence is in is the reader's business and the interface's.
 */
export interface Say {
  /** The i18n key, looked up on the other side. */
  key: string;
  /** Substituted into `{name}` gaps, where a sentence counts something. */
  vars?: Record<string, string | number>;
}

export const say = (key: string, vars?: Record<string, string | number>): Say =>
  vars ? { key, vars } : { key };

export interface Step {
  key: string;
  /** The act, as a sentence the interface says in the reader's language. */
  act: Say;
  whose: Whose;
  state: StepState;
  /** When it was done, where that can be said. Null otherwise. */
  at: string | null;
  /**
   * What is in the way, or null.
   *
   * Present on an open step whether or not the system would refuse — the
   * distinction is carried by `enforced`, not by hiding one of them.
   */
  standing: Say | null;
  /** Whether the system actually refuses to go on without this. */
  enforced: boolean;
  /** What the step is for. Shown where a scholar asks why it exists. */
  why: Say;
  /**
   * The person this step is with, where anybody holds it — a scholar id.
   *
   * An undertaking names the member who gave it, on the step that person
   * carries out. Every other one is an assignment, written on by
   * `withAssignments` and only on a step still to be done that a person on
   * the board can hold.
   *
   * `who` and not `whoName`, because it is not a name. It was called
   * `whoName`, and the queue drew it as one: the column that says who is
   * holding something up read `member-a`, a key from a configuration file.
   * Two routes do send a name in a field called `whoName` — the undertakings
   * and the margin notes resolve it on the server — so the same word meant a
   * name in one place and an id in the other, and each screen had to know
   * which. `who` is an id everywhere here, as it is on an undertaking; the
   * screen turns it into a name.
   *
   * The queue once took the name from the record rather than from the step,
   * so an undertaking whose next act was *the board sets a date* was listed
   * against the member who gave it — naming the wrong person as the one
   * holding it up, on the screen everybody opens first.
   */
  who?: string;
  /**
   * Who has already said theirs, on a step each of several says theirs on —
   * scholar ids, and only on such a step while it is open.
   *
   * A vote and a finding on a breach are one step, open until enough have
   * spoken, and every signatory's. Read without this, the step was every
   * signatory's still after one of them had spoken: *what needs you* listed
   * the vote as theirs to cast when it was cast, and the breach offered the
   * member who had just said *a breach* the same button again, which the
   * route refuses. The step is open; it is not open to them.
   */
  heard?: string[];
  /**
   * Who it still waits on, where that can be named — scholar ids, turned into
   * names by the screen. It was written into the sentence instead, and the
   * sentence read *waiting on member-c, member-d, member-e*.
   */
  waitingOn?: string[];
  /**
   * Who is carrying this one step, where somebody has been given it, and who
   * placed it with them.
   *
   * Separate from `who`, which is the person the step is *with* whatever the
   * reason: an undertaking's `account` step carries the member who gave the
   * promise, and nobody placed that with them. A control built on `who` would
   * have offered *put it back to the board* on a promise, which is not a thing
   * that can be put back.
   *
   * Written by `withAssignments`, never by a reading, for the same reason
   * `Passage.holder` is: where a step is held is not a fact about the record.
   */
  holder?: { to: string; by: string; at: string } | null;
  /**
   * Whether this step is one a member of this board could take on at all.
   *
   * The whole thing has the same field for the same reason. A control that
   * cannot be honoured is absent, not disabled: *take this step* on the bank's
   * own filing would be a button the server refuses, offered on every breach.
   */
  holdable?: boolean;
}

/**
 * Whether the steps of a group wait on each other.
 *
 * Not decoration: it decides whether the interface numbers them. Putting a
 * question into shape happens in whatever order the work happens — a member
 * reads a source and it changes the terms — so numbering those would invent a
 * sequence nobody follows. Deciding genuinely waits on itself and the
 * lifecycle refuses to reorder it.
 */
export type Order = 'set' | 'sequence';

/**
 * One half of a passage: a run of steps that belong together.
 *
 * Groups rather than two fixed fields, because the two halves are not the same
 * two halves for every kind of work. A matter has *putting the question in
 * shape* and *deciding*. A breach has *establishing what happened* and
 * *putting it right* — both sequences, and neither of them a matter's phase.
 * Two hard-coded fields named after a matter's phases would have meant every
 * other kind pretending to have them.
 */
export interface Group {
  /**
   * Names this group and the sentence under it: `passage.group.<key>` and
   * `passage.group.<key>.hint`.
   */
  key: string;
  order: Order;
  steps: Step[];
}

/** What a passage is the passage of. */
export type PassageKind = 'matter' | 'breach' | 'question' | 'undertaking' | 'review';

export interface Passage {
  of: { kind: PassageKind; id: string };
  groups: Group[];
  /**
   * The one act to do next, or null where nothing is outstanding.
   *
   * The single most useful field here. Somebody opening this wants one
   * sentence: what now, and is it mine.
   */
  next: Step | null;
  /** How long this has been here, and on whom it now waits. */
  waiting: { days: number; since: string; on: Whose; note: Say } | null;
  /** Said where the work is finished, in place of a next act. */
  settled: Say | null;
  /**
   * Who is carrying the whole of it, where anybody is, and who said so.
   *
   * Absent from every reading and written on by `withAssignments`, so the
   * readings never know. It is what a screen needs to offer *take this* or
   * *put it back* without working out from the record itself who holds it —
   * which would be a second place deciding, the fault this grammar exists to
   * remove.
   */
  holder?: { to: string; by: string; at: string } | null;
  /**
   * Whether there is anything left here a person on this board could hold:
   * a step of the board's or a signatory's still to be done. Written by
   * `withAssignments` from the same rule the route refuses on, so a screen
   * offering *take this* offers it exactly where taking it would mean
   * something.
   */
  holdable?: boolean;
}

export const DAY = 86_400_000;

export const daysSince = (iso: string, now: string): number =>
  Math.max(0, Math.floor((Date.parse(now) - Date.parse(iso)) / DAY));

/** The four ways a reading may put a step, bound to one kind's namespace. */
export interface Grammar {
  /** A step that is done, with the moment it became so where that is knowable. */
  done: (key: string, whose: Whose, at?: string | null) => Step;
  open: (key: string, whose: Whose, standing: Say, enforced?: boolean) => Step;
  /** A step whose turn has not come, and the one sentence saying what it waits on. */
  ahead: (key: string, whose: Whose, standing: Say) => Step;
  /**
   * A step that cannot apply, which is different from one not yet done.
   *
   * A restriction has no delay before it takes effect; a breach found not to be
   * one has no plan to file. Reporting those as outstanding would put work in
   * front of somebody that nobody will ever do.
   */
  notApplicable: (key: string, whose: Whose, standing: Say) => Step;
  /** The sentence keys for a step, where a reading needs them directly. */
  actOf: (key: string) => Say;
  whyOf: (key: string) => Say;
}

/**
 * The grammar, bound to one kind of work's sentences.
 *
 * ── the act and the reason follow from the step's own name ────────────────
 *
 * A matter's `conditions` is `step.conditions.act` and `step.conditions.why`,
 * and there is no way to give a step an act belonging to another. Written out
 * by hand the pair drifted: the same act appeared with two wordings on two
 * screens, which is how a board ends up asking which of them the software
 * meant.
 *
 * ── and why the namespace is an argument ──────────────────────────────────
 *
 * Because the names collide. A matter's deciding ends with **close** — the
 * chair closes the vote. A breach ends with **close** too — the board closes
 * the file once purification is recorded. Two different acts, by two different
 * people, at two unrelated moments.
 *
 * With one flat namespace the second `step.close.act` written into the
 * dictionary would have silently replaced the first, and a board would have
 * read *close the file once purification is recorded* on the last step of an
 * ordinary vote. Nothing would have failed: not `tsc`, which sees a string;
 * not the key guard, which only asks whether a key has words behind it. It
 * would have been found by somebody reading a screen, if at all.
 *
 * So a matter's steps live under `step.` and a breach's under `breach.step.`,
 * and a collision between two kinds is not possible rather than merely
 * unlikely.
 */
export function grammarFor(namespace: string): Grammar {
  const actOf = (key: string): Say => say(`${namespace}.${key}.act`);
  const whyOf = (key: string): Say => say(`${namespace}.${key}.why`);

  const put = (
    key: string,
    whose: Whose,
    state: StepState,
    at: string | null,
    standing: Say | null,
    enforced: boolean,
  ): Step => ({ key, act: actOf(key), whose, state, at, standing, enforced, why: whyOf(key) });

  return {
    actOf,
    whyOf,
    done: (key, whose, at = null) => put(key, whose, 'done', at, null, false),
    open: (key, whose, standing, enforced = false) =>
      put(key, whose, 'open', null, standing, enforced),
    ahead: (key, whose, standing) => put(key, whose, 'ahead', null, standing, false),
    notApplicable: (key, whose, standing) =>
      put(key, whose, 'not_applicable', null, standing, false),
  };
}

/**
 * A settled thing has no outstanding acts.
 *
 * Found on the screen rather than in a test. An in-force ruling was showing its
 * first step as open and marked required, with the sentence saying nothing had
 * been said on the matter yet — which reads as a job for whoever is looking.
 * Its moment has gone; nobody is going to deliberate on a question that was
 * decided in March.
 *
 * It is not simply hidden, because the fact underneath it is worth having: this
 * board brought a permission into force with nothing on the record behind it.
 * So the step is reported as **skipped** — the past tense of open — and says
 * plainly that it did not happen and the thing went ahead anyway. A spine that
 * quietly tidied that away would be improving the record, which is the one
 * thing this application exists to make impossible.
 */
export function asPast(step: Step): Step {
  if (step.state === 'done' || step.state === 'not_applicable') return step;
  return {
    ...step,
    state: 'skipped',
    // Never enforced in the past tense. Nothing is being refused any more.
    enforced: false,
    standing: say('step.notDone'),
  };
}

/**
 * The first open step, searching the groups in the order they are given.
 *
 * ── the order is the reading's to choose, not this function's ─────────────
 *
 * Which half to look in first is a judgement about the work, and the two kinds
 * that exist so far answer it opposite ways.
 *
 * A matter mid-vote whose mechanism was never written down has two outstanding
 * things, and **the vote is the one in front of the board**: sending a member
 * back to paperwork while a colleague waits on their position would be the
 * wrong act, so a matter searches deciding before shaping.
 *
 * A breach is the other way. An activity that has not stopped outranks a plan
 * that has not been filed — the money is still being earned while the
 * paperwork is drafted — so a breach searches **establishing what happened**
 * first, in the order the work runs.
 *
 * Baking either of those into this function would have made the other one
 * wrong silently, which is why the caller passes the order it means.
 */
export function nextOf(groups: readonly Group[]): Step | null {
  for (const group of groups) {
    const found = group.steps.find((s) => s.state === 'open');
    if (found) return found;
  }
  return null;
}
