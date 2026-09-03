import { describe, it, expect } from 'vitest';
import type { Board, Matter, Rule } from '../src/types.js';
import { Refused } from '../src/services/lifecycle.js';
import { checklistFor, recordFinding, setStructure } from '../src/services/structure.js';
import { structureById, structures } from '../src/data/structures.js';

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
