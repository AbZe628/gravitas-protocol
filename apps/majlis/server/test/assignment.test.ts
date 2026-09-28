import { describe, it, expect } from 'vitest';
import {
  heldBy,
  howOf,
  mayAssign,
  withAssignments,
  type Assignment,
} from '../src/services/assignment.js';
import { buildQueue, type QueueKind } from '../src/services/queue.js';
import { buildPassage } from '../src/services/passage.js';
import { buildIncidentPassage } from '../src/services/passage-incident.js';
import { buildQuestionPassage } from '../src/services/passage-question.js';
import { buildReviewPassage } from '../src/services/passage-review.js';
import { buildUndertakingPassage } from '../src/services/passage-undertaking.js';
import type { Passage, PassageKind, Step } from '../src/services/passage-shape.js';
import { boards, incidents, matters, rules } from '../src/data/seed.js';
import { submissions, undertakings } from '../src/data/seed-work.js';
import { structures } from '../src/data/structures.js';

/**
 * Who is doing a thing, as opposed to whose kind of thing it is.
 *
 * The faults these are written against were each found by reading the code
 * after `tsc` passed, not by any test:
 *
 *   - the queue carried the holder's name for questions and undertakings only,
 *     so a member who took a matter, a breach or a review found it missing
 *     from *what needs you* — the one screen assignment exists for;
 *   - whoever held the whole of a thing was written onto every step of it,
 *     the institution's included, so a member who took a matter on was
 *     listed as holding up the bank's filing;
 *   - a name went onto finished steps too, where it reads as *this person did
 *     it* — which an assignment does not say.
 */

const NOW = '2026-09-20T00:00:00Z';
const BOARD = boards[0];

let n = 0;
function placed(over: Partial<Assignment> & Pick<Assignment, 'ofKind' | 'ofId'>): Assignment {
  n += 1;
  return {
    id: 'asg-' + n,
    boardId: BOARD.id,
    stepKey: null,
    to: 'member-a',
    by: 'member-a',
    at: `2026-09-${String(10 + (n % 10)).padStart(2, '0')}T00:00:00Z`,
    ...over,
  };
}

const steps = (p: Passage) => p.groups.flatMap((g) => g.steps);
const boardStep = (key: string): Pick<Step, 'key' | 'whose'> => ({ key, whose: 'board' });

describe('what stands for a step', () => {
  it('is the last entry written about it', () => {
    const record = [
      placed({ ofKind: 'matter', ofId: 'm', stepKey: 's', to: 'member-a' }),
      placed({ ofKind: 'matter', ofId: 'm', stepKey: 's', to: 'member-b', by: 'member-a' }),
    ];
    expect(heldBy(record, 'matter', 'm', boardStep('s'))?.to).toBe('member-b');
  });

  it('is nobody once it is put back, even where somebody holds the whole thing', () => {
    const record = [
      placed({ ofKind: 'matter', ofId: 'm', stepKey: null, to: 'member-a' }),
      placed({ ofKind: 'matter', ofId: 'm', stepKey: 's', to: 'member-b' }),
      placed({ ofKind: 'matter', ofId: 'm', stepKey: 's', to: null, by: 'member-b' }),
    ];
    expect(heldBy(record, 'matter', 'm', boardStep('s'))).toBeNull();
    expect(heldBy(record, 'matter', 'm', boardStep('other'))?.to).toBe('member-a');
  });

  it('falls back to the holder of the whole only on this side of the table', () => {
    const record = [placed({ ofKind: 'matter', ofId: 'm', to: 'member-a' })];
    expect(heldBy(record, 'matter', 'm', { key: 's', whose: 'board' })?.to).toBe('member-a');
    expect(heldBy(record, 'matter', 'm', { key: 's', whose: 'signatory' })?.to).toBe('member-a');
    for (const whose of ['institution', 'liaison', 'clock', 'software'] as const) {
      expect(heldBy(record, 'matter', 'm', { key: 's', whose }), whose).toBeNull();
    }
  });

  it('never reaches across to another thing of the same id or kind', () => {
    const record = [placed({ ofKind: 'breach', ofId: 'm', to: 'member-a' })];
    expect(heldBy(record, 'matter', 'm', boardStep('s'))).toBeNull();
  });
});

describe('how an assignment happened, read back off the record', () => {
  const a = (to: string | null, by: string) => placed({ ofKind: 'matter', ofId: 'm', to, by });

  it('names each of the four acts', () => {
    expect(howOf(a('member-a', 'member-a'), null)).toBe('taken');
    expect(howOf(a('member-b', 'member-a'), null)).toBe('given');
    expect(howOf(a('member-b', 'member-a'), a('member-a', 'member-a'))).toBe('handed_on');
    expect(howOf(a(null, 'member-a'), a('member-a', 'member-a'))).toBe('released');
  });
});

describe('who may write one', () => {
  const base = { by: 'member-b', office: null, onTheBoard: true, to: 'member-b' as string | null };

  it('lets anybody take what nobody holds', () => {
    expect(mayAssign({ ...base, heldBy: null })).toBeNull();
  });
  it('does not let one member take work out of a colleague’s hands', () => {
    expect(mayAssign({ ...base, heldBy: 'member-c' })).toBe('held_by_somebody_else');
  });
  it('lets the holder hand on, or put back', () => {
    expect(mayAssign({ ...base, heldBy: 'member-b', to: 'member-c' })).toBeNull();
    expect(mayAssign({ ...base, heldBy: 'member-b', to: null })).toBeNull();
  });
  it('lets the chair and the secretary move anything', () => {
    expect(mayAssign({ ...base, office: 'chair', heldBy: 'member-c' })).toBeNull();
    expect(mayAssign({ ...base, office: 'secretary', heldBy: 'member-c' })).toBeNull();
  });
  it('refuses somebody who is not on the board, chair or not', () => {
    expect(mayAssign({ ...base, onTheBoard: false, office: 'chair', heldBy: null })).toBe(
      'not_a_member',
    );
  });
});

