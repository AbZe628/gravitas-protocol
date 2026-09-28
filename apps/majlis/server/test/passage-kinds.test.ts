import { describe, it, expect } from 'vitest';
import { buildQuestionPassage } from '../src/services/passage-question.js';
import { buildUndertakingPassage } from '../src/services/passage-undertaking.js';
import { buildReviewPassage } from '../src/services/passage-review.js';
import { known, words } from './words.js';
import type { Rule, Submission } from '../src/types.js';
import type { Undertaking } from '../src/services/undertaking.js';
import type { Passage } from '../src/services/passage-shape.js';

/**
 * The three short readings, and the gaps they exist to name.
 *
 * A question, an undertaking and a ruling awaiting review had no grammar at
 * all. They are the screens the owner described as a list and a button, and
 * the reason is that nothing in them could say what was outstanding in the
 * same shape as everything else.
 *
 * Two of the three carry a finding the application already knew and did
 * nothing with: an undertaking with no date can never be called late, and a
 * ruling with no interval is one **nothing will bring back before the board**.
 * Both are steps now, open, so the ordinary screens carry them.
 */

const NOW = '2026-09-20T00:00:00Z';

const all = (p: Passage) => p.groups.flatMap((g) => g.steps);
const step = (p: Passage, key: string) => {
  const found = all(p).find((s) => s.key === key);
  if (!found) throw new Error('no step ' + key);
  return found;
};

function question(over: Partial<Submission> = {}): Submission {
  return {
    id: 'q1',
    boardId: 'b1',
    institutionId: 'inst-1',
    arrivedAt: '2026-09-01T00:00:00Z',
    recordedAt: '2026-09-02T00:00:00Z',
    askedBy: 'desk',
    recordedBy: 'liaison-1',
    onBehalf: false,
    subject: 'A question',
    question: 'Is this permissible?',
    background: '',
    awaiting: '',
    attachments: [],
    draft: null,
    dispositions: [],
    ...over,
  } as unknown as Submission;
}

function undertaking(over: Partial<Undertaking> = {}): Undertaking {
  return {
    id: 'u1',
    boardId: 'b1',
    meetingId: 'm1',
    what: 'Bring the figures back',
    who: 'member-b',
    minutedBy: 'member-a',
    minutedAt: '2026-09-01T00:00:00Z',
    state: 'open',
    ...over,
  } as unknown as Undertaking;
}

function rule(over: Partial<Rule> = {}): Rule {
  return {
    id: 'r1',
    boardId: 'b1',
    title: 'A ruling',
    statement: 'x',
    parameters: [],
    parameterHash: 'h',
    version: 1,
    inForceFrom: '2025-09-01T00:00:00Z',
    supersededBy: null,
    supersedes: null,
    sources: [],
    ...over,
  } as unknown as Rule;
}

describe('a question has three facts and invents no more', () => {
  it('waits on the board to take it up or decline', () => {
    const p = buildQuestionPassage(question(), NOW);

    expect(p.next?.key).toBe('take_up');
    expect(p.next?.whose).toBe('board');
    expect(words(p.next?.standing)).toContain('opened it or declined it');
  });

  it('says a contract did not come, rather than asking for one', () => {
    // Not a step anybody can perform: a board cannot make a bank attach a
    // document it does not have.
    expect(step(buildQuestionPassage(question(), NOW), 'contract').state).toBe('not_applicable');
  });

  it('treats declining as an answer, not an unfinished question', () => {
    const declined = question({
      dispositions: [{ kind: 'declined', at: NOW, by: 'member-a', reason: 'not ours' }],
    } as Partial<Submission>);
    const p = buildQuestionPassage(declined, NOW);

    expect(p.next).toBeNull();
    expect(words(p.settled)).toContain('declined');
    expect(step(p, 'take_up').state).toBe('done');
  });

  it('counts from when the desk asked, not from when it was written down', () => {
    // Nineteen days, not eighteen: the board's own delay in recording it is
    // exactly what counting from `recordedAt` would hide.
    expect(words(buildQuestionPassage(question(), NOW).waiting?.note)).toContain('19 days');
  });
});

describe('an undertaking with no date is its own problem', () => {
  it('asks the board for one, and says why it matters', () => {
    const p = buildUndertakingPassage(undertaking(), NOW);

    expect(step(p, 'due_date').state).toBe('open');
    expect(words(step(p, 'due_date').standing)).toContain('nothing will ever call this late');
  });

  it('asks the board and not the person who gave it', () => {
    // When a thing is wanted by is the room's decision.
    expect(step(buildUndertakingPassage(undertaking(), NOW), 'due_date').whose).toBe('board');
  });

  it('stops asking once it is closed', () => {
    const p = buildUndertakingPassage(
      undertaking({ state: 'done', outcome: { said: 'brought them', by: 'member-b', at: NOW } }),
      NOW,
    );

    expect(step(p, 'due_date').state).toBe('not_applicable');
    expect(p.next).toBeNull();
  });

  it('closes on an account, never on a tick', () => {
    const p = buildUndertakingPassage(undertaking(), NOW);
    expect(words(step(p, 'account').act)).toContain('Say what happened');
  });

  it('says it is late where the board set a date and it passed', () => {
    const late = undertaking({ dueAt: '2026-09-10T00:00:00Z' });
    expect(words(step(buildUndertakingPassage(late, NOW), 'account').standing)).toContain(
      'past the date',
    );
  });
});

