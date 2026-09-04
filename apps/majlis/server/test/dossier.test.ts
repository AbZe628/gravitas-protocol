import { describe, it, expect } from 'vitest';
import { assembleDossier, renderDossier } from '../src/services/dossier.js';
import type { Asset, Computation, Matter, Rule } from '../src/types.js';

/**
 * The record of one holding.
 *
 * What these hold to: it assembles and concludes nothing, and it says what it
 * cannot say. A page headed with a token's name and showing nothing under its
 * rulings reads as an absence of problems, which is the most misreadable thing
 * this system could produce.
 */

const NOW = '2026-09-04T09:00:00.000Z';

const asset = (over: Partial<Asset> = {}): Asset => ({
  id: 'asset-1',
  institutionId: 'inst',
  kind: 'pool',
  name: 'Mixed pool — leased equipment and trade finance',
  identifiers: [{ scheme: 'chain', value: '0xabc', network: 'arbitrum-sepolia' }],
  source: 'protocol',
  addedAt: '2026-01-01T00:00:00.000Z',
  addedBy: null,
  composition: null,
  retiredAt: null,
  retiredReason: null,
  ...over,
});

const rule = (over: Partial<Rule> = {}): Rule => ({
  id: 'rule-1',
  boardId: 'b',
  title: 'Minimum tangibility for a traded pool',
  statement: 'Trading is suspended below the minimum.',
  parameters: [
    {
      key: 'minTangibleRatioBps',
      value: '5100',
      meaning: 'Tangible assets must be at least 51.00% of pool value.',
    },
  ],
  parameterHash: '0x0',
  version: 1,
  inForceFrom: '2026-04-10T00:00:00.000Z',
  supersededBy: null,
  supersedes: null,
  sources: [],
  ...over,
});

const matter = (over: Partial<Matter> = {}): Matter => ({
  id: 'matter-1',
  boardId: 'b',
  title: 'Whether the pool may be traded below the tangible minimum',
  origin: 'institution_request',
  direction: 'permit',
  status: 'in_force',
  openedAt: '2026-03-01T00:00:00.000Z',
  settledAt: '2026-04-02T00:00:00.000Z',
  proposal: '',
  notDecided: ['Whether the 51% threshold itself is correct.'],
  mechanism: '',
  interactsWith: [],
  assetIds: ['asset-1'],
  proposedRule: rule(),
  simulation: null,
  deliberation: [],
  reasoning: [],
  timelockStartedAt: null,
  timelockEndsAt: null,
  objections: [],
  inForceAt: '2026-04-10T00:00:00.000Z',
  sources: [],
  ...over,
});

const computation = (over: Partial<Computation> = {}): Computation => ({
  id: 'c1',
  kind: 'purification',
  boardId: 'b',
  assetId: 'asset-1',
  periodFrom: '2026-01-01',
  periodTo: '2026-12-31',
  method: 'per_dividend',
  methodStated: 'Non-permissible income as a proportion of total income.',
  currency: 'USD',
  source: 'Issuer annual report',
  figures: {},
  headline: 'To be given away',
  amount: '800',
  steps: [{ label: 'Proportion', working: '3200000 ÷ 100000000', value: '3.20%' }],
  note: 'Which method applies is the board’s to decide.',
  recordedBy: 's1',
  recordedAt: '2027-01-15T00:00:00.000Z',
  supersedes: null,
  withdrawnAt: null,
  withdrawnBy: null,
  withdrawalReason: null,
  ...over,
});

const build = (over: Partial<Parameters<typeof assembleDossier>[0]> = {}) =>
  assembleDossier({ asset: asset(), matters: [], rules: [], generatedAt: NOW, ...over });

describe('it assembles what the board decided', () => {
  it('lists only the matters that name this holding', () => {
    const mine = matter();
    const theirs = matter({ id: 'matter-2', assetIds: ['asset-other'] });

    expect(build({ matters: [mine, theirs] }).decisions.map((d) => d.matterId)).toEqual(['matter-1']);
  });

  it('runs the story forwards, unlike the register which leads with today', () => {
    const first = matter({ id: 'older', settledAt: '2026-02-01T00:00:00.000Z' });
    const second = matter({ id: 'newer', settledAt: '2026-08-01T00:00:00.000Z' });

    expect(build({ matters: [second, first] }).decisions.map((d) => d.matterId)).toEqual([
      'older',
      'newer',
    ]);
  });

  it('carries what the board said it was not deciding, unsummarised', () => {
    const d = build({ matters: [matter()] });
    expect(d.decisions[0].notDecided).toEqual(['Whether the 51% threshold itself is correct.']);
  });

  it('names the outcome in the board’s terms rather than as a status code', () => {
    const d = build({
      matters: [
        matter({ id: 'a', status: 'in_force' }),
        matter({ id: 'b', status: 'rejected' }),
        matter({ id: 'c', status: 'deliberation' }),
      ],
    });
    expect(d.decisions.map((x) => x.outcome).sort()).toEqual(['approved', 'pending', 'refused']);
  });
});

