import { describe, it, expect } from 'vitest';
import { Refused } from '../src/services/lifecycle.js';
import {
  CADENCE_MONTHS,
  attendanceAcross,
  cadence,
  close,
  convene,
  lastHeld,
  nextConvened,
  recordAttendance,
  stateOf,
  unaccountedFor,
  writeMinute,
} from '../src/services/meeting.js';
import type { Board, Meeting } from '../src/types.js';

const board: Board = {
  id: 'b', institutionId: 'inst', name: 'Shariah Supervisory Board',
  quorumPermit: 3, quorumRestrict: 2, totalSignatories: 3, ratificationWindowHours: 168,
  members: [
    { id: 's1', name: 'Mufti One', title: 'Chair', board: 'b', signatory: true },
    { id: 's2', name: 'Shaykh Two', title: 'Member', board: 'b', signatory: true },
    { id: 'adv', name: 'Advisor', title: 'Advisory', board: 'b', signatory: false },
  ],
};

const AT = '2026-09-10T09:00:00.000Z';
const AFTER = '2026-09-10T12:00:00.000Z';
const MINUTE =
  'The board read the murabaha conditions and asked the liaison about possession before sale.';

const code = (fn: () => unknown): string | null => {
  try { fn(); return null; } catch (e) { return e instanceof Refused ? e.code : `threw ${String(e)}`; }
};

const held = (over: Partial<Meeting> = {}): Meeting => ({
  id: 'm1', boardId: 'b', at: AT, joinUrl: null,
  agenda: [{ item: 'The murabaha conditions' }],
  attendance: [{ scholarId: 's1', present: true }],
  minute: MINUTE, recordedBy: 's1', closedAt: AFTER,
  ...over,
});

describe('convening', () => {
  const input = { boardId: 'b', at: AT, agenda: [{ item: 'The murabaha conditions' }] };

  it('records the agenda, the time and who convened it', () => {
    const m = convene(input, board, [], 's1');
    expect(m.at).toBe(AT);
    expect(m.agenda).toHaveLength(1);
    expect(m.recordedBy).toBe('s1');
    expect(m.closedAt).toBeNull();
  });

  it('refuses an empty agenda, because nobody can prepare for one', () => {
    expect(code(() => convene({ ...input, agenda: [] }, board, [], 's1'))).toBe('no_agenda');
  });

  it('refuses an agenda item naming a matter not before this board', () => {
    const bad = { ...input, agenda: [{ item: 'A matter', matterId: 'not-here' }] };
    expect(code(() => convene(bad, board, ['m-real'], 's1'))).toBe('no_such_matter');
  });

  it('accepts an item naming a matter that is', () => {
    const good = { ...input, agenda: [{ item: 'A matter', matterId: 'm-real' }] };
    expect(convene(good, board, ['m-real'], 's1').agenda[0].matterId).toBe('m-real');
  });

  it('keeps the join link as the board’s own, or nothing', () => {
    expect(convene({ ...input, joinUrl: '  ' }, board, [], 's1').joinUrl).toBeNull();
    expect(convene({ ...input, joinUrl: 'https://meet.example/x' }, board, [], 's1').joinUrl).toBe(
      'https://meet.example/x',
    );
  });
});

describe('attendance is recorded, never inferred', () => {
  const open = held({ closedAt: null, attendance: [] });

  it('takes who the board says was there', () => {
    const m = recordAttendance(open, [{ scholarId: 's1', present: true }, { scholarId: 's2', present: false, note: 'Travelling.' }], board);
    expect(m.attendance).toHaveLength(2);
    expect(m.attendance[1].note).toBe('Travelling.');
  });

  it('refuses somebody who does not sit on this board', () => {
    expect(code(() => recordAttendance(open, [{ scholarId: 'stranger', present: true }], board))).toBe(
      'not_on_this_board',
    );
  });

  it('lets one name be corrected without sending the list again', () => {
    const m = recordAttendance(
      open,
      [{ scholarId: 's1', present: false }, { scholarId: 's1', present: true }],
      board,
    );
    expect(m.attendance).toHaveLength(1);
    expect(m.attendance[0].present).toBe(true);
  });

  it('reports who was not accounted for rather than marking them absent', () => {
    const m = recordAttendance(open, [{ scholarId: 's1', present: true }], board);
    // Writing s2 and adv as absent would assert an absence nobody recorded.
    expect(unaccountedFor(m, board)).toEqual(['s2', 'adv']);
    expect(m.attendance.map((a) => a.scholarId)).toEqual(['s1']);
  });
});

