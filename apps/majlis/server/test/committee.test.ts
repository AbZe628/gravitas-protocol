import { describe, it, expect } from 'vitest';
import {
  form,
  dissolve,
  refer,
  report,
  withdrawReferral,
  stateOf,
  howItStood,
  summarise,
  Refused,
  type Committee,
  type Referral,
} from '../src/services/committee.js';

/**
 * Some of the board, given a question to look at first.
 *
 * What these hold to, and it is one thing with three faces: **a committee
 * never rules.** There is no committee vote and no state a matter reaches
 * through a committee that it could not reach without one, because a board's
 * threshold is the number of signatures that bind the institution — and three
 * of nine settling a matter inside a committee would bind it with three.
 *
 * The other two: **the remit is the board's own words**, because which
 * committees a board keeps is that board's constitution; and **dissent carries
 * words**, because a committee that reported unanimously with the
 * disagreement nowhere is the failure this application exists to prevent, one
 * level down.
 */

const ON_THE_BOARD = [{ id: 'member-a' }, { id: 'member-b' }, { id: 'member-c' }, { id: 'member-d' }];

const committee = (over: Partial<Parameters<typeof form>[0]> = {}): Committee =>
  form({
    id: 'committee-1',
    boardId: 'demo-board',
    name: 'The contracts committee',
    remit: 'Read the contract shapes before they come to the board, and say what is unclear.',
    members: ['member-a', 'member-b', 'member-c'],
    convenor: 'member-a',
    formedIn: 'matter-2026-01-10',
    formedAt: '2026-01-10T00:00:00.000Z',
    onTheBoard: ON_THE_BOARD,
    ...over,
  });

const referral = (c = committee()): Referral =>
  refer({
    id: 'referral-1',
    committee: c,
    matterId: 'matter-2026-08-11',
    asking: 'Whether the wording reaches a fund that borrows at its own level.',
    referredBy: 'member-d',
    referredAt: '2026-08-12T00:00:00.000Z',
  });

const refuses = (reason: string, run: () => unknown) => {
  try {
    run();
    throw new Error('should have refused with ' + reason);
  } catch (e) {
    expect(e).toBeInstanceOf(Refused);
    expect((e as Refused).reason).toBe(reason);
  }
};

describe('forming one', () => {
  it('keeps the board’s own name and remit', () => {
    const c = committee();
    expect(c.name).toBe('The contracts committee');
    expect(c.remit).toContain('Read the contract shapes');
    expect(c.members).toHaveLength(3);
  });

  /*
   * A committee that could be created from a settings screen would be a
   * standing body brought into existence by whoever had that page open.
   */
  it('carries the matter it was formed in', () => {
    expect(committee().formedIn).toBe('matter-2026-01-10');
  });

  it('refuses a committee with no remit, which is a list of names', () => {
    refuses('no_remit', () => committee({ remit: '   ' }));
  });

  it('refuses a committee of nobody', () => {
    refuses('nobody_on_it', () => committee({ members: [] }));
  });

  it('refuses somebody who is not on the board', () => {
    refuses('not_on_this_board', () => committee({ members: ['member-a', 'a-stranger'] }));
  });

  it('refuses a convenor who does not sit on it', () => {
    refuses('not_on_this_committee', () => committee({ convenor: 'member-d' }));
  });

  it('winds one up without removing it', () => {
    const gone = dissolve(committee(), '2026-09-01T00:00:00.000Z');
    expect(gone.dissolvedAt).toBeTruthy();
    expect(gone.remit).toContain('Read the contract shapes');
    refuses('already_dissolved', () => dissolve(gone, '2026-09-02T00:00:00.000Z'));
  });
});

describe('referring a matter', () => {
  it('records what the board is asking them to look at', () => {
    const r = referral();
    expect(r.asking).toContain('borrows at its own level');
    expect(stateOf(r)).toBe('waiting');
  });

  it('refuses a referral with no question, which is a matter moved sideways', () => {
    refuses('nothing_asked', () =>
      refer({
        id: 'referral-2',
        committee: committee(),
        matterId: 'matter-1',
        asking: '  ',
        referredBy: 'member-d',
        referredAt: '2026-08-12T00:00:00.000Z',
      }),
    );
  });

  it('refuses a committee the board wound up', () => {
    refuses('committee_is_dissolved', () =>
      refer({
        id: 'referral-2',
        committee: dissolve(committee(), '2026-08-01T00:00:00.000Z'),
        matterId: 'matter-1',
        asking: 'Look at this.',
        referredBy: 'member-d',
        referredAt: '2026-08-12T00:00:00.000Z',
      }),
    );
  });

  it('is taken back with a reason, and stays', () => {
    const back = withdrawReferral(referral(), 'member-d', 'The matter was withdrawn.', '2026-08-14T00:00:00.000Z');
    expect(stateOf(back)).toBe('withdrawn');
    expect(back.withdrawn?.why).toBe('The matter was withdrawn.');
    expect(back.asking).toContain('borrows at its own level');
  });

  it('refuses taking one back without saying why', () => {
    refuses('no_reason_given', () =>
      withdrawReferral(referral(), 'member-d', '  ', '2026-08-14T00:00:00.000Z'),
    );
  });
});

