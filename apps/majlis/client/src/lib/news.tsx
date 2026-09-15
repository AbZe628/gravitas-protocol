import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { governance, type QueueRow } from './api.js';
import { useRevision, whatIsNew } from './pulse.js';

/**
 * What appeared since the member last looked, worked out once for everyone.
 *
 * ── why this is a context and not two components each doing it ────────────
 *
 * Two things show the news: the bell in the masthead and the announcement that
 * appears by itself. If each held its own copy of *the queue as it last stood*,
 * the two would answer differently the moment one of them mounted a second
 * later than the other — the bell showing four things and the announcement
 * three, with neither wrong from where it was standing. One derivation, two
 * readers.
 *
 * ── it is still derived, and still stores nothing ─────────────────────────
 *
 * The rule the whole record is built on: a stored list of notifications is a
 * second copy of the truth and a second copy drifts. What is held here is the
 * queue as it last stood — a copy of something that already exists, kept for
 * one session, never written down and never sent anywhere. Something that
 * stops being true stops being news the moment it does.
 *
 * ── what pops and what merely waits ───────────────────────────────────────
 *
 * Not everything new deserves to interrupt. A deadline moving from eight days
 * to seven is news for the bell and an intrusion as an announcement. What
 * announces itself is what `N-02` names: a question arriving, a bank
 * answering, a vote opening, a timelock running out. Everything else waits in
 * the bell until the member chooses to look.
 */

/** The kinds that are allowed to interrupt. Everything else waits. */
const ANNOUNCES: ReadonlySet<string> = new Set([
  'question',
  'answered',
  'voting',
  'ready_to_take_effect',
]);

export interface News {
  /** Everything that appeared since the member last opened the bell. */
  fresh: QueueRow[];
  /** The one or two that are allowed to interrupt, newest first. */
  announcing: QueueRow[];
  /** The member looked. Nothing to clear anywhere else. */
  looked: () => void;
  /** This announcement has been seen, or dismissed. */
  quieten: (key: string) => void;
}

const Nothing: News = { fresh: [], announcing: [], looked: () => {}, quieten: () => {} };

const Context = createContext<News>(Nothing);

/**
 * What makes one row of the queue different from another.
 *
 * Not `to`. That is **where the row opens**, and several rows open in the same
 * place — every question waiting to be taken up opens at `/questions`. Keyed
 * on that, a second question arriving looks like the first one still being
 * there, and the bell stays silent while the queue underneath it grows. Found
 * by running it, not by a test: the queue went from eleven to twelve on screen
 * and nothing rang.
 *
 * `kind` and `id` together, because an id is only promised to be unique among
 * things of its own kind.
 */
export function rowKey(row: QueueRow): string {
  return `${row.kind}:${row.id}`;
}

export function NewsProvider({ children }: { children: ReactNode }) {
  const revision = useRevision();
  const [fresh, setFresh] = useState<QueueRow[]>([]);
  const [announcing, setAnnouncing] = useState<QueueRow[]>([]);

  /** The queue as it last stood. Never rendered, never written down. */
  const stood = useRef<QueueRow[] | null>(null);

  useEffect(() => {
    let current = true;
    governance
      .queue()
      .then((q) => {
        if (!current) return;
        const rows = Array.isArray(q.rows) ? q.rows : [];

        /*
         * The first read establishes what was *already* there. Without it a
         * member opening the application would be told that all eleven of
         * their standing items had just arrived.
         */
        if (stood.current === null) {
          stood.current = rows;
          return;
        }

        const arrived = whatIsNew(stood.current, rows, rowKey);
        stood.current = rows;
        if (arrived.length === 0) return;

        setFresh((had) => [...arrived, ...had]);

        const loud = arrived.filter((r) => ANNOUNCES.has(r.kind));
        if (loud.length > 0) {
          /*
           * At most two on screen. Three announcements stacked is a wall, and
           * a wall is dismissed without being read — which is worse than not
           * announcing at all. The rest are in the bell.
           */
          setAnnouncing((had) => [...loud, ...had].slice(0, 2));
        }
      })
      .catch(() => {
        /* No bell is honest. A bell that rings for a failed request is not. */
      });
    return () => {
      current = false;
    };
  }, [revision]);

  const looked = useCallback(() => setFresh([]), []);
  const quieten = useCallback(
    (key: string) => setAnnouncing((had) => had.filter((r) => rowKey(r) !== key)),
    [],
  );

  return (
    <Context.Provider value={{ fresh, announcing, looked, quieten }}>
      {children}
    </Context.Provider>
  );
}

export function useNews(): News {
  return useContext(Context);
}
