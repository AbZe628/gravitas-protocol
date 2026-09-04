import { describe, it, expect } from 'vitest';
import type { Board, Matter, Rule } from '../src/types.js';
import { Refused } from '../src/services/lifecycle.js';
import { checklistFor, recordFinding, setStructure } from '../src/services/structure.js';
import { structureById, structures } from '../src/data/structures.js';
import { matters as seedMatters } from '../src/data/seed.js';

const T0 = '2026-09-04T09:00:00.000Z';
const later = (h: number) => new Date(new Date(T0).getTime() + h * 3_600_000).toISOString();

const board: Board = {
  id: 'b', institutionId: 'inst', name: 'Board',
  quorumPermit: 3, quorumRestrict: 2, totalSignatories: 3, ratificationWindowHours: 168,
  members: [
    { id: 's1', name: 'One', title: '', board: 'b', signatory: true },
    { id: 's2', name: 'Two', title: '', board: 'b', signatory: true },
    { id: 'adv', name: 'Advisor', title: '', board: 'b', signatory: false },
  ],
};

const rule: Rule = {
  id: 'r', boardId: 'b', title: '', statement: '', parameters: [],
  parameterHash: '0x0', version: 1, inForceFrom: null,
  supersededBy: null, supersedes: null, sources: [],
};

function matter(over: Partial<Matter> = {}): Matter {
  return {
    id: 'm1', boardId: 'b', title: 'Commodity murabaha for retail deposits',
    origin: 'institution_request', direction: 'permit', status: 'deliberation', openedAt: T0,
    proposal: '', notDecided: [], mechanism: '', interactsWith: [],
    structureId: 'murabaha',
    proposedRule: rule, simulation: null, deliberation: [], reasoning: [],
    timelockStartedAt: null, timelockEndsAt: null, objections: [],
    inForceAt: null, sources: [],
    ...over,
  };
}

const REASON = 'The sale documentation shows the bank on title before the onward sale.';
const code = (fn: () => unknown): string | null => {
  try { fn(); return null; } catch (e) { return e instanceof Refused ? e.code : `threw ${String(e)}`; }
};

describe('the library is a prompt, not an authority', () => {
  it('names where every condition comes from', () => {
    for (const s of structures) {
      expect(s.authority.length).toBeGreaterThan(3);
      for (const c of s.conditions) expect(c.authority.length).toBeGreaterThan(3);
    }
  });

  it('gives every condition a reason a scholar can disagree with', () => {
    for (const s of structures) {
      for (const c of s.conditions) {
        expect(c.why.length).toBeGreaterThan(40);
        // The reason explains the mechanism, not the citation.
        expect(c.why).not.toMatch(/^AAOIFI/);
      }
    }
  });

  it('states no verdict about anything, anywhere', () => {
    const text = JSON.stringify(structures).toLowerCase();
    for (const word of ['halal', 'haram', 'is compliant', 'we approve', 'therefore permitted']) {
      expect(text).not.toContain(word);
    }
  });

  it('keeps the operative text free of the vocabulary of a ruling', () => {
    // A reason may reason conditionally — 'where the use is unlawful' explains a
    // mechanism. A requirement may not, because it is the line a board rules on.
    for (const s of structures) {
      for (const c of s.conditions) {
        const req = c.requirement.toLowerCase();
        for (const word of ['permissible', 'impermissible', 'halal', 'haram']) {
          expect(req).not.toContain(word);
        }
      }
    }
  });

  it('links a shape to the calculations it attracts', () => {
    expect(structureById('mudaraba')?.calculations).toContain('profit_distribution');
    expect(structureById('murabaha')?.calculations).toContain('late_payment');
    // A traded pool is where the tangibility question actually lives.
    expect(structureById('sukuk')?.calculations).toContain('tangibility');
  });
});

/**
 * With three shapes the library could be read; with nineteen it has to be
 * checked. These are the invariants that keep it usable rather than long.
 */
