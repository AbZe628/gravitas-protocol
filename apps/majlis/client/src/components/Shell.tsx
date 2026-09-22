
import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../lib/i18n.js';
import { isInstitution, useIdentity, maySubmit } from '../lib/identity.js';
import { useHealth } from '../lib/health.js';
import { useBoardName } from '../lib/board.js';
import { LANGS, dirFor } from '../locales/index.js';
import {
  BESIDES,
  DESK_DOORS,
  DOORS,
  RAIL,
  deskPhaseOf,
  isDeskRoute,
  mainOf,
  phaseOf,
} from '../lib/spine.js';
import { WhatNext } from './Journey.js';
import NotYourScreen from './NotYourScreen.js';
import Tools, { type Kind } from './Tools.js';
import ToolShelf from './ToolShelf.js';
import Palette from './Palette.js';
import Bell from './Bell.js';
import Guide from './Guide.js';
import Keys from './Keys.js';
import Announcement from './Announcement.js';
import { NewsProvider } from '../lib/news.js';
import { Button } from './Button';

/**
 * The application's frame.
 *
 * Three passes were spent on type and colour inside the same idea, and the
 * verdict did not move: *it does not look like an application.* That was right,
 * and it was not a typographic problem. What was being built was a **document**
 * — a single column of prose centred in a dark field, with no chrome, no
 * regions, and nothing holding it — and no amount of better type makes a
 * document read as software.
 *
 * An application has a frame: somewhere that is always the navigation,
 * somewhere that is always the work, somewhere that is always who you are and
 * what state the installation is in. A reader learns those three places once
 * and never thinks about them again. That is what this adds.
 *
 * ── the rail groups, so twelve items become four ideas ────────────────────
 *
 * The old navigation was twelve equal links in a row, which is a list to read
 * rather than a structure to learn. Here they sit in the four groups they
 * always belonged to — the work, what stands, what we hold, the board — so
 * somebody hunting for the register is looking under *what we hold* and has
 * three things to scan rather than twelve.
 *
 * ── and it says what this installation is ─────────────────────────────────
 *
 * At the foot of the rail, permanently: whether anything carries out what the
 * board decides, and whether there is an assistant. Those change what half the
 * screens in this application can honestly offer, and they used to be
 * discoverable only by noticing that a control was missing.
 *
 * ── the frame is translucent, and the light comes from a corner ───────────
 *
 * The rail and the bar are white at 70-80% over a blurred vellum, so the sweep
 * behind the page passes under them. That is what makes this read as one lit
 * surface rather than three panels butted together. See docs/DESIGN.md.
 */

interface Item {
  to: string;
  label: string;
  end?: boolean;
}

