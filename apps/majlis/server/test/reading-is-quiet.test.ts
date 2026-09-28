import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import type { Store } from '../src/store/store.js';
import { isReader } from '../src/store/pulsing.js';
import { hashPassword } from '../src/auth/members.js';
import { boards, incidents, matters, rules, assets, meetings } from '../src/data/seed.js';
import { submissions, undertakings } from '../src/data/seed-work.js';

/**
 * Reading the record never rings the bell.
 *
 * ── the fault this holds shut ─────────────────────────────────────────────
 *
 * `store/pulsing.ts` rings the bell for every store method not named as a
 * reader, and says getting that wrong is the harmless mistake: a client
 * re-reads a list it already had. It is not harmless where the reading is
 * itself on a screen that re-reads when the bell rings.
 *
 * `assignments` was added to the store and not to the list. The arrival
 * queue reads assignments, so every read of the queue rang the bell, and the
 * queue — which re-reads whenever the bell rings — read itself again, for
 * ever. A member signing in saw *Loading…* and nothing else, with the browser
 * sending the same request as fast as it could. Every test was green: the
 * guard in `pulse.test.ts` checks that each method is *either* a reader or a
 * write, and a reader filed as a write is still one of the two.
 *
 * Found by opening the application in a browser.
 *
 * ── what this checks instead ──────────────────────────────────────────────
 *
 * The routes, not the list. Every GET the application registers is called
 * against a store that records what it was asked, and everything a GET asked
 * must be a reader. A method added tomorrow and read by a GET tomorrow fails
 * here the day it is written, whether or not anybody remembered the list.
 */

const PASSWORD = 'a board credential';
const secret = hashPassword(PASSWORD);
const as = 'Basic ' + Buffer.from(`member-a:${PASSWORD}`).toString('base64');

let app: Express;
const called = new Map<string, Set<string>>();
let current = '';
const saved = { members: process.env.MAJLIS_MEMBERS, user: process.env.BASIC_AUTH_USER };

function recording(store: Store): Store {
  return new Proxy(store, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (typeof value !== 'function' || typeof property !== 'string') return value;
      return (...args: unknown[]) => {
        if (current) {
          if (!called.has(property)) called.set(property, new Set());
          called.get(property)!.add(current);
        }
        return (value as (...a: unknown[]) => unknown).apply(target, args);
      };
    },
  });
}

beforeAll(() => {
  process.env.MAJLIS_MEMBERS = `member-a:signatory+chair:${secret}\nmember-b:signatory:${secret}`;
  delete process.env.BASIC_AUTH_USER;
  app = createApp(
    recording(
      new MemoryStore({
        boards,
        matters,
        rules,
        incidents,
        assets,
        meetings,
        submissions,
        undertakings,
        briefings: [],
        /* Something to read, so the routes that read assignments do. */
        assignments: [
          {
            id: 'asg-1',
            boardId: 'demo-board',
            ofKind: 'matter',
            ofId: 'matter-2026-07-03',
            stepKey: null,
            to: 'member-b',
            by: 'member-b',
            at: '2026-09-01T00:00:00Z',
          },
        ],
      }),
    ),
  );
});

afterAll(() => {
  process.env.MAJLIS_MEMBERS = saved.members;
  if (saved.user !== undefined) process.env.BASIC_AUTH_USER = saved.user;
});

/** Every GET the application registers, with its mount prefix. */
function gets(): string[] {
  const out: string[] = [];
  const walk = (stack: any[], prefix: string): void => {
    for (const layer of stack) {
      if (layer.route) {
        if (layer.route.methods?.get) out.push(prefix + layer.route.path);
        continue;
      }
      if (!layer.handle?.stack) continue;
      const source: string = layer.regexp?.source ?? '';
      const mount = source
        .replace(/^\^/, '')
        .replace(/\\\/\?\(\?=\\\/\|\$\)\$?$/, '')
        .replace(/\\\//g, '/')
        .replace(/\$$/, '');
      walk(layer.handle.stack, prefix + (mount === '/?' ? '' : mount));
    }
  };
  walk((app as any)._router?.stack ?? (app as any).router?.stack ?? [], '');
  return out;
}

/** A real id for the parameter, where the path says what kind of thing it is. */
function filled(path: string): string {
  const id =
    /\/matters\//.test(path) ? 'matter-2026-07-03'
    : /\/incidents\//.test(path) ? incidents[0].id
    : /\/rules\//.test(path) ? rules[0].id
    : /\/assets\//.test(path) ? assets[0].id
    : /\/meetings\//.test(path) ? meetings[0].id
    : /\/submissions\//.test(path) ? submissions[0].id
    : /\/boards\//.test(path) ? 'demo-board'
    : 'x';
  return path.replace(/:[A-Za-z]+/g, id);
}

describe('reading the record never rings the bell', () => {
  /* The bell itself holds the line open and never finishes. */
  const skip = (p: string) => /\/pulse$/.test(p);

  it('asks the store only for readers, on every GET there is', async () => {
    const all = gets().filter((p) => !skip(p));
    expect(all.length, 'the walk found no GET routes').toBeGreaterThan(40);

    const answered: Record<string, number> = {};
    for (const path of all) {
      current = path;
      const res = await request(app).get(filled(path)).set('Authorization', as).timeout(5000).catch(
        () => null,
      );
      answered[path] = res?.status ?? 0;
    }
    current = '';

    // The four this was written for really ran, against real records.
    for (const p of ['/api/queue', '/api/assignments', '/api/matters/:id/passage', '/api/incidents/:id/passage']) {
      expect(answered[p], `${p} did not answer`).toBe(200);
    }
    expect(called.has('assignments'), 'no GET read the assignments, so this proves nothing').toBe(true);

    const wrong = [...called.entries()]
      .filter(([method]) => !isReader(method))
      .map(([method, paths]) => `${method} ← ${[...paths].slice(0, 3).join(', ')}`);
    expect(wrong, 'a GET asked the store for something the bell counts as a write').toEqual([]);
  });
});