describe('reporting', () => {
  const found =
    'The wording reaches borrowing inside the index only. A fund borrowing at its own level ' +
    'is outside it, and the committee thinks that is a separate question.';

  const stand = (scholarId: string, agrees = true, said?: string) => ({
    scholarId,
    agrees,
    ...(said ? { said } : {}),
    at: '2026-08-18T00:00:00.000Z',
  });

  it('carries the account and every member’s position', () => {
    const c = committee();
    const done = report(referral(c), {
      committee: c,
      found,
      by: 'member-a',
      at: '2026-08-18T00:00:00.000Z',
      standing: [stand('member-a'), stand('member-b'), stand('member-c')],
    });

    expect(stateOf(done)).toBe('reported');
    expect(done.report?.found).toContain('outside it');
    expect(howItStood(c, done)?.unanimous).toBe(true);
  });

  /*
   * The reason there is no outcome field: a board that adopts a verdict it did
   * not reason to has not decided anything.
   */
  it('has no verdict on it, only an account', () => {
    const c = committee();
    const done = report(referral(c), {
      committee: c,
      found,
      by: 'member-a',
      at: '2026-08-18T00:00:00.000Z',
      standing: [stand('member-a')],
    });
    expect(Object.keys(done.report ?? {})).toEqual(['found', 'by', 'at', 'standing']);
  });

  it('names who did not stand behind it, and what they said instead', () => {
    const c = committee();
    const done = report(referral(c), {
      committee: c,
      found,
      by: 'member-a',
      at: '2026-08-18T00:00:00.000Z',
      standing: [
        stand('member-a'),
        stand('member-b'),
        stand('member-c', false, 'A fund borrowing at its own level reaches the same exposure.'),
      ],
    });

    const stood = howItStood(c, done);
    expect(stood?.unanimous).toBe(false);
    expect(stood?.agreed).toEqual(['member-a', 'member-b']);
    expect(stood?.dissented).toEqual([
      { scholarId: 'member-c', said: 'A fund borrowing at its own level reaches the same exposure.' },
    ]);
  });

  it('refuses dissent recorded as a mark', () => {
    const c = committee();
    refuses('dissent_needs_words', () =>
      report(referral(c), {
        committee: c,
        found,
        by: 'member-a',
        at: '2026-08-18T00:00:00.000Z',
        standing: [stand('member-c', false)],
      }),
    );
  });

  it('names members of the committee who recorded nothing either way', () => {
    const c = committee();
    const done = report(referral(c), {
      committee: c,
      found,
      by: 'member-a',
      at: '2026-08-18T00:00:00.000Z',
      standing: [stand('member-a'), stand('member-b')],
    });

    const stood = howItStood(c, done);
    expect(stood?.silent).toEqual(['member-c']);
    // Silence is not agreement, so it is not unanimous.
    expect(stood?.unanimous).toBe(false);
  });

  it('refuses an account written by somebody who did not sit on it', () => {
    const c = committee();
    refuses('not_on_this_committee', () =>
      report(referral(c), {
        committee: c,
        found,
        by: 'member-d',
        at: '2026-08-18T00:00:00.000Z',
        standing: [stand('member-a')],
      }),
    );
  });

  it('refuses a second account, which is a second referral', () => {
    const c = committee();
    const done = report(referral(c), {
      committee: c,
      found,
      by: 'member-a',
      at: '2026-08-18T00:00:00.000Z',
      standing: [stand('member-a')],
    });
    refuses('already_reported', () =>
      report(done, {
        committee: c,
        found: 'On reflection.',
        by: 'member-a',
        at: '2026-08-19T00:00:00.000Z',
        standing: [stand('member-a')],
      }),
    );
  });

  it('will not take a referral back once the committee has reported', () => {
    const c = committee();
    const done = report(referral(c), {
      committee: c,
      found,
      by: 'member-a',
      at: '2026-08-18T00:00:00.000Z',
      standing: [stand('member-a')],
    });
    refuses('already_reported', () =>
      withdrawReferral(done, 'member-d', 'Second thoughts.', '2026-08-19T00:00:00.000Z'),
    );
  });

  it('counts what is waiting, what was answered, and what was not of one mind', () => {
    const c = committee();
    const answered = report(referral(c), {
      committee: c,
      found,
      by: 'member-a',
      at: '2026-08-18T00:00:00.000Z',
      standing: [stand('member-a'), stand('member-b'), stand('member-c', false, 'Not so.')],
    });
    const waiting = { ...referral(c), id: 'referral-2', matterId: 'matter-2' };

    const s = summarise(c, [answered, waiting]);
    expect(s).toEqual({ waiting: 1, reported: 1, withdrawn: 0, notUnanimous: 1 });
  });
});
