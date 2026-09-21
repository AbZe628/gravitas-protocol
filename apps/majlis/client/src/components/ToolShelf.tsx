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
 * ── and on a phone it is a strip, not an absence ──────────────────────────
 *
 * This said the shelf was hidden below the wide breakpoint because *the
 * masthead there carries the same seven*. The masthead never carried them.
 * Measured on a phone: seven tools, zero ways in — and since
 * `/calculations` is linked from nowhere in the application, the shelf is
 * the only way to a calculator, so there was none. A member on a phone
 * could not reach screening, purification, zakat, profit distribution,
 * tradability, late payment or what had been recorded.
 *
 * It is the same seven across the top instead of down the side, scrolling
 * sideways because seven do not fit in 375 pixels.
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
      /*
       * A column beside the work on a desk, a strip across the top of it on
       * a phone — and present on both.
       *
       * ── what it was ─────────────────────────────────────────────────
       *
       * `hidden … lg:flex`, so on a phone and on a tablet the shelf was not
       * there at all. Measured: seven tools, zero ways in. And
       * `/calculations` is linked from nowhere in the application — the
       * shelf *is* the way to a calculator — so a member on a phone could
       * not reach screening, purification, zakat, profit distribution,
       * tradability, late payment or what had been recorded. Not hidden
       * behind a press: absent.
       *
       * ── why a strip and not a drawer ────────────────────────────────
       *
       * The same seven, in the same order, with the same marks. A drawer
       * would be a second thing to learn, and the phone already carries
       * the rail rather than a second navigation. It scrolls sideways
       * because seven do not fit across 375 pixels, and a tool that is one
       * swipe away is still a tool that is there.
       */
      className={
        'slides flex shrink-0 gap-0.5 border-line bg-surface/70 ' +
        'w-full flex-row items-stretch overflow-x-auto border-t px-2 py-2 ' +
        'lg:w-[68px] lg:flex-col lg:items-center lg:overflow-visible lg:border-s lg:border-t-0 lg:px-0 lg:py-4'
      }
    >
      {/*
        The short word, not the long one.

        `tools.title` is *the calculations* — 92 pixels of it in a 68-pixel
        shelf, spilling past the edge onto the pane beside it. Measured, not
        noticed: the sweep only looked for text that scrolls inside its own box,
        and this was text wider than the box it sat in, which is a different
        thing and now checked for too.
      */}
      {/* The heading is the shelf saying what it is. Across the top of a
          phone it is a word in the way of the tools it names, so it stays
          on the desk where the column has room for it. */}
      <span className="mb-2 hidden px-1 text-center text-label font-bold uppercase tracking-label text-faint lg:block">
        {t('tools.open')}
      </span>

      {KINDS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onOpen(k)}
          aria-current={at === k ? 'true' : undefined}
          /*
           * A line on a phone, a square on a desk.
           *
           * The column's shape — mark above the word, 56 pixels wide — put
           * *profit distribution* and *late payment* onto two lines when it
           * was laid across the top of a phone, so the strip stood as tall
           * as three rows of chrome above the work on a screen that has 812
           * pixels in total. Beside each other they are one line, and the
           * seven still slide.
           */
          className={
            'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 ' +
            'lg:w-[56px] lg:flex-col lg:gap-1 lg:whitespace-normal lg:px-1 lg:py-2 ' +
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
