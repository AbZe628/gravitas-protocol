import { describe, it, expect } from 'vitest';
import type { Asset, Composition, Matter, Rule } from '../src/types.js';
import { buildRegister, readComposition, standingOf } from '../src/services/register.js';

const NOW = '2026-09-03T09:00:00.000Z';
const at = (d: number) => new Date(new Date(NOW).getTime() + d * 86_400_000).toISOString();

function asset(over: Partial<Asset> = {}): Asset {
  return {
    id: 'a1', institutionId: 'inst', kind: 'token', name: 'Wrapped staking token',
    identifiers: [{ scheme: 'chain', value: '0x9f2c', network: 'arbitrum' }],
    source: 'registry', addedAt: at(-90), addedBy: null,
    composition: null, retiredAt: null, retiredReason: null,
    ...over,
  };
}

const rule: Rule = {
  id: 'r', boardId: 'b', title: '', statement: '', parameters: [],
  parameterHash: '0x0', version: 1, inForceFrom: null,
  supersededBy: null, supersedes: null, sources: [],
};

function matter(over: Partial<Matter> = {}): Matter {
  return {
    id: 'm1', boardId: 'b', title: 'A question', origin: 'institution_request',
    direction: 'permit', status: 'in_force', openedAt: at(-30),
    proposal: '', notDecided: [], mechanism: '', interactsWith: [],
    assetIds: ['a1'],
    proposedRule: rule, simulation: null, deliberation: [], reasoning: [],
    timelockStartedAt: null, timelockEndsAt: null, objections: [],
    inForceAt: at(-20), settledAt: at(-25), sources: [],
    ...over,
  };
}

const standing = (matters: Matter[], a = asset()) => standingOf(a, matters, NOW);

describe('the status is derived from what the board actually did', () => {
  it('is never examined when nothing names it', () => {
    const s = standing([]);
    expect(s.status).toBe('never_examined');
    expect(s.note).toContain('never put to the board');
  });

  it('ignores a matter that names a different asset', () => {
    expect(standing([matter({ assetIds: ['other'] })]).status).toBe('never_examined');
    expect(standing([matter({ assetIds: undefined })]).status).toBe('never_examined');
  });

  it('is permitted or restricted according to the direction of the ruling', () => {
    expect(standing([matter({ direction: 'permit' })]).status).toBe('permitted');
    expect(standing([matter({ direction: 'restrict' })]).status).toBe('restricted');
  });

  it('names the ruling that decides it', () => {
    expect(standing([matter({ id: 'm9' })]).governedBy).toBe('m9');
  });

  it('puts an open matter above a standing rule, and keeps the rule visible', () => {
    const s = standing([
      matter({ id: 'settled', status: 'in_force' }),
      matter({ id: 'open', status: 'voting', settledAt: undefined }),
    ]);
    expect(s.status).toBe('under_consideration');
    expect(s.openMatters).toEqual(['open']);
    // The reader needs to know a ruling still stands underneath.
    expect(s.governedBy).toBe('settled');
    expect(s.note).toContain('stands until it decides otherwise');
  });

  it('treats every open status as open', () => {
    for (const status of ['draft', 'deliberation', 'voting', 'timelock'] as const) {
      expect(standing([matter({ status, settledAt: undefined })]).status).toBe('under_consideration');
    }
  });

  it('reports a lapsed restriction as neither restricted nor approved', () => {
    const s = standing([matter({ status: 'lapsed', direction: 'restrict' })]);
    expect(s.status).toBe('lapsed');
    expect(s.note).toContain('neither restricted nor');
    expect(s.note).toContain('proposed again');
  });

  it('says so when a question was raised and never settled either way', () => {
    const s = standing([matter({ status: 'withdrawn' })]);
    expect(s.status).toBe('never_examined');
    expect(s.note).toContain('never settled either way');
  });

  it('takes the most recent ruling when there are several', () => {
    const s = standing([
      matter({ id: 'old', direction: 'restrict', settledAt: at(-200) }),
      matter({ id: 'new', direction: 'permit', settledAt: at(-10) }),
    ]);
    expect(s.status).toBe('permitted');
    expect(s.governedBy).toBe('new');
    expect(s.history).toEqual(['new', 'old']);
  });

  it('outranks everything with retirement, and keeps the reason', () => {
    const s = standing([matter()], asset({ retiredAt: at(-1), retiredReason: 'Delisted' }));
    expect(s.status).toBe('retired');
    expect(s.note).toContain('Delisted');
  });
});

