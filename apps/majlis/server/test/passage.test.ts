import { describe, it, expect } from 'vitest';
import { buildPassage } from '../src/services/passage.js';
import type { Board, Matter, Structure } from '../src/types.js';

/**
 * The passage a matter makes, and the judgement it refuses to make.
 *
 * The spine has to be *true* or it is worse than nothing: a scholar who trusts
 * it and is told a matter is further along than it is has been misled by the
 * interface rather than by the record. So most of what is held here is that a
 * step is done when the thing is in the record and not otherwise — and that
 * nothing anywhere says the question is well enough put to decide.
 */

const board: Board = {
  id: 'b1',
  institutionId: 'inst-1',
  name: 'A board',
  quorumPermit: 3,
  quorumRestrict: 2,
  totalSignatories: 5,
  ratificationWindowHours: 720,
  // `signatory` is the flag the tally actually reads. An advisory member's
  // written position stays in the record and out of the arithmetic.
  members: [
    { id: 'm-a', name: 'A', signatory: true, title: 'Member', office: null },
    { id: 'm-b', name: 'B', signatory: true, title: 'Member', office: null },
    { id: 'm-c', name: 'C', signatory: true, title: 'Member', office: null },
  ],
} as unknown as Board;

const NOW = '2026-09-05T00:00:00.000Z';

function matter(over: Partial<Matter> = {}): Matter {
  return {
    id: 'm1',
    boardId: 'b1',
    title: 'A question',
    origin: 'institution_request',
    direction: 'permit',
    status: 'deliberation',
    openedAt: '2026-08-01T00:00:00.000Z',
    proposal: 'The desk asks whether this may be done.',
    notDecided: [],
    mechanism: '',
    interactsWith: [],
    proposedRule: { id: 'r1', boardId: 'b1', title: 'r', statement: '', parameters: [] },
    simulation: null,
    deliberation: [],
    reasoning: [],
    timelockStartedAt: null,
    timelockEndsAt: null,
    objections: [],
    inForceAt: null,
    sources: [],
    ...over,
  } as unknown as Matter;
}

const structure = (n: number): Structure =>
  ({
    id: 's1',
    conditions: Array.from({ length: n }, (_, i) => ({ id: `c${i}`, requirement: 'x' })),
  }) as unknown as Structure;

const step = (p: ReturnType<typeof buildPassage>, key: string) =>
  [...p.shaping, ...p.deciding].find((s) => s.key === key)!;

describe('a step is done when the thing is in the record', () => {
  it('reads the mechanism as undone while it is empty, and done once written', () => {
    expect(step(buildPassage(board, matter(), null, NOW), 'mechanism').state).toBe('open');
    expect(
      step(buildPassage(board, matter({ mechanism: 'Units transfer at a price.' }), null, NOW), 'mechanism')
        .state,
    ).toBe('done');
  });

  it('does not count a withdrawn source as something cited', () => {
    const withdrawn = matter({
      sources: [{ id: 's', kind: 'standard', label: 'SS 17', withdrawnAt: '2026-08-09' }],
    } as unknown as Partial<Matter>);

    // A citation the board took back is not a basis the ruling rests on.
    expect(step(buildPassage(board, withdrawn, null, NOW), 'rests_on').state).toBe('open');
  });

  it('counts conditions rather than findings, so a correction does not advance it', () => {
    const twice = matter({
      structureId: 's1',
      findings: [
        { conditionId: 'c0', holds: 'met', reason: 'r', scholarId: 'm-a', at: '1', supersededAt: '2' },
        { conditionId: 'c0', holds: 'not_met', reason: 'r', scholarId: 'm-a', at: '2' },
      ],
    } as unknown as Partial<Matter>);

    /*
     * Two findings, one condition, and the first is superseded. Counting rows
     * would report this board as having answered two of three for having
     * changed its mind about one.
     */
    expect(step(buildPassage(board, twice, structure(3), NOW), 'conditions').standing).toContain(
      '2 of 3 conditions are unanswered',
    );
  });

  it('calls the conditions not applicable where no shape has been chosen', () => {
    const s = step(buildPassage(board, matter(), null, NOW), 'conditions');
    expect(s.state).toBe('not_applicable');
    expect(s.standing).toContain('Nothing to answer until one is chosen');
  });
});

