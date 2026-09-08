import { describe, it, expect } from 'vitest';
import { readContract } from '../src/services/reading-a-contract.js';
import { structures } from '../src/data/structures.js';
import type { Structure } from '../src/types.js';

/**
 * Reading a contract against the board's own conditions.
 *
 * The line every one of these holds is the same line: **it finds, and it never
 * judges.** The AI advisers this competes with return compliant, partially
 * compliant or non-compliant. That verdict is a ruling, it belongs to the
 * board, and nothing here may produce one however convenient it would be.
 */

const AT = '2026-09-20T00:00:00.000Z';

function shape(over: Partial<Structure> = {}): Structure {
  const murabaha = structures.find((s) => s.id === 'murabaha');
  if (!murabaha) throw new Error('the seeded library no longer carries murabaha');
  return { ...murabaha, ...over };
}

const read = (text: string, adopted = true, structure = shape()) =>
  readContract({ structure, adopted, text, readAt: AT });

describe('what it will never produce', () => {
  it('has no verdict of any kind', () => {
    const r = read('The Seller acquires the Asset and sells it to the Buyer at cost plus a disclosed profit.');

    const everything = JSON.stringify(r).toLowerCase();
    for (const word of ['compliant', 'non-compliant', 'approved', 'passes', 'fails', 'score']) {
      expect(everything, `a verdict leaked into the reading: ${word}`).not.toContain(word);
    }
    // And no condition may come back as met. `met` is a scholar's finding.
    for (const c of r.conditions) expect(['found', 'unclear', 'absent']).toContain(c.standing);
  });

  it('never returns an empty list of limits', () => {
    /*
     * There has never been a machine reading of a contract with nothing it
     * could not do. A limits list that came back empty would be the most
     * misleading thing this file could produce.
     */
    expect(read('Anything at all, as long as it is a sentence.').limits.length).toBeGreaterThan(0);
  });

  it('says a condition about the order of events needs a person, whatever it found', () => {
    const sequence = shape({
      conditions: [
        {
          id: 'order',
          requirement: 'The seller must acquire ownership of the asset before selling it onward.',
          why: 'Selling what one does not own.',
          evidence: 'sequence',
        },
      ],
    });

    // Every word is present, and it still says a person has to read it.
    const r = read(
      'The Seller shall acquire ownership of the asset before selling it onward to the Buyer.',
      true,
      sequence,
    );

    expect(r.conditions[0].needsAPerson).toBe(true);
    expect(r.conditions[0].note).toMatch(/order two things happen in|order the/i);
    expect(r.limits.join(' ')).toMatch(/order events happen in/i);
  });
});

describe('where something was found', () => {
  it('carries the sentence it was found in, and where it starts', () => {
    const one = shape({
      conditions: [
        {
          id: 'disclosure',
          requirement: 'The cost and the profit must be disclosed to the buyer.',
          why: 'A sale at an undisclosed markup is not a murabaha.',
          evidence: 'document',
        },
      ],
    });

    const text =
      'This agreement is made between the parties. The cost and the profit shall be disclosed to the buyer in writing.';
    const r = read(text, true, one);

    expect(r.conditions[0].standing).toBe('found');
    expect(r.conditions[0].passages[0].text).toContain('disclosed to the buyer');
    // The offset points at the sentence, so a screen can scroll rather than search.
    expect(text.slice(r.conditions[0].passages[0].at)).toMatch(/^The cost and the profit/);
  });

  it('says a condition is absent when its words appear nowhere', () => {
    const one = shape({
      conditions: [
        {
          id: 'insurance',
          requirement: 'Takaful cover must be arranged over the asset.',
          why: 'Loss falls on the owner.',
          evidence: 'document',
        },
      ],
    });

    const r = read('An entirely unrelated agreement about the lease of an office.', true, one);
    expect(r.conditions[0].standing).toBe('absent');
    expect(r.conditions[0].passages).toHaveLength(0);
  });

  it('says unclear rather than choosing, when the words are scattered', () => {
    const one = shape({
      conditions: [
        {
          id: 'possession',
          requirement:
            'Constructive possession of the asset must pass to the seller together with the risk of its destruction.',
          why: 'Risk follows ownership.',
          evidence: 'document',
        },
      ],
    });

    // Two of the words, in a definitions line, and nothing that reads as a clause.
    const r = read('In this agreement, "possession" and "destruction" bear their ordinary meanings.', true, one);
    expect(r.conditions[0].standing).toBe('unclear');
    expect(r.conditions[0].note).toMatch(/scattered|definitions/i);
  });

  it('quotes at most three places, so a screen is not buried', () => {
    const one = shape({
      conditions: [
        {
          id: 'profit',
          requirement: 'The profit must be disclosed.',
          why: 'Transparency of the markup.',
          evidence: 'document',
        },
      ],
    });

    const text = Array.from({ length: 9 }, () => 'The profit shall be disclosed to the buyer.').join(' ');
    expect(read(text, true, one).conditions[0].passages.length).toBeLessThanOrEqual(3);
  });
});

describe('the board’s own words, not ours', () => {
  it('searches for the terms the condition itself uses', () => {
    /*
     * A board that adopts a shape and rewrites a condition in its own words
     * should be searched for in those words. Nothing here keeps a vocabulary
     * of its own to match against.
     */
    const rewritten = shape({
      conditions: [
        {
          id: 'own',
          requirement: 'A khiyar option must be granted to the purchaser for three days.',
          why: 'The board wrote it this way.',
          evidence: 'document',
        },
      ],
    });

    const r = read('A khiyar option is granted to the purchaser for three days after delivery.', true, rewritten);
    expect(r.conditions[0].standing).toBe('found');
  });

  it('says so when the shape is the shipped draft rather than the board’s own', () => {
    expect(read('Some text here about a sale.', false).limits.join(' ')).toMatch(
      /has not adopted this shape/i,
    );
  });
});

describe('a file nothing could be read out of', () => {
  it('says so rather than reporting every condition as absent and stopping', () => {
    const r = read('');
    expect(r.charactersRead).toBe(0);
    expect(r.limits.join(' ')).toMatch(/if it is a scan/i);
    // The conditions still come back, all absent — but the limit above is what
    // stops a board reading that as "this contract answers nothing".
    expect(r.conditions.every((c) => c.standing === 'absent')).toBe(true);
  });
});
