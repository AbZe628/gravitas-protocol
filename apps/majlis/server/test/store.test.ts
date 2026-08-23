import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Matter } from '../src/types.js';
import { MemoryStore } from '../src/store/memory.js';
import { FileStore } from '../src/store/file.js';
import { NotFound, type Store } from '../src/store/store.js';
import { Refused, recordVote } from '../src/services/lifecycle.js';

/**
 * One suite, both implementations. The in-memory store is the reference and
 * keeps the tests fast; the file store is what ships. Any disagreement between
 * them should be a failing test here rather than a surprise later.
 */
const backends: Array<[string, () => Store]> = [
  ['memory', () => new MemoryStore()],
  ['file', () => new FileStore({ file: join(mkdtempSync(join(tmpdir(), 'majlis-mem-')), 'r.json') })],
];

const T0 = '2026-08-24T09:00:00.000Z';

function newMatter(id: string, over: Partial<Matter> = {}): Matter {
  return {
    id, boardId: 'demo-board', title: 'A new matter', origin: 'protocol_change',
    direction: 'permit', status: 'draft', openedAt: T0,
    proposal: 'Something is proposed.', notDecided: [], mechanism: '', interactsWith: [],
    proposedRule: {
      id: 'r-' + id, boardId: 'demo-board', title: '', statement: '', parameters: [],
      parameterHash: '0x00', version: 1, inForceFrom: null,
      supersededBy: null, supersedes: null, sources: [],
    },
    simulation: null, deliberation: [], reasoning: [],
    timelockStartedAt: null, timelockEndsAt: null, objections: [],
    inForceAt: null, sources: [],
    ...over,
  };
}