describe('it never says the question is ready to be decided', () => {
  it('has no field that would say so', () => {
    const p = buildPassage(board, matter({ mechanism: 'x', notDecided: ['y'] }), null, NOW);
    const keys = Object.keys(p);

    for (const forbidden of ['ready', 'complete', 'percent', 'progress', 'score']) {
      expect(keys.some((k) => k.toLowerCase().includes(forbidden))).toBe(false);
    }
  });

  it('says what is missing in words rather than as a count out of twelve', () => {
    const p = buildPassage(board, matter(), structure(6), NOW);
    const conditions = step(p, 'conditions');

    // And it says a board may rule against a condition, because that is an
    // answer too and a checklist that did not say so would be a gate.
    expect(conditions.standing).toContain('wrongly drawn');
  });

  it('marks only deliberation as enforced, because it is the only thing refused', () => {
    const p = buildPassage(board, matter(), null, NOW);
    const enforced = [...p.shaping, ...p.deciding].filter((s) => s.enforced).map((s) => s.key);

    // Everything else is the board's to skip. Presenting a convention as a
    // locked gate would turn guidance into administration.
    expect(enforced).toEqual(['deliberation']);
  });
});

describe('the one next act', () => {
  it('names the vote rather than the paperwork where both are outstanding', () => {
    const midVote = matter({
      status: 'voting',
      deliberation: [{ id: 'd', scholarId: 'm-a', body: 'x', at: '2026-08-02', replyTo: null, liaisonAnswer: false }],
    } as unknown as Partial<Matter>);

    /*
     * The mechanism is still unwritten on this matter, and the vote is what is
     * in front of the board. Sending a member back to paperwork while a
     * colleague waits on their position would be the wrong sentence.
     */
    const p = buildPassage(board, midVote, null, NOW);
    expect(p.next?.key).toBe('positions');
  });

  it('falls back to the shaping work where nothing is outstanding in the deciding', () => {
    const p = buildPassage(board, matter({ status: 'draft' }), null, NOW);
    // Deliberation is 'ahead' in draft, so the next act is the first gap in
    // putting the question in shape.
    expect(p.next?.key).toBe('mechanism');
  });

  it('names whose act it is, on every step', () => {
    const p = buildPassage(board, matter(), null, NOW);
    for (const s of [...p.shaping, ...p.deciding]) {
      expect(['board', 'signatory', 'liaison', 'institution', 'software', 'clock']).toContain(s.whose);
    }
  });

  it('has no next act once the matter is settled', () => {
    const p = buildPassage(board, matter({ status: 'in_force', inForceAt: '2026-08-20' }), null, NOW);
    expect(p.next).toBeNull();
    expect(p.settled).toContain('in force');
  });
});

describe('waiting is a fact about the past', () => {
  it('counts from when the question arrived, not from when it was opened here', () => {
    const p = buildPassage(
      board,
      matter({ arrivedAt: '2026-07-01T00:00:00.000Z' } as unknown as Partial<Matter>),
      null,
      NOW,
    );

    expect(p.waiting?.days).toBe(66);
    expect(p.waiting?.note).toContain('since the institution asked');
  });

  it('says the institution may have asked earlier where nothing records when', () => {
    const p = buildPassage(board, matter(), null, NOW);

    // Honest about its own blind spot rather than presenting the opened date
    // as the moment the business started waiting.
    expect(p.waiting?.note).toContain('may have asked earlier');
  });

  it('waits on the clock rather than on a person during the delay', () => {
    const p = buildPassage(
      board,
      matter({ status: 'timelock', timelockEndsAt: '2026-09-07T00:00:00.000Z' }),
      null,
      NOW,
    );

    // Nobody is holding this up, and saying a member is would be a reproach
    // the record does not support.
    // 'clock', not 'software': time passing is not the same act as the record
    // producing a document, and one of them can be hurried while the other
    // cannot.
    expect(p.waiting?.on).toBe('clock');
  });

  it('stops counting once the matter is settled', () => {
    const p = buildPassage(board, matter({ status: 'rejected' }), null, NOW);
    expect(p.waiting).toBeNull();
    expect(p.settled).toContain('refused');
  });
});

