import { describe, it, expect } from 'vitest';
import { MemoryStore } from '../src/store/index.js';
import { sweep } from '../src/services/sweep.js';
import type { Matter } from '../src/types.js';

/**
 * A permit whose waiting is over comes into force without being asked.
 *
 * ── the hole this closes ──────────────────────────────────────────────────
 *
 * The sweep already caught the mirror image: a restriction that outlived its
 * ratification window read `in_force` when the board's own rules said it had
 * expired. The other direction was left to a press. A permit whose timelock
 * had run out sat in `timelock` — the record saying *still waiting* when the
 * waiting was over — until somebody opened that matter and pressed.
 *
 * That makes a ruling's effective date depend on when a member next logged
 * in. The board decided when it voted; the clock is the system waiting
 * deliberately, and when it stops waiting there is no decision left to take.
 *
 * ── what is asserted, including what must NOT move ────────────────────────
 *
 * A sweep that moved everything would pass the first test here and be a
 * catastrophe: an objection raised during a timelock halts the change, and a
 * timelock still running cannot be shortened from inside the system. Both are
 * asserted, because a sweep is a thing that acts with nobody watching.
 */

const HOUR = 3_600_000;
const iso = (ms: number) => new Date(ms).toISOString();

function matter(over: Partial<Matter> = {}): Matter {
  const opened = Date.now() - 100 * HOUR;
  return {
    id: 'm-' + Math.random().toString(36).slice(2, 8),
    boardId: 'demo-board',
    title: 'Whether a wrapper inherits its underlying ruling',
    origin: 'institution_request',
    direction: 'permit',
    status: 'timelock',
    openedAt: iso(opened),
    proposal: 'The board is asked whether the wrapper is a separate asset.',
    notDecided: [],
    mechanism: '',
    interactsWith: [],
    simulation: null,
    deliberation: [],
    reasoning: [],
    timelockStartedAt: iso(opened + 10 * HOUR),
    /* Ended a day ago: the waiting is unambiguously over. */
    timelockEndsAt: iso(Date.now() - 24 * HOUR),
    objections: [],
    inForceAt: null,
    sources: [],
    ...over,
  } as Matter;
}

async function withMatters(...ms: Matter[]) {
  const store = new MemoryStore();
  for (const m of ms) await store.createMatter(m);
  return store;
}

describe('a permit whose timelock has run out', () => {
  it('is brought into force by the sweep, with nobody pressing anything', async () => {
    const m = matter();
    const store = await withMatters(m);

    const swept = await sweep(store);

    expect(swept.inForce.map((x) => x.id)).toEqual([m.id]);
    const after = await store.matter(m.id);
    expect(after?.status).toBe('in_force');
    expect(after?.inForceAt).toBeTruthy();
  });

  it('takes its reference the moment it takes effect', async () => {
    const store = await withMatters(matter());
    const swept = await sweep(store);

    // The seeded board carries a series, so a ruling in force has a reference
    // rather than an internal id wearing a suit.
    expect(swept.inForce[0]?.reference).toBeTruthy();
  });

  it('gives two permits two references, not one twice', async () => {
    const store = await withMatters(matter(), matter());
    const swept = await sweep(store);

    expect(swept.inForce).toHaveLength(2);
    const refs = swept.inForce.map((x) => x.reference);
    expect(new Set(refs).size).toBe(2);
  });

  it('is idempotent: a second sweep moves nothing', async () => {
    const store = await withMatters(matter());
    await sweep(store);
    const again = await sweep(store);

    expect(again.inForce).toHaveLength(0);
  });
});

describe('what the sweep must refuse to touch', () => {
  it('leaves a permit with an objection standing exactly where it is', async () => {
    const m = matter({
      objections: [
        {
          scholarId: 'member-b',
          reason: 'The mechanism reaches further than the question put to the board.',
          at: iso(Date.now() - 30 * HOUR),
        },
      ],
    } as Partial<Matter>);
    const store = await withMatters(m);

    const swept = await sweep(store);

    // An objection halts the change. A sweep that forced past one would put
    // into force the very thing an objection exists to stop.
    expect(swept.inForce).toHaveLength(0);
    expect((await store.matter(m.id))?.status).toBe('timelock');
  });

  it('leaves a timelock that is still running', async () => {
    const m = matter({ timelockEndsAt: iso(Date.now() + 48 * HOUR) });
    const store = await withMatters(m);

    const swept = await sweep(store);

    expect(swept.inForce).toHaveLength(0);
    expect((await store.matter(m.id))?.status).toBe('timelock');
  });

  it('leaves a matter that is not in a timelock at all', async () => {
    const m = matter({ status: 'deliberation', timelockEndsAt: null });
    const store = await withMatters(m);

    const swept = await sweep(store);

    expect(swept.inForce).toHaveLength(0);
    expect((await store.matter(m.id))?.status).toBe('deliberation');
  });
});
