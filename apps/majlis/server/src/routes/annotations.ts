/**
 * Notes in the margin of the papers, over HTTP.
 *
 * Three routes, and one rule behind all of them: **the server finds the text,
 * the client never sends it.** A caller that supplied the document a passage
 * was found in could attach a note to words that are not in the papers at all,
 * and the note would then be shown beside a passage the board never read.
 *
 * So the request names what is being read — a matter's proposal, a briefing, a
 * contract shape in the library — and this route fetches those words from the
 * record and checks the marked passage against them.
 *
 * Whoever may deliberate may write in the margins. An observer reads them, and
 * the institution's desk does not see them at all: a note is a member's
 * reading before the board has agreed anything, and it is the most private
 * thing in this record.
 */

import { Router } from 'express';
import { z } from 'zod';
import { mayDeliberate } from '../auth/members.js';
import { mark, withdraw, threads, summarise, Refused, type Annotated } from '../services/annotation.js';
import { effectiveFor } from '../services/adoption.js';
import type { Store } from '../store/index.js';
import { handle, badRequest, identityOf, requireRole } from './http.js';

const ON = z.enum(['proposal', 'briefing', 'document']);

const markSchema = z.object({
  on: ON,
  subjectId: z.string().min(1).max(120),
  /** Absent on a reply: a reply inherits the passage it answers. */
  quote: z.string().max(4_000).optional(),
  said: z.string().trim().min(2).max(4_000),
  replyTo: z.string().max(120).optional(),
});

/**
 * The words a note may be written on, fetched from the record.
 *
 * Returns null where the thing does not exist, which the route answers with a
 * 404 rather than with an empty document — a note silently attached to nothing
 * would be a note nobody could ever find again.
 */
async function wordsOf(
  store: Store,
  on: Annotated,
  subjectId: string,
): Promise<{ text: string; boardId: string } | null> {
  if (on === 'proposal') {
    const matter = await store.matter(subjectId);
    if (!matter) return null;
    return { text: matter.proposal, boardId: matter.boardId };
  }

  if (on === 'briefing') {
    const briefing = (await store.briefings()).find((b) => b.id === subjectId);
    if (!briefing) return null;
    const boards = await store.boards();
    if (!boards[0]) return null;
    /*
     * The technical account, and only that.
     *
     * The question the briefing puts to the board is deliberately outside the
     * markable text: it is not a passage to be annotated but a question to be
     * answered, and the screen answers it by opening a matter. A member who
     * marked a line in the question and wrote what they thought would be
     * deliberating in the margin of a document instead of under the matter
     * where the ruling is written from.
     */
    return {
      text: [briefing.whatChanged, briefing.whyChanged].join('\n\n'),
      boardId: boards[0].id,
    };
  }

  const boards = await store.boards();
  if (!boards[0]) return null;

  /*
   * A contract shape is read as its conditions. Where the board has taken it
   * up with changes, the board's own wording is what is on the page, so it is
   * the board's own wording a note is written against — which is what
   * `effectiveFor` resolves, by the supersession chain rather than by time.
   */
  const effective = effectiveFor(subjectId, boards[0].id, await store.adoptions(boards[0].id));
  if (!effective) return null;

  return {
    text: effective.structure.conditions.map((c) => c.requirement).join('\n\n'),
    boardId: boards[0].id,
  };
}

export function annotationRoutes(
  store: Store,
  now: () => string = () => new Date().toISOString(),
): Router {
  const router = Router();

  /**
   * Every note on one thing being read.
   *
   * The passages are re-found in the document as it stands now rather than
   * trusted from when they were written, so a note that has come loose is
   * reported as loose instead of pointing at whatever moved into its place.
   */
  router.get(
    '/annotations/:on/:subjectId',
    handle(async (req, res) => {
      const on = ON.safeParse(req.params.on);
      if (!on.success) return badRequest(res, on.error.issues);

      const words = await wordsOf(store, on.data, req.params.subjectId);
      if (!words) {
        res.status(404).json({ error: 'not_found', message: 'There is nothing here to write on.' });
        return;
      }

      const all = (await store.annotations(req.params.subjectId)).filter((a) => a.on === on.data);
      const board = await store.board(words.boardId);
      const byName = new Map((board?.members ?? []).map((m) => [m.id, m.name]));

      res.json({
        on: on.data,
        subjectId: req.params.subjectId,
        threads: threads(all, words.text).map((t) => ({
          ...t,
          whoName: byName.get(t.note.annotation.by) ?? t.note.annotation.by,
          replies: t.replies.map((r) => ({ ...r, whoName: byName.get(r.by) ?? r.by })),
        })),
        summary: summarise(all, words.text),
        /*
         * The text the passages were checked against, so the screen marks the
         * same words the server did. Two copies of a document disagreeing
         * about where a sentence is, is how a note ends up beside the wrong
         * one.
         */
        text: words.text,
      });
    }),
  );

  /** Write one. Whoever may deliberate. */
  router.post(
    '/annotations',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayDeliberate(who.role), 'write a note on the papers', who.role)) return;

      const parsed = markSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const words = await wordsOf(store, parsed.data.on, parsed.data.subjectId);
      if (!words) {
        res.status(404).json({ error: 'not_found', message: 'There is nothing here to write on.' });
        return;
      }

      const board = await store.board(words.boardId);
      if (!board) {
        res.status(404).json({ error: 'not_found', message: 'No such board.' });
        return;
      }

      let replyTo;
      if (parsed.data.replyTo) {
        replyTo = (await store.annotation(parsed.data.replyTo)) ?? undefined;
        if (!replyTo) {
          res.status(404).json({ error: 'not_found', message: 'No such note to reply to.' });
          return;
        }
      }

      try {
        const made = mark({
          id: `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          boardId: board.id,
          on: parsed.data.on,
          subjectId: parsed.data.subjectId,
          text: words.text,
          quote: parsed.data.quote ?? '',
          said: parsed.data.said,
          by: who.scholarId,
          at: now(),
          members: board.members,
          ...(replyTo ? { replyTo } : {}),
        });
        res.status(201).json({ annotation: await store.markAnnotation(made) });
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
   * Withdraw one. It stays, marked, with what it said.
   *
   * Only whoever wrote it — the service refuses anybody else, and this route
   * does not second-guess it, so there is one place the rule lives.
   */
  router.post(
    '/annotations/:id/withdraw',
    handle(async (req, res) => {
      const who = identityOf(req);

      const held = await store.annotation(req.params.id);
      if (!held) {
        res.status(404).json({ error: 'not_found', message: 'No such note.' });
        return;
      }

      try {
        const next = await store.updateAnnotation(held.id, (current) =>
          withdraw(current, who.scholarId, now()),
        );
        res.status(200).json({ annotation: next });
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
