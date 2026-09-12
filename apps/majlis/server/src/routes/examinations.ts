/**
 * Examinations, over HTTP.
 *
 * Who may record one is the question this module had to answer, and it is not
 * the obvious answer. The examination is the institution's own review or audit
 * function reporting to the board — the secretary or the technical liaison
 * records what that function found, exactly as they record the other steps that
 * belong to the institution rather than to the board.
 *
 * **A signatory cannot record one.** A board that could write its own audit
 * findings would be producing a document saying something nobody outside the
 * room ever said, which is the same reason it cannot file a rectification plan
 * or minute the Directors' approval. The board reads the examination and rules
 * on what it found; it does not write it.
 */

import { Router } from 'express';
import { z } from 'zod';
import { badRequest, handle, identityOf, requireRole } from './http.js';
import { mayRecordInstitutionAct } from '../auth/members.js';
import { standingAdoptions } from '../services/adoption.js';
import {
  TERM,
  coverageOf,
  exceptionsIn,
  notExamined,
  record,
} from '../services/examination.js';
import { structureById } from '../data/structures.js';
import type { Store } from '../store/index.js';
import type { Examination } from '../types.js';

const now = () => new Date().toISOString();

const schema = z.object({
  matterId: z.string().min(1).max(120),
  from: z.string().datetime(),
  to: z.string().datetime(),
  howChosen: z.string().min(1).max(4_000),
  /**
   * Null is a real value and is not the same as absent-and-defaulted-to-zero.
   * It means the institution did not say how many transactions there were.
   */
  population: z.number().int().min(0).nullable(),
  examined: z.number().int().min(0),
  findings: z
    .array(
      z.object({
        against: z.string().min(1).max(200),
        held: z.enum(['held', 'exceptions', 'not_examined']),
        exceptions: z.number().int().min(0),
        note: z.string().max(20_000).default(''),
      }),
    )
    .max(200)
    .default([]),
});

/** Everything a screen needs, without it re-deriving the record. */
async function withDerived(store: Store, e: Examination) {
  const matter = await store.matter(e.matterId);
  const shipped = matter?.structureId ? structureById(matter.structureId) : undefined;

  const adoptions = matter?.structureId ? await store.adoptions(e.boardId) : [];
  const adoption =
    standingAdoptions(adoptions).find((a) => a.structureId === matter?.structureId) ?? null;

  const conditions =
    adoption && adoption.conditions.length > 0 ? adoption.conditions : (shipped?.conditions ?? []);
  const termKeys = (matter?.proposedRule.parameters ?? []).map((p) => p.key);

  /*
   * What each finding is *against*, in words.
   *
   * A finding stores the identifier it was recorded against — `minTangibleRatioBps`
   * for an operative term, a condition id for a condition — and the screen
   * printed that identifier. A scholar reading an examination saw
   *
   *     minTangibleRatioBps   3
   *
   * which is a machine's name for the thing and a number with no label. The
   * board never wrote `minTangibleRatioBps`; it wrote "tangible assets and
   * usufructs must be at least 51.00% of pool value", and that sentence is
   * already in the record, on the rule this examination is against.
   *
   * Resolved here rather than on the screen so every reader gets the sentence
   * — the annual report and the audit export as well, which is where an
   * identifier would do the most damage.
   *
   * The key is kept beside it. An auditor tracing a finding back to the
   * parameter it was recorded against needs the identifier, and a reader needs
   * the sentence; they are different jobs.
   */
  const terms = new Map((matter?.proposedRule.parameters ?? []).map((p) => [p.key, p.meaning]));
  const byCondition = new Map(conditions.map((c) => [c.id, c.requirement]));

  const findings = e.findings.map((f) => ({
    ...f,
    inWords: terms.get(f.against) ?? byCondition.get(f.against) ?? null,
  }));

  return {
    ...e,
    findings,
    coverage: coverageOf(e),
    exceptions: exceptionsIn(e),
    /** Named rather than omitted: silence about a condition is not a pass. */
    notExamined: notExamined(e, conditions, termKeys),
    matterTitle: matter?.title ?? null,
    /**
     * Whether the terms have moved since this was examined.
     *
     * An examination against terms the board has amended is evidence about the
     * older ones. Saying so is what stops it being read as evidence about the
     * rule in force today.
     */
    againstCurrentTerms: matter ? matter.proposedRule.parameterHash === e.parameterHash : null,
  };
}

