import { describe, it, expect } from 'vitest';
import { tell } from '../src/services/telling.js';
import { MemoryStore } from '../src/store/index.js';
import type { Board, Computation, Examination, Matter } from '../src/types.js';

/**
 * Telling the bank.
 *
 * The lines these hold:
 *
 *   - it states what happened and never says what it means;
 *   - it never claims anybody was reached;
 *   - it carries no scholar's reasoning into a message nobody showed them;
 *   - a review says what was found, and never that there was a breach.
 */

async function seeded(): Promise<{ board: Board; matters: Matter[] }> {
  const store = new MemoryStore();
  const board = await store.board('demo-board');
  if (!board) throw new Error('the seeded board is gone');
  return { board, matters: await store.matters('demo-board') };
}

const decided = (m: Matter[]) => m.find((x) => x.status === 'in_force') ?? m[0];

describe('what every notice must be', () => {
  it('never claims anybody was reached', async () => {
    const { board, matters } = await seeded();
    /*
     * `concerns` is board member ids everywhere else. A notice to the
     * institution concerns the institution, and this application holds no
     * address for it — an empty list is what stops a screen implying somebody
     * was told.
     */
    for (const notice of [
      tell(board, { kind: 'ruling', matter: decided(matters) }),
      tell(board, { kind: 'refusal', matter: decided(matters) }),
      tell(board, { kind: 'draft_ready', matter: decided(matters) }),
    ]) {
      expect(notice.concerns).toEqual([]);
    }
  });

  it('carries no member’s reasoning', async () => {
    const { board, matters } = await seeded();
    const m = decided(matters);
    const notice = tell(board, { kind: 'ruling', matter: m });

    /*
     * A reason is in the record and in the ruling, under the name of whoever
     * gave it. Repeating it in a message nobody showed them would put a
     * scholar's words somewhere they never agreed to.
     */
    for (const r of m.reasoning) {
      if (r.reason.length > 20) expect(notice.body).not.toContain(r.reason);
    }
  });
});

describe('a decision', () => {
  it('carries the operative terms, because that is what the desk has to apply', async () => {
    const { board, matters } = await seeded();
    const m = decided(matters);
    const notice = tell(board, { kind: 'ruling', matter: m });

    for (const p of m.proposedRule.parameters) {
      expect(notice.body).toContain(p.meaning);
    }
  });

  it('carries what was not decided, so a narrow answer is not read as a broad one', async () => {
    const { board, matters } = await seeded();
    const m = decided(matters);
    const notice = tell(board, { kind: 'ruling', matter: m });
    for (const n of m.notDecided) expect(notice.body).toContain(n);
  });

  it('says which direction it goes in, in words rather than a term of art', async () => {
    const { board, matters } = await seeded();
    const notice = tell(board, { kind: 'ruling', matter: decided(matters) });
    expect(notice.body).toMatch(/restricts what may be done|permits something that was not/);
  });
});

describe('a refusal', () => {
  it('is a decision and says so, rather than reading as silence', async () => {
    const { board, matters } = await seeded();
    const notice = tell(board, { kind: 'refusal', matter: decided(matters) });
    expect(notice.body).toContain('A refusal is a decision');
    expect(notice.body).toMatch(/does not prevent the question being\s+put again/);
  });
});

describe('a figure', () => {
  const computation: Computation = {
    id: 'c-1',
    kind: 'purification',
    boardId: 'demo-board',
    assetId: null,
    periodFrom: '2026-01-01',
    periodTo: '2026-06-30',
    method: 'The board’s own proportion.',
    methodStated: 'The proportion this board recorded, applied to the period.',
    currency: 'AED',
    source: 'Distribution statement (illustrative)',
    figures: {},
    headline: 'AED 48,720 to be given away',
    amount: 'AED 48,720.00',
    steps: [],
    note: '',
    recordedBy: 'member-b',
    recordedAt: '2026-07-08T00:00:00.000Z',
    supersedes: null,
    withdrawnAt: null,
    withdrawnBy: null,
    withdrawalReason: null,
  };

  it('quotes the method, so the figure is never the application’s opinion', async () => {
    const { board } = await seeded();
    const notice = tell(board, { kind: 'figure', computation });
    expect(notice.body).toContain(computation.methodStated);
    expect(notice.body).toContain(computation.source);
  });

  it('says that recording it is not doing it', async () => {
    const { board } = await seeded();
    expect(tell(board, { kind: 'figure', computation }).body).toContain('Recording it is not doing it');
  });
});

describe('a review', () => {
  const base: Examination = {
    id: 'e-1',
    boardId: 'demo-board',
    matterId: 'm-1',
    ruleId: 'r-1',
    parameterHash: '',
    from: '2026-04-01',
    to: '2026-06-30',
    howChosen: 'Every transfer above one million.',
    population: 412,
    examined: 78,
    examinedBy: 'member-b',
    recordedAt: '2026-07-31T00:00:00.000Z',
    findings: [],
  };

  it('says what was found and never that there was a breach', async () => {
    const { board } = await seeded();
    const notice = tell(board, {
      kind: 'examination',
      ruleTitle: 'Secondary trading of a mixed pool',
      examination: {
        ...base,
        findings: [
          { against: 'minTangibleRatioBps', held: 'exceptions', exceptions: 3, note: 'Three transfers on a stale feed.' },
        ],
      },
    });

    expect(notice.body).toContain('3 outside the terms');
    expect(notice.body).toContain('determination of the board');

    /*
     * A non-compliance is a determination with its own nine-step path. A
     * notice that announced one would be the board's finding, written by
     * nobody.
     */
    expect(notice.body.toLowerCase()).not.toContain('non-compliance');
    expect(notice.body.toLowerCase()).not.toContain('breach');
  });

  it('says plainly when nothing was found, rather than leaving a silence', async () => {
    const { board } = await seeded();
    const notice = tell(board, { kind: 'examination', ruleTitle: 'A rule', examination: base });
    expect(notice.body).toContain('Nothing was found outside the terms');
  });

  it('carries how the sample was chosen, because a finding without it is not one', async () => {
    const { board } = await seeded();
    const notice = tell(board, { kind: 'examination', ruleTitle: 'A rule', examination: base });
    expect(notice.body).toContain(base.howChosen);
    expect(notice.body).toContain('78 of 412');
  });
});
