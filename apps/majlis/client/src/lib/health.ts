import { useEffect, useState } from 'react';
import { api, type Health } from './api.js';

/**
 * What this installation actually is.
 *
 * Majlis runs inside a bank with no chain and no assistant attached, and that
 * is the ordinary installation rather than a degraded one. The interface has to
 * know which it is, because offering a page that can only refuse is worse than
 * not offering it at all.
 *
 * Fetched once. It describes how the server was started and does not change
 * while anyone is looking at it.
 */

let cached: Health | null = null;
let inflight: Promise<Health | null> | null = null;

/**
 * Forget what was read, so the next caller reads again.
 *
 * For tests, and it is honest about that. A test that renders the same screen
 * against an installation with a chain and one without would otherwise get the
 * first answer twice — the second case silently passing on the first case's
 * data, which is the shape of a test that proves nothing.
 *
 * Nothing in the application calls it. The health of an installation describes
 * how the server was started, and that does not change while anyone is looking.
 */
export function forgetHealth(): void {
  cached = null;
  inflight = null;
}

function load(): Promise<Health | null> {
  if (cached) return Promise.resolve(cached);
  inflight ??= api
    .health()
    .then((h) => {
      cached = h;
      return h;
    })
    // Not knowing is a state the interface handles: it shows what is always
    // there and leaves out only what it cannot confirm.
    .catch(() => null)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useHealth(): Health | null {
  const [health, setHealth] = useState<Health | null>(cached);

  useEffect(() => {
    if (cached) return;
    let live = true;
    void load().then((h) => {
      if (live) setHealth(h);
    });
    return () => {
      live = false;
    };
  }, []);

  return health;
}
