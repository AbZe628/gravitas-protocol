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
/*
 * One line for the whole application, however many screens are watching.
 *
 * ── what this was doing ───────────────────────────────────────────────────
 *
 * Every component calling `useRevision` opened its own `EventSource`. A
 * stream never finishes, so each one held a connection for as long as the
 * screen was up. Measured in the browser: two still open on the home screen
 * once everything had settled, one on the others — and in development, four
 * opened before StrictMode's cleanup closed two.
 *
 * A browser holds six connections per host on HTTP/1.1. Every stream past
 * the first takes one of those six away from a request that is actually
 * waiting for an answer. On a slowed server this was visible: responses
 * arrived in pairs, and the home screen took fourteen seconds to appear.
 *
 * ── one line, shared ──────────────────────────────────────────────────────
 *
 * The line carries a count and nothing else, so there is nothing to tell one
 * subscriber that another one should not hear. It opens when the first
 * screen asks and closes when the last one stops.
 */
let linija: EventSource | null = null;
let zadnja = 0;
const slusaoci = new Set<(revision: number) => void>();

function prikljuci(slusalac: (revision: number) => void): () => void {
  slusaoci.add(slusalac);

  if (!linija && typeof EventSource !== 'undefined') {
    linija = new EventSource('/api/pulse', { withCredentials: true });
    linija.onmessage = (event) => {
      try {
        const said = JSON.parse(event.data) as { revision?: unknown };
        if (typeof said.revision !== 'number') return;
        zadnja = said.revision;
        for (const s of slusaoci) s(zadnja);
      } catch {
        /* A line that says something unreadable is not a reason to fall over. */
      }
    };
    /*
     * No handler for errors on purpose. EventSource reconnects by itself, and
     * a screen that announced every blip would be noisier than the thing it
     * is reporting.
     */
  }

  return () => {
    slusaoci.delete(slusalac);
    if (slusaoci.size === 0 && linija) {
      linija.close();
      linija = null;
    }
  };
}

/**
 * Drop the line and the count it carried.
 *
 * For a test, where one file runs many screens in one process and the count
 * from the previous one has nothing to do with the next.
 */
export function forgetPulse(): void {
  if (linija) linija.close();
  linija = null;
  zadnja = 0;
  slusaoci.clear();
}

export function useRevision(): number {
  /*
   * Starts from the last count the line carried, not from zero. A screen
   * opening second would otherwise see the count jump on the next message
   * and think the record had moved when it had not.
   */
  const [revision, setRevision] = useState(() => zadnja);

  useEffect(() => prikljuci(setRevision), []);

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