describe('the terms a reader can check against', () => {
  it('carries the operative terms with the meaning the board actually read', () => {
    const d = build({ matters: [matter()], rules: [rule()] });

    expect(d.terms).toHaveLength(1);
    expect(d.terms[0].key).toBe('minTangibleRatioBps');
    expect(d.terms[0].meaning).toContain('at least 51.00%');
  });

  it('leaves out a term the board later changed', () => {
    // Repeating a superseded term as though it bound anybody would be the
    // document contradicting itself.
    const changed = matter({ proposedRule: rule({ supersededBy: 'rule-2' }) });
    expect(build({ matters: [changed] }).terms).toEqual([]);
  });

  it('leaves out terms from a matter that did not carry', () => {
    const d = build({ matters: [matter({ status: 'rejected' })], rules: [rule()] });
    expect(d.terms).toEqual([]);
  });
});

describe('it says what it cannot say', () => {
  it('says plainly that a holding nobody ruled on has no ruling', () => {
    const gaps = build().gaps.join(' ');
    expect(gaps).toContain('never been asked about this holding');
    // And that the absence is not a finding of acceptability.
    expect(gaps).toContain('Nothing below is a finding that it is acceptable');
  });

  it('names a decision that carried and set no terms', () => {
    const bare = matter({ proposedRule: rule({ parameters: [] }) });
    const d = build({ matters: [bare] });

    expect(d.terms).toEqual([]);
    expect(d.gaps.join(' ')).toContain('set no operative terms');
  });

  it('takes the terms from the matter’s own copy of the rule', () => {
    // The board approved the object in front of it, and parameterHash is over
    // exactly those parameters. In this record a matter's rule and the rules
    // table do not always even share an id.
    const d = build({ matters: [matter()], rules: [] });

    expect(d.terms).toHaveLength(1);
    expect(d.terms[0].value).toBe('5100');
  });

  it('leaves out a term whose rule the rules table records as superseded', () => {
    const d = build({
      matters: [matter()],
      rules: [rule({ id: 'rule-1', supersededBy: 'rule-2' })],
    });
    expect(d.terms).toEqual([]);
  });

  it('names a missing composition', () => {
    expect(build().gaps.join(' ')).toContain('No composition has been supplied');
  });

  it('names a composition that does not sum to the whole, and refuses to scale it', () => {
    const partial = asset({
      composition: {
        asOf: '2026-06-30T00:00:00.000Z',
        source: 'Pool net asset value breakdown',
        parts: [{ label: 'Leased equipment', kind: 'tangible', bps: 5000 }],
      },
    });
    const d = build({ asset: partial });

    expect(d.composition?.incomplete).toBe(true);
    expect(d.gaps.join(' ')).toContain('does not sum to the whole');
    expect(d.gaps.join(' ')).toContain('invented proportion');
  });

  it('names a holding entered by hand rather than read from a registry', () => {
    const typed = asset({ source: 'institution' });
    expect(build({ asset: typed }).gaps.join(' ')).toContain('depends on who typed it');
  });

  it('names the absence of any calculation', () => {
    expect(build().gaps.join(' ')).toContain('No calculation has been noted');
  });

  it('stops naming calculations once one is noted', () => {
    const d = build({ computations: [computation()] });
    expect(d.calculations).toHaveLength(1);
    expect(d.gaps.join(' ')).not.toContain('No calculation has been noted');
  });

  it('leaves a withdrawn calculation out, and says none was noted', () => {
    const gone = computation({ withdrawnAt: '2027-02-01T00:00:00.000Z' });
    const d = build({ computations: [gone] });

    expect(d.calculations).toEqual([]);
    expect(d.gaps.join(' ')).toContain('No calculation has been noted');
  });
});

describe('the printed page', () => {
  it('carries the holding, its standing and its identifiers', () => {
    const page = renderDossier(build({ matters: [matter()], rules: [rule()] }));

    expect(page).toContain('Mixed pool');
    expect(page).toContain('0xabc');
    expect(page).toContain('arbitrum-sepolia');
    expect(page).toContain('Where it stands');
  });

  it('says on its face that nothing on it is a finding of this system', () => {
    const page = renderDossier(build());
    expect(page).toContain('Nothing on this page is a finding of this system');
  });

  it('puts what it cannot say inside the page rather than in a footnote', () => {
    const page = renderDossier(build());
    expect(page).toContain('What this page cannot say');
    expect(page).toContain('reads as an absence of');
  });

  it('says a calculation was noted rather than approved', () => {
    const page = renderDossier(build({ computations: [computation()] }));
    expect(page).toContain('not approval of the method used');
  });

  it('shows a retirement with its reason where there is one', () => {
    const retired = asset({
      retiredAt: '2026-08-01T00:00:00.000Z',
      retiredReason: 'The issuer wound up the pool.',
    });
    const page = renderDossier(build({ asset: retired }));

    expect(page).toContain('Retired');
    expect(page).toContain('wound up the pool');
  });

  it('escapes what a holding is called, because a name is somebody else’s text', () => {
    const hostile = asset({ name: 'Pool <script>alert(1)</script>' });
    const page = renderDossier(build({ asset: hostile }));

    expect(page).not.toContain('<script>alert(1)</script>');
    expect(page).toContain('&lt;script&gt;');
  });

  it('reaches no verdict anywhere', () => {
    const page = renderDossier(build({ matters: [matter()], rules: [rule()] })).toLowerCase();
    for (const claim of ['halal', 'haram', 'is compliant', 'we are satisfied', 'complies with']) {
      expect(page).not.toContain(claim);
    }
  });
});
