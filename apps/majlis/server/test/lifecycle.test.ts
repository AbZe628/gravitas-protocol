import { describe, it, expect } from 'vitest';
import type { Board, Matter, Rule, RuleParameter, SourceRef } from '../src/types.js';
import { verifyParameters } from '../src/services/hash.js';
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
  attachSource,
  returnToDeliberation,
  setParameters,
  standingSources,
  withdrawSource,
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

// ── returning an open vote to deliberation ────────────────────────────────

describe('a vote can be returned to deliberation while it is still open', () => {
  const openVote = () => openVoting(matter({ status: 'deliberation', deliberation: [said()] }));

  it('goes back to deliberation', () => {
    const { matter: back } = returnToDeliberation(
      board, openVote(), { scholarId: 's1', reason: REASON }, T0,
    );
    expect(back.status).toBe('deliberation');
  });

  /*
   * The part that cannot be skipped. A vote is a position on the matter as it
   * stood; carrying it across a change would record a member as supporting
   * something they have not seen.
   */
  it('releases every position already cast', () => {
    const voted = voteAll(openVote(), ['s1', 's2']);
    expect(tally(board, voted).for).toBe(2);

    const { matter: back, released } = returnToDeliberation(
      board, voted, { scholarId: 's1', reason: REASON }, T0,
    );

    expect(released).toBe(2);
    expect(tally(board, back).for).toBe(0);
    expect(tally(board, back).met).toBe(false);
  });

  /* Released, not deleted: what a member said is part of how this was reached. */
  it('keeps the released positions in the record', () => {
    const voted = voteAll(openVote(), ['s1', 's2']);
    const { matter: back } = returnToDeliberation(
      board, voted, { scholarId: 's1', reason: REASON }, T0,
    );

    expect(back.reasoning).toHaveLength(2);
    expect(back.reasoning.every((r) => r.releasedAt === T0)).toBe(true);
    expect(back.reasoning[0].reason).toBe(REASON);
  });

  /* Everyone is outstanding again, because nobody's position stands. */
  it('puts every signatory back among those yet to record a position', () => {
    const voted = voteAll(openVote(), ['s1', 's2']);
    const { matter: back } = returnToDeliberation(
      board, voted, { scholarId: 's1', reason: REASON }, T0,
    );
    expect(tally(board, back).outstanding).toEqual(['s1', 's2', 's3', 's4']);
  });

  it('lets the same member vote again afterwards', () => {
    const voted = voteAll(openVote(), ['s1']);
    const { matter: back } = returnToDeliberation(
      board, voted, { scholarId: 's1', reason: REASON }, T0,
    );
    const reopened = openVoting(back);
    const again = recordVote(
      board, reopened, { scholarId: 's1', position: 'against', reason: REASON }, T0,
    );

    expect(tally(board, again).against).toBe(1);
    expect(tally(board, again).for).toBe(0);
    // Both are kept: the position they held, and the position they hold.
    expect(again.reasoning).toHaveLength(2);
  });

  it('a second return releases nothing that was already released', () => {
    const voted = voteAll(openVote(), ['s1']);
    const first = returnToDeliberation(board, voted, { scholarId: 's1', reason: REASON }, T0).matter;
    const reopened = openVoting(first);
    const second = returnToDeliberation(board, reopened, { scholarId: 's1', reason: REASON }, T0);

    expect(second.released).toBe(0);
  });

  // ── what it refuses ─────────────────────────────────────────────────────

  it('is not available before the vote opens', () => {
    expect(
      refusalCode(() =>
        returnToDeliberation(
          board,
          matter({ status: 'deliberation', deliberation: [said()] }),
          { scholarId: 's1', reason: REASON },
          T0,
        ),
      ),
    ).toBe('wrong_status');
  });

  /*
   * By the timelock the decision is taken. A signatory who has changed their
   * mind objects, which halts it — that path exists and this one would blur it.
   */
  it('is not available once the matter is in timelock', () => {
    const carried = voteAll(openVote(), ['s1', 's2', 's3']);
    const closed = closeVoting(board, carried, T0).matter;
    expect(closed.status).toBe('timelock');

    expect(
      refusalCode(() => returnToDeliberation(board, closed, { scholarId: 's1', reason: REASON }, T0)),
    ).toBe('wrong_status');
  });

  it('requires a signatory', () => {
    expect(
      refusalCode(() => returnToDeliberation(board, openVote(), { scholarId: 'adv', reason: REASON }, T0)),
    ).toBe('not_a_signatory');
  });

  it('requires a written reason', () => {
    expect(
      refusalCode(() => returnToDeliberation(board, openVote(), { scholarId: 's1', reason: '   ' }, T0)),
    ).toBe('no_reason_given');
  });
});

// ── evidence ──────────────────────────────────────────────────────────────

/*
 * A matter could carry sources and nobody could add one. For a board whose
 * entire output is reasoning, evidence that cannot be attached to the reasoning
 * was the largest ordinary gap in the application.
 */