describe('the asymmetry between permitting and restricting', () => {
  it('shows the delay as not applicable on a restriction', () => {
    const p = buildPassage(board, matter({ direction: 'restrict' }), null, NOW);
    const delay = step(p, 'timelock');

    expect(delay.state).toBe('not_applicable');
    expect(delay.standing).toContain('Waiting is the greater risk');
  });

  it('counts the threshold for the direction the matter actually is', () => {
    const voting = matter({
      direction: 'restrict',
      status: 'voting',
      deliberation: [{ id: 'd', scholarId: 'm-a', body: 'x', at: '1', replyTo: null, liaisonAnswer: false }],
      reasoning: [{ scholarId: 'm-a', position: 'for', reason: 'r', at: '1' }],
    } as unknown as Partial<Matter>);

    // Restricting takes the reduced quorum: two, not three.
    expect(step(buildPassage(board, voting, null, NOW), 'close').standing).toContain('threshold of 2');
  });
});

describe('the vote does not close itself', () => {
  it('says so even where the threshold is met', () => {
    const met = matter({
      status: 'voting',
      deliberation: [{ id: 'd', scholarId: 'm-a', body: 'x', at: '1', replyTo: null, liaisonAnswer: false }],
      reasoning: [
        { scholarId: 'm-a', position: 'for', reason: 'r', at: '1' },
        { scholarId: 'm-b', position: 'for', reason: 'r', at: '1' },
        { scholarId: 'm-c', position: 'for', reason: 'r', at: '1' },
      ],
    } as unknown as Partial<Matter>);

    const close = step(buildPassage(board, met, null, NOW), 'close');
    expect(close.standing).toContain('Closing is still an act somebody takes');
    expect(close.state).toBe('open');
  });

  it('names who is still waited on while the vote is open', () => {
    const partial = matter({
      status: 'voting',
      deliberation: [{ id: 'd', scholarId: 'm-a', body: 'x', at: '1', replyTo: null, liaisonAnswer: false }],
      reasoning: [{ scholarId: 'm-a', position: 'for', reason: 'r', at: '1' }],
    } as unknown as Partial<Matter>);

    expect(step(buildPassage(board, partial, null, NOW), 'positions').standing).toContain('Waiting on');
  });
});

describe('the document is not offered before there is one', () => {
  it('is ahead while the matter is open, and says why', () => {
    const s = step(buildPassage(board, matter(), null, NOW), 'fatwa');

    expect(s.state).toBe('ahead');
    expect(s.standing).toContain('will be acted on');
  });

  it('is done once the ruling is in force', () => {
    const s = step(
      buildPassage(board, matter({ status: 'in_force', inForceAt: '2026-08-20' }), null, NOW),
      'fatwa',
    );

    expect(s.state).toBe('done');
    expect(s.why).toContain('stops waiting');
  });
});

describe('a settled matter has no outstanding acts', () => {
  const decided = () =>
    matter({
      status: 'in_force',
      inForceAt: '2026-08-20',
      // Voted through with nothing on the record behind it. Seeded data does
      // this, and so, occasionally, do boards.
      deliberation: [],
      reasoning: [{ scholarId: 'm-a', position: 'for', reason: 'r', at: '1' }],
    } as unknown as Partial<Matter>);

  it('does not show a decided ruling as still needing deliberation', () => {
    const s = step(buildPassage(board, decided(), null, NOW), 'deliberation');

    // It read as a job for whoever was looking. Nobody is going to deliberate
    // on a question that was decided in March.
    expect(s.state).not.toBe('open');
    expect(s.enforced).toBe(false);
  });

  it('says it did not happen rather than hiding that it did not', () => {
    const s = step(buildPassage(board, decided(), null, NOW), 'deliberation');

    /*
     * The fact underneath is worth having: this board brought a permission
     * into force with nothing on the record behind it. Tidying that away would
     * be improving the record.
     */
    expect(s.state).toBe('skipped');
    expect(s.standing).toContain('decided without it');
  });

  it('marks nothing as enforced once the matter is settled', () => {
    const p = buildPassage(board, decided(), null, NOW);
    expect([...p.shaping, ...p.deciding].some((s) => s.enforced)).toBe(false);
  });

  it('leaves what was actually done reading as done', () => {
    const p = buildPassage(board, decided(), null, NOW);
    expect(step(p, 'fatwa').state).toBe('done');
    expect(step(p, 'asked').state).toBe('done');
  });
});
