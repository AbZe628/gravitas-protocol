import { describe, it, expect } from 'vitest';
import type { AdoptedStructure, Asset, Board, Computation, Incident, Institution, Matter, Meeting, Rule } from '../src/types.js';
import { MemoryStore } from '../src/store/memory.js';
import { TenantStore, OutsideInstitution } from '../src/store/tenant.js';
import { NotFound } from '../src/store/store.js';

/**
 * No bank shares a database with another bank.
 *
 * These are the tests that make that sentence true. Isolation is enforced at
 * the store boundary rather than in the routes — thirty-two routes would be
 * thirty-two chances to forget, and forgetting once means one institution's
 * deliberation reaching another.
 */

const T0 = '2026-09-02T09:00:00.000Z';

const institutions: Institution[] = [
  { id: 'alpha-bank', name: 'Alpha Bank' },
  { id: 'beta-bank', name: 'Beta Bank' },
];

const boards: Board[] = [
  { id: 'alpha-board', institutionId: 'alpha-bank', name: 'Alpha', quorumPermit: 3, quorumRestrict: 2, totalSignatories: 5, ratificationWindowHours: 168, members: [] },
  { id: 'beta-board', institutionId: 'beta-bank', name: 'Beta', quorumPermit: 3, quorumRestrict: 2, totalSignatories: 5, ratificationWindowHours: 168, members: [] },
];

function rule(id: string, boardId: string): Rule {
  return {
    id, boardId, title: '', statement: '', parameters: [], parameterHash: '',
    version: 1, inForceFrom: null, supersededBy: null, supersedes: null, sources: [],
  };
}

function matter(id: string, boardId: string, title: string): Matter {
  return {
    id, boardId, title, origin: 'protocol_change', direction: 'permit',
    status: 'deliberation', openedAt: T0, proposal: '', notDecided: [],
    mechanism: '', interactsWith: [], proposedRule: rule('r-' + id, boardId),
    simulation: null, deliberation: [], reasoning: [],
    timelockStartedAt: null, timelockEndsAt: null, objections: [],
    inForceAt: null, sources: [],
  };
}

function computation(id: string, boardId: string): Computation {
  return {
    id, kind: 'zakat', boardId, assetId: null,
    periodFrom: '2026-01-01', periodTo: '2026-12-31',
    method: 'net_assets', methodStated: '', currency: 'AED',
    source: 'Audited financial statements',
    figures: { cash: '4000000' },
    headline: 'Due', amount: '200000',
    steps: [{ label: 'At 2.5%', working: '2.5% of 8000000', value: '200000 AED' }],
    note: '', recordedBy: 'someone', recordedAt: T0,
    supersedes: null, withdrawnAt: null, withdrawnBy: null, withdrawalReason: null,
  };
}

function adoption(id: string, boardId: string): AdoptedStructure {
  return {
    id, boardId, structureId: 'murabaha', standing: 'amended',
    conditions: [{
      id: 'ownership-before-sale',
      requirement: 'The institution owns the asset before selling it on.',
      why: 'Selling what one does not own turns the sale into a financing of money by money.',
      evidence: 'sequence', authority: 'This board',
    }],
    amendments: ['Reworded for this institution’s own products.'],
    matterId: 'alpha-matter', decidedBy: 'someone', decidedAt: T0, supersedes: null,
  };
}

function meeting(id: string, boardId: string): Meeting {
  return {
    id, boardId, at: T0, joinUrl: null,
    agenda: [{ item: 'What this board is looking at' }],
    attendance: [], minute: '', recordedBy: 'someone', closedAt: null,
  };
}

const both = () =>
  new MemoryStore({
    institutions,
    boards,
    rules: [rule('alpha-rule', 'alpha-board'), rule('beta-rule', 'beta-board')],
    matters: [
      matter('alpha-matter', 'alpha-board', 'Something Alpha is deciding'),
      matter('beta-matter', 'beta-board', 'Something Beta is deciding'),
    ],
    incidents: [
      incident('alpha-incident', 'alpha-board', 'Something Alpha stopped'),
      incident('beta-incident', 'beta-board', 'Something Beta stopped'),
    ],
    assets: [asset('alpha-asset', 'alpha-bank'), asset('beta-asset', 'beta-bank')],
    computations: [
      computation('alpha-zakat', 'alpha-board'),
      computation('beta-zakat', 'beta-board'),
    ],
    adoptions: [adoption('alpha-adoption', 'alpha-board'), adoption('beta-adoption', 'beta-board')],
    meetings: [meeting('alpha-meeting', 'alpha-board'), meeting('beta-meeting', 'beta-board')],
    briefings: [],
  });

