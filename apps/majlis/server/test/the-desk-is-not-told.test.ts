import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import { hashPassword } from '../src/auth/members.js';
import { boards, incidents, matters, rules } from '../src/data/seed.js';
import { submissions, undertakings } from '../src/data/seed-work.js';

/**
 * A bank desk is never told who on the board holds anything, and never told
 * about another desk's question.
 *
 * ── the fault ─────────────────────────────────────────────────────────────
 *
 * Asked with a desk's credential, after every test had passed: the passage
 * routes, the queue and the assignment record all named the member holding
 * each thing, and the passage route for questions answered with every
 * question on the board — though `/submissions` has always fenced a desk to
 * the questions it recorded, because two desks at one bank should not share a
 * queue.
 *
 * Who holds a question is the board's business. A desk that knew which
 * scholar had its question would know whom to approach, and a board whose
 * members can be approached one at a time is not independent in the way the
 * bank is paying for.
 *
 * Every check here is made twice: as the desk, where the holder must be
 * absent, and as a member, where it must be present. The second is what makes
 * the first mean anything.
 */

const PASSWORD = 'a board credential';
const secret = hashPassword(PASSWORD);
const MEMBERS = ['member-a:signatory+chair', 'member-b:signatory', 'desk-treasury:institution']
  .map((e) => `${e}:${secret}`)
  .join('\n');
const as = (who: string) => 'Basic ' + Buffer.from(`${who}:${PASSWORD}`).toString('base64');

const template = submissions[0];
const OURS = { ...template, id: 'q-ours', recordedBy: 'desk-treasury', dispositions: [] };
const THEIRS = { ...template, id: 'q-theirs', recordedBy: 'desk-other', dispositions: [] };
const MATTER = 'matter-2026-07-03';

let app: Express;
const saved = { members: process.env.MAJLIS_MEMBERS, user: process.env.BASIC_AUTH_USER };

beforeEach(async () => {
  process.env.MAJLIS_MEMBERS = MEMBERS;
  delete process.env.BASIC_AUTH_USER;
  app = createApp(
    new MemoryStore({
      boards,
      matters,
      rules,
      incidents,
      submissions: [OURS, THEIRS],
      undertakings,
      briefings: [],
    }),
  );
  // The chair places everything with member-b.
  for (const [ofKind, ofId] of [
    ['question', 'q-ours'],
    ['question', 'q-theirs'],
    ['matter', MATTER],
    ['breach', incidents[2].id],
  ]) {
    const res = await request(app)
      .post('/api/assignments')
      .set('Authorization', as('member-a'))
      .send({ ofKind, ofId, to: 'member-b' });
    expect(res.status, `${ofKind} ${ofId}: ${JSON.stringify(res.body)}`).toBe(201);
  }
});

afterEach(() => {
  process.env.MAJLIS_MEMBERS = saved.members;
  if (saved.user !== undefined) process.env.BASIC_AUTH_USER = saved.user;
});

const get = (who: string, path: string) => request(app).get(path).set('Authorization', as(who));

type P = { of: { id: string }; holder?: { to: string } | null; groups: { steps: { who?: string }[] }[] };
const namesAnybody = (p: P) =>
  Boolean(p.holder) || p.groups.some((g) => g.steps.some((s) => s.who === 'member-b'));

describe('what a desk is told', () => {
  it('is answered on the queue with its own questions, and nothing of the board’s', async () => {
    /*
     * It was the board's whole queue: every matter and breach, every
     * undertaking with the member who gave it, and the other desk's question.
     */
    type Row = { kind: string; id: string };
    const desk = (await get('desk-treasury', '/api/queue')).body.rows as Row[];
    expect(desk.map((r) => `${r.kind} ${r.id}`)).toEqual(['question q-ours']);

    const member = (await get('member-b', '/api/queue')).body.rows as Row[];
    const kinds = new Set(member.map((r) => r.kind));
    expect(member.map((r) => r.id)).toEqual(expect.arrayContaining(['q-ours', 'q-theirs']));
    expect(kinds.has('matter') && kinds.has('breach')).toBe(true);
  });

  it('reads the passages of its own questions only, and nobody’s name on them', async () => {
    const desk = await get('desk-treasury', '/api/passages/question');
    expect(desk.status).toBe(200);
    expect((desk.body.passages as P[]).map((p) => p.of.id)).toEqual(['q-ours']);
    expect((desk.body.passages as P[]).some(namesAnybody)).toBe(false);

    const member = await get('member-b', '/api/passages/question');
    expect((member.body.passages as P[]).map((p) => p.of.id).sort()).toEqual(['q-ours', 'q-theirs']);
    expect((member.body.passages as P[]).every(namesAnybody)).toBe(true);
  });

  it('is told another desk’s question does not exist', async () => {
    expect((await get('desk-treasury', '/api/passages/question/q-theirs')).status).toBe(404);
    const ours = await get('desk-treasury', '/api/passages/question/q-ours');
    expect(ours.status).toBe(200);
    expect(namesAnybody(ours.body)).toBe(false);
    expect(namesAnybody((await get('member-b', '/api/passages/question/q-ours')).body)).toBe(true);
  });

  it('is refused the assignment record', async () => {
    expect((await get('desk-treasury', '/api/assignments')).status).toBe(403);
    expect((await get('member-b', '/api/assignments')).status).toBe(200);
  });

  it('is told nobody’s name on a matter or a breach', async () => {
    for (const path of [`/api/matters/${MATTER}/passage`, `/api/incidents/${incidents[2].id}/passage`]) {
      const desk = await get('desk-treasury', path);
      expect(desk.status, path).toBe(200);
      expect(namesAnybody(desk.body), path).toBe(false);
      expect(namesAnybody((await get('member-b', path)).body), path).toBe(true);
    }
  });

  it('is told nobody’s name on the queue', async () => {
    type Row = { kind: string; id: string; holder?: string; who?: string };
    const desk = (await get('desk-treasury', '/api/queue')).body.rows as Row[];
    expect(desk.filter((r) => r.holder || r.who)).toEqual([]);

    const member = (await get('member-b', '/api/queue')).body.rows as Row[];
    expect(member.filter((r) => r.holder === 'member-b').length).toBeGreaterThan(0);
  });
});
