/**
 * What somebody undertook to do, over HTTP.
 *
 * Three routes. Who may use them follows from what an undertaking is: it is
 * something the secretary wrote down at a sitting, so minuting one belongs to
 * whoever keeps the minutes. Closing one belongs to the person who undertook
 * it or to the secretary, because those are the two people who can honestly
 * say what happened.
 *
 * A signatory closing somebody else's undertaking would be putting words in
 * their mouth, and that is the one thing this application never does.
 */

import { Router } from 'express';
import { z } from 'zod';
import { mayKeepMinutes } from '../auth/members.js';
import { close, minute, overdue, summarise, Refused } from '../services/undertaking.js';
import type { Store } from '../store/index.js';
import { handle, badRequest, identityOf, requireRole } from './http.js';

const minuteSchema = z.object({
  boardId: z.string().min(1).max(64),
  meetingId: z.string().min(1).max(120),
  matterId: z.string().max(120).optional(),
  what: z.string().trim().min(3).max(2_000),
  who: z.string().min(1).max(64),
  /** Absent is a real answer: nothing is due unless the board said so. */
  dueAt: z.string().min(4).max(40).optional(),
});

const closeSchema = z.object({
  state: z.enum(['done', 'dropped']),
  said: z.string().trim().min(3).max(4_000),
});

export function undertakingRoutes(
  store: Store,
  now: () => string = () => new Date().toISOString(),
): Router {
  const router = Router();

  /** What this board has undertaken, and what became of it. */
  router.get(
    '/undertakings',
    handle(async (req, res) => {
      const boards = await store.boards();
      const boardId = typeof req.query.board === 'string' ? req.query.board : boards[0]?.id;
      const board = boards.find((b) => b.id === boardId);
      if (!board) {
        res.status(404).json({ error: 'not_found', message: 'No such board.' });
        return;
      }

      const at = now();
      const all = await store.undertakings(board.id);
      const byName = new Map(board.members.map((m) => [m.id, m.name]));

      res.json({
        boardId: board.id,
        /*
         * Oldest first, and open before closed. The one that has been open
         * longest is the one most likely to have been forgotten, which is the
         * whole reason a board keeps this list.
         */
        undertakings: all
          .slice()
          .sort((a, b) => {
            if ((a.state === 'open') !== (b.state === 'open')) return a.state === 'open' ? -1 : 1;
            return a.minutedAt.localeCompare(b.minutedAt);
          })
          .map((u) => ({
            undertaking: u,
            whoName: byName.get(u.who) ?? u.who,
            overdue: overdue(u, at),
          })),
        summary: summarise(all, at),
      });
    }),
  );

  /** Minute one. Whoever keeps the minutes. */
  router.post(
    '/undertakings',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayKeepMinutes(who.role, who.office), 'minute an undertaking', who.role))
        return;

      const parsed = minuteSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const board = await store.board(parsed.data.boardId);
      if (!board) {
        res.status(404).json({ error: 'not_found', message: 'No such board.' });
        return;
      }

      // The sitting has to exist. An undertaking with no sitting behind it is
      // a task list, which is a different thing and not this one.
      const meeting = await store.meeting(parsed.data.meetingId);
      if (!meeting || meeting.boardId !== board.id) {
        res.status(404).json({ error: 'not_found', message: 'No such sitting on this board.' });
        return;
      }

      const at = now();
      try {
        const made = minute({
          id: `undertaking-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          boardId: board.id,
          meetingId: meeting.id,
          ...(parsed.data.matterId ? { matterId: parsed.data.matterId } : {}),
          what: parsed.data.what,
          who: parsed.data.who,
          ...(parsed.data.dueAt ? { dueAt: parsed.data.dueAt } : {}),
          minutedBy: who.scholarId,
          minutedAt: at,
          members: board.members,
        });
        res.status(201).json({ undertaking: await store.minuteUndertaking(made) });
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
   * Close one by saying what happened.
   *
   * The person who undertook it, or the secretary. Anybody else closing it
   * would be recording an account of work they did not do, under a name that
   * is not theirs.
   */
  router.post(
    '/undertakings/:id/close',
    handle(async (req, res) => {
      const who = identityOf(req);
      const parsed = closeSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const held = await store.undertaking(req.params.id);
      if (!held) {
        res.status(404).json({ error: 'not_found', message: 'No such undertaking.' });
        return;
      }

      const mine = held.who === who.scholarId;
      if (!mine && !mayKeepMinutes(who.role, who.office)) {
        res.status(403).json({
          error: 'not_permitted',
          message:
            'This is somebody else’s undertaking. They close it, or the secretary does — an account of work written by a third person is not an account.',
        });
        return;
      }

      const at = now();
      try {
        const next = await store.updateUndertaking(held.id, (current) =>
          close(current, parsed.data.state, parsed.data.said, who.scholarId, at),
        );
        res.status(200).json({ undertaking: next });
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
