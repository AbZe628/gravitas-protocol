import { describe, it, expect } from 'vitest';
import type { Board, Matter, Rule } from '../src/types.js';
import {
  Refused,
  bringIntoForce,
  canTransition,
  closeVoting,
  hasLapsed,
  lapse,
  objectDuringTimelock,
  openDeliberation,
  openVoting,
  quorumFor,
  ratificationDeadline,
  ratify,
  recordVote,
  tally,
  withdraw,
} from '../src/services/lifecycle.js';

const T0 = '2026-08-24T09:00:00.000Z';
const hoursAfter = (iso: string, h: number) =>
  new Date(new Date(iso).getTime() + h * 3_600_000).toISOString();

const board: Board = {
  id: 'b',
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

const said = (id = 's1') => ({
  id: 'd', scholarId: id, body: 'A point about the mechanism.', at: T0,
  replyTo: null, liaisonAnswer: false,
});

const REASON = 'The mechanism is bounded by the owner signed minimums, which answers the concern.';

function voteAll(m: Matter, ids: string[], position: 'for' | 'against' | 'abstain' = 'for'): Matter {
  return ids.reduce((acc, id) => recordVote(board, acc, { scholarId: id, position, reason: REASON }, T0), m);
}

const refusalCode = (fn: () => unknown): string => {
  try { fn(); } catch (e) { return e instanceof Refused ? e.code : 'not-a-Refused'; }
  return 'did-not-refuse';
};

// ── the shape of the process ──────────────────────────────────────────────

describe('a matter can only move where the process allows', () => {
  it('the terminal states are terminal', () => {
    for (const from of ['withdrawn', 'rejected', 'lapsed'] as const) {
      for (const to of ['draft', 'deliberation', 'voting', 'timelock', 'in_force'] as const) {
        expect(canTransition(from, to)).toBe(false);
      }
    }
  });

  it('voting cannot be reached without passing through deliberation', () => {
    expect(canTransition('draft', 'voting')).toBe(false);
    expect(canTransition('draft', 'deliberation')).toBe(true);
    expect(canTransition('deliberation', 'voting')).toBe(true);
  });

  it('a live matter can always be withdrawn', () => {
    for (const from of ['draft', 'deliberation', 'voting', 'timelock'] as const) {
      expect(canTransition(from, 'withdrawn')).toBe(true);
      expect(withdraw(matter({ status: from })).status).toBe('withdrawn');
    }
  });

  it('something already in force cannot be withdrawn, only lapsed', () => {
    expect(refusalCode(() => withdraw(matter({ status: 'in_force' })))).toBe('wrong_status');
    expect(lapse(matter({ status: 'in_force' })).status).toBe('lapsed');
  });
});

describe('voting opens only after something has been said', () => {
  it('refuses an unread proposal', () => {
    expect(refusalCode(() => openVoting(matter({ status: 'deliberation' })))).toBe('no_deliberation');
  });

  it('opens once there is deliberation on the record', () => {
    const m = openVoting(matter({ status: 'deliberation', deliberation: [said()] }));
    expect(m.status).toBe('voting');
  });

  it('refuses from draft, before deliberation has begun', () => {
    expect(refusalCode(() => openVoting(matter({ status: 'draft', deliberation: [said()] })))).toBe('wrong_status');
  });

  it('openDeliberation keeps the original opening time', () => {
    expect(openDeliberation(matter(), '2026-09-01T00:00:00.000Z').openedAt).toBe(T0);
  });
});

// ── who may vote, and on what terms ───────────────────────────────────────

describe('a vote is a written position, not a number', () => {
  const voting = () => matter({ status: 'voting', deliberation: [said()] });

  it('refuses a vote with no reason', () => {
    expect(refusalCode(() => recordVote(board, voting(), { scholarId: 's1', position: 'for', reason: '' }, T0)))
      .toBe('no_reason_given');
  });

  it('refuses a reason too short to be a reason', () => {
    expect(refusalCode(() => recordVote(board, voting(), { scholarId: 's1', position: 'for', reason: 'yes' }, T0)))
      .toBe('no_reason_given');
  });

  it('refuses an advisory member, who deliberates but does not vote', () => {
    expect(refusalCode(() => recordVote(board, voting(), { scholarId: 'adv', position: 'for', reason: REASON }, T0)))
      .toBe('not_a_signatory');
  });

  it('refuses someone who does not sit on this board', () => {
    expect(refusalCode(() => recordVote(board, voting(), { scholarId: 'stranger', position: 'for', reason: REASON }, T0)))
      .toBe('not_on_this_board');
  });

  it('refuses a second vote from the same member', () => {
    const once = recordVote(board, voting(), { scholarId: 's1', position: 'for', reason: REASON }, T0);
    expect(refusalCode(() => recordVote(board, once, { scholarId: 's1', position: 'against', reason: REASON }, T0)))
      .toBe('already_voted');
  });

  it('refuses a vote before voting has opened', () => {
    expect(refusalCode(() => recordVote(board, matter({ status: 'deliberation' }), { scholarId: 's1', position: 'for', reason: REASON }, T0)))
      .toBe('wrong_status');
  });
});

describe('the tally counts signatories and nothing else', () => {
  it('an advisory position stays in the record and out of the arithmetic', () => {
    const m = matter({
      status: 'voting',
      reasoning: [
        { scholarId: 's1', position: 'for', reason: REASON, at: T0 },
        { scholarId: 'adv', position: 'for', reason: REASON, at: T0 },
      ],
    });
    const t = tally(board, m);
    expect(t.for).toBe(1);
    expect(m.reasoning).toHaveLength(2);
  });

  it('abstentions never count toward the threshold', () => {
    const m = voteAll(matter({ status: 'voting', deliberation: [said()] }), ['s1', 's2'], 'abstain');
    const withOne = recordVote(board, m, { scholarId: 's3', position: 'for', reason: REASON }, T0);
    const t = tally(board, withOne);
    expect(t.abstain).toBe(2);
    expect(t.for).toBe(1);
    expect(t.met).toBe(false);
  });

  it('names who has not voted yet', () => {
    const m = voteAll(matter({ status: 'voting', deliberation: [said()] }), ['s1']);
    expect(tally(board, m).outstanding.sort()).toEqual(['s2', 's3', 's4']);
  });

  it('restricting needs fewer signatures than permitting, by design', () => {
    expect(quorumFor(board, 'restrict')).toBe(2);
    expect(quorumFor(board, 'permit')).toBe(3);
    expect(quorumFor(board, 'restrict')).toBeLessThan(quorumFor(board, 'permit'));
  });
});

// ── the asymmetry between permitting and restricting ──────────────────────

describe('permitting is slow', () => {
  const ready = () => voteAll(matter({ status: 'voting', deliberation: [said()], direction: 'permit' }), ['s1', 's2', 's3']);

  it('a met quorum starts a timelock rather than taking effect', () => {
    const { matter: m, outcome } = closeVoting(board, ready(), T0);
    expect(outcome).toBe('timelock_started');
    expect(m.status).toBe('timelock');
    expect(m.timelockEndsAt).toBe(hoursAfter(T0, 48));
    expect(m.inForceAt).toBeNull();
  });

  it('a short quorum is rejected outright', () => {
    const short = voteAll(matter({ status: 'voting', deliberation: [said()] }), ['s1', 's2']);
    expect(closeVoting(board, short, T0).outcome).toBe('rejected');
  });

  it('the timelock cannot be shortened from inside the system', () => {
    const { matter: m } = closeVoting(board, ready(), T0);
    expect(refusalCode(() => bringIntoForce(m, hoursAfter(T0, 47)))).toBe('timelock_running');
    expect(bringIntoForce(m, hoursAfter(T0, 48)).status).toBe('in_force');
  });

  it('one objection during the timelock halts it', () => {
    const { matter: m } = closeVoting(board, ready(), T0);
    const halted = objectDuringTimelock(board, m, { scholarId: 's4', reason: REASON }, hoursAfter(T0, 2));
    expect(halted.status).toBe('rejected');
    expect(halted.objections).toHaveLength(1);
  });

  it('a halted matter does not take effect even once the clock runs out', () => {
    const { matter: m } = closeVoting(board, ready(), T0);
    const halted = objectDuringTimelock(board, m, { scholarId: 's4', reason: REASON }, hoursAfter(T0, 2));
    expect(refusalCode(() => bringIntoForce({ ...halted, status: 'timelock' }, hoursAfter(T0, 72))))
      .toBe('objection_standing');
  });

  it('an objection also needs a written reason', () => {
    const { matter: m } = closeVoting(board, ready(), T0);
    expect(refusalCode(() => objectDuringTimelock(board, m, { scholarId: 's4', reason: 'no' }, T0)))
      .toBe('no_reason_given');
  });

  it('an advisory member cannot object', () => {
    const { matter: m } = closeVoting(board, ready(), T0);
    expect(refusalCode(() => objectDuringTimelock(board, m, { scholarId: 'adv', reason: REASON }, T0)))
      .toBe('not_a_signatory');
  });
});

describe('restricting is fast, and then has to be ratified', () => {
  const restriction = () =>
    voteAll(matter({ status: 'voting', deliberation: [said()], direction: 'restrict' }), ['s1', 's2']);

  it('takes effect at once on the reduced quorum', () => {
    const { matter: m, outcome } = closeVoting(board, restriction(), T0);
    expect(outcome).toBe('in_force');
    expect(m.status).toBe('in_force');
    expect(m.inForceAt).toBe(T0);
    expect(m.timelockEndsAt).toBeNull();
  });

  it('lapses if the window closes without the full quorum', () => {
    const { matter: m } = closeVoting(board, restriction(), T0);
    expect(hasLapsed(board, m, hoursAfter(T0, 167))).toBe(false);
    expect(hasLapsed(board, m, hoursAfter(T0, 169))).toBe(true);
    expect(lapse(m).status).toBe('lapsed');
  });

  it('ratification needs the full permitting quorum, not the reduced one', () => {
    const { matter: m } = closeVoting(board, restriction(), T0);
    expect(refusalCode(() => ratify(board, m, hoursAfter(T0, 1)))).toBe('quorum_not_met');

    const third = recordVote(board, { ...m, status: 'voting' }, { scholarId: 's3', position: 'for', reason: REASON }, T0);
    expect(() => ratify(board, { ...third, status: 'in_force' }, hoursAfter(T0, 1))).not.toThrow();
  });

  it('refuses ratification after the window has closed', () => {
    const { matter: m } = closeVoting(board, restriction(), T0);
    const third = recordVote(board, { ...m, status: 'voting' }, { scholarId: 's3', position: 'for', reason: REASON }, T0);
    expect(refusalCode(() => ratify(board, { ...third, status: 'in_force' }, hoursAfter(T0, 200))))
      .toBe('ratification_window_closed');
  });

  it('a permitting change has nothing to ratify', () => {
    expect(refusalCode(() => ratify(board, matter({ status: 'in_force', direction: 'permit' }), T0)))
      .toBe('nothing_to_ratify');
    expect(ratificationDeadline(board, matter({ direction: 'permit', inForceAt: T0 }))).toBeNull();
  });
});

// ── the property that decides the design ──────────────────────────────────

describe('the failure mode is toward refusal', () => {
  it('every path that is not an explicit approval leaves nothing in force', () => {
    const paths: Matter[] = [
      withdraw(matter({ status: 'deliberation' })),
      closeVoting(board, voteAll(matter({ status: 'voting', deliberation: [said()] }), ['s1']), T0).matter,
      objectDuringTimelock(
        board,
        closeVoting(board, voteAll(matter({ status: 'voting', deliberation: [said()] }), ['s1', 's2', 's3']), T0).matter,
        { scholarId: 's4', reason: REASON },
        T0
      ),
      lapse(closeVoting(board, voteAll(matter({ status: 'voting', deliberation: [said()], direction: 'restrict' }), ['s1', 's2']), T0).matter),
    ];
    for (const m of paths) {
      expect(['withdrawn', 'rejected', 'lapsed']).toContain(m.status);
    }
  });

  it('no accidental route reaches in_force without a met quorum', () => {
    const under = voteAll(matter({ status: 'voting', deliberation: [said()] }), ['s1', 's2']);
    expect(tally(board, under).met).toBe(false);
    expect(closeVoting(board, under, T0).matter.status).toBe('rejected');
  });
});
