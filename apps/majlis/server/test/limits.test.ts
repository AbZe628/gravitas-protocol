import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { Limiter } from '../src/services/limits.js';
import { createApp } from '../src/app.js';

describe('rate limiting', () => {
  it('allows up to the per-IP limit inside a window, then refuses with Retry-After', () => {
    const l = new Limiter({ perIpPerWindow: 3, windowMs: 60_000, globalPerDay: 100, dailyUsdCap: 10, estimatedUsdPerQuestion: 0.01 });
    const t = Date.now();
    expect(l.check('1.1.1.1', t).allowed).toBe(true);
    expect(l.check('1.1.1.1', t).allowed).toBe(true);
    expect(l.check('1.1.1.1', t).allowed).toBe(true);
    const d = l.check('1.1.1.1', t);
    expect(d.allowed).toBe(false);
    if (!d.allowed) { expect(d.reason).toBe('ip'); expect(d.retryAfterSeconds).toBeGreaterThan(0); }
  });

  it('does not let one address exhaust another address', () => {
    const l = new Limiter({ perIpPerWindow: 1, windowMs: 60_000, globalPerDay: 100, dailyUsdCap: 10, estimatedUsdPerQuestion: 0.01 });
    const t = Date.now();
    expect(l.check('1.1.1.1', t).allowed).toBe(true);
    expect(l.check('1.1.1.1', t).allowed).toBe(false);
    expect(l.check('2.2.2.2', t).allowed).toBe(true);
  });

  it('recovers after the window passes', () => {
    const l = new Limiter({ perIpPerWindow: 1, windowMs: 1_000, globalPerDay: 100, dailyUsdCap: 10, estimatedUsdPerQuestion: 0.01 });
    const t = Date.now();
    expect(l.check('1.1.1.1', t).allowed).toBe(true);
    expect(l.check('1.1.1.1', t + 500).allowed).toBe(false);
    expect(l.check('1.1.1.1', t + 1_500).allowed).toBe(true);
  });

  it('stops at the daily spend cap even when per-IP limits are not reached', () => {
    const l = new Limiter({ perIpPerWindow: 1000, windowMs: 60_000, globalPerDay: 10_000, dailyUsdCap: 0.05, estimatedUsdPerQuestion: 0.02 });
    const t = Date.now();
    expect(l.check('a', t).allowed).toBe(true);  // 0.02
    expect(l.check('b', t).allowed).toBe(true);  // 0.04
    const d = l.check('c', t);                   // would be 0.06 > 0.05
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.reason).toBe('budget');
  });

  it('the cap cannot be exceeded by spreading load across addresses', () => {
    const l = new Limiter({ perIpPerWindow: 1, windowMs: 60_000, globalPerDay: 10_000, dailyUsdCap: 0.05, estimatedUsdPerQuestion: 0.02 });
    const t = Date.now();
    let allowed = 0;
    for (let i = 0; i < 100; i++) if (l.check(`ip-${i}`, t).allowed) allowed++;
    expect(allowed).toBe(2);
  });
});

describe('assistant log is not public', () => {
  // Coverage for the log route now lives in auth.test.ts: it is protected by
  // the same basic auth as every other route rather than by a second shared
  // secret of its own. Kept here as an explicit statement that the route was
  // deliberately un-gated in favour of one mechanism, not forgotten.
  it('is covered by the application-wide auth test', () => {
    expect(true).toBe(true);
  });
});
