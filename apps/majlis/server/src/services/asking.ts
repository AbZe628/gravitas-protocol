/**
 * Asking the institution something, from the step that needs it.
 *
 * ── the gap this closes ───────────────────────────────────────────────────
 *
 * A condition regularly requires something the draft never mentions: whether
 * the asset is owned before the sale is made, what the custodian actually
 * confirms each month, which of two dates the profit is struck on. Until now a
 * board had three options and all three were bad. Guess. Record *not met* for
 * something that might well be met. Or leave the software, send an email, and
 * come back to a case that says it is waiting with nothing saying what for.
 *
 * ── asking is not answering ───────────────────────────────────────────────
 *
 * A step with a question outstanding is still unanswered, and the vote still
 * waits for it. Nothing here touches a finding. What the question changes is
 * **whose** delay it is, which the clock then reports honestly.
 *
 * ── and the time is separated, never hidden ───────────────────────────────
 *
 * The hours between a question and its answer are counted and taken off the
 * board's own time, and the elapsed time is still reported in full beside it.
 * A pace figure that quietly shrank whenever somebody asked a question would
 * be a figure a bank could not audit, and would reward asking.
 *
 * Overlapping questions count once. Two asked on the same morning are one
 * period of waiting, not two, and a board that asked three would otherwise
 * appear to have been waiting three times as long as it was.
 */

import { randomUUID } from 'node:crypto';
import type { AskedOfTheInstitution, Matter } from '../types.js';
import { Refused, type RefusalCode } from './lifecycle.js';

const MIN_QUESTION = 10;
const MAX_QUESTION = 4_000;

function refuse(error: RefusalCode, message: string): never {
  throw new Refused(error, message);
}

/** Statuses a question may be put during. A settled case is not asking. */
const OPEN = ['draft', 'deliberation', 'voting', 'timelock'];

export function askTheInstitution(
  matter: Matter,
  input: { conditionId?: string | null; asking: string },
  by: string,
  at: string,
): Matter {
  if (!OPEN.includes(matter.status)) {
    refuse(
      'already_settled',
      'This case has settled. A question about it now belongs to a new case rather than to this one, ' +
        'which the record has already closed.',
    );
  }

  const asking = (input.asking ?? '').trim();
  if (asking.length < MIN_QUESTION) {
    refuse(
      'no_question',
      'The question has to say what is being asked. A desk that receives "please clarify" sends back ' +
        'a paragraph nobody can act on, and the case waits twice.',
    );
  }
  if (asking.length > MAX_QUESTION) {
    refuse('too_long', 'That is longer than a question. Ask the part that is holding the case up.');
  }

  /*
   * The same condition, asked twice, with the first still outstanding.
   *
   * Refused rather than allowed: the desk gets two messages about one thing
   * and the board cannot tell which answer belongs to which. Withdrawing is
   * not offered either — the question was sent, and pretending otherwise
   * would be the record rewriting what happened.
   */
  const outstanding = (matter.asked ?? []).find(
    (q) => q.answeredAt === null && (q.conditionId ?? null) === (input.conditionId ?? null),
  );
  if (outstanding) {
    refuse(
      'already_asked',
      'There is already a question outstanding on this. Wait for the answer, or ask about something else: ' +
        'two questions about one condition give the desk no way to say which it is answering.',
    );
  }

  const question: AskedOfTheInstitution = {
    id: randomUUID(),
    conditionId: input.conditionId ?? null,
    asking,
    askedBy: by,
    askedAt: at,
    answer: null,
    answeredBy: null,
    answeredAt: null,
  };

  return { ...matter, asked: [...(matter.asked ?? []), question] };
}

export function answerFromTheInstitution(
  matter: Matter,
  questionId: string,
  answer: string,
  by: string,
  at: string,
): Matter {
  const asked = matter.asked ?? [];
  const question = asked.find((q) => q.id === questionId);
  if (!question) {
    refuse('no_such_question', 'There is no such question on this case.');
  }
  if (question.answeredAt) {
    refuse(
      'already_answered',
      'That question has been answered. A correction is a new question rather than a second answer to ' +
        'the same one, so the board can see what changed.',
    );
  }

  const said = (answer ?? '').trim();
  if (said.length < MIN_QUESTION) {
    refuse(
      'no_answer',
      'The answer has to say something. A case held up for a week and released by the word "yes" leaves ' +
        'the board with the same question it started with.',
    );
  }
  if (said.length > MAX_QUESTION) {
    refuse('too_long', 'Longer than this belongs in a document attached to the case.');
  }

  return {
    ...matter,
    asked: asked.map((q) =>
      q.id === questionId ? { ...q, answer: said, answeredBy: by, answeredAt: at } : q,
    ),
  };
}

/** True while anything on this case is waiting on the institution. */
export function waitingOnTheInstitution(matter: Matter): boolean {
  return (matter.asked ?? []).some((q) => q.answeredAt === null);
}

/**
 * Whole hours this case spent waiting on the institution, between two instants.
 *
 * Overlapping questions are merged so a period of waiting is counted once. The
 * window is clipped to `from`/`to` so a case measured from its arrival does not
 * count time before it, and a settled one does not keep accruing.
 */
export function hoursWithTheInstitution(matter: Matter, from: string, to: string): number {
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;

  const spans: { a: number; b: number }[] = [];
  for (const q of matter.asked ?? []) {
    const a = Date.parse(q.askedAt);
    // Still outstanding: it is waiting up to the end of the window.
    const b = q.answeredAt ? Date.parse(q.answeredAt) : end;
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;

    const clippedA = Math.max(a, start);
    const clippedB = Math.min(b, end);
    if (clippedB > clippedA) spans.push({ a: clippedA, b: clippedB });
  }

  if (spans.length === 0) return 0;

  spans.sort((x, y) => x.a - y.a);
  let total = 0;
  let { a, b } = spans[0];
  for (const span of spans.slice(1)) {
    if (span.a <= b) {
      b = Math.max(b, span.b);
    } else {
      total += b - a;
      a = span.a;
      b = span.b;
    }
  }
  total += b - a;

  return Math.floor(total / 3_600_000);
}
