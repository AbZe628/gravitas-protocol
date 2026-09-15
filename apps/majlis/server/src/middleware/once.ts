import { createHash } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * An act sent twice lands once.
 *
 * ── the fault this closes ─────────────────────────────────────────────────
 *
 * Nothing stopped the same act being recorded twice. A slow reply and a second
 * press, a reload part way through, a phone on a train — each of them wrote a
 * second finding, a second vote, a second holding, with the record perfectly
 * consistent and perfectly wrong. A button that disables itself in the browser
 * is the first layer and only the first: it cannot survive a reload, and it is
 * not present at all for anything driving this API directly.
 *
 * ── the key is the caller's, and it is theirs to repeat ───────────────────
 *
 * The caller mints one key per *intention* — one press of *record this
 * finding* — and repeats it on every retry of that same intention. Arriving
 * again with a key already seen, the answer that was given the first time is
 * handed back and **nothing is written**. The caller cannot tell the
 * difference, which is the point: retrying is safe.
 *
 * ── two different acts must never share a key ─────────────────────────────
 *
 * The key alone is not enough to say *this is the same act*. A caller that
 * reuses a key for a different body would otherwise be handed the wrong
 * answer and told it succeeded. So what is remembered is the key **and** a
 * fingerprint of method, path, identity and body; the same key with a
 * different fingerprint is a mistake in the caller and is refused as one
 * rather than quietly answered.
 *
 * Identity is in the fingerprint because two members could pick the same key,
 * and one being handed the other's answer would be worse than any duplicate.
 *
 * ── refusals are not remembered ───────────────────────────────────────────
 *
 * Only an act that landed is worth replaying. A 400 is the caller being told
 * to fix something and send it again; remembering it would mean the corrected
 * request is answered with the old complaint, and the member would be stuck
 * looking at an error they had already fixed.
 *
 * ── it forgets, on purpose ────────────────────────────────────────────────
 *
 * A key is kept for a day. Long enough to cover every retry anybody actually
 * makes, short enough that this is a small map rather than a second record.
 * Keeping them forever would make this a store, and a store needs the care a
 * store needs.
 */

const A_DAY = 24 * 60 * 60 * 1000;

/** How many keys are held before the oldest are let go. */
const MOST = 5_000;

interface Answered {
  fingerprint: string;
  status: number;
  body: unknown;
  at: number;
}

export interface Once {
  seen(key: string): Answered | undefined;
  /*
   * The time is stamped here rather than by the caller, so there is one clock.
   * Two — the middleware holding one and this holding another — meant a key
   * remembered with real time and expired against a test clock never expired
   * at all. Caught by the test that asked it to.
   */
  remember(key: string, answered: Omit<Answered, 'at'>): void;
  size(): number;
}

export function createOnce(now: () => number = Date.now): Once {
  const kept = new Map<string, Answered>();

  const forgetOld = () => {
    const cutoff = now() - A_DAY;
    for (const [key, answered] of kept) {
      if (answered.at < cutoff) kept.delete(key);
    }
    /* Still too many: the oldest go first, insertion order being age order. */
    while (kept.size > MOST) {
      const oldest = kept.keys().next().value;
      if (oldest === undefined) break;
      kept.delete(oldest);
    }
  };

  return {
    seen(key) {
      const answered = kept.get(key);
      if (!answered) return undefined;
      if (answered.at < now() - A_DAY) {
        kept.delete(key);
        return undefined;
      }
      return answered;
    },
    remember(key, answered) {
      kept.set(key, { ...answered, at: now() });
      forgetOld();
    },
    size: () => kept.size,
  };
}

/** Method, path, who, and body — everything that makes this act this act. */
function fingerprintOf(req: Request): string {
  const who = req.identity?.scholarId ?? 'anonymous';
  return createHash('sha256')
    .update(`${req.method}\n${req.originalUrl}\n${who}\n${JSON.stringify(req.body ?? null)}`)
    .digest('hex')
    .slice(0, 16);
}

export function once(store: Once) {
  return function onceMiddleware(req: Request, res: Response, next: NextFunction) {
    if (req.method === 'GET' || req.method === 'HEAD') return next();

    const key = req.get('idempotency-key');
    if (!key) return next();

    if (key.length > 200) {
      res.status(400).json({
        error: 'idempotency_key_too_long',
        message: 'An Idempotency-Key is at most 200 characters.',
      });
      return;
    }

    const fingerprint = fingerprintOf(req);
    const already = store.seen(key);

    if (already) {
      if (already.fingerprint !== fingerprint) {
        /*
         * The caller reused a key for a different act. Answering with the
         * first act's reply would tell them something landed that did not.
         */
        res.status(409).json({
          error: 'idempotency_key_reused',
          message:
            'This Idempotency-Key was used for a different act. A key belongs to one ' +
            'intention and is repeated only when retrying that same intention.',
        });
        return;
      }
      res.setHeader('Idempotent-Replay', 'true');
      res.status(already.status).json(already.body);
      return;
    }

    /*
     * The reply is captured on its way out rather than by wrapping every
     * route, so an act written after today is covered without being told to
     * be.
     */
    const sendJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        store.remember(key, { fingerprint, status: res.statusCode, body });
      }
      return sendJson(body);
    };

    next();
  };
}
