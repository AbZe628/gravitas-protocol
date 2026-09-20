import { describe, it, expect } from 'vitest';
import {
  readRegistry,
  supersededAs,
  SUPERSEDED,
  CURRENT_REGISTRY,
} from '../src/services/registry.js';

/**
 * An address that was replaced is refused, not read.
 *
 * ── why this is not merely tidy ───────────────────────────────────────────
 *
 * A superseded contract is not gone. It answers `paused()` and `owner()`
 * exactly as it always did, with the state it had the day it stopped being
 * the protocol's. Point Majlis at one and every read succeeds: reachable,
 * no error, a green screen — reporting the enforcement state of a registry
 * that enforces nothing.
 *
 * A board would be shown that what runs matches what it approved, on
 * evidence from a dead contract, and nothing would say otherwise. So the
 * refusal happens before the read, by address.
 *
 * ── and the list has to stay honest ───────────────────────────────────────
 *
 * The last test is the one that matters in a year: the current address must
 * never appear among the superseded. A copy-paste there would refuse every
 * read in the product and look like a chain outage.
 */

const OFFLINE = { rpcUrl: 'http://127.0.0.1:1', offline: false };

describe('a replaced contract address', () => {
  it('is recognised whatever case it is written in', () => {
    const [lower] = Object.keys(SUPERSEDED);
    expect(supersededAs(lower)).toBeTruthy();
    expect(supersededAs(lower.toUpperCase())).toBeTruthy();
    expect(supersededAs(`  ${lower}  `)).toBeTruthy();
  });

  it('is refused without the chain being contacted at all', async () => {
    const [stale] = Object.keys(SUPERSEDED);

    /*
     * The rpc url points at a closed port. A read that reached the network
     * would come back with a connection error; this comes back naming the
     * contract, which is how we know nothing was attempted.
     */
    const snap = await readRegistry({ ...OFFLINE, address: stale });

    expect(snap.superseded).toBe(true);
    expect(snap.reachable).toBe(false);
    expect(snap.error).toContain('replaced');
  });

  it('says which contract it is and what the current one is', async () => {
    const [stale, name] = Object.entries(SUPERSEDED)[0];
    const snap = await readRegistry({ ...OFFLINE, address: stale });

    expect(snap.error).toContain(name);
    expect(snap.error).toContain(CURRENT_REGISTRY);
    // Not a connection problem, and must not read as one — otherwise
    // somebody retries until it "works".
    expect(snap.error?.toLowerCase()).not.toContain('timeout');
  });

  it('refuses even in offline mode, where nothing would be read anyway', async () => {
    const [stale] = Object.keys(SUPERSEDED);
    const snap = await readRegistry({ ...OFFLINE, offline: true, address: stale });

    // Offline is a reason not to reach the chain. It is not a reason to stop
    // saying the address is wrong, and the wrong address outlives the mode.
    expect(snap.superseded).toBe(true);
  });

  it('lets an address that is not on the list through to the read', async () => {
    const snap = await readRegistry({ ...OFFLINE, address: CURRENT_REGISTRY });

    // It fails, because the rpc url is a closed port — but it fails as a
    // connection, having tried. A guard that refused everything would pass
    // every test above and break the product.
    expect(snap.superseded).toBeUndefined();
    expect(snap.error).toBeTruthy();
  });

  it('never lists the current registry as superseded', () => {
    expect(supersededAs(CURRENT_REGISTRY)).toBeNull();
  });
});
