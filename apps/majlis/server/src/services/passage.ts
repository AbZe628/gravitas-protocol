/**
 * The passage a matter makes through the board.
 *
 * Everything a scholar needs to answer a question is already in Majlis. What
 * has been missing is the **order**: twelve acts scattered across a page, each
 * one a panel, none of them saying which comes next or whose it is. A board
 * member who has done this before knows. One who has not is looking at a wall
 * of tools and cannot tell whether the matter is nearly decided or barely
 * begun. The design for this is UX.md §7.1 and it was never built.
 *
 * This file builds it, and it builds it as a **reading of the matter** rather
 * than as a workflow the matter is pushed through. Nothing here is stored, and
 * nothing here can be ticked off by hand. A step is done when the thing it
 * describes is actually in the record, and it stops being done if the thing is
 * withdrawn — the same way status and standing are derived everywhere else.
 *
 * ── two phases, because that is the truth of it ───────────────────────────
 *
 * Presenting this as twelve numbered steps would be a lie. Putting a question
 * into shape — writing down the mechanism, saying what is *not* at issue,
 * choosing what it is judged against, citing what it rests on, stating the
 * terms — happens in whatever order the work happens. A member reads a source
 * and it changes the terms; a liaison answers and it changes the mechanism.
 * Numbering those would invent a sequence nobody follows.
 *
 * **Deciding** is different. Deliberation, then the vote, then the delay, then
 * force: each genuinely waits on the one before it, and the lifecycle refuses
 * to reorder them. So `shaping` is a set and `deciding` is a sequence, and the
 * interface can show each as what it is.
 *
 * ── what it will not say ──────────────────────────────────────────────────
 *
 * **It never says the matter is ready to be decided.** That is a ruling. It
 * says what is in the record and what is not — *"three of six conditions are
 * unanswered"*, *"nothing has been said on this matter yet"* — and the board
 * decides what that means. A green tick reading READY TO VOTE would be this
 * file telling a board its question is well enough put, which is the one
 * judgement it has no standing to make.
 *
 * **It distinguishes what the system refuses from what the board has not done.**
 * Only one thing is actually enforced before a vote: that somebody has spoken.
 * Everything else is the board's to skip, and a step that presented an unmet
 * convention as a locked gate would be turning guidance into administration —
 * which is the failure named in [REGISTER.md] and refused everywhere else.
 *
 * **Waiting is a fact about the past.** How long since the question arrived,
 * and on whom it now waits. UX.md §6 calls this the number the product is sold
 * on: it is the first time anyone can see what the board is costing the
 * business. It is never a reproach and never a deadline this file invented.
 */

import { quorumFor, tally } from './lifecycle.js';
import type { Board, Matter, Structure } from '../types.js';

/** Where a step stands. `ahead` means its turn has not come. */
export type StepState = 'done' | 'open' | 'ahead' | 'skipped' | 'not_applicable';

/**
 * Whose act it is.
 *
 * Named on every step, because the commonest way a matter stalls is that
 * everyone believes it is with somebody else.
 */
export type Whose = 'board' | 'signatory' | 'liaison' | 'institution' | 'software' | 'clock';

/**
 * A sentence this file wants said, and what to put in its gaps.
 *
 * ── why these are not words ───────────────────────────────────────────────
 *
 * They were. Every act, every reason and every sentence about what stands in
 * the way was written here in English and rendered exactly as written — about
 * sixty-three of them, and the queue's own acts besides. The application is in
 * three languages, and this is the one text that tells a member what to do: so
 * the chrome was in Arabic and the work was in English, on the screen a board
 * opens first. Nobody noticed because everybody testing it reads English.
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
}

export interface Passage {
  matterId: string;
  /** Putting the question in shape. A set; order is the work's, not ours. */
  shaping: Step[];
  /** Deciding. A sequence, and the lifecycle refuses to reorder it. */
  deciding: Step[];
  /**
   * The one act to do next, or null where nothing is outstanding.
   *
   * The single most useful field here. A scholar opening a matter wants one
   * sentence: what now, and is it mine.
   */
  next: Step | null;
  /** How long the question has been here, and on whom it now waits. */
  waiting: { days: number; since: string; on: Whose; note: Say } | null;
  /** Said where the matter is finished, in place of a next act. */
  settled: Say | null;
}

