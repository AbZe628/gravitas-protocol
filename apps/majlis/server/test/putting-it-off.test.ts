import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import { hashPassword } from '../src/auth/members.js';
import { boards, incidents, matters, rules } from '../src/data/seed.js';
import { examinations, submissions, undertakings } from '../src/data/seed-work.js';
import {
  MIN_REASON,
  Refused,
  onThis,
  putOff,
  setAsideNow,
  standingPutOffs,
  takingBack,
  type PutOff,
} from '../src/services/putting-off.js';
import { buildQueue } from '../src/services/queue.js';
import { structures } from '../src/data/structures.js';

/**
 * A member saying they will come back to something on a named day.
 *
 * ── the shape this is not ─────────────────────────────────────────────────
 *
 * The obvious one — *remind me on Tuesday*, hidden from everybody else — was
 * put to the board's owner and refused in that shape. In a record whose whole
 * rule is that what is written is the board's and permanent, a member could
 * otherwise push something out of sight and nobody would know it had been
 * pushed; the first private entry in the application would have been the one
 * that decides what the board does not look at.
 *
 * So it is a position like every other: a name, a day, a reason, and the board
 * reads all three. What it does is move the row off the top of that member's
 * own list and off nobody else's.
 *
 * ── and what it must never touch ──────────────────────────────────────────
 *
 * The count of what is waiting, the days something has stood there, and
 * whether a clock has run out. An arrangement where setting a thing aside also
 * quieted the figure would be a way to make the board's own pace measure lie,
 * and the pace figure is the one this product is sold on.
 */

const PASSWORD = 'a board credential';
const secret = hashPassword(PASSWORD);

const MEMBERS = [
  'member-a:signatory+chair',
  'member-b:signatory',
  'advisor-1:advisory',
  'liaison-1:liaison',
  'desk-treasury:institution',
]
  .map((entry) => `${entry}:${secret}`)
  .join('\n');

const as = (who: string) => 'Basic ' + Buffer.from(`${who}:${PASSWORD}`).toString('base64');

const NOW = '2026-10-01T09:00:00.000Z';
const SOON = '2026-10-08T00:00:00.000Z';
const GONE = '2026-09-01T00:00:00.000Z';

const REASON = 'Waiting on the desk to come back with the pricing feed.';

const entry = (over: Partial<PutOff> = {}): PutOff => ({
  id: 'p1',
  boardId: 'demo-board',
  ofKind: 'matter',
  ofId: 'm1',
  until: SOON,
  reason: REASON,
  by: 'member-a',
  at: NOW,
  ...over,
});

let app: Express;
let store: MemoryStore;
const saved = { members: process.env.MAJLIS_MEMBERS };

beforeEach(() => {
  process.env.MAJLIS_MEMBERS = MEMBERS;
  store = new MemoryStore({
    boards,
    matters,
    rules,
    incidents,
    examinations,
    submissions,
    undertakings,
    briefings: [],
  });
  app = createApp(store);
});

afterEach(() => {
  process.env.MAJLIS_MEMBERS = saved.members;
});

// ── the record itself ──────────────────────────────────────────────────────

describe('setting something aside', () => {
  it('keeps the day, the reason and the member who said it', () => {
    const made = putOff({ ...entry(), reason: '  ' + REASON + '  ' });
    expect(made.until).toBe(SOON);
    expect(made.reason).toBe(REASON);
    expect(made.by).toBe('member-a');
  });

  /*
   * The reason is the whole difference between this and a snooze. Without it
   * the board reads that something was put off and nothing about why, which is
   * the private entry this was built instead of.
   */
  it('refuses a day with no reason behind it', () => {
    expect(() => putOff({ ...entry(), reason: 'later' })).toThrow(Refused);
    try {
      putOff({ ...entry(), reason: 'x'.repeat(MIN_REASON - 1) });
      expect.unreachable('a reason under the minimum was accepted');
    } catch (e) {
      expect((e as Refused).reason).toBe('no_reason');
    }
  });

  /*
   * Refused rather than quietly corrected: a member who typed last month meant
   * something, and nothing here knows what.
   */
  it('refuses a day that has already gone', () => {
    try {
      putOff({ ...entry(), until: GONE });
      expect.unreachable('a day in the past was accepted');
    } catch (e) {
      expect((e as Refused).reason).toBe('day_has_passed');
    }
  });

  /* Picking it up again owes the board nothing beyond the fact that they did. */
  it('takes it back without asking for a reason', () => {
    const back = putOff({ ...entry(), until: null, reason: '' });
    expect(back.until).toBeNull();
  });

  it('refuses taking back what was never set aside', () => {
    expect(() => takingBack([], 'matter', 'm1', 'member-a')).toThrow(Refused);
    expect(() => takingBack([entry()], 'matter', 'm1', 'member-a')).not.toThrow();
  });
});

