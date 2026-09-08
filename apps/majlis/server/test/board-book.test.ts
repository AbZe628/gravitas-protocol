import { describe, it, expect } from 'vitest';
import { assembleBook, type StandingItem } from '../src/services/board-book.js';
import { MemoryStore } from '../src/store/index.js';
import type { Board, Matter, Meeting } from '../src/types.js';
import type { EnforcementSnapshot } from '../src/services/enforcement.js';

/**
 * The board book.
 *
 * What these hold:
 *
 *   - the agenda keeps its order and its wording, because both are the
 *     secretary's and neither is ours to improve;
 *   - an item that is not a matter says so rather than showing an empty pack,
 *     which would read as a matter with nothing in it;
 *   - nobody is absent before a meeting, only unrecorded;
 *   - the standing business is carried in, never decided here.
 */

const NOW = '2026-09-20T00:00:00.000Z';

const OFF: EnforcementSnapshot = { kind: 'none', configured: false, readAt: NOW };

async function seeded(): Promise<{ board: Board; matters: Matter[] }> {
  const store = new MemoryStore();
  const board = await store.board('demo-board');
  if (!board) throw new Error('the seeded board is gone');
  return { board, matters: await store.matters('demo-board') };
}

function meeting(over: Partial<Meeting> = {}): Meeting {
  return {
    id: 'meet-1',
    boardId: 'demo-board',
    at: '2026-09-25T09:00:00.000Z',
    joinUrl: null,
    agenda: [],
    attendance: [],
    minute: '',
    recordedBy: 'member-a',
    closedAt: null,
    ...over,
  };
}

async function book(over: Partial<Meeting> = {}, standing: StandingItem[] = []) {
  const { board, matters } = await seeded();
  return assembleBook({
    board,
    meeting: meeting(over),
    allMatters: matters,
    computations: [],
    enforcement: OFF,
    standing,
    assembledAt: NOW,
  });
}

describe('the agenda', () => {
  it('keeps the secretary’s order and the secretary’s words', async () => {
    const b = await book({
      agenda: [{ item: 'Apologies' }, { item: 'The tangible ratio question' }, { item: 'Any other business' }],
    });

    expect(b.items.map((i) => i.item)).toEqual([
      'Apologies',
      'The tangible ratio question',
      'Any other business',
    ]);
    expect(b.items.map((i) => i.number)).toEqual([1, 2, 3]);
  });

  it('carries the whole pack under an item that is a matter', async () => {
    const { matters } = await seeded();
    const b = await book({ agenda: [{ item: 'The drift question', matterId: matters[0].id }] });

    const one = b.items[0];
    expect(one.pack).not.toBeNull();
    expect(one.pack?.question.text).toBe(matters[0].proposal);
    // The gaps come with it: a director reading the book sees the seams.
    expect(Array.isArray(one.pack?.gaps)).toBe(true);
  });

  it('says an item is not a matter rather than showing an empty pack', async () => {
    const b = await book({ agenda: [{ item: 'Any other business' }] });

    expect(b.items[0].pack).toBeNull();
    expect(b.items[0].missing).toBe(false);
    expect(b.gaps.join(' ')).toContain('are not matters before the board');
  });

  it('says when an item names a matter that is not in the record', async () => {
    const b = await book({ agenda: [{ item: 'A ghost', matterId: 'matter-that-never-was' }] });

    expect(b.items[0].missing).toBe(true);
    expect(b.items[0].pack).toBeNull();
    expect(b.gaps.join(' ')).toContain('is not in this board');
  });

  it('says so when nobody set an agenda at all', async () => {
    const b = await book();
    expect(b.gaps.join(' ')).toContain('No agenda has been set');
  });
});

describe('who is expected', () => {
  it('records nobody as absent before the meeting has happened', async () => {
    const b = await book();

    /*
     * Null, not false. Writing an unrecorded member down as absent is an
     * accusation, and it is the one a board book must never make by default.
     */
    expect(b.expected.every((e) => e.present === null)).toBe(true);
    expect(b.expected.length).toBeGreaterThan(0);
  });

  it('shows what was recorded once somebody has recorded it', async () => {
    const { board } = await seeded();
    const who = board.members[0].id;
    const b = await book({
      attendance: [{ scholarId: who, present: false, note: 'Travelling.' }],
    });

    const one = b.expected.find((e) => e.scholarId === who);
    expect(one?.present).toBe(false);
    expect(one?.note).toBe('Travelling.');
  });
});

describe('the standing business', () => {
  it('is carried in, and nothing about it is decided here', async () => {
    const b = await book({ agenda: [{ item: 'Apologies' }] }, [
      {
        kind: 'moved',
        what: 'SABIC',
        ref: 'matter-1',
        note: 'Debt is now 34.1% of market value. The ruling permits 30%.',
      },
    ]);

    expect(b.sinceWeMet).toHaveLength(1);
    expect(b.sinceWeMet[0].note).toContain('34.1%');
  });

  it('says an empty list is what the record holds, not that nothing moved', async () => {
    const b = await book({ agenda: [{ item: 'Apologies' }] });

    /*
     * The difference matters. "Nothing is outstanding" is a claim about the
     * world; "nothing is shown as outstanding" is a claim about the record,
     * and only the second one is ours to make.
     */
    expect(b.gaps.join(' ')).toContain('it is not a statement that nothing has moved');
  });
});

describe('what the book must never do', () => {
  it('offers no recommendation and no running order of its own', async () => {
    const { matters } = await seeded();
    const b = await book({
      agenda: [{ item: 'The question', matterId: matters[0].id }],
    });

    const everything = JSON.stringify(b).toLowerCase();
    for (const word of ['we recommend', 'should be approved', 'suggested order', 'we suggest']) {
      expect(everything, `the book composed an opinion: ${word}`).not.toContain(word);
    }
  });

  it('says the minute is missing rather than leaving the book looking complete', async () => {
    const b = await book({ agenda: [{ item: 'Apologies' }] });
    expect(b.gaps.join(' ')).toContain('No minute has been written yet');
  });
});
