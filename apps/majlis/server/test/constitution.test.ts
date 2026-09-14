import { describe, it, expect } from 'vitest';
import { changeHowItDecides } from '../src/services/constitution.js';
import { openVoting, recordVote, tally, Refused } from '../src/services/lifecycle.js';
import { boards } from '../src/data/seed.js';
import type { Board, Matter } from '../src/types.js';

/**
 * How a board changes the way it decides, and what that must never reach.
 *
 * ── the one that matters ──────────────────────────────────────────────────
 *
 * A quorum is the number of signatures that bind the institution. If the
 * tally reads it off the board every time it is computed, a chair can lower
 * the threshold while a vote is open and carry a matter on fewer signatures
 * than were required when the members were asked. That is the institution
 * bound by a number nobody voted under, and the last test here is the one
 * that holds it shut.
 */

const board = (): Board => JSON.parse(JSON.stringify(boards[0])) as Board;

const REASON =
  'The board resolved at its September sitting to require one further signature on permissions.';

const refusalOf = (run: () => unknown): Refused => {
  try {
    run();
  } catch (e) {
    if (e instanceof Refused) return e;
    throw e;
  }
  throw new Error('it was not refused');
};

const at = '2026-09-14T10:00:00Z';

describe('changing how the board decides', () => {
  it('takes the change and records what moved, by whom, and why', () => {
    const b = board();
    const after = changeHowItDecides(b, { quorumPermit: b.quorumPermit + 1 }, 'member-a', at, REASON);

    expect(after.quorumPermit).toBe(b.quorumPermit + 1);
    expect(after.changes).toHaveLength(1);
    expect(after.changes?.[0]).toMatchObject({
      field: 'quorumPermit',
      from: String(b.quorumPermit),
      to: String(b.quorumPermit + 1),
      by: 'member-a',
      reason: REASON,
    });
  });

  it('keeps every earlier change, because a quorum that moved twice is the interesting case', () => {
    let b = board();
    b = changeHowItDecides(b, { quorumPermit: 2 }, 'member-a', at, REASON);
    b = changeHowItDecides(b, { quorumPermit: 3 }, 'member-b', '2026-10-01T10:00:00Z', REASON);

    expect(b.changes).toHaveLength(2);
    expect(b.changes?.map((c) => `${c.from}→${c.to}`)).toEqual(['3→2', '2→3']);
  });

  it('refuses a change with no reason anybody could review', () => {
    const b = board();
    expect(refusalOf(() => changeHowItDecides(b, { quorumPermit: 2 }, 'member-a', at, 'because')).code).toBe(
      'no_reason_given',
    );
  });

  it('refuses a quorum the board could never reach', () => {
    const b = board();
    const refused = refusalOf(() =>
      changeHowItDecides(b, { quorumPermit: b.totalSignatories + 1 }, 'member-a', at, REASON),
    );
    expect(refused.code).toBe('quorum_not_met');
    expect(refused.message).toMatch(/could never/);
  });

  it('refuses a quorum of nobody', () => {
    const b = board();
    expect(refusalOf(() => changeHowItDecides(b, { quorumPermit: 0 }, 'member-a', at, REASON)).code).toBe(
      'no_reason_given',
    );
  });

  it('refuses a change that changes nothing, rather than writing an empty entry', () => {
    const b = board();
    const refused = refusalOf(() =>
      changeHowItDecides(b, { quorumPermit: b.quorumPermit }, 'member-a', at, REASON),
    );
    expect(refused.message).toMatch(/already holds/);
  });

  it('will not leave the board without a name', () => {
    const b = board();
    const refused = refusalOf(() => changeHowItDecides(b, { name: '  ' }, 'member-a', at, REASON));
    expect(refused.message).toMatch(/printed on everything it issues/);
  });
});

describe('a vote already open is judged on the threshold it opened under', () => {
  /** A matter with enough said on it that the vote may open. */
  const ready = (b: Board): Matter =>
    ({
      id: 'matter-1',
      boardId: b.id,
      title: 'Whether this arrangement may be offered',
      proposal: 'The board is asked whether the arrangement as described may be offered.',
      status: 'deliberation',
      direction: 'permit',
      origin: 'institution_request',
      openedAt: '2026-09-01T00:00:00Z',
      timelockEndsAt: null,
      inForceAt: null,
      notDecided: [],
      reasoning: [],
      findings: [],
      deliberation: [{ scholarId: b.members[0].id, body: 'A point about the mechanism.', at: '2026-09-01T01:00:00Z' }],
      objections: [],
      sources: [],
      interactsWith: [],
      mechanism: 'The arrangement as described.',
      proposedRule: {
        id: 'r', boardId: b.id, title: 't', statement: 's', parameters: [],
        parameterHash: '', version: 1, inForceFrom: null, sources: [],
      },
      simulation: null,
    }) as unknown as Matter;

  it('freezes the threshold when the vote opens', () => {
    const b = board();
    const open = openVoting(ready(b), b);
    expect(open.quorumWhenOpened).toBe(b.quorumPermit);
  });

  it('does not carry when the quorum is lowered mid-vote', () => {
    const b = board();
    const open = openVoting(ready(b), b);

    // One signature short of the threshold the question was put under.
    let voting = open;
    const signatories = b.members.filter((m) => m.signatory).slice(0, b.quorumPermit - 1);
    for (const m of signatories) {
      voting = recordVote(
        b,
        voting,
        { scholarId: m.id, position: 'for', reason: 'The mechanism is bounded by the minimums stated.' },
        '2026-09-02T00:00:00Z',
      );
    }
    expect(tally(b, voting).met).toBe(false);

    // The chair lowers the quorum to exactly what has already been cast.
    const lowered = changeHowItDecides(b, { quorumPermit: signatories.length }, 'member-a', at, REASON);

    // The board says two are enough now. This question was put under three.
    expect(tally(lowered, voting).met).toBe(false);
  });

  it('applies the new threshold to the next question, which is the point of changing it', () => {
    const b = board();
    const lowered = changeHowItDecides(b, { quorumPermit: 2 }, 'member-a', at, REASON);

    const open = openVoting(ready(lowered), lowered);
    expect(open.quorumWhenOpened).toBe(2);
  });
});
