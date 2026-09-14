/**
 * Conventional or tokenised, marked on the holding rather than on the
 * installation.
 *
 * The case this exists for is the mixed one: a bank with a registry attached
 * that also holds conventional assets. Before this, every ruling in that bank
 * was told a contract refuses breaching transactions — comfortable, and false
 * for every conventional holding it named.
 *
 * What is held here:
 *
 *   - with nothing attached the distinction does not appear at all, and a
 *     holding with a contract address is still carried out by people, because
 *     nothing in this installation is reading that chain;
 *   - the board's own mark wins over anything read from the register;
 *   - a reading is reported as a reading, with the address it came from, so a
 *     board can see it was never asked;
 *   - a ruling over a mixture says both numbers rather than picking the
 *     optimistic half.
 */

import { describe, it, expect } from 'vitest';
import type { Asset, Matter } from '../src/types.js';
import type { EnforcementSnapshot } from '../src/services/enforcement.js';
import { applies, carriedOut, heldAs, inAWord } from '../src/services/marking.js';

const READ_AT = '2026-09-14T12:00:00.000Z';

const attached: EnforcementSnapshot = {
  kind: 'gravitas-registry',
  configured: true,
  readAt: READ_AT,
  label: 'Gravitas Policy Registry',
  reachable: true,
};

const nothing: EnforcementSnapshot = {
  kind: 'none',
  configured: false,
  readAt: READ_AT,
};

function asset(over: Partial<Asset> = {}): Asset {
  return {
    id: 'asset-1',
    institutionId: 'demo-institution',
    kind: 'fund',
    name: 'A holding',
    identifiers: [],
    source: 'institution',
    addedAt: READ_AT,
    addedBy: null,
    composition: null,
    retiredAt: null,
    retiredReason: null,
    ...over,
  } as Asset;
}

const onChain = (value = '0xabc', network = 'arbitrum') =>
  asset({ identifiers: [{ scheme: 'chain' as const, value, network }] });

function matter(assetIds: string[]): Matter {
  return { id: 'matter-1', assetIds } as unknown as Matter;
}

// ── whether it applies at all ─────────────────────────────────────────────

describe('where no chain is attached', () => {
  it('the distinction does not appear', () => {
    expect(applies(nothing)).toBe(false);
    expect(applies(attached)).toBe(true);
  });

  it('a holding with a contract address is still carried out by people', () => {
    // The address is real and the holding is on a chain. What is absent is
    // anything here reading it, so nothing refuses a transaction.
    const out = carriedOut(matter(['asset-1']), [onChain()], nothing);
    expect(out.attached).toBe(false);
    expect(out.byContract).toHaveLength(0);
    expect(out.byPeople).toHaveLength(1);
  });

  it('says so without calling it a missing piece', () => {
    const said = inAWord(carriedOut(matter(['asset-1']), [onChain()], nothing));
    expect(said).toContain('ordinary arrangement');
    expect(said).not.toMatch(/missing piece\b(?!\.)/);
  });
});

// ── how one holding is held ───────────────────────────────────────────────

describe('how a holding is held', () => {
  it('takes the board’s own mark first', () => {
    const marked = heldAs(asset({ heldAs: 'conventional', identifiers: [{ scheme: 'chain', value: '0xabc' }] }));
    // A holding can have an address and still be held conventionally — a bank
    // that tracks an instrument's address without holding the token. The mark
    // is the board's answer and it wins.
    expect(marked.mark).toBe('conventional');
    expect(marked.basis).toBe('recorded');
  });

  it('reads an address as tokenised, and says it is reading', () => {
    const read = heldAs(onChain('0xdeadbeef', 'arbitrum'));
    expect(read.mark).toBe('tokenised');
    expect(read.basis).toBe('read from the register');
    expect(read.address).toBe('0xdeadbeef');
    expect(read.network).toBe('arbitrum');
  });

  it('calls an unmarked holding with no address conventional, in those words', () => {
    const plain = heldAs(asset());
    expect(plain.mark).toBe('conventional');
    expect(plain.basis).toBe('nothing says otherwise');
    expect(plain.address).toBeUndefined();
  });

  it('never guesses from a name', () => {
    // Everything about this one says token except the record.
    const named = heldAs(asset({ name: 'Tokenised sukuk, on-chain', kind: 'sukuk' as Asset['kind'] }));
    expect(named.mark).toBe('conventional');
    expect(named.basis).toBe('nothing says otherwise');
  });
});

