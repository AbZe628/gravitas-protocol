import { describe, it, expect } from 'vitest';
import type { Board, Matter, Rule } from '../src/types.js';
import { Refused } from '../src/services/lifecycle.js';
import { hashParameters } from '../src/services/hash.js';
import { assemble, render } from '../src/services/fatwa.js';

const T0 = '2026-08-24T09:00:00.000Z';
const NOW = '2026-09-02T09:00:00.000Z';

const board: Board = {
  id: 'b', institutionId: 'inst', name: 'Shariah Supervisory Board',
  quorumPermit: 3, quorumRestrict: 2, totalSignatories: 4, ratificationWindowHours: 168,
  members: [
    { id: 's1', name: 'Mufti One', title: 'Chair', board: 'b', signatory: true },
    { id: 's2', name: 'Shaykh Two', title: 'Member', board: 'b', signatory: true },
    { id: 's3', name: 'Dr Three', title: 'Member', board: 'b', signatory: true },
    { id: 's4', name: 'Four', title: '', board: 'b', signatory: true },
  ],
};

const params = [
  { key: 'maxExposureBps', value: '2500', unit: 'basis points', meaning: 'At most 25% of net asset value.' },
  { key: 'reviewMonths', value: '6', meaning: 'Returns to the board every six months.' },
];

function rule(over: Partial<Rule> = {}): Rule {
  return {
    id: 'r', boardId: 'b', title: 'A rule', statement: '',
    parameters: params, parameterHash: hashParameters(params),
    version: 1, inForceFrom: null, supersededBy: null, supersedes: null, sources: [],
    ...over,
  };
}

function matter(over: Partial<Matter> = {}): Matter {
  return {
    id: 'matter-2026-042', boardId: 'b',
    title: 'Whether a wrapped asset inherits the ruling of its underlying',
    origin: 'institution_request', direction: 'permit', status: 'in_force', openedAt: T0,
    proposal: 'The board is asked whether the wrapper is a separate asset for the whitelist.',
    notDecided: ['This does not approve any other wrapper.', 'This does not address leverage.'],
    mechanism: 'The wrapper mints one token for each unit deposited and burns on redemption.',
    interactsWith: [],
    proposedRule: rule(), simulation: null, deliberation: [],
    reasoning: [
      { scholarId: 's1', position: 'for', reason: 'The wrapper adds no new obligation.', at: T0, onParameterHash: hashParameters(params) },
      { scholarId: 's2', position: 'for', reason: 'The mechanism is bounded by the deposit.', at: T0, onParameterHash: hashParameters(params) },
      { scholarId: 's3', position: 'against', reason: 'The redemption path is not guaranteed in all states.', at: T0, onParameterHash: hashParameters(params) },
    ],
    timelockStartedAt: null, timelockEndsAt: null, objections: [],
    inForceAt: '2026-08-28T09:00:00.000Z', settledAt: '2026-08-26T09:00:00.000Z',
    sources: [
      { kind: 'standard', label: 'AAOIFI SS 21', ref: 'Standard 21, §3', note: 'On financial papers.' },
      { kind: 'code', label: 'PolicyRegistry', ref: 'contracts/GravitasPolicyRegistry.sol' },
    ],
    ...over,
  };
}

const code = (fn: () => unknown): string | null => {
  try { fn(); return null; } catch (e) { return e instanceof Refused ? e.code : `threw ${String(e)}`; }
};

describe('it refuses to look final before it is', () => {
  it('produces nothing for a matter the board has not decided', () => {
    for (const status of ['draft', 'deliberation', 'voting'] as const) {
      expect(code(() => assemble(board, matter({ status }), NOW))).toBe('wrong_status');
    }
  });

  it('explains why, in terms of what would go wrong', () => {
    try {
      assemble(board, matter({ status: 'voting' }), NOW);
      expect.unreachable();
    } catch (e) {
      expect((e as Refused).message).toContain('will be acted on');
    }
  });

  it('names the kind of decision, including the ones that are not approvals', () => {
    const kinds = {
      in_force: 'ruling', timelock: 'pending', rejected: 'refusal',
      lapsed: 'lapsed', withdrawn: 'withdrawn',
    } as const;
    for (const [status, kind] of Object.entries(kinds)) {
      expect(assemble(board, matter({ status: status as Matter['status'] }), NOW).kind).toBe(kind);
    }
  });
});

describe('it assembles and never composes', () => {
  it('carries every reason in the member’s own words', () => {
    const f = assemble(board, matter(), NOW);
    expect(f.signatures.map((s) => s.reason)).toEqual([
      'The wrapper adds no new obligation.',
      'The mechanism is bounded by the deposit.',
    ]);
    expect(f.dissent[0].reason).toBe('The redemption path is not guaranteed in all states.');
  });

  it('resolves names and titles from the board', () => {
    const f = assemble(board, matter(), NOW);
    expect(f.signatures[0].name).toBe('Mufti One');
    expect(f.signatures[0].title).toBe('Chair');
  });

  it('falls back to the id for a member no longer on the board', () => {
    const m = matter({
      reasoning: [{ scholarId: 'departed', position: 'for', reason: 'A reason of sufficient length.', at: T0 }],
    });
    expect(assemble(board, m, NOW).signatures[0].name).toBe('departed');
  });

  it('keeps dissent separate and visible, and out of the count', () => {
    const f = assemble(board, matter(), NOW);
    expect(f.dissent).toHaveLength(1);
    expect(f.quorumRecorded).toBe(2);
    expect(f.quorumRequired).toBe(3);
  });

  it('shows a released position as released and does not count it', () => {
    const m = matter({
      reasoning: [
        { scholarId: 's1', position: 'for', reason: 'A reason of sufficient length.', at: T0, releasedAt: T0 },
        { scholarId: 's2', position: 'for', reason: 'Another reason of sufficient length.', at: T0 },
      ],
    });
    const f = assemble(board, m, NOW);
    expect(f.signatures.find((s) => s.scholarId === 's1')!.released).toBe(true);
    expect(f.quorumRecorded).toBe(1);
  });

  it('leaves out a source that was withdrawn', () => {
    const m = matter({
      sources: [
        { kind: 'standard', label: 'Kept', ref: 'a' },
        { kind: 'standard', label: 'Withdrawn', ref: 'b', withdrawnAt: T0 },
      ],
    });
    expect(assemble(board, m, NOW).evidence.map((s) => s.label)).toEqual(['Kept']);
  });

  it('carries the exclusions, which are the point', () => {
    expect(assemble(board, matter(), NOW).notDecided).toHaveLength(2);
  });
});

