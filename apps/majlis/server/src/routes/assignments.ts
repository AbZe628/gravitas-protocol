import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { structures } from '../data/structures.js';
import { howOf, heldBy, mayAssign, placeable, type Assignment } from '../services/assignment.js';
import { buildPassage } from '../services/passage.js';
import { buildIncidentPassage } from '../services/passage-incident.js';
import { buildQuestionPassage } from '../services/passage-question.js';
import { buildReviewPassage } from '../services/passage-review.js';
import { buildUndertakingPassage } from '../services/passage-undertaking.js';
import type { Passage, PassageKind } from '../services/passage-shape.js';
import type { Members, Role } from '../auth/members.js';
import type { Store } from '../store/index.js';
import type { Board } from '../types.js';
import { badRequest, handle, identityOf } from './http.js';

/**
 * Placing work with a person.
 *
 * ── one route for four acts ───────────────────────────────────────────────
 *
 * Giving, taking, handing on and putting back are the same record written by
 * different people about different people. A chair writes one naming a member;
 * a member writes one naming themselves; a holder writes one naming a
 * colleague, or naming nobody. Which of the four it was is read back off the
 * record — see `howOf` — rather than sent, because a request that said *this
 * is a hand-over* could say so while naming somebody who never held it.
 *
 * Four routes would have meant four places to keep one rule.
 *
 * ── who it may name ───────────────────────────────────────────────────────
 *
 * Somebody who sits on this board: on the board's own list **and** holding a
 * signatory's or an advisory member's credential. Not the institution, not
 * its liaison: those are the other side of the table, and placing work with
 * them from in here would be this board minuting a commitment the bank never
 * made.
 *
 * Both lists, because neither is enough. The board's list carries the
 * liaison as a member — they attend and answer on mechanism — and a check
 * against that list alone let work be placed with the bank's own person,
 * which is what the paragraph above says cannot happen. The credential file
 * says what each person is.
 *
 * ── and it never says the work is done ────────────────────────────────────
 *
 * An assignment moves a name, and nothing else. A step is open or not
 * according to what is in the record, exactly as before; who is holding it
 * changes nothing about whether it has happened.
 */

const OF_KINDS = ['matter', 'breach', 'question', 'undertaking', 'review'] as const;

const placing = z.object({
  ofKind: z.enum(OF_KINDS),
  ofId: z.string().min(1),
  /** Null, or absent, for the whole thing rather than one step of it. */
  stepKey: z.string().min(1).nullish(),
  /** Null to put it back to the room. */
  to: z.string().min(1).nullable(),
  note: z.string().max(2000).optional(),
});

/**
 * The reading of the thing an assignment is about, or null where there is no
 * such thing on this board.
 *
 * Read so the route can refuse an assignment to something that does not
 * exist, or to a step the thing does not have. Without it the record could
 * say somebody holds step `conditions` of matter `nonsense`, and the screen
 * that asks what needs you would count it against them forever.
 */
async function passageOf(
  store: Store,
  board: Board,
  ofKind: PassageKind,
  ofId: string,
  at: string,
): Promise<Passage | null> {
  switch (ofKind) {
    case 'matter': {
      const m = await store.matter(ofId);
      if (!m || m.boardId !== board.id) return null;
      const shape = m.structureId ? (structures.find((s) => s.id === m.structureId) ?? null) : null;
      return buildPassage(board, m, shape, at);
    }
    case 'breach': {
      const i = await store.incident(ofId);
      return i && i.boardId === board.id ? buildIncidentPassage(i, at) : null;
    }
    case 'question': {
      const q = await store.submission(ofId);
      return q && q.boardId === board.id ? buildQuestionPassage(q, at) : null;
    }
    case 'undertaking': {
      const u = await store.undertaking(ofId);
      return u && u.boardId === board.id ? buildUndertakingPassage(u, at) : null;
    }
    case 'review': {
      const r = await store.rule(ofId);
      return r && r.boardId === board.id ? buildReviewPassage(r, at) : null;
    }
  }
}

/** The two roles that sit on this side of the table. */
const SITS: readonly Role[] = ['signatory', 'advisory'];