const DAY = 86_400_000;

const daysSince = (iso: string, now: string): number =>
  Math.max(0, Math.floor((Date.parse(now) - Date.parse(iso)) / DAY));

/**
 * The act and the reason follow from the step's own name, always.
 *
 * `conditions` is `step.conditions.act` and `step.conditions.why`, and there
 * is no way to give a step an act belonging to another. Written out by hand
 * the pair drifted: the same act appeared with two wordings on two screens,
 * which is how a board ends up asking which of them the software meant.
 */
const actOf = (key: string): Say => say(`step.${key}.act`);
const whyOf = (key: string): Say => say(`step.${key}.why`);

/** A step that is done, with the moment it became so where that is knowable. */
const done = (key: string, whose: Whose, at: string | null = null): Step => ({
  key,
  act: actOf(key),
  whose,
  state: 'done',
  at,
  standing: null,
  enforced: false,
  why: whyOf(key),
});

const open = (
  key: string,
  whose: Whose,
  standing: Say,
  enforced = false,
): Step => ({
  key,
  act: actOf(key),
  whose,
  state: 'open',
  at: null,
  standing,
  enforced,
  why: whyOf(key),
});

/** A step whose turn has not come, with the one sentence saying what it waits on. */
const ahead = (key: string, whose: Whose, standing: Say): Step => ({
  key,
  act: actOf(key),
  whose,
  state: 'ahead',
  at: null,
  standing,
  enforced: false,
  why: whyOf(key),
});

/**
 * Putting the question in shape.
 *
 * Each of these is a thing a board would want in front of it before ruling, and
 * not one of them is required by the software. They are reported, and the board
 * decides what an unfinished one means.
 */
function shapingOf(matter: Matter, structure: Structure | null): Step[] {
  const steps: Step[] = [];

  steps.push(
    matter.proposal.trim()
      ? done('asked', 'institution', matter.openedAt)
      : open('asked', 'institution', say('step.asked.standing')),
  );

  steps.push(
    matter.mechanism.trim()
      ? done('mechanism', 'liaison')
      : open('mechanism', 'liaison', say('step.mechanism.standing')),
  );

  steps.push(
    matter.notDecided.length > 0
      ? done('not_decided', 'board')
      : open('not_decided', 'board', say('step.not_decided.standing')),
  );

  steps.push(
    matter.structureId
      ? done('shape', 'board')
      : open('shape', 'board', say('step.shape.standing')),
  );

  // Conditions only exist once a shape has been chosen, so this is genuinely
  // not applicable rather than merely undone.
  if (!structure) {
    steps.push({
      key: 'conditions',
      act: actOf('conditions'),
      whose: 'board',
      state: 'not_applicable',
      at: null,
      standing: say('step.conditions.noShape'),
      enforced: false,
      why: whyOf('conditions'),
    });
  } else {
    const total = structure.conditions.length;
    /*
     * Distinct conditions with a finding that still stands.
     *
     * Superseded findings do not count and duplicates are not double-counted:
     * the record is append-only, a correction is written as a new finding, and
     * counting rows rather than conditions would report a board as further
     * along for having changed its mind.
     */
    const answered = new Set(
      (matter.findings ?? []).filter((f) => !f.supersededAt).map((f) => f.conditionId),
    ).size;
    steps.push(
      answered >= total && total > 0
        ? done('conditions', 'board')
        : open(
            'conditions',
            'board',
            say('step.conditions.standing', { left: total - answered, total }),
          ),
    );
  }

  const standingSources = matter.sources.filter((s) => !s.withdrawnAt);
  steps.push(
    standingSources.length > 0
      ? done('rests_on', 'board')
      : open('rests_on', 'board', say('step.rests_on.standing')),
  );

  steps.push(
    matter.proposedRule.parameters.length > 0
      ? done('terms', 'board')
      : open('terms', 'board', say('step.terms.standing')),
  );

  return steps;
}

