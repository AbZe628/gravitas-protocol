import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import { hashPassword } from '../src/auth/members.js';
import { boards, incidents, matters, rules } from '../src/data/seed.js';
import { lifecycleMatters } from '../src/data/seed-lifecycle.js';
import { adoptions, examinations, submissions, undertakings } from '../src/data/seed-work.js';
import { structureById } from '../src/data/structures.js';
import { TERM, inWords } from '../src/services/examination.js';
import { matterBehind, theChain } from '../src/services/the-chain.js';
import type { Examination, Rule, RuleParameter, StructureCondition } from '../src/types.js';

/**
 * From the ruling to the evidence about it.
 *
 * ── what a board could not see ────────────────────────────────────────────
 *
 * The pool ruling answers six questions — what was decided, how it is
 * measured, whether it moves, when it is checked, what happens if it fails,
 * who is told. All mechanism, all correct, and not one word about the fact
 * that it **did** fail: three transfers executed at 50.4% in June, found by an
 * examination, sitting in the record, invisible on the page for the rule they
 * breached. Under it the page read *this stands. Nothing is waiting on the
 * board.*
 *
 * Rulings on one screen, the register on a second, examinations on a third.
 * The examinations read as bolted on because the chain was cut between them.
 *
 * ── and the finding could not be read in the board's words ────────────────
 *
 * A finding carries what it is against: a condition's id, or `term:<key>`.
 * Two places read that field and disagreed about the prefix. The one that
 * turns it into a sentence looked terms up without it; the one that works out
 * what was never examined looked them up with it. So no examination could be
 * right in both — and both shapes were in the product at once. Found by
 * recording one through the application and reading it beside a seeded one,
 * two cards apart on the same screen.
 */

const PASSWORD = 'a board credential';
const secret = hashPassword(PASSWORD);

const MEMBERS = ['member-a:signatory+chair', 'member-b:signatory+secretary', 'member-c:signatory']
  .map((entry) => `${entry}:${secret}`)
  .join('\n');

const as = (who: string) => 'Basic ' + Buffer.from(`${who}:${PASSWORD}`).toString('base64');

const POOL = 'rule-pool-trading';

let app: Express;
const saved = { members: process.env.MAJLIS_MEMBERS };

beforeEach(() => {
  process.env.MAJLIS_MEMBERS = MEMBERS;
  app = createApp(
    new MemoryStore({
      boards,
      matters: [...matters, ...lifecycleMatters],
      rules,
      incidents,
      examinations,
      submissions,
      undertakings,
      adoptions,
      briefings: [],
    }),
  );
});

afterEach(() => {
  process.env.MAJLIS_MEMBERS = saved.members;
});

// ── the demonstration record, in a shape the application could have made ───

/**
 * Seeded data the application would itself refuse.
 *
 * `record` accepts a finding only against a condition id or `term:<key>`, and
 * the form that records one hands out exactly those. Both seeded examinations
 * were written bare, so the demonstration board shipped two examinations in a
 * shape no route would take — and the reader that tolerated the bare form made
 * them look right while the reader that did not counted both terms among what
 * was never examined.
 */
describe('the seeded examinations', () => {
  const pool = matters.find((m) => m.proposedRule.id === POOL)!;
  const conditions = structureById(pool.structureId!)!.conditions;

  it('records every finding against something the ruling actually carries', () => {
    const seen: string[] = [];
    for (const e of examinations) {
      for (const f of e.findings) {
        seen.push(f.against);
        expect(
          inWords(f.against, pool.proposedRule.parameters, conditions),
          `${e.id}: nothing in the ruling is called ${f.against}`,
        ).toBeTruthy();
      }
    }
    // The measure looked at something: three findings across two examinations.
    expect(seen).toHaveLength(3);
  });

  /*
   * Both carried an empty hash, so every examination in the product reported
   * itself as evidence about terms the board had since amended — on a board
   * that had never amended anything.
   */
  it('records the terms as they stood, so none of them claims the terms have moved', () => {
    expect(examinations.length).toBeGreaterThan(0);
    for (const e of examinations) {
      const rule = rules.find((r) => r.id === e.ruleId);
      expect(rule, `${e.id} names a ruling the register does not hold`).toBeTruthy();
      expect(e.parameterHash, e.id).toBe(rule!.parameterHash);
    }
  });
});

// ── the chain itself ───────────────────────────────────────────────────────

const TERMS: RuleParameter[] = [
  { key: 'ratio', value: '5100', meaning: 'Tangible assets are at least 51% of the pool.' },
  { key: 'onBreach', value: 'block', meaning: 'Transfers do not execute below the threshold.' },
];

