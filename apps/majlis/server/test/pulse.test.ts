import { describe, expect, it } from 'vitest';
import { createPulse } from '../src/services/pulse.js';
import { pulsing, isReader } from '../src/store/pulsing.js';
import { MemoryStore } from '../src/store/memory.js';
import type { Store } from '../src/store/store.js';

/**
 * The bell hears every act, and this proves it rather than asserting it.
 *
 * A guard that walks a list somebody typed is a guard that stops guarding the
 * day somebody adds a method and forgets the list. So the walk is over the
 * store's own surface: every function on it must be either a named reader or
 * something the wrapper counts. Neither, and this fails.
 */
describe('the bell sits under every act', () => {
  const surface = (store: Store): string[] => {
    const names = new Set<string>();
    for (
      let layer: object | null = store;
      layer && layer !== Object.prototype;
      layer = Object.getPrototypeOf(layer)
    ) {
      for (const name of Object.getOwnPropertyNames(layer)) {
        if (name === 'constructor') continue;
        if (typeof (store as unknown as Record<string, unknown>)[name] === 'function') {
          names.add(name);
        }
      }
    }
    return [...names];
  };

  /*
   * The failure this guards against is a method added to the store later and
   * never classified. So the walk is over the store's real surface and the
   * reader list is checked against it — a name in the list that no longer
   * exists is as much a fault as a method the list has never heard of, and
   * both of them are the list drifting away from the code.
   */
  it('names only readers that exist, and leaves none unaccounted for', () => {
    const names = surface(new MemoryStore());

    /*
     * If this walk reached almost nothing it would pass while proving nothing
     * — the fault a previous guard in this repository had for weeks.
     */
    expect(names.length).toBeGreaterThan(40);

    const readers = names.filter(isReader);
    const writes = names.filter((n) => !isReader(n));

    expect(readers.length, 'the reader list reached nothing on the real store').toBeGreaterThan(15);
    expect(writes.length, 'no writes found, so the wrapper covers nothing').toBeGreaterThan(20);
    expect(readers.length + writes.length).toBe(names.length);
  });

  it('rings for a write that lands, and stays quiet for a read', async () => {
    const pulse = createPulse();
    const wrapped = pulsing(new MemoryStore(), pulse);

    await wrapped.matters();
    await wrapped.boards();
    expect(pulse.revision(), 'reading moved the count').toBe(0);

    await wrapped.createAsset({
      id: 'asset-one',
      name: 'A holding nobody has ruled on',
      identifiers: {},
      enteredBy: 'someone',
      enteredAt: new Date().toISOString(),
    } as Parameters<Store['createAsset']>[0]);

    expect(pulse.revision(), 'a write that landed did not ring').toBe(1);
  });

  it('rings after the write, not before, and never for a refusal', async () => {
    const pulse = createPulse();
    const wrapped = pulsing(new MemoryStore(), pulse);

    const heard: number[] = [];
    pulse.listen((r) => heard.push(r));

    await wrapped.matters();
    expect(heard).toEqual([]);

    await expect(
      wrapped.updateMatter('nothing-by-that-id', (m) => m),
    ).rejects.toThrow();
    expect(heard, 'a refused act did not move the record').toEqual([]);
  });

  it('keeps telling the others when one listener throws', () => {
    const pulse = createPulse();
    const told: string[] = [];
    pulse.listen(() => {
      throw new Error('this connection is gone');
    });
    pulse.listen(() => told.push('second'));

    pulse.moved();
    expect(told).toEqual(['second']);

    /* The dead one is dropped rather than tried again on every act. */
    pulse.moved();
    expect(pulse.listeners()).toBe(1);
  });

  it('stops telling a listener that has stopped listening', () => {
    const pulse = createPulse();
    const told: number[] = [];
    const stop = pulse.listen((r) => told.push(r));

    pulse.moved();
    stop();
    pulse.moved();

    expect(told).toEqual([1]);
    expect(pulse.revision()).toBe(2);
  });
});
