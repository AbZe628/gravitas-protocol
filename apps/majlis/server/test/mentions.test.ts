import { describe, it, expect } from 'vitest';
import {
  allIn,
  mentionedIn,
  noteFor,
  outstandingFor,
  segmentsOf,
  threadFor,
} from '../src/services/mentions.js';
import { attentionList } from '../src/services/attention.js';
import type { Board, Deliberation, Matter, Rule } from '../src/types.js';

const board: Board = {
  id: 'b', institutionId: 'inst', name: 'Board',
  quorumPermit: 3, quorumRestrict: 2, totalSignatories: 3, ratificationWindowHours: 168,
  members: [
    { id: 's1', name: 'Mufti One', title: 'Chair', board: 'b', signatory: true },
    { id: 's2', name: 'Shaykh Two', title: 'Member', board: 'b', signatory: true },
    { id: 'liaison-1', name: 'The Liaison', title: 'Technical', board: 'b', signatory: false },
  ],
};

const rule: Rule = {
  id: 'r', boardId: 'b', title: '', statement: '', parameters: [],
  parameterHash: '0x0', version: 1, inForceFrom: null,
  supersededBy: null, supersedes: null, sources: [],
};

const T = (h: number) => new Date(Date.UTC(2026, 8, 4, h)).toISOString();

function say(id: string, scholarId: string, body: string, hour: number): Deliberation {
  return { id, scholarId, body, at: T(hour), replyTo: null, liaisonAnswer: false };
}

function matter(deliberation: Deliberation[], over: Partial<Matter> = {}): Matter {
  return {
    id: 'm1', boardId: 'b', title: 'A matter', origin: 'institution_request',
    direction: 'permit', status: 'deliberation', openedAt: T(0),
    proposal: '', notDecided: [], mechanism: '', interactsWith: [],
    proposedRule: rule, simulation: null, deliberation, reasoning: [],
    timelockStartedAt: null, timelockEndsAt: null, objections: [],
    inForceAt: null, sources: [],
    ...over,
  };
}

describe('who was named', () => {
  it('finds a member of this board', () => {
    expect(mentionedIn('Does @liaison-1 agree the registry reverts?', board)).toEqual(['liaison-1']);
  });

  it('finds several, and each once however often they appear', () => {
    const found = mentionedIn('@s1 and @s2, and @s1 again', board);
    expect(found.sort()).toEqual(['s1', 's2']);
  });

  it('ignores anything that is not somebody on this board', () => {
    // A typo naming nobody, and a handle from another system, are text.
    expect(mentionedIn('@nobody wrote to me at @example.com about @s3', board)).toEqual([]);
  });

  it('does not treat an email address as naming its local part', () => {
    expect(mentionedIn('write to treasury@s1.example', board)).toEqual([]);
  });

  it('finds nothing in an empty body', () => {
    expect(mentionedIn('', board)).toEqual([]);
  });
});

describe('a mention stands until the member speaks after it', () => {
  it('is outstanding where they have not been back', () => {
    const m = matter([say('d1', 's1', 'Does @s2 agree?', 1)]);
    expect(outstandingFor('s2', m, board).map((x) => x.deliberationId)).toEqual(['d1']);
  });

  it('stops standing once they say something later', () => {
    const m = matter([
      say('d1', 's1', 'Does @s2 agree?', 1),
      say('d2', 's2', 'It does, for the reason given.', 2),
    ]);
    expect(outstandingFor('s2', m, board)).toEqual([]);
  });

  it('stands again where they were named after they last spoke', () => {
    const m = matter([
      say('d1', 's1', 'Does @s2 agree?', 1),
      say('d2', 's2', 'It does.', 2),
      say('d3', 's1', 'And on the second point, @s2?', 3),
    ]);
    expect(outstandingFor('s2', m, board).map((x) => x.deliberationId)).toEqual(['d3']);
  });

  it('answers every earlier mention at once, which is what a conversation does', () => {
    const m = matter([
      say('d1', 's1', '@s2 on the first point', 1),
      say('d2', 'liaison-1', '@s2 on the second', 2),
      say('d3', 's2', 'Both are answered as follows.', 3),
    ]);
    expect(outstandingFor('s2', m, board)).toEqual([]);
  });

  it('does not count naming yourself', () => {
    const m = matter([say('d1', 's2', 'As @s2 said earlier', 1)]);
    expect(outstandingFor('s2', m, board)).toEqual([]);
  });

  it('carries what they were asked, not only that they were', () => {
    const m = matter([say('d1', 's1', 'Does @s2 agree the ratio is measured at each transaction?', 1)]);
    const [mention] = outstandingFor('s2', m, board);

    expect(mention.by).toBe('s1');
    expect(mention.body).toContain('measured at each transaction');
  });
});

