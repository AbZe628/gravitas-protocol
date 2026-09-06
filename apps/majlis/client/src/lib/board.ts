import { useEffect, useState } from 'react';
import { oversight } from './api.js';

/**
 * What this board is called.
 *
 * The phone masthead names the board under the application, and the rail says
 * the same on a wide screen. Nothing else in the shell knew the name: it sits
 * on `/api/settings`, which no chrome was reading.
 *
 * ── absent rather than approximated ───────────────────────────────────────
 *
 * If the settings cannot be read, this returns `null` and the line is simply
 * not drawn. The alternative — falling back to `app.stage`, which is a
 * sentence about what this installation is — would put a truncated sentence
 * where a name belongs, and a board would read its own masthead as broken.
 *
 * ── one request for the whole session ─────────────────────────────────────
 *
 * Cached at module level, like `useHealth`, because the shell renders on every
 * screen and a board's name does not change while somebody is reading. The
 * same caveat applies: a test that needs a different answer needs its own
 * file, because the cache outlives a single render tree.
 */

let cached: string | null | undefined;
let inFlight: Promise<void> | null = null;

export function useBoardName(): string | null {
  const [name, setName] = useState<string | null>(cached ?? null);

  useEffect(() => {
    if (cached !== undefined) {
      setName(cached);
      return;
    }

    let live = true;
    inFlight ??= oversight
      .settings()
      .then((s) => {
        cached = typeof s?.boardName === 'string' && s.boardName.trim() ? s.boardName : null;
      })
      .catch(() => {
        // Not knowing is a state the masthead handles by saying nothing.
        cached = null;
      });

    void inFlight.then(() => {
      if (live) setName(cached ?? null);
    });

    return () => {
      live = false;
    };
  }, []);

  return name;
}
