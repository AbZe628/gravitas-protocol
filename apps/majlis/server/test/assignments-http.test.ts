import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import { hashPassword } from '../src/auth/members.js';
import { boards, incidents, matters, rules } from '../src/data/seed.js';
import { submissions, undertakings } from '../src/data/seed-work.js';

/**
 * Placing work with a person, over HTTP, against the seeded board.
 *
 * The seed rather than a board written for the test, because one fault this
 * is written against lives in the seed's shape: the board's own list carries
 * the bank's liaison as a member, and a route that checked only that list
 * would place board work with the other side of the table.
 */

const PASSWORD = 'a board credential';
const secret = hashPassword(PASSWORD);

const MEMBERS = [
  'member-a:signatory+chair',
  'member-b:signatory',
  'member-c:signatory',
  'member-d:signatory',
  'advisor-1:advisory',
  'liaison-1:liaison',
]
  .map((entry) => `${entry}:${secret}`)
  .join('\n');

const as = (who: string) => 'Basic ' + Buffer.from(`${who}:${PASSWORD}`).toString('base64');

/** Reported, not yet determined: every step on the board's side is ahead or open. */
const FRESH = 'incident-2026-09-06';
/** Determined and endorsed: the Directors are the institution's, and determining is behind it. */
const LATER = 'incident-2026-08-14';

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
  app = createApp(
    new MemoryStore({
      boards,
      matters,
      rules,
      incidents,
      submissions,
      undertakings,
      briefings: [],
    }),
  );
});

afterEach(() => {
  process.env.MAJLIS_MEMBERS = saved.members;
  process.env.BASIC_AUTH_USER = saved.user;
  process.env.BASIC_AUTH_PASSWORD = saved.pass;
});

const place = (who: string, body: Record<string, unknown>) =>
  request(app)
    .post('/api/assignments')
    .set('Authorization', as(who))
    .send({ ofKind: 'breach', ofId: FRESH, ...body });

const passageOf = async (id: string) => {
  const res = await request(app).get(`/api/incidents/${id}/passage`).set('Authorization', as('member-b'));
  expect(res.status).toBe(200);
  return {
    holder: res.body.holder as { to: string } | null,
    steps: (res.body.groups as { steps: { key: string; whose: string; who?: string }[] }[]).flatMap(
      (g) => g.steps,
    ),
  };
};

