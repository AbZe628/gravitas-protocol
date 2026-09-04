import { describe, it, expect } from 'vitest';
import { Refused } from '../src/services/lifecycle.js';
import {
  AS_ADOPTED,
  AS_DECLINED,
  AS_SHIPPED,
  adopt,
  effectiveFor,
  historyFor,
  isReplaced,
  libraryFor,
  standingAdoptions,
  type AdoptInput,
} from '../src/services/adoption.js';
import { checklistFor } from '../src/services/structure.js';
import { structureById, structures } from '../src/data/structures.js';
import type { AdoptedStructure, Matter, Rule, StructureCondition } from '../src/types.js';

const T0 = '2026-09-04T09:00:00.000Z';

const rule: Rule = {
  id: 'r', boardId: 'b', title: '', statement: '', parameters: [],
  parameterHash: '0x0', version: 1, inForceFrom: null,
  supersededBy: null, supersedes: null, sources: [],
};

function matter(over: Partial<Matter> = {}): Matter {
  return {
    id: 'm-carried', boardId: 'b', title: 'Whether to take the murabaha conditions as our own',
    origin: 'protocol_change', direction: 'permit', status: 'in_force', openedAt: T0,
    proposal: '', notDecided: [], mechanism: '', interactsWith: [],
    proposedRule: rule, simulation: null, deliberation: [], reasoning: [],
    timelockStartedAt: null, timelockEndsAt: null, objections: [],
    inForceAt: T0, sources: [],
    ...over,
  };
}

const matters = [matter()];

const input: AdoptInput = {
  structureId: 'murabaha',
  boardId: 'b',
  standing: 'adopted',
  matterId: 'm-carried',
};

const take = (over: Partial<AdoptInput> = {}, existing: AdoptedStructure[] = [], ms = matters) =>
  adopt({ ...input, ...over }, ms, existing, 's1', T0);

const code = (fn: () => unknown): string | null => {
  try { fn(); return null; } catch (e) { return e instanceof Refused ? e.code : `threw ${String(e)}`; }
};

const condition = (over: Partial<StructureCondition> = {}): StructureCondition => ({
  id: 'ownership-before-sale',
  requirement: 'The institution owns the asset before selling it on, and the sequence shows it.',
  why: 'Selling what one does not own turns the sale into a financing of money by money.',
  evidence: 'sequence',
  authority: 'This board, under m-carried',
  ...over,
});

describe('a shape is taken under a decision, not by a switch', () => {
  it('records the matter it was decided in, and who signed it', () => {
    const a = take();
    expect(a.matterId).toBe('m-carried');
    expect(a.decidedBy).toBe('s1');
    expect(a.standing).toBe('adopted');
  });

  it('refuses without a matter, because that is what makes it a decision', () => {
    expect(code(() => take({ matterId: 'nothing-like-this' }))).toBe('no_matter');
    try {
      take({ matterId: 'nothing-like-this' });
      expect.unreachable();
    } catch (e) {
      expect((e as Refused).message).toContain('a switch rather than a decision');
    }
  });

  it('refuses a matter the board is still arguing about', () => {
    const open = [matter({ id: 'm-open', status: 'deliberation' })];
    expect(code(() => take({ matterId: 'm-open' }, [], open))).toBe('matter_not_settled');
  });

  it('refuses a matter that was rejected, because that decision did not carry', () => {
    const refused = [matter({ id: 'm-no', status: 'rejected' })];
    expect(code(() => take({ matterId: 'm-no' }, [], refused))).toBe('matter_not_settled');
  });

  it('refuses another board’s decision', () => {
    const theirs = [matter({ id: 'm-theirs', boardId: 'other' })];
    expect(code(() => take({ matterId: 'm-theirs' }, [], theirs))).toBe('not_this_board');
  });

  it('refuses a shape that is not in the library', () => {
    expect(code(() => take({ structureId: 'something-invented' }))).toBe('not_in_library');
  });
});

describe('the conditions are copied, not referenced', () => {
  it('takes the library’s conditions as they read at the time', () => {
    const a = take();
    expect(a.conditions).toEqual(structureById('murabaha')?.conditions);
  });

  it('does not move when the shipped library is changed afterwards', () => {
    const a = take();
    const shipped = structureById('murabaha')!;

    // What a later revision of the library would look like.
    const revised = { ...shipped, conditions: [condition({ id: 'something-new' })] };
    // The board's copy is unaffected, because it is a copy.
    expect(a.conditions).not.toEqual(revised.conditions);
    expect(a.conditions.length).toBe(shipped.conditions.length);
  });

  it('holds its own array, so editing the library cannot reach into it', () => {
    const a = take();
    a.conditions[0].requirement = 'tampered';
    expect(structureById('murabaha')?.conditions[0].requirement).not.toBe('tampered');
  });
});

