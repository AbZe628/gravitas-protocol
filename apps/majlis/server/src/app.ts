import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import { z } from 'zod';
import { boards, matters, briefings, rules } from './data/seed.js';
import { ask } from './services/assistant.js';
import { readRegistry, configFromEnv } from './services/registry.js';
import { buildAuditExport } from './services/export.js';
import { verifyParameters } from './services/hash.js';
import { Limiter, REFUSAL_MESSAGES } from './services/limits.js';
import { basicAuth, configFromEnv as basicAuthFromEnv } from './middleware/basicAuth.js';
import type { AssistantExchange } from './types.js';

/**
 * Stage One is read-only. There is deliberately no route by which a rule can
 * be created, amended or approved through this API. Governance functions
 * arrive in Stage Three together with signing authority, and adding them
 * before then would produce exactly the gap the system exists to close: a
 * decision recorded in one place and executed by someone else in another.
 */

/**
 * Everything the assistant is asked is retained.
 *
 * Bounded, because an unbounded array in a long-running process is a leak, and
 * because the log is part of the record rather than the record itself. Stage
 * Two moves this to the store; until then the cap keeps a public deployment
 * from growing until it falls over.
 */
const ASSISTANT_LOG_MAX = 1000;
const assistantLog: AssistantExchange[] = [];

const limiter = new Limiter();

export function getAssistantLog(): readonly AssistantExchange[] {
  return assistantLog;
}

export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '256kb' }));

  app.set('trust proxy', 1);

  // Everything except /api/health sits behind basic auth. Stage Two replaces
  // this with real roles; until then a shared credential is the difference
  // between "internal" and "on the open internet".
  app.use(basicAuth(basicAuthFromEnv()));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      stage: 1,
      // No governance write route exists. The assistant endpoint accepts POST
      // because asking a question is an action, but nothing it does changes a
      // rule, a vote or the record of either.
      readOnly: true,
      governanceWrites: false,
      assistant: limiter.status(),
    });
  });

  // ---- boards ----------------------------------------------------------
  app.get('/api/boards', (_req, res) => {
    res.json(boards);
  });

  app.get('/api/boards/:id', (req, res) => {
    const board = boards.find((b) => b.id === req.params.id);
    if (!board) return res.status(404).json({ error: 'board not found' });
    res.json(board);
  });

  // ---- rules -----------------------------------------------------------
  app.get('/api/rules', (req, res) => {
    const boardId = typeof req.query.board === 'string' ? req.query.board : null;
    const list = boardId ? rules.filter((r) => r.boardId === boardId) : rules;
    res.json(
      list.map((r) => ({
        ...r,
        parameterHashVerified: verifyParameters(r.parameters, r.parameterHash),
      })),
    );
  });

  app.get('/api/rules/:id', (req, res) => {
    const rule = rules.find((r) => r.id === req.params.id);
    if (!rule) return res.status(404).json({ error: 'rule not found' });
    res.json({
      ...rule,
      parameterHashVerified: verifyParameters(rule.parameters, rule.parameterHash),
    });
  });

  // ---- matters ---------------------------------------------------------
  app.get('/api/matters', (req, res) => {
    const boardId = typeof req.query.board === 'string' ? req.query.board : null;
    const status = typeof req.query.status === 'string' ? req.query.status : null;
    let list = boardId ? matters.filter((m) => m.boardId === boardId) : matters;
    if (status) list = list.filter((m) => m.status === status);
    res.json(
      list
        .slice()
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

  app.get('/api/matters/:id', (req, res) => {
    const matter = matters.find((m) => m.id === req.params.id);
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
  app.get('/api/briefings', (_req, res) => {
    res.json(
      briefings.slice().sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1)),
    );
  });

  app.get('/api/briefings/:id', (req, res) => {
    const b = briefings.find((x) => x.id === req.params.id);
    if (!b) return res.status(404).json({ error: 'briefing not found' });
    res.json(b);
  });

  // ---- registry --------------------------------------------------------
  app.get('/api/registry', async (_req, res) => {
    const snapshot = await readRegistry(configFromEnv());
    res.json(snapshot);
  });

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

    try {
      const result = await ask({
        question: parsed.data.question,
        scholarId: parsed.data.scholarId ?? null,
        context: parsed.data.context,
      });
      assistantLog.push(result);
      if (assistantLog.length > ASSISTANT_LOG_MAX) {
        assistantLog.splice(0, assistantLog.length - ASSISTANT_LOG_MAX);
      }
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
  app.get('/api/assistant/log', (_req, res) => {
    res.json(assistantLog);
  });

  // ---- audit export ----------------------------------------------------
  app.get('/api/export/:boardId', (req, res) => {
    const board = boards.find((b) => b.id === req.params.boardId);
    if (!board) return res.status(404).json({ error: 'board not found' });
    const asOf =
      typeof req.query.asOf === 'string' && !Number.isNaN(Date.parse(req.query.asOf))
        ? new Date(req.query.asOf)
        : undefined;
    res.json(buildAuditExport({ board, rules, matters, asOf }));
  });

  return app;
}
