import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import { structures } from '../src/data/structures.js';
import { hashPassword } from '../src/auth/members.js';

/**
 * What the library hands out, the route takes back.
 *
 * ── the fault this is written for ─────────────────────────────────────────
 *
 * Amending a shape was written on the server, tested at the service, and
 * reachable from no screen. When a screen finally reached it, every
 * amendment came back 400: the route's schema required an `authority` on
 * each condition, and nothing in the system has ever had one — not the
 * type, not the nineteen shipped shapes, not the service that stores them.
 *
 * Every test passed throughout. The service tests build conditions by hand
 * and never go through the route; the route tests never sent conditions.
 * Between the two was a shape of data neither of them described, and the
 * only thing that could have caught it is the round trip: take a shape out
 * of the library exactly as a board is given it, hand it straight back, and
 * require it to be accepted.
 *
 * So this sends **every shipped shape** through unchanged. A field added to
 * the schema that the library does not produce fails here on the day it is
 * added, for all nineteen at once.
 */

const PASSWORD = 'a board credential';
const secret = hashPassword(PASSWORD);
const MEMBERS = ['member-a:signatory', 'chair:signatory']
  .map((entry) => `${entry}:${secret}`)
  .join('\n');
const as = (who: string) => 'Basic ' + Buffer.from(`${who}:${PASSWORD}`).toString('base64');

let app: Express;
let boardId: string;
let matterId: string;

const saved = {
  members: process.env.MAJLIS_MEMBERS,
  user: process.env.BASIC_AUTH_USER,
  pass: process.env.BASIC_AUTH_PASSWORD,
};

beforeEach(async () => {
  process.env.MAJLIS_MEMBERS = MEMBERS;
  delete process.env.BASIC_AUTH_USER;
  delete process.env.BASIC_AUTH_PASSWORD;

  app = createApp(new MemoryStore());

  const boards = await request(app).get('/api/boards').set('authorization', as('member-a'));
  boardId = boards.body[0].id;

  /*
   * A decision that carried, because an amendment names one. Taken from the
   * seeded record rather than invented: a matter this test drove to in_force
   * by hand would be testing the lifecycle, not the round trip.
   */
  const matters = await request(app).get('/api/matters').set('authorization', as('member-a'));
  matterId = (matters.body as { id: string; status: string }[]).find(
    (m) => m.status === 'in_force',
  )!.id;
});

afterEach(() => {
  process.env.MAJLIS_MEMBERS = saved.members;
  process.env.BASIC_AUTH_USER = saved.user;
  process.env.BASIC_AUTH_PASSWORD = saved.pass;
});

describe('a shape goes out of the library and comes back', () => {
  it('is taken back unchanged, for every shape that ships', async () => {
    expect(structures.length).toBeGreaterThan(10);

    const refused: string[] = [];

    for (const shape of structures) {
      const res = await request(app)
        .post('/api/adoptions')
        .set('authorization', as('chair'))
        .send({
          structureId: shape.id,
          boardId,
          standing: 'amended',
          matterId,
          amendments: ['Taken as our own, with the wording unchanged for now.'],
          // Exactly what a board is handed. Nothing added, nothing dropped.
          conditions: shape.conditions,
        });

      if (res.status !== 200 && res.status !== 201) {
        refused.push(`${shape.id}: ${res.status} ${JSON.stringify(res.body).slice(0, 160)}`);
      }
    }

    expect(refused, `these shapes could not be handed back:\n  ${refused.join('\n  ')}`).toEqual(
      [],
    );
  });

  it('keeps the board’s wording, and keeps the id findings point at', async () => {
    const murabaha = structures.find((s) => s.id === 'murabaha')!;
    const reworded = murabaha.conditions.map((c) =>
      c.id === 'cost-disclosed'
        ? { ...c, requirement: 'The cost, the mark-up and any discount are disclosed in writing.' }
        : c,
    );

    const res = await request(app)
      .post('/api/adoptions')
      .set('authorization', as('chair'))
      .send({
        structureId: 'murabaha',
        boardId,
        standing: 'amended',
        matterId,
        amendments: ['Discounts were being left out of the disclosure.'],
        conditions: reworded,
      });

    expect(res.status).toBe(201);

    const library = await request(app).get('/api/adoptions').set('authorization', as('member-a'));
    const held = (library.body.library as { structure: { id: string; conditions: unknown[] } }[]).find(
      (h) => h.structure.id === 'murabaha',
    )!;

    const cost = (held.structure.conditions as { id: string; requirement: string }[]).find(
      (c) => c.id === 'cost-disclosed',
    );
    // The wording is the board's; the id is what findings already point at.
    expect(cost?.requirement).toContain('any discount');
  });

  it('refuses a condition with no reason, in words a board can act on', async () => {
    const murabaha = structures.find((s) => s.id === 'murabaha')!;

    const res = await request(app)
      .post('/api/adoptions')
      .set('authorization', as('chair'))
      .send({
        structureId: 'murabaha',
        boardId,
        standing: 'amended',
        matterId,
        amendments: ['Tightened the wording.'],
        conditions: murabaha.conditions.map((c) => ({ ...c, why: '' })),
      });

    /*
     * The refusal, and the difference that matters: a schema error names a
     * field, and this names the condition and says why a reason is needed.
     */
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(JSON.stringify(res.body)).toMatch(/reason/i);
  });
});
