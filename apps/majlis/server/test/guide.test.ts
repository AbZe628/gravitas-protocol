import { describe, it, expect } from 'vitest';
import { askTheGuide, guideTopics, NOT_A_RULING } from '../src/services/guide.js';

/**
 * The guide to using Majlis, and the one question it will not answer.
 *
 * The complaint it exists for: an application full of good solutions nobody
 * will ever discover. It knows about **Majlis** — what a screen is for, what a
 * word means, what an act does — which is knowledge this codebase has and a
 * model would be guessing at. So it is instant, identical every time, and works
 * in the installations that have no assistant, which is most of them.
 */

describe('it explains the application', () => {
  it('answers what a matter is', () => {
    const a = askTheGuide('what is a matter');
    expect(a.topic).toBe('matter');
    expect(a.answer).toContain('one question put to the board');
  });

  it('answers in the words somebody would actually use', () => {
    // Not the vocabulary of the codebase. Somebody asks how to start, not how
    // to instantiate a draft.
    expect(askTheGuide('how do I start something new').topic).toBe('start');
    expect(askTheGuide('what happened to this last time').topic).toBe('inherit');
    expect(askTheGuide('who can vote here').topic).toBe('roles');
  });

  it('explains a figure a reader is looking at', () => {
    expect(askTheGuide('what does drifted mean').topic).toBe('drift');
    expect(askTheGuide('what is the quorum').topic).toBe('quorum');
  });

  it('points at where the thing is, where it is somewhere', () => {
    const a = askTheGuide('show me the register');
    expect(a.goTo?.path).toBe('/register');
  });

  it('offers what a reader is likely to want next', () => {
    expect(askTheGuide('what is a timelock').seeAlso).toContain('direction');
  });

  it('says plainly when it does not know', () => {
    const a = askTheGuide('what is the weather in Dubai');
    expect(a.topic).toBeNull();
    expect(a.answer).toContain('does not know about that');
    // And says where the other two kinds of question go.
    expect(a.answer).toContain('goes to the board');
  });

  it('matches whole words, so it does not answer the wrong question', () => {
    // `vote` inside `devoted` is not a question about voting.
    expect(askTheGuide('a devoted reader').topic).not.toBe('vote');
  });
});

describe('it never answers whether something is permissible', () => {
  const seeking = [
    'is this halal',
    'is a leveraged token permissible',
    'would that be haram?',
    'can we approve this',
    'should we vote for it',
    'what do scholars say about tawarruq',
    'is USDC shariah-compliant',
  ];

  it('refuses every phrasing of it', () => {
    for (const question of seeking) {
      const a = askTheGuide(question);
      expect(a.refused, `not refused: ${question}`).toBe(true);
      expect(a.answer).toBe(NOT_A_RULING.en);
    }
  });

  it('refuses before it matches anything, so a topic never leaks one', () => {
    /*
     * "is this murabaha permissible" contains words that would otherwise match
     * the checklist topic. The gate runs first and without exception, exactly
     * as the assistant's does.
     */
    const a = askTheGuide('is this murabaha structure permissible');
    expect(a.refused).toBe(true);
    expect(a.topic).toBeNull();
  });

  it('offers what it can properly do instead of stopping', () => {
    // A refusal that is a dead end teaches nobody where the question goes.
    expect(NOT_A_RULING.en).toContain('record your position with your reasoning');
  });

  it('still answers a mechanical question containing the same words', () => {
    // "permitting" is a direction, not a ruling, and the guide must stay useful.
    expect(askTheGuide('what does permitting mean here').refused).toBe(false);
    expect(askTheGuide('what does permitting mean here').topic).toBe('direction');
  });
});

describe('every topic is offerable', () => {
  it('lists them, so an interface need not demand a question', () => {
    const topics = guideTopics();
    expect(topics.length).toBeGreaterThan(10);
    expect(topics.every((t) => t.id && t.answer.length > 40)).toBe(true);
  });
});

/**
 * The guide answers in the language it was asked in.
 *
 * Until it did, a scholar reading the Arabic interface asked in Arabic and got
 * an answer in English. The terms already matched in three scripts and the
 * refusal already fired in three scripts; the answers were the half that had
 * been left behind, which is the half a reader actually reads.
 */
describe('the language it answers in', () => {
  it('answers in the language it was asked in', () => {
    const en = askTheGuide('timelock', 'en').answer;
    const ar = askTheGuide('timelock', 'ar').answer;
    const ur = askTheGuide('timelock', 'ur').answer;

    expect(en).not.toBe(ar);
    expect(ar).not.toBe(ur);
    expect(ar).toMatch(/[\u0600-\u06FF]/);
    expect(ur).toMatch(/[\u0600-\u06FF]/);
  });

  it('refuses a ruling request in the language it was asked in', () => {
    const refused = askTheGuide('هل هذا جائز', 'ar');
    expect(refused.refused).toBe(true);
    expect(refused.answer).toMatch(/[\u0600-\u06FF]/);
    expect(refused.answer).not.toMatch(/[A-Za-z]{6,}/);
  });

  /*
   * A guide that answered in Arabic and then labelled the way onward in
   * English would send a reader looking for a screen whose name they had not
   * been given.
   */
  it('names the way onward in the same language', () => {
    const ar = askTheGuide('matter', 'ar');
    expect(ar.goTo).not.toBeNull();
    expect(ar.goTo?.label).toMatch(/[\u0600-\u06FF]/);
    expect(ar.goTo?.path).toBe('/');
  });

  it('falls back to English rather than to an empty panel', () => {
    // Every topic must answer in every language, so this is a guard on the
    // data rather than on the fallback: a missing translation is a bug here.
    for (const lang of ['en', 'ar', 'ur'] as const) {
      for (const topic of guideTopics(lang)) {
        expect(topic.answer.trim().length).toBeGreaterThan(20);
      }
    }
  });

  it('says every answer in all three languages, none of them the English twice', () => {
    const en = new Map(guideTopics('en').map((t) => [t.id, t.answer]));
    for (const lang of ['ar', 'ur'] as const) {
      const same = guideTopics(lang).filter((t) => t.answer === en.get(t.id));
      expect({ lang, same: same.map((t) => t.id) }).toEqual({ lang, same: [] });
    }
  });
});
