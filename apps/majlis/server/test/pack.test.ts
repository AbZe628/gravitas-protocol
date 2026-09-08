import { describe, it, expect } from 'vitest';
import { assemblePack } from '../src/services/pack.js';
import { MemoryStore } from '../src/store/index.js';
import type { Board, Computation, Matter } from '../src/types.js';
import type { EnforcementSnapshot } from '../src/services/enforcement.js';

/**
 * The pack.
 *
 * What these hold, in the order it matters:
 *
 *   - it assembles and never composes — every sentence came from a person or
 *     from a service that already computed it;
 *   - the sixth part, what Majlis could not tell you, is filled from the
 *     material rather than written by hand, so a gap cannot exist in the data
 *     and be missing from the list;
 *   - an empty matter produces an honest empty pack rather than a confident
 *     one.
 */

const NOW = '2026-09-20T00:00:00.000Z';

const OFF: EnforcementSnapshot = {
  kind: 'none',
  configured: false,
  address: null,
  reachable: null,
};

async function seeded(): Promise<{ board: Board; matters: Matter[] }> {
  const store = new MemoryStore();
  const matters = await store.matters('demo-board');
  const board = await store.board('demo-board');
  if (!board) throw new Error('the seeded board is gone');
  return { board, matters };
}

async function pack(
  pick: (m: Matter[]) => Matter,
  over: { computations?: Computation[]; at?: string } = {},
) {
  const { board, matters } = await seeded();
  return assemblePack({
    board,
    matter: pick(matters),
    allMatters: matters,
    computations: over.computations ?? [],
    enforcement: OFF,
    assembledAt: over.at ?? NOW,
  });
}

const open = (m: Matter[]) => m.find((x) => x.status === 'deliberation') ?? m[0];
const decided = (m: Matter[]) => m.find((x) => x.status === 'in_force') ?? m[0];

describe('the question, as it was put', () => {
  it('carries the institution word for word, not a summary', async () => {
    const { matters } = await seeded();
    const p = await pack(open);
    expect(p.question.text).toBe(open(matters).proposal);
  });

  it('keeps what is expressly not decided, in the order it was written', async () => {
    const { matters } = await seeded();
    const p = await pack(open);
    expect(p.question.notDecided).toEqual(open(matters).notDecided);
  });

  it('counts the wait in whole days, floored, so nobody is flattered', async () => {
    const { board, matters } = await seeded();
    const matter = { ...open(matters), openedAt: '2026-09-10T22:00:00.000Z', arrivedAt: undefined };
    const p = assemblePack({
      board,
      matter,
      allMatters: matters,
      computations: [],
      enforcement: OFF,
      assembledAt: NOW,
    });
    // Nine days and two hours is nine days.
    expect(p.question.waitedDays).toBe(9);
  });

  it('measures from when the institution asked, not from when we noticed', async () => {
    const { board, matters } = await seeded();
    const matter = {
      ...open(matters),
      arrivedAt: '2026-09-01T00:00:00.000Z',
      openedAt: '2026-09-15T00:00:00.000Z',
    };
    const p = assemblePack({
      board,
      matter,
      allMatters: matters,
      computations: [],
      enforcement: OFF,
      assembledAt: NOW,
    });
    expect(p.question.waitedDays).toBe(19);
    expect(p.question.waitPartlyUnknown).toBe(false);
  });

  it('says the wait is understated where nobody recorded when they asked', async () => {
    const p = await pack(open);
    if (open((await seeded()).matters).arrivedAt === undefined) {
      expect(p.question.waitPartlyUnknown).toBe(true);
    }
  });

  it('stops counting once the matter is settled', async () => {
    const p = await pack(decided);
    expect(p.question.waitedDays).toBeNull();
  });
});

