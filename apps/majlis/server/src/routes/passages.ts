import { Router } from 'express';
import { structures } from '../data/structures.js';
import { visibleTo, withAssignments } from '../services/assignment.js';
import { buildPassage } from '../services/passage.js';
import { buildIncidentPassage } from '../services/passage-incident.js';
import { buildQuestionPassage } from '../services/passage-question.js';
import { buildReviewPassage } from '../services/passage-review.js';
import { buildUndertakingPassage } from '../services/passage-undertaking.js';
import type { Passage, PassageKind } from '../services/passage-shape.js';
import type { Store } from '../store/index.js';
import type { Board } from '../types.js';
import { handle, identityOf } from './http.js';

/**
 * The passage of anything on this board, of any of the five kinds.
 *
 * ── why a route of its own ────────────────────────────────────────────────
 *
 * A matter and a breach each had a passage route; a question and a ruling
 * coming up for review had none, so no screen that shows them could say who
 * is carrying one or offer to take it up — which is the first thing a chair
 * does with a question: gives it to the member who knows that market. The
 * queue read their passages and nothing else could.
 *
 * `GET /passages/:kind` answers for every one of a kind at once, so a list
 * does not send a request per card. `GET /passages/:kind/:id` answers for one.
 * Both come through `withAssignments`, like every other route that serves a
 * passage, and through `visibleTo`, so a bank desk is never told who on the
 * board holds anything.
 *
 * ── and a desk reads only its own questions ───────────────────────────────
 *
 * The same fence `/submissions` keeps: two desks at the same bank share an
 * institution and should not share a queue, and a question belonging to
 * another desk is answered as though it did not exist. The first version of
 * this route answered a desk with every question on the board.
 */

const KINDS: readonly PassageKind[] = ['matter', 'breach', 'question', 'undertaking', 'review'];

const isKind = (k: string): k is PassageKind => (KINDS as readonly string[]).includes(k);

/**
 * The reading of one thing, or null where there is no such thing on this board.
 *
 * Also what the assignment route reads, so it can refuse an assignment to
 * something that does not exist, or to a step the thing does not have. Without
 * it the record could say somebody holds step `conditions` of matter
 * `nonsense`, and the screen that asks what needs you would count it against
 * them forever.
 */
export async function passageOf(
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

/**
 * Every one of a kind on this board.
 *
 * A record that cannot be read is left out rather than taking the list down
 * with it — the same reason the queue wraps each reading: one malformed record
 * must not cost a member every other one. Its own page says what is wrong.
 */
async function passagesOf(store: Store, board: Board, kind: PassageKind, at: string): Promise<Passage[]> {
  const read = <T>(all: readonly T[], one: (x: T) => Passage): Passage[] =>
    all.flatMap((x) => {
      try {
        return [one(x)];
      } catch {
        return [];
      }
    });

  switch (kind) {
    case 'matter':
      return read(await store.matters(board.id), (m) =>
        buildPassage(
          board,
          m,
          m.structureId ? (structures.find((s) => s.id === m.structureId) ?? null) : null,
          at,
        ),
      );
    case 'breach':
      return read(await store.incidents(board.id), (i) => buildIncidentPassage(i, at));
    case 'question':
      return read(await store.submissions(board.id), (q) => buildQuestionPassage(q, at));
    case 'undertaking':
      return read(await store.undertakings(board.id), (u) => buildUndertakingPassage(u, at));
    case 'review':
      return read(await store.rules(board.id), (r) => buildReviewPassage(r, at));
  }
}

/**
 * The questions a bank desk recorded itself, or null for anybody on the board,
 * who reads them all. The same test `/submissions` applies.
 */
async function deskOwns(store: Store, who: { role: string; scholarId: string }): Promise<Set<string> | null> {
  if (who.role !== 'institution') return null;
  const mine = (await store.submissions()).filter((s) => s.recordedBy === who.scholarId);
  return new Set(mine.map((s) => s.id));
}

export function passageRoutes(store: Store, now: () => string = () => new Date().toISOString()): Router {
  const router = Router();

  /* One board per installation, and the store is already scoped to one institution. */
  const theBoard = async () => (await store.boards())[0] ?? null;

  router.get(
    '/passages/:kind',
    handle(async (req, res) => {
      const kind = req.params.kind;
      const board = await theBoard();
      if (!board || !isKind(kind)) {
        res.status(404).json({ error: 'not_found', message: 'There is no such kind of thing here.' });
        return;
      }
      const who = identityOf(req);
      const at = now();
      const [passages, all, own] = await Promise.all([
        passagesOf(store, board, kind, at),
        store.assignments(board.id),
        deskOwns(store, who),
      ]);
      const assignments = visibleTo(who.role, all);
      res.json({
        asOf: at,
        passages: passages
          .filter((p) => own === null || p.of.kind !== 'question' || own.has(p.of.id))
          .map((p) => withAssignments(p, assignments)),
      });
    }),
  );

  router.get(
    '/passages/:kind/:id',
    handle(async (req, res) => {
      const kind = req.params.kind;
      const who = identityOf(req);
      const board = await theBoard();
      const own = await deskOwns(store, who);
      const passage = board && isKind(kind) ? await passageOf(store, board, kind, req.params.id, now()) : null;
      // Another desk's question is answered as though it did not exist.
      const hidden = passage !== null && own !== null && kind === 'question' && !own.has(req.params.id);
      if (!board || !passage || hidden) {
        res.status(404).json({ error: 'not_found', message: 'There is no such thing on this board.' });
        return;
      }
      res.json(withAssignments(passage, visibleTo(who.role, await store.assignments(board.id))));
    }),
  );

  return router;
}