describe('the minute', () => {
  const open = held({ closedAt: null, minute: '' });

  it('records what was discussed, and who wrote it', () => {
    const m = writeMinute(open, MINUTE, 'clerk');
    expect(m.minute).toBe(MINUTE);
    expect(m.recordedBy).toBe('clerk');
  });

  it('refuses a line that records only that a date passed', () => {
    expect(code(() => writeMinute(open, 'The board met.', 'clerk'))).toBe('no_minute');
    expect(code(() => writeMinute(open, '   ', 'clerk'))).toBe('no_minute');
  });
});

describe('closing freezes it', () => {
  it('approves the minute and stops', () => {
    const open = held({ closedAt: null });
    expect(close(open, AFTER).closedAt).toBe(AFTER);
  });

  it('refuses before the meeting has been held', () => {
    const open = held({ closedAt: null });
    expect(code(() => close(open, '2026-09-01T00:00:00.000Z'))).toBe('not_yet_held');
  });

  it('refuses with nothing recorded, which would add a meeting to the count with nothing behind it', () => {
    expect(code(() => close(held({ closedAt: null, minute: '' }), AFTER))).toBe('nothing_recorded');
    expect(code(() => close(held({ closedAt: null, attendance: [] }), AFTER))).toBe('nothing_recorded');
  });

  it('refuses every change once closed, including a second close', () => {
    const shut = held();
    expect(code(() => writeMinute(shut, MINUTE, 's1'))).toBe('already_closed');
    expect(code(() => recordAttendance(shut, [{ scholarId: 's2', present: true }], board))).toBe('already_closed');
    expect(code(() => close(shut, AFTER))).toBe('already_closed');
  });

  it('says why, in terms of what a rewritable record is worth', () => {
    try {
      writeMinute(held(), MINUTE, 's1');
      expect.unreachable();
    } catch (e) {
      expect((e as Refused).message).toContain('nobody can rely on');
    }
  });
});

describe('where a meeting has got to, derived and never stored', () => {
  it('is convened before the day, held after it, minuted once both are in', () => {
    const empty = held({ closedAt: null, minute: '', attendance: [] });
    expect(stateOf(empty, '2026-09-01T00:00:00.000Z')).toBe('convened');
    expect(stateOf(empty, AFTER)).toBe('held');
    expect(stateOf(held({ closedAt: null }), AFTER)).toBe('minuted');
    expect(stateOf(held(), AFTER)).toBe('closed');
  });

  it('keeps no field claiming the state', () => {
    expect(Object.keys(held())).not.toContain('state');
    expect(Object.keys(held())).not.toContain('stage');
  });
});

