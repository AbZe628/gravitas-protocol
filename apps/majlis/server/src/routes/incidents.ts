/**
 * The routes for a reported non-compliance.
 *
 * A separate module because an incident is a separate thing. A matter is a
 * proposal to change a rule; this is an account of something that already
 * happened. Sharing a file with the matter routes would have been the first
 * step back toward sharing a shape with them.
 *
 * Three rules hold across all of them.
 *
 *   **The identity comes from the credential.** No request says whose
 *   determination it is carrying.
 *
 *   **The service decides, not the route.** Every change runs inside
 *   `store.updateIncident`, so `services/incident.ts` runs against the stored
 *   record inside a transaction. A refusal writes nothing, and two members
 *   acting in the same second cannot interleave.
 *
 *   **The board's acts and the institution's acts are different acts.** Four of
 *   the nine steps belong to the institution — the plan, the Directors, the
 *   regulator, the payment — and the board must not be able to record them by
 *   deciding to. They need a secretary or a liaison.
 */

import { Router } from 'express';
import { z } from 'zod';
import {
  mayDeliberate,
  mayPress,
  mayRaise,
  mayRecordInstitutionAct,
  mayVote,
} from '../auth/members.js';
import {
  close,
  concur,
  currentPlan,
  disclosureFor,
  endorsePlan,
  fileRectificationPlan,
  prescribePurification,
  press,
  recordDirectorsApproval,
  recordPurificationPaid,
  recordRegulatorSubmission,
  rectificationClock,
  returnPlan,
  stopActivities,
} from '../services/incident.js';
import { buildIncidentPassage } from '../services/passage-incident.js';
import { visibleTo, withAssignments } from '../services/assignment.js';
import type { Store } from '../store/index.js';
import type { Incident } from '../types.js';
import { badRequest, handle, identityOf, requireRole } from './http.js';

const reasonSchema = z.string().min(1).max(20_000);

const reportSchema = z.object({
  boardId: z.string().min(1).max(64),
  reference: z.string().min(1).max(120),
  title: z.string().min(3).max(300),
  report: z.string().min(1).max(20_000),
});

const concurSchema = z.object({ actual: z.boolean(), reason: reasonSchema });
const pressSchema = z.object({
  step: z.string().min(1).max(40),
  kind: z.enum(['chase', 'raise']),
  reason: reasonSchema,
});
const stoppedSchema = z.object({ activities: z.array(z.string().min(1).max(500)).min(1).max(100) });

const planSchema = z.object({
  steps: z.array(z.string().min(1).max(2_000)).min(1).max(100),
  completeBy: z.string().min(4).max(40),
});

const purificationSchema = z.object({
  amount: z.string().min(1).max(60),
  currency: z.string().min(1).max(10),
  destination: z.string().min(1).max(500),
});

const paidSchema = z.object({ reference: z.string().max(200).default('') });

