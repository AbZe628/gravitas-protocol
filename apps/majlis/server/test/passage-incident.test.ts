import { describe, it, expect } from 'vitest';
import { buildIncidentPassage } from '../src/services/passage-incident.js';
import { incidents as seeded } from '../src/data/seed.js';
import { known, words } from './words.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Incident, Step } from '../src/types.js';

/**
 * The passage a breach makes, and the two screens that used to read it apart.
 *
 * Before this file there were two readings of a breach and they disagreed by
 * construction. The queue kept six stages mapped to acts; the breach screen
 * kept nine steps in a component. The two the screen had and the queue did not
 * are the two that cost money: whether the activity actually stopped, and
 * whether what was earned impermissibly has been paid away.
 *
 * So most of what is held here is that those two are steps like any other, and
 * that a breach the board dismissed stops asking for either.
 */

const NOW = '2026-09-20T00:00:00Z';
const BASE = seeded[0];

function breach(over: Partial<Incident> = {}): Incident {
  return {
    ...BASE,
    id: 'i1',
    stage: 'reported',
    concurrences: [],
    determinedAt: null,
    actual: null,
    stopped: [],
    plans: [],
    directorsApprovedAt: null,
    submittedToRegulatorAt: null,
    purification: null,
    closedAt: null,
    reportedAt: '2026-09-01T00:00:00Z',
    ...over,
  };
}

/** Every step of both halves, which is the whole passage. */
function steps(p: ReturnType<typeof buildIncidentPassage>): Step[] {
  return p.groups.flatMap((g) => g.steps);
}

function step(p: ReturnType<typeof buildIncidentPassage>, key: string): Step {
  const found = steps(p).find((s) => s.key === key);
  if (!found) throw new Error('no step ' + key);
  return found;
}

describe('a breach waits on the board before it waits on anybody', () => {
  it('asks the board to determine, and says nobody has spoken', () => {
    const p = buildIncidentPassage(breach(), NOW);

    expect(p.next?.key).toBe('determine');
    expect(p.next?.whose).toBe('signatory');
    expect(words(p.next?.standing)).toContain('Nobody has said yet');
  });

  it('counts who has spoken rather than calling it nearly decided', () => {
    const p = buildIncidentPassage(
      breach({ concurrences: [BASE.concurrences[0], BASE.concurrences[1]] }),
      NOW,
    );

    expect(words(step(p, 'determine').standing)).toContain('2 have said');
    // And never that it is ready: that is the board's finding, not a count.
    expect(words(step(p, 'determine').standing)).not.toContain('ready');
  });

  it('holds everything else ahead until the finding is made', () => {
    const p = buildIncidentPassage(breach(), NOW);

    for (const key of ['stop', 'plan', 'endorse', 'directors', 'regulator', 'purify', 'close']) {
      expect(step(p, key).state).toBe('ahead');
    }
  });
});

describe('the two steps the queue did not know about', () => {
  /*
   * The arrival screen said a breach was with the board while the breach's own
   * screen was waiting on the bank to pay. Both were reading the record; they
   * were reading different parts of it.
   */
  it('asks what stopped, once the board has found it actual', () => {
    const p = buildIncidentPassage(
      breach({ stage: 'determined', actual: true, determinedAt: '2026-09-05T00:00:00Z' }),
      NOW,
    );

    expect(step(p, 'stop').state).toBe('open');
    expect(words(step(p, 'stop').standing)).toContain('what stopped');
  });

  it('puts stopping the activity before filing the plan', () => {
    const p = buildIncidentPassage(
      breach({ stage: 'determined', actual: true, determinedAt: '2026-09-05T00:00:00Z' }),
      NOW,
    );

    /*
     * Both are open. Which one the screen leads with is the judgement: money
     * is still being earned while the paperwork is drafted, so the activity
     * outranks the plan.
     */
    expect(step(p, 'plan').state).toBe('open');
    expect(p.next?.key).toBe('stop');
  });

  it('asks for purification from the finding, not from the regulator', () => {
    const p = buildIncidentPassage(
      breach({
        stage: 'determined',
        actual: true,
        determinedAt: '2026-09-05T00:00:00Z',
        stopped: ['the early crediting'],
      }),
      NOW,
    );

    // Owed from the determination. It does not wait on the Directors or on
    // anything filed outside the bank.
    expect(step(p, 'purify').state).toBe('open');
    expect(step(p, 'regulator').state).toBe('ahead');
  });

  it('counts the days the institution has had, from the finding', () => {
    const p = buildIncidentPassage(
      breach({
        stage: 'determined',
        actual: true,
        determinedAt: '2026-09-05T00:00:00Z',
        stopped: ['x'],
      }),
      NOW,
    );

    expect(words(step(p, 'plan').standing)).toContain('15 days');
  });
});

