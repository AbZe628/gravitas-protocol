import { describe, it, expect } from 'vitest';
import type { Board } from '../src/types.js';
import { hashPassword, parseMembers } from '../src/auth/members.js';
import { buildSettings } from '../src/services/settings.js';

/**
 * The board record and the credential file are two lists that have to agree.
 *
 * These are the tests that make somebody find out when they do not. Every case
 * here is silent in production: nothing fails, nothing logs, and the board
 * discovers it when a vote does not count.
 */

const secret = hashPassword('a board credential');
const entries = (...lines: string[]) => parseMembers(lines.map((l) => `${l}:${secret}`).join('\n'));

const board: Board = {
  id: 'b', institutionId: 'inst', name: 'Board',
  quorumPermit: 3, quorumRestrict: 2, totalSignatories: 3, ratificationWindowHours: 168,
  members: [
    { id: 's1', name: 'Mufti One', title: 'Chair', board: 'b', signatory: true },
    { id: 's2', name: 'Shaykh Two', title: 'Member', board: 'b', signatory: true },
    { id: 'adv', name: 'Advisor', title: 'Advisory', board: 'b', signatory: false },
  ],
};

const build = (members: ReturnType<typeof parseMembers> | null) =>
  buildSettings({ board, members, timelockHours: 48 });

const kinds = (s: ReturnType<typeof build>) => s.mismatches.map((m) => m.kind);

describe('what the two lists say together', () => {
  it('reports a member as seated with both their board standing and their credential', () => {
    const s = build(entries('s1:signatory+chair', 's2:signatory', 'adv:advisory'));
    const one = s.members.find((m) => m.scholarId === 's1')!;

    expect(one.signatory).toBe(true);
    expect(one.role).toBe('signatory');
    expect(one.office).toBe('chair');
    expect(s.mismatches).toEqual([]);
  });

  it('counts the signatories the record actually lists, beside the number it claims', () => {
    const s = build(entries('s1:signatory', 's2:signatory', 'adv:advisory'));
    expect(s.decides.totalSignatories).toBe(3);
    expect(s.decides.signatoriesSeated).toBe(2);
  });

  it('carries the thresholds and both windows', () => {
    const s = build(null);
    expect(s.decides).toMatchObject({
      quorumPermit: 3,
      quorumRestrict: 2,
      ratificationWindowHours: 168,
      timelockHours: 48,
    });
  });
});

describe('where they disagree', () => {
  it('names a signatory with no credential, and says the board will wait for nothing', () => {
    const s = build(entries('s1:signatory', 'adv:advisory'));
    expect(kinds(s)).toContain('no_credential');

    const found = s.mismatches.find((m) => m.scholarId === 's2')!;
    expect(found.consequence).toContain('counted toward the quorum');
    expect(found.consequence).toContain('cannot arrive');
  });

  it('names a credential for somebody not on the board', () => {
    const s = build(entries('s1:signatory', 's2:signatory', 'adv:advisory', 'ghost:signatory'));
    const found = s.mismatches.find((m) => m.scholarId === 'ghost')!;

    expect(found.kind).toBe('not_on_board');
    expect(found.consequence).toContain('belonging to no member');
  });

  it('allows an observer who does not sit on the board', () => {
    const s = build(entries('s1:signatory', 's2:signatory', 'adv:advisory', 'watcher:observer'));
    expect(kinds(s)).not.toContain('not_on_board');
  });

  it('catches the vote that is recorded and then silently discarded', () => {
    // The credential may vote; the board records them as advisory. `tally`
    // counts only board signatories, so the position never moves the threshold.
    const s = build(entries('s1:signatory', 's2:signatory', 'adv:signatory'));
    const found = s.mismatches.find((m) => m.scholarId === 'adv')!;

    expect(found.kind).toBe('vote_discarded');
    expect(found.consequence).toContain('silently discarded');
    expect(found.consequence).toContain('will believe they voted');
  });

  it('catches a signatory whose credential cannot vote', () => {
    const s = build(entries('s1:signatory', 's2:advisory', 'adv:advisory'));
    const found = s.mismatches.find((m) => m.scholarId === 's2')!;

    expect(found.kind).toBe('cannot_vote');
    expect(found.consequence).toContain('still counts them');
  });

  it('says nothing at all when no credentials are configured', () => {
    // A development installation is not a misconfigured board, and reporting
    // every member as missing a credential would be noise.
    expect(build(null).mismatches).toEqual([]);
    expect(build(entries()).mismatches).toEqual([]);
  });

  it('names where to fix it, and does not fix it', () => {
    const s = build(entries('s1:signatory'));
    expect(s.fixIn).toContain('MAJLIS_MEMBERS');
    // Nothing in the output proposes a change to the board itself.
    expect(JSON.stringify(s)).not.toMatch(/"(add|remove|update)"/);
  });
});

describe('what it does not disclose', () => {
  it('carries no secret and no login id', () => {
    const s = build(entries('alpha/s1:signatory+chair', 's2:signatory', 'adv:advisory'));
    const json = JSON.stringify(s);

    expect(json).not.toContain('scrypt$');
    expect(json).not.toContain('alpha/s1');
    expect(json).toContain('"s1"');
  });
});

describe('no credentials is a different state from credentials that disagree', () => {
  it('says so, rather than reporting every member as a fault', () => {
    const none = build(null);
    expect(none.credentialsConfigured).toBe(false);
    expect(none.mismatches).toEqual([]);
    // Every row still reports the truth about itself; the page decides what to
    // make of it.
    expect(none.members.every((m) => m.role === null)).toBe(true);
  });

  it('reports a real gap once anyone holds one', () => {
    const some = build(entries('s1:signatory'));
    expect(some.credentialsConfigured).toBe(true);
    expect(some.mismatches.length).toBeGreaterThan(0);
  });
});
