import { useEffect, useLayoutEffect, type RefObject } from 'react';

/**
 * Back lands where the member was.
 *
 * The work pane is the one thing on the screen that scrolls, and every
 * screen drawn in it starts at its top. That is right going forward and
 * wrong going back: a member twelve rows down the queue opens one, reads it,
 * presses back, and was put at the first row again to find their place by
 * eye. A phone never does that; neither does a desk application.
 *
 * Where the pane stood is noted against the entry in the history, as the
 * member scrolls. Coming back to that entry — and only coming back — puts it
 * there again. The screen under it arrives a little after the frame does
 * (its code, then its rows), so the position is held for as long as it takes
 * the screen to be tall enough, and let go the moment the member touches the
 * pane themselves.
 */
const stood = new Map<string, number>();

/** How long a screen is given to settle at its height and be put back. */
const PATIENCE_MS = 1500;

/**
 * Whether the pane is being put back. What it reads while it is — a screen
 * half-drawn, shorter than it will be, the browser clamping the pane to it —
 * is not where the member was, and is not noted.
 */
let puttingBack = false;

export function useScrollMemory(
  pane: RefObject<HTMLElement | null>,
  entry: string,
  returning: boolean,
): void {
  useEffect(() => {
    const el = pane.current;
    if (!el) return;
    const note = () => {
      if (!puttingBack) stood.set(entry, el.scrollTop);
    };
    el.addEventListener('scroll', note, { passive: true });
    return () => el.removeEventListener('scroll', note);
  }, [pane, entry]);

  useLayoutEffect(() => {
    const el = pane.current;
    const to = stood.get(entry);
    if (!el || !returning || !to) return;

    /*
     * Held for the whole of the patience, not only until it first lands.
     *
     * Measured on a phone: the pane was put at 360, the screen under it
     * swapped a part for a shorter one for a frame, the browser clamped the
     * pane to 321 — and the loop, having already landed, had stopped. The
     * member came back 39 pixels short of where they were. So it keeps the
     * position until the screen has settled or the member moves the pane
     * themselves, whichever is first.
     */
    let frame = 0;
    const letGo = () => {
      puttingBack = false;
      cancelAnimationFrame(frame);
    };
    const until = performance.now() + PATIENCE_MS;
    const hold = () => {
      if (Math.abs(el.scrollTop - to) >= 2) el.scrollTop = to;
      if (performance.now() > until) {
        letGo();
        return;
      }
      frame = requestAnimationFrame(hold);
    };
    const hands = ['wheel', 'touchstart', 'pointerdown'] as const;
    for (const h of hands) el.addEventListener(h, letGo, { passive: true });
    /* A key moves the pane from wherever the focus is, so it is heard everywhere. */
    window.addEventListener('keydown', letGo);
    puttingBack = true;
    hold();
    return () => {
      letGo();
      for (const h of hands) el.removeEventListener(h, letGo);
      window.removeEventListener('keydown', letGo);
    };
  }, [pane, entry, returning]);
}
