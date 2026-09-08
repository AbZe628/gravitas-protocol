import { describe, it, expect } from 'vitest';
import {
  close,
  minute,
  overdue,
  summarise,
  Refused,
  type Undertaking,
} from '../src/services/undertaking.js';

/**
 * What somebody undertook to do.
 *
 * The lines these hold:
 *
 *   - an undertaking names a person who was in the room, never a queue;
 *   - nothing is due unless the board said so, and no date is invented;
 *   - closing it says what happened, in words;
 *   - dropped is an outcome, not a failure, and never a deletion.
 */

const AT = '2026-09-20T10:00:00.000Z';
const MEMBERS = [{ id: 'member-a' }, { id: 'member-b' }];

function made(over: Partial<Parameters<typeof minute>[0]> = {}): Undertaking {
  return minute({
    id: 'u-1',
    boardId: 'demo-board',
    meetingId: 'meet-1',
    what: 'Ask the desk for the index provider’s borrowing terms.',
    who: 'member-a',
    minutedBy: 'member-b',
    minutedAt: AT,
    members: MEMBERS,
    ...over,
  });
}

describe('minuting one', () => {
  it('keeps the words it was minuted in', () => {
    expect(made().what).toBe('Ask the desk for the index provider’s borrowing terms.');
    expect(made().state).toBe('open');
  });

  it('refuses a name with no task', () => {
    try {
      made({ what: '   ' });
      throw new Error('expected a refusal');
    } catch (e) {
      expect((e as Refused).reason).toBe('nothing_undertaken');
    }
  });

  it('refuses a task with nobody named', () => {
    try {
      made({ who: '' });
      throw new Error('expected a refusal');
    } catch (e) {
      expect((e as Refused).reason).toBe('nobody_named');
      expect((e as Refused).message).toMatch(/does not assign work to a room/i);
    }
  });

  it('refuses somebody who is not on this board', () => {
    try {
      made({ who: 'a-stranger' });
      throw new Error('expected a refusal');
    } catch (e) {
      expect((e as Refused).reason).toBe('not_on_this_board');
    }
  });

  it('refuses a date that falls before the sitting', () => {
    try {
      made({ dueAt: '2026-09-01T00:00:00.000Z' });
      throw new Error('expected a refusal');
    } catch (e) {
      expect((e as Refused).reason).toBe('backwards_due_date');
    }
  });
});

describe('a date nobody set', () => {
  it('is left absent rather than invented', () => {
    /*
     * Majlis picking a fortnight because a fortnight is a round number would
     * be the application deciding board business.
     */
    expect(made().dueAt).toBeUndefined();
  });

  it('is never overdue, however long it sits', () => {
    expect(overdue(made(), '2099-01-01T00:00:00.000Z')).toBe(false);
  });

  it('is counted on its own, because it is its own problem', () => {
    const s = summarise([made(), made({ id: 'u-2', dueAt: '2026-10-01T00:00:00.000Z' })], AT);
    expect(s.open).toBe(2);
    expect(s.openWithNoDate).toBe(1);
    expect(s.overdue).toBe(0);
  });
});

describe('closing one', () => {
  it('records what happened, and who said so', () => {
    const done = close(made(), 'done', 'The desk sent the terms; they are attached.', 'member-a', AT);
    expect(done.state).toBe('done');
    expect(done.outcome?.said).toContain('The desk sent the terms');
    expect(done.outcome?.by).toBe('member-a');
  });

  it('refuses a tick with no account of what was done', () => {
    try {
      close(made(), 'done', '   ', 'member-a', AT);
      throw new Error('expected a refusal');
    } catch (e) {
      expect((e as Refused).reason).toBe('no_outcome_given');
    }
  });

  it('treats dropped as an outcome and keeps the record', () => {
    const dropped = close(made(), 'dropped', 'The board decided not to pursue it.', 'member-b', AT);
    expect(dropped.state).toBe('dropped');
    // Still there, still readable, still says who dropped it and why.
    expect(dropped.what).toBe(made().what);
    expect(dropped.outcome?.said).toMatch(/not to pursue/);
  });

  it('cannot be closed twice', () => {
    const done = close(made(), 'done', 'Done.', 'member-a', AT);
    try {
      close(done, 'dropped', 'Actually not.', 'member-b', AT);
      throw new Error('expected a refusal');
    } catch (e) {
      expect((e as Refused).reason).toBe('already_closed');
    }
  });
});

describe('overdue', () => {
  it('is open, and past the date the board set', () => {
    const u = made({ dueAt: '2026-09-25T00:00:00.000Z' });
    expect(overdue(u, '2026-09-24T00:00:00.000Z')).toBe(false);
    expect(overdue(u, '2026-09-26T00:00:00.000Z')).toBe(true);
  });

  it('stops once it is closed, whatever the date says', () => {
    const u = close(made({ dueAt: '2026-09-25T00:00:00.000Z' }), 'done', 'Done.', 'member-a', AT);
    expect(overdue(u, '2099-01-01T00:00:00.000Z')).toBe(false);
  });
});