describe('what the interface is told about a mention', () => {
  it('names who asked, and says it is not a step the process waits on', () => {
    const m = matter([say('d1', 's1', 'Does @s2 agree?', 1)]);
    const note = noteFor(outstandingFor('s2', m, board)[0], board);

    expect(note).toContain('Mufti One');
    expect(note).toContain('a colleague asking');
    expect(note).toContain('nothing lapses');
  });
});

describe('the deliberation as segments, parsed once and on the server', () => {
  it('splits a name out of the text around it', () => {
    const parts = segmentsOf('Does @s2 agree?', board);
    expect(parts.map((p) => p.text)).toEqual(['Does ', '@s2', ' agree?']);
    expect(parts[1].scholarId).toBe('s2');
    expect(parts[0].scholarId).toBeUndefined();
  });

  it('leaves an unknown name as ordinary text', () => {
    const parts = segmentsOf('Does @nobody agree?', board);
    expect(parts).toHaveLength(1);
    expect(parts[0].scholarId).toBeUndefined();
  });

  it('rebuilds the body exactly, so nothing is lost in the rendering', () => {
    const body = '@s1 and @s2 — the liaison (@liaison-1) should see this too.';
    expect(segmentsOf(body, board).map((p) => p.text).join('')).toBe(body);
  });

  it('handles a body that is only a name', () => {
    expect(segmentsOf('@s1', board)).toEqual([{ text: '@s1', scholarId: 's1' }]);
  });
});

describe('reading the thread', () => {
  it('lists every mention in a matter with who was named', () => {
    const m = matter([say('d1', 's1', '@s2 and @liaison-1', 1)]);
    expect(allIn(m, board).map((x) => x.named).sort()).toEqual(['liaison-1', 's2']);
  });

  it('gives one member their own mentions, newest first', () => {
    const m = matter([
      say('d1', 's1', 'First, @s2', 1),
      say('d2', 's1', 'Second, @s2', 3),
      say('d3', 's1', 'Not about you', 2),
    ]);
    expect(threadFor('s2', m, board).map((d) => d.id)).toEqual(['d2', 'd1']);
  });
});

describe('a mention reaches the member through attention, which is where they look', () => {
  it('appears on their list', () => {
    const m = matter([say('d1', 's1', 'Does @s2 agree?', 1)]);
    const items = attentionList([board], [m], { scholarId: 's2', now: T(4) });

    const mention = items.find((i) => i.kind === 'mentioned_you');
    expect(mention?.matterId).toBe('m1');
    // No clock. Being asked is not a deadline.
    expect(mention?.deadline).toBeNull();
    expect(mention?.overdue).toBe(false);
  });

  it('does not appear on anybody else’s', () => {
    const m = matter([say('d1', 's1', 'Does @s2 agree?', 1)]);
    const items = attentionList([board], [m], { scholarId: 'liaison-1', now: T(4) });
    expect(items.some((i) => i.kind === 'mentioned_you')).toBe(false);
  });

  it('is listed alongside the duty rather than instead of it', () => {
    // The question is very often why the vote has not been cast, so showing
    // only the duty would hide the reason for it.
    const m = matter(
      [say('d1', 's1', 'Before you vote — @s2, does the ratio hold?', 1)],
      { status: 'voting' },
    );
    const kinds = attentionList([board], [m], { scholarId: 's2', now: T(4) }).map((i) => i.kind);

    expect(kinds).toContain('awaiting_your_vote');
    expect(kinds).toContain('mentioned_you');
  });

  it('is one item however many entries name them, and says how many', () => {
    const m = matter([
      say('d1', 's1', '@s2 on the first point', 1),
      say('d2', 'liaison-1', '@s2 on the second', 2),
    ]);
    const mentions = attentionList([board], [m], { scholarId: 's2', now: T(4) }).filter(
      (i) => i.kind === 'mentioned_you',
    );

    expect(mentions).toHaveLength(1);
    expect(mentions[0].note).toContain('2 entries name you');
  });

  it('goes once they have answered', () => {
    const m = matter([
      say('d1', 's1', 'Does @s2 agree?', 1),
      say('d2', 's2', 'It does, for this reason.', 2),
    ]);
    const items = attentionList([board], [m], { scholarId: 's2', now: T(4) });
    expect(items.some((i) => i.kind === 'mentioned_you')).toBe(false);
  });

  it('says nothing that reads as an instruction', () => {
    const m = matter([say('d1', 's1', 'Does @s2 agree?', 1)]);
    const items = attentionList([board], [m], { scholarId: 's2', now: T(4) });
    const mention = items.find((i) => i.kind === 'mentioned_you')!;

    // The prose, not the whole payload: 'overdue' is a field on every item and
    // is false here, which is the record being precise rather than pushy.
    for (const phrase of ['you must', 'required to', 'failure to', 'is overdue']) {
      expect(mention.note.toLowerCase()).not.toContain(phrase);
    }
    expect(mention.overdue).toBe(false);
  });
});