function incident(id: string, boardId: string, title: string): Incident {
  return {
    id, boardId, reference: id.toUpperCase(), title,
    report: 'An account of what happened.', reportedBy: 'someone', reportedAt: T0,
    stage: 'reported', concurrences: [], determinedAt: null, actual: null,
    stopped: [], plans: [], directorsApprovedAt: null,
    submittedToRegulatorAt: null, purification: null, closedAt: null, sources: [],
  };
}

function asset(id: string, institutionId: string): Asset {
  return {
    id, institutionId, kind: 'token', name: id,
    identifiers: [{ scheme: 'internal', value: id }],
    source: 'institution', addedAt: T0, addedBy: null,
    composition: null, retiredAt: null, retiredReason: null,
  };
}

const alpha = () => new TenantStore(both(), 'alpha-bank');
const beta = () => new TenantStore(both(), 'beta-bank');

// ── reading ───────────────────────────────────────────────────────────────

describe('a scoped store sees one institution and nothing else', () => {
  it('sees only its own institution', async () => {
    expect((await alpha().institutions()).map((i) => i.id)).toEqual(['alpha-bank']);
    expect(await alpha().institution('beta-bank')).toBeNull();
  });

  it('sees only its own boards', async () => {
    expect((await alpha().boards()).map((b) => b.id)).toEqual(['alpha-board']);
  });

  it('sees only its own matters and rules', async () => {
    expect((await alpha().matters()).map((m) => m.id)).toEqual(['alpha-matter']);
    expect((await alpha().rules()).map((r) => r.id)).toEqual(['alpha-rule']);
  });

  /*
   * Absence, not refusal. A store that answered "you may not see that" would
   * confirm the thing exists, and an outsider could map another institution's
   * record by probing for refusals rather than for data.
   */
  it('answers for another institution exactly as it answers for nothing', async () => {
    const s = alpha();

    expect(await s.board('beta-board')).toBeNull();
    expect(await s.board('no-such-board')).toBeNull();

    expect(await s.matter('beta-matter')).toBeNull();
    expect(await s.matter('no-such-matter')).toBeNull();

    expect(await s.rule('beta-rule')).toBeNull();
    expect(await s.rule('no-such-rule')).toBeNull();
  });

  it('asking for another institution’s board reads as an empty board', async () => {
    expect(await alpha().matters('beta-board')).toEqual([]);
    expect(await alpha().rules('beta-board')).toEqual([]);
  });
});

// ── writing ───────────────────────────────────────────────────────────────

describe('a write aimed outside the institution is refused loudly', () => {
  /*
   * A read that finds nothing is ordinary. A write aimed elsewhere is a fault
   * in the caller, and dropping it silently would leave them believing it
   * happened.
   */
  it('refuses to create a matter on another institution’s board', async () => {
    await expect(
      alpha().createMatter(matter('sneaky', 'beta-board', 'Written into Beta')),
    ).rejects.toBeInstanceOf(OutsideInstitution);
  });

  it('creates freely on its own', async () => {
    const s = alpha();
    await s.createMatter(matter('mine', 'alpha-board', 'Ordinary'));
    expect((await s.matters()).map((m) => m.id)).toContain('mine');
  });

  /* Indistinguishable from a matter that does not exist, deliberately. */
  it('cannot update another institution’s matter', async () => {
    await expect(
      alpha().updateMatter('beta-matter', (m) => ({ ...m, title: 'Rewritten' })),
    ).rejects.toBeInstanceOf(NotFound);
  });

  it('leaves the other institution untouched when it refuses', async () => {
    const inner = both();
    const s = new TenantStore(inner, 'alpha-bank');

    await expect(s.updateMatter('beta-matter', (m) => ({ ...m, title: 'Rewritten' }))).rejects.toThrow();

    const beta = await inner.matter('beta-matter');
    expect(beta?.title).toBe('Something Beta is deciding');
  });

  it('refuses a change that would move a matter to another institution', async () => {
    const s = alpha();
    await expect(
      s.updateMatter('alpha-matter', (m) => ({ ...m, boardId: 'beta-board' })),
    ).rejects.toBeInstanceOf(OutsideInstitution);
  });
});

// ── the assistant log ─────────────────────────────────────────────────────

/*
 * An exchange carries a member's question, which is deliberation-adjacent and
 * among the most sensitive text this record holds. Before this it carried no
 * institution at all, so it could not be scoped.
 */
