import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import { hashPassword } from '../src/auth/members.js';
import { boards, incidents, matters, rules } from '../src/data/seed.js';
import { lifecycleMatters } from '../src/data/seed-lifecycle.js';
import { submissions, undertakings } from '../src/data/seed-work.js';

/**
 * Whether the board agreed, or carried it — and who was never heard from.
 *
 * ── what the vote said before this ────────────────────────────────────────
 *
 * A restricting matter with two positions recorded out of five signatories:
 *
 *     2 of 2 · Threshold met · Against 0 · Abstain 0
 *     Not yet recorded: Board Member C · Board Member D · Board Member E
 *     [ Close the vote ]
 *
 * Every figure is true and the whole reads as finished. *2 of 2* counts
 * against the threshold, not against the board; *threshold met* is the
 * headline; and *close the vote* sat under it as the obvious next act, with
 * three members never heard from.
 *
 * The written ruling was no better: those for, those against, those
 * abstaining, the quorum required and the quorum recorded, and no way at all
 * to see that three signatories never answered. A reader a year later sees
 * *2 in favour, 2 required* and reads a board that agreed.
 *
 * IFSB-10 asks a board to seek agreement and, where it decides by a majority
 * instead, to say so. Neither half existed — there was no notion of agreement
 * in the application, so there was nothing a record could have said.
 *
 * ── and what it must not do ───────────────────────────────────────────────
 *
 * Refuse anything. The threshold is the board's and was fixed when the
 * question was put; this says which of the two is happening, and nothing more.
 */

const PASSWORD = 'a board credential';
const secret = hashPassword(PASSWORD);

const MEMBERS = [
  'member-a:signatory+chair',
  'member-b:signatory',
  'member-c:signatory',
  'member-d:signatory',
  'member-e:signatory',
  'advisor-1:advisory',
]
  .map((entry) => `${entry}:${secret}`)
  .join('\n');

const as = (who: string) => 'Basic ' + Buffer.from(`${who}:${PASSWORD}`).toString('base64');

let app: Express;
const saved = { members: process.env.MAJLIS_MEMBERS };

