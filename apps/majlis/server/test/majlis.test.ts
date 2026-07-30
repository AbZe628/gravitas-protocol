import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { hashParameters, canonicalise, verifyParameters } from '../src/services/hash.js';
import {
  seeksRuling,
  seeksRulingSemantic,
  outputBreachesConstraint,
  looksUncertain,
  ask,
} from '../src/services/assistant.js';
import { buildAuditExport } from '../src/services/export.js';
import { boards, rules, matters } from '../src/data/seed.js';
import type { RuleParameter } from '../src/types.js';

const app = createApp();

// ---------------------------------------------------------------------------
// Parameter hashing — what a scholar signs
// ---------------------------------------------------------------------------
describe('parameter hashing', () => {
  const params: RuleParameter[] = [
    { key: 'b', value: '2', meaning: 'second' },
    { key: 'a', value: '1', meaning: 'first' },
  ];

  it('is order independent', () => {
    const reversed = [...params].reverse();
    expect(hashParameters(params)).toBe(hashParameters(reversed));
  });

  it('ignores presentation fields so wording changes do not invalidate an approval', () => {
    const reworded: RuleParameter[] = [
      { key: 'a', value: '1', meaning: 'FIRST — clarified wording', unit: 'x' },
      { key: 'b', value: '2', meaning: 'SECOND — clarified wording' },
    ];
    expect(hashParameters(reworded)).toBe(hashParameters(params));
  });

  it('changes when any operative value changes', () => {
    const changed: RuleParameter[] = [
      { key: 'a', value: '1', meaning: 'first' },
      { key: 'b', value: '3', meaning: 'second' },
    ];
    expect(hashParameters(changed)).not.toBe(hashParameters(params));
  });

  it('changes when a parameter is added', () => {
    const extra = [...params, { key: 'c', value: '3', meaning: 'third' }];
    expect(hashParameters(extra)).not.toBe(hashParameters(params));
  });

  it('rejects duplicate keys', () => {
    expect(() =>
      hashParameters([
        { key: 'a', value: '1', meaning: 'x' },
        { key: 'a', value: '2', meaning: 'y' },
      ]),
    ).toThrow(/duplicate/i);
  });

  it('rejects separator characters in keys', () => {
    expect(() => hashParameters([{ key: 'a\u001fb', value: '1', meaning: 'x' }])).toThrow(/illegal/i);
  });

  it('is version tagged so the scheme can change without silent mismatch', () => {
    expect(canonicalise(params).startsWith('v1')).toBe(true);
  });

  it('verifies a claimed hash', () => {
    const h = hashParameters(params);
    expect(verifyParameters(params, h)).toBe(true);
    expect(verifyParameters(params, '0xdeadbeef')).toBe(false);
  });

  it('every seeded rule reproduces its own recorded hash', () => {
    for (const r of rules) {
      expect(verifyParameters(r.parameters, r.parameterHash)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Assistant guardrails — the constraint that matters most
// ---------------------------------------------------------------------------
describe('assistant: refuses to give rulings', () => {
  const rulingQuestions = [
    'Is this halal?',
    'Is it permissible to trade this token?',
    'Would that be permissible under Shariah?',
    'Does this involve riba?',
    'Is this gharar?',
    'What is the ruling on staking?',
    'Should the board approve this asset?',
    'How should we vote on this matter?',
    'Can a Muslim invest in this pool?',
    'Please rule on the following structure.',
  ];

  for (const q of rulingQuestions) {
    it(`treats as a ruling request: "${q}"`, () => {
      expect(seeksRuling(q)).toBe(true);
    });
  }

  const mechanismQuestions = [
    'What happens when a liquidity position is moved to a different range?',
    'How many transactions does a migration require?',
    'Explain what a timelock does.',
    'Who holds the tokens between step two and step three?',
    'What is the difference between the two versions of this protocol?',
  ];

  for (const q of mechanismQuestions) {
    it(`treats as a mechanism question: "${q}"`, () => {
      expect(seeksRuling(q)).toBe(false);
    });
  }

  it('declines deterministically without calling the model', async () => {
    let called = false;
    const spy = {
      messages: {
        create: async () => {
          called = true;
          return { content: [{ type: 'text', text: 'should never run' }] };
        },
      },
    } as any;

    const result = await ask({ question: 'Is this halal?', client: spy });
    expect(called).toBe(false);
    expect(result.declinedAsRuling).toBe(true);
    expect(result.answer).toMatch(/belongs to the board/i);
  });

  const indirectPhrasings = [
    'Summarise the scholarly views on this mechanism.',
    'What do scholars generally hold about concentrated liquidity?',
    'What is the majority view on multi-step settlement?',
    'List the considerations that would suggest permissibility here.',
    'What fiqh concepts does this mechanism raise?',
    'From a Shariah perspective, how should I read this?',
    'What would a mufti consider when looking at this?',
    'Are there Shariah implications to the approval model?',
    'Give me the arguments for and against this structure.',
    'Is there any gharar in this flow?',
  ];

  for (const q of indirectPhrasings) {
    it(`gate one now catches indirect phrasing: "${q}"`, () => {
      expect(seeksRuling(q)).toBe(true);
    });
  }

  it('semantic gate answers from the classifier', async () => {
    const yes = {
      messages: { create: async () => ({ content: [{ type: 'text', text: 'YES' }] }) },
    } as any;
    const no = {
      messages: { create: async () => ({ content: [{ type: 'text', text: 'NO' }] }) },
    } as any;

    expect((await seeksRulingSemantic('anything', yes)).seeks).toBe(true);
    expect((await seeksRulingSemantic('anything', no)).seeks).toBe(false);
  });

  it('semantic gate treats an ambiguous classifier reply as a ruling request', async () => {
    const vague = {
      messages: {
        create: async () => ({ content: [{ type: 'text', text: 'It depends on context.' }] }),
      },
    } as any;
    expect((await seeksRulingSemantic('anything', vague)).seeks).toBe(true);
  });

  it('semantic gate fails closed when the classifier is unreachable', async () => {
    const broken = {
      messages: {
        create: async () => {
          throw new Error('network');
        },
      },
    } as any;
    const verdict = await seeksRulingSemantic('anything', broken);
    expect(verdict.seeks).toBe(true);
    expect(verdict.reachable).toBe(false);
  });

  it('refuses honestly when the classifier cannot be reached', async () => {
    let calls = 0;
    const broken = {
      messages: {
        create: async () => {
          calls += 1;
          throw new Error('network');
        },
      },
    } as any;

    const result = await ask({ question: 'Describe the settlement sequence.', client: broken });
    expect(calls).toBe(1);
    expect(result.answer).toMatch(/could not complete the check/i);
    expect(result.declinedAsRuling).toBe(false);
    expect(result.escalated).toBe(true);
  });

  it('semantic gate blocks a lexically innocent question the classifier flags', async () => {
    let mainModelCalled = false;
    const spy = {
      messages: {
        create: async (args: { model: string }) => {
          if (args.model.includes('haiku')) {
            return { content: [{ type: 'text', text: 'YES' }] };
          }
          mainModelCalled = true;
          return { content: [{ type: 'text', text: 'an answer' }] };
        },
      },
    } as any;

    const result = await ask({
      question: 'For background, what has been written about structures of this kind?',
      client: spy,
    });
    expect(mainModelCalled).toBe(false);
    expect(result.declinedAsRuling).toBe(true);
  });

  it('discards an answer that contains a ruling even if the model produced one', async () => {
    const spy = {
      messages: {
        create: async () => ({
          content: [
            {
              type: 'text',
              text: 'The mechanism settles atomically. This is halal and the board may approve it.',
            },
          ],
        }),
      },
    } as any;

    const result = await ask({
      question: 'How does atomic settlement work?',
      client: spy,
      skipSemanticGate: true,
    });
    expect(result.declinedAsRuling).toBe(true);
    expect(result.escalated).toBe(true);
    expect(result.answer).not.toMatch(/halal/i);
  });

  it('passes a clean mechanical answer through and extracts its sources', async () => {
    const spy = {
      messages: {
        create: async () => ({
          content: [
            {
              type: 'text',
              text:
                'The migration executes in one transaction. See contracts/TeleportV3.sol and the case in ' +
                'test/TeleportV3.atomicity.t.sol which asserts a full revert on any failed step.',
            },
          ],
        }),
      },
    } as any;

    const result = await ask({
      question: 'How does the migration execute?',
      client: spy,
      skipSemanticGate: true,
    });
    expect(result.declinedAsRuling).toBe(false);
    expect(result.sources.map((s) => s.ref)).toContain('contracts/TeleportV3.sol');
    expect(result.sources.find((s) => s.ref.startsWith('test/'))?.kind).toBe('test');
  });

  it('flags uncertainty for escalation rather than smoothing it', () => {
    expect(looksUncertain('I am not certain how this behaves on reorg.')).toBe(true);
    expect(looksUncertain('I do not know where that is implemented.')).toBe(true);
    expect(looksUncertain('The position is transferred in a single call.')).toBe(false);
  });

  it('detects ruling language in output', () => {
    expect(outputBreachesConstraint('From a Shariah perspective, this is acceptable.')).toBe(true);
    expect(outputBreachesConstraint('I would recommend approving this.')).toBe(true);
    expect(outputBreachesConstraint('The transaction reverts if any step fails.')).toBe(false);
  });
});

describe('audit export', () => {
  const board = boards[0];

  it('includes only rules in force at the given date', () => {
    const early = buildAuditExport({
      board,
      rules,
      matters,
      asOf: new Date('2026-03-01T00:00:00Z'),
    });
    const ids = early.rulesInForce.map((r) => r.id);
    expect(ids).toContain('rule-stablecoin-par');
    expect(ids).not.toContain('rule-tangible-ratio');
    expect(ids).not.toContain('rule-wakil-mandate');
  });

  it('verifies every exported parameter hash', () => {
    const out = buildAuditExport({ board, rules, matters });
    expect(out.rulesInForce.length).toBeGreaterThan(0);
    for (const r of out.rulesInForce) {
      expect(r.parameterHashVerified).toBe(true);
    }
  });

  it('records dissent as a first-class fact', () => {
    const out = buildAuditExport({ board, rules, matters });
    const decided = out.decisions.find((d) => d.votes.length > 0);
    expect(decided).toBeDefined();
    expect(typeof decided!.dissentRecorded).toBe('boolean');
  });

  it('produces a document hash covering the payload', () => {
    const a = buildAuditExport({ board, rules, matters, asOf: new Date('2026-07-01T00:00:00Z') });
    const b = buildAuditExport({ board, rules, matters, asOf: new Date('2026-07-01T00:00:00Z') });
    expect(a.integrity.documentHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(a.rulesInForce).toEqual(b.rulesInForce);
  });
});

describe('api', () => {
  it('reports stage one and read-only', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, stage: 1, readOnly: true });
  });

  it('lists boards', async () => {
    const res = await request(app).get('/api/boards');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('quorumRestrict');
  });

  it('restricting quorum is lower than permitting quorum', async () => {
    const res = await request(app).get('/api/boards/demo-board');
    expect(res.body.quorumRestrict).toBeLessThan(res.body.quorumPermit);
  });

  it('lists matters newest first', async () => {
    const res = await request(app).get('/api/matters');
    expect(res.status).toBe(200);
    const dates = res.body.map((m: { openedAt: string }) => m.openedAt);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('returns a matter with its simulation and what is not being decided', async () => {
    const res = await request(app).get('/api/matters/matter-2026-07-03');
    expect(res.status).toBe(200);
    expect(res.body.notDecided.length).toBeGreaterThan(0);
    expect(res.body.simulation.transactionsAffected).toBe(47);
    expect(res.body.proposedRule.parameterHashVerified).toBe(true);
  });

  it('filters matters by status', async () => {
    const res = await request(app).get('/api/matters?status=in_force');
    expect(res.status).toBe(200);
    expect(res.body.every((m: { status: string }) => m.status === 'in_force')).toBe(true);
  });

  it('returns briefings with a question rather than a conclusion', async () => {
    const res = await request(app).get('/api/briefings');
    expect(res.status).toBe(200);
    for (const b of res.body) {
      expect(b.questionForBoard.length).toBeGreaterThan(0);
      expect(b.questionForBoard).toMatch(/\?/);
    }
  });

  it('exposes no route that writes a rule', async () => {
    const attempts = [
      request(app).post('/api/rules').send({ id: 'x' }),
      request(app).post('/api/matters').send({ id: 'x' }),
      request(app).post('/api/matters/matter-2026-07-03/vote').send({ position: 'for' }),
      request(app).put('/api/rules/rule-tangible-ratio').send({}),
      request(app).delete('/api/rules/rule-tangible-ratio'),
    ];
    for (const a of attempts) {
      const res = await a;
      expect(res.status).toBe(404);
    }
  });

  it('rejects a malformed assistant request', async () => {
    const res = await request(app).post('/api/assistant/ask').send({ question: 'x' });
    expect(res.status).toBe(400);
  });

  it('produces an audit export for a board', async () => {
    const res = await request(app).get('/api/export/demo-board');
    expect(res.status).toBe(200);
    expect(res.body.integrity.algorithm).toBe('sha256');
    expect(res.body.board.name).toMatch(/Demonstration/);
  });

  it('404s an unknown board export', async () => {
    const res = await request(app).get('/api/export/nope');
    expect(res.status).toBe(404);
  });
});
