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

import { Router, type Response } from 'express';
import { badRequest, handle, identityOf, requireRole } from './http.js';
import { z } from 'zod';
import { mayDeliberate, mayOpenMatter, mayVote } from '../auth/members.js';
import {
  Refused,
  bringIntoForce,
  attachSource,
  closeVoting,
  setImplementationSteps,
  setParameters,
  returnToDeliberation,
  withdrawSource,
  objectDuringTimelock,
  openDeliberation,
  openVoting,
  recordVote,
  tally,
  withdraw,
} from '../services/lifecycle.js';
import { attentionList } from '../services/attention.js';
import { paceOf, waitingNow } from '../services/clocks.js';
import { assemble, render } from '../services/fatwa.js';
import { assembleAnnualReport, renderAnnualReport } from '../services/annual.js';
import { buildCalendar, toICalendar } from '../services/calendar.js';
import { buildRegister, readComposition, standingOf } from '../services/register.js';
import { checklistFor, recordFinding, setStructure } from '../services/structure.js';
import { PURIFICATION_METHODS, purify, type PurificationInput } from '../services/purification.js';
import { driftReport } from '../services/drift.js';
import { structures } from '../data/structures.js';
import { buildManual, renderManual } from '../services/manual.js';
import { reviewStatus, reviewsDue } from '../services/review.js';
import { BadFigure, assess, crossings, type Assessment, type Figures } from '../services/screening.js';
import { search, type SearchFilters } from '../services/search.js';
import { relatedTo } from '../services/precedent.js';
import type { Store } from '../store/index.js';
import type { Deliberation, Matter, SourceKind } from '../types.js';
import { SOURCE_KINDS } from '../types.js';

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
  /**
   * What this is about. The link that makes the fatwa and the registry entry
   * refer to the same object rather than to two hand-typed strings.
   */
  assetIds: z.array(z.string().min(1).max(120)).max(20).default([]),
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

/*
 * A citation, not an essay. The label is what a reader scans for and the ref is
 * where they go to check it; the note is the sentence explaining why this is
 * here, which the citation itself never carries.
 */
/*
 * The terms themselves. `meaning` is required and excluded from the hash: a
 * board approves an operative rule, and the plain-language explanation is what
 * the scholar actually read — so it must exist, and improving its wording must
 * not invalidate the approval.
 */
const parametersSchema = z.object({
  parameters: z
    .array(
      z.object({
        key: z.string().min(1).max(120),
        value: z.string().min(1).max(500),
        meaning: z.string().min(3).max(2_000),
        unit: z.string().max(60).optional(),
      }),
    )
    .max(60),
});

const assetSchema = z.object({
  kind: z.enum(['token', 'pool', 'security', 'instrument', 'product']),
  name: z.string().min(2).max(300),
  identifiers: z
    .array(
      z.object({
        scheme: z.enum(['chain', 'isin', 'ticker', 'internal']),
        value: z.string().min(1).max(200),
        network: z.string().max(60).optional(),
      }),
    )
    .min(1)
    .max(10),
});

const retireSchema = z.object({ reason: z.string().min(3).max(2_000) });

const findingSchema = z.object({
  conditionId: z.string().min(1).max(120),
  holds: z.enum(['met', 'not_met', 'not_applicable']),
  reason: reasonSchema,
});

const structureSchema = z.object({ structureId: z.string().min(1).max(120).nullable() });

const stepsSchema = z.object({
  steps: z.array(z.string().min(3).max(2_000)).max(60),
});

