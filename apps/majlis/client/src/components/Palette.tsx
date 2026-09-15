import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../lib/i18n.js';
import { RAIL } from '../lib/spine.js';
import { governance } from '../lib/api.js';
import { KINDS, LABEL, type Kind } from './Tools.js';

/**
 * Type the thing, get the thing.
 *
 * ── what this is for, and what it is not for ──────────────────────────────
 *
 * It is the fast path for a member who would rather type than aim: the seven
 * tools, the eight destinations, by name, from wherever they are standing. It
 * is **never the only path** — the shelf down the edge of the frame reaches
 * the same seven without knowing any of this exists, which is the state every
 * member is in on their first day. A shortcut that is the only way in is not a
 * shortcut, it is a lock.
 *
 * ── it opens the thing, not a page about the thing ────────────────────────
 *
 * Choosing a tool here opens that tool beside the work. It does not navigate,
 * and it does not disturb what is on the screen — a member half way through a
 * condition who wants a figure worked out should come back to the same
 * sentence they were in the middle of writing.
 *
 * ── the keys ──────────────────────────────────────────────────────────────
 *
 * `Ctrl K` from anywhere, arrows to move, Enter to take, Escape to leave with
 * nothing touched. Held here rather than scattered, so there is one place that
 * knows what the keyboard does.
 */

type Row =
  | { sort: 'tool'; key: Kind; label: string }
  | { sort: 'place'; key: string; label: string; to: string }
  | { sort: 'record'; key: string; label: string; note?: string; to: string };

export default function Palette({
  open,
  onClose,
  onTool,
}: {
  open: boolean;
  onClose: () => void;
  onTool: (kind: Kind) => void;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [typed, setTyped] = useState('');
  const [cursor, setCursor] = useState(0);
  const box = useRef<HTMLInputElement>(null);
  const cameFrom = useRef<Element | null>(null);

  /* Everything reachable, named once. */
  const all: Row[] = useMemo(() => {
    const tools: Row[] = KINDS.map((k) => ({ sort: 'tool', key: k, label: t(LABEL[k]) }));
    const places: Row[] = RAIL.flatMap((group) =>
      group.destinations.map((d) => ({
        sort: 'place' as const,
        key: d.to,
        label: t(d.label),
        to: d.to,
      })),
    );
    return [...tools, ...places];
  }, [t]);

  /*
   * ── the record itself, by name ──────────────────────────────────────────
   *
   * Tools and places are known before anybody types; matters, rulings and
   * shapes are not, and there can be hundreds of them. So they are asked for
   * only once the member has typed enough to mean something, and the server's
   * own search does the finding — the same search the search screen uses, so
   * the palette can never disagree with it about what exists.
   *
   * Two characters, because one is every matter in the record.
   */
  const [found, setFound] = useState<Row[]>([]);
  useEffect(() => {
    const q = typed.trim();
    if (q.length < 2) {
      setFound([]);
      return;
    }
    let current = true;
    const id = window.setTimeout(() => {
      governance
        .search({ q })
        .then((results) => {
          if (!current) return;
          const rows = Array.isArray(results?.hits) ? results.hits : [];
          setFound(
            rows.slice(0, 8).map((hit) => ({
              sort: 'record' as const,
              key: hit.matterId,
              label: hit.title,
              note: hit.status,
              to: `/matters/${hit.matterId}`,
            })),
          );
        })
        .catch(() => {
          /* The palette still reaches everything it knew without asking. */
          if (current) setFound([]);
        });
      /* Long enough that typing a word is one request, not six. */
    }, 180);
    return () => {
      current = false;
      window.clearTimeout(id);
    };
  }, [typed]);

  const hits = useMemo(() => {
    const q = typed.trim().toLowerCase();
    if (!q) return all;
    return [...all.filter((r) => r.label.toLowerCase().includes(q)), ...found];
  }, [all, typed, found]);

  /* A fresh opening starts empty, at the top, with the cursor in the box. */
  useEffect(() => {
    if (!open) return;
    cameFrom.current = document.activeElement;
    setTyped('');
    setCursor(0);
    const id = window.setTimeout(() => box.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  /* Leaving puts the member back on the control that opened this. */
  useEffect(() => {
    if (open) return;
    const back = cameFrom.current;
    if (back instanceof HTMLElement) back.focus();
  }, [open]);

  useEffect(() => setCursor(0), [typed]);

  if (!open) return null;

  const take = (row: Row) => {
    onClose();
    if (row.sort === 'tool') onTool(row.key);
    else navigate(row.to);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, hits.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const row = hits[cursor];
      if (row) take(row);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const tools = hits.filter((r) => r.sort === 'tool');
  const places = hits.filter((r) => r.sort === 'place');
  const records = hits.filter((r) => r.sort === 'record');
  const indexOf = (row: Row) => hits.indexOf(row);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-paper/30 px-4 pt-[14vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('palette.title')}
        className="w-full max-w-[620px] overflow-hidden rounded-sheet bg-raised shadow-sheeted"
        onKeyDown={onKey}
      >
        <input
          id="palette-box"
          ref={box}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={t('palette.says')}
          aria-label={t('palette.says')}
          className="w-full border-b border-line bg-raised px-5 py-4 text-lead text-paper outline-none placeholder:text-faint"
        />

        <div className="max-h-[46vh] overflow-y-auto py-1">
          {hits.length === 0 && (
            <p className="px-5 py-4 text-ui text-muted">{t('palette.nothing')}</p>
          )}

          {tools.length > 0 && <Heading>{t('tools.title')}</Heading>}
          {tools.map((row) => (
            <Line key={'t' + row.key} row={row} on={indexOf(row) === cursor} take={take} />
          ))}

          {places.length > 0 && <Heading>{t('palette.places')}</Heading>}
          {places.map((row) => (
            <Line key={'p' + row.key} row={row} on={indexOf(row) === cursor} take={take} />
          ))}

          {records.length > 0 && <Heading>{t('palette.record')}</Heading>}
          {records.map((row) => (
            <Line key={'r' + row.key} row={row} on={indexOf(row) === cursor} take={take} />
          ))}
        </div>

        <footer className="flex flex-wrap gap-4 border-t border-line px-5 py-2 text-label text-faint">
          <span>{t('palette.keyTake')}</span>
          <span>{t('palette.keyMove')}</span>
          <span>{t('palette.keyLeave')}</span>
        </footer>
      </div>
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-5 pb-1 pt-3 text-label font-bold uppercase tracking-caps text-faint">
      {children}
    </p>
  );
}

function Line({ row, on, take }: { row: Row; on: boolean; take: (r: Row) => void }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        take(row);
      }}
      aria-current={on ? 'true' : undefined}
      className={
        'flex w-full items-center gap-3 px-5 py-2 text-start text-body ' +
        (on ? 'bg-lapistint text-paper' : 'text-sand hover:bg-ink')
      }
    >
      <span className="truncate">{row.label}</span>
      <span className="ms-auto shrink-0 text-label uppercase tracking-caps text-faint">
        {row.sort === 'tool'
          ? t('palette.opensHere')
          : row.sort === 'record'
            ? (row.note ?? t('palette.goes'))
            : t('palette.goes')}
      </span>
    </button>
  );
}
