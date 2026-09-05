import { describe, it, expect } from 'vitest';
import { buildCarrying } from '../src/services/carrying.js';
import type { EnforcementSnapshot } from '../src/services/enforcement.js';
import type { Matter } from '../src/types.js';

/**
 * What happens to these terms once the board has ruled.
 *
 * The sentence this exists to put in front of a scholar is *"read before every
 * transaction that depends on them"*, because it is the difference between the
 * fatwa they have written a hundred times and the one they are writing here.
 * What is held below is that the sentence is only said where it is true, that
 * the honest case is served as well as the impressive one, and that nothing
 * anywhere says the threshold is the right threshold.
 */

const matter = (params: { key: string; value: string; meaning: string; unit?: string }[] = []): Matter =>
  ({
    id: 'm1',
    proposedRule: { id: 'r', boardId: 'b', title: 't', statement: '', parameters: params },
  }) as unknown as Matter;

const TERMS = [
  {
    key: 'minTangibleRatioBps',
    value: '5100',
    unit: 'basis points',
    meaning: 'Tangible assets and usufructs must be at least 51.00% of pool value.',
  },
  {
    key: 'onBreach',
    value: 'block_secondary_market_trades',
    meaning: 'While the proportion is below the threshold, secondary transfers do not execute.',
  },
];

const attached = (over: Partial<EnforcementSnapshot> = {}): EnforcementSnapshot => ({
  kind: 'gravitas-registry',
  configured: true,
  readAt: '2026-09-05T00:00:00.000Z',
  label: 'the Gravitas Policy Registry',
  reachable: true,
  paused: false,
  ...over,
});

const none = (): EnforcementSnapshot => ({
  kind: 'none',
  configured: false,
  readAt: '2026-09-05T00:00:00.000Z',
});

describe('the sentence a scholar most needs', () => {
  it('says the terms are read before every transaction where something reads them', () => {
    const c = buildCarrying(matter(TERMS), attached());

    expect(c.cadence).toBe('before_every_transaction');
    expect(c.whenChecked).toContain('before every transaction');
    // Refused at the point of attempt, not found at the audit.
    expect(c.whenChecked).toContain('rather than found afterwards');
  });

  it('says there is no interval to drift in, which is the point of it', () => {
    const c = buildCarrying(matter(TERMS), attached());

    expect(c.drift).toContain('no interval to drift in');
    // And leaves the board the question that is actually theirs.
    expect(c.drift).toContain('What the board still decides');
  });

  it('names the carrier in its own words rather than as a kind', () => {
    expect(buildCarrying(matter(TERMS), attached()).carrier).toBe('the Gravitas Policy Registry');
  });
});

describe('the honest case, which is the common one', () => {
  it('does not claim continuous checking where nothing is attached', () => {
    const c = buildCarrying(matter(TERMS), none());

    expect(c.attached).toBe(false);
    expect(c.cadence).toBe('when_someone_looks');
    expect(c.whenChecked).not.toContain('before every transaction');
  });

  it('calls it the ordinary arrangement rather than a missing piece', () => {
    const c = buildCarrying(matter(TERMS), none());

    // A bank with no chain anywhere near it is the larger market, and its
    // installation is not a degraded one.
    expect(c.whenChecked).toContain('ordinary arrangement rather than a missing piece');
  });

  it('names the interval a breach could live in, rather than glossing it', () => {
    const c = buildCarrying(matter(TERMS), none());

    expect(c.drift).toContain('a breach can stand for a quarter');
    // And says it is the board's to decide about rather than an assumption.
    expect(c.drift).toContain('belongs in the ruling rather than in an assumption');
  });

  it('says Majlis cannot see whether anything carried it out', () => {
    const c = buildCarrying(matter(TERMS), none());
    expect(c.limits.join(' ')).toContain('cannot see whether anything else did');
  });
});

