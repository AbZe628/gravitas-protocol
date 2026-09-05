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

export interface Step {
  key: string;
  /** The act, in the words the interface shows. */
  act: string;
  whose: Whose;
  state: StepState;
  /** When it was done, where that can be said. Null otherwise. */
  at: string | null;
  /**
   * What is in the way, in plain words, or null.
   *
   * Present on an open step whether or not the system would refuse — the
   * distinction is carried by `enforced`, not by hiding one of them.
   */
  standing: string | null;
  /** Whether the system actually refuses to go on without this. */
  enforced: boolean;
  /** What the step is for. Shown where a scholar asks why it exists. */
  why: string;
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
  waiting: { days: number; since: string; on: Whose; note: string } | null;
  /** Said where the matter is finished, in place of a next act. */
  settled: string | null;
}

const DAY = 86_400_000;

const daysSince = (iso: string, now: string): number =>
  Math.max(0, Math.floor((Date.parse(now) - Date.parse(iso)) / DAY));

/** A step that is done, with the moment it became so where that is knowable. */
const done = (key: string, act: string, whose: Whose, why: string, at: string | null = null): Step => ({
  key,
  act,
  whose,
  state: 'done',
  at,
  standing: null,
  enforced: false,
  why,
});

const open = (
  key: string,
  act: string,
  whose: Whose,
  why: string,
  standing: string,
  enforced = false,
): Step => ({ key, act, whose, state: 'open', at: null, standing, enforced, why });

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
      ? done('asked', 'The question, as it was put', 'institution', 'What the board was actually asked. Everything else answers this.', matter.openedAt)
      : open(
          'asked',
          'The question, as it was put',
          'institution',
          'What the board was actually asked. Everything else answers this.',
          'No question has been written down. A matter with no question is a title.',
        ),
  );

  steps.push(
    matter.mechanism.trim()
      ? done('mechanism', 'What actually happens', 'liaison', 'The transaction as it occurs, step by step — before any judgement of it. A board ruling on a description rather than on the thing is the failure this exists to prevent.')
      : open(
          'mechanism',
          'What actually happens',
          'liaison',
          'The transaction as it occurs, step by step — before any judgement of it. A board ruling on a description rather than on the thing is the failure this exists to prevent.',
          'The mechanism has not been written down. This is the step a technical liaison exists for.',
        ),
  );

  steps.push(
    matter.notDecided.length > 0
      ? done('not_decided', 'What is not being decided', 'board', 'Isolating the point at issue, so a later reader cannot take the ruling further than the board took it.')
      : open(
          'not_decided',
          'What is not being decided',
          'board',
          'Isolating the point at issue, so a later reader cannot take the ruling further than the board took it.',
          'Nothing has been set outside the question. A ruling with no stated limits gets read as covering whatever resembles it.',
        ),
  );

  steps.push(
    matter.structureId
      ? done('shape', 'What it is judged against', 'board', 'The contract shape, and with it the conditions this board holds such a contract to.')
      : open(
          'shape',
          'What it is judged against',
          'board',
          'The contract shape, and with it the conditions this board holds such a contract to.',
          'No contract shape has been chosen, so no checklist of conditions applies. Choosing one is the board’s characterisation of the arrangement.',
        ),
  );

  // Conditions only exist once a shape has been chosen, so this is genuinely
  // not applicable rather than merely undone.
  if (!structure) {
    steps.push({
      key: 'conditions',
      act: 'The conditions, answered',
      whose: 'board',
      state: 'not_applicable',
      at: null,
      standing: 'Follows from the shape. Nothing to answer until one is chosen.',
      enforced: false,
      why: 'Each condition is a question the board answers about this arrangement, in its own words.',
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
        ? done('conditions', 'The conditions, answered', 'board', 'Each condition is a question the board answers about this arrangement, in its own words.')
        : open(
            'conditions',
            'The conditions, answered',
            'board',
            'Each condition is a question the board answers about this arrangement, in its own words.',
            `${total - answered} of ${total} conditions are unanswered. A board may also rule against a condition it considers wrongly drawn — that is an answer too.`,
          ),
    );
  }

  const standingSources = matter.sources.filter((s) => !s.withdrawnAt);
  steps.push(
    standingSources.length > 0
      ? done('rests_on', 'What it rests on', 'board', 'The standard, the document, the code, the chain — attributed, so the reasoning can be checked rather than taken.')
      : open(
          'rests_on',
          'What it rests on',
          'board',
          'The standard, the document, the code, the chain — attributed, so the reasoning can be checked rather than taken.',
          'Nothing has been cited. A ruling whose basis is not on the record cannot be checked by anyone who was not in the room.',
        ),
  );

  steps.push(
    matter.proposedRule.parameters.length > 0
      ? done('terms', 'The operative terms', 'board', 'A key, a value, a unit, and what it does. This is the part a system can carry out and the part an auditor tests against.')
      : open(
          'terms',
          'The operative terms',
          'board',
          'A key, a value, a unit, and what it does. This is the part a system can carry out and the part an auditor tests against.',
          'No terms have been stated, so there is nothing for the ruling to operate on.',
        ),
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
function decidingOf(board: Board, matter: Matter, now: string): Step[] {
  const steps: Step[] = [];
  const settled = ['in_force', 'rejected', 'lapsed', 'withdrawn'].includes(matter.status);

  // ── deliberation ──────────────────────────────────────────────────────
  const spoken = matter.deliberation.length > 0;
  steps.push(
    spoken
      ? done('deliberation', 'Say something on it', 'board', 'The record of what the board thought, not only what it concluded. A ruling with no reasoning behind it teaches nobody anything the next time.', matter.deliberation[0]?.at ?? null)
      : matter.status === 'draft'
        ? { key: 'deliberation', act: 'Say something on it', whose: 'board', state: 'ahead', at: null, standing: 'Opens when the matter does.', enforced: false, why: 'The record of what the board thought, not only what it concluded.' }
        : open(
            'deliberation',
            'Say something on it',
            'board',
            'The record of what the board thought, not only what it concluded. A ruling with no reasoning behind it teaches nobody anything the next time.',
            'Nothing has been said on this matter yet. Voting opens after deliberation, not instead of it.',
            // The one thing the lifecycle actually refuses.
            true,
          ),
    );

  // ── the vote opening, which freezes the terms ─────────────────────────
  const voteOpened = ['voting', 'timelock', 'in_force', 'rejected', 'lapsed'].includes(matter.status);
  steps.push(
    voteOpened
      ? done('open_vote', 'Open the vote', 'signatory', 'The terms stop moving here. Every position afterwards is recorded against the hash of exactly these terms, so whether a member approved these words is a comparison rather than a recollection.')
      : spoken
        ? open(
            'open_vote',
            'Open the vote',
            'signatory',
            'The terms stop moving here. Every position afterwards is recorded against the hash of exactly these terms, so whether a member approved these words is a comparison rather than a recollection.',
            'The terms are still moving. Opening the vote fixes them.',
          )
        : { key: 'open_vote', act: 'Open the vote', whose: 'signatory', state: 'ahead', at: null, standing: 'Waits on deliberation.', enforced: false, why: 'The terms stop moving here.' },
  );

  // ── positions ─────────────────────────────────────────────────────────
  const counted = tally(board, matter);
  const required = quorumFor(board, matter.direction);

  if (matter.status === 'voting') {
    const recorded = counted.for + counted.against + counted.abstain;
    steps.push(
      open(
        'positions',
        'Record your position, with your reasoning',
        'signatory',
        'Compulsory, and the reasoning with it. A tally of names without reasons is a show of hands, and a board that cannot say why it decided cannot be followed the next time.',
        counted.outstanding.length > 0
          ? `${recorded} recorded, ${counted.required} needed. Waiting on ${counted.outstanding.join(', ')}.`
          : `${recorded} recorded, ${counted.required} needed.`,
      ),
    );
  } else if (voteOpened) {
    steps.push(done('positions', 'Record your position, with your reasoning', 'signatory', 'Compulsory, and the reasoning with it.'));
  } else {
    steps.push({ key: 'positions', act: 'Record your position, with your reasoning', whose: 'signatory', state: 'ahead', at: null, standing: 'Waits on the vote opening.', enforced: false, why: 'Compulsory, and the reasoning with it.' });
  }

  // ── closing ───────────────────────────────────────────────────────────
  const closed = ['timelock', 'in_force', 'rejected', 'lapsed'].includes(matter.status);
  steps.push(
    closed
      ? done('close', 'Close the vote', 'signatory', 'The threshold permits closing. It never closes itself — a decision that happened because a counter reached a number is a decision nobody took.', matter.settledAt ?? null)
      : matter.status === 'voting'
        ? open(
            'close',
            'Close the vote',
            'signatory',
            'The threshold permits closing. It never closes itself — a decision that happened because a counter reached a number is a decision nobody took.',
            counted.met
              ? `The threshold of ${required} is met. Closing is still an act somebody takes.`
              : `The threshold of ${required} is not met. ${counted.for} in favour so far.`,
          )
        : { key: 'close', act: 'Close the vote', whose: 'signatory', state: 'ahead', at: null, standing: 'Waits on the positions.', enforced: false, why: 'It never closes itself.' },
  );

  // ── the delay ─────────────────────────────────────────────────────────
  if (matter.direction === 'permit') {
    steps.push(
      matter.status === 'timelock'
        ? open(
            'timelock',
            'The delay before it takes effect',
            'clock',
            'A permission takes effect after a delay, during which a member who has seen something can object. A restriction does not wait — waiting is the greater risk there.',
            matter.timelockEndsAt
              ? `Runs until ${matter.timelockEndsAt}. Any member may object during it.`
              : 'Running.',
          )
        : closed
          ? done('timelock', 'The delay before it takes effect', 'clock', 'A permission takes effect after a delay, during which a member who has seen something can object.', matter.timelockEndsAt)
          : { key: 'timelock', act: 'The delay before it takes effect', whose: 'clock', state: 'ahead', at: null, standing: 'Begins when the vote closes.', enforced: false, why: 'A permission takes effect after a delay.' },
    );
  } else {
    steps.push({
      key: 'timelock',
      act: 'The delay before it takes effect',
      whose: 'clock',
      state: 'not_applicable',
      at: null,
      standing: 'A restriction takes effect at once and is ratified afterwards. Waiting is the greater risk.',
      enforced: false,
      why: 'The asymmetry between permitting and restricting.',
    });
  }

  // ── the document ──────────────────────────────────────────────────────
  steps.push(
    matter.status === 'in_force'
      ? done('fatwa', 'The ruling, written up', 'software', 'The ruling, its conditions, how it is implemented, what it rests on, who signed and who disagreed — assembled and ready to send. This is the moment the institution stops waiting.', matter.inForceAt)
      : settled
        ? {
            key: 'fatwa',
            act: 'The ruling, written up',
            whose: 'software',
            state: 'done',
            at: matter.settledAt ?? null,
            standing: null,
            enforced: false,
            why: 'What the board decided, assembled.',
          }
        : {
            key: 'fatwa',
            act: 'The ruling, written up',
            whose: 'software',
            state: 'ahead',
            at: null,
            standing:
              'Produced when the board has decided, and not before. A page that looks final for an open question will be acted on.',
            enforced: false,
            why: 'This is the moment the institution stops waiting.',
          },
  );

  void now;
  return steps;
}

const SETTLED: Record<string, string> = {
  in_force: 'This ruling is in force. What remains is the review it is held to.',
  rejected: 'The board refused this. The reasoning is on the record and stands as precedent.',
  lapsed: 'This lapsed without being ratified inside the window, and no longer stands.',
  withdrawn: 'This was withdrawn before it was decided. Everything said on it remains readable.',
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
 * Found on the screen rather than in a test: an in-force ruling was showing
 * ,
 * which reads as a job for whoever is looking. Its moment has gone; nobody is
 * going to deliberate on a question that was decided in March.
 *
 * It is not simply hidden, because the fact underneath it is worth having: this
 * board brought a permission into force with nothing on the record behind it.
 * So the step is reported as **skipped** — the past tense of open — and says
 * plainly that it did not happen and the matter went ahead. A spine that
 * quietly tidied that away would be improving the record, which is the one
 * thing this application exists to make impossible.
 */
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
    standing: 'This was not done, and the matter was decided without it.',
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
  const deciding = decidingOf(board, matter, now).map((s) => (settledNote ? asPast(s) : s));

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
          note:
            matter.arrivedAt
              ? `${days} days since the institution asked.`
              : `${days} days since this reached the board. The institution may have asked earlier.`,
        },
    settled: settledNote,
  };
}