describe('evidence attaches to a matter', () => {
  const cite = (over: Partial<SourceRef> = {}) => ({
    kind: 'standard' as const,
    label: 'AAOIFI Shariah Standard No. 21',
    ref: 'AAOIFI SS 21, clauses 3/1 and 3/4',
    ...over,
  });

  const open = () => matter({ status: 'deliberation' });

  it('records who attached it and when', () => {
    const m = attachSource(open(), { scholarId: 's1', source: cite() }, T0, 'src-1');
    const [s] = m.sources;

    expect(s.addedBy).toBe('s1');
    expect(s.at).toBe(T0);
    expect(s.id).toBe('src-1');
    expect(s.kind).toBe('standard');
    expect(s.withdrawnAt).toBeNull();
  });

  /*
   * Attribution is not decoration. "The board decided X citing standard Y" and
   * "a member cited Y and the board decided X anyway" are different records, and
   * only one survives if nobody knows who attached what.
   */
  it('keeps two members citing different things apart', () => {
    let m = attachSource(open(), { scholarId: 's1', source: cite() }, T0, 'a');
    m = attachSource(m, { scholarId: 's2', source: cite({ ref: 'IFSB-17, section 4' }) }, T0, 'b');

    expect(m.sources.map((s) => s.addedBy)).toEqual(['s1', 's2']);
  });

  it('carries the note explaining why it is here', () => {
    const m = attachSource(
      open(),
      { scholarId: 's1', source: cite({ note: 'The tangible-asset ratio is defined here, not in 59.' }) },
      T0,
      'a',
    );
    expect(m.sources[0].note).toContain('tangible-asset ratio');
  });

  it('refuses the same reference twice', () => {
    const m = attachSource(open(), { scholarId: 's1', source: cite() }, T0, 'a');
    expect(
      refusalCode(() => attachSource(m, { scholarId: 's2', source: cite() }, T0, 'b')),
    ).toBe('already_cited');
  });

  it('refuses a label too short to find anything by', () => {
    expect(
      refusalCode(() => attachSource(open(), { scholarId: 's1', source: cite({ label: 'x' }) }, T0, 'a')),
    ).toBe('no_reason_given');
  });

  /*
   * Evidence closes when the matter does. A source added after a decision is not
   * evidence the decision rested on, and admitting it would let the record be
   * improved after the fact.
   */
  it('is refused once the matter is settled', () => {
    for (const status of ['in_force', 'rejected', 'withdrawn', 'lapsed'] as const) {
      expect(
        refusalCode(() => attachSource(matter({ status }), { scholarId: 's1', source: cite() }, T0, 'a')),
      ).toBe('wrong_status');
    }
  });

  it('is open while the matter still is', () => {
    for (const status of ['draft', 'deliberation', 'voting', 'timelock'] as const) {
      expect(() =>
        attachSource(matter({ status }), { scholarId: 's1', source: cite() }, T0, 'a'),
      ).not.toThrow();
    }
  });
});

describe('a source is withdrawn, never deleted', () => {
  const cited = () =>
    attachSource(
      matter({ status: 'deliberation' }),
      { scholarId: 's1', source: { kind: 'ruling', label: 'A prior decision of this board', ref: 'matter-2026-01-08' } },
      T0,
      'src-1',
    );

  it('stops standing but stays in the record', () => {
    const m = withdrawSource(cited(), { scholarId: 's1', sourceId: 'src-1' }, T0);

    expect(m.sources).toHaveLength(1);
    expect(m.sources[0].withdrawnAt).toBe(T0);
    expect(standingSources(m)).toHaveLength(0);
  });

  /*
   * One member deleting another's evidence is not a correction. It is an
   * argument conducted by deletion, and the deliberation exists for the other
   * kind.
   */
  it('can only be withdrawn by whoever attached it', () => {
    expect(
      refusalCode(() => withdrawSource(cited(), { scholarId: 's2', sourceId: 'src-1' }, T0)),
    ).toBe('not_yours');
  });

  it('cannot be withdrawn twice', () => {
    const m = withdrawSource(cited(), { scholarId: 's1', sourceId: 'src-1' }, T0);
    expect(
      refusalCode(() => withdrawSource(m, { scholarId: 's1', sourceId: 'src-1' }, T0)),
    ).toBe('already_withdrawn');
  });

  it('refuses a source that is not there', () => {
    expect(
      refusalCode(() => withdrawSource(cited(), { scholarId: 's1', sourceId: 'nope' }, T0)),
    ).toBe('not_found');
  });

  /* Withdrawing frees the reference: a mistyped citation can be corrected. */
  it('frees the reference so a correction can be attached', () => {
    const m = withdrawSource(cited(), { scholarId: 's1', sourceId: 'src-1' }, T0);
    expect(() =>
      attachSource(
        m,
        { scholarId: 's1', source: { kind: 'ruling', label: 'A prior decision of this board', ref: 'matter-2026-01-08' } },
        T0,
        'src-2',
      ),
    ).not.toThrow();
  });
});

