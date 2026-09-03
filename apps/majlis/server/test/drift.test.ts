import { describe, it, expect } from 'vitest';
import type { Asset, Composition, Matter, Rule, RuleParameter } from '../src/types.js';
import { driftFor, driftReport, watching } from '../src/services/drift.js';

const NOW = '2026-09-04T09:00:00.000Z';

const composition = (over: Partial<Composition> = {}): Composition => ({
  asOf: '2026-06-30T00:00:00.000Z',
  source: 'Pool net asset value breakdown, audited',
  parts: [
    { label: 'Leased equipment', bps: 3100, kind: 'tangible' },
    { label: 'Leased property', bps: 1600, kind: 'tangible' },
    { label: 'Trade receivables', bps: 3300, kind: 'receivable' },
    { label: 'Cash', bps: 2000, kind: 'cash' },
  ],
  ...over,
});

function asset(over: Partial<Asset> = {}): Asset {
  return {
    id: 'a1', institutionId: 'inst', kind: 'pool', name: 'Mixed pool',
    identifiers: [{ scheme: 'internal', value: 'POOL-1' }],
    source: 'registry', addedAt: NOW, addedBy: null,
    composition: composition(),
    retiredAt: null, retiredReason: null,
    ...over,
  };
}

const term = (over: Partial<RuleParameter> = {}): RuleParameter => ({
  key: 'minTangibleRatioBps',
  value: '5100',
  unit: 'basis points',
  meaning: 'Tangible assets must be at least 51.00% of pool value.',
  watches: watching('tangible', 'minimum'),
  ...over,
});

function matter(params: RuleParameter[], over: Partial<Matter> = {}): Matter {
  const rule: Rule = {
    id: 'r1', boardId: 'b', title: '', statement: '', parameters: params,
    parameterHash: '0x0', version: 1, inForceFrom: NOW,
    supersededBy: null, supersedes: null, sources: [],
  };
  return {
    id: 'matter-2026-011', boardId: 'b', title: 'Mixed pool trading',
    origin: 'institution_request', direction: 'permit', status: 'in_force', openedAt: NOW,
    proposal: '', notDecided: [], mechanism: '', interactsWith: [],
    assetIds: ['a1'],
    proposedRule: rule, simulation: null, deliberation: [], reasoning: [],
    timelockStartedAt: null, timelockEndsAt: null, objections: [],
    inForceAt: NOW, sources: [],
    ...over,
  };
}

describe('it compares what was set against what is there', () => {
  it('finds a holding that has fallen below the floor the board set', () => {
    // Tangible is 31% + 16% = 47%, against a 51% minimum.
    const d = driftFor(asset(), [matter([term()])]);
    expect(d.drifting).toHaveLength(1);
    expect(d.drifting[0].observed.percent).toBe('47.00');
    expect(d.drifting[0].term.value).toBe('5100');
  });

  it('says nothing about a holding comfortably inside its terms', () => {
    const d = driftFor(asset(), [matter([term({ value: '4000' })])]);
    expect(d.drifting).toEqual([]);
  });

  it('treats a maximum the other way round', () => {
    // Cash is 20%. A 15% ceiling is breached; a 25% ceiling is not.
    const breached = driftFor(asset(), [
      matter([term({ key: 'maxCashBps', value: '1500', watches: watching('cash', 'maximum') })]),
    ]);
    expect(breached.drifting).toHaveLength(1);

    const fine = driftFor(asset(), [
      matter([term({ key: 'maxCashBps', value: '2500', watches: watching('cash', 'maximum') })]),
    ]);
    expect(fine.drifting).toEqual([]);
  });

  it('is exact at the boundary, in both directions', () => {
    // Tangible is exactly 4700. A 4700 minimum holds; 4701 does not.
    expect(driftFor(asset(), [matter([term({ value: '4700' })])]).drifting).toEqual([]);
    expect(driftFor(asset(), [matter([term({ value: '4701' })])]).drifting).toHaveLength(1);
  });

  it('sums every part of the kind it watches', () => {
    // Two tangible parts, and the test above proves they are added rather than
    // the first one taken.
    const d = driftFor(asset(), [matter([term({ value: '3200' })])]);
    expect(d.drifting).toEqual([]);
  });

  it('reads a part that is absent as nothing rather than skipping the check', () => {
    const noTangible = asset({
      composition: composition({ parts: [{ label: 'Cash', bps: 10000, kind: 'cash' }] }),
    });
    const d = driftFor(noTangible, [matter([term()])]);
    expect(d.drifting).toHaveLength(1);
    expect(d.drifting[0].observed.percent).toBe('0.00');
  });
});

