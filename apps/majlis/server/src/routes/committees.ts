/**
 * Committees, over HTTP.
 *
 * Five routes, and none of them can settle anything. A referral records that
 * the board asked some of its members to look first; a report carries their
 * account back. The vote, the threshold and the waiting period are exactly
 * where they were, because a board's threshold is the number of signatures
 * that bind the institution and no arrangement of committees may lower it.
 *
 * Who may do what follows from that:
 *
 *   forming one     — it is decided, not configured, so it needs a settled
 *                     matter and whoever may open one;
 *   referring       — whoever may deliberate; it asks a question and decides
 *                     nothing;
 *   reporting       — a member of that committee, and nobody else;
 *   winding one up  — whoever may open a matter, for the same reason as
 *                     forming.
 */

import { Router } from 'express';
import { z } from 'zod';
import { mayDeliberate, mayOpenMatter } from '../auth/members.js';
import {
  form,
  dissolve,
  refer,
  report,
  withdrawReferral,
  stateOf,
  howItStood,
  summarise,
  Refused,
} from '../services/committee.js';
import type { Store } from '../store/index.js';
import { handle, badRequest, identityOf, requireRole } from './http.js';

const formSchema = z.object({
  boardId: z.string().min(1).max(64),
  name: z.string().trim().min(2).max(120),
  remit: z.string().trim().min(10).max(2_000),
  members: z.array(z.string().min(1).max(64)).min(1).max(30),
  convenor: z.string().max(64).optional(),
  /** The settled matter the board formed it in. Committees are decided. */
  formedIn: z.string().min(1).max(120),
});

const referSchema = z.object({
  committeeId: z.string().min(1).max(120),
  matterId: z.string().min(1).max(120),
  asking: z.string().trim().min(5).max(2_000),
});

const reportSchema = z.object({
  found: z.string().trim().min(10).max(8_000),
  standing: z
    .array(
      z.object({
        scholarId: z.string().min(1).max(64),
        agrees: z.boolean(),
        said: z.string().max(4_000).optional(),
      }),
    )
    .max(30)
    .default([]),
});

const withdrawSchema = z.object({ why: z.string().trim().min(3).max(2_000) });

