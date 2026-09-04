/**
 * The routes for a recorded calculation.
 *
 * Its own module for the same reason incidents have one: a recorded
 * computation is not a matter and not an incident. It is a fact noted against
 * a period — no vote, no timelock, no stage — and giving it a file of its own
 * is what stops it drifting toward the shape of a decision.
 *
 * ── who may, and why ──────────────────────────────────────────────────────
 *
 * **Anyone on the board may record one.** It is not a ruling, so it does not
 * need a signatory; it is not an act of the institution, so it does not need
 * the secretary. A scholar working out purification under a standing ruling is
 * doing ordinary board work. Observers cannot, like everywhere else.
 *
 * **Anyone on the board may withdraw one, with a reason, in their own name.**
 * The alternative — only whoever recorded it — was considered and rejected: a
 * figure recorded against the wrong holding is a board-wide problem, and
 * requiring one absent member's hand would leave it standing meanwhile. The
 * reason and the name are recorded, which is what makes that safe.
 *
 * ── and one thing these routes may never say ──────────────────────────────
 *
 * Every response carries `WHAT_RECORDING_MEANS` from the service, unchanged.
 * Recording is not approving, and the sentence saying so travels with the
 * record rather than being written at whichever surface displays it.
 */

import { Router } from 'express';
import { z } from 'zod';
import { mayDeliberate } from '../auth/members.js';
import {
  WHAT_RECORDING_MEANS,
  buildComputation,
  history,
  standing,
  type RecordInput,
} from '../services/computation.js';
import type { Store } from '../store/index.js';
import type { CalculationKind } from '../types.js';
import { handle, badRequest, identityOf, requireRole } from './http.js';

const KINDS: CalculationKind[] = [
  'screening',
  'purification',
  'zakat',
  'profit_distribution',
  'tangibility',
  'late_payment',
];

const stepSchema = z.object({
  label: z.string().min(1).max(300),
  working: z.string().max(2_000),
  value: z.string().max(300),
});

const recordSchema = z.object({
  kind: z.enum(KINDS as [CalculationKind, ...CalculationKind[]]),
  boardId: z.string().min(1).max(64),
  assetId: z.string().min(1).max(64).nullish(),
  // No minimum here on purpose. An empty period is refused by the service,
  // which says why in a sentence a scholar can act on; zod would answer
  // "invalid_request" first and the useful message would never be seen.
  periodFrom: z.string().max(40),
  periodTo: z.string().max(40),
  method: z.string().max(120),
  methodStated: z.string().max(2_000),
  currency: z.string().max(20),
  source: z.string().max(500),
  // The figures as supplied. Held so the arithmetic can be checked, and typed
  // loosely on purpose: each calculation asks for different ones, and a schema
  // enumerating them here would be a second place to keep them in step.
  figures: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
  headline: z.string().max(200),
  amount: z.string().max(120),
  steps: z.array(stepSchema).max(100),
  note: z.string().max(4_000),
  supersedes: z.string().min(1).max(64).nullish(),
});

/** Long enough that "wrong" is not a reason. The same floor a concurrence uses. */
const withdrawSchema = z.object({ reason: z.string().min(20).max(4_000) });

export function computationRoutes(
  store: Store,
  now: () => string = () => new Date().toISOString(),
): Router {
  const router = Router();

  /**
   * What has been recorded, with what happened to each.
   *
   * The superseded and the withdrawn are returned rather than filtered out. A
   * board that revised a figure twice should be able to see that it did, and a
   * list showing only the survivor hides the revision, which is the part worth
   * reading. `standing` says which ones a reader should act on.
   */
  router.get(
    '/computations',
    handle(async (req, res) => {
      const kind = typeof req.query.kind === 'string' ? req.query.kind : undefined;
      const assetId = typeof req.query.assetId === 'string' ? req.query.assetId : undefined;
      const boardId = typeof req.query.boardId === 'string' ? req.query.boardId : undefined;

      const all = await store.computations({ boardId, kind, assetId });

      res.json({
        history: history(all),
        standing: standing(all).map((c) => c.id),
        whatRecordingMeans: WHAT_RECORDING_MEANS,
      });
    }),
  );

  router.get(
    '/computations/:id',
    handle(async (req, res) => {
      const found = await store.computation(req.params.id);
      if (!found) {
        res.status(404).json({ error: 'not_found', message: 'No such recorded calculation.' });
        return;
      }
      res.json({ computation: found, whatRecordingMeans: WHAT_RECORDING_MEANS });
    }),
  );

  /**
   * Note a calculation against a period.
   *
   * The arithmetic is not redone here. What arrives is what the calculation
   * produced, and the record's job is to say the board was shown it — redoing
   * it would mean the stored figure and the shown figure could differ, which
   * is the one thing an audit cannot have.
   */
  router.post(
    '/computations',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayDeliberate(who.role), 'record a calculation')) return;

      const parsed = recordSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const board = await store.board(parsed.data.boardId);
      if (!board) {
        res.status(404).json({ error: 'not_found', message: 'No such board.' });
        return;
      }

      // Everything already recorded for this board, so a replacement can be
      // checked against what it claims to replace.
      const existing = await store.computations({ boardId: parsed.data.boardId });
      const built = buildComputation(
        parsed.data as RecordInput,
        who.scholarId ?? 'unknown',
        now(),
        existing,
      );

      res.status(201).json({
        computation: await store.recordComputation(built),
        whatRecordingMeans: WHAT_RECORDING_MEANS,
      });
    }),
  );

  /** Marked withdrawn, never deleted. The arithmetic is untouched. */
  router.post(
    '/computations/:id/withdraw',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayDeliberate(who.role), 'withdraw a recorded calculation')) return;

      const parsed = withdrawSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const found = await store.computation(req.params.id);
      if (!found) {
        res.status(404).json({ error: 'not_found', message: 'No such recorded calculation.' });
        return;
      }
      if (found.withdrawnAt) {
        res.status(409).json({
          error: 'already_withdrawn',
          message: 'That calculation was already withdrawn.',
        });
        return;
      }

      res.json({
        computation: await store.withdrawComputation(
          req.params.id,
          who.scholarId ?? 'unknown',
          parsed.data.reason,
          now(),
        ),
        whatRecordingMeans: WHAT_RECORDING_MEANS,
      });
    }),
  );

  return router;
}
