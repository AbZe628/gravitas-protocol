import { describe, it, expect } from 'vitest';
import type { Board, Matter } from '../src/types.js';
import { attentionFor, attentionList } from '../src/services/attention.js';
import { sweep } from '../src/services/sweep.js';
import { MemoryStore } from '../src/store/index.js';

const T0 = '2026-08-24T09:00:00.000Z';
const after = (h: number) => new Date(new Date(T0).getTime() + h * 3_600_000).toISOString();

const board: Board = {
  id: 'b', name: 'Board', quorumPermit: 3, quorumRestrict: 2, totalSignatories: 4,
  ratificationWindowHours: 168,
  members: [
    { id: 's1', name: 'One', title: '', board: 'b', signatory: true },
    { id: 's2', name: 'Two', title: '', board: 'b', signatory: true },
    { id: 's3', name: 'Three', title: '', board: 'b', signatory: true },
    { id: 's4', name: 'Four', title: '', board: 'b', signatory: true },
    { id: 'adv', name: 'Advisor', title: '', board: 'b', signatory: false },
  ],
};

function matter(over: Partial<Matter> = {}): Matter {
  return {
    id: 'm', boardId: 'b', title: 'A matter', origin: 'protocol_change',
    direction: 'permit', status: 'deliberation', openedAt: T0,
    proposal: '', notDecided: [], mechanism: '', interactsWith: [],
    proposedRule: {
      id: 'r', boardId: 'b', title: '', statement: '', parameters: [],
      parameterHash: '', version: 1, inForceFrom: null,
      supersededBy: null, supersedes: null, sources: [],
    },
    simulation: null, deliberation: [], reasoning: [],
    timelockStartedAt: null, timelockEndsAt: null, objections: [],
    inForceAt: null, sources: [],
    ...over,
  };
}

const said = (id: string) => ({ id: 'd-' + id, scholarId: id, body: 'A point.', at: T0, replyTo: null, liaisonAnswer: false });
const voted = (id: string) => ({ scholarId: id, position: 'for' as const, reason: 'A reason of sufficient length.', at: T0 });
const at = (scholarId: string, m: Matter, now = T0) => attentionFor(board, m, { scholarId, now });

// ── deliberation ──────────────────────────────────────────────────────────

describe('while a matter is being deliberated', () => {
  it('asks anyone who has not spoken', () => {
    expect(at('s1', matter())?.kind).toBe('awaiting_your_deliberation');
    expect(at('adv', matter())?.kind).toBe('awaiting_your_deliberation');
  });

  it('stops asking once you have', () => {
    expect(at('s1', matter({ deliberation: [said('s1')] }))).toBeNull();
    // and still asks everyone else
    expect(at('s2', matter({ deliberation: [said('s1')] }))?.kind).toBe('awaiting_your_deliberation');
  });

  it('says nothing to someone who is not on the board', () => {
    expect(at('stranger', matter())).toBeNull();
  });
});

// ── voting ────────────────────────────────────────────────────────────────

describe('while a vote is open', () => {
  const voting = (over: Partial<Matter> = {}) => matter({ status: 'voting', ...over });

  it('asks a signatory who has not voted, and says where the count stands', () => {
    const found = at('s1', voting({ reasoning: [voted('s2'), voted('s3')] }));
    expect(found?.kind).toBe('awaiting_your_vote');
    expect(found?.note).toContain('2 of 3 in favour');
    expect(found?.note).toContain('1 more needed');
  });

  it('says the threshold is met once it is, and still asks the rest', () => {
    const found = at('s4', voting({ reasoning: [voted('s1'), voted('s2'), voted('s3')] }));
    expect(found?.note).toContain('the threshold is met');
  });

  it('does not ask a signatory who has voted', () => {
    expect(at('s1', voting({ reasoning: [voted('s1')] }))).toBeNull();
  });

  it('does not ask an advisory member to vote', () => {
    // They deliberate; the arithmetic is not theirs.
    expect(at('adv', voting())).toBeNull();
  });
});

// ── the timelock ──────────────────────────────────────────────────────────

describe('during a timelock', () => {
  const held = matter({
    status: 'timelock', direction: 'permit',
    timelockStartedAt: T0, timelockEndsAt: after(48),
    reasoning: [voted('s1'), voted('s2'), voted('s3')],
  });

  it('tells a signatory the objection window is open, and for how long', () => {
    const found = at('s4', held, after(6));
    expect(found?.kind).toBe('objection_window_open');
    expect(found?.deadline).toBe(after(48));
    expect(found?.hoursRemaining).toBe(42);
    expect(found?.overdue).toBe(false);
  });

  it('turns into ready-to-take-effect once the clock has run', () => {
    const found = at('s1', held, after(49));
    expect(found?.kind).toBe('ready_to_take_effect');
    expect(found?.note).toContain('nobody objected');
  });

  it('reports one thing about a matter, not two', () => {
    // A timelock is either still objectable or ready. Listing both would make
    // the reader work out which applies, which is the work this does for them.
    const list = attentionList([board], [held], { scholarId: 's1', now: after(49) });
    expect(list).toHaveLength(1);
  });

  it('says nothing to an advisory member, who cannot object', () => {
    expect(at('adv', held, after(6))).toBeNull();
  });
});