export function incidentRoutes(store: Store, now: () => string = () => new Date().toISOString()): Router {
  const router = Router();

  /** The board a record belongs to, or a 404 already sent. */
  async function boardFor(res: Parameters<typeof badRequest>[0], incidentId: string) {
    const incident = await store.incident(incidentId);
    if (!incident) {
      res.status(404).json({ error: 'not_found', message: 'No such incident.' });
      return null;
    }
    const board = await store.board(incident.boardId);
    if (!board) {
      res.status(404).json({ error: 'not_found', message: 'This incident names a board that does not exist.' });
      return null;
    }
    return board;
  }

  /**
   * Report an event.
   *
   * Open to anyone on the board, not only to the institution's own people. A
   * scholar who notices something and cannot report it until the right person
   * is available is a scholar watching a clock that has not started.
   */
  router.post(
    '/incidents',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayDeliberate(who.role), 'report an event', who.role)) return;

      const parsed = reportSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const board = await store.board(parsed.data.boardId);
      if (!board) {
        res.status(404).json({ error: 'not_found', message: 'No such board.' });
        return;
      }

      const at = now();
      const incident: Incident = {
        id: `incident-${at.replace(/[^0-9]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`,
        boardId: parsed.data.boardId,
        reference: parsed.data.reference,
        title: parsed.data.title,
        report: parsed.data.report,
        reportedBy: who.scholarId,
        reportedAt: at,
        stage: 'reported',
        concurrences: [],
        determinedAt: null,
        actual: null,
        stopped: [],
        plans: [],
        directorsApprovedAt: null,
        submittedToRegulatorAt: null,
        purification: null,
        closedAt: null,
        sources: [],
      };

      res.status(201).json(await store.createIncident(incident));
    }),
  );

  router.get(
    '/incidents',
    handle(async (req, res) => {
      const board = typeof req.query.board === 'string' ? req.query.board : undefined;
      const at = now();
      const all = await store.incidents(board);

      res.json({
        asOf: at,
        count: all.length,
        awaitingDetermination: all.filter((i) => i.stage === 'reported').length,
        overdue: all.filter((i) => rectificationClock(i, at)?.overdue).length,
        incidents: all.map((i) => ({ ...i, clock: rectificationClock(i, at) })),
      });
    }),
  );

  router.get(
    '/incidents/:id',
    handle(async (req, res) => {
      const incident = await store.incident(req.params.id);
      if (!incident) {
        res.status(404).json({ error: 'not_found', message: 'No such incident.' });
        return;
      }
      res.json({
        ...incident,
        clock: rectificationClock(incident, now()),
        plan: currentPlan(incident),
      });
    }),
  );

  /**
   * Where this breach stands, and what the next act is.
   *
   * The same reading the arrival queue uses, so the sentence a member sees in
   * the list is the sentence they see when they open it. It was not the same
   * before: this screen kept nine steps written out in the component and the
   * queue kept six in a table, and the two the screen had — that the activity
   * must stop, and that what was earned must be paid away — were the two that
   * cost money while a breach read as ordinary progress.
   *
   * It says what is in the record and what is not. It does not say a plan is
   * good enough to endorse or that enough has been purified; those are the
   * board's rulings.
   */
  router.get(
    '/incidents/:id/passage',
    handle(async (req, res) => {
      const incident = await store.incident(req.params.id);
      if (!incident) {
        res.status(404).json({ error: 'not_found', message: 'No such incident.' });
        return;
      }
      /*
       * Through the assignments, so the passage says who is actually doing
       * each step rather than only whose kind of act it is. Every route that
       * serves a passage does this; one that forgets shows a breach where
       * nobody holds anything.
       */
      const assignments = visibleTo(identityOf(req).role, await store.assignments(incident.boardId));
      res.json(withAssignments(buildIncidentPassage(incident, now()), assignments));
    }),
  );

  // ── the board's acts ────────────────────────────────────────────────────

  /**
   * Take a position on whether this is an actual non-compliance.
   *
   * The hinge of the whole flow, in both directions. The service holds the
   * threshold and refuses a non-signatory itself; this refuses first so the
   * message is about the credential rather than about the board.
   */
  router.post(
    '/incidents/:id/concurrence',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayVote(who.role), 'determine whether an event is a non-compliance', who.role)) return;

      const parsed = concurSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const board = await boardFor(res, req.params.id);
      if (!board) return;

      const at = now();
      const updated = await store.updateIncident(req.params.id, (current) =>
        concur(board, current, { scholarId: who.scholarId, ...parsed.data }, at).incident,
      );
      res.json({ ...updated, clock: rectificationClock(updated, at) });
    }),
  );

  /** Name what the finding stops, and everything that shares the defect. */
  router.post(
    '/incidents/:id/stopped',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayVote(who.role), 'record what a finding stops', who.role)) return;

      const parsed = stoppedSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      res.json(
        await store.updateIncident(req.params.id, (current) =>
          stopActivities(current, parsed.data.activities),
        ),
      );
    }),
  );

  router.post(
    '/incidents/:id/plan/endorse',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayVote(who.role), 'endorse a rectification plan', who.role)) return;

      const board = await boardFor(res, req.params.id);
      if (!board) return;

      const at = now();
      res.json(
        await store.updateIncident(req.params.id, (current) =>
          endorsePlan(board, current, who.scholarId, at),
        ),
      );
    }),
  );

  /**
   * Press the institution on a step that is theirs, or raise it to the chair.
   *
   * ── whose judgement decides ───────────────────────────────────────────────
   *
   * Whether the step may be pressed at all is read from the passage, here,
   * and handed to the service. The route could have asked the stage — it is
   * two lines shorter — and then there would be two answers in the
   * application to *is this step open and whose is it*, which is the exact
   * fault this passage was built to remove. The screen offers *press* from
   * `step.pressing.may`; this refuses on the same reading of the same record,
   * so the control is present precisely where it can be honoured.
   *
   * Read inside the transaction, from the stored record, and not from the
   * passage the client had when it drew the button: a step the institution
   * completed in the meantime is no longer pressable, and the board should
   * learn that rather than write a chase about work already done.
   */
  router.post(
    '/incidents/:id/press',
    handle(async (req, res) => {
      const who = identityOf(req);

      const parsed = pressSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const raising = parsed.data.kind === 'raise';
      const allowed = raising ? mayRaise(who.office) : mayPress(who.role, who.office);
      const what = raising ? 'raise a step to the chair' : 'press the institution';
      if (!requireRole(res, allowed, what, who.role)) return;

      const at = now();
      res.json(
        await store.updateIncident(req.params.id, (current) => {
          const step = buildIncidentPassage(current, at)
            .groups.flatMap((g) => g.steps)
            .find((s) => s.key === parsed.data.step);

          return press(
            current,
            { ...parsed.data, by: who.scholarId },
            at,
            { open: step?.state === 'open', whose: step?.whose ?? '' },
          );
        }),
      );
    }),
  );

  /** Send the plan back. The thirty days do not restart; they never stopped. */
  router.post(
    '/incidents/:id/plan/return',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayVote(who.role), 'return a rectification plan', who.role)) return;

      const parsed = z.object({ reason: reasonSchema }).safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      res.json(
        await store.updateIncident(req.params.id, (current) => returnPlan(current, parsed.data.reason)),
      );
    }),
  );

  /** The board sets both the amount and where it goes. */
  router.post(
    '/incidents/:id/purification',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayVote(who.role), 'prescribe purification', who.role)) return;

      const parsed = purificationSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const at = now();
      res.json(
        await store.updateIncident(req.params.id, (current) =>
          prescribePurification(current, parsed.data, at),
        ),
      );
    }),
  );

  router.post(
    '/incidents/:id/close',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayVote(who.role), 'close a reported event', who.role)) return;

      const at = now();
      res.json(await store.updateIncident(req.params.id, (current) => close(current, at)));
    }),
  );

  // ── the institution's acts ──────────────────────────────────────────────
  //
  // None of these is the board's to record. A board that could file its own
  // rectification plan, or minute the Directors' approval on their behalf,
  // would be producing a document that says something nobody outside the room
  // ever said.

  router.post(
    '/incidents/:id/plan',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayRecordInstitutionAct(who.role, who.office), 'file a rectification plan', who.role)) return;

      const parsed = planSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const at = now();
      const updated = await store.updateIncident(req.params.id, (current) =>
        fileRectificationPlan(current, { filedBy: who.scholarId, ...parsed.data }, at),
      );
      res.json({ ...updated, clock: rectificationClock(updated, at) });
    }),
  );

  router.post(
    '/incidents/:id/directors',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayRecordInstitutionAct(who.role, who.office), 'record the Directors’ approval', who.role)) return;
      res.json(await store.updateIncident(req.params.id, (c) => recordDirectorsApproval(c, now())));
    }),
  );

  router.post(
    '/incidents/:id/submission',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayRecordInstitutionAct(who.role, who.office), 'record a submission to the regulator', who.role)) return;
      res.json(await store.updateIncident(req.params.id, (c) => recordRegulatorSubmission(c, now())));
    }),
  );

  router.post(
    '/incidents/:id/purification/paid',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayRecordInstitutionAct(who.role, who.office), 'record a purification payment', who.role)) return;

      const parsed = paidSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      res.json(
        await store.updateIncident(req.params.id, (c) =>
          recordPurificationPaid(c, parsed.data.reference, now()),
        ),
      );
    }),
  );

  // ── the year ────────────────────────────────────────────────────────────

  /**
   * The year's disclosure: nature, amount, count and rectification.
   *
   * Assembled from what was already written down, never summarised. Open to
   * observers, since the auditor and the regulator are exactly who it is for.
   */
  router.get(
    '/disclosure',
    handle(async (req, res) => {
      const raw = typeof req.query.year === 'string' ? Number(req.query.year) : new Date(now()).getUTCFullYear();
      if (!Number.isInteger(raw) || raw < 2000 || raw > 2200) {
        res.status(400).json({ error: 'bad_year', message: 'Give a four-digit year.' });
        return;
      }
      const board = typeof req.query.board === 'string' ? req.query.board : undefined;
      res.json(disclosureFor(raw, await store.incidents(board)));
    }),
  );

  return router;
}
