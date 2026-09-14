import { describe, it, expect } from 'vitest';
import { changeYourOwnDetails } from '../src/services/yourself.js';
import { recordVote } from '../src/services/lifecycle.js';
import { assemble } from '../src/services/fatwa.js';
import { Refused } from '../src/services/lifecycle.js';
import { boards } from '../src/data/seed.js';
import type { Board, Matter } from '../src/types.js';

/**
 * What a member may change about themselves, and what it must not disturb.
 *
 * The half worth guarding hardest is the second one. A written ruling prints
 * who signed it, and that name used to be looked up in the current membership
 * every time the document was rendered — so a member correcting their title
 * would have changed the signature block of every ruling they had ever
 * signed, silently and years later. The record here is append-only and an
 * issued document is part of it.
 */

const board = (): Board => JSON.parse(JSON.stringify(boards[0])) as Board;

const refusalOf = (run: () => unknown): Refused => {
  try {
    run();
  } catch (e) {
    if (e instanceof Refused) return e;
    throw e;
  }
  throw new Error('it was not refused');
};

describe('changing your own entry', () => {
  it('takes a name and a title', () => {
    const b = board();
    const me = b.members[0].id;
    const after = changeYourOwnDetails(b, me, { name: 'Aisha Rahman', title: 'Chair' });

    const entry = after.members.find((m) => m.id === me);
    expect(entry?.name).toBe('Aisha Rahman');
    expect(entry?.title).toBe('Chair');
  });

  it('leaves every other member exactly as they were', () => {
    const b = board();
    const me = b.members[0].id;
    const others = JSON.stringify(b.members.slice(1));

    const after = changeYourOwnDetails(b, me, { name: 'Aisha Rahman' });
    expect(JSON.stringify(after.members.slice(1))).toBe(others);
  });

  it('refuses somebody who is not on the board', () => {
    expect(refusalOf(() => changeYourOwnDetails(board(), 'nobody', { name: 'X' })).code).toBe(
      'not_on_this_board',
    );
  });

  it('refuses an emptied name, because it is printed on every ruling signed', () => {
    const b = board();
    const refused = refusalOf(() => changeYourOwnDetails(b, b.members[0].id, { name: '   ' }));
    expect(refused.message).toMatch(/printed on every ruling/);
  });

  it('accepts an emptied title, because not everybody carries one', () => {
    const b = board();
    const me = b.members[0].id;
    const after = changeYourOwnDetails(b, me, { title: '' });
    expect(after.members.find((m) => m.id === me)?.title).toBe('');
  });

  /*
   * Signing authority is the board's constitution rather than a preference.
   * The service takes four fields and nothing else; a member cannot hand
   * themselves a vote by editing their own row.
   */
  it('cannot be used to grant yourself signing authority', () => {
    const b = board();
    const advisory = b.members.find((m) => !m.signatory);
    if (!advisory) return;

    const after = changeYourOwnDetails(b, advisory.id, {
      name: 'Still advisory',
      ...({ signatory: true } as Record<string, unknown>),
    });
    expect(after.members.find((m) => m.id === advisory.id)?.signatory).toBe(false);
  });
});

describe('the address is kept, never claimed as confirmed', () => {
  it('stores a new address unconfirmed', () => {
    const b = board();
    const me = b.members[0].id;
    const after = changeYourOwnDetails(b, me, { email: 'member@example.org' });

    const entry = after.members.find((m) => m.id === me);
    expect(entry?.email).toBe('member@example.org');
    expect(entry?.emailConfirmed).toBe(false);
  });

  it('refuses something that could not be sent to', () => {
    const b = board();
    const refused = refusalOf(() =>
      changeYourOwnDetails(b, b.members[0].id, { email: 'not an address' }),
    );
    expect(refused.message).toMatch(/at-sign/);
  });

  it('does not demote a confirmed address when only the telephone changes', () => {
    let b = board();
    const me = b.members[0].id;
    b = changeYourOwnDetails(b, me, { email: 'member@example.org' });

    // As a confirmation would have left it, once an institution wires a relay.
    b.members = b.members.map((m) => (m.id === me ? { ...m, emailConfirmed: true } : m));

    const after = changeYourOwnDetails(b, me, { telephone: '+387 33 000 000' });
    const entry = after.members.find((m) => m.id === me);
    expect(entry?.emailConfirmed).toBe(true);
    expect(entry?.telephone).toBe('+387 33 000 000');
  });

  it('clears an address when it is emptied', () => {
    let b = board();
    const me = b.members[0].id;
    b = changeYourOwnDetails(b, me, { email: 'member@example.org' });
    const after = changeYourOwnDetails(b, me, { email: '' });

    expect(after.members.find((m) => m.id === me)?.email).toBeUndefined();
  });
});

describe('a ruling already signed does not move', () => {
  it('keeps the name the position was recorded under', () => {
    const b = board();
    const me = b.members.find((m) => m.signatory)!;

    const matter = {
      id: 'matter-1',
      boardId: b.id,
      title: 'Whether this arrangement may be offered',
      status: 'voting',
      direction: 'permit',
      origin: 'institution_request',
      openedAt: '2026-09-01T00:00:00Z',
      timelockEndsAt: null,
      inForceAt: null,
      notDecided: [],
      reasoning: [],
      deliberation: [{ scholarId: me.id, body: 'A point about the mechanism.', at: '2026-09-01T01:00:00Z' }],
      objections: [],
      sources: [],
      interactsWith: [],
      mechanism: 'The arrangement as described.',
      proposal: 'The board is asked whether the arrangement as described may be offered.',
      findings: [],
      asked: [],
      proposedRule: { id: 'r', boardId: b.id, title: 't', statement: 's', parameters: [], parameterHash: '', version: 1, inForceFrom: null, sources: [] },
      simulation: null,
    } as unknown as Matter;

    const voted = recordVote(
      b,
      matter,
      {
        scholarId: me.id,
        position: 'for',
        reason: 'The mechanism is bounded by the minimums, which answers the concern raised.',
      },
      '2026-09-02T00:00:00Z',
    );

    expect(voted.reasoning[0].name).toBe(me.name);

    // The member corrects their own name afterwards.
    const renamed = changeYourOwnDetails(b, me.id, { name: 'A Different Name Entirely' });

    const fatwa = assemble(renamed, { ...voted, status: 'in_force', inForceAt: '2026-09-03T00:00:00Z' } as Matter, '2026-09-03T00:00:00Z');
    const signed = [...fatwa.signatures, ...fatwa.dissent].find((s) => s.scholarId === me.id);

    expect(signed?.name).toBe(me.name);
    expect(signed?.name).not.toBe('A Different Name Entirely');
  });
});