describe('what Majlis could not tell you', () => {
  it('is filled from the material, not written by hand', async () => {
    const { board, matters } = await seeded();
    const bare: Matter = {
      ...open(matters),
      deliberation: [],
      reasoning: [],
      sources: [],
      simulation: null,
      assetIds: [],
      interactsWith: [],
      proposedRule: { ...open(matters).proposedRule, parameters: [] },
    };

    const p = assemblePack({
      board,
      matter: bare,
      allMatters: [bare],
      computations: [],
      enforcement: OFF,
      assembledAt: NOW,
    });

    expect(p.gaps.join(' ')).toContain('No operative terms have been set');
    expect(p.gaps.join(' ')).toContain('Nobody has spoken on this yet');
    expect(p.gaps.join(' ')).toContain('Nothing is attached that reads these terms');
    expect(p.gaps.join(' ')).toContain('run this against real transactions');
  });

  it('names an absence of precedent rather than leaving the section blank', async () => {
    const { board, matters } = await seeded();
    const alone: Matter = { ...open(matters), interactsWith: [], sources: [] };
    const p = assemblePack({
      board,
      matter: alone,
      allMatters: [alone],
      computations: [],
      enforcement: OFF,
      assembledAt: NOW,
    });

    /*
     * "We have never been asked" and "there is no precedent to worry about"
     * are different claims, and a silent empty section makes the second one.
     */
    expect(p.alreadySaid.nothingYet).toBe(true);
    expect(p.gaps.join(' ')).toContain('has not decided anything bearing on this question');
  });

  it('does not invent a gap about figures for a matter that names no holding', async () => {
    const { board, matters } = await seeded();
    const noAssets: Matter = { ...open(matters), assetIds: [] };
    const p = assemblePack({
      board,
      matter: noAssets,
      allMatters: matters,
      computations: [],
      enforcement: OFF,
      assembledAt: NOW,
    });
    expect(p.gaps.join(' ')).not.toContain('No figures have been recorded');
  });

  it('says nothing carries the terms where nothing is attached', async () => {
    const p = await pack(open);
    expect(p.follows.carrying.attached).toBe(false);
    expect(p.gaps.join(' ')).toContain('Majlis will not know whether they did');
  });
});

describe('what the pack must never do', () => {
  it('offers no recommendation of any kind', async () => {
    const p = await pack(open);
    const everything = JSON.stringify(p).toLowerCase();
    for (const word of ['we recommend', 'should be approved', 'suggests that the board']) {
      expect(everything, `the pack composed an opinion: ${word}`).not.toContain(word);
    }
  });

  it('never reorders what members said', async () => {
    const p = await pack(open);
    const times = p.said.map((s) => s.at);
    expect([...times].sort()).toEqual(times);
  });

  it('leaves out a withdrawn source', async () => {
    const { board, matters } = await seeded();
    const withWithdrawn: Matter = {
      ...open(matters),
      sources: [
        ...open(matters).sources,
        {
          kind: 'other',
          label: 'Taken back',
          ref: 'p. 4',
          addedBy: 'member-a',
          at: NOW,
          withdrawnAt: NOW,
        },
      ],
    };
    const p = assemblePack({
      board,
      matter: withWithdrawn,
      allMatters: matters,
      computations: [],
      enforcement: OFF,
      assembledAt: NOW,
    });
    expect(p.evidence.some((e) => e.label === 'Taken back')).toBe(false);
  });
});

describe('where the board stands', () => {
  it('names who still has to speak, rather than only counting who has', async () => {
    const p = await pack(open);
    const signatories = (await seeded()).board.members.filter((m) => m.signatory).length;
    expect(p.standing.recorded.length + p.standing.yetToSpeak.length).toBe(signatories);
  });

  it('does not count a position that was released', async () => {
    const { board, matters } = await seeded();
    const released: Matter = {
      ...open(matters),
      reasoning: [
        {
          scholarId: board.members[0].id,
          position: 'for',
          reason: 'Recorded, then released when the matter went back to deliberation.',
          at: NOW,
          releasedAt: NOW,
        },
      ],
    };
    const p = assemblePack({
      board,
      matter: released,
      allMatters: matters,
      computations: [],
      enforcement: OFF,
      assembledAt: NOW,
    });
    expect(p.standing.recorded).toHaveLength(0);
    expect(p.standing.yetToSpeak.map((y) => y.scholarId)).toContain(board.members[0].id);
  });
});
