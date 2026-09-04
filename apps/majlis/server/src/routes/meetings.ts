/**
 * The routes for a meeting.
 *
 * Its own module because a meeting is not a matter and not an incident. It
 * decides nothing: what a board decides is a matter, raised and voted on with
 * a reason attached to every vote. What a meeting holds is the agenda, who was
 * there, and an account of the discussion — and the agenda links each item to
 * the matter where the decision actually lives.
 *
 * ── who may ───────────────────────────────────────────────────────────────
 *
 * **The chair convenes and closes.** That is procedural and deliberately
 * narrow, and it is the office the rest of the application already reserves
 * for it.
 *
 * **The chair or the secretary keeps the minute.** Narrower than deliberating
 * on purpose: a record several hands can rewrite is a record nobody can rely
 * on. A board with neither office configured cannot minute here, which is the
 * honest outcome — it has no meeting to minute either, since convening is the
 * chair's.
 *
 * ── and one thing there is no route for ───────────────────────────────────
 *
 * Amending a closed meeting. A board approves its minutes and they stop
 * moving. A correction after that is a matter for the next meeting's minute,
 * which is how boards have always done it and is the only version of it that
 * leaves a record.
 */

import { Router } from 'express';
import { z } from 'zod';
import { mayConvene, mayKeepMinutes } from '../auth/members.js';
import {
  attendanceAcross,
  cadence,
  close,
  convene,
  recordAttendance,
  stateOf,
  unaccountedFor,
  writeMinute,
  type ConveneInput,
} from '../services/meeting.js';
import type { Store } from '../store/index.js';
import { handle, badRequest, identityOf, requireRole } from './http.js';

const conveneSchema = z.object({
  boardId: z.string().min(1).max(64),
  at: z.string().min(4).max(40),
  joinUrl: z.string().max(2_000).nullish(),
  // No minimum here: an empty agenda is refused by the service, which says why
  // a meeting convened around nothing is one nobody can prepare for.
  agenda: z
    .array(z.object({ item: z.string().min(3).max(2_000), matterId: z.string().max(120).optional() }))
    .max(60),
});

const attendanceSchema = z.object({
  attendance: z
    .array(
      z.object({
        scholarId: z.string().min(1).max(64),
        present: z.boolean(),
        note: z.string().max(2_000).optional(),
      }),
    )
    .max(60),
});

const minuteSchema = z.object({ minute: z.string().max(50_000) });

export function meetingRoutes(
  store: Store,
  now: () => string = () => new Date().toISOString(),
): Router {
  const router = Router();

  /**
   * What this board has met about, and what it owes the calendar.
   *
   * The cadence comes back with the list rather than behind a second request,
   * because "when did we last meet" and "when are we next due" are one
   * question a chair asks in one glance.
   */
  router.get(
    '/meetings',
    handle(async (req, res) => {
      const boards = await store.boards();
      const boardId = typeof req.query.board === 'string' ? req.query.board : boards[0]?.id;
      const board = boards.find((b) => b.id === boardId);
      if (!board) {
        res.status(404).json({ error: 'not_found', message: 'No such board.' });
        return;
      }

      const at = now();
      const meetings = await store.meetings(board.id);

      res.json({
        boardId: board.id,
        meetings: meetings
          .slice()
          .sort((a, b) => b.at.localeCompare(a.at))
          .map((m) => ({
            meeting: m,
            state: stateOf(m, at),
            // Reported rather than filled in: writing everyone unnamed as
            // absent would assert an absence nobody recorded.
            unaccountedFor: unaccountedFor(m, board),
          })),
        attendance: attendanceAcross(meetings, board),
        cadence: cadence(meetings, board.id, at),
      });
    }),
  );

  router.get(
    '/meetings/:id',
    handle(async (req, res) => {
      const meeting = await store.meeting(req.params.id);
      if (!meeting) {
        res.status(404).json({ error: 'not_found', message: 'No such meeting.' });
        return;
      }
      const board = await store.board(meeting.boardId);
      res.json({
        meeting,
        state: stateOf(meeting, now()),
        unaccountedFor: board ? unaccountedFor(meeting, board) : [],
      });
    }),
  );

  /** Convene one. The chair's act, and it needs something to be about. */
  router.post(
    '/meetings',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayConvene(who.office), 'convene a meeting', who.role)) return;

      const parsed = conveneSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const board = await store.board(parsed.data.boardId);
      if (!board) {
        res.status(404).json({ error: 'not_found', message: 'No such board.' });
        return;
      }

      // So an agenda cannot name a matter that is not before this board.
      const matters = await store.matters(board.id);
      const built = convene(
        parsed.data as ConveneInput,
        board,
        matters.map((m) => m.id),
        who.scholarId ?? 'unknown',
      );

      res.status(201).json(await store.createMeeting(built));
    }),
  );

  router.put(
    '/meetings/:id/attendance',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayKeepMinutes(who.role, who.office), 'record attendance', who.role)) {
        return;
      }

      const parsed = attendanceSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const existing = await store.meeting(req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'not_found', message: 'No such meeting.' });
        return;
      }
      const board = await store.board(existing.boardId);
      if (!board) {
        res.status(404).json({ error: 'not_found', message: 'This meeting names a board that does not exist.' });
        return;
      }

      res.json(
        await store.updateMeeting(req.params.id, (current) =>
          recordAttendance(current, parsed.data.attendance, board),
        ),
      );
    }),
  );

  router.put(
    '/meetings/:id/minute',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayKeepMinutes(who.role, who.office), 'write the minute', who.role)) {
        return;
      }

      const parsed = minuteSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      res.json(
        await store.updateMeeting(req.params.id, (current) =>
          writeMinute(current, parsed.data.minute, who.scholarId ?? 'unknown'),
        ),
      );
    }),
  );

  /** Approve the minute and stop. Nothing about the meeting changes after this. */
  router.post(
    '/meetings/:id/close',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayConvene(who.office), 'close a meeting', who.role)) return;

      res.json(await store.updateMeeting(req.params.id, (current) => close(current, now())));
    }),
  );

  return router;
}
