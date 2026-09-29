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
import {
  asPast,
  daysSince,
  grammarFor,
  nextOf as pickNext,
  say,
  type Group,
  type Passage,
  type Say,
  type Step,
  type Whose,
} from './passage-shape.js';
import type { Board, Matter, Structure } from '../types.js';

/**
 * A matter's steps live under `step.`, which is where they have always lived.
 * A breach's live under `breach.step.`; see `grammarFor`, which explains why
 * the two may not share.
 */
const { ahead, done, notApplicable, open } = grammarFor('step');

/*
 * Re-exported because the grammar used to live here and half the application
 * imports it from this address. The words are one set for every kind of work
 * now; see passage-shape.ts.
 */
export {
  say,
  type Group,
  type Order,
  type Passage,
  type PassageKind,
  type Say,
  type Step,
  type StepState,
  type Whose,
} from './passage-shape.js';


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
    steps.push(notApplicable('conditions', 'board', say('step.conditions.noShape')));
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
    /*
     * Who has cast theirs, counted the way the tally counts: a signatory whose
     * position was not released. Everyone else seated to vote is who it still
     * waits on — named by the screen, not by this sentence.
     */
    const heard = board.members
      .filter((m) => m.signatory && !counted.outstanding.includes(m.id))
      .map((m) => m.id);
    steps.push({
      ...open('positions', 'signatory', say('step.positions.standing', { recorded, needed: counted.required })),
      ...(heard.length > 0 ? { heard } : {}),
      ...(counted.outstanding.length > 0 ? { waitingOn: [...counted.outstanding] } : {}),
    });
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
    steps.push(notApplicable('timelock', 'clock', say('step.timelock.restricting')));
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
   * Putting the question in shape is a set: a member reads a source and it
   * changes the terms, a liaison answers and it changes the mechanism, and
   * numbering those would invent a sequence nobody follows. Deciding genuinely
   * waits on itself, and the lifecycle refuses to reorder it.
   */
  const groups: Group[] = [
    { key: 'shaping', order: 'set', steps: shaping },
    { key: 'deciding', order: 'sequence', steps: deciding },
  ];

  /*
   * Searched deciding first, which is why the groups go in reversed: the vote
   * is what is in front of the board, and a matter mid-vote whose mechanism
   * was never written down should not send a member back to paperwork while a
   * colleague waits on their position. Both halves stay visible either way, so
   * nothing is hidden by the choice — only the one sentence at the top changes.
   */
  const next = settledNote ? null : pickNext([groups[1], groups[0]]);

  const arrived = matter.arrivedAt ?? matter.openedAt;
  const days = daysSince(arrived, now);

  return {
    of: { kind: 'matter', id: matter.id },
    groups,
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
