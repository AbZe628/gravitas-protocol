import { describe, it, expect } from 'vitest';
import type { Board, Matter, Rule } from '../src/types.js';
import { paceOf, waitOn, waitingNow } from '../src/services/clocks.js';

const T0 = '2026-08-24T09:00:00.000Z';
const at = (iso: string, hours: number) =>
  new Date(new Date(iso).getTime() + hours * 3_600_000).toISOString();

const board: Board = {
  id: 'b',
  institutionId: 'inst',
  name: 'Board',
  quorumPermit: 3,
  quorumRestrict: 2,
  totalSignatories: 4,
  ratificationWindowHours: 168,
  members: [
    { id: 's1', name: 'One', title: '', board: 'b', signatory: true },
    { id: 's2', name: 'Two', title: '', board: 'b', signatory: true },
    { id: 's3', name: 'Three', title: '', board: 'b', signatory: true },
    { id: 's4', name: 'Four', title: '', board: 'b', signatory: true },
    { id: 'adv', name: 'Advisor', title: '', board: 'b', signatory: false },
  ],
};

const rule: Rule = {
  id: 'r', boardId: 'b', title: '', statement: '', parameters: [],
  parameterHash: '0x00', version: 1, inForceFrom: null,
  supersededBy: null, supersedes: null, sources: [],
};

function matter(over: Partial<Matter> = {}): Matter {
  return {
    id: 'm', boardId: 'b', title: 'A matter', origin: 'protocol_change',
    direction: 'permit', status: 'draft', openedAt: T0,
    proposal: '', notDecided: [], mechanism: '', interactsWith: [],
    proposedRule: rule, simulation: null,
    deliberation: [], reasoning: [],
    timelockStartedAt: null, timelockEndsAt: null, objections: [],
    inForceAt: null, sources: [],
    ...over,
  };
}

const said = (scholarId: string, when = T0) => ({
  id: `d-${scholarId}`, scholarId, body: 'said', at: when,
  replyTo: null, liaisonAnswer: false,
});

const voted = (scholarId: string, over: Record<string, unknown> = {}) => ({
  scholarId, position: 'for' as const, reason: 'because', at: T0, ...over,
});

describe('what the clock measures', () => {
  it('counts from arrival where arrival is known, and says so when it is not', () => {
    const seen = waitOn(board, matter({ status: 'deliberation' }), at(T0, 48));
    expect(seen.days).toBe(2);
    expect(seen.partial).toBe(true);
    expect(seen.note).toContain('since it reached this system');

    const whole = waitOn(
      board,
      matter({ status: 'deliberation', arrivedAt: at(T0, -72) }),
      at(T0, 48),
    );
    expect(whole.days).toBe(5);
    expect(whole.partial).toBe(false);
    expect(whole.note).not.toContain('since it reached this system');
  });

  it('stops at settlement rather than running on to now', () => {
    const settled = matter({ status: 'rejected', settledAt: at(T0, 24) });
    // A week later the figure is still one day.
    expect(waitOn(board, settled, at(T0, 168)).days).toBe(1);
    expect(waitOn(board, settled, at(T0, 168)).inferredSettlement).toBe(false);
  });

  it('infers settlement from the last event for records that predate stamping', () => {
    const old = matter({
      status: 'withdrawn',
      deliberation: [said('s1', at(T0, 12))],
      reasoning: [voted('s1', { at: at(T0, 30) })],
    });
    const w = waitOn(board, old, at(T0, 500));
    expect(w.inferredSettlement).toBe(true);
    expect(w.days).toBe(1.3);
  });

  it('does not charge the timelock to the board', () => {
    const m = matter({
      status: 'timelock',
      settledAt: at(T0, 24),
      timelockStartedAt: at(T0, 24),
      timelockEndsAt: at(T0, 72),
    });
    const w = waitOn(board, m, at(T0, 60));
    expect(w.days).toBe(1);
    expect(w.onTheClock).toBe(true);
    expect(w.waitingOn).toEqual([]);
    expect(w.note).toContain('nothing is required of anyone');
  });
});

