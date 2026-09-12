import { useRef } from 'react';

/**
 * A failed refresh must not take away a screen that is already there.
 *
 * ── the fault, measured ───────────────────────────────────────────────────
 *
 * Press *Record: this is a breach* with no connection. The act sets its
 * refusal correctly, then calls its loader to pick up the new state, that
 * fails too, and `setFailed(true)` returns the error page for the whole
 * screen. The nine steps, the report, the concurrences and the refusal itself
 * all go, and a scholar is left with "Could not load." — three words that do
 * not mention the thing they just pressed.
 *
 * ── the rule ──────────────────────────────────────────────────────────────
 *
 * **Failing to load is fatal only while there is nothing to show.** A first
 * load that fails really does leave an empty screen, and saying so is right.
 * A later one that fails leaves a page the reader is already using, and
 * throwing it away loses their place and their answer at once.
 *
 * Eight screens re-run their loader after an act and every one of them had
 * this. It is one rule, so it is written once rather than eight times: a hook
 * that remembers whether anything has ever arrived.
 *
 *     const there = useStillThere();
 *
 *     load()
 *       .then((r) => { there.arrived(); setRows(r); })
 *       .catch(() => there.lost(setFailed));
 *
 * Nothing here decides what "arrived" means. A screen that checks the shape of
 * a response before trusting it — several do, after a 200 of the wrong shape
 * once unmounted the whole tree — calls `arrived` only on the branch where the
 * shape was right.
 */
export function useStillThere() {
  const shown = useRef(false);

  return {
    /** Something real has rendered. Later failures are no longer fatal. */
    arrived() {
      shown.current = true;
    },

    /**
     * A load failed. Show the error page only if the reader has nothing yet.
     *
     * Takes the screen's own `setFailed` rather than owning the flag, so a
     * screen keeps whatever it already does with it — some show a page, some
     * show a line — and this changes only *when* it is set.
     */
    lost(setFailed: (v: boolean) => void) {
      if (!shown.current) setFailed(true);
    },

    /** Whether anything has ever rendered. For a screen that needs to ask. */
    get everShown() {
      return shown.current;
    },
  };
}
