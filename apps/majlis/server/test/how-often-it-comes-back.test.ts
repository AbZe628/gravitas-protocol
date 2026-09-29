import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import { hashPassword } from '../src/auth/members.js';
import { boards, incidents, matters, rules } from '../src/data/seed.js';
import { submissions, undertakings } from '../src/data/seed-work.js';

/**
 * The board says how often a ruling comes back, over HTTP.
 *
 * ── the fault this holds shut ─────────────────────────────────────────────
 *
 * A ruling in force with no review interval said *nothing will bring this back
 * before the board*, and the passage carried that as an open step of the
 * board's own — so it sat in every signatory's queue. Nothing in the whole
 * application wrote a rule: no route, and no method on the store. The one
 * piece of work the clock creates by itself was the one piece nobody could do.
 *
 * Found by opening the ruling in the browser and looking for the button. The
 * only act on the step was *look at this again*, which opens a matter about
 * the ruling and answers a different question.
 */

const PASSWORD = 'a board credential';
const secret = hashPassword(PASSWORD);

const MEMBERS = ['member-a:signatory+chair', 'member-b:signatory', 'advisor-1:advisory', 'liaison-1:liaison']
  .map((entry) => `${entry}:${secret}`)
  .join('\n');

const as = (who: string) => 'Basic ' + Buffer.from(`${who}:${PASSWORD}`).toString('base64');

let app: Express;
const saved = { members: process.env.MAJLIS_MEMBERS };

beforeEach(() => {
  process.env.MAJLIS_MEMBERS = MEMBERS;
  app = createApp(
    new MemoryStore({ boards, matters, rules, incidents, submissions, undertakings, briefings: [] }),
  );
});

afterEach(() => {
  process.env.MAJLIS_MEMBERS = saved.members;
});

/** A ruling in force with nothing bringing it back. The seed has three. */
const RULE = 'rule-tangible-ratio';

const say = (who: string, body: Record<string, unknown>) =>
  request(app).post(`/api/rules/${RULE}/interval`).set('Authorization', as(who)).send(body);

const stepsOf = async () => {
  const res = await request(app)
    .get(`/api/passages/review/${RULE}`)
    .set('Authorization', as('member-b'));
  expect(res.status).toBe(200);
  return (res.body.groups as { steps: { key: string; state: string }[] }[]).flatMap((g) => g.steps);
};

describe('a ruling with nothing bringing it back', () => {
  it('has that step open before anybody answers, or this proves nothing', async () => {
    const interval = (await stepsOf()).find((s) => s.key === 'interval');
    expect(interval?.state).toBe('open');
  });

  it('closes the step once the board has said how often', async () => {
    const res = await say('member-a', {
      everyMonths: 6,
      reason: 'The ratio it rests on is reported each quarter.',
    });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.review.state, 'still reads as nobody having answered').not.toBe('unscheduled');
    expect(res.body.review.everyMonths).toBe(6);
    expect(res.body.rule.reviewEveryMonths).toBe(6);

    const interval = (await stepsOf()).find((s) => s.key === 'interval');
    expect(interval?.state, 'the step is still open after the board answered it').toBe('done');
  });

  it('closes it just the same when the board says it is not on a clock', async () => {
    const res = await say('member-a', {
      everyMonths: null,
      reason: 'The structure has not moved in twenty years.',
    });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.review.state).toBe('no_clock');

    const interval = (await stepsOf()).find((s) => s.key === 'interval');
    expect(interval?.state).toBe('done');
  });

  it('keeps each saying, so what was decided before is still readable', async () => {
    await say('member-a', { everyMonths: 12, reason: 'Annual, to begin with.' });
    const res = await say('member-b', { everyMonths: 3, reason: 'Quarterly after the near miss.' });

    expect(res.body.rule.reviewIntervals).toHaveLength(2);
    expect(res.body.rule.reviewIntervals[0]).toMatchObject({ everyMonths: 12, by: 'member-a' });
    expect(res.body.rule.reviewIntervals[1]).toMatchObject({ everyMonths: 3, by: 'member-b' });
    expect(res.body.rule.reviewEveryMonths).toBe(3);
  });
});

describe('who may say it, and what is not an interval', () => {
  it('refuses anybody but a signatory', async () => {
    for (const who of ['advisor-1', 'liaison-1']) {
      const res = await say(who, { everyMonths: 6, reason: 'Because.' });
      expect(res.status, who).toBe(403);
    }
  });

  it('refuses nought, a fraction, and a wait longer than five years', async () => {
    for (const bad of [0, -1, 2.5, 61]) {
      const res = await say('member-a', { everyMonths: bad, reason: 'Because.' });
      expect(res.status, String(bad)).toBeGreaterThanOrEqual(400);
    }
    // And the ruling is untouched by any of them.
    const read = await request(app).get(`/api/rules/${RULE}/review`).set('Authorization', as('member-b'));
    expect(read.body.state).toBe('unscheduled');
  });

  it('refuses it with no reason, because the next board will ask why', async () => {
    const res = await say('member-a', { everyMonths: 6 });
    expect(res.status).toBe(400);
  });

  it('refuses a ruling that is not there', async () => {
    const res = await request(app)
      .post('/api/rules/nothing-like-this/interval')
      .set('Authorization', as('member-a'))
      .send({ everyMonths: 6, reason: 'Because.' });
    expect(res.status).toBe(404);
  });
});
