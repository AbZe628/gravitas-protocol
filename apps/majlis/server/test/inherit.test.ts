import { describe, it, expect } from 'vitest';
import { buildInheritance, checklistStanding } from '../src/services/inherit.js';
import type { Matter, Structure } from '../src/types.js';

/**
 * What this board already decided about a question of this shape.
 *
 * The line every test here defends: **a proposal is not a finding.** Nothing
 * this file returns has been decided, everything names where it came from, and
 * accepting one is an act a scholar takes under their own name. A draft that
 * looked authored would make Majlis a machine for producing rulings nobody
 * read, which is worse than the call it replaces.
 */

function matter(over: Partial<Matter> = {}): Matter {
  return {
    id: 'new',
    boardId: 'b1',
    title: 'The fourth murabaha',
    status: 'deliberation',
    mechanism: '',
    notDecided: [],
    findings: [],
    inForceAt: null,
    proposedRule: { id: 'r', boardId: 'b1', title: 't', statement: '', parameters: [] },
    ...over,
  } as unknown as Matter;
}

const structure = (ids: string[]): Structure =>
  ({ id: 'murabaha', conditions: ids.map((id) => ({ id, requirement: 'x' })) }) as unknown as Structure;

/** A decided matter on the same shape, with answers and terms. */
function prior(over: Partial<Matter> = {}): Matter {
  return matter({
    id: 'march',
    title: 'Commodity murabaha for retail deposits',
    status: 'in_force',
    structureId: 'murabaha',
    inForceAt: '2026-03-15T00:00:00.000Z',
    mechanism: 'The bank buys the commodity, then sells it on deferred terms.',
    notDecided: ['This does not approve tawarruq on the same desk.'],
    findings: [
      { conditionId: 'c1', holds: 'met', reason: 'The bank took possession before selling.', scholarId: 'm-a', at: '1' },
      { conditionId: 'c2', holds: 'not_met', reason: 'The mark-up was expressed as a rate.', scholarId: 'm-a', at: '1' },
    ],
    proposedRule: {
      id: 'r-march',
      boardId: 'b1',
      title: 't',
      statement: '',
      parameters: [{ key: 'maxMarkupBps', value: '400', unit: 'basis points', meaning: 'The ceiling.' }],
    },
    ...over,
  } as unknown as Matter);
}

const draft = () => matter({ structureId: 'murabaha' });

describe('it draws from this board’s own last ruling', () => {
  it('finds the precedent and says which one and why', () => {
    const inh = buildInheritance(draft(), [prior()], structure(['c1', 'c2']));

    expect(inh.from?.id).toBe('march');
    expect(inh.from?.decidedAt).toBe('2026-03-15T00:00:00.000Z');
    // Named, never a resemblance. A coincidence offered as a precedent invites
    // inheriting an answer to a different question.
    expect(inh.because).toContain('same contract shape');
  });

  it('counts the one being drafted, because that is what a scholar wants to hear', () => {
    const inh = buildInheritance(draft(), [prior(), prior({ id: 'jan', inForceAt: '2026-01-04T00:00:00.000Z' })], structure(['c1']));

    // "the third this board has ruled on", not "two precedents found".
    expect(inh.timesRuled).toBe(3);
  });

  it('takes the most recent by when it took effect, not by when it was opened', () => {
    const later = prior({ id: 'september', inForceAt: '2026-09-01T00:00:00.000Z' });
    const inh = buildInheritance(draft(), [prior(), later], structure(['c1']));

    // A question raised in January and decided in September is the board's more
    // recent word than one raised in March and decided in April.
    expect(inh.from?.id).toBe('september');
  });

  it('ignores a matter that was never brought into force', () => {
    const refused = prior({ id: 'refused', status: 'rejected' });
    const inh = buildInheritance(draft(), [refused], structure(['c1']));

    expect(inh.from).toBeNull();
  });

  it('ignores another board’s ruling', () => {
    const elsewhere = prior({ id: 'other-board', boardId: 'b2' });
    const inh = buildInheritance(draft(), [elsewhere], structure(['c1']));

    // Never from another institution. This board's own words are the only
    // source that can be pre-filled without putting words in anybody's mouth.
    expect(inh.from).toBeNull();
  });

  it('ignores a matter judged against a different shape', () => {
    const ijara = prior({ id: 'ijara', structureId: 'ijara' });
    expect(buildInheritance(draft(), [ijara], structure(['c1'])).from).toBeNull();
  });
});