describe('a breach the board dismissed asks for nothing', () => {
  const dismissed = breach({
    stage: 'not_actual',
    actual: false,
    determinedAt: '2026-09-05T00:00:00Z',
  });

  it('has no next act', () => {
    const p = buildIncidentPassage(dismissed, NOW);
    expect(p.next).toBeNull();
    expect(words(p.settled)).toContain('not a non-compliance');
  });

  it('calls putting it right not applicable rather than undone', () => {
    const p = buildIncidentPassage(dismissed, NOW);

    for (const key of ['plan', 'endorse', 'directors', 'regulator', 'purify', 'close']) {
      expect(step(p, key).state).toBe('not_applicable');
    }
    expect(step(p, 'stop').state).toBe('not_applicable');
  });

  it('stops the clock', () => {
    expect(buildIncidentPassage(dismissed, NOW).waiting).toBeNull();
  });
});

describe('closing is an act somebody takes', () => {
  it('is not offered until purification and the filing are recorded', () => {
    const p = buildIncidentPassage(
      breach({
        stage: 'approved',
        actual: true,
        determinedAt: '2026-09-05T00:00:00Z',
        stopped: ['x'],
        directorsApprovedAt: '2026-09-10T00:00:00Z',
      }),
      NOW,
    );

    expect(step(p, 'close').state).toBe('ahead');
  });

  it('is open, never done, once everything is in the record', () => {
    const p = buildIncidentPassage(
      breach({
        stage: 'submitted',
        actual: true,
        determinedAt: '2026-09-05T00:00:00Z',
        stopped: ['x'],
        directorsApprovedAt: '2026-09-10T00:00:00Z',
        submittedToRegulatorAt: '2026-09-12T00:00:00Z',
        purification: { ...(BASE.purification ?? ({} as never)), paidAt: '2026-09-15T00:00:00Z' },
      }),
      NOW,
    );

    expect(step(p, 'close').state).toBe('open');
    expect(words(step(p, 'close').standing)).toContain('still an act somebody takes');
  });
});

/**
 * Every sentence a breach can reach has words behind it.
 *
 * The same guard the matter has, for the same reason: a key with no entry
 * renders as `breach.step.purify.standing` on the screen, and nothing in the
 * type system joins the string on this side to the lookup on the other.
 */
describe('every sentence a breach can reach has words behind it', () => {
  const shapes: [string, Incident][] = [
    ['just reported', breach()],
    ['part-way through the finding', breach({ concurrences: [BASE.concurrences[0]] })],
    ['found actual', breach({ stage: 'determined', actual: true, determinedAt: NOW })],
    ['dismissed', breach({ stage: 'not_actual', actual: false, determinedAt: NOW })],
    ['with a plan filed', breach({ ...BASE, id: 'i2' })],
    ['closed', breach({ stage: 'closed', actual: true, determinedAt: NOW, closedAt: NOW })],
  ];

  for (const [what, i] of shapes) {
    it(`says something in English when ${what}`, () => {
      const p = buildIncidentPassage(i, NOW);
      const unknown: string[] = [];

      for (const s of steps(p)) {
        for (const said of [s.act, s.standing, s.why]) {
          if (!known(said)) unknown.push(said?.key ?? '(none)');
        }
      }
      if (!known(p.settled)) unknown.push(p.settled?.key ?? '(none)');
      if (!known(p.waiting?.note)) unknown.push(p.waiting?.note?.key ?? '(none)');

      expect(unknown).toEqual([]);
    });

    // And the walk reached all nine, rather than passing by checking nothing.
    it(`has all nine steps when ${what}`, () => {
      expect(steps(buildIncidentPassage(i, NOW))).toHaveLength(9);
    });
  }

  it('names both halves in words a reader will see', () => {
    const p = buildIncidentPassage(breach(), NOW);
    for (const g of p.groups) {
      expect(known({ key: `passage.group.${g.key}` })).toBe(true);
      expect(known({ key: `passage.group.${g.key}.hint` })).toBe(true);
    }
  });
});

/**
 * A record this reading does not recognise still gets a sentence.
 *
 * Found by the queue, which swallowed the exception this file was throwing.
 * That catch is right — the arrival screen must not go blank because one
 * breach is malformed — but it meant a row appeared with no act and no owner
 * and nothing anywhere saying why. The reading has to hold.
 *
 * An absent list is not corruption. It means nothing was recorded, which is
 * true, useful, and what a partly-written breach or an older store looks like.
 */
describe('a breach with fields missing still reads', () => {
  const bare = {
    id: 'bare',
    boardId: 'demo-board',
    reference: 'SNC-bare',
    title: 'A breach with almost nothing in it',
    report: '',
    reportedBy: 'member-a',
    reportedAt: '2026-09-01T00:00:00Z',
    stage: 'determined',
    actual: true,
    determinedAt: '2026-09-05T00:00:00Z',
  } as unknown as Incident;

  it('does not throw', () => {
    expect(() => buildIncidentPassage(bare, NOW)).not.toThrow();
  });

  it('says what is missing rather than going quiet', () => {
    const p = buildIncidentPassage(bare, NOW);

    expect(p.next?.key).toBe('stop');
    expect(p.next?.whose).toBe('signatory');
    expect(words(p.next?.standing)).toContain('what stopped');
  });

  it('still reports all nine steps', () => {
    expect(steps(buildIncidentPassage(bare, NOW))).toHaveLength(9);
  });
});