describe('a recorded calculation carries figures, so it is scoped like everything else', () => {
  it('sees only its own', async () => {
    expect((await alpha().computations()).map((c) => c.id)).toEqual(['alpha-zakat']);
    expect((await beta().computations()).map((c) => c.id)).toEqual(['beta-zakat']);
  });

  it('answers absence rather than refusal for another institution’s', async () => {
    // Refusing would confirm it exists, and a balance sheet is worth probing for.
    expect(await alpha().computation('beta-zakat')).toBeNull();
    expect(await alpha().computations({ boardId: 'beta-board' })).toEqual([]);
  });

  it('refuses loudly to record one for another institution’s board', async () => {
    await expect(
      alpha().recordComputation(computation('new-one', 'beta-board')),
    ).rejects.toBeInstanceOf(OutsideInstitution);
  });

  it('cannot withdraw another institution’s, and cannot tell it apart from absence', async () => {
    await expect(
      alpha().withdrawComputation('beta-zakat', 'someone', 'a reason', T0),
    ).rejects.toBeInstanceOf(NotFound);
    // Untouched.
    expect((await beta().computation('beta-zakat'))?.withdrawnAt).toBeNull();
  });
});

describe('an institution’s amendments to a shape are its own reasoning', () => {
  it('sees only its own', async () => {
    expect((await alpha().adoptions()).map((a) => a.id)).toEqual(['alpha-adoption']);
    expect((await beta().adoptions()).map((a) => a.id)).toEqual(['beta-adoption']);
  });

  it('answers absence rather than refusal for another institution’s', async () => {
    expect(await alpha().adoption('beta-adoption')).toBeNull();
    expect(await alpha().adoptions('beta-board')).toEqual([]);
  });

  it('refuses loudly to adopt for another institution’s board', async () => {
    await expect(
      alpha().recordAdoption(adoption('new-one', 'beta-board')),
    ).rejects.toBeInstanceOf(OutsideInstitution);
  });
});

describe('a minute is what a board said to itself, so it is scoped too', () => {
  it('sees only its own', async () => {
    expect((await alpha().meetings()).map((m) => m.id)).toEqual(['alpha-meeting']);
    expect((await beta().meetings()).map((m) => m.id)).toEqual(['beta-meeting']);
  });

  it('answers absence rather than refusal for another institution’s', async () => {
    expect(await alpha().meeting('beta-meeting')).toBeNull();
    expect(await alpha().meetings('beta-board')).toEqual([]);
  });

  it('refuses loudly to convene one for another institution’s board', async () => {
    await expect(
      alpha().createMeeting(meeting('new-one', 'beta-board')),
    ).rejects.toBeInstanceOf(OutsideInstitution);
  });

  it('cannot minute another institution’s, and cannot tell it apart from absence', async () => {
    await expect(
      alpha().updateMeeting('beta-meeting', (m) => ({ ...m, minute: 'read by the wrong board' })),
    ).rejects.toBeInstanceOf(NotFound);
    expect((await beta().meeting('beta-meeting'))?.minute).toBe('');
  });
});

describe('the assistant log is scoped too', () => {
  const exchange = (id: string) => ({
    id, at: T0, scholarId: 's1', question: 'What does pausing do?',
    answer: 'It halts verification.', sources: [], declinedAsRuling: false,
    escalated: false, model: 'test',
  });

  it('stamps the institution on the way in', async () => {
    const inner = both();
    await new TenantStore(inner, 'alpha-bank').appendAssistantExchange(exchange('a'));

    const [written] = await inner.assistantLog();
    expect(written.institutionId).toBe('alpha-bank');
  });

  it('withholds another institution’s questions', async () => {
    const inner = both();
    await new TenantStore(inner, 'alpha-bank').appendAssistantExchange(exchange('a'));
    await new TenantStore(inner, 'beta-bank').appendAssistantExchange(exchange('b'));

    expect((await new TenantStore(inner, 'alpha-bank').assistantLog()).map((e) => e.id)).toEqual(['a']);
    expect((await new TenantStore(inner, 'beta-bank').assistantLog()).map((e) => e.id)).toEqual(['b']);
  });

  /*
   * Entries written before the field existed carry no institution. They are
   * returned where there is exactly one and nothing they could ambiguously
   * belong to, and withheld anywhere else: an entry that cannot say whose it is
   * must not be shown to someone who might not be its owner.
   */
  it('returns unattributed entries where there is only one institution', async () => {
    const inner = new MemoryStore({
      institutions: [institutions[0]],
      boards: [boards[0]],
      rules: [], matters: [], briefings: [],
    });
    await inner.appendAssistantExchange(exchange('legacy'));

    expect((await new TenantStore(inner, 'alpha-bank').assistantLog()).map((e) => e.id)).toEqual(['legacy']);
  });

  it('withholds them where more than one institution exists', async () => {
    const inner = both();
    await inner.appendAssistantExchange(exchange('legacy'));

    expect(await new TenantStore(inner, 'alpha-bank').assistantLog()).toEqual([]);
  });
});

