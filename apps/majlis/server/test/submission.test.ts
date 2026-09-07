import { describe, it, expect } from 'vitest';
import { Refused } from '../src/services/lifecycle.js';
import {
  decline,
  matterOf,
  open,
  standingOf,
  submit,
  waitedHours,
  waiting,
  withdraw,
  type OpenInput,
} from '../src/services/submission.js';
import type { Submission } from '../src/types.js';

const NOW = '2026-09-07T09:00:00.000Z';

const input = (over: Partial<OpenInput> = {}): OpenInput => ({
  subject: 'Wrapped sukuk for the treasury desk',
  question:
    'May we hold the wrapped form of a sukuk we already hold directly, where the wrapper mints ' +
    'one token per unit deposited and burns on redemption?',
  background: 'The desk wants to use it as collateral with a counterparty who will not take the direct form.',
  awaiting: 'Sign the collateral agreement, which is otherwise ready.',
  askedBy: 'Layla Haddad, Treasury',
  attachments: [],
  ...over,
});

const made = (over: Partial<OpenInput> = {}, onBehalf = false, by = 'desk-treasury') =>
  submit('sub-1', 'board-1', 'inst-1', by, onBehalf, input(over), NOW);

const code = (fn: () => unknown): string | null => {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof Refused ? e.code : `threw ${String(e)}`;
  }
};

describe('putting a question', () => {
  it('keeps the institution’s own words, untouched', () => {
    const s = made();
    expect(s.question).toBe(input().question);
    expect(s.subject).toBe('Wrapped sukuk for the treasury desk');
    expect(s.askedBy).toBe('Layla Haddad, Treasury');
  });

  it('starts waiting, with nothing decided', () => {
    const s = made();
    expect(s.dispositions).toEqual([]);
    expect(standingOf(s)).toBe('waiting');
    expect(matterOf(s)).toBeNull();
  });

  /*
   * The two dates answer different questions and collapsing them would flatter
   * the board with the secretary's delay.
   */
  it('separates when they asked from when it reached the record', () => {
    const s = submit(
      'sub-2',
      'board-1',
      'inst-1',
      'member-a',
      true,
      input({ arrivedAt: '2026-09-01T08:00:00.000Z' }),
      NOW,
    );
    expect(s.arrivedAt).toBe('2026-09-01T08:00:00.000Z');
    expect(s.recordedAt).toBe(NOW);
    expect(waitedHours(s, NOW)).toBe(145);
  });

  it('defaults the asking date to now only when nobody gave one', () => {
    expect(made().arrivedAt).toBe(NOW);
  });

  it('refuses a question too short to be answered', () => {
    expect(code(() => made({ question: 'Is this ok?' }))).toBe('question_too_short');
  });

  it('refuses one with no subject, which is how it gets found', () => {
    expect(code(() => made({ subject: '   ' }))).toBe('no_subject');
  });

  it('refuses an entry on somebody’s behalf that names nobody', () => {
    expect(code(() => made({ askedBy: '' }, true, 'member-a'))).toBe('no_asker');
    // Submitting for yourself needs no name: the credential is the answer.
    expect(code(() => made({ askedBy: '' }, false, 'desk-treasury'))).toBeNull();
  });

  it('refuses a date of asking after the date of recording', () => {
    expect(code(() => made({ arrivedAt: '2026-12-01T00:00:00.000Z' }))).toBe('asked_in_the_future');
  });

  it('records whether a member entered it for somebody with no access', () => {
    expect(made().onBehalf).toBe(false);
    expect(made({}, true, 'member-a').onBehalf).toBe(true);
    expect(made({}, true, 'member-a').recordedBy).toBe('member-a');
    expect(made({}, true, 'member-a').askedBy).toBe('Layla Haddad, Treasury');
  });
});

