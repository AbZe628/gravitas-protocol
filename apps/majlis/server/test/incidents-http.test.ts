import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import { hashPassword } from '../src/auth/members.js';

/**
 * The nine steps over HTTP, including who may not take each of them.
 *
 * The board here is the seeded demonstration board: quorumRestrict 2, which is
 * the threshold a determination and an endorsement each need.
 */

const PASSWORD = 'a board credential';
const secret = hashPassword(PASSWORD);

const MEMBERS = [
  'member-a:signatory+chair',
  'member-b:signatory',
  'member-c:signatory',
  'liaison-1:liaison',
  'clerk:advisory+secretary',
  'advisor-1:advisory',
  'watcher:observer',
]
  .map((entry) => `${entry}:${secret}`)
  .join('\n');

const as = (who: string) => 'Basic ' + Buffer.from(`${who}:${PASSWORD}`).toString('base64');
const REASON = 'The deposits were priced from an interest benchmark the approval did not permit.';

let app: Express;
const saved = { members: process.env.MAJLIS_MEMBERS, user: process.env.BASIC_AUTH_USER, pass: process.env.BASIC_AUTH_PASSWORD };

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

async function report(who = 'member-a') {
  const res = await request(app)
    .post('/api/incidents')
    .set('Authorization', as(who))
    .send({
      boardId: 'demo-board',
      reference: 'SNC-2026-001',
      title: 'Retail deposit mispricing',
      report: 'Deposits were priced from a benchmark outside the approved method.',
    })
    .expect(201);
  return res.body.id as string;
}

const concur = (id: string, who: string, actual = true) =>
  request(app).post(`/api/incidents/${id}/concurrence`).set('Authorization', as(who)).send({ actual, reason: REASON });

async function determined() {
  const id = await report();
  await concur(id, 'member-a').expect(200);
  await concur(id, 'member-b').expect(200);
  return id;
}

describe('reporting', () => {
  it('starts at "reported", with no finding and no clock', async () => {
    const id = await report();
    const res = await request(app).get(`/api/incidents/${id}`).set('Authorization', as('watcher')).expect(200);

    expect(res.body.stage).toBe('reported');
    expect(res.body.actual).toBeNull();
    expect(res.body.clock).toBeNull();
    expect(res.body.reportedBy).toBe('member-a');
  });

  it('takes the reporter from the credential, not from the body', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .set('Authorization', as('member-b'))
      .send({
        boardId: 'demo-board', reference: 'SNC-9', title: 'Something',
        report: 'An account of it.', reportedBy: 'member-a',
      })
      .expect(201);
    expect(res.body.reportedBy).toBe('member-b');
  });

  it('lets a liaison report, and refuses an observer', async () => {
    await report('liaison-1');
    await request(app)
      .post('/api/incidents')
      .set('Authorization', as('watcher'))
      .send({ boardId: 'demo-board', reference: 'X', title: 'Something', report: 'An account.' })
      .expect(403);
  });

  it('refuses a board that does not exist', async () => {
    await request(app)
      .post('/api/incidents')
      .set('Authorization', as('member-a'))
      .send({ boardId: 'no-such-board', reference: 'X', title: 'Something', report: 'An account.' })
      .expect(404);
  });
});

describe('the determination, and who may make it', () => {
  it('needs the restricting quorum, then starts the clock', async () => {
    const id = await report();

    const one = await concur(id, 'member-a').expect(200);
    expect(one.body.stage).toBe('reported');
    expect(one.body.clock).toBeNull();

    const two = await concur(id, 'member-b').expect(200);
    expect(two.body.stage).toBe('determined');
    expect(two.body.actual).toBe(true);
    expect(two.body.clock.daysRemaining).toBe(30);
    expect(two.body.clock.overdue).toBe(false);
  });

  it('refuses everyone who is not a signatory, including the secretary', async () => {
    const id = await report();
    for (const who of ['clerk', 'liaison-1', 'advisor-1', 'watcher']) {
      const res = await request(app)
        .post(`/api/incidents/${id}/concurrence`)
        .set('Authorization', as(who))
        .send({ actual: true, reason: REASON })
        .expect(403);
      expect(res.body.error).toBe('role_not_permitted');
    }
  });

  it('refuses a position with no written reason', async () => {
    const id = await report();
    const res = await request(app)
      .post(`/api/incidents/${id}/concurrence`)
      .set('Authorization', as('member-a'))
      .send({ actual: true, reason: 'yes' })
      .expect(400);
    expect(res.body.error).toBe('no_reason_given');
  });

  it('reaches "not a non-compliance" only through the same threshold', async () => {
    const id = await report();
    await concur(id, 'member-a', false).expect(200);
    const two = await concur(id, 'member-b', false).expect(200);

    expect(two.body.stage).toBe('not_actual');
    expect(two.body.actual).toBe(false);
    expect(two.body.clock).toBeNull();
  });
});

