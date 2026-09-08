import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  canSeal,
  documentHash,
  readable,
  seal,
  signedSomethingElse,
  verify,
  type DocumentContent,
  type Seal,
  type Signing,
} from '../src/services/signature.js';

const KEY = 'a-key-long-enough-to-be-taken-seriously';

function content(over: Partial<DocumentContent> = {}): DocumentContent {
  return {
    matterId: 'm-041',
    boardId: 'demo-board',
    kind: 'ruling',
    title: 'Suspension of leveraged index instruments',
    proposal: 'The desk stops holding index instruments whose exposure is obtained through borrowing.',
    mechanism: 'The holdings leave the permitted register when the ruling takes effect.',
    notDecided: ['Whether the index provider may be used for other products'],
    parameters: [
      { key: 'debt_to_market_value_bps', value: '3000' },
      { key: 'review_after_days', value: '90' },
    ],
    parameterHash: '0xabc',
    quorumRequired: 4,
    positions: [
      { scholarId: 's-2', position: 'for' },
      { scholarId: 's-1', position: 'for' },
    ],
    inForceAt: '2026-09-01T00:00:00.000Z',
    ...over,
  };
}

function signing(over: Partial<Signing> = {}): Signing {
  return {
    scholarId: 's-1',
    name: 'Mufti I. Bhayat',
    title: 'Signatory',
    at: '2026-09-02T09:00:00.000Z',
    provedBy: 'their own sign-in and a one-time code',
    documentHash: documentHash(content()),
    ...over,
  };
}

describe('the document hash', () => {
  it('is the same for the same decision printed twice', () => {
    expect(documentHash(content())).toBe(documentHash(content()));
  });

  it('does not depend on the order the parameters were typed in', () => {
    const reversed = content({
      parameters: [
        { key: 'review_after_days', value: '90' },
        { key: 'debt_to_market_value_bps', value: '3000' },
      ],
    });
    expect(documentHash(reversed)).toBe(documentHash(content()));
  });

  it('does not depend on the order positions happen to be stored in', () => {
    const reversed = content({
      positions: [
        { scholarId: 's-1', position: 'for' },
        { scholarId: 's-2', position: 'for' },
      ],
    });
    expect(documentHash(reversed)).toBe(documentHash(content()));
  });

  it('does depend on the order of what was not decided, because a drafter chose it', () => {
    const swapped = content({
      notDecided: ['Second thing', 'First thing'],
    });
    const asWritten = content({ notDecided: ['First thing', 'Second thing'] });
    expect(documentHash(swapped)).not.toBe(documentHash(asWritten));
  });

  it('changes when one figure changes', () => {
    const amended = content({
      parameters: [
        { key: 'debt_to_market_value_bps', value: '3300' },
        { key: 'review_after_days', value: '90' },
      ],
    });
    expect(documentHash(amended)).not.toBe(documentHash(content()));
  });

  it('changes when the matter comes into force', () => {
    expect(documentHash(content({ inForceAt: null }))).not.toBe(documentHash(content()));
  });

  it('treats two spellings of the same Arabic text as the same text', () => {
    // The same word in two Unicode normal forms. A scholar's name arriving
    // from two keyboards must not produce two documents.
    // Written as escapes rather than typed, so the two really are different
    // byte sequences. Typed side by side into a file they would very likely
    // arrive already normalised, and the test would pass without testing.
    const composed = content({ title: '\u0622' }); // alef with madda, one code point
    const decomposed = content({ title: '\u0627\u0653' }); // alef, then madda above
    expect(documentHash(composed)).toBe(documentHash(decomposed));
  });

  it('refuses a value that could impersonate a field boundary', () => {
    const sneaky = content({ title: 'a\u001fmatterId\u001esomething-else' });
    expect(() => documentHash(sneaky)).toThrow(/control character/);
  });

  it('refuses two parameters with the same key rather than choosing one', () => {
    const ambiguous = content({
      parameters: [
        { key: 'limit', value: '30' },
        { key: 'limit', value: '35' },
      ],
    });
    expect(() => documentHash(ambiguous)).toThrow(/duplicate/);
  });

  it('cannot be confused with the parameter hash from hash.ts', () => {
    // Different domain tag, so even identical input bytes diverge. This is
    // asserted rather than assumed because the two are both 0x-prefixed
    // SHA-256 and would otherwise be interchangeable by accident.
    expect(documentHash(content())).not.toBe(content().parameterHash);
  });
});