export function assignmentRoutes(
  store: Store,
  members: Members | null,
  now: () => string = () => new Date().toISOString(),
): Router {
  const router = Router();

  /** What the credential file says somebody is, or null where it does not know them. */
  const roleOf = (scholarId: string): Role | null =>
    members?.roster().find((m) => m.scholarId === scholarId)?.role ?? null;

  const sits = (board: Board, scholarId: string, role: Role | null): boolean =>
    board.members.some((m) => m.id === scholarId) && role !== null && SITS.includes(role);

  /*
   * One board per installation, and the store is already scoped to one
   * institution — the same assumption the arrival queue makes. A second way of
   * deciding which board a request is about would be a second thing to keep
   * true.
   */
  const theBoard = async () => (await store.boards())[0] ?? null;

  /**
   * Everything ever written about who is doing what on this board.
   *
   * The whole record and not only what stands, because *who was this with
   * while it sat for forty days* is a question a board asks and a list of
   * current holders cannot answer.
   *
   * Open to observers. Seeing who is doing what is reading.
   */
  router.get(
    '/assignments',
    handle(async (req, res) => {
      const board = await theBoard();
      if (!board) {
        res.status(404).json({ error: 'not_found', message: 'No such board.' });
        return;
      }

      const all = await store.assignments(board.id);
      const ofId = typeof req.query.ofId === 'string' ? req.query.ofId : null;

      res.json({
        assignments: ofId ? all.filter((a) => a.ofId === ofId) : all,
        asOf: now(),
      });
    }),
  );

  router.post(
    '/assignments',
    handle(async (req, res) => {
      const who = identityOf(req);
      const parsed = placing.safeParse(req.body);
      if (!parsed.success) {
        badRequest(res, parsed.error);
        return;
      }
      const { ofKind, ofId, to, note } = parsed.data;
      const stepKey = parsed.data.stepKey ?? null;

      const board = await theBoard();
      if (!board) {
        res.status(404).json({ error: 'not_found', message: 'No such board.' });
        return;
      }

      if (to !== null && !sits(board, to, roleOf(to))) {
        res.status(400).json({
          error: 'not_a_member',
          message:
            'Work is placed with somebody who sits on this board. The institution’s own steps are ' +
            'theirs to arrange, and this board recording who does them would be putting ' +
            'words in their mouth.',
        });
        return;
      }

      const passage = await passageOf(store, board, ofKind, ofId, now());
      if (!passage) {
        res.status(404).json({ error: 'not_found', message: 'There is no such thing on this board.' });
        return;
      }

      /*
       * The step, where one is named: it has to be a step this thing has, and
       * one a person on this board can hold.
       */
      const step = stepKey
        ? (passage.groups.flatMap((g) => g.steps).find((s) => s.key === stepKey) ?? null)
        : null;
      if (stepKey && !step) {
        res.status(404).json({ error: 'no_such_step', message: 'That is not a step of this.' });
        return;
      }
      if (step && !placeable(step)) {
        res.status(400).json({
          error: 'not_placeable',
          message:
            step.state === 'open' || step.state === 'ahead'
              ? 'That step is not the board’s to place: it belongs to the institution, or to a clock.'
              : 'That step is already behind it. Who was asked to do it changes nothing now.',
        });
        return;
      }

      /*
       * A signatory's step, named on its own, goes to a signatory. Carrying a
       * whole matter to its finding can be anybody's work; being the one who
       * determines it cannot, and a name on that step would say otherwise.
       */
      if (step?.whose === 'signatory' && to !== null) {
        if (roleOf(to) !== 'signatory') {
          res.status(400).json({
            error: 'not_a_signatory',
            message: 'That step is a signatory’s own act. It can be placed with a signatory.',
          });
          return;
        }
      }

      const assignments = await store.assignments(board.id);
      const standing = heldBy(assignments, ofKind, ofId, step);

      const refusal = mayAssign({
        by: who.scholarId,
        office: who.office ?? null,
        onTheBoard: sits(board, who.scholarId, who.role),
        to,
        heldBy: standing?.to ?? null,
      });

      if (refusal) {
        res.status(403).json({
          error: refusal,
          message:
            refusal === 'held_by_somebody_else'
              ? 'This is with a colleague. Ask them to hand it on, or the chair to move it.'
              : refusal === 'not_a_member'
                ? 'Only somebody on this board may place its work.'
                : 'That is not yours to hand on.',
        });
        return;
      }

      const assignment: Assignment = {
        id: `asg-${randomUUID()}`,
        boardId: board.id,
        ofKind,
        ofId,
        stepKey,
        to,
        by: who.scholarId,
        at: now(),
        ...(note?.trim() ? { note: note.trim() } : {}),
      };

      const written = await store.assign(assignment);
      res.status(201).json({ assignment: written, how: howOf(written, standing) });
    }),
  );

  return router;
}
