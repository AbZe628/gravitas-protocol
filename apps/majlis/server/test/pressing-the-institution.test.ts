import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import { hashPassword } from '../src/auth/members.js';
import { boards, incidents, matters, rules } from '../src/data/seed.js';
import { submissions, undertakings } from '../src/data/seed-work.js';

/**
 * The board pressing the institution, over HTTP.
 *
 * ── what the screen offered before this ───────────────────────────────────
 *
 * A breach forty-seven days old, thirty-four of them on one step, with the
 * plan endorsed and nothing put to the Board of Directors. The breach's own
 * screen said *awaiting the Directors*, *overdue by 13 days*, and then:
 *
 *     Nobody has taken this on yet.   [ Take this on ]  [ Place with… ]
 *     Waiting on the institution. Nothing here is yours to press.
 *
 * Both controls were wrong and the sentence was the fault. *Take this on*
 * would have put a scholar's name on the bank's own filing; and pressing is
 * exactly what is the board's when the work is the bank's — it is the only
 * thing a Shariah board can do about a step it does not own. Measured by
 * opening the file in the browser, not by reading the code.
 */

const PASSWORD = 'a board credential';
const secret = hashPassword(PASSWORD);

const MEMBERS = [
  'member-a:signatory+chair',
  'member-b:signatory+secretary',
  'member-c:signatory',
  'advisor-1:advisory',
  'liaison-1:liaison',
]
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

/** The seeded breach that is endorsed and sitting with the bank. */
const BREACH = 'incident-2026-08-14';

const WHY = 'Asked the liaison for a date the Directors will take this, in writing.';

const press = (who: string, body: Record<string, unknown>) =>
  request(app).post(`/api/incidents/${BREACH}/press`).set('Authorization', as(who)).send(body);

const chase = (who = 'member-c', step = 'directors', reason = WHY) =>
  press(who, { step, kind: 'chase', reason });

type Step = {
  key: string;
  state: string;
  whose: string;
  pressing?: {
    may: boolean;
    mayRaise: boolean;
    since: string | null;
    days: number | null;
    chases: { by: string; at: string; reason: string }[];
    raised: { by: string; at: string; reason: string } | null;
  };
};

const stepsOf = async (who = 'member-c'): Promise<Step[]> => {
  const res = await request(app).get(`/api/passages/breach/${BREACH}`).set('Authorization', as(who));
  expect(res.status).toBe(200);
  return (res.body.groups as { steps: Step[] }[]).flatMap((g) => g.steps);
};

const stepNamed = async (key: string, who?: string) =>
  (await stepsOf(who)).find((s) => s.key === key);

describe('what the passage offers on a step the board does not own', () => {
  it('says the institution’s open steps may be pressed, and that the board’s own may not', async () => {
    const steps = await stepsOf();

    const owed = steps.filter((s) => s.state === 'open' && s.whose === 'institution');
    const others = steps.filter((s) => !(s.state === 'open' && s.whose === 'institution'));

    // Or this proves nothing: a breach with no institution step outstanding,
    // or with every step pressable, would pass an assertion about either one.
    expect(owed.length, 'nothing is outstanding with the institution here').toBeGreaterThan(0);
    expect(others.length).toBeGreaterThan(0);

    for (const s of owed) expect(s.pressing?.may, s.key).toBe(true);
    for (const s of others) expect(s.pressing, s.key).toBeUndefined();
  });

  it('counts the days from this step’s own turn, not from the report', async () => {
    const directors = await stepNamed('directors');
    const passage = await request(app)
      .get(`/api/passages/breach/${BREACH}`)
      .set('Authorization', as('member-c'));

    // The plan was endorsed on 27 August; the breach was reported on 14 August.
    // The file's age counts the board's own thirteen days, and pressing the
    // bank about those would be the board chasing itself.
    expect(directors?.pressing?.since).toBe('2026-08-27T15:30:00Z');
    expect(directors?.pressing?.days).toBeGreaterThan(0);
    expect(directors?.pressing?.days).toBeLessThan(passage.body.waiting.days);
  });

  it('will not offer raising until somebody has chased', async () => {
    expect((await stepNamed('directors'))?.pressing?.mayRaise).toBe(false);
    await chase();
    expect((await stepNamed('directors'))?.pressing?.mayRaise).toBe(true);
  });
});

