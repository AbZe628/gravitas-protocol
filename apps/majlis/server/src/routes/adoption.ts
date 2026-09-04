/**
 * The routes for taking a contract shape as the board's own.
 *
 * Its own module because adoption is not a matter, an incident or a
 * calculation. It is the act that turns nineteen shipped drafts into a
 * library one board actually holds, and it happens once per shape.
 *
 * ── who may ───────────────────────────────────────────────────────────────
 *
 * **Signatories only.** Everything else in this application that anyone on the
 * board may do is either reasoning or recording a fact. Adoption changes what
 * every later checklist is judged against, which is the closest thing here to
 * legislating — and the settled matter it names is checked besides, so the
 * signature confirms a decision rather than making one.
 *
 * ── and one thing it will not do ──────────────────────────────────────────
 *
 * There is no route to un-adopt. A board that changes its mind amends, or
 * declines, and either way names the matter and gives its reasons. Removing an
 * adoption would leave findings recorded against conditions nobody could look
 * up afterwards.
 */

import { Router } from 'express';
import { z } from 'zod';
import { mayVote } from '../auth/members.js';
import {
  AS_ADOPTED,
  AS_DECLINED,
  AS_SHIPPED,
  adopt,
  historyFor,
  libraryFor,
  standingAdoptions,
  type AdoptInput,
} from '../services/adoption.js';
import { structures } from '../data/structures.js';
import type { Store } from '../store/index.js';
import { handle, badRequest, identityOf, requireRole } from './http.js';

const conditionSchema = z.object({
  id: z.string().min(1).max(80),
  requirement: z.string().min(10).max(2_000),
  why: z.string().max(2_000),
  evidence: z.enum(['document', 'sequence', 'figure', 'undertaking']),
  authority: z.string().min(1).max(300),
});

const adoptSchema = z.object({
  structureId: z.string().min(1).max(80),
  boardId: z.string().min(1).max(64),
  standing: z.enum(['adopted', 'amended', 'declined']),
  matterId: z.string().min(1).max(64),
  // No minimum here: an amendment with no reason is refused by the service,
  // which says why in a sentence a board can act on.
  amendments: z.array(z.string().max(4_000)).max(100).optional(),
  conditions: z.array(conditionSchema).max(100).optional(),
  supersedes: z.string().min(1).max(64).nullish(),
});

export function adoptionRoutes(
  store: Store,
  now: () => string = () => new Date().toISOString(),
): Router {
  const router = Router();

  /**
   * The whole library as this board holds it.
   *
   * Every shape, with what the board did about it. A shape they have not
   * touched comes back as the shipped draft and says so — the absence of a
   * decision is a state worth reading, and it is the state most shapes are in
   * on the day a board starts.
   */
  router.get(
    '/adoptions',
    handle(async (req, res) => {
      const boards = await store.boards();
      const boardId = typeof req.query.board === 'string' ? req.query.board : boards[0]?.id;
      if (!boardId) {
        res.status(404).json({ error: 'not_found', message: 'No such board.' });
        return;
      }

      const all = await store.adoptions(boardId);

      res.json({
        boardId,
        library: libraryFor(boardId, all, structures),
        adopted: standingAdoptions(all).filter((a) => a.standing !== 'declined').length,
        declined: standingAdoptions(all).filter((a) => a.standing === 'declined').length,
        total: structures.length,
        notes: { draft: AS_SHIPPED, adopted: AS_ADOPTED, declined: AS_DECLINED },
      });
    }),
  );

  /** What this board has done about one shape, over time, oldest first. */
  router.get(
    '/adoptions/:structureId/history',
    handle(async (req, res) => {
      const boards = await store.boards();
      const boardId = typeof req.query.board === 'string' ? req.query.board : boards[0]?.id;
      if (!boardId) {
        res.status(404).json({ error: 'not_found', message: 'No such board.' });
        return;
      }

      const all = await store.adoptions(boardId);
      res.json({ history: historyFor(req.params.structureId, boardId, all) });
    }),
  );

  /**
   * Take a shape, amend it, or rule against using it.
   *
   * The matter named is checked: it must be this board's and must have
   * carried. That check is the difference between a decision and a switch.
   */
  router.post(
    '/adoptions',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayVote(who.role), 'adopt a contract shape')) return;

      const parsed = adoptSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const board = await store.board(parsed.data.boardId);
      if (!board) {
        res.status(404).json({ error: 'not_found', message: 'No such board.' });
        return;
      }

      const [matters, existing] = await Promise.all([
        store.matters(parsed.data.boardId),
        store.adoptions(parsed.data.boardId),
      ]);

      const built = adopt(
        parsed.data as AdoptInput,
        matters,
        existing,
        who.scholarId ?? 'unknown',
        now(),
      );

      res.status(201).json({
        adoption: await store.recordAdoption(built),
        note: built.standing === 'declined' ? AS_DECLINED : AS_ADOPTED,
      });
    }),
  );

  return router;
}
