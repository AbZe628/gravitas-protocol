import {
  daysSince,
  grammarFor,
  nextOf,
  say,
  type Group,
  type Passage,
  type Step,
} from './passage-shape.js';
import type { Submission } from '../types.js';
import { matterOf, standingOf } from './submission.js';

/**
 * The passage a question makes from the desk to an answer.
 *
 * ── the shortest passage in the application, on purpose ───────────────────
 *
 * A question has three facts: it arrived, somebody at the board read it, and
 * the board either took it up as a matter or declined and said why. That is
 * all the record holds and it is all this says.
 *
 * The temptation here was to invent the rest — *triaged*, *assigned*,
 * *acknowledged* — because a three-step passage looks thin beside a matter's
 * thirteen. Every one of those would be a step no route can perform and no
 * field can answer, so every one would sit open forever on every question the
 * board has ever received. A passage that cannot be advanced is not structure;
 * it is a reproach the software invented.
 *
 * ── what the desk sent with it ────────────────────────────────────────────
 *
 * A question may arrive with a contract attached, and whether it did changes
 * what the board can do with it — a question about a draft nobody has is a
 * question that will come back. It is reported, never required: plenty of real
 * questions are about a structure rather than a document.
 *
 * ── declining is answering ────────────────────────────────────────────────
 *
 * Not a failure and not an unfinished question. A board that reads something
 * and says *this is not ours, and here is why* has done the work, and the
 * reason is in the record. So it settles the passage exactly as opening a
 * matter does.
 */

const { done, notApplicable, open } = grammarFor('question.step');

function stepsOf(s: Submission): Step[] {
  const steps: Step[] = [];

  steps.push(done('arrived', 'institution', s.arrivedAt));

  /*
   * Read out of a file at the desk, where one came. Never an act for anybody:
   * it is a fact about what arrived, and a board cannot make a bank attach a
   * document it does not have.
   */
  steps.push(
    s.draft
      ? done('contract', 'institution', s.arrivedAt)
      : notApplicable('contract', 'institution', say('question.step.contract.none')),
  );

  const standing = standingOf(s);

  if (standing === 'waiting') {
    steps.push(open('take_up', 'board', say('question.step.take_up.standing')));
  } else if (standing === 'opened') {
    steps.push(
      done('take_up', 'board', s.dispositions[s.dispositions.length - 1]?.at ?? null),
    );
  } else {
    /*
     * Declined or withdrawn. Done rather than skipped: the board answered, or
     * the desk took its own question back, and neither is a step left undone.
     */
    steps.push(
      done('take_up', 'board', s.dispositions[s.dispositions.length - 1]?.at ?? null),
    );
  }

  return steps;
}

const SETTLED = {
  opened: say('question.settled.opened'),
  declined: say('question.settled.declined'),
  withdrawn: say('question.settled.withdrawn'),
} as const;

export function buildQuestionPassage(s: Submission, now: string): Passage {
  const standing = standingOf(s);
  const settledNote = standing === 'waiting' ? null : SETTLED[standing];

  const groups: Group[] = [{ key: 'asking', order: 'sequence', steps: stepsOf(s) }];

  const next = settledNote ? null : nextOf(groups);
  const days = daysSince(s.arrivedAt, now);

  return {
    of: { kind: 'question', id: s.id },
    groups,
    next,
    waiting: settledNote
      ? null
      : {
          days,
          since: s.arrivedAt,
          on: next?.whose ?? 'board',
          /*
           * From when the desk asked, not from when the board recorded it.
           * The difference is the board's own delay in writing it down, and
           * counting from the later of the two would hide exactly that.
           */
          note: say('question.waiting', { days }),
        },
    settled: settledNote,
  };
}

/** The matter it became, for a screen that wants to send somebody there. */
export const becameMatter = matterOf;