// ── the operative terms ───────────────────────────────────────────────────

/*
 * Every matter used to be created with an empty parameter list and an empty
 * hash, and no route could fill either. A carefully designed integrity
 * mechanism had nothing to work on, and a board could say "permit this asset"
 * but not "at a ratio of 30%, measured quarterly".
 */
describe('the operative terms of a rule', () => {
  const terms = (over: Partial<RuleParameter>[] = []) =>
    over.length
      ? (over as RuleParameter[])
      : [
          { key: 'tangible_ratio_min', value: '30', unit: 'percent', meaning: 'Tangible assets as a share of total assets, below which the instrument is not permitted.' },
          { key: 'measurement', value: 'quarterly', meaning: 'How often the ratio is measured.' },
        ];

  const drafting = () => matter({ status: 'deliberation', deliberation: [said()] });

  it('records the terms on the proposed rule', () => {
    const m = setParameters(drafting(), terms());
    expect(m.proposedRule.parameters).toHaveLength(2);
    expect(m.proposedRule.parameters[0].value).toBe('30');
    expect(m.proposedRule.parameters[0].unit).toBe('percent');
  });

  it('leaves the hash empty while the terms can still move', () => {
    const m = setParameters(drafting(), terms());
    expect(m.proposedRule.parameterHash).toBe('');
  });

  it('refuses two values for one term', () => {
    expect(
      refusalCode(() =>
        setParameters(drafting(), [
          { key: 'ratio', value: '30', meaning: 'One reading of it.' },
          { key: 'ratio', value: '33', meaning: 'Another reading of it.' },
        ]),
      ),
    ).toBe('duplicate_parameter');
  });

  it('requires the plain-language meaning', () => {
    expect(
      refusalCode(() => setParameters(drafting(), [{ key: 'ratio', value: '30', meaning: '' }])),
    ).toBe('no_reason_given');
  });

  /*
   * The terms are what the board is voting on. A set of terms that can move
   * under a standing position is not a set anyone can be said to have approved.
   */
  it('cannot be changed once a vote is open', () => {
    const voting = openVoting(setParameters(drafting(), terms()));
    expect(refusalCode(() => setParameters(voting, terms()))).toBe('wrong_status');
  });

  it('cannot be changed after the matter is settled', () => {
    for (const status of ['timelock', 'in_force', 'rejected', 'withdrawn'] as const) {
      expect(refusalCode(() => setParameters(matter({ status }), terms()))).toBe('wrong_status');
    }
  });
});

describe('the hash fixes the terms when the vote opens', () => {
  const withTerms = () =>
    setParameters(matter({ status: 'deliberation', deliberation: [said()] }), [
      { key: 'tangible_ratio_min', value: '30', unit: 'percent', meaning: 'The floor.' },
    ]);

  it('computes on opening and not before', () => {
    const before = withTerms();
    expect(before.proposedRule.parameterHash).toBe('');

    const after = openVoting(before);
    expect(after.proposedRule.parameterHash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('commits to an empty set too, because that is also a statement', () => {
    const m = openVoting(matter({ status: 'deliberation', deliberation: [said()] }));
    expect(m.proposedRule.parameterHash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('matches what verifyParameters recomputes', () => {
    const m = openVoting(withTerms());
    expect(verifyParameters(m.proposedRule.parameters, m.proposedRule.parameterHash)).toBe(true);
  });

  /*
   * This is what makes the hash worth computing: "did this member approve these
   * exact terms" becomes a comparison rather than an argument about what was on
   * the screen at the time.
   */
  it('is recorded on every position taken against it', () => {
    const voting = openVoting(withTerms());
    const voted = recordVote(board, voting, { scholarId: 's1', position: 'for', reason: REASON }, T0);

    expect(voted.reasoning[0].onParameterHash).toBe(voting.proposedRule.parameterHash);
  });

  /*
   * Going back reopens the terms. Leaving the hash standing would say the board
   * is still committed to terms nobody is currently voting on.
   */
  it('is cleared when the matter returns to deliberation', () => {
    const voting = openVoting(withTerms());
    const voted = recordVote(board, voting, { scholarId: 's1', position: 'for', reason: REASON }, T0);
    const { matter: back } = returnToDeliberation(board, voted, { scholarId: 's1', reason: REASON }, T0);

    expect(back.proposedRule.parameterHash).toBe('');
    // The released position keeps the hash it was cast against, which is how
    // anyone reading later can see what it was a position on.
    expect(back.reasoning[0].onParameterHash).toBe(voting.proposedRule.parameterHash);
  });

  it('changes when the terms change, so a new vote is a new commitment', () => {
    const first = openVoting(withTerms()).proposedRule.parameterHash;

    const reopened = setParameters(matter({ status: 'deliberation', deliberation: [said()] }), [
      { key: 'tangible_ratio_min', value: '33', unit: 'percent', meaning: 'The floor.' },
    ]);
    const second = openVoting(reopened).proposedRule.parameterHash;

    expect(second).not.toBe(first);
  });
});
