import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import { hashPassword } from '../src/auth/members.js';
import { boards, incidents, matters, rules } from '../src/data/seed.js';
import { lifecycleMatters } from '../src/data/seed-lifecycle.js';
import { examinations, submissions, undertakings } from '../src/data/seed-work.js';
import { entersTheRegister } from '../src/services/ruling-register.js';

/**
 * A ruling the board carried, arriving in the register of what stands.
 *
 * ── the two things that were not true ─────────────────────────────────────
 *
 * **A ruling brought into force did not reach the register.** Nothing in the
 * application ever wrote a rule: the register was the seed and only the seed.
 * So the same screen said both things two tabs apart — *what we decided*
 * listed the restoration window as **in force**, and *in force today* said
 * **3 in force** and did not include it. The board's own decision never
 * arrived at the list of what stands.
 *
 * **And nothing was ever superseded.** `supersededBy` is read in five places
 * — the annual report's count at year end, the manual's split into current
 * and superseded, `review.ts`, `export.ts`, `dossier.ts` — and was written by
 * none of them. Two seeded rulings claim to be version 3 and version 2 with
 * no predecessor in existence. The register page says *the chain of what
 * replaced what is drawn, not implied* over no chain at all.
 *
 * Found by listing the rules and reading the two tabs.
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

/**
 * A board holding everything the chain runs through.
 *
 * `amends` is set on the fixture rather than through the route in the tests
 * that need a matter already voting: what a ruling replaces is fixed before
 * the vote opens, deliberately, so a test that set it on a voting matter
 * would be testing a path the route refuses. The route has its own case below.
 */
function boardHolding(amends?: string) {
  return createApp(
    new MemoryStore({
      boards,
      matters: [...matters, ...lifecycleMatters].map((m) =>
        amends && m.id === VOTING ? { ...m, amends } : m,
      ),
      rules,
      incidents,
      examinations,
      submissions,
      undertakings,
      briefings: [],
    }),
  );
}

beforeEach(() => {
  process.env.MAJLIS_MEMBERS = MEMBERS;
  app = boardHolding();
});

afterEach(() => {
  process.env.MAJLIS_MEMBERS = saved.members;
});

/** The seeded matter with a vote open. Restricting, so it is in force at once. */
const VOTING = 'matter-2026-08-11';
/** A ruling in force, for the matter above to replace. */
const STANDING = 'rule-tangible-ratio';

const WHY = 'The borrowing inside the index is the whole of the objection and it is not cured.';

const registerNow = async (): Promise<
  { id: string; version: number; supersededBy: string | null; supersedes: string | null }[]
> => {
  const res = await request(app).get('/api/rules').set('Authorization', as('member-a'));
  expect(res.status).toBe(200);
  return res.body;
};

const carryIt = async () => {
  const before = await request(app).get(`/api/matters/${VOTING}/tally`).set('Authorization', as('member-a'));
  for (const who of before.body.standing.silent as string[]) {
    await request(app)
      .post(`/api/matters/${VOTING}/vote`)
      .set('Authorization', as(who))
      .send({ position: 'for', reason: WHY });
  }
  return request(app).post(`/api/matters/${VOTING}/close`).set('Authorization', as('member-a')).send({});
};

describe('a ruling the board carried', () => {
  it('is absent from the register before it carries, or this proves nothing', async () => {
    const matter = await request(app).get(`/api/matters/${VOTING}`).set('Authorization', as('member-a'));
    expect(matter.body.status).toBe('voting');
    expect(matter.body.proposedRule?.id, 'this matter proposes no ruling').toBeTruthy();

    const ids = (await registerNow()).map((r) => r.id);
    expect(ids).not.toContain(matter.body.proposedRule.id);
  });

  it('reaches it when the vote closes', async () => {
    const matter = await request(app).get(`/api/matters/${VOTING}`).set('Authorization', as('member-a'));
    const proposed = matter.body.proposedRule.id as string;

    const closed = await carryIt();
    expect(closed.status, JSON.stringify(closed.body)).toBe(200);
    expect(closed.body.outcome, 'a restriction is in force the moment the vote closes').toBe('in_force');

    const entry = (await registerNow()).find((r) => r.id === proposed);
    expect(entry, 'the board carried it and the register does not hold it').toBeTruthy();
    expect(entry!.supersededBy).toBeNull();
  });

  it('arrives as version one where it replaces nothing', async () => {
    const matter = await request(app).get(`/api/matters/${VOTING}`).set('Authorization', as('member-a'));
    await carryIt();

    const entry = (await registerNow()).find((r) => r.id === matter.body.proposedRule.id)!;
    expect(entry.version).toBe(1);
    expect(entry.supersedes).toBeNull();
  });

  /*
   * Read, not driven through the routes.
   *
   * Written as *close it twice and count the entries* first, and it passed
   * with the guard deleted: the lifecycle refuses the second close long
   * before anything reaches the register, so the route walk cannot exercise
   * this at all. A measure that passes by not looking — the fifth here.
   *
   * What it is actually about is a ruling already in the register, which is
   * what a route running after a matter is in force sees. `/force` after
   * `/close` would be exactly that, and so would any later door.
   */
  it('is written once: a ruling already in the register is not written again', async () => {
    const matter = await request(app).get(`/api/matters/${VOTING}`).set('Authorization', as('member-a'));
    await carryIt();

    const held = await registerNow();
    expect(held.filter((r) => r.id === matter.body.proposedRule.id)).toHaveLength(1);

    const inForce = await request(app).get(`/api/matters/${VOTING}`).set('Authorization', as('member-a'));
    expect(inForce.body.status).toBe('in_force');
    expect(
      entersTheRegister(inForce.body, held as never, '2026-09-30T12:00:00Z'),
      'it would be registered a second time',
    ).toBeNull();
  });
});

