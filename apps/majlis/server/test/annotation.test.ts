import { describe, it, expect } from 'vitest';
import {
  mark,
  withdraw,
  locate,
  threads,
  summarise,
  Refused,
  type Annotation,
} from '../src/services/annotation.js';

/**
 * Notes in the margin of the papers.
 *
 * What these hold to: **a note is anchored to the words, not to a number**, so
 * a document that gains a paragraph does not silently move every note below it
 * onto the wrong sentence; **a note that has come loose says so** rather than
 * being deleted or quietly re-pointed; and **nothing here is deliberation**,
 * because a board arguing in the margins would have its reasoning scattered
 * across the documents it read instead of held under the matter it decided.
 */

const MEMBERS = [{ id: 'member-a' }, { id: 'member-b' }];

const TEXT = [
  'The institution owns the asset before selling it on.',
  '',
  'The price and the mark-up are both disclosed to the buyer, and neither is',
  'altered after the sale is struck.',
].join('\n');

const put = (over: Partial<Parameters<typeof mark>[0]> = {}) =>
  mark({
    id: 'note-1',
    boardId: 'demo-board',
    on: 'document',
    subjectId: 'murabaha',
    text: TEXT,
    quote: 'owns the asset before selling it on',
    said: 'Owns how? A warehouse receipt held for a minute is not ownership.',
    by: 'member-a',
    at: '2026-09-01T10:00:00.000Z',
    members: MEMBERS,
    ...over,
  });

describe('marking a passage', () => {
  it('keeps the words that were marked, not only where they were', () => {
    const note = put();
    expect(note.quote).toBe('owns the asset before selling it on');
    expect(note.at).toBeGreaterThan(0);
  });

  it('refuses a passage that is not in the document', () => {
    expect(() => put({ quote: 'the buyer may resell at any price' })).toThrow(Refused);
    try {
      put({ quote: 'the buyer may resell at any price' });
    } catch (e) {
      expect((e as Refused).reason).toBe('passage_not_in_the_document');
    }
  });

  /*
   * A selection dragged across a line break carries the break; the stored text
   * carries a single space. Refusing that is refusing a passage plainly there.
   */
  it('finds a passage the reader dragged across a line break', () => {
    const note = put({ quote: 'disclosed to the buyer, and neither is\naltered after the sale' });
    expect(note.at).toBeGreaterThan(0);
  });

  it('refuses a mark with no words, because that is a highlighter', () => {
    try {
      put({ said: '   ' });
      throw new Error('should have refused');
    } catch (e) {
      expect((e as Refused).reason).toBe('nothing_written');
    }
  });

  it('refuses a note on the whole document, which nobody can place', () => {
    try {
      put({ quote: '' });
      throw new Error('should have refused');
    } catch (e) {
      expect((e as Refused).reason).toBe('nothing_marked');
    }
  });

  it('refuses somebody who is not on this board', () => {
    try {
      put({ by: 'a-stranger' });
      throw new Error('should have refused');
    } catch (e) {
      expect((e as Refused).reason).toBe('not_on_this_board');
    }
  });
});

describe('replying', () => {
  it('inherits the passage, so one thread is about one sentence', () => {
    const note = put();
    const reply = mark({
      id: 'note-2',
      boardId: 'demo-board',
      on: 'proposal',
      subjectId: 'somewhere-else',
      text: 'a different document entirely',
      quote: 'nothing like the passage above',
      said: 'Constructive possession is enough under the standard we adopted.',
      by: 'member-b',
      at: '2026-09-01T11:00:00.000Z',
      members: MEMBERS,
      replyTo: note,
    });

    expect(reply.replyTo).toBe('note-1');
    expect(reply.quote).toBe(note.quote);
    expect(reply.subjectId).toBe(note.subjectId);
    expect(reply.on).toBe(note.on);
  });

  it('will not nest, so a margin does not become a forum', () => {
    const note = put();
    const reply = mark({
      id: 'note-2',
      boardId: 'demo-board',
      on: 'document',
      subjectId: 'murabaha',
      text: TEXT,
      quote: note.quote,
      said: 'Constructive possession is enough.',
      by: 'member-b',
      at: '2026-09-01T11:00:00.000Z',
      members: MEMBERS,
      replyTo: note,
    });

    try {
      mark({
        id: 'note-3',
        boardId: 'demo-board',
        on: 'document',
        subjectId: 'murabaha',
        text: TEXT,
        quote: note.quote,
        said: 'Under which standard?',
        by: 'member-a',
        at: '2026-09-01T12:00:00.000Z',
        members: MEMBERS,
        replyTo: reply,
      });
      throw new Error('should have refused');
    } catch (e) {
      expect((e as Refused).reason).toBe('replies_do_not_nest');
    }
  });
});