describe('amending, which is the point of adopting at all', () => {
  const amended = {
    standing: 'amended' as const,
    amendments: ['Condition on possession reworded: constructive possession must be evidenced.'],
    conditions: [condition()],
  };

  it('takes the board’s conditions rather than the library’s', () => {
    const a = take(amended);
    expect(a.standing).toBe('amended');
    expect(a.conditions).toHaveLength(1);
    expect(a.amendments[0]).toContain('constructive possession');
  });

  it('refuses an amendment that does not say what changed', () => {
    expect(code(() => take({ ...amended, amendments: [] }))).toBe('no_reason_given');
    expect(code(() => take({ ...amended, amendments: ['   '] }))).toBe('no_reason_given');
  });

  it('refuses an amended shape with no conditions, which would read as nothing to ask', () => {
    expect(code(() => take({ ...amended, conditions: [] }))).toBe('no_conditions');
  });

  it('refuses a condition with no reason, because the board is the authority now', () => {
    const thin = take.bind(null, { ...amended, conditions: [condition({ why: 'because' })] });
    expect(code(thin)).toBe('no_reason_given');
  });
});

describe('declining is a decision too, and needs its reasons', () => {
  it('records the decline with no conditions', () => {
    const a = take({ standing: 'declined', amendments: ['This board does not use tawarruq.'] });
    expect(a.standing).toBe('declined');
    expect(a.conditions).toEqual([]);
  });

  it('refuses a decline with no reason', () => {
    expect(code(() => take({ standing: 'declined' }))).toBe('no_reason_given');
  });
});

describe('an amendment supersedes, and never edits', () => {
  it('names the one it replaces, which stays', () => {
    const first = take();
    const second = take(
      {
        standing: 'amended',
        amendments: ['Possession must now be evidenced by a warehouse receipt.'],
        conditions: [condition()],
        supersedes: first.id,
      },
      [first],
    );

    expect(second.supersedes).toBe(first.id);
    expect(isReplaced(first, [first, second])).toBe(true);
    expect(standingAdoptions([first, second]).map((a) => a.id)).toEqual([second.id]);
    // The first still holds what the board was working from.
    expect(first.conditions.length).toBeGreaterThan(1);
  });

  it('refuses to replace the same one twice', () => {
    const first = take();
    const second = take({ supersedes: first.id }, [first]);
    expect(code(() => take({ supersedes: first.id }, [first, second]))).toBe('already_replaced');
  });

  it('refuses to replace an adoption of a different shape', () => {
    const ijara = take({ structureId: 'ijara' });
    expect(code(() => take({ supersedes: ijara.id }, [ijara]))).toBe('no_such_prior');
  });

  it('refuses to replace something that is not there', () => {
    expect(code(() => take({ supersedes: 'nothing-like-this' }))).toBe('no_such_prior');
  });
});

describe('which version a matter is judged by, and saying so', () => {
  it('is the shipped draft where the board has adopted nothing', () => {
    const e = effectiveFor('murabaha', 'b', [])!;
    expect(e.source).toBe('draft');
    expect(e.adoption).toBeNull();
    expect(e.note).toBe(AS_SHIPPED);
    expect(e.note).toContain('has not adopted this shape');
  });

  it('is the board’s own version once adopted', () => {
    const a = take();
    const e = effectiveFor('murabaha', 'b', [a])!;
    expect(e.source).toBe('adopted');
    expect(e.note).toBe(AS_ADOPTED);
  });

  it('carries the amended conditions, not the shipped ones', () => {
    const a = take({
      standing: 'amended',
      amendments: ['Reduced to one condition, which this board considers the operative one.'],
      conditions: [condition()],
    });
    const e = effectiveFor('murabaha', 'b', [a])!;

    expect(e.source).toBe('amended');
    expect(e.structure.conditions).toHaveLength(1);
  });

  it('says a shape was declined, and still shows it', () => {
    const a = take({ standing: 'declined', amendments: ['Not used by this institution.'] });
    const e = effectiveFor('murabaha', 'b', [a])!;

    expect(e.declined).toBe(true);
    expect(e.note).toBe(AS_DECLINED);
    // Shown rather than blanked: a board judging a matter against a shape it
    // declined should see both facts at once.
    expect(e.structure.conditions.length).toBeGreaterThan(0);
  });

  it('keeps one board’s adoption out of another’s', () => {
    const mine = take();
    expect(effectiveFor('murabaha', 'other-board', [mine])?.source).toBe('draft');
  });

  it('says nothing about a shape that is not in the library', () => {
    expect(effectiveFor('something-invented', 'b', [])).toBeNull();
  });
});

