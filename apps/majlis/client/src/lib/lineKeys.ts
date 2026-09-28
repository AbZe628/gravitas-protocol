import { useEffect, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { rememberOpened } from './split.js';

/**
 * Moving through a list without the mouse.
 *
 * The key sheet said *↑ ↓ — move through the rows* on every list, and nothing
 * anywhere listened for either: the arrows scrolled the pane, which is what
 * they do on a web page. A promise on the sheet the screen did not keep.
 *
 * `j` and `k` from anywhere that is not a box being typed in, and the arrows
 * once the member is on a line — before that they still scroll what is being
 * read, and taking that from them would be the application deciding it knows
 * better. Two ways of moving, one rule:
 *
 *   - **beside the work** (the list column), moving to a line opens it, the
 *     way the next message opens when you move to it in a mailbox;
 *   - **as the screen**, moving puts the member on the line, and `Enter` —
 *     which a link already answers — opens it.
 *
 * The lines are the links a `Line` draws (`a[data-line]`), so every list
 * built from the table has this without asking for it.
 */
const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

export function useLineKeys(
  root: RefObject<HTMLElement | null>,
  { opens, on }: { opens: boolean; on: boolean },
): void {
  const navigate = useNavigate();

  useEffect(() => {
    if (!on) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      if (document.querySelector('[role="dialog"]')) return;
      const box = root.current;
      if (!box) return;

      const lines = [...box.querySelectorAll<HTMLAnchorElement>('a[data-line]')];
      if (lines.length === 0) return;
      const focused = lines.indexOf(document.activeElement as HTMLAnchorElement);
      const onALine = focused !== -1;
      const down = e.key === 'j' || (e.key === 'ArrowDown' && (onALine || (opens && document.activeElement === document.body)));
      const up = e.key === 'k' || (e.key === 'ArrowUp' && (onALine || (opens && document.activeElement === document.body)));
      if (!down && !up) return;

      /* From the line the member is on, else the one that is open, else the top. */
      const lit = lines.findIndex((a) => a.getAttribute('aria-current') === 'page');
      const at = onALine ? focused : lit;
      const next = at === -1 ? lines[0] : lines[at + (down ? 1 : -1)];
      if (!next) return;
      e.preventDefault();
      next.focus();
      if (opens) {
        const to = next.pathname + next.hash;
        rememberOpened(to);
        navigate(to);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [root, opens, on, navigate]);
}