// ── the shape of the guarantee ────────────────────────────────────────────

describe('the guarantee holds without the routes knowing about it', () => {
  /*
   * The point of scoping the store rather than the routes: a caller that never
   * mentions an institution still cannot reach outside one.
   */
  it('a caller that asks for everything gets only its own', async () => {
    const s = alpha();

    const everything = [
      ...(await s.boards()).map((b) => b.id),
      ...(await s.matters()).map((m) => m.id),
      ...(await s.rules()).map((r) => r.id),
    ];

    expect(everything.some((id) => id.startsWith('beta'))).toBe(false);
    expect(everything.length).toBeGreaterThan(0);
  });

  it('two scoped stores over one record never see each other', async () => {
    const inner = both();
    const a = new TenantStore(inner, 'alpha-bank');
    const b = new TenantStore(inner, 'beta-bank');

    await a.createMatter(matter('only-alpha', 'alpha-board', 'Alpha wrote this'));

    expect((await b.matters()).map((m) => m.id)).toEqual(['beta-matter']);
    expect((await a.matters()).map((m) => m.id).sort()).toEqual(['alpha-matter', 'only-alpha']);
  });
});

/*
 * An incident carries more that an institution would not want read than almost
 * anything else in the record: an activity it has stopped, an amount it owes to
 * charity, and a filing it has made to its regulator.
 */
describe('a reported non-compliance does not leave its institution', () => {
  it('lists only its own', async () => {
    const seen = await alpha().incidents();
    expect(seen.map((i) => i.id)).toEqual(['alpha-incident']);
  });

  it('answers for another institution’s incident as absence, not refusal', async () => {
    expect(await alpha().incident('beta-incident')).toBeNull();
    expect(await alpha().incident('no-such-incident')).toBeNull();
  });

  it('treats another institution’s board as an empty one', async () => {
    expect(await alpha().incidents('beta-board')).toEqual([]);
    expect(await alpha().incidents('alpha-board')).toHaveLength(1);
  });

  it('refuses a report aimed at another institution, loudly', async () => {
    await expect(
      alpha().createIncident(incident('x', 'beta-board', 'Not yours')),
    ).rejects.toBeInstanceOf(OutsideInstitution);
  });

  it('refuses a change to another institution’s incident as not found', async () => {
    await expect(
      alpha().updateIncident('beta-incident', (i) => i),
    ).rejects.toBeInstanceOf(NotFound);
  });

  it('will not let a change move an incident to another institution', async () => {
    await expect(
      alpha().updateIncident('alpha-incident', (i) => ({ ...i, boardId: 'beta-board' })),
    ).rejects.toBeInstanceOf(OutsideInstitution);
  });

  it('writes nothing when a change is refused', async () => {
    const store = alpha();
    await expect(
      store.updateIncident('alpha-incident', () => {
        throw new Error('changed my mind');
      }),
    ).rejects.toThrow('changed my mind');
    expect((await store.incident('alpha-incident'))?.stage).toBe('reported');
  });
});

/*
 * An asset carries its institution directly rather than through a board, so the
 * check is a comparison. The rules are the same as everywhere: absence on a
 * read, a loud refusal on a write.
 */
describe('the register does not leave its institution', () => {
  it('lists only its own', async () => {
    expect((await alpha().assets()).map((a) => a.id)).toEqual(['alpha-asset']);
  });

  it('answers for another institution’s asset as absence, not refusal', async () => {
    expect(await alpha().asset('beta-asset')).toBeNull();
    expect(await alpha().asset('no-such-asset')).toBeNull();
  });

  it('refuses an asset added to another institution, loudly', async () => {
    await expect(alpha().createAsset(asset('x', 'beta-bank'))).rejects.toBeInstanceOf(
      OutsideInstitution,
    );
  });

  it('refuses a change to another institution’s asset as not found', async () => {
    await expect(alpha().updateAsset('beta-asset', (a) => a)).rejects.toBeInstanceOf(NotFound);
  });

  it('will not let a change move an asset to another institution', async () => {
    await expect(
      alpha().updateAsset('alpha-asset', (a) => ({ ...a, institutionId: 'beta-bank' })),
    ).rejects.toBeInstanceOf(OutsideInstitution);
  });

  it('writes nothing when a change is refused', async () => {
    const store = alpha();
    await expect(
      store.updateAsset('alpha-asset', () => {
        throw new Error('changed my mind');
      }),
    ).rejects.toThrow('changed my mind');
    expect((await store.asset('alpha-asset'))?.retiredAt).toBeNull();
  });
});