describe('pressing, and what it writes down', () => {
  it('keeps every chase, with who and when and why', async () => {
    await chase('member-c');
    await chase('member-b', 'directors', 'Second ask. Copied to the head of compliance this time.');

    const pressing = (await stepNamed('directors'))?.pressing;
    expect(pressing?.chases).toHaveLength(2);
    expect(pressing?.chases[0]).toMatchObject({ by: 'member-c', reason: WHY });
    expect(pressing?.chases[1].by).toBe('member-b');
    expect(pressing?.chases[1].at.length).toBeGreaterThan(0);
  });

  it('changes nothing about where the breach stands', async () => {
    const before = await request(app).get(`/api/incidents/${BREACH}`).set('Authorization', as('member-c'));
    await chase();
    const after = await request(app).get(`/api/incidents/${BREACH}`).set('Authorization', as('member-c'));

    // A chase is a record that the board asked. It does not advance the bank's
    // work, and an application that let it would be closing steps on nothing.
    expect(after.body.stage).toBe(before.body.stage);
    expect(after.body.directorsApprovedAt).toBe(before.body.directorsApprovedAt);
    expect((await stepNamed('directors'))?.state).toBe('open');
  });

  it('keeps each step’s pressing to itself', async () => {
    await chase('member-c', 'directors');

    const purify = await stepNamed('purify');
    expect(purify?.state, 'the seeded breach has nothing outstanding to purify').toBe('open');
    expect(purify?.pressing?.chases).toHaveLength(0);
    expect(purify?.pressing?.mayRaise).toBe(false);
  });
});

describe('raising it to the chair', () => {
  it('is the chair’s, and records what they said', async () => {
    await chase();
    const res = await press('member-a', {
      step: 'directors',
      kind: 'raise',
      reason: 'Taking this to the Directors’ secretary myself, with the endorsement attached.',
    });
    expect(res.status, JSON.stringify(res.body)).toBe(200);

    const pressing = (await stepNamed('directors'))?.pressing;
    expect(pressing?.raised).toMatchObject({ by: 'member-a' });
    expect(pressing?.mayRaise, 'raising is still offered after it was raised').toBe(false);
  });

  it('refuses a signatory who is not the chair, and the secretary', async () => {
    await chase();
    for (const who of ['member-c', 'member-b']) {
      const res = await press(who, { step: 'directors', kind: 'raise', reason: WHY });
      expect(res.status, who).toBe(403);
    }
  });

  /*
   * On `purify`, which is open and the institution's, and unchased.
   *
   * Written against `regulator` first, and it passed with the refusal deleted:
   * `regulator` waits on the Directors, so it was refused as not pressable at
   * all and never reached the rule this is about. A measure that passes by not
   * looking — the fourth time in this application.
   */
  it('refuses raising a step nobody has chased', async () => {
    const purify = await stepNamed('purify');
    expect(purify?.pressing?.may, 'this step is not pressable, so this proves nothing').toBe(true);
    expect(purify?.pressing?.chases).toHaveLength(0);

    const res = await press('member-a', { step: 'purify', kind: 'raise', reason: WHY });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect((await stepNamed('purify'))?.pressing?.raised).toBeNull();
  });

  it('refuses it twice', async () => {
    await chase();
    await press('member-a', { step: 'directors', kind: 'raise', reason: WHY });
    const again = await press('member-a', { step: 'directors', kind: 'raise', reason: WHY });
    expect(again.status).toBeGreaterThanOrEqual(400);
  });
});

describe('who may press, and what is not a step to press', () => {
  it('refuses an advisory member and the liaison', async () => {
    // The liaison is the institution's person here and would be chasing
    // themselves; an advisory member does not carry the board's voice outward.
    for (const who of ['advisor-1', 'liaison-1']) {
      const res = await chase(who);
      expect(res.status, who).toBe(403);
    }
  });

  it('refuses a step of the board’s own, and one whose turn has not come', async () => {
    for (const step of ['endorse', 'close', 'determine']) {
      const res = await chase('member-c', step);
      expect(res.status, step).toBeGreaterThanOrEqual(400);
    }
    expect((await stepNamed('directors'))?.pressing?.chases).toHaveLength(0);
  });

  it('refuses a chase with no reason, because the next board will ask what was tried', async () => {
    const res = await press('member-c', { step: 'directors', kind: 'chase', reason: 'chased' });
    expect(res.status).toBe(400);
  });

  it('refuses a step that is not a step', async () => {
    const res = await chase('member-c', 'nothing-like-this');
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
