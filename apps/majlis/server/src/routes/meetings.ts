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
import { undertookIn } from '../services/undertakings-in-a-minute.js';
import {
  attendanceAcross,
  cadence,
  close,
  convene,
  recordAttendance,
  stateOf,
  unaccountedFor,
  waitingForTheRoom,
  writeMinute,
  type ConveneInput,
} from '../services/meeting.js';
import type { Store } from '../store/index.js';
import { handle, badRequest, identityOf, requireRole } from './http.js';
import { compose, NoticeOff, type Notifier } from '../services/notice.js';

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
  /**
   * Who is told that the board has been called to sit.
   *
   * Optional, and its default sends nothing — the same arrangement as
   * everywhere else here: a channel that is not wired composes the words
   * and says plainly that they did not go.
   */
  notifier: Notifier = new NoticeOff(),
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
        /*
         * What is waiting for a room, so the form that convenes one is not an
         * empty box.
         *
         * Served here rather than from its own route because the screen that
         * needs it is this one, and a second call would mean the agenda
         * arrived after the form the chair is already typing into.
         *
         * It proposes and does not convene: the chair takes what they take.
         */
        waiting: waitingForTheRoom(await store.matters(board.id), meetings, board.id, at),
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

  /**
   * What members undertook, found in the minute that is already written.
   *
   * ── the gap ───────────────────────────────────────────────────────────
   *
   * A sitting produces a minute, which is prose, and undertakings, which are
   * the board's own clocks — and the second was typed in again by hand from
   * the first, by the person who had just finished writing it. What is lost
   * there is lost silently: an obligation nobody re-typed has no date on it
   * and nothing that will ever raise it.
   *
   * ── and it records nothing ────────────────────────────────────────────
   *
   * A GET, because that is what it is: the minute read back with the
   * sentences that carry a member's name and a commitment picked out. The
   * secretary edits them, drops them, or minutes them — through the route
   * that already minutes one, under their own name. No clock of this board
   * is started by a machine reading prose.
   *
   * Whoever may read the sitting may read this. It says nothing the minute
   * does not already say to the same reader.
   */
  router.get(
    '/meetings/:id/undertook',
    handle(async (req, res) => {
      const meeting = await store.meeting(req.params.id);
      if (!meeting) {
        res.status(404).json({ error: 'not_found', message: 'No such meeting.' });
        return;
      }
      const board = await store.board(meeting.boardId);

      /*
       * Against this board's own members and nobody else's. The only names
       * this can return are ones the board already holds; a line about the
       * auditor or the treasury desk carries no member and is not offered,
       * because guessing whose undertaking it is would be the one mistake
       * worth more than the whole reading.
       */
      res.json({
        meetingId: meeting.id,
        found: undertookIn(meeting.minute ?? '', board?.members ?? []),
        /* Said on the face of it, as every reading here says what it is. */
        readBy: 'words',
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

      const meeting = await store.createMeeting(built);

      /*
       * The one event where being told late is the same as not being told.
       *
       * A sitting called for Tuesday is of no use to a member who opens
       * Majlis on Wednesday, so the notice is composed here rather than
       * left to somebody remembering. Under the ordinary installation
       * nothing is sent and the reply says so plainly — see
       * `services/notice.ts` for why that is honest rather than a stub —
       * and a board that has wired a relay has it delivered by the same
       * call.
       *
       * It is returned beside the meeting, not instead of it: convening
       * succeeded whether or not anybody could be written to, and a
       * failure to notify must never look like a failure to convene.
       */
      const notice = compose(board, {
        kind: 'meeting_convened',
        meetingId: meeting.id,
        at: meeting.at,
        agenda: meeting.agenda.map((a) => a.item),
        convenedBy: who.scholarId ?? 'unknown',
      });
      const delivery = await notifier.deliver(notice, now());

      res.status(201).json({ ...meeting, notice, delivery });
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