describe('the hash is checked, not merely printed', () => {
  it('verifies when the terms produce the stored hash', () => {
    expect(assemble(board, matter(), NOW).parametersVerified).toBe(true);
  });

  it('reports a mismatch when something changed after approval', () => {
    const m = matter({ proposedRule: rule({ parameterHash: '0xdeadbeef' }) });
    const f = assemble(board, m, NOW);
    expect(f.parametersVerified).toBe(false);
    expect(render(f)).toContain('do not produce the recorded hash');
    expect(render(f)).not.toContain('answered by comparison rather than by testimony');
  });

  it('flags a position recorded against different terms', () => {
    const m = matter({
      reasoning: [{ scholarId: 's1', position: 'for', reason: 'A reason of sufficient length.', at: T0, onParameterHash: '0xother' }],
    });
    expect(assemble(board, m, NOW).signatures[0].onDifferentTerms).toBe(true);
  });

  it('does not call an older position a mismatch just because it predates the field', () => {
    const m = matter({
      reasoning: [{ scholarId: 's1', position: 'for', reason: 'A reason of sufficient length.', at: T0 }],
    });
    expect(assemble(board, m, NOW).signatures[0].onDifferentTerms).toBe(false);
  });
});

describe('the dates that belong to different clocks', () => {
  it('states when a pending ruling takes effect', () => {
    const m = matter({ status: 'timelock', inForceAt: null, timelockEndsAt: '2026-08-28T09:00:00.000Z' });
    const f = assemble(board, m, NOW);
    expect(f.takesEffectAt).toBe('2026-08-28T09:00:00.000Z');
    expect(render(f)).toContain('takes effect on 2026-08-28');
  });

  it('states when a restriction must be ratified or lapse', () => {
    const m = matter({ direction: 'restrict', status: 'in_force', inForceAt: '2026-08-26T09:00:00.000Z' });
    const f = assemble(board, m, NOW);
    expect(f.ratificationDueAt).toBe('2026-09-02T09:00:00.000Z');
    expect(render(f)).toContain('or it lapses');
  });

  it('keeps the decision date apart from the effect date', () => {
    const f = assemble(board, matter(), NOW);
    expect(f.decidedAt).toBe('2026-08-26T09:00:00.000Z');
    expect(f.inForceAt).toBe('2026-08-28T09:00:00.000Z');
  });
});

describe('the page', () => {
  const html = () => render(assemble(board, matter(), NOW));

  it('is a whole document with nothing fetched from a network', () => {
    const page = html();
    expect(page.startsWith('<!doctype html>')).toBe(true);
    expect(page).toContain('@page');
    expect(page).not.toContain('<script');
    expect(page).not.toMatch(/https?:\/\//);
  });

  it('shows the ruling, the terms, both sides and the evidence', () => {
    const page = html();
    expect(page).toContain('Whether a wrapped asset inherits');
    expect(page).toContain('maxExposureBps');
    expect(page).toContain('Mufti One');
    expect(page).toContain('Dr Three');
    expect(page).toContain('AAOIFI SS 21');
  });

  it('gives the exclusions their own box even when there are none', () => {
    expect(html()).toContain('What this does not decide');
    const bare = render(assemble(board, matter({ notDecided: [] }), NOW));
    expect(bare).toContain('carries no exclusions');
  });

  it('says plainly when the board did not approve', () => {
    const page = render(assemble(board, matter({ status: 'rejected' }), NOW));
    expect(page).toContain('did not approve this');
    expect(page).toContain('may be relied on as an approval');
  });

  it('escapes anything a member typed, so a reason cannot become markup', () => {
    const m = matter({
      title: 'Wrapped <script>alert(1)</script> assets',
      reasoning: [{ scholarId: 's1', position: 'for', reason: 'Because "a" & <b>b</b> differ, materially.', at: T0 }],
    });
    const page = render(assemble(board, m, NOW));
    expect(page).not.toContain('<script>alert(1)</script>');
    expect(page).toContain('&lt;script&gt;');
    expect(page).toContain('&amp;');
    expect(page).toContain('&lt;b&gt;b&lt;/b&gt;');
  });

  it('says when it was produced, apart from when the decision was taken', () => {
    expect(html()).toContain('Assembled from the board’s own record on 2026-09-02');
  });

  it('states that nothing in it was composed', () => {
    expect(html()).toContain('nothing here is summarised or composed');
  });
});
