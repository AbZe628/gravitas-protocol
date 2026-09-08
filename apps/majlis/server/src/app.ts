import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { z } from 'zod';
import { storeFromEnv, type Store } from './store/index.js';

import { enforcementFromEnv, type Enforcement } from './services/enforcement.js';
import { buildCarrying } from './services/carrying.js';
import { assemblePack } from './services/pack.js';
import { assembleBook, type StandingItem } from './services/board-book.js';
import { reviewsDue } from './services/review.js';
import { driftReport } from './services/drift.js';
import { buildRegister } from './services/register.js';
import { dictationFromEnv, WHERE_THE_AUDIO_GOES } from './services/dictation.js';
import { askTheGuide, guideTopics } from './services/guide.js';
import {
  AssistantUnavailable,
  comprehensionFromEnv,
  type Comprehension,
} from './services/comprehension.js';
import { buildAuditExport } from './services/export.js';
import { verifyParameters } from './services/hash.js';
import { Limiter, REFUSAL_MESSAGES } from './services/limits.js';
import { basicAuth, authFromEnv } from './middleware/basicAuth.js';
import { buildSettings } from './services/settings.js';
import { TIMELOCK_HOURS } from './types.js';
import type { Language } from './types.js';
import { LoginLimiter, loginThrottle } from './middleware/loginLimit.js';
import { governanceRoutes } from './routes/governance.js';
import { accountRoutes } from './routes/account.js';
import { undertakingRoutes } from './routes/undertakings.js';
import { annotationRoutes } from './routes/annotations.js';
import { tell } from './services/telling.js';
import { adoptionRoutes } from './routes/adoption.js';
import { segmentsOf } from './services/mentions.js';
import { vaultFromEnv, type Vault } from './store/vault.js';
import { readingFromEnv, type Reading } from './services/reading.js';
import { computationRoutes } from './routes/computations.js';
import { meetingRoutes } from './routes/meetings.js';
import { submissionRoutes } from './routes/submissions.js';
import { examinationRoutes } from './routes/examinations.js';
import { notifierFromEnv, type Notifier } from './services/notice.js';
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
  /**
   * Where a scholar's document goes.
   *
   * Chosen once, like everything else an institution might or might not have.
   * With no volume this is the vault that refuses, and the interface is told
   * so rather than offering an upload that cannot be kept.
   */
  vault: Vault = vaultFromEnv(),
  /**
   * Whether a document may be read by a model. Off unless turned on, and
   * separately from the assistant — see services/reading.ts.
   */
  reading: Reading = readingFromEnv(),
  /**
   * How a member is told, outside the application, that something arrived.
   *
   * Chosen at construction like everything else an institution might or might
   * not have, and its default sends nothing. What it does instead is compose
   * the words and hand them back for a person to carry — see
   * `services/notice.ts` for why that is honest rather than a placeholder.
   */
  notifier: Notifier = notifierFromEnv(),
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

  // Held rather than only passed, so the settings route can compare the
  // credential file against the board record. Nothing but ids and roles ever
  // leaves it.
  const auth = authFromEnv();
  app.use(basicAuth(auth, logins, servingInstitution));

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
      /*
       * Whether a member can be told, outside the application, that something
       * arrived.
       *
       * `none` is the default and is the ordinary installation rather than a
       * broken one: the notice is composed and shown for a person to send. The
       * interface reads this so it can say that in words — a screen that
       * offered the words with no explanation would let a secretary assume the
       * board had already been emailed.
       */
      notice: notifier.kind,
      /*
       * Whether a document can be kept at all.
       *
       * The interface reads this before offering to take one. An upload
       * control on an installation with no volume is a control that lies, and
       * the lie is only discovered when a board tries to cite what it uploaded.
       */
      documents: vault.kind,
      /*
       * Whether a document may be read by a model, which is a separate
       * decision from whether there is an assistant. The interface offers the
       * control only where this says it can work.
       */
      reading: reading.kind,
      // Off unless the institution chose it, because the browser sends the
      // audio away to be transcribed. Absent rather than disabled where off.
      dictation: dictationFromEnv(),
      dictationNote: WHERE_THE_AUDIO_GOES,
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

    /*
     * Names in the deliberation are resolved here rather than in the browser.
     *
     * The rule — an `@` followed by the id of somebody on this board — is small
     * enough that an interface could apply it itself, and that is exactly how
     * two copies of a rule come to disagree. One parser, on the side that knows
     * who is on the board.
     */
    const board = await store.board(matter.boardId);
    const deliberation = board
      ? matter.deliberation.map((d) => ({ ...d, segments: segmentsOf(d.body, board) }))
      : matter.deliberation;

    res.json({
      ...matter,
      deliberation,
      /** Who may be named here. The composer offers these and nothing else. */
      mentionable: board?.members.map((m) => ({ id: m.id, name: m.name, title: m.title })) ?? [],
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

  // ---- settings --------------------------------------------------------
  //
  // Who is on this board and how it decides — and the one check nothing has
  // ever made. The board record says who signs; the credential file says who
  // may act. They are maintained separately and they disagree quietly, so this
  // compares them and names what each disagreement costs. It repairs nothing:
  // an application that edited its own board membership would be deciding who
  // sits on a Shariah board, which is the one thing it must never do.
  app.get('/api/settings', async (req: Request, res: Response) => {
    const boards = await store.boards();
    const wanted = typeof req.query.board === 'string' ? req.query.board : boards[0]?.id;
    const board = boards.find((b) => b.id === wanted);

    if (!board) {
      res.status(404).json({ error: 'not_found', message: 'No such board.' });
      return;
    }

    res.json(
      buildSettings({
        board,
        members: auth.members,
        timelockHours: TIMELOCK_HOURS.permit,
      }),
    );
  });

  // ---- enforcement -----------------------------------------------------
  //
  // Kept at /api/registry as well, because an installation configured before
  // this adapter existed is still calling it.
  const enforcementRoute = async (_req: Request, res: Response) => {
    res.json(await enforcement.snapshot());
  };
  /*
   * How this application works, asked from anywhere.
   *
   * Not the assistant: nothing here is generated, no question leaves the
   * building, and the subject is Majlis itself rather than any financial
   * mechanism. It answers instantly and it works where there is no assistant,
   * which is most installations.
   *
   * A question that seeks a ruling is refused here as it is everywhere else. A
   * guide is a likelier place to be asked than the assistant, because it is the
   * thing that looks like it will answer anything.
   */
  /*
   * A GET, because it reads and changes nothing.
   *
   * It was written as a POST out of habit and the mutating-route guard caught
   * it, correctly: every POST this application exposes has to be on an
   * allowlist somebody added on purpose, and a route that only answers a
   * question does not belong on it.
   */
  /**
   * Which language the question was asked in.
   *
   * Taken from the query rather than from Accept-Language: the reader chooses
   * the language in the application, and a browser configured for one while a
   * scholar reads another would answer in the wrong one and look like a fault.
   * Anything unrecognised is English, which is the language that always exists.
   */
  const askedIn = (req: Request): Language =>
    req.query.lang === 'ar' || req.query.lang === 'ur' ? req.query.lang : 'en';

  app.get('/api/guide', (req: Request, res: Response) => {
    const question = typeof req.query.q === 'string' ? req.query.q : '';
    if (question.trim().length < 2) {
      res.status(400).json({ error: 'no_question', message: 'Ask something.' });
      return;
    }
    res.json(askTheGuide(question, askedIn(req)));
  });

  app.get('/api/guide/topics', (req: Request, res: Response) => {
    res.json({ topics: guideTopics(askedIn(req)) });
  });

  app.get('/api/enforcement', enforcementRoute);
  app.get('/api/registry', enforcementRoute);

  // What these particular terms will do once the board has ruled, and when
  // they get tested. Assembled from the matter and the adapter, never from a
  // model: the application already knows this, and routing a certainty through
  // a language model would make it possible to get wrong and unavailable in
  // the installations that have no assistant.
  app.get('/api/matters/:id/carrying', async (req: Request, res: Response) => {
    const matter = await store.matter(req.params.id);
    if (!matter) {
      res.status(404).json({ error: 'not_found', message: 'No such matter.' });
      return;
    }
    res.json(buildCarrying(matter, await enforcement.snapshot()));
  });

  /**
   * The board book: everything for one sitting, in one document.
   *
   * Beside the pack, and here for the same reason — it needs the enforcement
   * snapshot, because every pack inside it does.
   *
   * The standing business is gathered here rather than inside the assembler:
   * the services that find drift, overdue reviews and unexamined holdings
   * already exist and already say what each finding means, and a second
   * opinion about any of them formed inside the book would be a second
   * definition of the same word.
   */
  app.get('/api/meetings/:id/book', async (req: Request, res: Response) => {
    const meeting = await store.meeting(req.params.id);
    if (!meeting) {
      res.status(404).json({ error: 'not_found', message: 'No such meeting.' });
      return;
    }
    const board = await store.board(meeting.boardId);
    if (!board) {
      res.status(404).json({ error: 'not_found', message: 'No such board.' });
      return;
    }

    const at = new Date().toISOString();
    const matters = await store.matters(meeting.boardId);
    const assets = await store.assets();
    const rules = await store.rules(meeting.boardId);

    const standing: StandingItem[] = [
      ...reviewsDue(rules, at)
        .filter((r) => r.overdue)
        .map((r) => ({
          kind: 'review_due' as const,
          what: r.title,
          ref: r.ruleId,
          note: r.note,
        })),
      ...driftReport(assets, matters, at).drifting.map((d) => ({
        kind: 'moved' as const,
        what: d.assetName,
        ref: d.matterId,
        note: d.questionForBoard,
      })),
      ...buildRegister(assets, matters, at)
        .assets.filter((a) => a.status === 'never_examined')
        .map((a) => ({
          kind: 'never_examined' as const,
          what: a.asset.name,
          ref: a.asset.id,
          note: a.note,
        })),
    ];

    res.json(
      assembleBook({
        board,
        meeting,
        allMatters: matters,
        computations: await store.computations({ boardId: meeting.boardId }),
        enforcement: await enforcement.snapshot(),
        standing,
        undertakings: await store.undertakings(meeting.boardId),
        assembledAt: at,
      }),
    );
  });

  /**
   * The pack: one matter, everything needed to decide it, in reading order.
   *
   * It lives here rather than with the other matter routes because it needs
   * the enforcement snapshot, which this file holds — the same reason
   * `carrying` is here.
   *
   * Open to anybody who may read the matter. The pack composes nothing and
   * recommends nothing, so there is no part of it an observer must be kept
   * from; and an auditor reading how a decision was reached is one of the
   * people it is for.
   */
  app.get('/api/matters/:id/pack', async (req: Request, res: Response) => {
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

    res.json(
      assemblePack({
        board,
        matter,
        // Precedent is found among this board's own matters and no others.
        allMatters: await store.matters(matter.boardId),
        computations: await store.computations({ boardId: matter.boardId }),
        enforcement: await enforcement.snapshot(),
        assembledAt: new Date().toISOString(),
      }),
    );
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
  app.use('/api', governanceRoutes(store, undefined, vault, reading));
  app.use('/api', incidentRoutes(store));
  app.use('/api', computationRoutes(store));
  app.use('/api', adoptionRoutes(store));
  app.use('/api', submissionRoutes(store, notifier));
  app.use('/api', examinationRoutes(store));
  app.use('/api', meetingRoutes(store));
  /*
   * A member's own account.
   *
   * `auth.members` is handed in rather than read again, so a password written
   * to the store takes effect on the very next request instead of at the next
   * restart.
   */
  app.use('/api', accountRoutes(store, auth.members));
  app.use('/api', undertakingRoutes(store));
  app.use('/api', annotationRoutes(store));

  /**
   * The words for telling the bank something.
   *
   * Composed, never sent — like every notice here. Most installations have no
   * channel and what they get is the text, correct and complete, for a person
   * to send. A control that said Send and quietly did nothing would leave a
   * board believing the desk had been told.
   *
   * One route for every kind of thing, because the alternative is each screen
   * writing its own wording and the record and the mailbox disagreeing.
   */
  app.get('/api/telling/:kind/:id', async (req: Request, res: Response) => {
    const kind = req.params.kind;
    const boards = await store.boards();
    const board = boards[0];
    if (!board) {
      res.status(404).json({ error: 'not_found', message: 'No such board.' });
      return;
    }

    const off = { kind: 'none' as const, configured: false, sent: false, at: new Date().toISOString() };

    if (kind === 'ruling' || kind === 'refusal' || kind === 'draft_ready') {
      const matter = await store.matter(req.params.id);
      if (!matter) {
        res.status(404).json({ error: 'not_found', message: 'No such matter.' });
        return;
      }
      res.json({ notice: tell(board, { kind, matter }), delivery: off });
      return;
    }

    if (kind === 'figure') {
      const computation = await store.computation(req.params.id);
      if (!computation) {
        res.status(404).json({ error: 'not_found', message: 'No such figure.' });
        return;
      }
      res.json({ notice: tell(board, { kind: 'figure', computation }), delivery: off });
      return;
    }

    if (kind === 'examination') {
      const examination = await store.examination(req.params.id);
      if (!examination) {
        res.status(404).json({ error: 'not_found', message: 'No such review.' });
        return;
      }
      const rule = await store.rule(examination.ruleId);
      res.json({
        notice: tell(board, {
          kind: 'examination',
          examination,
          ruleTitle: rule?.title ?? examination.ruleId,
        }),
        delivery: off,
      });
      return;
    }

    res.status(404).json({ error: 'not_found', message: 'Nothing of that kind is told.' });
  });

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
