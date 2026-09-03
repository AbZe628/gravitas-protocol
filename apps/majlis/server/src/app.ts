import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { z } from 'zod';
import { storeFromEnv, type Store } from './store/index.js';

import { enforcementFromEnv, type Enforcement } from './services/enforcement.js';
import {
  AssistantUnavailable,
  comprehensionFromEnv,
  type Comprehension,
} from './services/comprehension.js';
import { buildAuditExport } from './services/export.js';
import { verifyParameters } from './services/hash.js';
import { Limiter, REFUSAL_MESSAGES } from './services/limits.js';
import { basicAuth, authFromEnv } from './middleware/basicAuth.js';
import { LoginLimiter, loginThrottle } from './middleware/loginLimit.js';
import { governanceRoutes } from './routes/governance.js';
import { incidentRoutes } from './routes/incidents.js';


/**
 * Stage Two writes.
 *
 * A board can open a matter here, deliberate on it, vote with a written reason,
 * object during a timelock and bring a change into force. What it cannot do is
 * sign: nothing in this application touches the Policy Registry, and a matter
 * reaching `in_force` records what the board decided rather than executing it.
 *
 * That separation is the whole of Stage Two — the full process exercised with
 * nothing yet resting on it — and closing it is Stage Three, where the vote
 * becomes the signature. Until then the gap the system exists to close is still
 * open, and saying so plainly is more useful than pretending otherwise.
 */

const limiter = new Limiter();

/**
 * The store is passed in so a test can hand over a fresh one and production can
 * hand over the durable one. Left out, it is chosen from the environment, which
 * refuses to fall back to memory when NODE_ENV is production.
 */