/**
 * Deciding.
 *
 * Strictly sequential, and the lifecycle enforces the order. A step whose turn
 * has not come is `ahead` rather than open — showing it as outstanding would
 * put four things in front of a scholar when only one of them is theirs to do.
 */
function decidingOf(
  board: Board,
  matter: Matter,
  now: string,
  /**
   * Whether every condition of the shape has a finding that stands.
   *
   * Passed in rather than worked out again, because `shapingOf` above has
   * already counted them and two counts of one thing is how they come to
   * disagree.
   */
  conditionsSettled: boolean,
): Step[] {
  const steps: Step[] = [];
  const settled = ['in_force', 'rejected', 'lapsed', 'withdrawn'].includes(matter.status);

  // ── deliberation ──────────────────────────────────────────────────────
  const spoken = matter.deliberation.length > 0;
  steps.push(
    spoken
      ? done('deliberation', 'board', matter.deliberation[0]?.at ?? null)
      : matter.status === 'draft'
        ? ahead('deliberation', 'board', say('step.deliberation.ahead'))
        : open(
            'deliberation',
            'board',
            say('step.deliberation.standing'),
            // The one thing the lifecycle actually refuses.
            true,
          ),
    );

  /*
   * ── the vote opening, which freezes the terms ─────────────────────────
   *
   * And which the conditions come before.
   *
   * This step used to open the moment somebody had spoken, whatever state the
   * shape was in — so a matter with four conditions unanswered told its
   * signatory, in the largest words on the screen, to open the vote. Pressing
   * it came back 400 `conditions_unanswered` from `routes/governance.ts`.
   *
   * That is the failure this file exists to prevent, in this file. Two places
   * knew what came next and only one of them was consulted before the sentence
   * was written. A spine that names an act the application will refuse is
   * worse than no spine, because a member trusts it once and then stops.
   *
   * So the step waits, and with it waiting nothing in deciding is open — which
   * sends `next` down to the shaping half and lands it on the conditions,
   * which is the act that actually moves this matter.
   */
  const voteOpened = ['voting', 'timelock', 'in_force', 'rejected', 'lapsed'].includes(matter.status);
  steps.push(
    voteOpened
      ? done('open_vote', 'signatory')
      : !spoken
        ? ahead('open_vote', 'signatory', say('step.open_vote.ahead'))
        : conditionsSettled
          ? open('open_vote', 'signatory', say('step.open_vote.standing'))
          : ahead('open_vote', 'signatory', say('step.open_vote.conditionsFirst')),
  );

  // ── positions ─────────────────────────────────────────────────────────
  const counted = tally(board, matter);
  const required = quorumFor(board, matter.direction);

  if (matter.status === 'voting') {
    const recorded = counted.for + counted.against + counted.abstain;
    steps.push(
      open(
        'positions',
        'signatory',
        counted.outstanding.length > 0
          ? say('step.positions.standingWaiting', {
              recorded,
              needed: counted.required,
              who: counted.outstanding.join(', '),
            })
          : say('step.positions.standing', { recorded, needed: counted.required }),
      ),
    );
  } else if (voteOpened) {
    steps.push(done('positions', 'signatory'));
  } else {
    steps.push(ahead('positions', 'signatory', say('step.positions.ahead')));
  }

  // ── closing ───────────────────────────────────────────────────────────
  const closed = ['timelock', 'in_force', 'rejected', 'lapsed'].includes(matter.status);
  steps.push(
    closed
      ? done('close', 'signatory', matter.settledAt ?? null)
      : matter.status === 'voting'
        ? open(
            'close',
            'signatory',
            counted.met
              ? say('step.close.standingMet', { required })
              : say('step.close.standingShort', { required, inFavour: counted.for }),
          )
        : ahead('close', 'signatory', say('step.close.ahead')),
  );

  // ── the delay ─────────────────────────────────────────────────────────
  if (matter.direction === 'permit') {
    steps.push(
      matter.status === 'timelock'
        ? open(
            'timelock',
            'clock',
            matter.timelockEndsAt
              ? say('step.timelock.standingUntil', { until: matter.timelockEndsAt })
              : say('step.timelock.standingRunning'),
          )
        : closed
          ? done('timelock', 'clock', matter.timelockEndsAt)
          : ahead('timelock', 'clock', say('step.timelock.ahead')),
    );
  } else {
    steps.push({
      key: 'timelock',
      act: actOf('timelock'),
      whose: 'clock',
      state: 'not_applicable',
      at: null,
      standing: say('step.timelock.restricting'),
      enforced: false,
      why: whyOf('timelock'),
    });
  }

  // ── the document ──────────────────────────────────────────────────────
  steps.push(
    matter.status === 'in_force'
      ? done('fatwa', 'software', matter.inForceAt)
      : settled
        ? done('fatwa', 'software', matter.settledAt ?? null)
        : ahead('fatwa', 'software', say('step.fatwa.ahead')),
  );

  void now;
  return steps;
}

