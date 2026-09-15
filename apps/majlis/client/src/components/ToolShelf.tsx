import { useI18n } from '../lib/i18n.js';
import { KINDS, LABEL, type Kind } from './Tools.js';

/**
 * The seven tools, down the edge of the frame, on every screen.
 *
 * ── the fault this closes ─────────────────────────────────────────────────
 *
 * > The calculators and all the tools open automatically in the working
 * > window when they are needed. But what if they need one for something of
 * > their own — how will they reach it?
 *
 * The first answer was a button in the masthead that opened a panel holding a
 * row of seven names, so reaching a tool took two choices: open the menu, then
 * choose inside it. A menu whose only contents are another menu.
 *
 * The second answer was worse. It put the tools behind a keyboard shortcut,
 * which works only for a member who already knows the shortcut is there — and
 * that is nobody, on the first day. A shortcut is a faster path for someone
 * who knows the way; it is never the way.
 *
 * ── so: visible, permanent, one press ─────────────────────────────────────
 *
 * The shelf is part of the frame rather than something that opens. Seven
 * names, always in the same place, and pressing one opens that tool — not a
 * list containing it. The palette in the masthead reaches the same seven for
 * whoever would rather type than aim; neither is the only way in.
 *
 * ── what it does not claim ────────────────────────────────────────────────
 *
 * A tool opened from here is arithmetic the member wanted done, and it binds
 * to nothing. A tool the application opens inside a step is named by the
 * contract shape and its result is recorded against that condition. The panel
 * says which of the two is happening, because a scholar who works a figure out
 * and assumes it was filed has been misled by the interface.
 *
 * Hidden below the wide breakpoint: a phone has no edge to spare, and the
 * masthead there carries the same seven.
 */

/** One letter per tool, so the shelf reads at a glance and never wraps. */
const MARK: Record<Kind, string> = {
  screening: 'S',
  purification: 'P',
  zakat: 'Z',
  distribution: 'R',
  tradability: '%',
  late: 'K',
  recorded: '≡',
};

export default function ToolShelf({
  at,
  onOpen,
}: {
  /** The tool showing now, if the panel is open — the shelf marks it. */
  at?: Kind;
  onOpen: (kind: Kind) => void;
}) {
  const { t } = useI18n();

  return (
    <nav
      aria-label={t('tools.title')}
      className="hidden w-[68px] shrink-0 flex-col items-center gap-0.5 border-s border-line bg-surface/70 py-4 lg:flex"
    >
      <span className="mb-2 text-label font-bold uppercase tracking-caps text-faint">
        {t('tools.title')}
      </span>

      {KINDS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onOpen(k)}
          aria-current={at === k ? 'true' : undefined}
          className={
            'flex w-[56px] flex-col items-center gap-1 rounded-lg px-1 py-2 ' +
            'text-label font-bold leading-tight transition-colors ' +
            (at === k
              ? 'bg-raised text-paper shadow-ring'
              : 'text-muted hover:bg-raised/60 hover:text-paper')
          }
        >
          <span
            aria-hidden="true"
            className="font-mono text-ui font-medium text-lapis"
          >
            {MARK[k]}
          </span>
          <span className="text-center">{t(LABEL[k])}</span>
        </button>
      ))}
    </nav>
  );
}