describe('what stands', () => {
  /* Append-only. The second entry stands over the first; neither is deleted. */
  it('is the last entry that member wrote about that thing', () => {
    const all = [
      entry({ id: '1', until: SOON }),
      entry({ id: '2', until: '2026-10-20T00:00:00.000Z' }),
    ];
    expect(standingPutOffs(all)).toHaveLength(1);
    expect(standingPutOffs(all)[0].id).toBe('2');
  });

  it('is nothing once that member has taken it back', () => {
    expect(standingPutOffs([entry({ id: '1' }), entry({ id: '2', until: null })])).toEqual([]);
  });

  /* Per member. One member setting something aside says nothing about another. */
  it('keeps each member’s own apart', () => {
    const all = [entry({ id: '1', by: 'member-a' }), entry({ id: '2', by: 'member-b', until: null })];
    expect(standingPutOffs(all).map((p) => p.by)).toEqual(['member-a']);
  });

  /* A day that has arrived puts the row back by itself; nothing has to run. */
  it('drops one whose day has come', () => {
    const all = [entry({ until: '2026-10-01T08:00:00.000Z' })];
    expect(standingPutOffs(all)).toHaveLength(1);
    expect(setAsideNow(all, NOW)).toEqual([]);
  });

  it('answers for one thing without the caller filtering', () => {
    const all = [entry({ id: '1' }), entry({ id: '2', ofId: 'm2' })];
    expect(onThis(all, 'matter', 'm1', NOW).map((p) => p.id)).toEqual(['1']);
  });
});

// ── what it must not move ──────────────────────────────────────────────────

describe('the queue, with something set aside', () => {
  const build = (putOffs: PutOff[] = []) =>
    buildQueue({
      board: boards[0],
      submissions,
      matters,
      rules,
      incidents,
      undertakings,
      structures,
      assignments: [],
      putOffs,
      now: NOW,
    });

  it('carries who set it aside, until when, and why', () => {
    const one = build()[0];
    const rows = build([entry({ ofKind: one.kind, ofId: one.id })]);
    const row = rows.find((r) => r.kind === one.kind && r.id === one.id)!;
    expect(row.putOff).toEqual([{ by: 'member-a', until: SOON, reason: REASON }]);
  });

  /*
   * The board reads it, not only the member who wrote it. A row three members
   * have each put off twice is telling a chair something no count of days can.
   */
  it('carries every member’s, not only one', () => {
    const one = build()[0];
    const rows = build([
      entry({ id: '1', ofKind: one.kind, ofId: one.id, by: 'member-a' }),
      entry({ id: '2', ofKind: one.kind, ofId: one.id, by: 'member-b' }),
    ]);
    const row = rows.find((r) => r.kind === one.kind && r.id === one.id)!;
    expect(row.putOff?.map((p) => p.by).sort()).toEqual(['member-a', 'member-b']);
  });

  /*
   * The figure this product is sold on. A set-aside that quieted the count, the
   * days or the clock would be a way to make the board's own pace measure lie.
   */
  it('changes nothing about what is waiting, how long, or whether a clock has run out', () => {
    const plain = build();
    const aside = build(plain.map((r, i) => entry({ id: String(i), ofKind: r.kind, ofId: r.id })));

    expect(aside).toHaveLength(plain.length);
    // Every row carries one, so the measure looked at what it claims to.
    expect(aside.every((r) => r.putOff?.length === 1)).toBe(true);

    const bare = (rows: typeof plain) =>
      rows.map(({ putOff: _aside, ...rest }) => rest);
    expect(bare(aside)).toEqual(bare(plain));
  });

  it('leaves the row alone once the day has come', () => {
    const one = build()[0];
    const rows = build([
      entry({ ofKind: one.kind, ofId: one.id, until: '2026-10-01T08:00:00.000Z' }),
    ]);
    // `setAsideNow` is the route's filter; the builder is given what stands.
    expect(setAsideNow([entry({ until: '2026-10-01T08:00:00.000Z' })], NOW)).toEqual([]);
    expect(rows.find((r) => r.id === one.id)!.putOff).toHaveLength(1);
  });
});

// ── over HTTP ──────────────────────────────────────────────────────────────

const aMatter = () => matters.find((m) => m.status !== 'in_force')!.id;