describe('the register puts the unexamined first', () => {
  const many = [
    asset({ id: 'p', name: 'Permitted thing' }),
    asset({ id: 'n', name: 'Never looked at' }),
    asset({ id: 'r', name: 'Restricted thing' }),
    asset({ id: 'o', name: 'Open question' }),
  ];
  const matters = [
    matter({ id: 'mp', assetIds: ['p'], direction: 'permit' }),
    matter({ id: 'mr', assetIds: ['r'], direction: 'restrict' }),
    matter({ id: 'mo', assetIds: ['o'], status: 'voting', settledAt: undefined }),
  ];

  it('orders by what needs the board, not alphabetically', () => {
    const reg = buildRegister(many, matters, NOW);
    expect(reg.assets.map((a) => a.asset.id)).toEqual(['n', 'o', 'r', 'p']);
  });

  it('counts what has never been looked at, which is the figure a chair asks for', () => {
    const reg = buildRegister(many, matters, NOW);
    expect(reg.neverExamined).toBe(1);
    expect(reg.total).toBe(4);
    expect(reg.counts.permitted).toBe(1);
    expect(reg.counts.under_consideration).toBe(1);
  });

  it('holds to one institution when asked', () => {
    const theirs = asset({ id: 'x', institutionId: 'other' });
    expect(buildRegister([...many, theirs], matters, NOW, 'inst').total).toBe(4);
    expect(buildRegister([...many, theirs], matters, NOW).total).toBe(5);
  });

  it('has an honest answer for an empty register', () => {
    const reg = buildRegister([], [], NOW);
    expect(reg.total).toBe(0);
    expect(reg.neverExamined).toBe(0);
    expect(reg.assets).toEqual([]);
  });
});

describe('a composition is read out, not concluded from', () => {
  const composition = (over: Partial<Composition> = {}): Composition => ({
    asOf: '2026-06-30T00:00:00.000Z',
    source: 'Fund administrator, audited',
    parts: [
      { label: 'Leased equipment', bps: 4700, kind: 'tangible' },
      { label: 'Trade receivables', bps: 3300, kind: 'receivable' },
      { label: 'Cash', bps: 2000, kind: 'cash' },
    ],
    ...over,
  });

  it('shows each part with its arithmetic', () => {
    const r = readComposition(composition());
    expect(r.parts[0]).toMatchObject({ bps: 4700, percent: '47.00' });
    expect(r.total).toBe(10_000);
    expect(r.incomplete).toBe(false);
  });

  it('totals by kind, which is what a threshold is set against', () => {
    const r = readComposition(
      composition({
        parts: [
          { label: 'Equipment', bps: 3000, kind: 'tangible' },
          { label: 'Property', bps: 2100, kind: 'tangible' },
          { label: 'Cash', bps: 4900, kind: 'cash' },
        ],
      }),
    );
    // Sorted by size: tangible is 30% + 21% and outranks cash.
    expect(r.byKind[0]).toMatchObject({ kind: 'tangible', percent: '51.00' });
    expect(r.byKind[1]).toMatchObject({ kind: 'cash', percent: '49.00' });
    expect(r.byKind.find((k) => k.kind === 'tangible')).toMatchObject({ percent: '51.00' });
  });

  it('reports parts that do not sum to a hundred rather than scaling them', () => {
    const r = readComposition(
      composition({ parts: [{ label: 'Equipment', bps: 4700, kind: 'tangible' }] }),
    );
    expect(r.incomplete).toBe(true);
    expect(r.note).toContain('not 100%');
    expect(r.note).toContain('shown as given rather than');
    // The figure supplied is untouched.
    expect(r.parts[0].percent).toBe('47.00');
  });

  it('carries who supplied it, because a figure with no source is one somebody typed', () => {
    expect(readComposition(composition()).source).toContain('Fund administrator');
    expect(readComposition(composition()).note).toContain('Fund administrator');
  });

  it('states no verdict anywhere', () => {
    const text = JSON.stringify(readComposition(composition())).toLowerCase();
    for (const word of ['permissible', 'compliant', 'halal', 'haram', 'passes', 'fails']) {
      expect(text).not.toContain(word);
    }
  });
});