beforeEach(() => {
  process.env.MAJLIS_MEMBERS = MEMBERS;
  app = createApp(
    new MemoryStore({
      boards,
      // The matter with a vote open lives in the lifecycle seed, as the store
      // composes them; `matters` alone has none in `voting`.
      matters: [...matters, ...lifecycleMatters],
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
});

/** The seeded matter with a vote open. */
const VOTING = 'matter-2026-08-11';

type Standing = {
  state: 'consensus' | 'majority' | 'divided' | 'not_yet';
  everybodySpoke: boolean;
  for: string[];
  against: string[];
  abstained: string[];
  silent: string[];
  required: number;
  seekingUntil: string | null;
  periodPast: boolean;
};

const standingNow = async (): Promise<Standing> => {
  const res = await request(app).get(`/api/matters/${VOTING}/tally`).set('Authorization', as('member-a'));
  expect(res.status).toBe(200);
  return res.body.standing as Standing;
};

const vote = (who: string, position: 'for' | 'against' | 'abstain', reason: string) =>
  request(app)
    .post(`/api/matters/${VOTING}/vote`)
    .set('Authorization', as(who))
    .send({ position, reason });

const WHY = 'The borrowing inside the index is the whole of the objection and it is not cured.';

describe('what the count could not say', () => {
  it('reports a met threshold as carried, not as agreed, while members are silent', async () => {
    const standing = await standingNow();

    // Or this proves nothing: a board where everybody had spoken would read
    // as consensus for the right reason and hide the fault entirely.
    expect(standing.silent.length, 'nobody is silent here').toBeGreaterThan(0);
    expect(standing.for.length).toBeGreaterThanOrEqual(standing.required);

    expect(standing.state).toBe('majority');
    expect(standing.everybodySpoke).toBe(false);
  });

  it('names who is silent rather than counting them', async () => {
    const standing = await standingNow();
    for (const id of standing.silent) expect(id).toMatch(/^[a-z]/);
    expect(standing.silent).not.toContain(standing.for[0]);
  });

  it('reads as agreement only once every signatory has spoken and none opposed', async () => {
    const before = await standingNow();
    for (const who of before.silent) {
      const res = await vote(who, 'for', WHY);
      expect(res.status, who).toBeLessThan(400);
    }

    const after = await standingNow();
    expect(after.silent).toEqual([]);
    expect(after.everybodySpoke).toBe(true);
    expect(after.state).toBe('consensus');
  });

  it('does not read silence as dissent', async () => {
    const standing = await standingNow();
    expect(standing.against, 'somebody silent was counted as against').toEqual([]);
    expect(standing.abstained).toEqual([]);
  });

  it('reads as carried, not agreed, when somebody abstains', async () => {
    const before = await standingNow();
    for (const [i, who] of before.silent.entries()) {
      await vote(who, i === 0 ? 'abstain' : 'for', WHY);
    }

    const after = await standingNow();
    expect(after.everybodySpoke).toBe(true);
    expect(after.abstained.length).toBe(1);
    // Everybody spoke, nobody was against — and it is still not agreement.
    expect(after.state).toBe('majority');
  });
});

describe('the period the board gives itself', () => {
  const later = () => new Date(Date.now() + 10 * 86_400_000).toISOString();

  const give = (who: string, body: Record<string, unknown>) =>
    request(app).post(`/api/matters/${VOTING}/agreement`).set('Authorization', as(who)).send(body);

  it('is carried on the reading once it is set', async () => {
    expect((await standingNow()).seekingUntil).toBeNull();

    const until = later();
    const res = await give('member-a', { until, reason: 'Two of them are travelling until the sitting.' });
    expect(res.status, JSON.stringify(res.body)).toBe(200);

    const standing = await standingNow();
    expect(standing.seekingUntil).toBe(until);
    expect(standing.periodPast).toBe(false);
  });

  it('keeps each saying, so how long they waited stays readable', async () => {
    await give('member-a', { until: later(), reason: 'Two of them are travelling until the sitting.' });
    const res = await give('member-b', {
      until: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      reason: 'Extending it: the desk has not reported back on the exposure.',
    });
    expect(res.body.seekingAgreement).toHaveLength(2);
    expect(res.body.seekingAgreement[0].by).toBe('member-a');
    expect(res.body.seekingAgreement[1].by).toBe('member-b');
  });

  /*
   * The whole point of it gating nothing.
   *
   * A period that could stop a board closing on its own quorum would be this
   * application governing, and a chair who needed to carry something urgently
   * would find it in the way of a decision it has no business having a view
   * about.
   */
  it('stops nobody closing the vote', async () => {
    await give('member-a', { until: later(), reason: 'Two of them are travelling until the sitting.' });

    const closed = await request(app)
      .post(`/api/matters/${VOTING}/close`)
      .set('Authorization', as('member-a'))
      .send({});
    expect(closed.status, JSON.stringify(closed.body)).toBeLessThan(400);
  });

  it('refuses a date already gone, and a reason too short to read', async () => {
    const gone = await give('member-a', {
      until: new Date(Date.now() - 86_400_000).toISOString(),
      reason: 'Two of them are travelling until the sitting.',
    });
    expect(gone.status).toBeGreaterThanOrEqual(400);

    const thin = await give('member-a', { until: later(), reason: 'to be fair' });
    expect(thin.status).toBeGreaterThanOrEqual(400);

    expect((await standingNow()).seekingUntil).toBeNull();
  });

  it('refuses an advisory member, who does not carry the vote', async () => {
    const res = await give('advisor-1', { until: later(), reason: 'I would rather we waited for them.' });
    expect(res.status).toBe(403);
  });
});

describe('what the written ruling says about it', () => {
  const fatwaOf = async (id: string) => {
    const res = await request(app)
      .get(`/api/matters/${id}/fatwa?format=json`)
      .set('Authorization', as('member-a'));
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    return res.body as {
      decidedBy: { how: string; silent: { scholarId: string; name: string; title: string }[] } | null;
    };
  };

  it('says whether a settled ruling was agreed or carried', async () => {
    const all = await request(app).get('/api/matters').set('Authorization', as('member-a'));
    const inForce = (all.body as { id: string; status: string }[]).find((m) => m.status === 'in_force');
    expect(inForce, 'the seed has no ruling in force, so this proves nothing').toBeTruthy();

    const fatwa = await fatwaOf(inForce!.id);
    expect(fatwa.decidedBy, 'a settled ruling that says neither').toBeTruthy();
    expect(['consensus', 'majority']).toContain(fatwa.decidedBy!.how);
    expect(Array.isArray(fatwa.decidedBy!.silent)).toBe(true);
    // Names, not the keys a configuration file files them under. The rendered
    // ruling said "2 signatories recorded no position: member-d, member-e",
    // because the renderer looked them up among the signatures and a member
    // who never voted is in no signature block.
    expect(fatwa.decidedBy!.silent.length, 'nobody is silent here').toBeGreaterThan(0);
    for (const s of fatwa.decidedBy!.silent) {
      expect(s.name, s.scholarId).not.toBe(s.scholarId);
      expect(s.name.length).toBeGreaterThan(0);
    }
  });

  it('says it in the rendered document, where a reader actually looks', async () => {
    const all = await request(app).get('/api/matters').set('Authorization', as('member-a'));
    const inForce = (all.body as { id: string; status: string }[]).find((m) => m.status === 'in_force')!;

    const res = await request(app)
      .get(`/api/matters/${inForce.id}/fatwa`)
      .set('Authorization', as('member-a'));
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/Decided by (agreement|majority)/);
    // And never an identifier where a name belongs, in the one document a
    // regulator reads.
    expect(res.text).not.toMatch(/recorded no position: [a-z-]+-[a-z0-9]+/);
  });
});
