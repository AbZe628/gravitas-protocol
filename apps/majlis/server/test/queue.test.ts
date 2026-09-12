import { describe, it, expect } from 'vitest';
import { buildQueue } from '../src/services/queue.js';
import type { Incident, Matter, Submission } from '../src/types.js';
import { boards, matters as seeded } from '../src/data/seed.js';

/**
 * The queue says what is waiting, whose it is, and in what order.
 *
 * ── what this holds shut ──────────────────────────────────────────────────
 *
 * Three claims, and each of them is a decision somebody could quietly undo.
 *
 * **The order is what is waiting, never what sounds grave.** A breach does
 * not outrank a question because breaches sound worse. The software is
 * entitled to know how long a thing has waited and whether a clock has run
 * out; whether it is *serious* is a reading, and readings belong to the
 * board. A sort that put breaches first would look like an improvement and
 * would be the application forming a view about a matter it has not read.
 *
 * **Three of the eight breach steps are the institution's.** The commonest
 * way a breach stalls is that each side believes it is with the other, so a
 * row that named the board on a step the bank owes would be worse than no
 * row at all.
 *
 * **Settled things are not waiting.** A matter in force is finished. A list
 * that carried it would grow forever and stop being read.
 */

/*
 * The real board and a real matter, not invented ones.
 *
 * The first version of this test built both by hand, and `buildPassage`
 * threw on them three times running, each time for a different missing
 * field. A stub that has to be repaired every time a service reads one more
 * property is a stub that has stopped describing the thing it stands for —
 * so the shape comes from the seed and only what the test is about is
 * changed.
 */
const BOARD = boards[0];
const BASE = seeded[0];

const NOW = '2026-09-12T00:00:00Z';

function submission(id: string, arrivedAt: string, declined = false): Submission {
  return {
    id,
    boardId: 'demo-board',
    institutionId: 'demo-institution',
    arrivedAt,
    recordedAt: arrivedAt,
    askedBy: 'Treasury desk',
    recordedBy: 'member-b',
    onBehalf: false,
    subject: 'Question ' + id,
    question: 'May we?',
    background: '',
    awaiting: '',
    attachments: [],
    draft: null,
    dispositions: declined ? [{ kind: 'declined', at: NOW, by: 'member-a', reason: 'No.' }] : [],
    matterId: null,
  } as unknown as Submission;
}

function incident(id: string, stage: Incident['stage'], reportedAt: string): Incident {
  return {
    id,
    boardId: 'demo-board',
    reference: 'SNC-' + id,
    title: 'Breach ' + id,
    report: '',
    reportedAt,
    reportedBy: 'member-a',
    stage,
    actual: stage === 'reported' ? null : true,
    determinedAt: stage === 'reported' ? null : reportedAt,
    concurrences: [],
    plans: [],
    purification: null,
    closedAt: null,
  } as unknown as Incident;
}

function matter(id: string, status: Matter['status'], openedAt: string): Matter {
  return { ...BASE, id, title: 'Matter ' + id, status, openedAt, boardId: BOARD.id };
}

const EMPTY = { rules: [], undertakings: [], now: NOW };

describe('what is waiting, and whose it is', () => {
  it('puts what is past its date first, whatever kind it is', () => {
    const rows = buildQueue({
      board: BOARD,
      ...EMPTY,
      submissions: [submission('old', '2026-06-01T00:00:00Z')],
      matters: [],
      // Determined in June, so the thirty days ran out long ago.
      incidents: [incident('late', 'submitted', '2026-06-01T00:00:00Z')],
    });

    expect(rows[0].overdue, 'the overdue row is not first').toBe(true);
    expect(rows.every((r) => r.kind)).toBe(true);
  });

  it('orders by how long it has waited, not by what kind of thing it is', () => {
    const rows = buildQueue({
      board: BOARD,
      ...EMPTY,
      // A young breach and an old question. Nothing is overdue.
      submissions: [submission('old', '2026-07-01T00:00:00Z')],
      matters: [],
      incidents: [incident('young', 'reported', '2026-09-10T00:00:00Z')],
    });

    expect(rows).toHaveLength(2);
    expect(
      rows[0].kind,
      'a young breach was ranked above a question that has waited ten times longer',
    ).toBe('question');
    expect(rows[0].days).toBeGreaterThan(rows[1].days);
  });

  it('names the institution on the steps that are the institution’s', () => {
    const rows = buildQueue({
      board: BOARD,
      ...EMPTY,
      submissions: [],
      matters: [],
      incidents: [
        incident('a', 'reported', NOW),
        incident('b', 'determined', NOW),
        incident('c', 'endorsed', NOW),
        incident('d', 'approved', NOW),
      ],
    });

    const whose = Object.fromEntries(rows.map((r) => [r.id, r.whose]));
    expect(whose.a, 'determining whether it is actual is the board’s').toBe('board');
    expect(whose.b, 'filing a plan is the institution’s').toBe('institution');
    expect(whose.c, 'putting it to the Directors is the institution’s').toBe('institution');
    expect(whose.d, 'filing with the regulator is the institution’s').toBe('institution');
  });

  it('leaves out what is finished, and what was never a breach', () => {
    const rows = buildQueue({
      board: BOARD,
      ...EMPTY,
      submissions: [submission('declined', '2026-06-01T00:00:00Z', true)],
      matters: [
        matter('inforce', 'in_force', '2026-06-01T00:00:00Z'),
        matter('rejected', 'rejected', '2026-06-01T00:00:00Z'),
        matter('open', 'deliberation', '2026-06-01T00:00:00Z'),
      ],
      incidents: [
        incident('closed', 'closed', '2026-06-01T00:00:00Z'),
        incident('notreally', 'not_actual', '2026-06-01T00:00:00Z'),
      ],
    });

    expect(rows.map((r) => r.id), 'only the open matter is still waiting').toEqual(['open']);
  });

  it('says what is next on a matter in the words the matter’s own screen uses', () => {
    const rows = buildQueue({
      board: BOARD,
      ...EMPTY,
      submissions: [],
      matters: [matter('m', 'deliberation', '2026-08-01T00:00:00Z')],
      incidents: [],
    });

    /*
     * Not asserted against a literal sentence. The words come from
     * `buildPassage`, which is the point — this queue must not hold a second
     * opinion about what happens next. What is asserted is that it asked:
     * a row with no act and no owner would mean the passage was never called.
     */
    expect(rows[0].next, 'the matter row carries no next act').toBeTruthy();
    expect(rows[0].whose, 'the matter row says nobody owns it').toBeTruthy();
  });

  it('keeps the screen when one record cannot be read', () => {
    /*
     * A matter missing a field `buildPassage` assumes. On the matter's own
     * page that throwing is tolerable — one record, and nobody could open it
     * anyway. Here it would mean signing in to nothing: every other question,
     * breach and undertaking lost with it, on the screen a member arrives at.
     */
    const broken = matter('broken', 'deliberation', '2026-08-01T00:00:00Z');
    delete (broken as { mechanism?: string }).mechanism;

    const rows = buildQueue({
      board: BOARD,
      ...EMPTY,
      submissions: [submission('q', '2026-07-01T00:00:00Z')],
      matters: [broken],
      incidents: [],
    });

    expect(rows.map((r) => r.id).sort(), 'a bad record took the whole queue down').toEqual([
      'broken',
      'q',
    ]);
    const row = rows.find((r) => r.id === 'broken');
    expect(row?.title, 'the row lost the one thing that makes it findable').toBe('Matter broken');
    expect(row?.next, 'a sentence was invented for a record that could not be read').toBeNull();
  });
});