describe('the checklist runs against the board’s version', () => {
  const judged = matter({ id: 'm-judged', structureId: 'murabaha', status: 'deliberation' });

  it('says the conditions are the shipped draft when nothing was adopted', () => {
    const c = checklistFor(judged, 's1', []);
    expect(c.source).toBe('draft');
    expect(c.declined).toBe(false);
    expect(c.sourceNote).toContain('has not adopted this shape');
  });

  it('counts against the amended conditions once the board has its own', () => {
    const a = take({
      standing: 'amended',
      amendments: ['This board holds one condition to be the operative one.'],
      conditions: [condition()],
    });

    const c = checklistFor(judged, 's1', [a]);
    expect(c.source).toBe('amended');
    expect(c.total).toBe(1);
    // Against the shipped draft it would have been the full list.
    expect(checklistFor(judged, 's1', []).total).toBeGreaterThan(1);
  });

  it('warns on the checklist itself where the board declined the shape', () => {
    const a = take({ standing: 'declined', amendments: ['Not used by this institution.'] });
    const c = checklistFor(judged, 's1', [a]);

    expect(c.declined).toBe(true);
    expect(c.sourceNote).toContain('already declined');
  });

  it('still says the board’s findings are the record, whichever version it used', () => {
    expect(checklistFor(judged, 's1', []).note).toContain('the board’s to decide');
  });
});

describe('the library as one board holds it', () => {
  it('reports every shape, adopted or not', () => {
    const held = libraryFor('b', [take()], structures);
    expect(held).toHaveLength(structures.length);
    expect(held.filter((e) => e.source !== 'draft')).toHaveLength(1);
  });

  it('keeps the history of one shape, oldest first, with what replaced what', () => {
    const first = take();
    const second = take(
      {
        standing: 'amended',
        amendments: ['Reworded after the first year of use.'],
        conditions: [condition()],
        supersedes: first.id,
      },
      [first],
    );

    const h = historyFor('murabaha', 'b', [second, first]);
    expect(h.map((x) => x.adoption.id)).toEqual([first.id, second.id]);
    expect(h[0].replacedBy).toBe(second.id);
    expect(h[1].replacedBy).toBeNull();
  });
});

describe('ordering follows the chain, not the clock', () => {
  // Every adoption in this file carries the same timestamp, which is the point:
  // two recorded in the same second cannot be told apart by time, and the
  // board's current version must not depend on what order the store returns.
  const first = take();
  const second = take({ supersedes: first.id }, [first]);
  const third = take({ supersedes: second.id }, [first, second]);

  it('finds the current version whatever order they arrive in', () => {
    for (const order of [
      [first, second, third],
      [third, second, first],
      [second, third, first],
    ]) {
      expect(effectiveFor('murabaha', 'b', order)?.adoption?.id).toBe(third.id);
    }
  });

  it('reads the history forwards whatever order they arrive in', () => {
    const ids = (all: AdoptedStructure[]) => historyFor('murabaha', 'b', all).map((h) => h.adoption.id);
    expect(ids([third, first, second])).toEqual([first.id, second.id, third.id]);
    expect(ids([second, third, first])).toEqual([first.id, second.id, third.id]);
  });

  it('still lists an adoption whose predecessor is missing from the set', () => {
    // A record that dropped one rather than showing a gap would be worse than
    // one that is out of order.
    const orphan = historyFor('murabaha', 'b', [second, third]).map((h) => h.adoption.id);
    expect(orphan).toContain(second.id);
    expect(orphan).toContain(third.id);
  });
});

describe('what adoption refuses to claim', () => {
  it('reaches no verdict in anything it produces', () => {
    const text = JSON.stringify([take(), AS_SHIPPED, AS_ADOPTED, AS_DECLINED]).toLowerCase();
    for (const claim of ['halal', 'haram', 'is compliant', 'therefore permitted']) {
      expect(text).not.toContain(claim);
    }
  });

  it('says the shipped draft binds nobody, in the words that travel with it', () => {
    expect(AS_SHIPPED).toContain('binding');
  });
});