describe('attached but not answering is not the same as nothing attached', () => {
  it('keeps the cadence and puts the doubt in the limits', () => {
    const c = buildCarrying(matter(TERMS), attached({ reachable: false, error: 'network timeout' }));

    /*
     * Reporting an unreachable registry as unenforced would tell a board its
     * conditions are not being applied when they may be running perfectly
     * behind a network fault. The configured fact stands; our confidence in it
     * is what changed, and that goes in the limits.
     */
    expect(c.cadence).toBe('before_every_transaction');
    expect(c.limits[0]).toContain('could not be read just now');
    expect(c.limits[0]).toContain('network timeout');
    expect(c.limits[0]).toContain('not a confirmation that it is doing it');
  });

  it('says plainly that a paused registry is applying nothing', () => {
    const c = buildCarrying(matter(TERMS), attached({ paused: true }));

    expect(c.limits[0]).toContain('is paused');
    expect(c.limits[0]).toContain('not applying these terms to anything');
  });

  it('says a decision here does not itself change what is enforced', () => {
    const c = buildCarrying(matter(TERMS), attached());

    // Majlis records; it does not execute. The vote is not yet the signature.
    expect(c.limits.join(' ')).toContain('does not itself change what is enforced');
  });
});

describe('the terms come from the board', () => {
  it('carries each term’s meaning unrewritten', () => {
    const c = buildCarrying(matter(TERMS), attached());

    expect(c.terms).toHaveLength(2);
    expect(c.terms[0].meaning).toBe(TERMS[0].meaning);
    expect(c.terms[0].unit).toBe('basis points');
  });

  it('puts the consequence beside the threshold rather than beside itself', () => {
    const oddlyNamed = buildCarrying(
      matter([
        TERMS[0],
        { key: 'onFailure', value: 'suspend_trading', meaning: 'Trading suspends immediately.' },
      ]),
      attached(),
    );

    /*
     * The scholar reading the threshold is the one who needs to know what
     * happens when it is not met. Attaching it to the breach term instead made
     * the screen print the same sentence twice in a row.
     *
     * And it is found from the value, not the key: a board that named its
     * breach term differently is served the same, because reading intent out
     * of a name is the inference drift.ts refuses to make.
     */
    expect(oddlyNamed.terms[0].onBreach).toBe('Trading suspends immediately.');
    expect(oddlyNamed.terms[1].onBreach).toBeNull();
  });

  it('leaves the threshold alone where no term says what a breach does', () => {
    const c = buildCarrying(matter([TERMS[0]]), attached());
    expect(c.terms[0].onBreach).toBeNull();
  });

  it('handles a matter with no terms at all', () => {
    const c = buildCarrying(matter([]), attached());
    expect(c.terms).toEqual([]);
    // The cadence is still a fact about the installation, not about this matter.
    expect(c.cadence).toBe('before_every_transaction');
  });
});

describe('it describes what will happen, never whether it is right', () => {
  it('says nothing that reads as a ruling on the threshold', () => {
    const both = [buildCarrying(matter(TERMS), attached()), buildCarrying(matter(TERMS), none())];

    for (const c of both) {
      // The board's own term meanings are carried verbatim and are exempt —
      // they are the board ruling. What is scanned is this file's own prose.
      const ours = [c.whenChecked, c.drift, ...c.limits].join(' ');

      expect(/\b(?:is|are)\s+(?:therefore\s+)?(?:permissible|impermissible|compliant|halal)\b/i.test(ours)).toBe(
        false,
      );
      expect(/\bcorrect threshold\b/i.test(ours)).toBe(false);
      expect(/\bshould\s+(?:set|choose|approve)\b/i.test(ours)).toBe(false);
    }
  });

  it('has no field that would carry a verdict', () => {
    const keys = Object.keys(buildCarrying(matter(TERMS), attached()));
    for (const forbidden of ['permissible', 'compliant', 'approved', 'safe', 'ok']) {
      expect(keys.some((k) => k.toLowerCase().includes(forbidden))).toBe(false);
    }
  });
});

describe('the prose is prose', () => {
  it('carries no markdown, because nothing renders it', () => {
    const both = [buildCarrying(matter(TERMS), attached()), buildCarrying(matter(TERMS), none())];

    /*
     * Found on the screen: asterisks printed as asterisks. Emphasis is the
     * interface's job rather than the record's, and the badge above the
     * sentence already carries it.
     */
    for (const c of both) {
      for (const line of [c.whenChecked, c.drift, ...c.limits]) {
        expect(line).not.toMatch(/\*\*|__|\[.+\]\(.+\)/);
      }
    }
  });
});
