/**
 * The board's own series of ruling references.
 *
 * What is protected here is a number that has left the building. Once a bank
 * has filed SSB/2026/014, that string belongs to that document forever, and
 * the failures that matter are all failures of stability: a reference that
 * moves, a reference that repeats, a reference that appears on a matter which
 * never became a ruling.
 */

import { describe, it, expect } from 'vitest';
import type { Board, Matter, Rule } from '../src/types.js';
import { usable, nextReference, giveItAReference } from '../src/services/numbering.js';
import {
  bringIntoForce,
  closeVoting,
  openVoting,
  recordVote,
} from '../src/services/lifecycle.js';
import { boards, mattersAsSigned } from '../src/data/seed.js';

const T0 = '2026-08-24T09:00:00.000Z';

const rule: Rule = {
  id: 'r', boardId: 'b', title: '', statement: '', parameters: [],
  parameterHash: '0x00', version: 1, inForceFrom: null,
  supersededBy: null, supersedes: null, sources: [],
};

function matter(over: Partial<Matter> = {}): Matter {
  return {
    id: 'm', boardId: 'b', title: 'A matter', origin: 'protocol_change',
    direction: 'permit', status: 'draft', openedAt: T0,
    proposal: '', notDecided: [], mechanism: '', interactsWith: [],
    proposedRule: rule, simulation: null,
    deliberation: [], reasoning: [],
    timelockStartedAt: null, timelockEndsAt: null, objections: [],
    inForceAt: null, sources: [], settledAt: null,
    ...over,
  } as Matter;
}

const board: Board = {
  id: 'b', institutionId: 'i', name: 'Board',
  quorumPermit: 3, quorumRestrict: 2, totalSignatories: 4,
  ratificationWindowHours: 168,
  members: [
    { id: 's1', name: 'One', title: '', board: 'b', signatory: true },
    { id: 's2', name: 'Two', title: '', board: 'b', signatory: true },
    { id: 's3', name: 'Three', title: '', board: 'b', signatory: true },
    { id: 's4', name: 'Four', title: '', board: 'b', signatory: true },
  ],
  rulingSeries: 'SSB/{year}/{n}',
};

describe('a pattern that can produce a reference', () => {
  it('needs somewhere to put the number', () => {
    expect(usable('SSB/{year}/{n}')).toBe(true);
    expect(usable('{n}')).toBe(true);
    expect(usable('SSB/{year}')).toBe(false);
    expect(usable('')).toBe(false);
    expect(usable(undefined)).toBe(false);
  });

  it('carries no state between two calls on the same pattern', () => {
    // A global regex keeps its lastIndex. Asked twice about the same string it
    // answers yes and then no, and the board's second ruling of the day would
    // quietly lose its number.
    expect(usable('SSB/{year}/{n}')).toBe(true);
    expect(usable('SSB/{year}/{n}')).toBe(true);
  });
});

describe('the next reference', () => {
  it('starts at one where the board has issued nothing', () => {
    expect(nextReference('SSB/{year}/{n}', [], T0)).toBe('SSB/2026/1');
  });

  it('counts on from the highest already issued', () => {
    const issued = [
      matter({ id: 'a', reference: 'SSB/2026/1' }),
      matter({ id: 'b', reference: 'SSB/2026/7' }),
      matter({ id: 'c', reference: 'SSB/2026/3' }),
    ];
    expect(nextReference('SSB/{year}/{n}', issued, T0)).toBe('SSB/2026/8');
  });

  it('begins again in a new year', () => {
    const issued = [matter({ id: 'a', reference: 'SSB/2026/9' })];
    expect(nextReference('SSB/{year}/{n}', issued, '2027-01-04T09:00:00.000Z')).toBe('SSB/2027/1');
  });

  it('ignores matters carrying no reference at all', () => {
    const issued = [matter({ id: 'a' }), matter({ id: 'b', reference: 'SSB/2026/4' })];
    expect(nextReference('SSB/{year}/{n}', issued, T0)).toBe('SSB/2026/5');
  });

  it('ignores a reference from a series the board no longer uses', () => {
    // The pattern changed. The old numbers are not in this series, and counting
    // them would jump the new one forward for no reason a reader could see.
    const issued = [matter({ id: 'a', reference: 'OLD-2026-31' })];
    expect(nextReference('SSB/{year}/{n}', issued, T0)).toBe('SSB/2026/1');
  });

  it('treats everything that is not a placeholder as the board own text', () => {
    expect(nextReference('{year}-{n}', [], T0)).toBe('2026-1');
    expect(nextReference('Fatwa no. {n} ({year})', [], T0)).toBe('Fatwa no. 1 (2026)');
  });

  it('does not let a dot in the pattern match any character', () => {
    // A dot is a regex wildcard. Escaped wrongly, SSBx2026x4 would be read as
    // belonging to the series and the board's first ruling would be numbered 5.
    const issued = [matter({ id: 'a', reference: 'SSBx2026x4' })];
    expect(nextReference('SSB.{year}.{n}', issued, T0)).toBe('SSB.2026.1');
  });

  it('leaves the hole where a ruling was withdrawn', () => {
    // Renumbering to close the gap would put two documents on one reference.
    const issued = [
      matter({ id: 'a', reference: 'SSB/2026/1' }),
      matter({ id: 'b', reference: 'SSB/2026/2', status: 'withdrawn' }),
    ];
    expect(nextReference('SSB/{year}/{n}', issued, T0)).toBe('SSB/2026/3');
  });
});