describe('the acts that belong to the institution', () => {
  it('refuses a plan from a signatory, and accepts one from the secretary', async () => {
    const id = await determined();

    const refused = await request(app)
      .post(`/api/incidents/${id}/plan`)
      .set('Authorization', as('member-a'))
      .send({ steps: ['reprice the book'], completeBy: '2026-10-01' })
      .expect(403);
    expect(refused.body.message).toContain('belong to the institution');

    const filed = await request(app)
      .post(`/api/incidents/${id}/plan`)
      .set('Authorization', as('clerk'))
      .send({ steps: ['reprice the book'], completeBy: '2026-10-01' })
      .expect(200);
    expect(filed.body.stage).toBe('plan_filed');
    expect(filed.body.plans).toHaveLength(1);
  });

  it('refuses the Directors’ approval and the regulator filing from the board', async () => {
    const id = await determined();
    await request(app).post(`/api/incidents/${id}/directors`).set('Authorization', as('member-a')).expect(403);
    await request(app).post(`/api/incidents/${id}/submission`).set('Authorization', as('member-a')).expect(403);
  });

  it('will not record a submission before the Directors have approved', async () => {
    const id = await determined();
    await request(app)
      .post(`/api/incidents/${id}/plan`)
      .set('Authorization', as('clerk'))
      .send({ steps: ['reprice'], completeBy: '2026-10-01' })
      .expect(200);

    const res = await request(app)
      .post(`/api/incidents/${id}/submission`)
      .set('Authorization', as('clerk'))
      .expect(409);
    expect(res.body.error).toBe('wrong_stage');
  });
});

describe('the whole nine steps', () => {
  it('runs end to end and refuses to close while the money is still owed', async () => {
    const id = await determined();

    await request(app)
      .post(`/api/incidents/${id}/stopped`)
      .set('Authorization', as('member-a'))
      .send({ activities: ['retail deposits', 'term deposits on the same method'] })
      .expect(200);

    await request(app)
      .post(`/api/incidents/${id}/plan`)
      .set('Authorization', as('clerk'))
      .send({ steps: ['reprice', 'refund the difference'], completeBy: '2026-10-01' })
      .expect(200);

    await request(app).post(`/api/incidents/${id}/plan/endorse`).set('Authorization', as('member-a')).expect(200);
    const endorsed = await request(app)
      .post(`/api/incidents/${id}/plan/endorse`)
      .set('Authorization', as('member-b'))
      .expect(200);
    expect(endorsed.body.stage).toBe('endorsed');

    await request(app)
      .post(`/api/incidents/${id}/purification`)
      .set('Authorization', as('member-a'))
      .send({ amount: '12480.55', currency: 'EUR', destination: 'A registered charity' })
      .expect(200);

    await request(app).post(`/api/incidents/${id}/directors`).set('Authorization', as('clerk')).expect(200);
    await request(app).post(`/api/incidents/${id}/submission`).set('Authorization', as('clerk')).expect(200);

    const early = await request(app).post(`/api/incidents/${id}/close`).set('Authorization', as('member-a')).expect(409);
    expect(early.body.error).toBe('purification_outstanding');
    expect(early.body.message).toContain('12480.55');

    await request(app)
      .post(`/api/incidents/${id}/purification/paid`)
      .set('Authorization', as('clerk'))
      .send({ reference: 'TX-9' })
      .expect(200);

    const closed = await request(app).post(`/api/incidents/${id}/close`).set('Authorization', as('member-a')).expect(200);
    expect(closed.body.stage).toBe('closed');
  });

  it('keeps a returned plan in the record and does not restart the clock', async () => {
    const id = await determined();
    const before = (await request(app).get(`/api/incidents/${id}`).set('Authorization', as('member-a'))).body.clock.deadline;

    await request(app)
      .post(`/api/incidents/${id}/plan`)
      .set('Authorization', as('clerk'))
      .send({ steps: ['reprice'], completeBy: '2026-10-01' })
      .expect(200);
    await request(app).post(`/api/incidents/${id}/plan/endorse`).set('Authorization', as('member-a')).expect(200);

    const returned = await request(app)
      .post(`/api/incidents/${id}/plan/return`)
      .set('Authorization', as('member-b'))
      .send({ reason: 'The repricing does not address the term book, which shares the defect.' })
      .expect(200);

    expect(returned.body.stage).toBe('determined');
    expect(returned.body.plans).toHaveLength(1);
    expect(returned.body.plans[0].returnedReason).toContain('term book');
    expect(returned.body.plans[0].endorsedAt).toBeNull();

    const after = (await request(app).get(`/api/incidents/${id}`).set('Authorization', as('member-a'))).body;
    expect(after.clock.deadline).toBe(before);
    expect(after.plan).toBeNull();
  });
});

describe('the list and the year', () => {
  it('counts what is waiting on the board', async () => {
    await report();
    await determined();

    const res = await request(app).get('/api/incidents').set('Authorization', as('watcher')).expect(200);
    expect(res.body.count).toBe(2);
    expect(res.body.awaitingDetermination).toBe(1);
    expect(res.body.overdue).toBe(0);
  });

  it('discloses the year, counting breaches and leaving out what was cleared', async () => {
    await determined();

    const cleared = await report();
    await concur(cleared, 'member-a', false).expect(200);
    await concur(cleared, 'member-b', false).expect(200);

    const year = new Date().getUTCFullYear();
    const res = await request(app)
      .get(`/api/disclosure?year=${year}`)
      .set('Authorization', as('watcher'))
      .expect(200);

    expect(res.body.count).toBe(1);
    expect(res.body.events[0].nature).toBe('Retail deposit mispricing');
  });

  it('refuses a year that is not one', async () => {
    const res = await request(app).get('/api/disclosure?year=nope').set('Authorization', as('member-a')).expect(400);
    expect(res.body.error).toBe('bad_year');
  });

  it('refuses anonymously, like every other route', async () => {
    await request(app).get('/api/incidents').expect(401);
    await request(app).post('/api/incidents').send({}).expect(401);
  });
});