function Group({ title, items }: { title: string; items: Item[] }) {
  return (
    <div className={title ? 'mb-5' : 'mb-4'}>
      {title && (
        <div className="mb-1.5 px-3 text-label font-bold uppercase tracking-caps text-muted">
          {title}
        </div>
      )}
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                'relative block rounded-lg px-3 py-[7px] text-ui transition-all ' +
                (isActive
                  ? 'bg-raised font-semibold text-paper shadow-card'
                  : 'text-sand hover:bg-raised/60 hover:text-paper')
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The four facts, written once.
 *
 * They are shown in two places — along the foot of a window, and at the end
 * of the page on a phone — and two lists would be two lists that disagree.
 * What a bank is told about its own installation must not depend on the
 * width of the screen it is told on.
 */
function useFacts() {
  const { t } = useI18n();
  const health = useHealth();
  if (!health) return null;

  const enforced = health.enforcement === 'gravitas-registry';
  return [
    { on: false, says: t('shell.nothingSigns') },
    { on: enforced, says: t(enforced ? 'shell.enforced' : 'shell.notEnforced') },
    {
      on: health.assistantKind !== 'off',
      says: t(health.assistantKind === 'off' ? 'shell.noAssistant' : 'shell.assistant'),
    },
    /*
     * Whether anybody outside this application is ever told. The one
     * absence with no other voice: a notice composed and carried by nobody
     * is visible only to whoever happened to be looking at the screen that
     * wrote it.
     */
    {
      on: health.notice !== 'none',
      says: t(health.notice === 'none' ? 'shell.noRelay' : 'shell.relay'),
    },
  ];
}

const dot = (on: boolean) =>
  'h-1.5 w-1.5 shrink-0 rounded-full ' + (on ? 'bg-settled' : 'bg-line');

/**
 * The same four, at the end of the page, where a phone has room for them.
 *
 * The bar below is fixed to the foot of the window and the foot of a phone
 * is the tab bar, so it was simply `hidden` there — on every screen, at
 * every size below a desk. A bank reading Majlis on a tablet was never told
 * that nothing signs, that nothing is enforced, that there is no assistant
 * or that nobody outside is told. Here they scroll with the page, which is
 * right: they are facts to find, not controls to reach.
 */
export function TheFacts() {
  const facts = useFacts();
  if (!facts) return null;

  return (
    <div className="mt-10 border-t border-line pt-4 lg:hidden">
      <ul className="space-y-1.5">
        {facts.map((f) => (
          <li key={f.says} className="flex items-start gap-2 text-note leading-relaxed text-muted">
            <span className={dot(f.on) + ' mt-[7px]'} />
            <span>{f.says}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusBar() {
  const { t } = useI18n();
  const { identity } = useIdentity();
  const facts = useFacts();
  if (!facts) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 hidden items-center gap-x-6 gap-y-1 border-t border-line bg-ink/85 px-4 py-1.5 text-note text-muted backdrop-blur-xl lg:flex lg:ps-[272px]">
      {facts.map((f) => (
        <span key={f.says} className="flex items-center gap-2">
          <span className={dot(f.on)} />
          {f.says}
        </span>
      ))}
      <span className="ms-auto font-mono">
        {identity?.scholarId ?? t('shell.anonymous')}
      </span>
    </div>
  );
}

/**
 * The board's mark: an eight-point khatam inside a pointed arch.
 *
 * It appears once, at the head of the rail, and nowhere else. Geometry used
 * more than once stops being a mark and becomes wallpaper, which is what the
 * pattern fills in the earlier pass turned out to be.
 */
function Mark() {
  return (
    <svg width="32" height="36" viewBox="0 0 36 41" fill="none" aria-hidden="true" className="shrink-0">
      <path
        d="M18 1.2 C26.9 1.2 33.6 8.3 33.6 17.6 L33.6 37.6 C33.6 38.7 32.7 39.6 31.6 39.6 L4.4 39.6 C3.3 39.6 2.4 38.7 2.4 37.6 L2.4 17.6 C2.4 8.3 9.1 1.2 18 1.2 Z"
        fill="#FFFFFF"
        stroke="#164470"
        strokeWidth="1.3"
      />
      <path
        d="M18 10.6 L20.6 16.6 L26.6 19.2 L20.6 21.8 L18 27.8 L15.4 21.8 L9.4 19.2 L15.4 16.6 Z"
        fill="#B08430"
      />
    </svg>
  );
}

/**
 * The screens built to fill the work area rather than a column of prose.
 *
 * Every other page is a reading width, and widening one that holds prose
 * only lengthens its lines. A page joins this list in the same commit that
 * rebuilds it — never before.
 *
 * Exact paths, plus one prefix. The prefix is the **classic** matter page,
 * which holds the act in a column beside the question — not `/matters/:id`,
 * which is one guided act at a time and is a column of prose. Widening that
 * one ran a paragraph across 1,100 pixels, which is the rule in
 * `tailwind.config.js` demonstrating itself.
 */
/*
 * Screens that are a work area rather than a column of prose.
 *
 * A matter is one now: it is a window with a strip, two panes and an act bar,
 * and a reading width would squeeze it into a third of the screen.
 */
const WORK_AREA = ['/register', '/library', '/calculations'];

function atWorkArea(path: string): boolean {
  return (
    WORK_AREA.includes(path) ||
    path.startsWith('/matters/') ||
    path.startsWith('/classic/matters/') ||
    path.startsWith('/dossier/matters/')
  );
}

/** The member, as a mark. Same in both mastheads, so it is written once. */
function Avatar({ id }: { id?: string }) {
  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-lapissoft to-[#133A5F] font-display text-lead text-[#F2DFB5] shadow-[0_2px_6px_-1px_rgba(19,58,95,0.35)]">
      {(id ?? '?').slice(0, 1).toUpperCase()}
    </div>
  );
}

/**
 * The phone's navigation: four places, across the bottom, where a thumb is.
 *
 * This replaces a hamburger opening the desktop rail. Twelve destinations do
 * not fit a phone and should not try to: the artboard reduces them to the four
 * a member actually opens between two other things, and everything else is one
 * tap away under *Everything else* on the arrival screen — which is what that
 * screen is for.
 *
 * The guide is the fourth because it is the only one that is not a place. It
 * opens the panel rather than navigating, so it is a button among links, and
 * it says so to a screen reader by being one.
 */
function TabBar() {
  const { t } = useI18n();
  const { identity } = useIdentity();
  const path = useLocation().pathname;
  const desk = isInstitution(identity?.role);
  const here = desk ? deskPhaseOf(path) : phaseOf(path);

  /*
   * A bank gets its own three here for the same reason it gets them in the
   * rail. The drawings are reused rather than redrawn: what a bank asked is
   * still a question, what binds it is still a sealed page, and what it owes
   * is still the thing somebody comes and checks.
   */
  const drawing: Record<string, string> = {
    iasked: 'asked',
    bindsme: 'inforce',
    iowe: 'checked',
  };

  /*
   * The same four words as the rail, so nothing is relearned on a phone.
   *
   * These used to be four different destinations from the rail's, plus a
   * *more* tab opening a page of twelve links — which is a hamburger with
   * extra steps. A member who learns `Asked, Deciding, In force, Checked` at
   * their desk finds the identical four here, in the identical order.
   */
  /*
   * The phone carries the rail, not a second navigation.
   *
   * Three tabs for the board, one per drawn group, opening that group's main
   * screen. A member who learns The work, What stands, What we hold at their
   * desk finds the same three here. The desk keeps its own doors, which were
   * drawn nowhere and are already only three.
   */
  const tabs = desk
    ? DESK_DOORS.map((door) => ({
        to: mainOf(door),
        label: t(door.label),
        icon: drawing[door.phase] ?? door.phase,
        /* The desk lights by its own three doors; this is not read there. */
        group: -1,
      }))
    : RAIL.map((group, i) => ({
        to: (group.destinations.find((d) => d.main) ?? group.destinations[0]).to,
        label: t(group.label),
        icon: (['asked', 'inforce', 'checked'] as const)[i] ?? 'asked',
        /*
         * Which group this tab is, so the bar can light the right one.
         *
         * It was lit by comparing the tab's drawing to the phase of the
         * path — and the tabs are the three groups of the rail while the
         * phases are the four doors, which are a different division of
         * the same application. "What stands" lit because its drawing
         * happens to be called inforce and /rules is in the In force
         * door; "What we hold" never lit at all, because the register is
         * also in the In force door and the names did not match. A
         * member standing on a screen was told they were nowhere.
         */
        group: i,
      }));

  /*
   * The rail group the path is in — the same longest-match the group row
   * uses, so the bar and the row cannot disagree about where a member is.
   */
  const inGroup = (() => {
    /* A plain loop, not forEach: assigning inside a callback loses the
       type of what is assigned, and the index comes back as never. */
    let which = -1;
    let longest = -1;
    for (let i = 0; i < RAIL.length; i++) {
      for (const d of RAIL[i].destinations) {
        const hit = path === d.to || (d.to !== '/' && path.startsWith(d.to + '/'));
        if (hit && d.to.length > longest) {
          which = i;
          longest = d.to.length;
        }
      }
    }
    if (which !== -1) return which;

    /*
     * A screen that is not a rail destination still stands somewhere.
     *
     * A matter, a sitting, an examination, the contract check: a member
     * opened them from one of the three groups and has not left it. With
     * nothing matched the bar went dark on all three and told them they
     * were nowhere — measured on /matters/:id, no tab lit.
     *
     * The four doors answer where such a screen is, and three of them are
     * the board's own work; only what is in force belongs with what
     * stands.
     */
    const door = phaseOf(path);
    if (!door) return null;
    return door === 'inforce' ? 1 : 0;
  })();

  /*
   * One drawing per phase, each of the thing itself rather than a symbol to
   * decode: a question is a speech bubble, deciding is a balance, in force is
   * a sealed page, checked is a magnifier.
   */
  const icon = (kind: string, active: boolean) => {
    const stroke = active ? '#164470' : '#B3A896';
    const common = {
      width: 21,
      height: 21,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke,
      strokeWidth: 1.9,
      strokeLinecap: 'round' as const,
      strokeLinejoin: 'round' as const,
    };
    if (kind === 'asked') {
      return (
        <svg {...common}>
          <path d="M21 14a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />
        </svg>
      );
    }
    if (kind === 'deciding') {
      return (
        <svg {...common}>
          <path d="M12 4v16M5 8h14M5 8l-2.5 6h5zM19 8l2.5 6h-5z" />
        </svg>
      );
    }
    if (kind === 'inforce') {
      return (
        <svg {...common}>
          <path d="M6 3h9l4 4v14H6z" />
          <path d="M9.5 12h6M9.5 16h4" />
        </svg>
      );
    }
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.6-3.6" />
      </svg>
    );
  };

  return (
    <nav
      aria-label={t('shell.menu')}
      className="fixed inset-x-0 bottom-0 z-40 flex items-start bg-raised/85 px-1.5 pt-2.5 shadow-[0_-0.5px_0_rgba(25,23,19,0.09)] backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
    >
      {tabs.map((tab) => {
        /*
         * Lit by phase, not by path.
         *
         * A member who taps `Deciding`, opens a matter and then opens one of
         * its sources is still deciding, and a tab bar that went dark on them
         * would be telling them they had left. `phaseOf` answers where they
         * are, including for screens that are not themselves tabs.
         */
        const active = desk ? here === tab.icon : inGroup === tab.group;
        return (
          /*
            A Link, not a NavLink.

            NavLink computes aria-current from the path it points at and
            overrides the one it is given — and these tabs are lit by which
            rail group a member is in, not by whether they are standing on
            the group's main screen. With NavLink the mark was right on
            three screens out of twenty and absent on the rest.
          */
          <Link
            key={tab.to}
            to={tab.to}
            aria-current={active ? 'page' : undefined}
            className="flex flex-1 flex-col items-center gap-1.5 pb-1.5"
          >
            {icon(tab.icon, active)}
            <span
              className={
                'text-label leading-none ' + (active ? 'font-bold text-lapis' : 'text-muted')
              }
            >
              {tab.label}
            </span>
          </Link>
        );
      })}

      <Button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('majlis:guide'))}
        className="flex flex-1 flex-col items-center gap-1.5 pb-1.5"
      >
        <svg width="21" height="21" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 1 L9.6 6.4 L15 8 L9.6 9.6 L8 15 L6.4 9.6 L1 8 L6.4 6.4 Z" fill="#B3A896" />
        </svg>
        <span className="text-label leading-none text-muted">{t('guide.open')}</span>
      </Button>
    </nav>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  /**
   * The toolkits, open from anywhere.
   *
   * It belongs to the frame rather than to a screen: a member wanting to work
   * a purification out wants it wherever they are, and opening it should not
   * take them off what they were reading.
   */
  const [tools, setTools] = useState(false);
  /**
   * Which tool, not whether a list of tools.
   *
   * The shelf and the palette both name the one they want. Holding it here is
   * what lets a press on the shelf open that tool rather than a panel the
   * member then has to choose inside again.
   */
  const [toolAt, setToolAt] = useState<Kind>('screening');
  const openTool = useCallback((kind: Kind) => {
    setToolAt(kind);
    setTools(true);
  }, []);

  /** `Ctrl K` from anywhere. A faster way in, never the only one. */
  const [palette, setPalette] = useState(false);
  /** `?` — what the keyboard does on the screen the member is looking at. */
  const [keys, setKeys] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inABox =
        e.target instanceof HTMLElement &&
        (e.target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName));

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((was) => !was);
        return;
      }

      /*
       * `/` goes to the search. Never taken from a box — a member typing a
       * date or a contract reference has every right to a slash, and stealing
       * it would be the application deciding it knows better than the person
       * typing.
       */
      if (e.key === '/' && !inABox && !palette) {
        e.preventDefault();
        navigate('/search');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, palette]);

  const { t, lang, setLang } = useI18n();
  const { identity } = useIdentity();
  const health = useHealth();
  const boardName = useBoardName();
  const path = useLocation().pathname;

  /*
   * The rail is the four doors, and nothing is written out here.
   *
   * These groups used to be a hand-kept list that disagreed with the tab bar
   * and with the page called *Everything else*: `Coming` and `Record` each
   * appeared twice, under headings nobody had chosen. Everything now comes
   * from `lib/spine.ts`, so the rail, the tabs and the arrival screen cannot
   * drift apart — adding a screen in one place adds it in all three.
   */
  /*
   * Whose doors these are.
   *
   * A bank used to be handed the board's entire rail: seventeen destinations
   * and four doors, every one a screen for deciding things a bank does not
   * decide. The board's triage queue opened for it with the instruction
   * *take a question up as a matter*; `/meetings` offered *convene a
   * sitting*. The acts on those screens were correctly absent, which is the
   * rule working — but the rule was being applied to controls and never to
   * navigation, so a bank was left to work out which of twenty-one places
   * were meant for it.
   */
  const desk = isInstitution(identity?.role);
  const doors = desk ? DESK_DOORS : DOORS;

  /*
   * The board reads its rail from the drawing; the desk still reads its own
   * doors, which were drawn nowhere and are already only six.
   *
   * Three groups and nine places, against five and seventeen. Everything that
   * left the rail is reached from where it belongs — spine.ts lists each one
   * and where it went, and a test fails if any of them becomes unreachable.
   */
  const groups: { title: string; items: Item[] }[] = desk
    ? [
        { title: '', items: [{ to: '/', label: t('desk.here'), end: true }] },
        ...doors.map((door) => ({
          title: `${door.ordinal}  ${t(door.label)}`,
          items: door.destinations.map((d) => ({ to: d.to, label: t(d.label) })),
        })),
      ]
    : /*
       * Three groups and nothing after them.
       *
       * The drawing has no *besides* group. Search is inside *what stands*
       * where it was drawn; the board's own page is reached from the member's
       * name in the header, which is where a person looks for their own
       * settings in every application they already use; and the assistant is
       * a line at the foot of the rail saying whether one is configured,
       * which is what the drawing shows rather than a place to go.
       */
      RAIL.map((group) => ({
        title: t(group.label),
        items: group.destinations.map((d) => ({
          to: d.to,
          label: t(d.label),
          ...(d.to === '/' ? { end: true } : {}),
        })),
      }));

  if (desk) {
    groups.push({
      title: t('spine.besides'),
      items: BESIDES.filter(
        // A control this installation cannot honour is absent, not disabled.
        (d) => d.needs !== 'assistant' || health?.assistantKind !== 'off',
      )
        /*
         * The assistant is the board's, not the desk's. A bank asking a model
         * about its own question, inside the board's record, is the one place
         * an answer could be mistaken for the board's.
         */
        .filter((d) => d.to !== '/assistant')
        .map((d) => ({ to: d.to, label: t(d.label) })),
    });
  }

  /*
   * The group the member is standing in — which is what a phone shows
   * instead of the rail.
   *
   * ── the hole this fills ─────────────────────────────────────────────
   *
   * A wide screen carries every destination at once down the side. A phone
   * carries the tab bar, and the tab bar carries **one** destination per
   * group, because five tabs is what fits across 375 pixels. So a member on
   * a phone reached a group's first screen and the rest of that group was
   * reachable from nowhere at all: measured on the board's rail, fourteen of
   * the eighteen. *Put a question*, *what went wrong*, the contract library
   * and the record had no way in on the device a board member actually
   * carries.
   *
   * ── why the group and not a drawer ──────────────────────────────────
   *
   * A drawer holding the desktop rail is what makes a phone a small desktop,
   * and the artboard note says in as many words that it is not one. This is
   * the same list the rail draws, in the same order, in the same words,
   * narrowed to where the member already is — so what is learnt at a desk is
   * what is found here.
   *
   * The match is the longest destination the path begins with, so a screen
   * below a destination (a matter under the record, a tool under the
   * calculations) keeps its group rather than falling out of the navigation
   * the moment somebody opens something.
   */
  const siblings: Item[] =
    groups
      .map((g) => ({
        items: g.items,
        depth: Math.max(
          ...g.items.map((i) =>
            i.to === path || (i.to !== '/' && path.startsWith(i.to + '/')) ? i.to.length : -1,
          ),
        ),
      }))
      .filter((g) => g.depth >= 0)
      .sort((a, b) => b.depth - a.depth)[0]?.items ?? [];

  const rail = (
    <div className="flex h-full flex-col">
      <Link to="/" className="mb-8 flex items-center gap-3 px-3">
        <Mark />
        <div>
          <div className="font-display text-title leading-none tracking-title text-paper">
            {t('app.name')}
          </div>
          <div className="mt-1.5 text-note leading-snug text-muted">{t('app.stage')}</div>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto">
        {groups.map((g) => (
          <Group key={g.title} title={g.title} items={g.items} />
        ))}
      </nav>

      {/* What this copy is now lives in the status bar along the foot. */}
    </div>
  );

  return (
    /*
     * ── the one law the whole look rests on ───────────────────────────────
     *
     * The document does not scroll. The frame is exactly as tall as the screen
     * and the panes inside it scroll on their own.
     *
     * This was the first law in docs/FLOW.md §35 and the application failed it
     * everywhere: `min-h-dvh` let the page grow to whatever its contents were,
     * so the rail scrolled away with the work, the act bar sat somewhere down
     * past the fold, and a member arriving at a matter met a column of text to
     * read rather than a window to work in. Measured at 4,849px, 3,920px and
     * 4,062px on three screens. That single property is most of the difference
     * between an instrument and an article, and nobody could name it while
     * everybody felt it.
     *
     * `h-dvh` rather than `h-screen`: on a phone the browser's own bars come
     * and go, and `100vh` measures the frame as if they were never there.
     */
    <div className="relative flex h-dvh flex-col overflow-hidden bg-ink text-paper">
      {/*
        The way past the frame, for whoever is not using a mouse.

        ── what this closes ──────────────────────────────────────────────

        Measured on all twenty screens: the first Tab landed on the name in
        the masthead. From there to the work is the whole bar and the whole
        rail, every time, on every screen. FLOW §35.5 asks exactly this as
        its third question, and the answer was the failing one everywhere.

        First in the order, invisible until it has focus, and gone again
        when it loses it. A member working from the keyboard presses Tab,
        then Enter, and is standing in the work.
      */}
      <a
        href="#work"
        className="sr-only rounded-lg bg-lapis px-4 py-2 text-ui font-semibold text-white focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50"
      >
        {t('shell.skipToWork')}
      </a>

      {/*
        The sweep: one continuous curve carrying light across the whole frame.
        It sits under everything and is never a line the eye has to read.
      */}
      <div className="g-sweep" aria-hidden="true" />

      {/* ── the rail, permanent on a wide screen ────────────────────── */}
      <aside className="fixed inset-y-0 start-0 z-20 hidden w-[260px] overflow-y-auto bg-surface/70 px-3 py-6 shadow-[1px_0_0_rgba(25,23,19,0.055)] backdrop-blur-xl lg:block">
        {rail}
      </aside>

      <div className="relative flex min-h-0 flex-1 flex-col lg:ps-[260px]">
        {/*
          ── the phone's masthead ──────────────────────────────────────

          Not a shrunken version of the wide bar. `design/Phone.dc.html`
          draws the application naming itself and the board it belongs to,
          with the member's avatar opposite — and no hamburger, because a
          drawer holding the desktop rail is what makes a phone a small
          desktop, which is the one thing the artboard note says it is not.

          The board's name comes from the settings. Where it cannot be read
          the line is simply absent: `app.stage` is a sentence about the
          installation, and a truncated sentence where a name belongs reads
          as a fault.
        */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-ink/80 px-5 py-3 shadow-[0_1px_0_rgba(25,23,19,0.055)] backdrop-blur-xl lg:hidden">
          {/*
            The board's name first, the product's second.

            It was the other way round, and with four round controls
            opposite it at a size a thumb can hit there was no room for
            both: "Gravitas Majlis" broke over two lines and the board's
            own name was cut to "Demonstration B…". A member knows which
            application they opened. What they need the masthead to tell
            them is whose board this is, so that is the line that gets the
            width, on one line, and the product's name goes under it.
          */}
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <Mark />
            <div className="min-w-0">
              {boardName ? (
                <>
                  <div className="truncate font-display text-sub leading-none tracking-title">
                    {boardName}
                  </div>
                  <div className="mt-1.5 truncate text-label uppercase tracking-caps leading-none text-muted">
                    {t('app.name')}
                  </div>
                </>
              ) : (
                <div className="truncate font-display text-sub leading-none tracking-title">
                  {t('app.name')}
                </div>
              )}
            </div>
          </Link>
          {/*
            Search and the settings, on a phone.

            They were in the rail and the rail is desktop-only, so below 1024
            pixels this application had no settings, no search and no
            assistant at all — a member could not change their own password
            from the device they actually carry.

            Not a hamburger. A drawer holding the desktop rail is what makes a
            phone a small desktop, which is the thing the artboard says it is
            not. Two marks in the masthead, where a phone puts them.
          */}
          <div className="flex shrink-0 items-center gap-1">
            {/*
              Putting something to the board, on a phone.

              The wide bar carries this as a named act because it is the one
              thing that belongs to no screen and the thing an institution
              comes here to do. The masthead did not, and the screen it leads
              to is reached from nowhere else a phone shows — so measured by
              walking the application at 375 pixels, *put a question* was the
              single address a member could not arrive at. A secretary taking
              an enquiry by telephone had to find a desk first.

              A mark rather than the words, because at 375 pixels the words
              push the board's own name off the masthead, and the name is how
              a member knows whose installation they are looking at. The
              label is on it for anyone reading the screen aloud, and the
              words themselves are still written out at the foot of the
              arrival screen and on the queue.
            */}
            {maySubmit(identity?.role) && (
              <Link
                to="/ask"
                aria-label={t('door.asked.put')}
                className="grid h-11 w-11 place-items-center rounded-full bg-lapis text-white shadow-act transition-shadow hover:shadow-lift"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </Link>
            )}
            {/*
              The tools, on a phone: one button, not a bar of seven.

              It opens the same panel the shelf opens on a desk — the
              seven are inside it, named, at a size a thumb can hit. On
              the shelf they were 83×26, which is under half the height a
              finger needs, and they cost a whole row of the screen on
              every page whether or not anybody wanted a calculator.
            */}
            {!desk && (
              <Button
                type="button"
                onClick={() => setTools(true)}
                aria-label={t('tools.title')}
                className="grid h-11 w-11 place-items-center rounded-full text-muted transition-colors hover:bg-raised/60 hover:text-paper lg:hidden"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 7h10M4 12h16M4 17h7" />
                  <circle cx="18" cy="7" r="2" />
                  <circle cx="15" cy="17" r="2" />
                </svg>
              </Button>
            )}
            <Link
              to="/search"
              aria-label={t('besides.search')}
              className="grid h-11 w-11 place-items-center rounded-full text-muted transition-colors hover:bg-raised/60 hover:text-paper"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
            </Link>
            <Link to="/settings" aria-label={t('besides.board')}>
              <Avatar id={identity?.scholarId} />
            </Link>
          </div>
        </header>

        {/*
          The rest of the group you are standing in, on a phone.

          ── the gap this closes ──────────────────────────────────────

          The tab bar carries one destination per rail group — the three
          the drawing names — and a member who taps one lands on that
          group's main screen with the group's other destinations gone.
          Measured on a phone: four of the eight were unreachable from
          anywhere at all. Put a question, what went wrong, the contract
          library and the record simply had no way in.

          ── and it is the rail, not a second navigation ──────────────

          The same groups, the same order, the same words. What a member
          learns at a desk is what they find here; a phone is shown less
          at once because it is narrower, never less in total. It scrolls
          sideways rather than wrapping, so the row stays one line high
          whatever the group holds.
        */}
        {/*
          ── and the language sits at the end of it ───────────────────

          It had a row to itself: three buttons across the full width of
          the screen, on every page, for a choice a member makes once.
          Four bars stood between the top of a phone and the first line
          of work — 184 pixels of 812, and another 61 for the tab bar,
          so thirty per cent of the screen was frame. It rides at the
          end of this row now, where it is still on every screen and
          still the first thing a reader who cannot read English can
          reach.
        */}
        <div className="sticky top-[60px] z-20 flex items-center gap-2 bg-ink/80 px-5 pb-2.5 backdrop-blur-xl lg:hidden">
        <nav aria-label={t('shell.thisGroup')} className="slides flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
          {siblings.length > 1 &&
            siblings.map((d) => (
              <NavLink
                key={d.to}
                to={d.to}
                end={d.end}
                className={({ isActive }) =>
                  'inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-lg px-3 py-1.5 text-note transition-all ' +
                  (isActive
                    ? 'bg-raised font-semibold text-paper shadow-hairline'
                    : 'text-muted hover:text-paper')
                }
              >
                {d.label}
              </NavLink>
            ))}

        </nav>

          {/*
            The language, as one control rather than three.

            Three buttons beside the group row took 190 of 375 pixels —
            half the row, permanently, for a choice a member makes once —
            and the group's own destinations were clipped to make space:
            "The record" read "The reo". A list that opens is what a
            phone uses for a choice of three, it is 70 pixels wide, and
            the reader who cannot read the screen still finds it in the
            same place on every page.
          */}
          <select
            aria-label={t('shell.language')}
            value={lang}
            onChange={(e) => setLang(e.target.value as (typeof LANGS)[number]['code'])}
            className="h-9 shrink-0 rounded-xl bg-paper/[0.045] px-2.5 text-note text-paper shadow-hairline outline-none"
          >
            {LANGS.map((l) => (
              <option key={l.code} value={l.code} className="text-ink">
                {l.label}
              </option>
            ))}
          </select>
        </div>

        {/* ── the wide bar: where you are, who you are ────────────────── */}
        <header className="sticky top-0 z-30 hidden items-center justify-between gap-4 bg-ink/80 px-5 py-3 shadow-[0_1px_0_rgba(25,23,19,0.055)] backdrop-blur-xl lg:flex">
          <span className="text-ui text-muted">{t('shell.where')}</span>

          <div className="flex items-center gap-4">
            {/*
              Search, in the frame rather than on a screen of its own.

              It crosses all four phases by definition, so a reader looking for
              a ruling should not first have to decide which phase it is in and
              navigate there. It looks like a field and behaves like a link:
              pressing it opens the search screen, where the typing happens.
              A field here that searched as you typed would need its own
              results surface floating over every page, which is a second
              interface to maintain and to translate.
            */}
            <Link
              to="/search"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-muted shadow-ring transition-colors hover:bg-raised/60 hover:text-paper"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <span className="text-ui">{t('besides.search')}</span>
            </Link>

            {/*
              The one act that belongs to no screen: putting something to the
              board. It is what an institution comes here to do and what a
              secretary does on their behalf, and it used to live only at the
              bottom of the arrival screen.
            */}
            {maySubmit(identity?.role) && (
              <Link
                to="/ask"
                className="rounded-xl bg-lapis px-4 py-2 text-ui font-semibold text-white shadow-act transition-shadow hover:shadow-lift"
              >
                {t('door.asked.put')}
              </Link>
            )}

            {/*
              What arrived while the member was looking at something else.

              The first line of the whole specification — *a question comes in,
              a notification pops immediately* — and until now nothing stood
              behind it. See `Bell.tsx` for why it holds no stored list.
            */}
            {!desk && <Bell />}

            {/*
              The guide, which used to float over the work in the corner.

              It lay across the act bar and the aside pane — measured, five
              overlaps on the matter screen — and the act bar carried empty
              padding purely to dodge it. A control that hovers over the work
              is the habit of a website with a support widget bolted on.
            */}

            {/*
              The palette. A faster way to the same seven tools and eight
              places the shelf and the rail already reach, for whoever would
              rather type than aim. Written out with its key rather than left
              for a member to discover: a shortcut nobody knows about is not a
              shortcut.
            */}
            {!desk && (
              <Button
                type="button"
                onClick={() => setPalette(true)}
                className="flex items-center gap-2 rounded-xl bg-raised px-3 py-2 text-ui font-semibold text-sand shadow-ring hover:text-paper"
              >
                {t('palette.title')}
                <kbd className="rounded border border-line px-1 font-mono text-label font-medium text-faint">
                  Ctrl K
                </kbd>
              </Button>
            )}

            {/*
              A segmented control: the container is the recess, the chosen one
              is a raised sheet. Three outlined buttons said nothing about
              which of them was in force.

              It is only here. The phone masthead has no room for it, and on a
              phone it lives on `/more`, which is that screen's whole job.
            */}
            <div className="flex gap-0.5 rounded-xl bg-paper/[0.045] p-[3px]">
              {LANGS.map((l) => (
                <Button
                  key={l.code}
                  type="button"
                  onClick={() => setLang(l.code)}
                  aria-pressed={lang === l.code}
                  className={
                    'rounded-lg px-2.5 py-1 text-note transition-all ' +
                    (lang === l.code
                      ? 'bg-raised font-semibold text-paper shadow-hairline'
                      : 'text-muted hover:text-sand')
                  }
                >
                  {l.label}
                </Button>
              ))}
            </div>

            {/*
              Who is here, what they may do, and the way to their own page.

              It decides what half the controls in this application are
              allowed to be — and it is now the way to the board's page, which
              left the rail. The drawing puts the name and the role here and
              nothing in a *besides* group, and a person looking for their own
              settings looks at their own name in every application they
              already use.
            */}
            <Link
              to="/settings"
              className="flex items-center gap-3 rounded-xl px-2 py-1 transition-colors hover:bg-raised/60"
              aria-label={t('shell.yourPage')}
            >
              <div className="text-end">
                <div className="text-ui font-semibold leading-tight text-paper">
                  {identity?.scholarId ?? t('shell.anonymous')}
                </div>
                <div className="text-note leading-tight text-muted">
                  {t(`role.${identity?.role ?? 'observer'}`)}
                </div>
              </div>
              <Avatar id={identity?.scholarId} />
            </Link>
          </div>
        </header>

        {/*
          The work, and the tools beside it.

          A row rather than a stack, so the shelf is part of the frame and not
          something that opens over the work. Whatever the member is reading
          stays exactly where it is when a tool is opened.

          On a phone the same two are stacked, shelf first: 375 pixels has no
          edge to give a column, and the shelf was simply hidden there —
          seven tools with no way in on the one screen size where the whole
          board reads its papers. Stacked, it is a strip above the work and
          the work still stays where it is.
        */}
        <div className="flex min-h-0 flex-1 flex-col-reverse lg:flex-row">
        <main
          id="work"
          /*
           * Fokusabilno programski, ali ne u redu za Tab: preskocna veza
           * mora moci spustiti fokus ovdje, a sam okvir nije kontrola i ne
           * smije trositi jedan Tab svakome ko prolazi kroz ekran.
           */
          tabIndex={-1}
          key={path}
          className={
            /*
             * A work screen fills the region it is given. A reading column
             * centred in a wide field is the shape of an article, and it was
             * making every screen read as one however tight its contents.
             */
            /*
             * The pane that scrolls, and the only one on this screen that
             * does. `min-h-0` is what makes it work: a flex child refuses to
             * shrink below its content unless it is told it may, and without
             * it the frame grows and the document scrolls again.
             */
            'min-h-0 flex-1 overflow-y-auto overscroll-contain ' +
            'w-full px-4 py-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:pb-12 ' +
            (atWorkArea(path) ? '' : 'mx-auto max-w-reading sm:px-8')
          }
          style={{ animation: 'shellFade 220ms ease-out' }}
        >
          {/*
            Said once, at the top, and only in the language it is about.

            Arabic is 190 keys short of English and Urdu 201. A reader who
            switches and meets an English sentence three screens in has been
            left to work out whether the software is broken; a board would
            reasonably conclude it is. This says which of the two it is
            looking at, in its own language, before it has to guess — and it
            does not appear in English, where there is nothing to explain.
          */}
          {dirFor(lang) === 'rtl' && (
            <div className="mb-8 rounded-sheet bg-raised/70 px-6 py-5 shadow-ring">
              <div className="font-display text-sub leading-snug">{t('lang.notReady')}</div>
              <p className="mt-2.5 max-w-[62ch] text-ui leading-loose text-muted">
                {t('lang.notReadyBody')}
              </p>
            </div>
          )}

          {/*
            ── what used to sit here, and why it does not ─────────────────

            The frame drew three things above every page: the four phases as a
            bar, a line saying what you do here, and a strip of onward steps.
            They were added to answer "the application has no flow", and they
            made it worse in a way that took a measurement to see.

            Every screen then began with the identical line —
            `01 Asked › 02 Deciding › 03 In force › 04 Checked` — so moving
            between screens changed nothing at the top and did not feel like
            arriving anywhere. Underneath it the page's own heading was pushed
            down: 160px on most screens, 242px on the queue, and 1589px on the
            dashboard, where an explanatory box sat on top of the work. The
            same four phases were on screen three times at once: here, in the
            rail, and again as cards.

            So the bar and the line are gone. What they were compensating for
            was the real fault — twenty-five screens with no shared shape —
            and signposting a maze is not the same as drawing a map.

            `WhatNext` stays for now, deliberately. It sits at the foot, so it
            costs nothing above the fold, and removing it before the queue
            exists would restore the dead ends it was built to close. It comes
            out when the queue has proved itself, and not in the same change,
            because two removals at once cannot be told apart in a measurement.
          */}
          {/*
            A board screen opened by a bank says whose it is.

            Decided here rather than inside each page, for the same reason the
            journey is: the screens a bank would most need telling about are
            the thin ones, and those are exactly the ones somebody would have
            forgotten. `DESK_ROUTES` is the whole of it — a screen added for a
            desk becomes reachable by being listed there and nowhere else.
          */}
          {desk && !isDeskRoute(path) ? (
            <NotYourScreen />
          ) : (
            <>
              {children}

              <WhatNext />

              {/*
                What this installation is, at the end of the page.
                The bar that says it is fixed to the foot of a window and
                hidden below a desk, so on a phone and a tablet nobody was
                told any of it. See TheFacts.
              */}
              <TheFacts />
            </>
          )}
        </main>

        {/*
          The shelf is the desk's. A phone gets one button for it.

          Seven names across the top of a phone is a whole bar of frame,
          on every screen, for tools a member opens now and then — and
          the panel it opens is the same panel the button opens. The
          shelf keeps its place beside the work where there is room for
          it, which is what the drawing shows.
        */}
        {!desk && (
          <div className="hidden lg:block">
            <ToolShelf at={tools ? toolAt : undefined} onOpen={openTool} />
          </div>
        )}
        </div>

        <StatusBar />

        {/*
          The guide, at the level of the frame rather than inside the wide bar.

          It was mounted inside the desk's header, which is `hidden` below
          1024 pixels — so on a phone the component never rendered, its
          listener never attached, and the Guide tab in the bottom bar did
          nothing at all when pressed. Its own trigger is still desk-only;
          what moved is where the panel lives, so the tab can open it.
        */}
        {!desk && <Guide />}

        <Tools open={tools} at={toolAt} onClose={() => setTools(false)} />

        <Palette
          open={palette}
          onClose={() => setPalette(false)}
          onTool={openTool}
        />

        <Keys open={keys} onOpen={() => setKeys(true)} onClose={() => setKeys(false)} />

        {/*
          What arrived by itself. Outside the scrolling pane on purpose: it is
          about the record, not about the screen the member happens to be on,
          and it must not scroll away from something they have not read.
        */}
        {!desk && <Announcement />}
      </div>

      <TabBar />

      {/* A page change should be felt, not just happen. */}
      <style>{`@keyframes shellFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}

/**
 * The frame, with one derivation of *what is new* under all of it.
 *
 * The bell and the announcement both read it, so the two can never disagree
 * about what arrived — which they would the moment each held its own copy and
 * one of them mounted a second later than the other.
 */
export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <NewsProvider>
      <Frame>{children}</Frame>
    </NewsProvider>
  );
}