const CONDITIONS: StructureCondition[] = [
  {
    id: 'owned-first',
    requirement: 'The asset is owned before it is sold.',
    why: 'Selling what one does not own is the fault the whole shape guards against.',
    evidence: 'document',
  },
  {
    id: 'no-buyback',
    requirement: 'Any buy-back is at market value.',
    why: 'A buy-back at face value is a loan wearing a sale.',
    evidence: 'undertaking',
  },
];

const RULE: Rule = {
  id: 'rule-under-test',
  boardId: 'demo-board',
  title: 'A ruling with two conditions and two terms',
  statement: 'Stated once.',
  parameters: TERMS,
  parameterHash: '0xnow',
  parameterHashVerified: true,
  version: 1,
  inForceFrom: '2026-01-01T00:00:00.000Z',
  supersededBy: null,
  supersedes: null,
  sources: [],
};

function exam(over: Partial<Examination> = {}): Examination {
  return {
    id: 'e1',
    boardId: 'demo-board',
    matterId: 'm1',
    ruleId: RULE.id,
    parameterHash: '0xnow',
    from: '2026-04-01',
    to: '2026-06-30',
    howChosen: 'Every transfer in the quarter.',
    population: 100,
    examined: 40,
    examinedBy: 'member-b',
    recordedAt: '2026-07-31T00:00:00.000Z',
    findings: [],
    ...over,
  };
}

const chainOf = (examinations: Examination[], rule: Rule = RULE) =>
  theChain(rule, { conditions: CONDITIONS, terms: TERMS, examinations });

describe('what the ruling asks, and what the evidence says', () => {
  it('carries every condition and every term, so nothing the ruling asks is off the page', () => {
    const chain = chainOf([]);
    expect(chain.links.map((l) => l.against)).toEqual([
      'owned-first',
      'no-buyback',
      TERM + 'ratio',
      TERM + 'onBreach',
    ]);
  });

  /*
   * The valuable half is the silence. A board reading *two of these have been
   * looked at, six never have* is being told something no green screen tells
   * it, and a condition nobody examined must be a row with nothing in it
   * rather than a row that is not there.
   */
  it('says how many nobody has ever examined', () => {
    expect(chainOf([]).neverLooked).toBe(4);

    const one = chainOf([
      exam({ findings: [{ against: 'owned-first', held: 'held', exceptions: 0, note: '' }] }),
    ]);
    expect(one.neverLooked).toBe(3);
    expect(one.links.find((l) => l.against === 'owned-first')!.timesLooked).toBe(1);
  });

  it('counts an explicit not_examined as never looked at, not as a look', () => {
    const chain = chainOf([
      exam({
        findings: [{ against: 'owned-first', held: 'not_examined', exceptions: 0, note: '' }],
      }),
    ]);
    expect(chain.neverLooked).toBe(4);
    expect(chain.links.find((l) => l.against === 'owned-first')!.lastLooked).toBeNull();
  });

  it('carries what the institution must produce to show a condition', () => {
    const chain = chainOf([]);
    expect(chain.links.find((l) => l.against === 'owned-first')!.shownBy).toBe('document');
    expect(chain.links.find((l) => l.against === 'no-buyback')!.shownBy).toBe('undertaking');
    // A term is shown by the figure itself; nothing is invented to fill it.
    expect(chain.links.find((l) => l.against === TERM + 'ratio')!.shownBy).toBeNull();
  });

  it('carries the board’s own words for what is asked, never the key', () => {
    const chain = chainOf([]);
    expect(chain.links.find((l) => l.against === TERM + 'ratio')!.asks).toBe(TERMS[0].meaning);
    expect(chain.links.find((l) => l.against === 'owned-first')!.why).toContain('Selling what');
  });

  /*
   * By the end of the period examined, not by the day it was typed up: an
   * examination of the March quarter filed in October is evidence about March,
   * and a board asking when this was last looked at means the period.
   */
  it('takes the last look from the period examined, not from when it was filed', () => {
    /*
     * The two orders have to disagree, or this passes on either.
     *
     * Written first with the later period also filed later, it passed with the
     * comparison sorting on the filing date — both orders gave the same answer
     * and the test never reached what it claims to measure. So: the newer
     * period was written up promptly, the older one was typed up months late.
     */
    const laterPeriod = exam({
      id: 'later-period',
      from: '2026-07-01',
      to: '2026-09-30',
      recordedAt: '2026-10-05T00:00:00.000Z',
      findings: [{ against: 'owned-first', held: 'held', exceptions: 0, note: 'September.' }],
    });
    const filedLast = exam({
      id: 'filed-last',
      from: '2026-01-01',
      to: '2026-03-31',
      recordedAt: '2026-12-01T00:00:00.000Z',
      findings: [{ against: 'owned-first', held: 'held', exceptions: 0, note: 'March.' }],
    });

    const link = chainOf([filedLast, laterPeriod]).links.find((l) => l.against === 'owned-first')!;
    expect(link.lastLooked!.examinationId).toBe('later-period');
    expect(link.lastLooked!.note).toBe('September.');
    expect(link.timesLooked).toBe(2);
  });

  it('counts exceptions across every examination, and never reaches a verdict', () => {
    const chain = chainOf([
      exam({
        id: 'a',
        to: '2026-03-31',
        findings: [{ against: TERM + 'ratio', held: 'exceptions', exceptions: 3, note: 'June.' }],
      }),
      exam({
        id: 'b',
        to: '2026-06-30',
        findings: [{ against: TERM + 'ratio', held: 'exceptions', exceptions: 2, note: 'August.' }],
      }),
    ]);

    expect(chain.links.find((l) => l.against === TERM + 'ratio')!.exceptions).toBe(5);
    expect(chain.exceptions).toBe(5);

    const json = JSON.stringify(chain).toLowerCase();
    /*
     * Not 'breach': the board wrote onBreach, and a measure that forbade the
     * board its own words would be this file ruling on the record.
     */
    for (const word of ['compliant', 'passed', 'failed', 'verdict', 'score', 'clean']) {
      expect(json, `the chain reached for the word "${word}"`).not.toContain(word);
    }
  });

  /*
   * An examination against terms the board has since amended is evidence about
   * the older ones. A board reading a clean finding against a rule that has
   * moved is reading about a rule that is gone.
   */
  it('says when a look was against terms that have since moved', () => {
    const chain = chainOf([
      exam({
        parameterHash: '0xthen',
        findings: [{ against: 'owned-first', held: 'held', exceptions: 0, note: 'Held.' }],
      }),
    ]);
    expect(chain.links.find((l) => l.against === 'owned-first')!.lastLooked!.againstTheseTerms).toBe(
      false,
    );
  });

  it('ignores an examination of another ruling entirely', () => {
    const chain = chainOf([
      exam({
        ruleId: 'some-other-rule',
        findings: [{ against: 'owned-first', held: 'exceptions', exceptions: 9, note: 'Elsewhere.' }],
      }),
    ]);
    expect(chain.examinations).toBe(0);
    expect(chain.exceptions).toBe(0);
    expect(chain.neverLooked).toBe(4);
  });
});

