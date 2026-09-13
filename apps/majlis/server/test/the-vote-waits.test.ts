import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import { hashPassword } from '../src/auth/members.js';
import { structures } from '../src/data/structures.js';

/**
 * The vote does not open while a condition is unanswered.
 *
 * ── the promise this keeps ────────────────────────────────────────────────
 *
 * A board that votes with conditions unexamined has voted on something it has
 * not read, and the written ruling that follows names those conditions as the
 * basis of the decision. So this is a refusal and not a warning: a warning is
 * a screen asking a chair to hold themselves to something while the button
 * stays lit.
 *
 * ── and what counts as answered ───────────────────────────────────────────
 *
 * A board may decide a condition does not apply. That is an answer, recorded
 * with the board's reason and carried onto the ruling under what it does not
 * decide. What is refused is silence — a condition nobody looked at.
 *
 * A matter judged against no shape has no conditions and is not held up. That
 * is an ordinary matter, not an unexamined one, and a gate that stopped it
 * would stop most of the board's work for a rule that does not apply to it.
 */

const PASSWORD = 'a board credential';
const secret = hashPassword(PASSWORD);

const MEMBERS = ['member-a:signatory', 'member-b:signatory', 'member-c:signatory']
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

/** A shape with the fewest conditions, so the test says what it means quickly. */
const shape = [...structures].sort((a, b) => a.conditions.length - b.conditions.length)[0];

async function aMatter(over: Record<string, unknown> = {}) {
  const made = await request(app)
    .post('/api/matters')
    .set('Authorization', as('member-a'))
    .send({
      boardId: 'demo-board',
      title: 'Whether this arrangement may be offered',
      proposal: 'The board is asked whether the arrangement as described may be offered.',
      direction: 'permit',
      origin: 'institution_request',
      ...over,
    });
  expect(made.status).toBe(201);
  const id = made.body.id as string;

  await request(app).post(`/api/matters/${id}/open`).set('Authorization', as('member-a')).expect(200);
  await request(app)
    .post(`/api/matters/${id}/deliberation`)
    .set('Authorization', as('member-a'))
    .send({ body: 'A point about the mechanism, at some length, so the vote is not refused for silence.' })
    .expect(201);

  return id;
}

const judgeAgainst = (id: string, structureId: string | null) =>
  request(app)
    .put(`/api/matters/${id}/structure`)
    .set('Authorization', as('member-a'))
    .send({ structureId });

const answer = (id: string, conditionId: string, holds: string, reason: string) =>
  request(app)
    .post(`/api/matters/${id}/findings`)
    .set('Authorization', as('member-a'))
    .send({ conditionId, holds, reason });

const openTheVote = (id: string) =>
  request(app).post(`/api/matters/${id}/voting`).set('Authorization', as('member-a'));

describe('a vote on a shape waits for its conditions', () => {
  it('is refused while any condition has no answer', async () => {
    const id = await aMatter();
    await judgeAgainst(id, shape.id).expect(200);

    const refused = await openTheVote(id);
    expect(refused.status).toBe(409);
    expect(refused.body.error).toBe('conditions_unanswered');
    expect(refused.body.unanswered).toHaveLength(shape.conditions.length);
  });

  it('says how many and in words a chair can act on', async () => {
    const id = await aMatter();
    await judgeAgainst(id, shape.id).expect(200);

    const refused = await openTheVote(id);
    expect(refused.body.message).toMatch(/has not read/);
    expect(refused.body.message).toMatch(/set it aside with a reason/);
  });

  it('opens once every condition has been answered', async () => {
    const id = await aMatter();
    await judgeAgainst(id, shape.id).expect(200);

    for (const condition of shape.conditions) {
      await answer(
        id,
        condition.id,
        'met',
        'The arrangement as described satisfies this, on the documents the bank supplied.',
      ).expect(201);
    }

    await openTheVote(id).expect(200);
  });

  it('counts a condition set aside as answered, because that is a decision', async () => {
    const id = await aMatter();
    await judgeAgainst(id, shape.id).expect(200);

    // Every one set aside rather than met. The board has looked at each and
    // said it does not apply, which is an answer and travels onto the ruling.
    for (const condition of shape.conditions) {
      await answer(
        id,
        condition.id,
        'not_applicable',
        'This arrangement has no such stage, so the condition has nothing to bear on here.',
      ).expect(201);
    }

    await openTheVote(id).expect(200);
  });

  it('holds the vote for the one condition still unanswered', async () => {
    const id = await aMatter();
    await judgeAgainst(id, shape.id).expect(200);

    const [, ...rest] = shape.conditions;
    for (const condition of rest) {
      await answer(id, condition.id, 'met', 'Satisfied on the documents the bank supplied.').expect(201);
    }

    const refused = await openTheVote(id);
    expect(refused.status).toBe(409);
    expect(refused.body.unanswered).toHaveLength(1);
    expect(refused.body.unanswered[0]).toBe(shape.conditions[0].requirement);
  });
});

describe('a matter judged against no shape', () => {
  it('is not held up, because it has no conditions to be unexamined', async () => {
    const id = await aMatter();
    await openTheVote(id).expect(200);
  });

  it('is still not held up after a shape is taken off it again', async () => {
    const id = await aMatter();
    await judgeAgainst(id, shape.id).expect(200);
    expect((await openTheVote(id)).status).toBe(409);

    await judgeAgainst(id, null).expect(200);
    await openTheVote(id).expect(200);
  });
});