const sourceSchema = z.object({
  kind: z.enum(SOURCE_KINDS as [SourceKind, ...SourceKind[]]),
  label: z.string().min(3).max(300),
  ref: z.string().min(1).max(2_000),
  note: z.string().max(2_000).optional(),
});

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
        assetIds: parsed.data.assetIds,
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
   * Set the operative terms of the proposed rule.
   *
   * Open to anyone who may deliberate. Working out that a ratio is 30% rather
   * than 33% is deliberation, and requiring the authority to decide the matter
   * before you may write down what is being decided gets the order backwards.
   *
   * Refused once a vote is open: the terms are what the board is voting on.
   */
  router.put(
    '/matters/:id/parameters',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayDeliberate(who.role), 'set the operative terms')) return;

      const parsed = parametersSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const updated = await store.updateMatter(req.params.id, (matter) =>
        setParameters(matter, parsed.data.parameters),
      );

      res.json(updated);
    }),
  );

  /**
   * Attach a source to a matter.
   *
   * Open to anyone who may deliberate, because evidence is not a vote. An
   * advisory member who knows the standard should be able to put it in front of
   * the board without needing the authority to decide the matter.
   */
  router.post(
    '/matters/:id/sources',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayDeliberate(who.role), 'attach a source')) return;

      const parsed = sourceSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const at = now();
      const id = `s-${at.replace(/[^0-9]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`;

      const updated = await store.updateMatter(req.params.id, (matter) =>
        attachSource(matter, { scholarId: who.scholarId, source: parsed.data }, at, id),
      );

      res.status(201).json(updated);
    }),
  );

  /**
   * Withdraw a source you attached. Withdrawn, not deleted — see the lifecycle.
   */
  router.delete(
    '/matters/:id/sources/:sourceId',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayDeliberate(who.role), 'withdraw a source')) return;

      const at = now();
      const updated = await store.updateMatter(req.params.id, (matter) =>
        withdrawSource(matter, { scholarId: who.scholarId, sourceId: req.params.sourceId }, at),
      );

      res.json(updated);
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
      const at = new Date().toISOString();
      res.json(await store.updateMatter(req.params.id, (m) => withdraw(m, at)));
    }),
  );

  /**
   * Search the record.
   *
   * Reading is open to everyone who can reach the application, observers
   * included: an observer who cannot find what the board decided cannot check
   * it, and being able to check it is the entire claim.
   *
   * A query of only filters is valid — "everything this member voted on" is a
   * question worth asking with no words in it.
   */
  router.get(
    '/search',
    handle(async (req, res) => {
      const q = typeof req.query.q === 'string' ? req.query.q : '';

      const list = (v: unknown): string[] =>
        typeof v === 'string' ? v.split(',').map((x) => x.trim()).filter(Boolean) : [];

      const filters: SearchFilters = {
        boardId: typeof req.query.board === 'string' ? req.query.board : undefined,
        status: list(req.query.status) as SearchFilters['status'],
        direction: (typeof req.query.direction === 'string' ? req.query.direction : undefined) as SearchFilters['direction'],
        origin: (typeof req.query.origin === 'string' ? req.query.origin : undefined) as SearchFilters['origin'],
        scholarId: typeof req.query.member === 'string' ? req.query.member : undefined,
        from: typeof req.query.from === 'string' ? req.query.from : undefined,
        to: typeof req.query.to === 'string' ? req.query.to : undefined,
      };

      const hits = search(await store.matters(), q, filters);
      res.json({ query: q, count: hits.length, hits: hits.slice(0, 60) });
    }),
  );

  /**
   * What the board already decided that bears on this matter.
   *
   * Every relation is a fact in the record — a shared citation, a declared
   * interaction, the same operative term — never a resemblance. Offering a
   * scholar a coincidence as a precedent would invite them to treat it as one.
   */
  router.get(
    '/matters/:id/related',
    handle(async (req, res) => {
      const matter = await store.matter(req.params.id);
      if (!matter) {
        res.status(404).json({ error: 'not_found', message: 'No such matter.' });
        return;
      }
      res.json(relatedTo(matter, await store.matters()));
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
        // The interface needs the office to know whether to offer the steps
        // that belong to the institution. It widens nothing: the route refuses
        // on its own regardless of what the interface chose to show.
        office: who.office ?? null,
        outstanding: items.length,
        overdue: items.filter((i) => i.overdue).length,
        items,
      });
    }),
  );

  /**
   * How long the board takes, and what is waiting on it now.
   *
   * The counterpart to `/attention`: that one is personal and asks what *you*
   * owe, this one is institutional and asks what the board is costing the
   * business. It is the only figure here that measures the board rather than
   * its decisions, which is why it is deliberately plain about its own limits —
   * `approximate` is true whenever any arrival or settlement had to be inferred.
   *
   * Open to observers. An auditor who cannot see how long a board takes cannot
   * report on it.
   */
  router.get(
    '/pace',
    handle(async (req, res) => {
      const at = now();
      const [boards, matters] = await Promise.all([store.boards(), store.matters()]);

      const wanted = typeof req.query.board === 'string' ? req.query.board : null;
      const scoped = wanted ? boards.filter((b) => b.id === wanted) : boards;

      if (wanted && scoped.length === 0) {
        res.status(404).json({ error: 'not_found', message: 'No such board.' });
        return;
      }

      res.json({
        asOf: at,
        boards: scoped.map((b) => paceOf(b, matters, at)),
        waiting: waitingNow(scoped, matters, at),
      });
    }),
  );

  /**
   * Which rules are due back before the board.
   *
   * The only kind of work with no external trigger: nothing arrives to make a
   * periodic review happen, so it slips, and a ruling quietly goes on governing
   * a structure that changed. This computes a date and asks a question. It does
   * not re-rule, and an overdue rule is still in force — compliance lapsing
   * because nobody opened an application would be worse than the problem.
   */
  router.get(
    '/reviews',
    handle(async (req, res) => {
      const at = now();
      const board = typeof req.query.board === 'string' ? req.query.board : undefined;
      const rules = await store.rules(board);

      const due = reviewsDue(rules, at);
      res.json({
        asOf: at,
        due: due.filter((r) => r.state === 'due').length,
        unscheduled: due.filter((r) => r.state === 'unscheduled').length,
        items: due,
      });
    }),
  );

  /** Where one rule stands, including one that is not due. */
  router.get(
    '/rules/:id/review',
    handle(async (req, res) => {
      const rule = await store.rule(req.params.id);
      if (!rule) {
        res.status(404).json({ error: 'not_found', message: 'No such rule.' });
        return;
      }
      res.json(reviewStatus(rule, now()));
    }),
  );

  /**
   * The three screening ratios of AAOIFI Standard 21.
   *
   * Stateless on purpose: figures come from the institution and are not this
   * system's to hold until a board has decided to attach them to something.
   * Supplying a previous assessment asks the second question — what changed
   * side since the board last looked — which is where the value is, because
   * screening drifts silently and boards find out at the audit.
   *
   * It computes and it asks. It never concludes: whether an instrument is
   * permissible is a ruling, and no ratio answers it.
   */
  router.post(
    '/screening',
    handle(async (req, res) => {
      const body = req.body as { figures?: Figures; previous?: Assessment };
      if (!body?.figures) {
        res.status(400).json({
          error: 'no_figures',
          message: 'Send the figures to compute from, under "figures".',
        });
        return;
      }

      try {
        const current = assess(body.figures);
        const changed = body.previous ? crossings(body.previous, current) : [];
        res.json({ assessment: current, crossings: changed });
      } catch (e) {
        if (e instanceof BadFigure) {
          res.status(400).json({ error: e.code, field: e.field, message: e.message });
          return;
        }
        throw e;
      }
    }),
  );

  /**
   * The steps the institution must follow.
   *
   * Frozen with the parameters and for the same reason: they are part of what
   * the board approved, and a ruling whose implementation could be rewritten
   * after the vote is a ruling nobody signed.
   */
  router.post(
    '/matters/:id/implementation',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayDeliberate(who.role), 'set implementation steps')) return;

      const parsed = stepsSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      res.json(
        await store.updateMatter(req.params.id, (current) =>
          setImplementationSteps(current, parsed.data.steps),
        ),
      );
    }),
  );

  /**
   * What must be given away from a holding that passed screening.
   *
   * Not the purification in an incident — that follows a breach and comes out
   * of a ledger. This one runs every period for as long as the holding is held,
   * and the three methods give three different answers on the same figures,
   * which is why the method is supplied here and never inferred.
   *
   * Stateless on purpose, like the screening ratios: figures come from the
   * institution and are not this system's to hold until a board attaches them
   * to something.
   */
  router.post(
    '/purification',
    handle(async (req, res) => {
      const body = req.body as Partial<PurificationInput>;

      if (!body?.method || !PURIFICATION_METHODS.includes(body.method)) {
        res.status(400).json({
          error: 'no_method',
          message:
            'Send the method the board approved, under "method": per_share, per_dividend or ' +
            'per_unit. They give different answers on the same figures, and choosing among ' +
            'them is a ruling.',
          methods: PURIFICATION_METHODS,
        });
        return;
      }

      res.json(purify(body as PurificationInput));
    }),
  );

  /**
   * The contract shapes a board rules against.
   *
   * Reference material with its source named, not an assertion of what the
   * Shariah requires — boards differ, and a system that shipped its own reading
   * as settled would be ruling. What is binding is the board's finding.
   */
  router.get(
    '/structures',
    handle(async (_req, res) => {
      res.json({
        structures,
        note:
          'A draft checklist with its source named. The board adopts, amends or rules against ' +
          'each condition; nothing here is binding until it does.',
      });
    }),
  );

  /** Where the board has got to on the shape this matter is judged against. */
  router.get(
    '/matters/:id/checklist',
    handle(async (req, res) => {
      const who = identityOf(req);
      const matter = await store.matter(req.params.id);
      if (!matter) {
        res.status(404).json({ error: 'not_found', message: 'No such matter.' });
        return;
      }
      res.json(checklistFor(matter, who.scholarId));
    }),
  );

  /** Judge the matter against a shape, or stop judging it against one. */
  router.put(
    '/matters/:id/structure',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayDeliberate(who.role), 'set the contract shape')) return;

      const parsed = structureSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      res.json(
        await store.updateMatter(req.params.id, (current) =>
          setStructure(current, parsed.data.structureId),
        ),
      );
    }),
  );

  /**
   * Record one finding on one condition.
   *
   * Open to anyone who deliberates, because reading a contract against its
   * conditions is deliberation rather than voting — an advisory member's
   * finding is worth having and does not move a threshold.
   */
  router.post(
    '/matters/:id/findings',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayDeliberate(who.role), 'record a finding')) return;

      const parsed = findingSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const board = await boardFor(store, res, req.params.id);
      if (!board) return;

      const at = now();
      res.status(201).json(
        await store.updateMatter(req.params.id, (current) =>
          recordFinding(board, current, { scholarId: who.scholarId, ...parsed.data }, at),
        ),
      );
    }),
  );

  /**
   * What has moved under a ruling.
   *
   * The only thing here that goes looking rather than waiting to be opened. It
   * compares the terms the board set against the composition as it now stands,
   * and asks the question — it does not re-rule, and it does not raise the
   * matter itself. A member raises it in one click from the holding, as they do
   * from the register.
   *
   * That restraint is deliberate: an automation that wrote matters into the
   * record on its own would be one mis-specified feed away from burying a board
   * under questions nobody asked, and attention is the scarcest thing here.
   *
   * Open to observers. An auditor asking what has drifted is asking this.
   */
  router.get(
    '/drift',
    handle(async (_req, res) => {
      const at = now();
      const [assets, matters] = await Promise.all([store.assets(), store.matters()]);
      res.json(driftReport(assets, matters, at));
    }),
  );

  /**
   * The register — what the board rules on.
   *
   * The one question a bank ever asks is what the status of a holding is, and
   * until this existed the record could not answer it. Status is derived from
   * the rules in force and the matters open against each asset, never stored:
   * a stored status is a second copy of the truth and a rule withdrawn leaves
   * the badge green.
   *
   * Ordered with the never-examined first, because that is the only state no
   * other screen in this application can show — every other one lists work
   * somebody already started.
   */
  router.get(
    '/register',
    handle(async (req, res) => {
      const at = now();
      const [assets, matters, boards] = await Promise.all([
        store.assets(),
        store.matters(),
        store.boards(),
      ]);

      const institutionId =
        typeof req.query.institution === 'string' ? req.query.institution : boards[0]?.institutionId;

      res.json(buildRegister(assets, matters, at, institutionId));
    }),
  );

  /** One asset: where it stands, everything decided about it, what it holds. */
  router.get(
    '/assets/:id',
    handle(async (req, res) => {
      const asset = await store.asset(req.params.id);
      if (!asset) {
        res.status(404).json({ error: 'not_found', message: 'No such asset.' });
        return;
      }

      const standing = standingOf(asset, await store.matters(), now());
      res.json({
        ...standing,
        composition: asset.composition ? readComposition(asset.composition) : null,
      });
    }),
  );

  /**
   * Add one by hand.
   *
   * The register is normally supplied — from the protocol's own registry, or
   * from the institution's universe — but a member who notices a holding
   * nobody has entered must be able to enter it. `source` records that it came
   * from a person, because "nobody has ruled on this" and "nobody has even told
   * us about it" are different states.
   */
  router.post(
    '/assets',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayDeliberate(who.role), 'add to the register')) return;

      const parsed = assetSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const boards = await store.boards();
      const institutionId = boards[0]?.institutionId;
      if (!institutionId) {
        res.status(404).json({ error: 'not_found', message: 'No board, so no institution to add to.' });
        return;
      }

      const at = now();
      res.status(201).json(
        await store.createAsset({
          id: `asset-${at.replace(/[^0-9]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`,
          institutionId,
          kind: parsed.data.kind,
          name: parsed.data.name,
          identifiers: parsed.data.identifiers,
          source: 'member',
          addedAt: at,
          addedBy: who.scholarId,
          composition: null,
          retiredAt: null,
          retiredReason: null,
        }),
      );
    }),
  );

  /**
   * Withdraw one from the universe.
   *
   * Retired, never deleted. A holding that is gone still has a history the
   * board is answerable for, and delisting is a fact rather than a ruling —
   * whether a ruling survives it is a separate question for the board.
   */
  router.post(
    '/assets/:id/retire',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!requireRole(res, mayDeliberate(who.role), 'retire an asset')) return;

      const parsed = retireSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const at = now();
      res.json(
        await store.updateAsset(req.params.id, (current) => ({
          ...current,
          retiredAt: at,
          retiredReason: parsed.data.reason,
        })),
      );
    }),
  );

  /**
   * What is coming.
   *
   * Every date the board is held to, in order, derived from the clocks rather
   * than kept as a list. Open to observers: an auditor asking what is
   * outstanding is asking exactly this.
   */
  router.get(
    '/calendar',
    handle(async (req, res) => {
      const at = now();
      const boardId = typeof req.query.board === 'string' ? req.query.board : undefined;

      const [boards, matters, rules, incidents] = await Promise.all([
        store.boards(),
        store.matters(boardId),
        store.rules(boardId),
        store.incidents(boardId),
      ]);

      if (boardId && !boards.some((b) => b.id === boardId)) {
        res.status(404).json({ error: 'not_found', message: 'No such board.' });
        return;
      }

      res.json(buildCalendar({ boards, matters, rules, incidents, now: at, boardId }));
    }),
  );

  /**
   * The same dates, as a feed.
   *
   * A deadline that exists only inside an application is a deadline somebody
   * has to remember to go and look for, which is the failure this whole system
   * was built against. This puts them in the calendar a scholar already checks.
   *
   * **What is honest about it today:** the file downloads and imports, and the
   * dates land correctly. A live *subscription* — a calendar re-fetching this
   * every few hours — cannot authenticate against a credential a person types,
   * so it would need a per-member feed token. That is not built, and putting a
   * password in a subscription URL is not a substitute for it.
   */
  router.get(
    '/calendar.ics',
    handle(async (req, res) => {
      const at = now();
      const boardId = typeof req.query.board === 'string' ? req.query.board : undefined;

      const [boards, matters, rules, incidents] = await Promise.all([
        store.boards(),
        store.matters(boardId),
        store.rules(boardId),
        store.incidents(boardId),
      ]);

      const calendar = buildCalendar({ boards, matters, rules, incidents, now: at, boardId });
      const host = req.get('host') ?? 'majlis.local';

      res.type('text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="majlis.ics"');
      res.send(toICalendar(calendar, host));
    }),
  );

  /**
   * The Shariah compliance manual.
   *
   * Computed from the rules in force rather than maintained, so it cannot drift
   * from what it describes — the failure every hand-kept manual has. Entries
   * that are missing something GN-6 asks for say so; a document presenting every
   * entry as finished would be comfortable and useless.
   *
   * Open to observers. The auditor is exactly who asks for this.
   */
  router.get(
    '/manual',
    handle(async (req, res) => {
      const at = now();
      const boardId = typeof req.query.board === 'string' ? req.query.board : undefined;

      const boards = await store.boards();
      if (boardId && !boards.some((b) => b.id === boardId)) {
        res.status(404).json({ error: 'not_found', message: 'No such board.' });
        return;
      }

      const [rules, matters] = await Promise.all([store.rules(boardId), store.matters(boardId)]);
      const manual = buildManual(rules, matters, at, boardId);

      if (req.query.format === 'json') {
        res.json(manual);
        return;
      }

      const name = boardId ? boards.find((b) => b.id === boardId)?.name : undefined;
      res.type('html').send(renderManual(manual, name ?? boards[0]?.name ?? 'Shariah Supervisory Board'));
    }),
  );

  /**
   * The board's annual report to shareholders, as a draft.
   *
   * Every figure in it was written down during the year by a member of the
   * board or by the institution. **The opinion is not drafted and cannot be**:
   * it is the only part that is the board's, the only part worth their
   * signature, and a board under year-end pressure would sign a draft if one
   * were offered. The document leaves a labelled blank and states what the
   * opinion has to address instead.
   *
   * What the record cannot support — meetings, zakat, the internal review
   * functions — is named in the document rather than omitted from it.
   */
  router.get(
    '/annual',
    handle(async (req, res) => {
      const at = now();
      const raw = typeof req.query.year === 'string' ? Number(req.query.year) : new Date(at).getUTCFullYear();
      if (!Number.isInteger(raw) || raw < 2000 || raw > 2200) {
        res.status(400).json({ error: 'bad_year', message: 'Give a four-digit year.' });
        return;
      }

      const boards = await store.boards();
      const boardId = typeof req.query.board === 'string' ? req.query.board : boards[0]?.id;
      const board = boards.find((b) => b.id === boardId);
      if (!board) {
        res.status(404).json({ error: 'not_found', message: 'No such board.' });
        return;
      }

      const [matters, rules, incidents] = await Promise.all([
        store.matters(board.id),
        store.rules(board.id),
        store.incidents(board.id),
      ]);

      const report = assembleAnnualReport({ year: raw, board, matters, rules, incidents, generatedAt: at });

      if (req.query.format === 'json') {
        res.json(report);
        return;
      }
      res.type('html').send(renderAnnualReport(report));
    }),
  );

  /**
   * The document, at the moment of decision.
   *
   * The Web2 half of the whole thesis: a bank that waits nine weeks for a
   * meeting and three more for the minutes has not been helped by software that
   * only holds the vote.
   *
   * HTML by default and designed for print — a browser saves it as a PDF
   * identically, and no headless engine is carried to achieve that. `?format=json`
   * returns the same structure for a bank rendering its own template.
   *
   * Open to observers: the auditor and the regulator are who it is for.
   */
  router.get(
    '/matters/:id/fatwa',
    handle(async (req, res) => {
      const board = await boardFor(store, res, req.params.id);
      if (!board) return;

      const matter = await store.matter(req.params.id);
      if (!matter) return;

      const fatwa = assemble(board, matter, now());

      if (req.query.format === 'json') {
        res.json(fatwa);
        return;
      }

      res.type('html').send(render(fatwa));
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