describe('POST /api/put-off', () => {
  it('records it, and the queue shows it to the whole board', async () => {
    const made = await request(app)
      .post('/api/put-off')
      .set('Authorization', as('member-a'))
      .send({ ofKind: 'matter', ofId: aMatter(), until: '2027-01-05T00:00:00.000Z', reason: REASON });
    expect(made.status).toBe(201);

    // Read by somebody else, which is the whole point of it not being a snooze.
    const seen = await request(app).get('/api/queue').set('Authorization', as('member-b'));
    const row = seen.body.rows.find((r: { id: string }) => r.id === aMatter());
    expect(row.putOff).toEqual([
      { by: 'member-a', until: '2027-01-05T00:00:00.000Z', reason: REASON },
    ]);
  });

  it('refuses a reason nobody wrote', async () => {
    const res = await request(app)
      .post('/api/put-off')
      .set('Authorization', as('member-a'))
      .send({ ofKind: 'matter', ofId: aMatter(), until: '2027-01-05T00:00:00.000Z', reason: 'later' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('no_reason');
  });

  it('refuses a day that has gone', async () => {
    const res = await request(app)
      .post('/api/put-off')
      .set('Authorization', as('member-a'))
      .send({ ofKind: 'matter', ofId: aMatter(), until: '2020-01-01T00:00:00.000Z', reason: REASON });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('day_has_passed');
  });

  it('refuses something that is not before this board', async () => {
    const res = await request(app)
      .post('/api/put-off')
      .set('Authorization', as('member-a'))
      .send({ ofKind: 'matter', ofId: 'nothing-like-this', until: '2027-01-05T00:00:00.000Z', reason: REASON });
    expect(res.status).toBe(404);
  });

  /*
   * The bank's liaison deciding what the board looks at this week would be the
   * institution arranging the board's attention.
   */
  it('refuses the institution’s liaison', async () => {
    const res = await request(app)
      .post('/api/put-off')
      .set('Authorization', as('liaison-1'))
      .send({ ofKind: 'matter', ofId: aMatter(), until: '2027-01-05T00:00:00.000Z', reason: REASON });
    expect(res.status).toBe(403);
  });

  it('lets an advisory member set aside, because they sit on this board', async () => {
    const res = await request(app)
      .post('/api/put-off')
      .set('Authorization', as('advisor-1'))
      .send({ ofKind: 'matter', ofId: aMatter(), until: '2027-01-05T00:00:00.000Z', reason: REASON });
    expect(res.status).toBe(201);
  });

  it('takes it back, and the row stops carrying it', async () => {
    const send = (until: string | null, reason = '') =>
      request(app)
        .post('/api/put-off')
        .set('Authorization', as('member-a'))
        .send({ ofKind: 'matter', ofId: aMatter(), until, reason });

    expect((await send('2027-01-05T00:00:00.000Z', REASON)).status).toBe(201);
    expect((await send(null)).status).toBe(201);

    const seen = await request(app).get('/api/queue').set('Authorization', as('member-a'));
    expect(seen.body.rows.find((r: { id: string }) => r.id === aMatter()).putOff).toBeUndefined();

    // And a second taking-back is refused rather than written as a no-op.
    expect((await send(null)).status).toBe(409);
  });

  /* Append-only: taking it back does not remove what was written. */
  it('keeps both entries in the record', async () => {
    await request(app)
      .post('/api/put-off')
      .set('Authorization', as('member-a'))
      .send({ ofKind: 'matter', ofId: aMatter(), until: '2027-01-05T00:00:00.000Z', reason: REASON });
    await request(app)
      .post('/api/put-off')
      .set('Authorization', as('member-a'))
      .send({ ofKind: 'matter', ofId: aMatter(), until: null, reason: '' });

    expect(await store.putOffs('demo-board')).toHaveLength(2);
  });

  /*
   * What the board has set aside is the board's own record.
   *
   * The bank desk, not the liaison: the liaison sits in the room and already
   * sees who is carrying what, and a fence that shut them out here while
   * leaving the assignments open would be two answers to one question.
   */
  it('tells a bank desk nothing about it', async () => {
    /*
     * Set aside the desk's **own** question, which is the only thing its queue
     * carries.
     *
     * Written against a matter, the assertion was empty: a desk's queue holds
     * no matters at all, so *no row carries a set-aside* was true however the
     * fence behaved. It passed with the fence deleted.
     */
    const DESK_ASKED = 'submission-2026-08-25';

    expect(
      (await request(app).post('/api/put-off').set('Authorization', as('member-a')).send({
        ofKind: 'question',
        ofId: DESK_ASKED,
        until: '2027-01-05T00:00:00.000Z',
        reason: REASON,
      })).status,
    ).toBe(201);

    // The board sees it.
    const board = await request(app).get('/api/queue').set('Authorization', as('member-b'));
    expect(board.body.rows.find((r: { id: string }) => r.id === DESK_ASKED).putOff).toHaveLength(1);

    // The desk sees its own question, and nothing about what the board did with it.
    const seen = await request(app).get('/api/queue').set('Authorization', as('desk-treasury'));
    const row = seen.body.rows.find((r: { id: string }) => r.id === DESK_ASKED);
    expect(row, 'the desk’s own question is not in its queue, so this proves nothing').toBeTruthy();
    expect(row.putOff).toBeUndefined();

    expect(
      (await request(app).get('/api/put-off').set('Authorization', as('desk-treasury'))).status,
    ).toBe(403);
  });
});