describe.each(backends)('%s store', (_name, make) => {
  let store: Store;

  beforeEach(() => { store = make(); });
  afterEach(async () => { await store.close(); });

  // ── the record Stage One exposed ────────────────────────────────────────

  it('carries the seeded record', async () => {
    expect((await store.boards()).length).toBeGreaterThan(0);
    expect((await store.rules()).length).toBeGreaterThan(0);
    expect((await store.matters()).length).toBeGreaterThan(0);
    expect((await store.briefings()).length).toBeGreaterThan(0);
  });

  it('finds a board by id and returns null for one that is not there', async () => {
    const [first] = await store.boards();
    expect((await store.board(first.id))?.id).toBe(first.id);
    expect(await store.board('no-such-board')).toBeNull();
  });

  it('filters rules and matters by board', async () => {
    const [board] = await store.boards();
    for (const r of await store.rules(board.id)) expect(r.boardId).toBe(board.id);
    for (const m of await store.matters(board.id)) expect(m.boardId).toBe(board.id);
    expect(await store.rules('no-such-board')).toEqual([]);
    expect(await store.matters('no-such-board')).toEqual([]);
  });

  it('never hands out a reference to its own state', async () => {
    const before = await store.matters();
    const mutated = await store.matters();
    mutated[0].title = 'tampered';
    mutated[0].reasoning.push({ scholarId: 'x', position: 'for', reason: 'y', at: T0 });

    const after = await store.matters();
    expect(after[0].title).toBe(before[0].title);
    expect(after[0].reasoning).toHaveLength(before[0].reasoning.length);
  });

  // ── writing ─────────────────────────────────────────────────────────────

  it('creates a matter and reads it back whole', async () => {
    const created = await store.createMatter(newMatter('m-new'));
    expect(created.id).toBe('m-new');

    const read = await store.matter('m-new');
    expect(read).toEqual(created);
    expect((await store.matters('demo-board')).some((m) => m.id === 'm-new')).toBe(true);
  });

  it('refuses to create a matter twice', async () => {
    await store.createMatter(newMatter('m-dup'));
    await expect(store.createMatter(newMatter('m-dup'))).rejects.toThrow(/already exists/);
  });

  it('updates through a function', async () => {
    await store.createMatter(newMatter('m-up'));
    const updated = await store.updateMatter('m-up', (m) => ({ ...m, status: 'deliberation' }));

    expect(updated.status).toBe('deliberation');
    expect((await store.matter('m-up'))?.status).toBe('deliberation');
  });

  it('reports a missing matter rather than creating one', async () => {
    await expect(store.updateMatter('ghost', (m) => m)).rejects.toBeInstanceOf(NotFound);
    expect(await store.matter('ghost')).toBeNull();
  });

  it('writes nothing when the change refuses', async () => {
    await store.createMatter(newMatter('m-refuse', { status: 'deliberation' }));

    await expect(
      store.updateMatter('m-refuse', (m) => {
        // A lifecycle refusal: voting is not open.
        return recordVote(
          { id: 'demo-board', name: '', quorumPermit: 3, quorumRestrict: 2, totalSignatories: 1,
            ratificationWindowHours: 168,
            members: [{ id: 's1', name: '', title: '', board: 'demo-board', signatory: true }] },
          m,
          { scholarId: 's1', position: 'for', reason: 'A reason long enough to be a reason.' },
          T0
        );
      })
    ).rejects.toBeInstanceOf(Refused);

    const after = await store.matter('m-refuse');
    expect(after?.status).toBe('deliberation');
    expect(after?.reasoning).toEqual([]);
  });

  it('a change that throws part way leaves the stored matter untouched', async () => {
    await store.createMatter(newMatter('m-partial', { title: 'original' }));

    await expect(
      store.updateMatter('m-partial', (m) => {
        m.title = 'half written';
        m.status = 'voting';
        throw new Error('gave up half way');
      })
    ).rejects.toThrow(/gave up half way/);

    const after = await store.matter('m-partial');
    expect(after?.title).toBe('original');
    expect(after?.status).toBe('draft');
  });

  it('sequential updates each see the one before', async () => {
    await store.createMatter(newMatter('m-seq', { status: 'voting' }));
    for (const id of ['s1', 's2', 's3']) {
      await store.updateMatter('m-seq', (m) => ({
        ...m,
        reasoning: [...m.reasoning, { scholarId: id, position: 'for', reason: 'r', at: T0 }],
      }));
    }
    expect((await store.matter('m-seq'))?.reasoning.map((r) => r.scholarId)).toEqual(['s1', 's2', 's3']);
  });

  // ── the assistant log ───────────────────────────────────────────────────

  it('keeps the assistant log newest first', async () => {
    for (const n of [1, 2, 3]) {
      await store.appendAssistantExchange({
        id: 'e' + n, at: T0, scholarId: null, question: 'q' + n, answer: 'a' + n,
        sources: [], declinedAsRuling: false, escalated: false, model: 'test',
      });
    }
    const log = await store.assistantLog();
    expect(log.map((e) => e.id)).toEqual(['e3', 'e2', 'e1']);
    expect((await store.assistantLog(2)).map((e) => e.id)).toEqual(['e3', 'e2']);
  });

  it('the log is bounded', async () => {
    for (let n = 0; n < 1_010; n++) {
      await store.appendAssistantExchange({
        id: 'e' + n, at: T0, scholarId: null, question: 'q', answer: 'a',
        sources: [], declinedAsRuling: false, escalated: false, model: 'test',
      });
    }
    const log = await store.assistantLog();
    expect(log.length).toBeLessThanOrEqual(1_000);
    expect(log[0].id).toBe('e1009');
  });
});

// ── what only the file-backed store can be asked ──────────────────────────

describe('the file store, on disk', () => {
  let dir: string;

  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'majlis-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('a matter survives the process that wrote it', async () => {
    const file = join(dir, 'majlis.json');

    const first = new FileStore({ file });
    await first.createMatter(newMatter('m-durable', { title: 'written before restart' }));
    await first.updateMatter('m-durable', (m) => ({ ...m, status: 'deliberation' }));
    await first.close();

    const second = new FileStore({ file });
    const read = await second.matter('m-durable');
    expect(read?.title).toBe('written before restart');
    expect(read?.status).toBe('deliberation');
    await second.close();
  });

  it('reopening does not seed over what is already there', async () => {
    const file = join(dir, 'majlis.json');

    const first = new FileStore({ file });
    await first.updateMatter((await first.matters())[0].id, (m) => ({ ...m, title: 'edited' }));
    const countBefore = (await first.matters()).length;
    await first.close();

    const second = new FileStore({ file });
    expect((await second.matters()).length).toBe(countBefore);
    expect((await second.matters())[0].title).toBe('edited');
    await second.close();
  });
});