describe('what the board does with it', () => {
  const LATER = '2026-09-08T09:00:00.000Z';

  it('opens it as a matter and keeps the link', () => {
    const s = open(made(), 'matter-9', 'member-a', LATER);
    expect(standingOf(s)).toBe('opened');
    expect(matterOf(s)).toBe('matter-9');
    expect(s.dispositions).toHaveLength(1);
  });

  it('never rewrites the question when it opens one', () => {
    const before = made();
    const after = open(before, 'matter-9', 'member-a', LATER);
    expect(after.question).toBe(before.question);
    expect(after.subject).toBe(before.subject);
    expect(after.recordedAt).toBe(before.recordedAt);
  });

  it('declines it with a reason the institution can act on', () => {
    const s = decline(
      made(),
      'The wrapper is a matter for the technical liaison first; come back with the audit of the mint and burn.',
      'member-a',
      LATER,
    );
    expect(standingOf(s)).toBe('declined');
    expect(s.dispositions[0].reason).toContain('come back with the audit');
  });

  it('refuses a decline that says nothing', () => {
    expect(code(() => decline(made(), 'No.', 'member-a', LATER))).toBe('reason_too_short');
  });

  it('lets the institution withdraw its own, with a reason', () => {
    const s = withdraw(made(), 'The counterparty accepted the direct form.', 'desk-treasury', LATER);
    expect(standingOf(s)).toBe('withdrawn');
    expect(code(() => withdraw(made(), '  ', 'desk-treasury', LATER))).toBe('no_reason');
  });

  /*
   * A desk that comes back having understood the objection is the ordinary way
   * this goes, and making them file a fresh question would lose the connection
   * between the two.
   */
  it('allows a decline to be reconsidered, and keeps both in the record', () => {
    const declined = decline(made(), 'Come back with the audit of the mint and burn.', 'member-a', LATER);
    const opened = open(declined, 'matter-9', 'member-b', '2026-09-20T09:00:00.000Z');

    expect(standingOf(opened)).toBe('opened');
    expect(opened.dispositions).toHaveLength(2);
    expect(opened.dispositions[0].kind).toBe('declined');
    expect(opened.dispositions[0].reason).toContain('audit');
  });

  it('refuses to answer a question that has already been opened', () => {
    const opened = open(made(), 'matter-9', 'member-a', LATER);
    expect(code(() => open(opened, 'matter-10', 'member-b', LATER))).toBe('wrong_standing');
    expect(code(() => decline(opened, 'A reason of quite sufficient length.', 'member-b', LATER))).toBe(
      'wrong_standing',
    );
  });

  it('says where it stands when it refuses, in words', () => {
    const opened = open(made(), 'matter-9', 'member-a', LATER);
    try {
      open(opened, 'matter-10', 'member-b', LATER);
      expect.unreachable();
    } catch (e) {
      expect((e as Refused).message).toContain('already been opened');
      expect((e as Refused).message).toContain('happens in the matter it became');
    }
  });

  it('refuses to reopen what the institution withdrew', () => {
    const gone = withdraw(made(), 'No longer needed.', 'desk-treasury', LATER);
    expect(code(() => open(gone, 'matter-9', 'member-a', LATER))).toBe('wrong_standing');
  });

  it('stops the clock at the answer', () => {
    const opened = open(made(), 'matter-9', 'member-a', LATER);
    expect(waitedHours(opened, '2026-10-01T09:00:00.000Z')).toBe(24);
  });
});

describe('the queue', () => {
  const at = (id: string, arrivedAt: string): Submission =>
    submit(id, 'board-1', 'inst-1', 'desk-treasury', false, input({ arrivedAt }), NOW);

  it('puts the longest wait first, not the newest', () => {
    const all = [
      at('a', '2026-09-05T09:00:00.000Z'),
      at('b', '2026-08-01T09:00:00.000Z'),
      at('c', '2026-09-06T09:00:00.000Z'),
    ];
    expect(waiting(all).map((s) => s.id)).toEqual(['b', 'a', 'c']);
  });

  it('leaves out everything already answered', () => {
    const all = [
      at('a', '2026-09-05T09:00:00.000Z'),
      open(at('b', '2026-08-01T09:00:00.000Z'), 'matter-9', 'member-a', NOW),
      withdraw(at('c', '2026-09-06T09:00:00.000Z'), 'Withdrawn.', 'desk-treasury', NOW),
    ];
    expect(waiting(all).map((s) => s.id)).toEqual(['a']);
  });
});