// ── a ruling over holdings ────────────────────────────────────────────────

describe('what carries a ruling out', () => {
  const tokenised = onChain('0x1');
  const conventional = asset({ id: 'asset-2', name: 'A conventional fund' });

  it('splits a mixed ruling rather than picking one half', () => {
    const out = carriedOut(
      matter(['asset-1', 'asset-2']),
      [tokenised, { ...conventional, id: 'asset-2' }],
      attached,
    );
    expect(out.byContract.map((h) => h.assetId)).toEqual(['asset-1']);
    expect(out.byPeople.map((h) => h.assetId)).toEqual(['asset-2']);
  });

  it('says both numbers in the one sentence', () => {
    const said = inAWord(
      carriedOut(matter(['asset-1', 'asset-2']), [tokenised, conventional], attached),
    );
    expect(said).toContain('two ways at once');
    expect(said).toMatch(/1 tokenised holding\b/);
    expect(said).toContain('1 held');
  });

  it('does not say a contract refuses anything where every holding is conventional', () => {
    const said = inAWord(carriedOut(matter(['asset-2']), [conventional], attached));
    expect(said).toContain('people in the bank');
    expect(said).toContain('even though a registry is attached');
  });

  it('says a breaching transaction does not execute where every holding is tokenised', () => {
    const said = inAWord(carriedOut(matter(['asset-1']), [tokenised], attached));
    expect(said).toContain('does not execute');
    // And still reviewed: enforcement by contract is narrower than review.
    expect(said).toContain('still reviewed afterwards');
  });

  it('handles a ruling that names no holding, which is ordinary', () => {
    const out = carriedOut(matter([]), [tokenised], attached);
    expect(out.namesNoHolding).toBe(true);
    expect(inAWord(out)).toContain('names no holding');
  });

  it('ignores a named holding that is not in the register', () => {
    // A ruling naming something retired or removed must not silently count as
    // enforced, and must not throw either.
    const out = carriedOut(matter(['asset-1', 'gone']), [tokenised], attached);
    expect(out.byContract).toHaveLength(1);
    expect(out.byPeople).toHaveLength(0);
  });

  it('is not confused by a matter with no assetIds field at all', () => {
    const out = carriedOut({ id: 'm' } as unknown as Matter, [tokenised], attached);
    expect(out.namesNoHolding).toBe(true);
  });
});

// ── through the panel that shows it ───────────────────────────────────────

describe('the carrying panel', () => {
  it('carries the split, so one screen answers for each holding', async () => {
    const { buildCarrying } = await import('../src/services/carrying.js');
    const tokenised = onChain('0x1');
    const conventional = asset({ id: 'asset-2', name: 'A conventional fund' });

    const built = buildCarrying(
      { ...matter(['asset-1', 'asset-2']), proposedRule: { parameters: [] } } as unknown as Matter,
      attached,
      [tokenised, conventional],
    );

    expect(built.carriedOut.byContract).toHaveLength(1);
    expect(built.carriedOut.byPeople).toHaveLength(1);
    expect(built.carriedInAWord).toContain('two ways at once');
  });

  it('answers honestly for a caller that hands over no register', async () => {
    const { buildCarrying } = await import('../src/services/carrying.js');
    const built = buildCarrying(
      { ...matter(['asset-1']), proposedRule: { parameters: [] } } as unknown as Matter,
      attached,
    );
    // Not "enforced by contract" on the strength of an id it could not resolve.
    expect(built.carriedOut.byContract).toHaveLength(0);
    expect(built.carriedOut.namesNoHolding).toBe(true);
  });
});

// ── the demonstration record ──────────────────────────────────────────────

describe('the demonstration record', () => {
  it('has a ruling over both kinds, because that is the case this is for', async () => {
    const { mattersAsSigned, assets } = await import('../src/data/seed.js');
    const ruling = mattersAsSigned.find((m) => m.id === 'matter-2026-04-02');
    expect(ruling).toBeTruthy();

    const out = carriedOut(ruling!, assets, attached);
    expect(out.byContract.length).toBeGreaterThan(0);
    expect(out.byPeople.length).toBeGreaterThan(0);
  });

  it('carries one holding marked by the board and one merely read', async () => {
    const { assets } = await import('../src/data/seed.js');
    const bases = new Set(assets.map((a) => heldAs(a).basis));
    expect(bases.has('recorded')).toBe(true);
    expect(bases.has('read from the register')).toBe(true);
  });
});