/**
 * Whose a step is, and who the route actually lets act.
 *
 * ── written down because I got one wrong ──────────────────────────────────
 *
 * Stopping the activity was put here as the bank's, on the reasoning that a
 * bank is what stops doing something. The route disagrees:
 * `/incidents/:id/stopped` takes a signatory's credential, because naming what
 * a finding stops is part of the finding and the finding is the board's.
 *
 * An owner invented here is not a small error. It is the column every screen
 * reads to say who is holding a breach up, and the commonest way one stalls is
 * that each side believes it is with the other. So the guard reads the route
 * file and holds the two together.
 *
 * `mayVote` is a signatory. `mayRecordInstitutionAct` is the secretary or the
 * liaison, which is the institution's side of the desk.
 */
describe('a step belongs to whoever the route lets act', () => {
  const routes = readFileSync(
    resolve(process.cwd(), 'src/routes/incidents.ts'),
    'utf8',
  );

  /** The act each step is carried out by, as the route file spells its path. */
  const carriedOutBy: Record<string, string> = {
    determine: 'concurrence',
    stop: 'stopped',
    endorse: 'plan/endorse',
    close: 'close',
    plan: 'plan',
    directors: 'directors',
    regulator: 'submission',
  };

  const guardOf = (path: string): string | null => {
    const at = routes.indexOf(`'/incidents/:id/${path}'`);
    if (at === -1) return null;
    const after = routes.slice(at, at + 900);
    const m = after.match(/requireRole\(\s*res,\s*(may[A-Za-z]+)\(/);
    return m ? m[1] : null;
  };

  it('found the route file and its guards', () => {
    // Otherwise every assertion below passes by finding nothing.
    const found = Object.values(carriedOutBy).map(guardOf);
    expect(found.filter(Boolean)).toHaveLength(Object.keys(carriedOutBy).length);
  });

  /*
   * Every state of the breach, because whose a step is does not depend on
   * what state it is in — and checking one state is how the first version of
   * this guard passed while `determine` said *signatory* when it was done and
   * *board* when it was open. The same act, two owners, decided by a branch.
   */
  const everyState = [
    breach(),
    breach({ stage: 'determined', actual: true, determinedAt: '2026-09-05T00:00:00Z' }),
    breach({
      stage: 'plan_filed',
      actual: true,
      determinedAt: '2026-09-05T00:00:00Z',
      stopped: ['x'],
      plans: [BASE.plans[0]],
    }),
    breach({ stage: 'closed', actual: true, determinedAt: NOW, closedAt: NOW }),
  ].map((i) => buildIncidentPassage(i, NOW));

  for (const [key, path] of Object.entries(carriedOutBy)) {
    it(`says ${key} belongs to whoever /${path} accepts, in every state`, () => {
      const guard = guardOf(path);
      const expected = guard === 'mayVote' ? 'signatory' : 'institution';

      const owners = [...new Set(everyState.map((p) => step(p, key).whose))];
      expect(owners, `the route uses ${guard}`).toEqual([expected]);
    });
  }
});

/**
 * Purification is the one step that changes hands.
 *
 * Every other step belongs to one side throughout. This one carries two acts:
 * the board prescribes what is owed — `/incidents/:id/purification`, which
 * takes a signatory — and the institution records paying it, at
 * `/purification/paid`, which takes the secretary or the liaison.
 *
 * So its owner moves, and it is the only place in this file where that is
 * correct rather than a branch somebody forgot. Held apart from the guard
 * above precisely so nobody later "fixes" it into one owner.
 */
describe('purification changes hands, and only it does', () => {
  const determined = {
    stage: 'determined' as const,
    actual: true,
    determinedAt: '2026-09-05T00:00:00Z',
    stopped: ['x'],
  };

  it('is the board’s while nothing has been prescribed', () => {
    expect(step(buildIncidentPassage(breach(), NOW), 'purify').whose).toBe('signatory');
    expect(step(buildIncidentPassage(breach(determined), NOW), 'purify').whose).toBe('signatory');
  });

  it('becomes the bank’s once the amount is worked out', () => {
    const p = buildIncidentPassage(
      breach({
        ...determined,
        purification: { ...(BASE.purification ?? ({} as never)), paidAt: null },
      }),
      NOW,
    );

    expect(step(p, 'purify').whose).toBe('institution');
    expect(words(step(p, 'purify').standing)).toContain('nothing records it paid');
  });
});