// ── ratification ──────────────────────────────────────────────────────────

describe('after a restriction takes effect', () => {
  const restriction = (over: Partial<Matter> = {}) =>
    matter({
      status: 'in_force', direction: 'restrict', inForceAt: T0,
      reasoning: [voted('s1'), voted('s2')],
      ...over,
    });

  it('asks for ratification, names the threshold and the window', () => {
    const found = at('s3', restriction(), after(1));
    expect(found?.kind).toBe('awaiting_ratification');
    expect(found?.note).toContain('needs 3 in favour');
    expect(found?.note).toContain('has 2');
    expect(found?.deadline).toBe(after(168));
    expect(found?.hoursRemaining).toBe(167);
  });

  it('stops asking once the full quorum is behind it', () => {
    expect(at('s4', restriction({ reasoning: [voted('s1'), voted('s2'), voted('s3')] }), after(1))).toBeNull();
  });

  it('turns overdue when the window has closed', () => {
    const found = at('s3', restriction(), after(200));
    expect(found?.kind).toBe('overdue');
    expect(found?.overdue).toBe(true);
    expect(found?.hoursRemaining).toBeLessThan(0);
    expect(found?.note).toContain('lapsed');
  });

  it('a permitting change in force asks nothing of anyone', () => {
    expect(at('s1', matter({ status: 'in_force', direction: 'permit', inForceAt: T0 }), after(1))).toBeNull();
  });
});

// ── ordering ──────────────────────────────────────────────────────────────

describe('the order things are listed in', () => {
  it('overdue first, then the tightest clock, then everything without one', () => {
    const overdue = matter({
      id: 'overdue', title: 'Overdue', status: 'in_force', direction: 'restrict',
      inForceAt: T0, reasoning: [voted('s1'), voted('s2')],
    });
    const soon = matter({
      id: 'soon', title: 'Soon', status: 'timelock', direction: 'permit',
      timelockStartedAt: after(190), timelockEndsAt: after(202),
      reasoning: [voted('s1'), voted('s2'), voted('s3')],
    });
    const noClock = matter({ id: 'noclock', title: 'No clock', status: 'deliberation' });

    const list = attentionList([board], [noClock, soon, overdue], { scholarId: 's4', now: after(200) });
    expect(list.map((i) => i.matterId)).toEqual(['overdue', 'soon', 'noclock']);
  });

  it('counts what is outstanding and what is late', () => {
    const list = attentionList([board], [matter({ id: 'a' }), matter({ id: 'b' })], { scholarId: 's1', now: T0 });
    expect(list).toHaveLength(2);
    expect(list.every((i) => i.overdue)).toBe(false);
  });
});

// ── the sweep ─────────────────────────────────────────────────────────────

describe('the sweep applies deadlines nobody was watching', () => {
  const lapsing = matter({
    id: 'lapsing', boardId: 'demo-board', status: 'in_force', direction: 'restrict',
    inForceAt: T0, reasoning: [voted('s1'), voted('s2')],
  });

  const store = () => new MemoryStore({ boards: [{ ...board, id: 'demo-board' }], matters: [lapsing], rules: [], briefings: [] });

  it('leaves a restriction alone while its window is open', async () => {
    const s = store();
    const result = await sweep(s, () => after(100));
    expect(result.lapsed).toHaveLength(0);
    expect((await s.matter('lapsing'))?.status).toBe('in_force');
  });

  it('lapses one whose window has closed', async () => {
    // Without this the record says a rule is operative when the board's own
    // rules say it expired: a rule nobody voted for, standing because nobody
    // got round to revisiting it.
    const s = store();
    const result = await sweep(s, () => after(200));
    expect(result.lapsed.map((m) => m.id)).toEqual(['lapsing']);
    expect((await s.matter('lapsing'))?.status).toBe('lapsed');
  });

  it('runs twice without doing it twice', async () => {
    const s = store();
    await sweep(s, () => after(200));
    const second = await sweep(s, () => after(201));
    expect(second.lapsed).toHaveLength(0);
    expect((await s.matter('lapsing'))?.status).toBe('lapsed');
  });

  it('never touches a permitting change', async () => {
    const s = new MemoryStore({
      boards: [{ ...board, id: 'demo-board' }],
      matters: [{ ...lapsing, direction: 'permit' }],
      rules: [], briefings: [],
    });
    await sweep(s, () => after(500));
    expect((await s.matter('lapsing'))?.status).toBe('in_force');
  });
});
