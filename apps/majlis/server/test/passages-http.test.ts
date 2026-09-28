import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import { hashPassword } from '../src/auth/members.js';
import { boards, incidents, matters, rules } from '../src/data/seed.js';
import { submissions, undertakings } from '../src/data/seed-work.js';

/**
 * The passage of anything, of any kind, over HTTP.
 *
 * A question and a ruling due for review had no passage route, so no screen
 * showing them could say who is carrying one or offer to take it up. These
 * hold that the route answers for each kind, carries the holder the
 * assignment record says, and says the same as the routes that already
 * existed for a matter and a breach — a second route giving a different
 * answer about the same thing would be the fault this grammar exists to
 * remove.
 */

const PASSWORD = 'a board credential';
const secret = hashPassword(PASSWORD);
const MEMBERS = ['member-a:signatory+chair', 'member-b:signatory', 'member-c:signatory']
  .map((e) => `${e}:${secret}`)
  .join('\n');
const as = (who: string) => 'Basic ' + Buffer.from(`${who}:${PASSWORD}`).toString('base64');

let app: Express;
const saved = { members: process.env.MAJLIS_MEMBERS, user: process.env.BASIC_AUTH_USER };

beforeEach(() => {
  process.env.MAJLIS_MEMBERS = MEMBERS;
  delete process.env.BASIC_AUTH_USER;
  app = createApp(
    new MemoryStore({ boards, matters, rules, incidents, submissions, undertakings, briefings: [] }),
  );
});

afterEach(() => {
  process.env.MAJLIS_MEMBERS = saved.members;
  if (saved.user !== undefined) process.env.BASIC_AUTH_USER = saved.user;
});

const get = (path: string) => request(app).get(path).set('Authorization', as('member-b'));

const waiting = submissions.find((s) => (s.dispositions ?? []).length === 0);

describe('the passage of a question', () => {
  it('has a question waiting in the seed, or this proves nothing', () => {
    expect(waiting).toBeTruthy();
  });

  it('comes for every question at once, and carries who took one up', async () => {
    const took = await request(app)
      .post('/api/assignments')
      .set('Authorization', as('member-a'))
      .send({ ofKind: 'question', ofId: waiting!.id, to: 'member-c' });
    expect(took.status).toBe(201);

    const res = await get('/api/passages/question');
    expect(res.status).toBe(200);
    const all = res.body.passages as { of: { id: string }; holder: { to: string } | null; holdable: boolean }[];
    expect(all.map((p) => p.of.id).sort()).toEqual(submissions.map((s) => s.id).sort());

    const it = all.find((p) => p.of.id === waiting!.id)!;
    expect(it.holder?.to).toBe('member-c');
    expect(it.holdable).toBe(true);
    // Nobody else's question was touched.
    expect(all.filter((p) => p.holder).map((p) => p.of.id)).toEqual([waiting!.id]);
  });

  it('comes for one, the same as in the list', async () => {
    const one = await get(`/api/passages/question/${waiting!.id}`);
    const list = await get('/api/passages/question');
    expect(one.status).toBe(200);
    const same = (list.body.passages as { of: { id: string } }[]).find((p) => p.of.id === waiting!.id);
    expect(one.body.next).toEqual((same as { next: unknown }).next);
  });
});

describe('the passage of a ruling due for review', () => {
  it('comes for one ruling, holdable where the board has something to do', async () => {
    const res = await get(`/api/passages/review/${rules[0].id}`);
    expect(res.status).toBe(200);
    expect(res.body.of).toEqual({ kind: 'review', id: rules[0].id });
    expect(typeof res.body.holdable).toBe('boolean');
  });
});

describe('one authority over a matter and a breach', () => {
  it('says what the matter’s own route says', async () => {
    const id = 'matter-2026-07-03';
    const own = await get(`/api/matters/${id}/passage`);
    const any = await get(`/api/passages/matter/${id}`);
    expect(any.status).toBe(200);
    expect(any.body.next).toEqual(own.body.next);
    expect(any.body.groups).toEqual(own.body.groups);
  });

  it('says what the breach’s own route says', async () => {
    const id = incidents[0].id;
    const own = await get(`/api/incidents/${id}/passage`);
    const any = await get(`/api/passages/breach/${id}`);
    expect(any.status).toBe(200);
    expect(any.body.next).toEqual(own.body.next);
    expect(any.body.groups).toEqual(own.body.groups);
  });
});

describe('what it refuses', () => {
  it('another board’s question, asked for by its id', async () => {
    const theirs = { ...waiting!, id: 'q-of-another-board', boardId: 'another-board' };
    const other = { ...boards[0], id: 'another-board', name: 'Another board' };
    app = createApp(
      new MemoryStore({
        boards: [...boards, other],
        matters,
        rules,
        incidents,
        submissions: [...submissions, theirs],
        undertakings,
        briefings: [],
      }),
    );
    expect((await get('/api/passages/question/q-of-another-board')).status).toBe(404);
    // Nor in the list, which is this board's.
    const list = await get('/api/passages/question');
    expect((list.body.passages as { of: { id: string } }[]).map((p) => p.of.id)).not.toContain('q-of-another-board');
  });

  it('a kind there is not, and a thing that is not here', async () => {
    expect((await get('/api/passages/nonsense')).status).toBe(404);
    expect((await get('/api/passages/question/nonsense')).status).toBe(404);
    // A matter's id is not a question.
    expect((await get('/api/passages/question/matter-2026-07-03')).status).toBe(404);
  });
});