describe('withdrawing', () => {
  it('keeps the note and what it said', () => {
    const gone = withdraw(put(), 'member-a', '2026-09-02T09:00:00.000Z');
    expect(gone.withdrawn?.by).toBe('member-a');
    expect(gone.said).toContain('A warehouse receipt');
  });

  it('refuses somebody else, who would be editing what a colleague read', () => {
    try {
      withdraw(put(), 'member-b', '2026-09-02T09:00:00.000Z');
      throw new Error('should have refused');
    } catch (e) {
      expect((e as Refused).reason).toBe('not_your_note');
    }
  });

  it('refuses twice', () => {
    const gone = withdraw(put(), 'member-a', '2026-09-02T09:00:00.000Z');
    try {
      withdraw(gone, 'member-a', '2026-09-03T09:00:00.000Z');
      throw new Error('should have refused');
    } catch (e) {
      expect((e as Refused).reason).toBe('already_withdrawn');
    }
  });
});

describe('finding the passage again', () => {
  it('follows the words when the document gains a paragraph above them', () => {
    const note = put();
    const longer = 'A paragraph inserted before everything else.\n\n' + TEXT;

    const found = locate(note, longer);
    expect(found.adrift).toBe(false);
    expect(found.at).toBeGreaterThan(note.at);
    expect(longer.slice(found.at as number)).toContain('owns the asset before selling it on');
  });

  /*
   * The fault this whole design exists to prevent: an offset that still looks
   * correct while pointing at a different sentence.
   */
  it('points at the passage itself, never at what moved into its old place', () => {
    const note = put();
    const longer = 'A paragraph inserted before everything else.\n\n' + TEXT;
    expect(longer.slice(note.at, note.at + 10)).not.toBe(
      longer.slice(locate(note, longer).at as number, (locate(note, longer).at as number) + 10),
    );
  });

  it('says a note has come loose rather than moving it somewhere plausible', () => {
    const note = put();
    const rewritten = 'The institution may sell what it has contracted to buy.';

    const found = locate(note, rewritten);
    expect(found.adrift).toBe(true);
    expect(found.at).toBeNull();
    // Still carries what was marked, so the board can read what was meant.
    expect(found.annotation.quote).toBe('owns the asset before selling it on');
  });
});

describe('the threads on a document', () => {
  const note = put();
  const reply: Annotation = {
    id: 'note-2',
    boardId: 'demo-board',
    on: 'document',
    subjectId: 'murabaha',
    quote: note.quote,
    at: note.at,
    said: 'Constructive possession is enough under the standard we adopted.',
    by: 'member-b',
    atTime: '2026-09-01T11:00:00.000Z',
    replyTo: 'note-1',
  };
  const second = put({
    id: 'note-3',
    quote: 'altered after the sale is struck',
    said: 'Altered by whom?',
    at: '2026-09-01T12:00:00.000Z',
  });

  it('puts each reply under the note it answers, oldest first', () => {
    const out = threads([reply, second, note], TEXT);
    expect(out.map((t) => t.note.annotation.id)).toEqual(['note-1', 'note-3']);
    expect(out[0].replies.map((r) => r.id)).toEqual(['note-2']);
    expect(out[1].replies).toEqual([]);
  });

  it('keeps a withdrawn note in its place, so its replies still answer something', () => {
    const gone = withdraw(note, 'member-a', '2026-09-02T09:00:00.000Z');
    const out = threads([reply, gone], TEXT);
    expect(out).toHaveLength(1);
    expect(out[0].note.annotation.withdrawn).toBeTruthy();
    expect(out[0].replies).toHaveLength(1);
  });

  it('counts what stands, what was withdrawn, and what has come loose', () => {
    const gone = withdraw(second, 'member-a', '2026-09-02T09:00:00.000Z');
    const s = summarise([note, reply, gone], TEXT);

    expect(s.standing).toBe(2);
    expect(s.withdrawn).toBe(1);
    expect(s.adrift).toBe(0);
    expect(s.by).toEqual(['member-a', 'member-b']);
  });

  it('counts a note whose passage is gone as adrift', () => {
    const s = summarise([note], 'The institution may sell what it has contracted to buy.');
    expect(s.adrift).toBe(1);
  });
});
