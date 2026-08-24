/**
 * The routes through which a board actually decides something.
 *
 * Three rules hold across every one of them.
 *
 *   **The identity comes from the credential, never from the body.** A request
 *   does not get to say whose vote it is carrying. If it could, one member's
 *   password would let them vote as the whole board, and the record would be
 *   worth nothing. `scholarId` is taken from `req.identity` and any value in
 *   the payload is ignored.
 *
 *   **The lifecycle decides, not the route.** Every change is applied inside
 *   `store.updateMatter`, so the rules in `services/lifecycle.ts` run against
 *   the stored matter inside a transaction. A refusal writes nothing. Two
 *   members closing the same vote in the same second cannot interleave: the
 *   second sees what the first wrote and is refused, legibly.
 *
 *   **Nothing here signs anything.** A matter reaching `in_force` records what
 *   the board decided. It does not touch the Policy Registry. Stage Three is
 *   where the vote becomes the signature.
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { mayDeliberate, mayOpenMatter, mayVote, type Identity } from '../auth/members.js';
import {
  Refused,
  bringIntoForce,
  closeVoting,
  returnToDeliberation,
  objectDuringTimelock,
  openDeliberation,
  openVoting,
  recordVote,
  tally,
  withdraw,
} from '../services/lifecycle.js';
import { attentionList } from '../services/attention.js';
import { NotFound, type Store } from '../store/index.js';
import type { Deliberation, Matter } from '../types.js';

/**
 * A refusal is not an error in the server. It is the system doing its job, and
 * the status should say which kind of "no" the caller received.
 */
const STATUS: Record<string, number> = {
  no_reason_given: 400,
  not_a_signatory: 403,
  not_on_this_board: 403,
  // Everything else is a conflict with the state the matter is actually in.
};

function sendRefusal(res: Response, error: Refused): void {
  res.status(STATUS[error.code] ?? 409).json({ error: error.code, message: error.message });
}

/** Wrap a handler so refusals, missing matters and faults each read correctly. */
function handle(fn: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      await fn(req, res);
    } catch (error) {
      if (error instanceof Refused) return sendRefusal(res, error);
      if (error instanceof NotFound) {
        res.status(404).json({ error: 'not_found', message: error.message });
        return;
      }
      console.error('governance error:', error);
      res.status(500).json({ error: 'internal', message: 'The change was not made.' });
    }
  };
}

/** Who is making this request. Absent only if auth is off entirely. */
function identityOf(req: Request): Identity {
  return req.identity ?? { scholarId: 'anonymous', role: 'observer' };
}

function requireRole(res: Response, allowed: boolean, what: string): boolean {
  if (allowed) return true;
  res.status(403).json({
    error: 'role_not_permitted',
    message:
      `This credential may not ${what}. Voting and objecting belong to signatories; ` +
      'deliberating is open to the board; a shared credential only reads.',
  });
  return false;
}

/**
 * The board a matter belongs to, or a 404 already sent.
 *
 * Read before the transaction rather than inside it. A board is quorum sizes and
 * membership; it changes when a board is reconstituted, not while a vote is
 * being cast, so nothing is gained by holding it inside the write and the
 * transaction stays as short as it can be.
 */
async function boardFor(store: Store, res: Response, matterId: string) {
  const matter = await store.matter(matterId);
  if (!matter) {
    res.status(404).json({ error: 'not_found', message: 'No such matter.' });
    return null;
  }
  const board = await store.board(matter.boardId);
  if (!board) {
    res.status(404).json({ error: 'not_found', message: 'This matter names a board that does not exist.' });
    return null;
  }
  return board;
}

const reasonSchema = z.string().min(1).max(20_000);

const openSchema = z.object({
  boardId: z.string().min(1).max(64),
  title: z.string().min(3).max(300),
  proposal: z.string().min(1).max(20_000),
  direction: z.enum(['permit', 'restrict']),
  origin: z.enum(['institution_request', 'protocol_change', 'periodic_review', 'compliance_concern']),
  mechanism: z.string().max(20_000).default(''),
  notDecided: z.array(z.string().max(2_000)).max(50).default([]),
  interactsWith: z.array(z.string().max(120)).max(50).default([]),
});