/*
 * Every passage the seed can produce, of every kind, so the rules below are
 * checked against steps that really exist rather than against ones written
 * for the test.
 */
function every(): { kind: PassageKind; id: string; read: () => Passage }[] {
  return [
    ...matters
      .filter((m) => m.boardId === BOARD.id)
      .map((m) => ({
        kind: 'matter' as const,
        id: m.id,
        read: () =>
          buildPassage(
            BOARD,
            m,
            m.structureId ? (structures.find((s) => s.id === m.structureId) ?? null) : null,
            NOW,
          ),
      })),
    ...incidents.map((i) => ({ kind: 'breach' as const, id: i.id, read: () => buildIncidentPassage(i, NOW) })),
    ...submissions.map((s) => ({ kind: 'question' as const, id: s.id, read: () => buildQuestionPassage(s, NOW) })),
    ...undertakings.map((u) => ({ kind: 'undertaking' as const, id: u.id, read: () => buildUndertakingPassage(u, NOW) })),
    ...rules.map((r) => ({ kind: 'review' as const, id: r.id, read: () => buildReviewPassage(r, NOW) })),
  ];
}

describe('a name on a passage', () => {
  const all = every();

  it('has passages of all five kinds to read, or this proves nothing', () => {
    expect(new Set(all.map((x) => x.kind)).size).toBe(5);
  });

  for (const { kind, id, read } of all) {
    it(`goes only where somebody on the board could be doing it — ${kind} ${id}`, () => {
      const bare = read();
      const named = withAssignments(bare, [placed({ ofKind: kind, ofId: id, to: 'member-z' })]);

      bare.groups.forEach((g, gi) =>
        g.steps.forEach((s, si) => {
          const after = named.groups[gi].steps[si];
          if (s.whoName) {
            // A name the reading already carried stays: nobody moves who gave a promise.
            expect(after.whoName, s.key).toBe(s.whoName);
          } else if (
            (s.whose === 'board' || s.whose === 'signatory') &&
            (s.state === 'open' || s.state === 'ahead')
          ) {
            expect(after.whoName, s.key).toBe('member-z');
          } else {
            expect(after.whoName, `${s.key} (${s.whose}, ${s.state})`).toBeUndefined();
          }
        }),
      );
    });
  }

  it('lets a step’s own holder beat the holder of the whole', () => {
    const found = all
      .map(({ kind, id, read }) => ({ kind, id, p: read() }))
      .flatMap(({ kind, id, p }) => steps(p).map((s) => ({ kind, id, s })))
      .find(({ s }) => s.whose === 'signatory' && (s.state === 'open' || s.state === 'ahead'));
    expect(found, 'no open signatory step anywhere in the seed').toBeTruthy();
    // (A signatory's step, because that is where handing one piece on matters.)
    const { kind, id, s } = found!;

    const read = all.find((x) => x.kind === kind && x.id === id)!.read;
    const named = withAssignments(read(), [
      placed({ ofKind: kind, ofId: id, to: 'member-z' }),
      placed({ ofKind: kind, ofId: id, stepKey: s.key, to: 'member-y' }),
    ]);
    expect(steps(named).find((x) => x.key === s.key)?.whoName).toBe('member-y');
  });
});

describe('the queue names whoever the passage names', () => {
  /*
   * The same comparison `queue.test.ts` makes for the act and the owner, made
   * for the person — on every kind, because the fault this is written against
   * was three kinds of five dropping the name.
   */
  const everyone = every();
  const assignments = everyone.map(({ kind, id }) => placed({ ofKind: kind, ofId: id, to: 'member-z' }));

  const rows = buildQueue({
    board: BOARD,
    submissions,
    matters: matters.filter((m) => m.boardId === BOARD.id),
    rules,
    incidents,
    undertakings,
    structures,
    assignments,
    now: NOW,
  });

  const toPassageKind: Record<QueueKind, PassageKind> = {
    question: 'question',
    matter: 'matter',
    review: 'review',
    breach: 'breach',
    undertaking: 'undertaking',
  };

  it('has a row of every kind whose next step is on the board’s side, or this proves nothing', () => {
    const kinds = new Set(
      rows.filter((r) => r.whose === 'board' || r.whose === 'signatory').map((r) => r.kind),
    );
    expect([...kinds].sort()).toEqual(['breach', 'matter', 'question', 'review', 'undertaking']);
  });

  for (const kind of ['question', 'matter', 'review', 'breach', 'undertaking'] as const) {
    it(`on a ${kind}`, () => {
      const mine = rows.filter((r) => r.kind === kind);
      expect(mine.length).toBeGreaterThan(0);
      for (const r of mine) {
        const source = everyone.find((x) => x.kind === toPassageKind[kind] && x.id === r.id)!;
        const passage = withAssignments(source.read(), assignments);
        expect(r.whoName, `${kind} ${r.id}`).toBe(passage.next?.whoName);
      }
      // And the name is really there somewhere, rather than absent on both sides.
      expect(mine.some((r) => r.whoName), `no ${kind} row names anybody`).toBe(true);
    });
  }
});