describe('giving a matter its reference', () => {
  it('gives one where the board keeps a series', () => {
    expect(giveItAReference(matter(), 'SSB/{year}/{n}', [], T0).reference).toBe('SSB/2026/1');
  });

  it('never moves one already taken', () => {
    const already = matter({ reference: 'SSB/2025/12' });
    expect(giveItAReference(already, 'SSB/{year}/{n}', [], T0).reference).toBe('SSB/2025/12');
  });

  it('leaves a matter alone where the board keeps no series', () => {
    expect(giveItAReference(matter(), undefined, [], T0).reference).toBeUndefined();
    expect(giveItAReference(matter(), 'SSB/{year}', [], T0).reference).toBeUndefined();
  });
});

// ── the two ways a matter reaches force ───────────────────────────────────

const said = {
  id: 'd', scholarId: 's1', body: 'A point about the mechanism.', at: T0,
  replyTo: null, liaisonAnswer: false,
};
const REASON = 'The mechanism is bounded by the minimums the board already set, which answers it.';

function votedOn(m: Matter, ids: string[], position: 'for' | 'against'): Matter {
  return ids.reduce(
    (acc, id) => recordVote(board, acc, { scholarId: id, position, reason: REASON }, T0),
    m,
  );
}

function carried(direction: 'permit' | 'restrict'): Matter {
  const open = openVoting(matter({ status: 'deliberation', direction, deliberation: [said] }), board);
  return votedOn(open, ['s1', 's2', 's3'], 'for');
}

describe('a reference is taken when the ruling comes into force', () => {
  it('on a restriction, which takes effect the moment the vote closes', () => {
    const closed = closeVoting(board, carried('restrict'), T0, []);
    expect(closed.outcome).toBe('in_force');
    expect(closed.matter.reference).toBe('SSB/2026/1');
  });

  it('on a permit, when the timelock has run', () => {
    const closed = closeVoting(board, carried('permit'), T0, []);
    expect(closed.outcome).toBe('timelock_started');
    // Nothing yet: it is not a ruling until the timelock ends.
    expect(closed.matter.reference).toBeUndefined();

    const later = new Date(new Date(closed.matter.timelockEndsAt!).getTime() + 1000).toISOString();
    expect(bringIntoForce(closed.matter, later, board, []).reference).toBe('SSB/2026/1');
  });

  it('is not taken by a matter the board refused', () => {
    const open = openVoting(matter({ status: 'deliberation', deliberation: [said] }), board);
    const closed = closeVoting(board, votedOn(open, ['s1', 's2', 's3', 's4'], 'against'), T0, []);
    expect(closed.outcome).toBe('rejected');
    expect(closed.matter.reference).toBeUndefined();
  });

  it('counts on from what the board already holds', () => {
    const held = [matter({ id: 'old', reference: 'SSB/2026/13' })];
    expect(closeVoting(board, carried('restrict'), T0, held).matter.reference).toBe('SSB/2026/14');
  });

  it('leaves the reference off where the board keeps no series', () => {
    const plain: Board = { ...board, rulingSeries: undefined };
    const closed = closeVoting(plain, carried('restrict'), T0, []);
    expect(closed.outcome).toBe('in_force');
    expect(closed.matter.reference).toBeUndefined();
  });
});

describe('the demonstration record', () => {
  it('shows a board that keeps a series', () => {
    // A reader who never sees a reference does not learn the application can
    // produce one, and this is the only record anybody will be shown.
    expect(boards[0].rulingSeries).toBe('SSB/{year}/{n}');
  });

  it('numbers every ruling it holds, and nothing that is not one', () => {
    for (const m of mattersAsSigned) {
      if (m.inForceAt) expect(m.reference).toMatch(/^SSB\/20\d\d\/\d+$/);
      else expect(m.reference).toBeUndefined();
    }
  });

  it('runs the series in the order the rulings took effect', () => {
    // A series where 2 predates 1 is the first thing a reader disbelieves.
    const issued = mattersAsSigned
      .filter((m) => m.inForceAt)
      .sort((a, b) => (a.inForceAt ?? '').localeCompare(b.inForceAt ?? ''));

    const seen = new Map<string, number>();
    for (const m of issued) {
      const [, year, n] = m.reference!.match(/^SSB\/(\d+)\/(\d+)$/)!;
      expect(year).toBe(m.inForceAt!.slice(0, 4));
      expect(Number(n)).toBe((seen.get(year) ?? 0) + 1);
      seen.set(year, Number(n));
    }
  });

  it('gives no two rulings the same reference', () => {
    const refs = mattersAsSigned.map((m) => m.reference).filter(Boolean);
    expect(new Set(refs).size).toBe(refs.length);
  });
});