describe('it looks only where the board is still standing on something', () => {
  it('ignores a matter that is not in force', () => {
    for (const status of ['deliberation', 'voting', 'timelock', 'rejected', 'lapsed'] as const) {
      expect(driftFor(asset(), [matter([term()], { status })]).drifting).toEqual([]);
    }
  });

  it('ignores a ruling about a different holding', () => {
    expect(driftFor(asset(), [matter([term()], { assetIds: ['other'] })]).drifting).toEqual([]);
    expect(driftFor(asset(), [matter([term()], { assetIds: undefined })]).drifting).toEqual([]);
  });

  it('names the decision, so a reader can go and read it', () => {
    const d = driftFor(asset(), [matter([term()])]);
    expect(d.drifting[0].matterId).toBe('matter-2026-011');
    expect(d.drifting[0].questionForBoard).toContain('matter-2026-011');
  });
});

describe('what it refuses to guess', () => {
  it('reports a term that says nothing about what it watches', () => {
    const d = driftFor(asset(), [matter([term({ watches: undefined })])]);
    expect(d.drifting).toEqual([]);
    expect(d.unwatched).toHaveLength(1);
    expect(d.unwatched[0].reason).toContain('nothing checks it');
  });

  it('does not infer from the name, however obvious the name is', () => {
    // The key says "tangible" and the meaning says 51%. Neither is enough.
    const d = driftFor(asset(), [
      matter([term({ key: 'minTangibleRatioBps', watches: undefined })]),
    ]);
    expect(d.drifting).toEqual([]);
  });

  it('reports a threshold that is not a number rather than comparing against nothing', () => {
    const d = driftFor(asset(), [matter([term({ value: 'the majority' })])]);
    expect(d.drifting).toEqual([]);
    expect(d.unwatched[0].reason).toContain('not a number of basis points');
  });

  it('reports a watched term with no composition to check it against', () => {
    const d = driftFor(asset({ composition: null }), [matter([term()])]);
    expect(d.drifting).toEqual([]);
    expect(d.unmeasured).toHaveLength(1);
    expect(d.unmeasured[0].reason).toContain('the absence is the finding');
  });

  it('says nothing about a holding nobody set a term on', () => {
    const d = driftFor(asset({ composition: null }), [matter([])]);
    expect(d.unmeasured).toEqual([]);
    expect(d.unwatched).toEqual([]);
  });
});

describe('the question it asks', () => {
  it('states both figures and where the composition came from', () => {
    const q = driftFor(asset(), [matter([term()])]).drifting[0].questionForBoard;
    expect(q).toContain('47.00%');
    expect(q).toContain('51.00%');
    expect(q).toContain('audited');
    expect(q).toContain('2026-06-30');
  });

  it('ends in a question and never in a conclusion', () => {
    const q = driftFor(asset(), [matter([term()])]).drifting[0].questionForBoard.toLowerCase();
    expect(q).toContain('does the standing ruling still hold?');
    for (const word of ['therefore', 'impermissible', 'must be withdrawn', 'no longer permitted']) {
      expect(q).not.toContain(word);
    }
  });

  it('changes no status anywhere', () => {
    // The whole output is a report. Nothing here returns an asset or a matter.
    const d = driftFor(asset(), [matter([term()])]);
    expect(JSON.stringify(d)).not.toContain('"status"');
  });
});

describe('the report a chair reads', () => {
  const other = asset({ id: 'a2', name: 'Another pool' });

  it('gathers every holding that has moved', () => {
    const matters = [matter([term()]), matter([term()], { id: 'm2', assetIds: ['a2'] })];
    const r = driftReport([asset(), other], matters, NOW);
    expect(r.drifting).toHaveLength(2);
    expect(r.drifting.map((d) => d.assetName)).toEqual(['Another pool', 'Mixed pool']);
  });

  it('leaves out a holding that has been withdrawn', () => {
    const retired = asset({ retiredAt: NOW, retiredReason: 'Delisted' });
    expect(driftReport([retired], [matter([term()])], NOW).drifting).toEqual([]);
  });

  it('carries the unwatched terms too, since that is how drift goes unnoticed', () => {
    const r = driftReport([asset()], [matter([term({ watches: undefined })])], NOW);
    expect(r.drifting).toEqual([]);
    expect(r.unwatched).toHaveLength(1);
  });

  it('has an honest answer for a register nothing is wrong with', () => {
    const r = driftReport([asset()], [matter([term({ value: '4000' })])], NOW);
    expect(r.drifting).toEqual([]);
    expect(r.unwatched).toEqual([]);
    expect(r.unmeasured).toEqual([]);
  });
});
