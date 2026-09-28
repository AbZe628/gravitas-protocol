import { Router } from 'express';
import { z } from 'zod';
import { howOf, heldBy, mayAssign, type Assignment } from '../services/assignment.js';
import type { PassageKind } from '../services/passage-shape.js';
import type { Store } from '../store/index.js';
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
 * Somebody on this board. Not the institution, not its liaison desk: those
 * are the other side of the table, and placing work with them from in here
 * would be this board minuting a commitment the bank never made.
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

export function assignmentRoutes(
  store: Store,
  now: () => string = () => new Date().toISOString(),
): Router {
  const router = Router();

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

      /*
       * Somebody on this board, checked against the board's own list.
       *
       * The other side of the table is deliberately not placeable: a board
       * that could assign work to the bank's liaison would be minuting a
       * commitment the bank never made.
       */
      if (to !== null && !board.members.some((m) => m.id === to)) {
        res.status(400).json({
          error: 'not_a_member',
          message:
            'Work is placed with somebody on this board. The institution’s own steps are ' +
            'theirs to arrange, and this board recording who does them would be putting ' +
            'words in their mouth.',
        });
        return;
      }

      const assignments = await store.assignments(board.id);
      const standing = stepKey
        ? heldBy(assignments, ofKind as PassageKind, ofId, stepKey)
        : (heldBy(assignments, ofKind as PassageKind, ofId, '') ?? null);

      const refusal = mayAssign({
        by: who.scholarId,
        office: who.office ?? null,
        onTheBoard: board.members.some((m) => m.id === who.scholarId),
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
        id: `asg-${ofId}-${Date.now().toString(36)}`,
        boardId: board.id,
        ofKind: ofKind as PassageKind,
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