describe('replacing a ruling that stands', () => {
  const amend = (to: string | null, who = 'member-a') =>
    request(app).put(`/api/matters/${VOTING}/amends`).set('Authorization', as(who)).send({ amends: to });

  it('supersedes the one it replaces, both ways round', async () => {
    app = boardHolding(STANDING);

    const before = (await registerNow()).find((r) => r.id === STANDING)!;
    expect(before.supersededBy, 'it is already superseded, so this proves nothing').toBeNull();

    const matter = await request(app).get(`/api/matters/${VOTING}`).set('Authorization', as('member-a'));
    await carryIt();

    const after = await registerNow();
    const replaced = after.find((r) => r.id === STANDING)!;
    const fresh = after.find((r) => r.id === matter.body.proposedRule.id)!;

    expect(replaced.supersededBy).toBe(fresh.id);
    expect(fresh.supersedes).toBe(STANDING);
    // One past what it replaced, never the number the draft happened to carry.
    expect(fresh.version).toBe(before.version + 1);
  });

  /*
   * The route, on a matter where it is allowed and one where it is not.
   *
   * What a ruling replaces is part of what the board votes on. A matter that
   * changed its target mid-vote would be a different question asked under the
   * same positions, and the members who had voted would have voted on
   * something else.
   */
  it('may be said while the matter is being deliberated', async () => {
    const res = await request(app)
      .put('/api/matters/matter-2026-07-03/amends')
      .set('Authorization', as('member-a'))
      .send({ amends: STANDING });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.amends).toBe(STANDING);
  });

  it('and refused once the vote is open', async () => {
    const res = await amend(STANDING);
    expect(res.status, 'a voting matter accepted a change to what it amends').toBeGreaterThanOrEqual(400);
  });

  it('refuses a ruling that is not in the register', async () => {
    app = boardHolding('nothing-like-this');
    const closed = await carryIt();
    // The ruling stands either way: the board decided, and bookkeeping that
    // failed must never be reported as a decision that did not carry.
    expect(closed.body.outcome).toBe('in_force');
    expect(closed.body.register.registered).toBeNull();
    expect(String(closed.body.register.note)).toContain('not in the register');
  });
});

describe('what rested on the ruling that was replaced', () => {
  const restedOn = async (id: string) => {
    const res = await request(app).get(`/api/rules/${id}/rested-on`).set('Authorization', as('member-a'));
    expect(res.status).toBe(200);
    return res.body as {
      items: { kind: string; id: string; againstTheseTerms: boolean | null }[];
    };
  };

  /*
   * Against `rule-pool-trading`, which is where the examinations actually
   * point — and which was in no register at all until the seed carried it.
   * Both of them record the ruling as it stood, so a later version cannot
   * change what was tested, and the ruling they named could not be opened.
   */
  it('lists the examinations run under it, and says which tested these terms', async () => {
    const held = await restedOn('rule-pool-trading');
    const exams = held.items.filter((x) => x.kind === 'examination');
    expect(exams.length, 'nothing was examined under this ruling, so this proves nothing').toBeGreaterThan(0);
    for (const e of exams) expect(typeof e.againstTheseTerms).toBe('boolean');
  });

  it('says nothing about whether any of it is now wrong', async () => {
    const held = await restedOn('rule-pool-trading');
    // Facts only: what it is, when, and whether the terms match. No verdict
    // field exists, because whether an examination has to be run again is the
    // board's to say and not this application's.
    for (const x of held.items) {
      expect(Object.keys(x).sort()).toEqual(['againstTheseTerms', 'at', 'id', 'kind', 'title']);
    }
  });

  it('is empty for a ruling nothing was recorded against', async () => {
    const held = await restedOn('rule-stablecoin-par');
    expect(Array.isArray(held.items)).toBe(true);
  });

  it('refuses a ruling that is not there', async () => {
    const res = await request(app)
      .get('/api/rules/nothing-like-this/rested-on')
      .set('Authorization', as('member-a'));
    expect(res.status).toBe(404);
  });
});