export function createApp(
  store: Store = storeFromEnv(),
  /*
   * Chosen once, at construction. Everything an institution might refuse,
   * forbid or already own arrives here rather than being reached for inside a
   * route — which is what lets a bank run this with neither attached and be
   * running the ordinary installation rather than a degraded one.
   */
  enforcement: Enforcement = enforcementFromEnv(),
  comprehension: Comprehension = comprehensionFromEnv(),
): Express {
  const app = express();

  /*
   * The interface is served by this same process, so nothing legitimate calls
   * this API from another origin. MAJLIS_ORIGINS opens it to a named list when
   * something does; unset, cross-origin requests are simply not answered, which
   * is what a wildcard was quietly undoing.
   */
  const origins = (process.env.MAJLIS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.use(cors(origins.length ? { origin: origins, credentials: true } : { origin: false }));

  /*
   * The record is read by people, not embedded by anyone. These are the headers
   * that matter for that and they cost nothing: no framing, no sniffing, no
   * referrer leaking a matter id to another site.
   */
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    next();
  });

  app.use(express.json({ limit: '256kb' }));

  app.set('trust proxy', 1);

  /*
   * Authentication derives a scrypt hash on every attempt, including for member
   * ids that do not exist — which is what keeps "no such member" and "wrong
   * password" indistinguishable. Nothing counted those attempts, so a loop of
   * wrong passwords was a way to spend this single instance's CPU until the
   * board could not use it. The throttle sits ahead of the check so the
   * derivation never runs for someone already known to be guessing.
   */
  const logins = new LoginLimiter();
  app.use(loginThrottle(logins));

  // Everything except /api/health sits behind authentication. With
  // MAJLIS_MEMBERS each request carries an identity; with only the shared
  // credential it carries the observer role, which reads and writes nothing.
  /*
   * The store already knows which institution it serves; the door is told the
   * same thing, so a credential belonging elsewhere is refused at it rather
   * than admitted and then shown an empty record.
   */
  const servingInstitution =
    'institutionId' in store ? (store as { institutionId?: string }).institutionId : undefined;

  app.use(basicAuth(authFromEnv(), logins, servingInstitution));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      stage: 2,
      // The board decides here now. What it still cannot do is sign: no route
      // in this application writes to the Policy Registry, so a decision is
      // recorded rather than executed. Stage Three closes that.
      readOnly: false,
      governanceWrites: true,
      signingAuthority: false,
      // Storage is not durable — no disk is mounted, so a deploy discards the
      // file and the record restarts from the seed. Saying when it began is
      // what keeps that from happening unnoticed.
      recordSince: store.startedAt ?? null,
      // What this installation is, rather than what the default one is.
      enforcement: enforcement.kind,
      assistantKind: comprehension.kind,
      assistant: limiter.status(),
    });
  });

  // ---- boards ----------------------------------------------------------
  app.get('/api/boards', async (_req, res) => {
    res.json(await store.boards());
  });

  app.get('/api/boards/:id', async (req, res) => {
    const board = await store.board(req.params.id);
    if (!board) return res.status(404).json({ error: 'board not found' });
    res.json(board);
  });

  // ---- rules -----------------------------------------------------------
  app.get('/api/rules', async (req, res) => {
    const boardId = typeof req.query.board === 'string' ? req.query.board : undefined;
    const list = await store.rules(boardId);
    res.json(
      list.map((r) => ({
        ...r,
        parameterHashVerified: verifyParameters(r.parameters, r.parameterHash),
      })),
    );
  });

  app.get('/api/rules/:id', async (req, res) => {
    const rule = await store.rule(req.params.id);
    if (!rule) return res.status(404).json({ error: 'rule not found' });
    res.json({
      ...rule,
      parameterHashVerified: verifyParameters(rule.parameters, rule.parameterHash),
    });
  });

  // ---- matters ---------------------------------------------------------
  app.get('/api/matters', async (req, res) => {
    const boardId = typeof req.query.board === 'string' ? req.query.board : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : null;
    let list = await store.matters(boardId);
    if (status) list = list.filter((m) => m.status === status);
    res.json(
      list
        .sort((a, b) => (a.openedAt < b.openedAt ? 1 : -1))
        .map((m) => ({
          id: m.id,
          boardId: m.boardId,
          title: m.title,
          origin: m.origin,
          direction: m.direction,
          status: m.status,
          openedAt: m.openedAt,
          timelockEndsAt: m.timelockEndsAt,
          affected: m.simulation?.transactionsAffected ?? null,
          deliberationCount: m.deliberation.length,
        })),
    );
  });

  app.get('/api/matters/:id', async (req, res) => {
    const matter = await store.matter(req.params.id);
    if (!matter) return res.status(404).json({ error: 'matter not found' });
    res.json({
      ...matter,
      proposedRule: {
        ...matter.proposedRule,
        parameterHashVerified: verifyParameters(
          matter.proposedRule.parameters,
          matter.proposedRule.parameterHash,
        ),
      },
    });
  });

  // ---- briefings -------------------------------------------------------
  app.get('/api/briefings', async (_req, res) => {
    const list = await store.briefings();
    res.json(list.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1)));
  });

  app.get('/api/briefings/:id', async (req, res) => {
    const b = await store.briefing(req.params.id);
    if (!b) return res.status(404).json({ error: 'briefing not found' });
    res.json(b);
  });

  // ---- enforcement -----------------------------------------------------
  //
  // Kept at /api/registry as well, because an installation configured before
  // this adapter existed is still calling it.
  const enforcementRoute = async (_req: Request, res: Response) => {
    res.json(await enforcement.snapshot());
  };
  app.get('/api/enforcement', enforcementRoute);
  app.get('/api/registry', enforcementRoute);

  // ---- assistant -------------------------------------------------------
  const askSchema = z.object({
    question: z.string().min(3).max(4000),
    scholarId: z.string().max(64).nullish(),
    context: z.string().max(20000).optional(),
  });

  app.post('/api/assistant/ask', async (req, res) => {
    const parsed = askSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid request', detail: parsed.error.issues });
    }

    // Checked before any paid work, never after.
    const ip = req.ip ?? 'unknown';
    const decision = limiter.check(ip);
    if (!decision.allowed) {
      res.setHeader('Retry-After', String(decision.retryAfterSeconds));
      return res.status(429).json({
        error: 'rate limited',
        reason: decision.reason,
        message: REFUSAL_MESSAGES[decision.reason],
        retryAfterSeconds: decision.retryAfterSeconds,
      });
    }

    // "There is no assistant here" and "the assistant is broken" are different
    // states, and a scholar deserves to be told which.
    if (!comprehension.available) {
      return res.status(501).json({
        error: 'assistant_off',
        message: new AssistantUnavailable().message,
      });
    }

    try {
      const result = await comprehension.ask({
        question: parsed.data.question,
        scholarId: parsed.data.scholarId ?? null,
        context: parsed.data.context,
      });
      await store.appendAssistantExchange(result);
      res.json(result);
    } catch (err) {
      // The detail is for the operator, not the caller: it can carry request
      // ids and model identifiers that do not belong in a public response.
      console.error('assistant error:', err);
      res.status(502).json({ error: 'assistant unavailable' });
    }
  });

  /**
   * Everything the assistant said is part of the permanent record.
   *
   * The questions a board asks disclose the direction of its deliberation
   * before it has decided anything, so this is not public. It sits behind the
   * same basic auth as the rest of the application.
   *
   * That means everyone holding the board credential can read every scholar's
   * questions, which is a real limitation and not a control. Stage Two's roles
   * are what actually fix it. A second shared secret in front of this route
   * would look like defence in depth without being any.
   */
  app.get('/api/assistant/log', async (_req, res) => {
    res.json(await store.assistantLog());
  });

  // ---- governance ------------------------------------------------------
  app.use('/api', governanceRoutes(store));
  app.use('/api', incidentRoutes(store));

  // ---- audit export ----------------------------------------------------
  app.get('/api/export/:boardId', async (req, res) => {
    const board = await store.board(req.params.boardId);
    if (!board) return res.status(404).json({ error: 'board not found' });
    const asOf =
      typeof req.query.asOf === 'string' && !Number.isNaN(Date.parse(req.query.asOf))
        ? new Date(req.query.asOf)
        : undefined;
    res.json(
      buildAuditExport({
        board,
        rules: await store.rules(board.id),
        matters: await store.matters(board.id),
        asOf,
      }),
    );
  });

  // ---- the built client -------------------------------------------------
  /**
   * In production the server serves the compiled front end as well as the API,
   * so Majlis is a single service on a single origin. Without this the API
   * answers and the application does not: opening the root URL in a browser
   * returns nothing.
   *
   * The client is a single-page application, so any path that is not an API
   * route returns index.html and the router resolves it on the client. The
   * /api guard below matters: without it a mistyped API path would return the
   * HTML shell with a 200 instead of a 404, and a caller would parse an error
   * page as data.
   *
   * If the build is absent — for example in development, where Vite serves the
   * client on its own port — this does nothing and the API behaves as before.
   */
  const here = path.dirname(fileURLToPath(import.meta.url));
  const clientDist = path.resolve(here, '../../client/dist');

  if (existsSync(clientDist)) {
    app.use(express.static(clientDist, { index: false, maxAge: '1h' }));

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  } else {
    console.warn(
      `Client build not found at ${clientDist}. Serving the API only. ` +
        'Run "npm run build" from apps/majlis before starting in production.',
    );
  }

  return app;
}
