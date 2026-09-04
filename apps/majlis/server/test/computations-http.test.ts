import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import { hashPassword } from '../src/auth/members.js';

/**
 * Recording a calculation, over HTTP, including who may not.
 *
 * The line these hold is the one the whole record rests on: **recording is not
 * approving.** Every response says so in the same words, and nothing in a
 * response may read as the board having agreed with what it noted.
 */

const PASSWORD = 'a board credential';
const secret = hashPassword(PASSWORD);

const MEMBERS = [
  'member-a:signatory+chair',
  'member-b:signatory',
  'liaison-1:liaison',
  'advisor-1:advisory',
  'watcher:observer',
]
  .map((entry) => `${entry}:${secret}`)
  .join('\n');

const as = (who: string) => 'Basic ' + Buffer.from(`${who}:${PASSWORD}`).toString('base64');

let app: Express;
const saved = {
  members: process.env.MAJLIS_MEMBERS,
  user: process.env.BASIC_AUTH_USER,
  pass: process.env.BASIC_AUTH_PASSWORD,
};

beforeEach(() => {
  process.env.MAJLIS_MEMBERS = MEMBERS;
  delete process.env.BASIC_AUTH_USER;
  delete process.env.BASIC_AUTH_PASSWORD;
  app = createApp(new MemoryStore());
});

afterEach(() => {
  process.env.MAJLIS_MEMBERS = saved.members;
  process.env.BASIC_AUTH_USER = saved.user;
  process.env.BASIC_AUTH_PASSWORD = saved.pass;
});

const zakat = {
  kind: 'zakat',
  boardId: 'demo-board',
  assetId: null,
  periodFrom: '2026-01-01',
  periodTo: '2026-12-31',
  method: 'net_assets',
  methodStated: 'Zakatable assets less liabilities falling due within the year.',
  currency: 'AED',
  source: 'Audited financial statements',
  figures: { cash: '4000000', shortTermLiabilities: '2000000' },
  headline: 'Due',
  amount: '200000',
  steps: [{ label: 'At 2.5%', working: '2.5% of 8000000', value: '200000 AED' }],
  note: 'Whether the base is the right one is not answered here.',
};

const REASON = 'Recorded against the wrong holding; the figures belong to the other pool.';

const record = (body: Record<string, unknown> = {}, who = 'member-a') =>
  request(app)
    .post('/api/computations')
    .set('Authorization', as(who))
    .send({ ...zakat, ...body });

describe('noting a calculation', () => {
  it('records the figures, the working, and who noted it', async () => {
    const res = await record().expect(201);

    expect(res.body.computation.amount).toBe('200000');
    expect(res.body.computation.figures.cash).toBe('4000000');
    expect(res.body.computation.recordedBy).toBe('member-a');
    expect(res.body.computation.recordedAt).toBeTruthy();
    expect(res.body.computation.withdrawnAt).toBeNull();
  });

  it('says in every response that recording is not approving', async () => {
    const res = await record().expect(201);

    expect(res.body.whatRecordingMeans).toContain('was shown these figures');
    expect(res.body.whatRecordingMeans).toContain('not approval of the method');
  });

  it('refuses a period it could never be found by', async () => {
    const res = await record({ periodTo: '' }).expect(400);
    expect(res.body.error).toBe('no_period');
  });

  it('refuses without a source, at the moment of writing it down', async () => {
    const res = await record({ source: '  ' }).expect(400);
    expect(res.body.error).toBe('no_source');
    expect(res.body.message).toContain('one somebody typed');
  });

  it('refuses a figure with no sums behind it', async () => {
    const res = await record({ steps: [] }).expect(400);
    expect(res.body.error).toBe('no_steps');
  });

  it('refuses a board that is not there rather than inventing one', async () => {
    await record({ boardId: 'no-such-board' }).expect(404);
  });

  it('lets a liaison and an advisory member record, because it is not a ruling', async () => {
    await record({}, 'liaison-1').expect(201);
    await record({}, 'advisor-1').expect(201);
  });

  it('does not let an observer record', async () => {
    await record({}, 'watcher').expect(403);
  });

  it('refuses anonymously, like every other route', async () => {
    await request(app).post('/api/computations').send(zakat).expect(401);
  });
});

