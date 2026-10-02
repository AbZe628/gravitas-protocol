import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { howOf, heldBy, mayAssign, onOurSide, placeable, type Assignment } from '../services/assignment.js';
import {
  Refused as PutOffRefused,
  putOff,
  setAsideNow,
  takingBack,
} from '../services/putting-off.js';
import { compose, notifierFromEnv } from '../services/notice.js';
import { addressOf } from '../services/queue.js';
import { whereWeAre } from '../services/where.js';
import type { PassageKind } from '../services/passage-shape.js';
import type { Members, Role } from '../auth/members.js';
import type { Store } from '../store/index.js';
import { passageOf } from './passages.js';
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

/**
 * Setting something aside until a named day.
 *
 * `until` null is taking it back, and carries no reason: a member picking
 * something up again owes the board nothing beyond the fact that they did.
 */
const settingAside = z.object({
  ofKind: z.enum(OF_KINDS),
  ofId: z.string().min(1),
  until: z.string().datetime().nullable(),
  reason: z.string().max(2000).default(''),
});

const placing = z.object({
  ofKind: z.enum(OF_KINDS),
  ofId: z.string().min(1),
  /** Null, or absent, for the whole thing rather than one step of it. */
  stepKey: z.string().min(1).nullish(),
  /** Null to put it back to the room. */
  to: z.string().min(1).nullable(),
  note: z.string().max(2000).optional(),
});

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
   * Open to observers: seeing who is doing what is reading. Not to the
   * institution — who on the board holds the bank's own question is the
   * board's business, and see `visibleTo` for why.
   */
  router.get(
    '/assignments',
    handle(async (req, res) => {
      if (identityOf(req).role === 'institution') {
        res.status(403).json({
          error: 'forbidden',
          message: 'Who on the board is carrying what is the board’s own record.',
        });
        return;
      }
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

  /**
   * Everything standing about what has been set aside, and until when.
   *
   * Open to the board, and to observers, for the same reason the assignments
   * are: a member deciding not to look at something this week is the board's
   * business and not private. Not to the institution.
   */
  router.get(
    '/put-off',
    handle(async (req, res) => {
      if (identityOf(req).role === 'institution') {
        res.status(403).json({
          error: 'forbidden',
          message: 'What the board has set aside is the board’s own record.',
        });
        return;
      }
      const board = await theBoard();
      if (!board) {
        res.status(404).json({ error: 'not_found', message: 'No such board.' });
        return;
      }
      res.json({ putOffs: setAsideNow(await store.putOffs(board.id), now()), asOf: now() });
    }),
  );

  /**
   * Set something aside until a day, or pick it up again.
   *
   * ── it is a position, not a snooze ────────────────────────────────────
   *
   * The obvious shape — hide this row from me until Tuesday — was refused: in
   * a record whose rule is that what is written is the board's and permanent,
   * a member could push something out of sight and nobody would know it had
   * been pushed. So this is written like every other position, with a name, a
   * day and a reason, and the board reads all three. What it does is move the
   * row off the top of that member's own list and off nobody else's.
   *
   * ── and it changes nothing about what is waiting ──────────────────────
   *
   * Not the count, not the days, not whether a clock has run out. A member who
   * sets aside something already overdue has set aside something already
   * overdue.
   */
  router.post(
    '/put-off',
    handle(async (req, res) => {
      const who = identityOf(req);
      const parsed = settingAside.safeParse(req.body);
      if (!parsed.success) {
        badRequest(res, parsed.error);
        return;
      }

      const board = await theBoard();
      if (!board) {
        res.status(404).json({ error: 'not_found', message: 'No such board.' });
        return;
      }

      /*
       * Whoever sits on this side of the table, and nobody else. The bank's
       * liaison deciding what the board looks at this week would be the
       * institution arranging the board's attention.
       */
      if (!sits(board, who.scholarId, roleOf(who.scholarId))) {
        res.status(403).json({
          error: 'forbidden',
          message: 'Only somebody who sits on this board can set its work aside.',
        });
        return;
      }

      const { ofKind, ofId, until, reason } = parsed.data;

      const passage = await passageOf(store, board, ofKind, ofId, now());
      if (!passage) {
        res.status(404).json({ error: 'not_found', message: 'There is no such thing on this board.' });
        return;
      }

      const at = now();
      const held = await store.putOffs(board.id);
      try {
        if (until === null) takingBack(held, ofKind, ofId, who.scholarId);
        const entry = putOff({
          id: randomUUID(),
          boardId: board.id,
          ofKind,
          ofId,
          until,
          reason,
          by: who.scholarId,
          at,
        });
        res.status(201).json({ putOff: await store.setAside(entry) });
      } catch (e) {
        if (e instanceof PutOffRefused) {
          res.status(e.reason === 'nothing_to_take_back' ? 409 : 400).json({
            error: e.reason,
            message: e.message,
          });
          return;
        }
        throw e;
      }
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
       * one a person on this board can hold — see `placeable`.
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
            step.state !== 'open' && step.state !== 'ahead'
              ? 'That step is already behind it. Who was asked to do it changes nothing now.'
              : step.whose === 'signatory'
                ? 'Each signatory does that for themselves, so it is nobody’s to hold. Place the whole of it instead.'
                : 'That step is not the board’s to place: it belongs to the institution, or to a clock.',
        });
        return;
      }

      /*
       * The whole of it, where there is nothing left on this side to carry:
       * a matter in its waiting period, a breach waiting only on the bank.
       * Taking that would be taking a clock. Putting it back is always
       * allowed: a holder must be able to let go of something that is over.
       */
      if (!step && to !== null && !passage.groups.some((g) => g.steps.some(onOurSide))) {
        res.status(400).json({
          error: 'nothing_to_hold',
          message: 'Nothing here is left for the board to do, so there is nothing to take on.',
        });
        return;
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

      /*
       * Told to the person it was placed with, where that is somebody else.
       *
       * Placing work with a colleague is otherwise a thing that happens
       * entirely without them: the record says they are carrying it and the
       * first they hear of it is the next time they open the application.
       *
       * Not on taking it on yourself, and not on putting it back to the room —
       * a notice telling somebody what they have just done is noise, and it is
       * the fastest way to teach a board to stop reading these.
       *
       * Composed either way, and sent only where a channel is wired. The
       * screen says which, in words: a board that believed its members had
       * been told when nobody had would be worse off than one that knows it
       * has to pick up a phone.
       */
      const told =
        to !== null && to !== who.scholarId
          ? compose(board, {
              kind: 'placed_with_you',
              scholarId: to,
              by: who.scholarId,
              ofKind,
              to: addressOf(ofKind, ofId),
              at: whereWeAre(),
            })
          : null;
      const delivery = told ? await notifierFromEnv().deliver(told, now()) : null;

      res.status(201).json({
        assignment: written,
        how: howOf(written, standing),
        ...(told ? { notice: told, delivery } : {}),
      });
    }),
  );

  return router;
}