const SETTLED: Record<string, Say> = {
  in_force: say('passage.settled.in_force'),
  rejected: say('passage.settled.rejected'),
  lapsed: say('passage.settled.lapsed'),
  withdrawn: say('passage.settled.withdrawn'),
};

/**
 * On whom the matter now waits.
 *
 * Not who is at fault. A matter in timelock waits on a clock and nobody is
 * holding it up; a matter in deliberation waits on the board and that is the
 * ordinary state of a question being thought about.
 */
function waitingOn(matter: Matter, next: Step | null): Whose {
  if (matter.status === 'timelock') return 'clock';
  return next?.whose ?? 'board';
}

/**
 * A settled matter has no outstanding acts.
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
 * plainly that it did not happen and the matter went ahead anyway. A spine that
 * quietly tidied that away would be improving the record, which is the one
 * thing this application exists to make impossible.
 */
function asPast(step: Step): Step {
  if (step.state === 'done' || step.state === 'not_applicable') return step;
  return {
    ...step,
    state: 'skipped',
    // Never enforced in the past tense. Nothing is being refused any more.
    enforced: false,
    standing: say('step.notDone'),
  };
}

export function buildPassage(
  board: Board,
  matter: Matter,
  structure: Structure | null,
  now: string,
): Passage {
  const settledNote = SETTLED[matter.status] ?? null;

  const shaping = shapingOf(matter, structure).map((s) => (settledNote ? asPast(s) : s));

  /*
   * Read off the shaping half rather than counted a second time. A step that
   * is done, or that cannot apply because no shape was chosen, is not in the
   * way of the vote; an open one is, and the route refuses on exactly that.
   */
  const conditions = shaping.find((s) => s.key === 'conditions');
  const conditionsSettled =
    conditions === undefined || conditions.state === 'done' || conditions.state === 'not_applicable';

  const deciding = decidingOf(board, matter, now, conditionsSettled).map((s) =>
    settledNote ? asPast(s) : s,
  );

  /*
   * The next act, and deciding comes first.
   *
   * A matter mid-vote whose mechanism was never written down has two
   * outstanding things, and the vote is the one in front of the board. Putting
   * the shaping step first would send a member back to paperwork while a
   * colleague waits on their position — and the shaping steps stay visible
   * beside it either way, so nothing is hidden by the choice.
   */
  const next = settledNote
    ? null
    : deciding.find((s) => s.state === 'open') ?? shaping.find((s) => s.state === 'open') ?? null;

  const arrived = matter.arrivedAt ?? matter.openedAt;
  const days = daysSince(arrived, now);

  return {
    matterId: matter.id,
    shaping,
    deciding,
    next,
    waiting: settledNote
      ? null
      : {
          days,
          since: arrived,
          on: waitingOn(matter, next),
          note: matter.arrivedAt
            ? say('passage.waiting.sinceAsked', { days })
            : say('passage.waiting.sinceReached', { days }),
        },
    settled: settledNote,
  };
}
