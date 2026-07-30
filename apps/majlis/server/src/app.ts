import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import { z } from 'zod';
import { boards, matters, briefings, rules } from './data/seed.js';
import { ask } from './services/assistant.js';
import { readRegistry, configFromEnv } from './services/registry.js';
import { buildAuditExport } from './services/export.js';
import { verifyParameters } from './services/hash.js';
import type { AssistantExchange } from './types.js';

/**
 * Stage One is read-only. There is deliberately no route by which a rule can
 * be created, amended or approved through this API. Governance functions
 * arrive in Stage Three together with signing authority, and adding them
 * before then would produce exactly the gap the system exists to close: a
 * decision recorded in one place and executed by someone else in another.
 */

/** Everything the assistant is asked is retained. */
const assistantLog: AssistantExchange[] = [];

export function getAssistantLog(): readonly AssistantExchange[] {
  return assistantLog;
}

export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, stage: 1, readOnly: true });
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
    try {
      const result = await ask({
        question: parsed.data.question,
        scholarId: parsed.data.scholarId ?? null,
        context: parsed.data.context,
      });
      assistantLog.push(result);
      res.json(result);
    } catch (err) {
      res.status(502).json({
        error: 'assistant unavailable',
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  });

  /** Everything the assistant said is part of the permanent record. */
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