describe('attendance across a year', () => {
  it('counts only meetings actually held', () => {
    const meetings = [
      held({ id: 'a' }),
      held({ id: 'b', at: '2026-12-01T09:00:00.000Z', closedAt: null }),
    ];
    const summary = attendanceAcross(meetings, board);
    // The second is convened, not held. Counting it would report the future.
    expect(summary[0]).toMatchObject({ scholarId: 's1', attended: 1, of: 1 });
  });

  it('counts each member separately rather than averaging them', () => {
    const meetings = [
      held({ id: 'a', attendance: [{ scholarId: 's1', present: true }, { scholarId: 's2', present: true }] }),
      held({ id: 'b', attendance: [{ scholarId: 's1', present: true }, { scholarId: 's2', present: false, note: 'Ill.' }] }),
    ];
    const summary = attendanceAcross(meetings, board);
    expect(summary.find((s) => s.scholarId === 's1')).toMatchObject({ attended: 2, of: 2 });
    expect(summary.find((s) => s.scholarId === 's2')).toMatchObject({ attended: 1, of: 2 });
  });

  it('carries the reason a board gave for an absence', () => {
    const summary = attendanceAcross(
      [held({ attendance: [{ scholarId: 's2', present: false, note: 'Travelling.' }] })],
      board,
    );
    expect(summary.find((s) => s.scholarId === 's2')?.notes).toEqual(['Travelling.']);
  });

  it('reports a member with no entry as having attended none, and of the right total', () => {
    const summary = attendanceAcross([held()], board);
    expect(summary.find((s) => s.scholarId === 'adv')).toMatchObject({ attended: 0, of: 1 });
  });
});

describe('the sixth clock', () => {
  const NOW = '2027-01-15T00:00:00.000Z';

  it('says there is nothing to count from, and that this is not a finding', () => {
    const c = cadence([], 'b', NOW);
    expect(c.dueBy).toBeNull();
    expect(c.overdue).toBe(false);
    expect(c.note).toContain('rather than a finding about the board');
  });

  it('counts from the last meeting held', () => {
    const c = cadence([held()], 'b', NOW);
    // AT is 2026-09-10, so six months later is 2027-03-10.
    expect(c.lastHeldAt).toBe(AT);
    expect(c.dueBy?.slice(0, 7)).toBe('2027-03');
    expect(c.overdue).toBe(false);
    expect(c.note).toContain(`${CADENCE_MONTHS} months`);
  });

  it('is overdue once the interval has passed with nothing convened', () => {
    const c = cadence([held()], 'b', '2027-06-01T00:00:00.000Z');
    expect(c.overdue).toBe(true);
  });

  it('stays overdue even with a meeting in the diary, and reports both', () => {
    // A meeting convened does not undo an interval that has already elapsed,
    // and one convened and never minuted is not a meeting held at all.
    const meetings = [held(), held({ id: 'next', at: '2027-08-01T09:00:00.000Z', closedAt: null })];
    const c = cadence(meetings, 'b', '2027-06-01T00:00:00.000Z');

    expect(c.overdue).toBe(true);
    expect(c.nextConvenedAt).toBe('2027-08-01T09:00:00.000Z');
  });

  it('does not count a past meeting nobody closed as the next one', () => {
    const meetings = [held(), held({ id: 'lapsed', at: '2027-02-01T09:00:00.000Z', closedAt: null })];
    const c = cadence(meetings, 'b', '2027-06-01T00:00:00.000Z');
    expect(c.nextConvenedAt).toBeNull();
  });

  it('ignores another board’s meetings entirely', () => {
    expect(cadence([held({ boardId: 'other' })], 'b', NOW).dueBy).toBeNull();
  });

  it('takes the latest held and the earliest ahead', () => {
    const meetings = [
      held({ id: 'old', at: '2026-01-01T09:00:00.000Z' }),
      held({ id: 'recent', at: AT }),
      held({ id: 'soon', at: '2027-02-01T09:00:00.000Z', closedAt: null }),
      held({ id: 'later', at: '2027-05-01T09:00:00.000Z', closedAt: null }),
    ];
    expect(lastHeld(meetings, 'b')?.id).toBe('recent');
    expect(nextConvened(meetings, 'b', NOW)?.id).toBe('soon');
  });
});

describe('what a meeting refuses to be', () => {
  it('reaches no verdict and records no decision', () => {
    const text = JSON.stringify(held()).toLowerCase();
    for (const claim of ['halal', 'haram', 'the board approved', 'is compliant', 'resolved that']) {
      expect(text).not.toContain(claim);
    }
  });
});