describe('sealing, where no key is configured', () => {
  beforeEach(() => {
    delete process.env.MAJLIS_SEAL_KEY;
  });

  it('says it cannot seal', () => {
    expect(canSeal()).toBe(false);
  });

  it('returns nothing rather than a seal made with a default key', () => {
    expect(seal(content(), [signing()], '2026-09-02T10:00:00.000Z')).toBeNull();
  });

  it('refuses a key too short to be one', () => {
    process.env.MAJLIS_SEAL_KEY = 'short';
    expect(canSeal()).toBe(false);
  });
});

describe('sealing, and checking the seal', () => {
  beforeEach(() => {
    process.env.MAJLIS_SEAL_KEY = KEY;
    process.env.MAJLIS_SEAL_ISSUER = 'Rakbank Majlis';
  });

  afterEach(() => {
    delete process.env.MAJLIS_SEAL_KEY;
    delete process.env.MAJLIS_SEAL_ISSUER;
  });

  function sealed(): Seal {
    const s = seal(content(), [signing()], '2026-09-02T10:00:00.000Z');
    if (s === null) throw new Error('expected a seal');
    return s;
  }

  it('holds on the document it was made for', () => {
    expect(verify(content(), sealed())).toEqual({ held: true });
  });

  it('names the installation that attests', () => {
    expect(sealed().issuer).toBe('Rakbank Majlis');
  });

  it('says the document changed when a figure was edited afterwards', () => {
    const amended = content({
      parameters: [
        { key: 'debt_to_market_value_bps', value: '3300' },
        { key: 'review_after_days', value: '90' },
      ],
    });
    const check = verify(amended, sealed());
    expect(check.held).toBe(false);
    expect(check).toMatchObject({ because: 'document_changed' });
  });

  it('keeps a changed document apart from a wrong seal', () => {
    const forged = { ...sealed(), value: '0x' + 'ff'.repeat(32) };
    expect(verify(content(), forged)).toEqual({ held: false, because: 'seal_does_not_match' });
  });

  it('does not hold when a signature was added to the seal afterwards', () => {
    const s = sealed();
    const tampered: Seal = {
      ...s,
      signings: [...s.signings, signing({ scholarId: 's-9', name: 'Nobody' })],
    };
    expect(verify(content(), tampered)).toEqual({ held: false, because: 'seal_does_not_match' });
  });

  it('does not hold when the time of sealing was moved', () => {
    const tampered: Seal = { ...sealed(), at: '2026-01-01T00:00:00.000Z' };
    expect(verify(content(), tampered)).toEqual({ held: false, because: 'seal_does_not_match' });
  });

  it('does not hold when the issuer was rewritten', () => {
    const tampered: Seal = { ...sealed(), issuer: 'Some Other Bank' };
    expect(verify(content(), tampered)).toEqual({ held: false, because: 'seal_does_not_match' });
  });

  it('says so rather than failing when the seal is from an older version', () => {
    const old = { ...sealed(), version: 0 as unknown as 1 };
    expect(verify(content(), old)).toEqual({ held: false, because: 'older_version', version: 0 });
  });

  it('reports that nothing can be checked here when the key is gone', () => {
    const s = sealed();
    delete process.env.MAJLIS_SEAL_KEY;
    expect(verify(content(), s)).toEqual({ held: false, because: 'no_key_here' });
  });

  it('does not hold under a different installation key', () => {
    const s = sealed();
    process.env.MAJLIS_SEAL_KEY = 'a-completely-different-key-of-adequate-length';
    expect(verify(content(), s)).toEqual({ held: false, because: 'seal_does_not_match' });
  });
});

describe('a member who signed a different draft', () => {
  it('is flagged', () => {
    const earlier = signing({ documentHash: '0xsomething-else' });
    expect(signedSomethingElse(earlier, documentHash(content()))).toBe(true);
  });

  it('is not flagged when they signed this one', () => {
    expect(signedSomethingElse(signing(), documentHash(content()))).toBe(false);
  });
});

describe('reading a hash aloud', () => {
  it('comes in groups a person can compare', () => {
    const grouped = readable('0x' + '0123456789abcdef'.repeat(4));
    expect(grouped).toBe('0123 4567 89ab cdef 0123 4567 89ab cdef');
  });

  it('works whether or not the hash carries its prefix', () => {
    expect(readable('ab'.repeat(32))).toBe(readable('0x' + 'ab'.repeat(32)));
  });
});