describe('what it proposes', () => {
  const inh = () => buildInheritance(draft(), [prior()], structure(['c1', 'c2']));

  it('carries each condition’s finding in the board’s own words', () => {
    const conditions = inh().proposals.filter((p) => p.kind === 'condition');

    expect(conditions).toHaveLength(2);
    expect(conditions[0]).toMatchObject({
      key: 'c1',
      holds: 'met',
      value: 'The bank took possession before selling.',
    });
    // Including the one the board found against. A ruling that only inherited
    // its agreements would be a different ruling.
    expect(conditions[1].holds).toBe('not_met');
  });

  it('carries the operative terms with their units', () => {
    const term = inh().proposals.find((p) => p.kind === 'term');
    expect(term).toMatchObject({ key: 'maxMarkupBps', value: '400', unit: 'basis points' });
  });

  it('carries what was held outside the question', () => {
    const outside = inh().proposals.find((p) => p.kind === 'not_decided');
    // The most commonly forgotten part of a ruling.
    expect(outside?.value).toContain('does not approve tawarruq');
  });

  it('offers the mechanism only where this matter has none', () => {
    expect(inh().proposals.some((p) => p.kind === 'mechanism')).toBe(true);

    const written = buildInheritance(
      matter({ structureId: 'murabaha', mechanism: 'This one works differently.' }),
      [prior()],
      structure(['c1']),
    );

    // Offering to replace a mechanism a liaison has written would invite
    // overwriting the description of this arrangement with another one's.
    expect(written.proposals.some((p) => p.kind === 'mechanism')).toBe(false);
  });

  it('drops a finding for a condition this shape no longer has', () => {
    const inh = buildInheritance(draft(), [prior()], structure(['c1']));
    const conditions = inh.proposals.filter((p) => p.kind === 'condition');

    // And a condition the shape gained since must be answered rather than
    // quietly treated as covered.
    expect(conditions.map((c) => c.key)).toEqual(['c1']);
  });

  it('does not carry a superseded finding forward', () => {
    const corrected = prior({
      findings: [
        { conditionId: 'c1', holds: 'met', reason: 'First thought.', scholarId: 'm-a', at: '1', supersededAt: '2' },
        { conditionId: 'c1', holds: 'not_met', reason: 'On reflection.', scholarId: 'm-a', at: '2' },
      ],
    } as unknown as Partial<Matter>);

    const conditions = buildInheritance(draft(), [corrected], structure(['c1'])).proposals.filter(
      (p) => p.kind === 'condition',
    );

    expect(conditions).toHaveLength(1);
    expect(conditions[0].value).toBe('On reflection.');
  });
});

describe('a proposal is not a finding', () => {
  it('writes nothing into the matter', () => {
    const m = draft();
    buildInheritance(m, [prior()], structure(['c1', 'c2']));

    // The scholar who accepts one is authoring their own finding, under their
    // own name, today. Accepting is an act, exactly as voting is.
    expect(m.findings).toEqual([]);
    expect(m.notDecided).toEqual([]);
    expect(m.proposedRule.parameters).toEqual([]);
  });

  it('says plainly that nothing below has been decided', () => {
    const inh = buildInheritance(draft(), [prior()], structure(['c1']));

    expect(inh.note).toContain('Nothing below has been decided');
    expect(inh.note).toContain('an unreviewed proposal is not an answer');
  });

  it('counts proposals separately from answers, and says which is which', () => {
    const standing = checklistStanding(structure(['c1', 'c2', 'c3']), draft(), buildInheritance(draft(), [prior()], structure(['c1', 'c2', 'c3'])));

    /*
     * "0 of 6 answered" is true and useless where six answers are sitting in
     * front of the scholar unread. This is a true statement about a different
     * thing, and it is the one that says what the work is.
     */
    expect(standing).toContain('0 of 3 answered');
    expect(standing).toContain('2 more proposed');
    expect(standing).toContain('not an answer until somebody says so');
  });

  it('falls back to the plain count where there is nothing to inherit', () => {
    const alone = buildInheritance(draft(), [], structure(['c1', 'c2']));
    expect(checklistStanding(structure(['c1', 'c2']), draft(), alone)).toBe(
      '2 of 2 conditions are unanswered.',
    );
  });
});

describe('a first of its kind costs full price, and says so', () => {
  it('proposes nothing and explains why that is right', () => {
    const inh = buildInheritance(draft(), [], structure(['c1']));

    expect(inh.proposals).toEqual([]);
    expect(inh.note).toContain('costs the whole apparatus');
    // A system that made a novel structure feel cheap would be lying about
    // what was being decided.
    expect(inh.note).toContain('that is right');
  });

  it('proposes nothing where no shape has been chosen', () => {
    const inh = buildInheritance(matter(), [prior()], null);
    expect(inh.from).toBeNull();
    expect(inh.proposals).toEqual([]);
  });
});