describe('a correction replaces, and the replaced one stays', () => {
  it('keeps both and marks which is which', async () => {
    const first = (await record().expect(201)).body.computation;
    const second = (
      await record({ amount: '210000', supersedes: first.id }).expect(201)
    ).body.computation;

    const list = await request(app)
      .get('/api/computations?kind=zakat')
      .set('Authorization', as('member-a'))
      .expect(200);

    expect(list.body.history).toHaveLength(2);
    expect(list.body.history[0].state).toBe('superseded');
    expect(list.body.history[0].replacedBy).toBe(second.id);
    expect(list.body.history[1].state).toBe('standing');
    expect(list.body.standing).toEqual([second.id]);

    // The first still says what it said.
    const old = await request(app)
      .get(`/api/computations/${first.id}`)
      .set('Authorization', as('member-a'))
      .expect(200);
    expect(old.body.computation.amount).toBe('200000');
  });

  it('refuses to replace the same one twice', async () => {
    const first = (await record().expect(201)).body.computation;
    await record({ amount: '210000', supersedes: first.id }).expect(201);

    const res = await record({ amount: '220000', supersedes: first.id }).expect(409);
    expect(res.body.error).toBe('already_replaced');
  });

  it('refuses to replace one of another kind', async () => {
    const first = (await record().expect(201)).body.computation;
    const res = await record({ kind: 'purification', supersedes: first.id }).expect(409);
    expect(res.body.error).toBe('wrong_kind');
  });

  it('refuses a replacement for something that is not there, as a bad request', async () => {
    const res = await record({ supersedes: 'nothing-like-this' }).expect(400);
    expect(res.body.error).toBe('no_such_prior');
  });
});

describe('withdrawal marks, and never deletes', () => {
  it('records who withdrew it and why, and leaves the arithmetic alone', async () => {
    const first = (await record().expect(201)).body.computation;

    const res = await request(app)
      .post(`/api/computations/${first.id}/withdraw`)
      .set('Authorization', as('member-b'))
      .send({ reason: REASON })
      .expect(200);

    expect(res.body.computation.withdrawnBy).toBe('member-b');
    expect(res.body.computation.withdrawalReason).toBe(REASON);
    expect(res.body.computation.amount).toBe('200000');
  });

  it('drops it from what stands while keeping it in the history', async () => {
    const first = (await record().expect(201)).body.computation;
    await request(app)
      .post(`/api/computations/${first.id}/withdraw`)
      .set('Authorization', as('member-a'))
      .send({ reason: REASON })
      .expect(200);

    const list = await request(app)
      .get('/api/computations')
      .set('Authorization', as('member-a'))
      .expect(200);

    expect(list.body.standing).toEqual([]);
    expect(list.body.history).toHaveLength(1);
    expect(list.body.history[0].state).toBe('withdrawn');
  });

  it('will not take "wrong" as a reason', async () => {
    const first = (await record().expect(201)).body.computation;
    await request(app)
      .post(`/api/computations/${first.id}/withdraw`)
      .set('Authorization', as('member-a'))
      .send({ reason: 'wrong' })
      .expect(400);
  });

  it('refuses to withdraw the same one twice', async () => {
    const first = (await record().expect(201)).body.computation;
    const pull = () =>
      request(app)
        .post(`/api/computations/${first.id}/withdraw`)
        .set('Authorization', as('member-a'))
        .send({ reason: REASON });

    await pull().expect(200);
    const again = await pull().expect(409);
    expect(again.body.error).toBe('already_withdrawn');
  });

  it('does not let an observer withdraw', async () => {
    const first = (await record().expect(201)).body.computation;
    await request(app)
      .post(`/api/computations/${first.id}/withdraw`)
      .set('Authorization', as('watcher'))
      .send({ reason: REASON })
      .expect(403);
  });

  it('reports a computation that is not there rather than inventing one', async () => {
    await request(app)
      .post('/api/computations/nothing-like-this/withdraw')
      .set('Authorization', as('member-a'))
      .send({ reason: REASON })
      .expect(404);
  });
});

describe('what the record refuses to say about itself', () => {
  it('reaches no verdict anywhere in a listing', async () => {
    await record().expect(201);
    const list = await request(app)
      .get('/api/computations')
      .set('Authorization', as('member-a'))
      .expect(200);

    const text = JSON.stringify(list.body).toLowerCase();
    for (const claim of ['halal', 'haram', 'is compliant', 'approved by the board', 'therefore']) {
      expect(text).not.toContain(claim);
    }
  });

  it('separates one holding’s calculations from another’s', async () => {
    await record({ kind: 'purification', assetId: 'asset-mixed-pool', amount: '10' }).expect(201);
    await record({ kind: 'purification', assetId: 'asset-other', amount: '20' }).expect(201);

    const res = await request(app)
      .get('/api/computations?assetId=asset-other')
      .set('Authorization', as('member-a'))
      .expect(200);

    expect(res.body.history).toHaveLength(1);
    expect(res.body.history[0].computation.amount).toBe('20');
  });
});