describe('the matter a ruling came from', () => {
  it('finds it, because the conditions hang off the matter and not off the rule', () => {
    const pool = rules.find((r) => r.id === POOL)!;
    expect(matterBehind(pool, matters)!.id).toBe('matter-2026-04-02');
  });

  it('answers null for a ruling no matter carries, rather than throwing', () => {
    expect(matterBehind(RULE, matters)).toBeNull();
  });
});

// ── over HTTP, where the board reads it ────────────────────────────────────

describe('GET /api/rules/:id/chain', () => {
  it('joins the pool ruling to the examinations that tested it', async () => {
    const res = await request(app).get(`/api/rules/${POOL}/chain`).set('Authorization', as('member-a'));

    expect(res.status).toBe(200);
    expect(res.body.ruleId).toBe(POOL);
    expect(res.body.matterId).toBe('matter-2026-04-02');
    expect(res.body.examinations).toBe(2);
    // The three transfers at 50.4%, reaching the page for the rule they breached.
    expect(res.body.exceptions).toBe(3);

    const ratio = res.body.links.find(
      (l: { against: string }) => l.against === TERM + 'minTangibleRatioBps',
    );
    expect(ratio.lastLooked.held).toBe('exceptions');
    expect(ratio.lastLooked.note).toContain('50.4%');
    expect(ratio.lastLooked.againstTheseTerms).toBe(true);
    expect(ratio.asks).toContain('51.00%');
  });

  /*
   * Six conditions on the shape, two operative terms, and the examinations
   * reached two of the eight. The number nobody could see before this.
   */
  it('names how many of the ruling’s own asks nobody has ever examined', async () => {
    const res = await request(app).get(`/api/rules/${POOL}/chain`).set('Authorization', as('member-a'));
    expect(res.body.links).toHaveLength(8);
    expect(res.body.neverLooked).toBe(6);
  });

  it('answers 404 for a ruling the register does not hold', async () => {
    const res = await request(app)
      .get('/api/rules/nothing-like-this/chain')
      .set('Authorization', as('member-a'));
    expect(res.status).toBe(404);
  });
});
