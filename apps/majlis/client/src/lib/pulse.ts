import { useEffect, useState } from 'react';

/**
 * How many times the record has moved, kept in step with the server.
 *
 * ── what this replaces ────────────────────────────────────────────────────
 *
 * Nothing. There was no way at all for a screen to learn that something had
 * happened: every count, every list and every queue was whatever it had been
 * at the moment the page loaded, and stayed that way until somebody pressed
 * reload. A question could arrive from a bank, a colleague could open a vote,
 * a deadline could pass, and the member sitting in front of the application
 * would be the last to know.
 *
 * ── a number, and the screen works out the rest ───────────────────────────
 *
 * The line carries a count and nothing else. A screen holding its own copy of
 * something sees the count move, asks for that thing again, and compares. The
 * record stays the single source of what is true, which is the same rule
 * `attention.ts` and `pulse.ts` are built on.
 *
 * ── it reconnects itself, and says nothing when it cannot ─────────────────
 *
 * `EventSource` retries on its own when a line drops, so there is nothing to
 * do about a flaky connection. When the browser has no `EventSource` at all
 * this returns a count that never moves — the application then behaves exactly
 * as it did before any of this, which is the honest failure: no bell rather
 * than a bell that lies.
 */
export function useRevision(): number {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (typeof EventSource === 'undefined') return;

    const line = new EventSource('/api/pulse', { withCredentials: true });

    line.onmessage = (event) => {
      try {
        const said = JSON.parse(event.data) as { revision?: unknown };
        if (typeof said.revision === 'number') setRevision(said.revision);
      } catch {
        /* A line that says something unreadable is not a reason to fall over. */
      }
    };

    /*
     * No handler for errors on purpose. EventSource reconnects by itself, and
     * a screen that announced every blip would be noisier than the thing it
     * is reporting.
     */
    return () => line.close();
  }, []);

  return revision;
}

/**
 * What is new since the member last looked.
 *
 * Derived by comparing two lists, never by reading a stored notification —
 * for the reason the whole application gives: a stored list is a second copy
 * of the truth and a second copy drifts. Something that stops being true stops
 * being new here the moment it does, with nothing to clear.
 */
export function whatIsNew<T>(before: readonly T[], after: readonly T[], key: (item: T) => string): T[] {
  const had = new Set(before.map(key));
  return after.filter((item) => !had.has(key(item)));
}