describe('whose step it is', () => {
  it('names members who have not spoken in deliberation', () => {
    const m = matter({ status: 'deliberation', deliberation: [said('s1'), said('adv')] });
    expect(waitOn(board, m, at(T0, 1)).waitingOn).toEqual(['s2', 's3', 's4']);
  });

  it('names only signatories during a vote', () => {
    const m = matter({ status: 'voting', reasoning: [voted('s1'), voted('s2')] });
    const w = waitOn(board, m, at(T0, 1));
    expect(w.waitingOn).toEqual(['s3', 's4']);
    expect(w.waitingOn).not.toContain('adv');
  });

  it('counts a released position as not having voted', () => {
    const m = matter({
      status: 'voting',
      reasoning: [voted('s1', { releasedAt: at(T0, 2) }), voted('s2')],
    });
    expect(waitOn(board, m, at(T0, 3)).waitingOn).toContain('s1');
  });

  it('keeps a restriction open until the full quorum ratifies it', () => {
    const short = matter({
      direction: 'restrict', status: 'in_force', inForceAt: T0,
      reasoning: [voted('s1'), voted('s2')],
    });
    expect(waitOn(board, short, at(T0, 24)).phase).toBe('ratification');

    const ratified = matter({
      direction: 'restrict', status: 'in_force', inForceAt: T0,
      reasoning: [voted('s1'), voted('s2'), voted('s3')],
    });
    expect(waitOn(board, ratified, at(T0, 24)).phase).toBe('settled');
  });

  it('treats a permit in force as finished', () => {
    const m = matter({ direction: 'permit', status: 'in_force', inForceAt: T0 });
    expect(waitOn(board, m, at(T0, 24)).phase).toBe('settled');
  });
});

describe('the pace of a board', () => {
  const settledAfter = (id: string, hours: number) =>
    matter({ id, status: 'rejected', settledAt: at(T0, hours) });

  it('reports the middle matter, not the average', () => {
    // 1, 2, 3 days and one outlier at 100. The mean would be over 26.
    const pace = paceOf(
      board,
      [settledAfter('a', 24), settledAfter('b', 48), settledAfter('c', 72), settledAfter('d', 2400)],
      at(T0, 3000),
    );
    expect(pace.settled).toBe(4);
    expect(pace.medianDays).toBe(2.5);
    expect(pace.fastestDays).toBe(1);
    expect(pace.slowestDays).toBe(100);
  });

  it('counts a matter in its timelock as decided', () => {
    const pace = paceOf(
      board,
      [matter({ id: 'a', status: 'timelock', settledAt: at(T0, 24) })],
      at(T0, 40),
    );
    expect(pace.settled).toBe(1);
    expect(pace.open).toBe(0);
  });

  it('surfaces the longest-waiting open matter', () => {
    const pace = paceOf(
      board,
      [
        matter({ id: 'recent', status: 'deliberation', arrivedAt: at(T0, 0) }),
        matter({ id: 'stale', status: 'voting', arrivedAt: at(T0, -240) }),
      ],
      at(T0, 24),
    );
    expect(pace.open).toBe(2);
    expect(pace.longestOpen?.matterId).toBe('stale');
    expect(pace.longestOpen?.days).toBe(11);
  });

  it('marks the figures approximate when anything had to be inferred', () => {
    const exact = paceOf(
      board,
      [matter({ id: 'a', status: 'rejected', arrivedAt: T0, settledAt: at(T0, 24) })],
      at(T0, 48),
    );
    expect(exact.approximate).toBe(false);

    const guessed = paceOf(board, [settledAfter('a', 24)], at(T0, 48));
    expect(guessed.approximate).toBe(true);
  });

  it('has nothing to report on a board that has settled nothing', () => {
    const pace = paceOf(board, [], at(T0, 1));
    expect(pace.medianDays).toBeNull();
    expect(pace.longestOpen).toBeNull();
    expect(pace.approximate).toBe(false);
  });

  it('ignores another board’s matters', () => {
    const other = matter({ id: 'x', boardId: 'other', status: 'deliberation' });
    expect(paceOf(board, [other], at(T0, 24)).open).toBe(0);
  });
});

describe('what is waiting now', () => {
  it('lists open matters longest first and leaves out settled ones', () => {
    const list = waitingNow(
      [board],
      [
        matter({ id: 'new', status: 'deliberation', arrivedAt: at(T0, 0) }),
        matter({ id: 'old', status: 'voting', arrivedAt: at(T0, -240) }),
        matter({ id: 'done', status: 'rejected', settledAt: at(T0, 2) }),
      ],
      at(T0, 24),
    );
    expect(list.map((w) => w.matterId)).toEqual(['old', 'new']);
  });

  it('keeps a matter in its timelock visible, since it is not yet in force', () => {
    const list = waitingNow(
      [board],
      [matter({ id: 'tl', status: 'timelock', settledAt: at(T0, 24) })],
      at(T0, 40),
    );
    expect(list).toHaveLength(1);
    expect(list[0].onTheClock).toBe(true);
  });

  it('skips a matter whose board it does not hold', () => {
    const orphan = matter({ id: 'x', boardId: 'missing', status: 'voting' });
    expect(waitingNow([board], [orphan], at(T0, 1))).toEqual([]);
  });
});