describe('the four acts', () => {
  it('lets a member take what nobody holds, and the breach says so', async () => {
    const res = await place('member-b', { to: 'member-b' });
    expect(res.status).toBe(201);
    expect(res.body.how).toBe('taken');

    const passage = await passageOf(FRESH);
    expect(passage.holder?.to).toBe('member-b');
    // No step of a breach carries the name: the finding is every signatory's,
    // and the plan is the institution's.
    for (const s of passage.steps) expect(s.who, s.key).toBeUndefined();
  });

  it('refuses a colleague taking it out of the holder’s hands', async () => {
    await place('member-b', { to: 'member-b' });
    const res = await place('member-c', { to: 'member-c' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('held_by_somebody_else');
  });

  it('lets the holder hand it on, the chair move it, and the holder put it back', async () => {
    await place('member-b', { to: 'member-b' });

    const handed = await place('member-b', { to: 'member-c' });
    expect(handed.status).toBe(201);
    expect(handed.body.how).toBe('handed_on');

    const moved = await place('member-a', { to: 'member-d' });
    expect(moved.status).toBe(201);

    const back = await place('member-d', { to: null });
    expect(back.status).toBe(201);
    expect(back.body.how).toBe('released');

    expect((await passageOf(FRESH)).holder).toBeNull();

    // And the whole of it is still in the record, in order.
    const record = await request(app)
      .get('/api/assignments')
      .query({ ofId: FRESH })
      .set('Authorization', as('member-b'));
    expect(record.body.assignments.map((a: { to: string | null }) => a.to)).toEqual([
      'member-b',
      'member-c',
      'member-d',
      null,
    ]);
  });

  it('puts the holder on the queue row, so what needs you can find it', async () => {
    await place('member-b', { to: 'member-b' });
    const res = await request(app).get('/api/queue').set('Authorization', as('member-b'));
    const row = (res.body.rows ?? res.body).find(
      (r: { kind: string; id: string }) => r.kind === 'breach' && r.id === FRESH,
    );
    expect(row?.holder).toBe('member-b');
  });
});

describe('on a matter', () => {
  it('puts the holder on the matter’s own passage', async () => {
    const open = matters.find(
      (m) => m.boardId === 'demo-board' && ['deliberation', 'draft'].includes(m.status),
    );
    expect(open, 'the seed has no open matter to take').toBeTruthy();

    const res = await request(app)
      .post('/api/assignments')
      .set('Authorization', as('member-c'))
      .send({ ofKind: 'matter', ofId: open!.id, to: 'member-c' });
    expect(res.status).toBe(201);

    const passage = await request(app)
      .get(`/api/matters/${open!.id}/passage`)
      .set('Authorization', as('member-b'));
    const named = (passage.body.groups as { steps: { who?: string }[] }[])
      .flatMap((g) => g.steps)
      .filter((s) => s.who === 'member-c');
    expect(named.length).toBeGreaterThan(0);
  });
});

describe('what cannot be placed', () => {
  it('refuses the bank’s liaison, although the board’s own list carries them', async () => {
    const res = await place('member-a', { to: 'liaison-1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('not_a_member');
  });

  it('refuses the liaison placing board work at all', async () => {
    const res = await place('liaison-1', { to: 'member-b' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('not_a_member');
  });

  it('refuses somebody nobody has heard of', async () => {
    const res = await place('member-a', { to: 'member-zz' });
    expect(res.status).toBe(400);
  });

  it('refuses a thing that is not there, or not of the kind named', async () => {
    expect((await place('member-b', { ofId: 'incident-nonsense', to: 'member-b' })).status).toBe(404);
    const matterId = matters[0].id;
    expect((await place('member-b', { ofId: matterId, to: 'member-b' })).status).toBe(404);
  });

  it('refuses a step the thing does not have', async () => {
    const res = await place('member-b', { stepKey: 'nonsense', to: 'member-b' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('no_such_step');
  });

  it('refuses the institution’s step, and a step already behind it', async () => {
    const theirs = await place('member-a', { ofId: LATER, stepKey: 'directors', to: 'member-b' });
    expect(theirs.status).toBe(400);
    expect(theirs.body.error).toBe('not_placeable');

    const done = await place('member-a', { ofId: LATER, stepKey: 'determine', to: 'member-b' });
    expect(done.status).toBe(400);
    expect(done.body.error).toBe('not_placeable');
  });

  it('refuses a signatory’s step on its own — each signatory does it for themselves', async () => {
    const res = await place('member-a', { stepKey: 'determine', to: 'member-b' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('not_placeable');

    // Carrying the whole breach, though, anybody on this side may — an advisory member too.
    expect((await place('member-a', { to: 'advisor-1' })).status).toBe(201);
  });

  it('refuses taking on what has nothing left for the board, but lets a holder let go of it', async () => {
    const closed = 'incident-2025-11-03';
    const res = await place('member-b', { ofId: closed, to: 'member-b' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('nothing_to_hold');
    expect((await place('member-b', { ofId: closed, to: null })).status).toBe(201);
  });
});

/**
 * What the screen offers is exactly what the route accepts.
 *
 * ── the fault this holds shut ─────────────────────────────────────────────
 *
 * Each step of a passage now says whether it can be placed with somebody, and
 * the screen draws a control only where it says yes. That field was written
 * the wider way — every step on this side of the table — and the route allows
 * a narrower set: a breach has no step of the board's own, so *take this step*
 * appeared on every one of them and the server answered *each signatory does
 * that for themselves, so it is nobody's to hold*.
 *
 * A control that cannot be honoured is absent, not disabled, and the only way
 * to be sure of that is to ask the route. So this walks every step of every
 * kind, offers it, and holds the two answers against each other.
 */
describe('a step the passage says can be placed, and one it does not', () => {
  const kinds = [
    { ofKind: 'breach', ofId: FRESH, at: '/api/incidents/' + FRESH + '/passage' },
    { ofKind: 'matter', ofId: 'matter-2026-07-03', at: '/api/matters/matter-2026-07-03/passage' },
    { ofKind: 'question', ofId: 'submission-2026-08-25', at: '/api/passages/question/submission-2026-08-25' },
    { ofKind: 'undertaking', ofId: 'undertaking-2026-08-20-a', at: '/api/passages/undertaking/undertaking-2026-08-20-a' },
    { ofKind: 'review', ofId: 'rule-tangible-ratio', at: '/api/passages/review/rule-tangible-ratio' },
  ];

  it('agrees with the route on every step of every kind', async () => {
    let offered = 0;
    let withheld = 0;

    for (const { ofKind, ofId, at } of kinds) {
      const read = await request(app).get(at).set('Authorization', as('member-b'));
      expect(read.status, at).toBe(200);
      const steps = (read.body.groups as { steps: { key: string; holdable?: boolean }[] }[]).flatMap(
        (g) => g.steps,
      );
      expect(steps.length, at + ' has no steps').toBeGreaterThan(0);

      for (const step of steps) {
        const res = await request(app)
          .post('/api/assignments')
          .set('Authorization', as('member-b'))
          .send({ ofKind, ofId, stepKey: step.key, to: 'member-b' });

        if (step.holdable) {
          offered++;
          expect(res.status, ofKind + ' ' + step.key + ' is offered and was refused: ' + JSON.stringify(res.body)).toBe(201);
          // Put it back, so the next step of the same thing starts clean.
          await request(app)
            .post('/api/assignments')
            .set('Authorization', as('member-b'))
            .send({ ofKind, ofId, stepKey: step.key, to: null });
        } else {
          withheld++;
          expect(res.status, ofKind + ' ' + step.key + ' is not offered and was accepted').not.toBe(201);
        }
      }
    }

    // Both halves were exercised: all-yes or all-no would prove nothing.
    expect(offered, 'no step anywhere was offered').toBeGreaterThan(0);
    expect(withheld, 'every step was offered, so the refusing half was never reached').toBeGreaterThan(0);
  });
});