describe('a ruling nothing will bring back is a step, not a sentence', () => {
  it('asks somebody to set an interval', () => {
    const p = buildReviewPassage(rule(), NOW);

    expect(p.next?.key).toBe('interval');
    expect(p.next?.whose).toBe('board');
    expect(words(p.next?.standing)).toContain('nothing will bring this back');
  });

  it('says the date can never arrive without one', () => {
    expect(words(step(buildReviewPassage(rule(), NOW), 'due').standing)).toContain(
      'no date ever arrives',
    );
  });

  it('has nothing outstanding where the date is still ahead', () => {
    const scheduled = rule({
      reviewEveryMonths: 12,
      lastReviewedAt: '2026-08-01T00:00:00Z',
    } as Partial<Rule>);

    expect(buildReviewPassage(scheduled, NOW).next).toBeNull();
  });

  it('asks for the review once the date has come', () => {
    const due = rule({
      reviewEveryMonths: 6,
      lastReviewedAt: '2025-01-01T00:00:00Z',
    } as Partial<Rule>);
    const p = buildReviewPassage(due, NOW);

    expect(p.next?.key).toBe('look');
    expect(step(p, 'interval').state).toBe('done');
  });

  it('is never settled, because a ruling in force stands until something changes it', () => {
    expect(buildReviewPassage(rule(), NOW).settled).toBeNull();
  });
});

/**
 * Every sentence the three can reach has words behind it.
 *
 * The same guard the matter and the breach have. A key with no entry renders
 * as `review.step.interval.standing` on the screen, and nothing in the type
 * system joins the string on this side to the lookup on the other.
 */
describe('every sentence these three can reach has words behind it', () => {
  const shapes: [string, Passage][] = [
    ['a question waiting', buildQuestionPassage(question(), NOW)],
    [
      'a question opened',
      buildQuestionPassage(
        question({
          dispositions: [{ kind: 'opened', at: NOW, by: 'member-a', matterId: 'm1' }],
        } as Partial<Submission>),
        NOW,
      ),
    ],
    ['a question with a contract', buildQuestionPassage(question({ draft: {} } as never), NOW)],
    ['an undertaking open', buildUndertakingPassage(undertaking(), NOW)],
    [
      'an undertaking late',
      buildUndertakingPassage(undertaking({ dueAt: '2026-09-01T00:00:00Z' }), NOW),
    ],
    ['an undertaking done', buildUndertakingPassage(undertaking({ state: 'done' }), NOW)],
    ['an undertaking dropped', buildUndertakingPassage(undertaking({ state: 'dropped' }), NOW)],
    ['a ruling with no interval', buildReviewPassage(rule(), NOW)],
    [
      'a ruling scheduled',
      buildReviewPassage(
        rule({ reviewEveryMonths: 12, lastReviewedAt: '2026-08-01T00:00:00Z' } as Partial<Rule>),
        NOW,
      ),
    ],
    [
      'a ruling due',
      buildReviewPassage(
        rule({ reviewEveryMonths: 6, lastReviewedAt: '2025-01-01T00:00:00Z' } as Partial<Rule>),
        NOW,
      ),
    ],
    ['guidance never put into force', buildReviewPassage(rule({ inForceFrom: null }), NOW)],
  ];

  for (const [what, p] of shapes) {
    it(`says something in English for ${what}`, () => {
      const unknown: string[] = [];

      for (const s of all(p)) {
        for (const said of [s.act, s.standing, s.why]) {
          if (!known(said)) unknown.push(said?.key ?? '(none)');
        }
      }
      if (!known(p.settled)) unknown.push(p.settled?.key ?? '(none)');
      if (!known(p.waiting?.note)) unknown.push(p.waiting?.note?.key ?? '(none)');
      for (const g of p.groups) {
        if (!known({ key: `passage.group.${g.key}` })) unknown.push(`passage.group.${g.key}`);
        if (!known({ key: `passage.group.${g.key}.hint` }))
          unknown.push(`passage.group.${g.key}.hint`);
      }

      expect(unknown).toEqual([]);
    });

    // And the walk reached the steps, rather than passing by checking nothing.
    it(`has steps to check for ${what}`, () => {
      expect(all(p).length).toBeGreaterThanOrEqual(3);
    });
  }
});

/**
 * The name goes with the act, not with the record.
 *
 * An undertaking is the one thing here that names a person, and the queue took
 * that name from the record and put it on every row. That was right while
 * there was only one act. It stopped being right the moment the reading could
 * say something else was next: an undertaking with no date waits on **the
 * board** to set one, and the row named the member who gave it — the wrong
 * person, in the column that says who is holding it up.
 *
 * Found by reading the list on the screen. No test was looking for it, and the
 * one that checks owners would not have: the owner was correct throughout. It
 * was the name beside it that was wrong.
 */
describe('a name belongs to the step, not to the record', () => {
  it('names nobody while the act is the board’s', () => {
    const p = buildUndertakingPassage(undertaking(), NOW);

    expect(p.next?.key).toBe('due_date');
    expect(p.next?.whoName).toBeUndefined();
  });

  it('names the person once the act is theirs', () => {
    const dated = undertaking({ dueAt: '2026-10-01T00:00:00Z' });
    const p = buildUndertakingPassage(dated, NOW);

    expect(p.next?.key).toBe('account');
    expect(p.next?.whoName).toBe('member-b');
  });
});
