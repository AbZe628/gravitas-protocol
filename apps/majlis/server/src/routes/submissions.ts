/**
 * The way in, over HTTP.
 *
 * Four rules hold here, and three of them are the same ones the governance
 * routes hold to. The fourth is new and is the reason this module exists.
 *
 *   **The identity comes from the credential.** Who asked, who recorded it and
 *   who answered are all taken from `req.identity`; nothing in a body may say
 *   whose act it is.
 *
 *   **The service decides, not the route.** Every change runs inside
 *   `store.updateSubmission`, so the rules in `services/submission.ts` run
 *   against the stored record inside a transaction and a refusal writes
 *   nothing.
 *
 *   **Nothing here notifies anybody, and nothing pretends to.** The notice is
 *   composed by `services/notice.ts` and returned with the response, carrying
 *   `sent: false` where this installation has no channel. The interface has to
 *   say so in words.
 *
 *   **An institution sees its own questions and nothing else.** Not the board's
 *   deliberation on them, not another desk's queue. The store already keeps one
 *   institution out of another's record; this keeps one desk out of another's
 *   inside the same bank, which the store cannot know about.
 */

import { Router } from 'express';
import { z } from 'zod';
import { badRequest, handle, identityOf, requireRole } from './http.js';
import { mayDisposeOfSubmission, maySubmit } from '../auth/members.js';
import {
  decline,
  matterOf,
  open,
  standingOf,
  submit,
  waitedHours,
  waiting,
  withdraw,
} from '../services/submission.js';
import { compose, type Notifier } from '../services/notice.js';
import type { Store } from '../store/index.js';
import type { Matter, Submission } from '../types.js';

const now = () => new Date().toISOString();

const putSchema = z.object({
  boardId: z.string().min(1).max(64),
  subject: z.string().min(1).max(300),
  question: z.string().min(1).max(20_000),
  background: z.string().max(20_000).default(''),
  awaiting: z.string().max(2_000).default(''),
  /** Who asked, at the institution. Required when a member enters it for them. */
  askedBy: z.string().max(300).default(''),
  /** When they actually asked, where that is not now. */
  arrivedAt: z.string().datetime().optional(),
  attachments: z.array(z.string().min(1).max(200)).max(20).default([]),
  /*
   * The contract the question is about, as words.
   *
   * Read out of a file in the desk's own browser, so it works on an
   * installation with no mounted volume — which is every installation by
   * default, and is why a question about a contract used to arrive with the
   * contract missing.
   */
  draft: z
    .object({
      name: z.string().min(1).max(300),
      text: z.string().min(1).max(400_000),
    })
    .nullish(),
});

/**
 * Opening one is two acts in one request, and the body carries both.
 *
 * The board's reading of the question becomes the matter's title and proposal,
 * and it is written by the member opening it — never copied from the
 * submission. A system that defaulted the title to the institution's subject
 * line would make the board's reading and the bank's wording the same string by
 * accident, which is the confusion this whole module exists to prevent.
 */
const openSchema = z.object({
  title: z.string().min(3).max(300),
  proposal: z.string().min(1).max(20_000),
  direction: z.enum(['permit', 'restrict']),
  notDecided: z.array(z.string().max(2_000)).max(50).default([]),
});

const reasonSchema = z.object({ reason: z.string().min(1).max(20_000) });

/** Everything a screen needs about one, without it recomputing the record. */
function withStanding(s: Submission, at: string) {
  return {
    ...s,
    standing: standingOf(s),
    matterId: matterOf(s),
    waitedHours: waitedHours(s, at),
  };
}

