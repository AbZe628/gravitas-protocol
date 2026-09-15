import { describe, expect, it } from 'vitest';
import { versionOf, whatMoved } from '../src/services/version.js';
import { createOnce, once } from '../src/middleware/once.js';
import type { Request, Response } from 'express';

/**
 * Two members, one matter, and nobody's work lost.
 *
 * The fault this guards is invisible when it happens: the record stays
 * perfectly consistent, and only the first scholar's reasoning is gone.
 */
describe('which version somebody was looking at', () => {
  const matter = { id: 'm-1', title: 'A question', findings: [{ condition: 'c1', met: true }] };

  it('gives the same version for the same content', () => {
    expect(versionOf(matter)).toBe(versionOf({ ...matter }));
  });

  it('gives a different version once anything at all has changed', () => {
    const after = { ...matter, findings: [{ condition: 'c1', met: false }] };
    expect(versionOf(after)).not.toBe(versionOf(matter));
  });

  it('does not change when the same keys arrive in a different order', () => {
    /*
     * A store that rebuilt the object would otherwise refuse a write that
     * should have been allowed — a fingerprint that moves for no reason is
     * worse than none, because it teaches members to press through the
     * warning.
     */
    const shuffled = { findings: matter.findings, title: matter.title, id: matter.id };
    expect(versionOf(shuffled)).toBe(versionOf(matter));
  });

  it('names the parts that moved, and only those', () => {
    const after = { ...matter, title: 'A different question' };
    expect(whatMoved(matter, after)).toEqual(['title']);
  });
});

/**
 * An act sent twice lands once.
 *
 * Built against the middleware rather than the HTTP surface, because what has
 * to be right is the rule — the same key with a different act is a mistake,
 * and a refusal is not worth remembering.
 */
describe('an act sent twice', () => {
  const run = (
    store: ReturnType<typeof createOnce>,
    req: Partial<Request>,
    replyWith: { status: number; body: unknown },
  ) => {
    let sent: { status: number; body: unknown } | null = null;
    let replayed = false;
    const res = {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(body: unknown) {
        sent = { status: this.statusCode, body };
        return this;
      },
      setHeader(name: string) {
        if (name === 'Idempotent-Replay') replayed = true;
      },
    } as unknown as Response;

    let reached = false;
    once(store)({ method: 'POST', body: {}, originalUrl: '/api/x', get: () => undefined, ...req } as Request, res, () => {
      reached = true;
      res.status(replyWith.status).json(replyWith.body);
    });

    return { sent, reached, replayed };
  };

  const withKey = (key: string, body: unknown = { a: 1 }) =>
    ({
      method: 'POST',
      originalUrl: '/api/matters/m-1/findings',
      body,
      get: (name: string) => (name.toLowerCase() === 'idempotency-key' ? key : undefined),
    }) as Partial<Request>;

  it('lets the first one through', () => {
    const store = createOnce();
    const first = run(store, withKey('k1'), { status: 201, body: { ok: true } });
    expect(first.reached).toBe(true);
    expect(store.size()).toBe(1);
  });

  it('answers the second with the first reply and does not reach the act', () => {
    const store = createOnce();
    run(store, withKey('k1'), { status: 201, body: { id: 'finding-1' } });
    const again = run(store, withKey('k1'), { status: 201, body: { id: 'finding-2' } });

    expect(again.reached, 'the act ran a second time').toBe(false);
    expect(again.sent).toEqual({ status: 201, body: { id: 'finding-1' } });
    expect(again.replayed).toBe(true);
  });

  it('refuses the same key used for a different act', () => {
    const store = createOnce();
    run(store, withKey('k1', { a: 1 }), { status: 201, body: { ok: true } });
    const different = run(store, withKey('k1', { a: 2 }), { status: 201, body: { ok: true } });

    expect(different.reached).toBe(false);
    expect((different.sent as { status: number }).status).toBe(409);
  });

  it('does not remember a refusal, so the corrected act can be sent again', () => {
    const store = createOnce();
    run(store, withKey('k1'), { status: 400, body: { error: 'invalid_request' } });
    expect(store.size(), 'a refusal was remembered').toBe(0);

    const corrected = run(store, withKey('k1'), { status: 201, body: { ok: true } });
    expect(corrected.reached).toBe(true);
  });

  it('lets an act with no key through untouched', () => {
    const store = createOnce();
    const plain = run(store, { get: () => undefined }, { status: 201, body: { ok: true } });
    expect(plain.reached).toBe(true);
    expect(store.size()).toBe(0);
  });

  it('forgets a key once its day is up', () => {
    let clock = 1_000;
    const store = createOnce(() => clock);
    run(store, withKey('k1'), { status: 201, body: { ok: true } });

    clock += 25 * 60 * 60 * 1000;
    const laterOn = run(store, withKey('k1'), { status: 201, body: { ok: true } });
    expect(laterOn.reached, 'a key was kept past its day').toBe(true);
  });
});