export function examinationRoutes(store: Store): Router {
  const router = Router();

  /**
   * What has been examined, newest first.
   *
   * Open to observers. The auditor and the regulator are exactly who this is
   * for, and a record of examinations that only the board could read would be
   * missing most of its audience.
   */
  router.get(
    '/examinations',
    handle(async (req, res) => {
      const boardId = typeof req.query.board === 'string' ? req.query.board : undefined;
      const matterId = typeof req.query.matter === 'string' ? req.query.matter : undefined;

      let all = await store.examinations(boardId);
      if (matterId) all = all.filter((e) => e.matterId === matterId);

      const rows = await Promise.all(
        all
          .sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt))
          .map((e) => withDerived(store, e)),
      );

      res.json({ examinations: rows, count: rows.length });
    }),
  );

  router.get(
    '/examinations/:id',
    handle(async (req, res) => {
      const found = await store.examination(req.params.id);
      if (!found) {
        res.status(404).json({ error: 'not_found', message: 'No such examination.' });
        return;
      }
      res.json({ examination: await withDerived(store, found) });
    }),
  );

  /**
   * Record one.
   *
   * The secretary or the liaison, never a signatory — see the note at the top
   * of this file. The service refuses the rest: a sample nobody accounted for,
   * an exception nobody described, a finding against something this ruling
   * never set.
   */
  router.post(
    '/examinations',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (
        !requireRole(
          res,
          mayRecordInstitutionAct(who.role, who.office),
          'record an examination',
          who.role,
        )
      ) {
        return;
      }

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const matter = await store.matter(parsed.data.matterId);
      if (!matter) {
        res.status(404).json({ error: 'not_found', message: 'No such matter.' });
        return;
      }

      const adoptions = matter.structureId ? await store.adoptions(matter.boardId) : [];
      const adoption =
        standingAdoptions(adoptions).find((a) => a.structureId === matter.structureId) ?? null;

      const at = now();
      const id = `exam-${at.replace(/[^0-9]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`;

      const examination = record(id, matter, who.scholarId, at, parsed.data, adoption);
      const stored = await store.recordExamination(examination);

      res.status(201).json({ examination: await withDerived(store, stored) });
    }),
  );

  /**
   * What a ruling can be examined against: its conditions and its terms.
   *
   * Offered so a screen does not have to assemble the list itself and get it
   * subtly wrong — an examination form that omitted a condition would produce
   * an examination that silently never covered it.
   */
  router.get(
    '/matters/:id/examinable',
    handle(async (req, res) => {
      const matter = await store.matter(req.params.id);
      if (!matter) {
        res.status(404).json({ error: 'not_found', message: 'No such matter.' });
        return;
      }

      const shipped = matter.structureId ? structureById(matter.structureId) : undefined;
      const adoptions = matter.structureId ? await store.adoptions(matter.boardId) : [];
      const adoption =
        standingAdoptions(adoptions).find((a) => a.structureId === matter.structureId) ?? null;

      const conditions =
        adoption && adoption.conditions.length > 0
          ? adoption.conditions
          : (shipped?.conditions ?? []);

      res.json({
        matterId: matter.id,
        title: matter.title,
        settled: matter.status === 'in_force' || matter.status === 'timelock',
        conditions: conditions.map((c) => ({ against: c.id, requirement: c.requirement })),
        terms: matter.proposedRule.parameters.map((p) => ({
          against: TERM + p.key,
          requirement: p.meaning,
          key: p.key,
        })),
      });
    }),
  );

  return router;
}