export function submissionRoutes(store: Store, notifier: Notifier): Router {
  const router = Router();

  /**
   * Put a question to the board.
   *
   * A member using this route is always recording on somebody's behalf: a
   * member with a question of their own opens a matter, which is their own act
   * and needs no intermediary. So `onBehalf` is derived from the role rather
   * than taken from the body — it is a fact about who is holding the keyboard,
   * and a caller should not be able to claim otherwise.
   */
  router.post(
    '/submissions',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, maySubmit(who.role), 'put a question to the board', who.role)) return;

      const parsed = putSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const board = await store.board(parsed.data.boardId);
      if (!board) {
        res.status(404).json({ error: 'not_found', message: 'No such board.' });
        return;
      }

      const at = now();
      const id = `sub-${at.replace(/[^0-9]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`;

      const submission = submit(
        id,
        board.id,
        board.institutionId,
        who.scholarId,
        who.role !== 'institution',
        parsed.data,
        at,
      );

      const stored = await store.createSubmission(submission);

      /*
       * The notice travels with the response rather than being fetched
       * separately, so the screen that just accepted a question can show, in
       * the same breath, the words to send and whether anything was sent.
       */
      const notice = compose(board, { kind: 'submission_arrived', submission: stored });
      const delivery = await notifier.deliver(notice, at);

      res.status(201).json({ submission: withStanding(stored, at), notice, delivery });
    }),
  );

  /**
   * What is waiting, and what became of what was not.
   *
   * A board member sees the board's queue. An institution sees only what it put
   * in itself — which is narrower than the store's own isolation, because two
   * desks at the same bank share an institution and should not share a queue.
   */
  router.get(
    '/submissions',
    handle(async (req, res) => {
      const who = identityOf(req);
      const boardId = typeof req.query.board === 'string' ? req.query.board : undefined;

      let all = await store.submissions(boardId);
      if (who.role === 'institution') {
        all = all.filter((s) => s.recordedBy === who.scholarId);
      }

      const at = now();
      res.json({
        submissions: all
          .map((s) => withStanding(s, at))
          .sort((a, b) => Date.parse(a.arrivedAt) - Date.parse(b.arrivedAt)),
        /** The queue itself, oldest first, so a screen does not re-derive it. */
        waiting: waiting(all).map((s) => s.id),
      });
    }),
  );

  router.get(
    '/submissions/:id',
    handle(async (req, res) => {
      const who = identityOf(req);
      const found = await store.submission(req.params.id);

      /*
       * A question belonging to another desk is answered as though it did not
       * exist. Telling one desk that another's question exists but is not
       * theirs to read is a leak in itself.
       */
      if (!found || (who.role === 'institution' && found.recordedBy !== who.scholarId)) {
        res.status(404).json({ error: 'not_found', message: 'No such question.' });
        return;
      }

      res.json({ submission: withStanding(found, now()) });
    }),
  );

  /**
   * The board takes it up.
   *
   * The matter is created first and the link recorded second. That order
   * matters: if the link were written first and the matter creation then
   * failed, the record would point at a matter that does not exist, which is
   * worse than a matter with no submission pointing at it.
   *
   * The matter carries `arrivedAt` from the submission, which is the first time
   * anything has been able to set it. Until now every matter reported its wait
   * as partial and said the institution might have asked earlier; now, for a
   * matter that came in this way, it knows.
   */
  router.post(
    '/submissions/:id/open',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayDisposeOfSubmission(who.role), 'open a question as a matter', who.role)) {
        return;
      }

      const parsed = openSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const found = await store.submission(req.params.id);
      if (!found) {
        res.status(404).json({ error: 'not_found', message: 'No such question.' });
        return;
      }

      const board = await store.board(found.boardId);
      if (!board) {
        res.status(404).json({ error: 'not_found', message: 'This question names a board that does not exist.' });
        return;
      }

      const at = now();
      const matterId = `matter-${at.replace(/[^0-9]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`;

      const matter: Matter = {
        id: matterId,
        boardId: found.boardId,
        title: parsed.data.title,
        origin: 'institution_request',
        direction: parsed.data.direction,
        status: 'draft',
        openedAt: at,
        arrivedAt: found.arrivedAt,
        proposal: parsed.data.proposal,
        notDecided: parsed.data.notDecided,
        mechanism: '',
        interactsWith: [],
        assetIds: [],
        proposedRule: {
          id: `rule-${matterId}`,
          boardId: found.boardId,
          title: parsed.data.title,
          statement: parsed.data.proposal,
          parameters: [],
          parameterHash: '',
          version: 1,
          inForceFrom: null,
          supersededBy: null,
          supersedes: null,
          sources: [],
        },
        simulation: null,
        deliberation: [],
        reasoning: [],
        timelockStartedAt: null,
        timelockEndsAt: null,
        objections: [],
        inForceAt: null,
        /*
         * The contract the question came with travels into the matter.
         *
         * Without this the chain broke at its last step: a scholar was shown
         * the draft on the queue, pressed *take it up*, and arrived at a matter
         * with no contract attached to it — the document having reached the
         * board and then been dropped on the way to the place it is decided.
         *
         * It is a source like any other, so everything already written about
         * sources applies: it is withdrawn rather than deleted, it carries who
         * put it there and when, and the reader on the matter page finds it
         * where it finds every other source.
         */
        sources: found.draft
          ? [
              {
                kind: 'document' as const,
                label: found.draft.name,
                ref: `submission:${found.id}`,
                id: `src-${matterId}-draft`,
                addedBy: who.scholarId,
                at,
                note: 'Sent by the institution with the question this matter came from.',
                withdrawnAt: null,
              },
            ]
          : [],
      };

      // The service refuses a question already answered, before anything is
      // created. Checked here so a refusal leaves no orphan matter behind.
      open(found, matterId, who.scholarId, at);

      await store.createMatter(matter);
      const updated = await store.updateSubmission(found.id, (current) =>
        open(current, matterId, who.scholarId, at),
      );

      const notice = compose(board, {
        kind: 'matter_opened',
        matterId,
        title: matter.title,
        openedBy: who.scholarId,
      });
      const delivery = await notifier.deliver(notice, at);

      res.status(201).json({ submission: withStanding(updated, at), matter, notice, delivery });
    }),
  );

  /** The board does not take it up, and says why. */
  router.post(
    '/submissions/:id/decline',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayDisposeOfSubmission(who.role), 'decline a question', who.role)) return;

      const parsed = reasonSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const at = now();
      const updated = await store.updateSubmission(req.params.id, (current) =>
        decline(current, parsed.data.reason, who.scholarId, at),
      );

      res.json({ submission: withStanding(updated, at) });
    }),
  );

  /**
   * The institution takes its own question back.
   *
   * Only whoever put it in. The board declining is a different act with a
   * different meaning, and recording it as a withdrawal would put words in the
   * institution's mouth — it would read, later, as though the bank had changed
   * its mind when in fact it was turned down.
   */
  router.post(
    '/submissions/:id/withdraw',
    handle(async (req, res) => {
      const who = identityOf(req);

      const parsed = reasonSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const found = await store.submission(req.params.id);
      if (!found) {
        res.status(404).json({ error: 'not_found', message: 'No such question.' });
        return;
      }

      if (found.recordedBy !== who.scholarId) {
        res.status(403).json({
          error: 'not_yours',
          message:
            'A question is withdrawn by whoever put it. The board does not withdraw somebody ' +
            'else’s question — it declines it, and says why.',
        });
        return;
      }

      const at = now();
      const updated = await store.updateSubmission(found.id, (current) =>
        withdraw(current, parsed.data.reason, who.scholarId, at),
      );

      res.json({ submission: withStanding(updated, at) });
    }),
  );

  return router;
}