describe('the library holds together as a whole', () => {
  it('gives every shape a distinct id, so a matter can name one without ambiguity', () => {
    const ids = structures.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every condition within a shape a distinct id, so a finding lands on one', () => {
    for (const s of structures) {
      const ids = s.conditions.map((c) => c.id);
      expect(new Set(ids).size, `${s.id} has a repeated condition id`).toBe(ids.length);
    }
  });

  it('asks for at least three conditions, because a shape with one is a heading', () => {
    for (const s of structures) {
      expect(s.conditions.length, `${s.id}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('names only calculations that exist, so a link cannot go nowhere', () => {
    const known = [
      'screening',
      'purification',
      'zakat',
      'profit_distribution',
      'tangibility',
      'late_payment',
    ];
    for (const s of structures) {
      for (const k of s.calculations) expect(known, `${s.id}`).toContain(k);
    }
  });

  it('records how each condition is shown, so a board knows what to ask for', () => {
    const kinds = ['document', 'sequence', 'figure', 'undertaking'];
    for (const s of structures) {
      for (const c of s.conditions) expect(kinds, `${s.id}/${c.id}`).toContain(c.evidence);
    }
  });

  it('covers the families a bank actually uses', () => {
    const families = new Set(structures.map((s) => s.family));
    for (const f of [
      'sale',
      'lease',
      'partnership',
      'agency',
      'security',
      'exchange',
      'support',
      'protection',
      'combination',
    ]) {
      expect(families, `no shape in the ${f} family`).toContain(f);
    }
  });

  it('carries the shapes the toolkit says it covers', () => {
    for (const id of [
      'murabaha',
      'musawama',
      'salam',
      'istisna',
      'ijara',
      'ijara-mbt',
      'mudaraba',
      'musharaka',
      'diminishing-musharaka',
      'wakala-investment',
      'sukuk',
      'sarf',
      'kafala',
      'rahn',
      'hawala',
      'wad',
      'qard-hasan',
      'takaful',
      'combining-contracts',
    ]) {
      expect(structureById(id), `${id} is named in TOOLKIT.md and is not here`).toBeTruthy();
    }
  });

  it('keeps combining contracts as a shape rather than a footnote on the others', () => {
    // It is where most arrangements actually fail, and a board has to be able
    // to judge the whole rather than only the parts.
    const combining = structureById('combining-contracts');
    expect(combining?.family).toBe('combination');
    expect(combining?.conditions.map((c) => c.id)).toContain('not-a-route-to-what-is-otherwise-refused');
    expect(combining?.conditions.map((c) => c.id)).toContain('each-contract-valid-on-its-own');
  });

  it('never says a shape is settled, only where its conditions are drawn from', () => {
    const text = JSON.stringify(structures).toLowerCase();
    for (const claim of [
      'is approved',
      'the board must find',
      'this is required by shariah',
      'settled law',
    ]) {
      expect(text).not.toContain(claim);
    }
  });
});

describe('the checklist counts and does not conclude', () => {
  it('lists every condition as unanswered before anybody rules', () => {
    const c = checklistFor(matter());
    expect(c.total).toBe(6);
    expect(c.answered).toBe(0);
    expect(c.unanswered).toHaveLength(6);
  });

  it('carries the sentence saying it is not a conclusion', () => {
    expect(checklistFor(matter()).note).toContain('the board’s to decide');
    expect(checklistFor(matter()).note).toContain('rule against a condition');
  });

  it('refuses a matter judged against nothing rather than showing an empty list', () => {
    expect(code(() => checklistFor(matter({ structureId: undefined })))).toBe('not_found');
    expect(code(() => checklistFor(matter({ structureId: 'nonesuch' })))).toBe('not_found');
  });

  it('counts a condition as answered once anyone has answered it', () => {
    const m = recordFinding(board, matter(), {
      scholarId: 's1', conditionId: 'cost-disclosed', holds: 'met', reason: REASON,
    }, T0);

    const c = checklistFor(m);
    expect(c.answered).toBe(1);
    expect(c.unanswered).not.toContain('cost-disclosed');
    expect(c.conditions.find((x) => x.condition.id === 'cost-disclosed')?.answeredBy).toEqual(['s1']);
  });

  it('shows this member their own standing finding when asked', () => {
    const m = recordFinding(board, matter(), {
      scholarId: 's1', conditionId: 'cost-disclosed', holds: 'not_met', reason: REASON,
    }, T0);

    expect(checklistFor(m, 's1').conditions[1].finding?.holds).toBe('not_met');
    expect(checklistFor(m, 's2').conditions[1].finding).toBeNull();
  });

  it('reports disagreement rather than resolving it', () => {
    let m = matter();
    m = recordFinding(board, m, { scholarId: 's1', conditionId: 'asset-identified', holds: 'met', reason: REASON }, T0);
    m = recordFinding(board, m, { scholarId: 's2', conditionId: 'asset-identified', holds: 'not_met', reason: REASON }, T0);

    const c = checklistFor(m);
    expect(c.contested).toEqual(['asset-identified']);
    // Both positions stay; nothing is decided by the count.
    expect(c.conditions.find((x) => x.condition.id === 'asset-identified')?.answeredBy).toHaveLength(2);
  });
});

describe('a finding is a position, so it needs a reason', () => {
  it('refuses a tick', () => {
    for (const holds of ['met', 'not_met', 'not_applicable'] as const) {
      expect(
        code(() => recordFinding(board, matter(), { scholarId: 's1', conditionId: 'cost-disclosed', holds, reason: 'yes' }, T0)),
      ).toBe('no_reason_given');
    }
  });

  it('treats "does not apply" as a real answer, with its own reasoning', () => {
    const m = recordFinding(board, matter(), {
      scholarId: 's1',
      conditionId: 'tawarruq-real-commodity',
      holds: 'not_applicable',
      reason: 'This product is a direct murabaha on an identified asset, not a tawarruq.',
    }, T0);

    const found = checklistFor(m, 's1').conditions.find((c) => c.condition.id === 'tawarruq-real-commodity');
    expect(found?.finding?.holds).toBe('not_applicable');
    expect(checklistFor(m).unanswered).not.toContain('tawarruq-real-commodity');
  });

  it('refuses a condition that is not part of this shape', () => {
    expect(
      code(() => recordFinding(board, matter(), { scholarId: 's1', conditionId: 'lessor-maintains-and-insures', holds: 'met', reason: REASON }, T0)),
    ).toBe('not_found');
  });

  it('refuses somebody who does not sit on the board', () => {
    expect(
      code(() => recordFinding(board, matter(), { scholarId: 'stranger', conditionId: 'cost-disclosed', holds: 'met', reason: REASON }, T0)),
    ).toBe('not_on_this_board');
  });

  it('lets an advisory member record one, because deliberating is not voting', () => {
    const m = recordFinding(board, matter(), { scholarId: 'adv', conditionId: 'cost-disclosed', holds: 'met', reason: REASON }, T0);
    expect(checklistFor(m).answered).toBe(1);
  });
});

describe('a change of view is superseded, never overwritten', () => {
  it('keeps both, and counts only the later one', () => {
    let m = matter();
    m = recordFinding(board, m, { scholarId: 's1', conditionId: 'cost-disclosed', holds: 'met', reason: REASON }, T0);
    m = recordFinding(board, m, {
      scholarId: 's1', conditionId: 'cost-disclosed', holds: 'not_met',
      reason: 'On re-reading the schedule the mark-up is stated as a rate rather than an amount.',
    }, later(2));

    expect(m.findings).toHaveLength(2);
    expect(m.findings?.[0].supersededAt).toBe(later(2));

    const c = checklistFor(m, 's1');
    const found = c.conditions.find((x) => x.condition.id === 'cost-disclosed');
    expect(found?.finding?.holds).toBe('not_met');
    expect(found?.answeredBy).toEqual(['s1']);
    // The whole history is available, newest first.
    expect(found?.history).toHaveLength(2);
    expect(found?.history[0].holds).toBe('not_met');
  });
});

describe('the checklist closes when the decision does', () => {
  it('refuses a finding once the matter is settled', () => {
    for (const status of ['timelock', 'in_force', 'rejected', 'withdrawn', 'lapsed'] as const) {
      const refusal = code(() =>
        recordFinding(board, matter({ status }), { scholarId: 's1', conditionId: 'cost-disclosed', holds: 'met', reason: REASON }, T0),
      );
      expect(refusal).toBe('wrong_status');
    }
  });

  it('says why, in terms of what would go wrong', () => {
    try {
      recordFinding(board, matter({ status: 'in_force' }), { scholarId: 's1', conditionId: 'cost-disclosed', holds: 'met', reason: REASON }, T0);
      expect.unreachable();
    } catch (e) {
      expect((e as Refused).message).toContain('the board never saw');
    }
  });
});

describe('changing the shape keeps what was already reasoned', () => {
  it('leaves findings from the old shape in the record', () => {
    let m = recordFinding(board, matter(), { scholarId: 's1', conditionId: 'cost-disclosed', holds: 'met', reason: REASON }, T0);
    m = setStructure(m, 'ijara-mbt');

    expect(m.structureId).toBe('ijara-mbt');
    expect(m.findings).toHaveLength(1);
    // They simply stop appearing on the checklist for the new shape.
    expect(checklistFor(m).unanswered).toHaveLength(6);
  });

  it('refuses a shape that is not in the library', () => {
    expect(code(() => setStructure(matter(), 'nonesuch'))).toBe('not_found');
  });

  it('refuses to change it once the vote has closed', () => {
    expect(code(() => setStructure(matter({ status: 'in_force' }), 'mudaraba'))).toBe('wrong_status');
  });

  it('allows a matter to have no shape at all', () => {
    expect(setStructure(matter(), null).structureId).toBeUndefined();
  });
});

/**
 * The demonstration record has to be able to show this.
 *
 * The register seeds seven holdings so a board opening Majlis for the first
 * time sees a domain rather than an empty page. The same reasoning applies to
 * the checklist: a matter judged against nothing shows nothing, and the
 * feature is then invisible to anyone who has not been shown where to click.
 */
describe('the seeded record can show a checklist', () => {
  it('judges at least one matter still in deliberation against a shape', () => {
    const judged = seedMatters.filter((m) => m.structureId && m.status === 'deliberation');
    expect(judged.length, 'no seeded matter is judged against a contract shape').toBeGreaterThan(0);
  });

  it('names a shape that is actually in the library', () => {
    for (const m of seedMatters.filter((m) => m.structureId)) {
      expect(structureById(m.structureId as string), `${m.id} names ${m.structureId}`).toBeTruthy();
    }
  });

  it('seeds no findings against it, because a board that never met has said nothing', () => {
    for (const m of seedMatters.filter((m) => m.structureId)) {
      expect(m.findings ?? []).toEqual([]);
    }
  });

  it('produces a checklist with every condition unanswered', () => {
    const judged = seedMatters.find((m) => m.structureId && m.status === 'deliberation')!;
    const c = checklistFor(judged);

    expect(c.total).toBeGreaterThan(0);
    expect(c.answered).toBe(0);
    expect(c.unanswered).toHaveLength(c.total);
    // And it says the conditions are the shipped draft, because no board in the
    // seed has adopted anything.
    expect(c.source).toBe('draft');
  });
});