const saySchema = z.object({
  body: z.string().min(1).max(20_000),
  replyTo: z.string().max(120).nullish(),
});

const voteSchema = z.object({
  position: z.enum(['for', 'against', 'abstain']),
  reason: reasonSchema,
});

const objectSchema = z.object({ reason: reasonSchema });

function badRequest(res: Response, issues: unknown): void {
  res.status(400).json({ error: 'invalid_request', detail: issues });
}

export function governanceRoutes(store: Store, now: () => string = () => new Date().toISOString()): Router {
  const router = Router();

  /** Open a matter. Not a vote, so anyone who deliberates may raise one. */
  router.post(
    '/matters',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayOpenMatter(who.role), 'open a matter')) return;

      const parsed = openSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const board = await store.board(parsed.data.boardId);
      if (!board) {
        res.status(404).json({ error: 'not_found', message: 'No such board.' });
        return;
      }

      const at = now();
      const id = `matter-${at.replace(/[^0-9]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`;

      const matter: Matter = {
        id,
        boardId: parsed.data.boardId,
        title: parsed.data.title,
        origin: parsed.data.origin,
        direction: parsed.data.direction,
        status: 'draft',
        openedAt: at,
        proposal: parsed.data.proposal,
        notDecided: parsed.data.notDecided,
        mechanism: parsed.data.mechanism,
        interactsWith: parsed.data.interactsWith,
        // The rule is drafted alongside the matter and carries no parameters
        // until they are proposed. An empty hash is honest; a fabricated one
        // would be the exact failure this system exists to prevent.
        proposedRule: {
          id: `rule-${id}`,
          boardId: parsed.data.boardId,
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
        sources: [],
      };

      res.status(201).json(await store.createMatter(matter));
    }),
  );

  /** Say something. Threads hang off replyTo, which the type has always had. */
  router.post(
    '/matters/:id/deliberation',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayDeliberate(who.role), 'deliberate')) return;

      const parsed = saySchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const at = now();
      const updated = await store.updateMatter(req.params.id, (matter) => {
        if (matter.status !== 'draft' && matter.status !== 'deliberation' && matter.status !== 'voting') {
          throw new Refused(
            'wrong_status',
            `This matter is ${matter.status}. Deliberation is open while it is being drafted, ` +
              'deliberated or voted on, and closes once it leaves those.',
          );
        }
        if (parsed.data.replyTo && !matter.deliberation.some((d) => d.id === parsed.data.replyTo)) {
          throw new Refused('wrong_status', 'That reply points at nothing in this matter.');
        }

        const entry: Deliberation = {
          id: `d-${at.replace(/[^0-9]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`,
          scholarId: who.scholarId,
          body: parsed.data.body,
          at,
          replyTo: parsed.data.replyTo ?? null,
          // Claimed by the role, never by the payload.
          liaisonAnswer: who.role === 'liaison',
        };
        return { ...matter, deliberation: [...matter.deliberation, entry] };
      });

      res.status(201).json(updated);
    }),
  );

  /**
   * Return an open vote to deliberation, releasing every position cast on it.
   * The reason is written into the thread, because a vote that stops without
   * saying why is the thing this whole system exists to prevent.
   */
  router.post(
    '/matters/:id/reopen',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayVote(who.role), 'return a matter to deliberation')) return;

      const parsed = objectSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const board = await boardFor(store, res, req.params.id);
      if (!board) return;

      const at = now();
      const updated = await store.updateMatter(req.params.id, (matter) => {
        const { matter: returned, released } = returnToDeliberation(
          board,
          matter,
          { scholarId: who.scholarId, reason: parsed.data.reason },
          at,
        );

        const entry: Deliberation = {
          id: `d-${at.replace(/[^0-9]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`,
          scholarId: who.scholarId,
          body:
            parsed.data.reason +
            (released > 0
              ? `\n\n(The vote was returned to deliberation. ${released} position${released === 1 ? '' : 's'} released.)`
              : ''),
          at,
          replyTo: null,
          liaisonAnswer: false,
        };

        return { ...returned, deliberation: [...returned.deliberation, entry] };
      });

      res.json(updated);
    }),
  );

  /** Move a draft into deliberation. */
  router.post(
    '/matters/:id/open',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayDeliberate(who.role), 'open deliberation')) return;
      res.json(await store.updateMatter(req.params.id, (m) => openDeliberation(m, now())));
    }),
  );

  /** Open the vote. Refused if nothing has been said. */
  router.post(
    '/matters/:id/voting',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayVote(who.role), 'open a vote')) return;
      res.json(await store.updateMatter(req.params.id, openVoting));
    }),
  );

  /** Record a position. The identity is the credential's, never the body's. */
  router.post(
    '/matters/:id/vote',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayVote(who.role), 'vote')) return;

      const parsed = voteSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const board = await boardFor(store, res, req.params.id);
      if (!board) return;

      const at = now();
      const updated = await store.updateMatter(req.params.id, (matter) =>
        recordVote(board, matter, { scholarId: who.scholarId, position: parsed.data.position, reason: parsed.data.reason }, at),
      );
      res.status(201).json(updated);
    }),
  );

  /** Close the vote and let the direction decide what happens next. */
  router.post(
    '/matters/:id/close',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayVote(who.role), 'close a vote')) return;

      const board = await boardFor(store, res, req.params.id);
      if (!board) return;

      let outcome = '';
      const updated = await store.updateMatter(req.params.id, (matter) => {
        const closed = closeVoting(board, matter, now());
        outcome = closed.outcome;
        return closed.matter;
      });
      res.json({ ...updated, outcome });
    }),
  );

  /** One objection during the timelock halts the change. */
  router.post(
    '/matters/:id/object',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayVote(who.role), 'object')) return;

      const parsed = objectSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const board = await boardFor(store, res, req.params.id);
      if (!board) return;

      const at = now();
      const updated = await store.updateMatter(req.params.id, (matter) =>
        objectDuringTimelock(board, matter, { scholarId: who.scholarId, reason: parsed.data.reason }, at),
      );
      res.json(updated);
    }),
  );

  /** Bring a change into force once the timelock has run and nobody objected. */
  router.post(
    '/matters/:id/force',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayVote(who.role), 'bring a change into force')) return;
      res.json(await store.updateMatter(req.params.id, (m) => bringIntoForce(m, now())));
    }),
  );

  /** Withdraw. A system that traps its own proposals teaches people not to open them. */
  router.post(
    '/matters/:id/withdraw',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayDeliberate(who.role), 'withdraw a matter')) return;
      res.json(await store.updateMatter(req.params.id, withdraw));
    }),
  );

  /**
   * What this member still has to do, soonest deadline first.
   *
   * Derived from the record rather than kept as a queue, so it cannot drift
   * from what is actually true. Personal: "three matters need attention" is
   * not useful to someone who has already acted on all three.
   */
  router.get(
    '/attention',
    handle(async (req, res) => {
      const who = identityOf(req);
      const [boards, matters] = await Promise.all([store.boards(), store.matters()]);
      const items = attentionList(boards, matters, { scholarId: who.scholarId, now: now() });
      res.json({
        scholarId: who.scholarId,
        role: who.role,
        outstanding: items.length,
        overdue: items.filter((i) => i.overdue).length,
        items,
      });
    }),
  );

  /** Where a vote stands. A read, but it belongs with these. */
  router.get(
    '/matters/:id/tally',
    handle(async (req, res) => {
      const matter = await store.matter(req.params.id);
      if (!matter) {
        res.status(404).json({ error: 'not_found', message: 'No such matter.' });
        return;
      }
      const board = await store.board(matter.boardId);
      if (!board) {
        res.status(404).json({ error: 'not_found', message: 'No such board.' });
        return;
      }
      res.json(tally(board, matter));
    }),
  );

  return router;
}