export function committeeRoutes(
  store: Store,
  now: () => string = () => new Date().toISOString(),
): Router {
  const router = Router();

  /** Every committee this board keeps, with what each is carrying. */
  router.get(
    '/committees',
    handle(async (req, res) => {
      const boards = await store.boards();
      const boardId = typeof req.query.board === 'string' ? req.query.board : boards[0]?.id;
      const board = boards.find((b) => b.id === boardId);
      if (!board) {
        res.status(404).json({ error: 'not_found', message: 'No such board.' });
        return;
      }

      const all = await store.committees(board.id);
      const referrals = await store.referrals();
      const byName = new Map(board.members.map((m) => [m.id, m.name]));

      res.json({
        boardId: board.id,
        committees: all.map((c) => ({
          committee: c,
          memberNames: c.members.map((m) => byName.get(m) ?? m),
          convenorName: c.convenor ? (byName.get(c.convenor) ?? c.convenor) : null,
          summary: summarise(c, referrals),
        })),
        /*
         * Said whether or not there are any. A board that keeps no committees
         * is a board that reads everything in the room, which is a way of
         * working rather than a gap — and an empty list with no sentence
         * beside it reads as a feature that failed to load.
         */
        keepsNone: all.length === 0,
      });
    }),
  );

  /** What has been referred on one matter, and what came back. */
  router.get(
    '/matters/:id/referrals',
    handle(async (req, res) => {
      const matter = await store.matter(req.params.id);
      if (!matter) {
        res.status(404).json({ error: 'not_found', message: 'No such matter.' });
        return;
      }

      const board = await store.board(matter.boardId);
      const byName = new Map((board?.members ?? []).map((m) => [m.id, m.name]));
      const committees = await store.committees(matter.boardId);
      const held = new Map(committees.map((c) => [c.id, c]));

      const referrals = await store.referrals({ matterId: matter.id });

      res.json({
        matterId: matter.id,
        referrals: referrals.map((r) => {
          const committee = held.get(r.committeeId) ?? null;
          const stood = committee ? howItStood(committee, r) : null;
          return {
            referral: r,
            committee,
            state: stateOf(r),
            referredByName: byName.get(r.referredBy) ?? r.referredBy,
            /*
             * Named, never counted. "Four agreed" tells a board nothing it can
             * act on; "Board Member C did not, because …" is the sentence it
             * has to read.
             */
            stood: stood
              ? {
                  ...stood,
                  agreedNames: stood.agreed.map((m) => byName.get(m) ?? m),
                  dissentedNames: stood.dissented.map((d) => ({
                    ...d,
                    name: byName.get(d.scholarId) ?? d.scholarId,
                  })),
                  silentNames: stood.silent.map((m) => byName.get(m) ?? m),
                }
              : null,
          };
        }),
        /*
         * The one thing the interface must never let a reader assume. It is
         * said on every response rather than left for a screen to remember.
         */
        note: 'A committee reports. What is decided, and by how many signatures, is unchanged by a referral.',
      });
    }),
  );

  /** Form one. It is decided in a matter, never configured on a settings page. */
  router.post(
    '/committees',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayOpenMatter(who.role), 'form a committee', who.role)) return;

      const parsed = formSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const board = await store.board(parsed.data.boardId);
      if (!board) {
        res.status(404).json({ error: 'not_found', message: 'No such board.' });
        return;
      }

      /*
       * The matter has to exist and has to belong to this board. A committee
       * whose founding matter is somebody else's is a committee nobody can
       * trace the authority of.
       */
      const matter = await store.matter(parsed.data.formedIn);
      if (!matter || matter.boardId !== board.id) {
        res.status(404).json({
          error: 'not_found',
          message: 'No such matter on this board. A committee is formed in a decision of the board.',
        });
        return;
      }

      try {
        const made = form({
          id: `committee-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          boardId: board.id,
          name: parsed.data.name,
          remit: parsed.data.remit,
          members: parsed.data.members,
          ...(parsed.data.convenor ? { convenor: parsed.data.convenor } : {}),
          formedIn: matter.id,
          formedAt: now(),
          onTheBoard: board.members,
        });
        res.status(201).json({ committee: await store.formCommittee(made) });
      } catch (e) {
        if (e instanceof Refused) {
          res.status(409).json({ error: e.reason, message: e.message });
          return;
        }
        throw e;
      }
    }),
  );

  /** Wind one up. It stays in the record with everything it reported. */
  router.post(
    '/committees/:id/dissolve',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayOpenMatter(who.role), 'wind up a committee', who.role)) return;

      const held = await store.committee(req.params.id);
      if (!held) {
        res.status(404).json({ error: 'not_found', message: 'No such committee.' });
        return;
      }

      try {
        res.json({ committee: await store.updateCommittee(held.id, (c) => dissolve(c, now())) });
      } catch (e) {
        if (e instanceof Refused) {
          res.status(409).json({ error: e.reason, message: e.message });
          return;
        }
        throw e;
      }
    }),
  );

  /** Ask a committee to look at a matter first. */
  router.post(
    '/referrals',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayDeliberate(who.role), 'refer a matter to a committee', who.role)) return;

      const parsed = referSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const committee = await store.committee(parsed.data.committeeId);
      const matter = await store.matter(parsed.data.matterId);
      if (!committee || !matter || matter.boardId !== committee.boardId) {
        res.status(404).json({
          error: 'not_found',
          message: 'No such committee and matter on one board.',
        });
        return;
      }

      try {
        const made = refer({
          id: `referral-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          committee,
          matterId: matter.id,
          asking: parsed.data.asking,
          referredBy: who.scholarId,
          referredAt: now(),
        });
        res.status(201).json({ referral: await store.referMatter(made) });
      } catch (e) {
        if (e instanceof Refused) {
          res.status(409).json({ error: e.reason, message: e.message });
          return;
        }
        throw e;
      }
    }),
  );

  /**
   * The committee's account of what it found.
   *
   * Written by somebody who sat on it. The service refuses anybody else, and
   * this route does not repeat the check — one rule, one place.
   */
  router.post(
    '/referrals/:id/report',
    handle(async (req, res) => {
      const who = identityOf(req);
      const parsed = reportSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const held = await store.referral(req.params.id);
      if (!held) {
        res.status(404).json({ error: 'not_found', message: 'No such referral.' });
        return;
      }
      const committee = await store.committee(held.committeeId);
      if (!committee) {
        res.status(404).json({ error: 'not_found', message: 'No such committee.' });
        return;
      }

      const at = now();
      try {
        const next = await store.updateReferral(held.id, (current) =>
          report(current, {
            committee,
            found: parsed.data.found,
            by: who.scholarId,
            at,
            standing: parsed.data.standing.map((s) => ({ ...s, at })),
          }),
        );
        res.json({ referral: next, stood: howItStood(committee, next) });
      } catch (e) {
        if (e instanceof Refused) {
          res.status(409).json({ error: e.reason, message: e.message });
          return;
        }
        throw e;
      }
    }),
  );

  /** The board takes a referral back, with a reason. */
  router.post(
    '/referrals/:id/withdraw',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayDeliberate(who.role), 'withdraw a referral', who.role)) return;

      const parsed = withdrawSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const held = await store.referral(req.params.id);
      if (!held) {
        res.status(404).json({ error: 'not_found', message: 'No such referral.' });
        return;
      }

      try {
        const next = await store.updateReferral(held.id, (current) =>
          withdrawReferral(current, who.scholarId, parsed.data.why, now()),
        );
        res.json({ referral: next });
      } catch (e) {
        if (e instanceof Refused) {
          res.status(409).json({ error: e.reason, message: e.message });
          return;
        }
        throw e;
      }
    }),
  );

  return router;
}
