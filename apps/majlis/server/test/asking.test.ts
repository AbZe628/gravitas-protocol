import { describe, it, expect } from 'vitest';
import {
  answerFromTheInstitution,
  askTheInstitution,
  hoursWithTheInstitution,
  waitingOnTheInstitution,
} from '../src/services/asking.js';
import { Refused } from '../src/services/lifecycle.js';
import type { Matter } from '../src/types.js';

/**
 * A question the board puts to the institution, and what it does to the clock.
 *
 * What these hold to:
 *
 * **Asking is not answering.** A condition with a question outstanding is
 * still unanswered, and nothing here touches a finding.
 *
 * **The elapsed time stays elapsed.** The hours spent waiting on the bank are
 * reported beside it rather than taken out of it. A clock that quietly shrank
 * whenever somebody asked a question would reward asking and would be a figure
 * a bank could not audit.
 *
 * **Overlapping questions count once.** Two asked on the same morning are one
 * period of waiting, and a board that asked three would otherwise look as
 * though it had waited three times as long as it did.
 */

const H = (n: number) => new Date(Date.UTC(2026, 8, 1, n)).toISOString();

const matter = (over: Partial<Matter> = {}): Matter =>
  ({
    id: 'matter-1',
    boardId: 'demo-board',
    title: 'Whether this arrangement may be offered',
    status: 'deliberation',
    openedAt: H(0),
    ...over,
  }) as Matter;

const refusalOf = (run: () => unknown): Refused => {
  try {
    run();
  } catch (e) {
    if (e instanceof Refused) return e;
    throw e;
  }
  throw new Error('it was not refused');
};

const QUESTION = 'Does the institution take possession of the asset before it sells it on, and what shows that?';
const ANSWER = 'Possession passes on the warehouse receipt, which the custodian issues before the sale is struck.';

describe('putting a question', () => {
  it('keeps what was asked, by whom and when', () => {
    const asked = askTheInstitution(matter(), { conditionId: 'ownership', asking: QUESTION }, 'member-a', H(2));
    expect(asked.asked).toHaveLength(1);
    expect(asked.asked?.[0]).toMatchObject({
      conditionId: 'ownership',
      asking: QUESTION,
      askedBy: 'member-a',
      askedAt: H(2),
      answer: null,
      answeredAt: null,
    });
  });

  it('refuses one too short to act on', () => {
    const refused = refusalOf(() => askTheInstitution(matter(), { asking: 'clarify' }, 'member-a', H(2)));
    expect(refused.code).toBe('no_question');
    expect(refused.message).toMatch(/waits twice/);
  });

  it('refuses a second question on a condition while the first is outstanding', () => {
    const once = askTheInstitution(matter(), { conditionId: 'ownership', asking: QUESTION }, 'member-a', H(2));
    const refused = refusalOf(() =>
      askTheInstitution(once, { conditionId: 'ownership', asking: QUESTION }, 'member-b', H(3)),
    );
    expect(refused.code).toBe('already_asked');
  });

  it('allows a second once the first is answered', () => {
    const once = askTheInstitution(matter(), { conditionId: 'ownership', asking: QUESTION }, 'member-a', H(2));
    const back = answerFromTheInstitution(once, once.asked![0].id, ANSWER, 'desk-treasury', H(6));
    const again = askTheInstitution(back, { conditionId: 'ownership', asking: QUESTION }, 'member-a', H(7));
    expect(again.asked).toHaveLength(2);
  });

  it('refuses one on a case that has settled', () => {
    const refused = refusalOf(() =>
      askTheInstitution(matter({ status: 'in_force' }), { asking: QUESTION }, 'member-a', H(2)),
    );
    expect(refused.code).toBe('already_settled');
  });
});

describe('the answer', () => {
  it('is recorded against the question rather than replacing it', () => {
    const once = askTheInstitution(matter(), { conditionId: 'ownership', asking: QUESTION }, 'member-a', H(2));
    const back = answerFromTheInstitution(once, once.asked![0].id, ANSWER, 'desk-treasury', H(6));

    expect(back.asked![0].asking).toBe(QUESTION);
    expect(back.asked![0].answer).toBe(ANSWER);
    expect(back.asked![0].answeredBy).toBe('desk-treasury');
  });

  it('is refused twice on one question, because a correction is a new question', () => {
    const once = askTheInstitution(matter(), { asking: QUESTION }, 'member-a', H(2));
    const back = answerFromTheInstitution(once, once.asked![0].id, ANSWER, 'desk-treasury', H(6));
    const refused = refusalOf(() =>
      answerFromTheInstitution(back, back.asked![0].id, ANSWER, 'desk-treasury', H(8)),
    );
    expect(refused.code).toBe('already_answered');
  });

  it('is refused when it says nothing', () => {
    const once = askTheInstitution(matter(), { asking: QUESTION }, 'member-a', H(2));
    const refused = refusalOf(() => answerFromTheInstitution(once, once.asked![0].id, 'yes', 'desk', H(6)));
    expect(refused.code).toBe('no_answer');
    expect(refused.message).toMatch(/same question it started with/);
  });
});

describe('what it does to the clock', () => {
  it('counts the hours between the question and its answer', () => {
    const once = askTheInstitution(matter(), { asking: QUESTION }, 'member-a', H(2));
    const back = answerFromTheInstitution(once, once.asked![0].id, ANSWER, 'desk', H(6));
    expect(hoursWithTheInstitution(back, H(0), H(10))).toBe(4);
  });

  it('counts an outstanding question up to now and no further', () => {
    const once = askTheInstitution(matter(), { asking: QUESTION }, 'member-a', H(2));
    expect(hoursWithTheInstitution(once, H(0), H(9))).toBe(7);
    expect(waitingOnTheInstitution(once)).toBe(true);
  });

  it('counts overlapping questions once', () => {
    let m = askTheInstitution(matter(), { conditionId: 'a', asking: QUESTION }, 'member-a', H(2));
    m = askTheInstitution(m, { conditionId: 'b', asking: QUESTION }, 'member-a', H(3));
    m = answerFromTheInstitution(m, m.asked![0].id, ANSWER, 'desk', H(6));
    m = answerFromTheInstitution(m, m.asked![1].id, ANSWER, 'desk', H(8));

    // Two questions, six hours of asking between them, but only 2→8 of waiting.
    expect(hoursWithTheInstitution(m, H(0), H(10))).toBe(6);
  });

  it('counts two separate waits separately', () => {
    let m = askTheInstitution(matter(), { conditionId: 'a', asking: QUESTION }, 'member-a', H(2));
    m = answerFromTheInstitution(m, m.asked![0].id, ANSWER, 'desk', H(4));
    m = askTheInstitution(m, { conditionId: 'b', asking: QUESTION }, 'member-a', H(7));
    m = answerFromTheInstitution(m, m.asked![1].id, ANSWER, 'desk', H(8));

    expect(hoursWithTheInstitution(m, H(0), H(10))).toBe(3);
  });

  it('clips to the window, so time before arrival is not counted', () => {
    const once = askTheInstitution(matter(), { asking: QUESTION }, 'member-a', H(2));
    const back = answerFromTheInstitution(once, once.asked![0].id, ANSWER, 'desk', H(9));
    // Measured only from hour five: four of the seven hours fall inside it.
    expect(hoursWithTheInstitution(back, H(5), H(10))).toBe(4);
  });

  it('is nothing at all where nobody asked', () => {
    expect(hoursWithTheInstitution(matter(), H(0), H(10))).toBe(0);
    expect(waitingOnTheInstitution(matter())).toBe(false);
  });
});
