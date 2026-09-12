
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useI18n } from '../lib/i18n.js';
import { isInstitution, useIdentity, maySubmit } from '../lib/identity.js';
import { useHealth } from '../lib/health.js';
import { useBoardName } from '../lib/board.js';
import { LANGS, dirFor } from '../locales/index.js';
import {
  BESIDES,
  DESK_DOORS,
  DOORS,
  deskPhaseOf,
  isDeskRoute,
  mainOf,
  phaseOf,
} from '../lib/spine.js';
import { PhaseBar, WhatNext, WhatYouDo } from './Journey.js';
import NotYourScreen from './NotYourScreen.js';

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
    <div className={title ? 'mb-7' : 'mb-6'}>
      {title && (
        <div className="mb-2.5 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
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
                'relative block rounded-xl px-3.5 py-2.5 text-[13.5px] transition-all ' +
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

function Installation() {
  const { t } = useI18n();
  const health = useHealth();
  if (!health) return null;

  const enforced = health.enforcement === 'gravitas-registry';

  return (
    <div className="border-t border-line px-3 pt-4">
      <div className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
        {t('shell.installation')}
      </div>

      <div className="space-y-2 text-[12px]">
        {/*
          What used to sit under the product's name as "Stage Two — the board
          decides here. Nothing here signs." It is a true and important thing
          to say and it was the first sentence anybody read, in a vocabulary
          from our own roadmap: a bank does not know what Stage Two is, and a
          reader learned nothing about what the application does. The claim
          belongs here, with everything else this copy does and does not do.
        */}
        <div className="flex items-start gap-2.5">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-line" />
          <span className="leading-snug text-muted">{t('shell.nothingSigns')}</span>
        </div>
        <div className="flex items-start gap-2.5">
          <span
            className={
              'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ' +
              (enforced ? 'bg-settled ring-[3px] ring-settled/15' : 'bg-line')
            }
          />
          <span className="leading-snug text-muted">
            {t(enforced ? 'shell.enforced' : 'shell.notEnforced')}
          </span>
        </div>
        <div className="flex items-start gap-2.5">
          <span
            className={
              'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ' +
              (health.assistantKind === 'off' ? 'bg-line' : 'bg-settled ring-[3px] ring-settled/15')
            }
          />
          <span className="leading-snug text-muted">
            {t(health.assistantKind === 'off' ? 'shell.noAssistant' : 'shell.assistant')}
          </span>
        </div>
      </div>
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
const WORK_AREA = ['/register', '/library', '/calculations'];

function atWorkArea(path: string): boolean {
  return WORK_AREA.includes(path) || path.startsWith('/classic/matters/');
}

/** The member, as a mark. Same in both mastheads, so it is written once. */
function Avatar({ id }: { id?: string }) {
  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-lapissoft to-[#133A5F] font-display text-[15px] text-[#F2DFB5] shadow-[0_2px_6px_-1px_rgba(19,58,95,0.35)]">
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
  const tabs = (desk ? DESK_DOORS : DOORS).map((door) => ({
    to: mainOf(door),
    label: t(door.label),
    icon: drawing[door.phase] ?? door.phase,
  }));

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
        const active = here === tab.icon;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className="flex flex-1 flex-col items-center gap-1.5 pb-1.5"
          >
            {icon(tab.icon, active)}
            <span
              className={
                'text-[10.5px] leading-none ' + (active ? 'font-bold text-lapis' : 'text-muted')
              }
            >
              {tab.label}
            </span>
          </NavLink>
        );
      })}

      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('majlis:guide'))}
        className="flex flex-1 flex-col items-center gap-1.5 pb-1.5"
      >
        <svg width="21" height="21" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 1 L9.6 6.4 L15 8 L9.6 9.6 L8 15 L6.4 9.6 L1 8 L6.4 6.4 Z" fill="#B3A896" />
        </svg>
        <span className="text-[10.5px] leading-none text-muted">{t('guide.open')}</span>
      </button>
    </nav>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
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

  const groups: { title: string; items: Item[] }[] = [
    // Arrival on its own, above the doors, because it is not one of them.
    { title: '', items: [{ to: '/', label: t(desk ? 'desk.here' : 'guided.greeting'), end: true }] },

    // One group per door, numbered, because the order is the order a
    // question actually travels and that is information rather than decoration.
    ...doors.map((door) => ({
      title: `${door.ordinal}  ${t(door.label)}`,
      items: door.destinations.map((d) => ({ to: d.to, label: t(d.label) })),
    })),

    {
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
        .filter((d) => !desk || d.to !== '/assistant')
        .map((d) => ({ to: d.to, label: t(d.label) })),
    },
  ];

  const rail = (
    <div className="flex h-full flex-col">
      <Link to="/" className="mb-8 flex items-center gap-3 px-3">
        <Mark />
        <div>
          <div className="font-display text-[21px] leading-none tracking-[-0.018em] text-paper">
            {t('app.name')}
          </div>
          <div className="mt-1.5 text-[11px] leading-snug text-muted">{t('app.stage')}</div>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto">
        {groups.map((g) => (
          <Group key={g.title} title={g.title} items={g.items} />
        ))}
      </nav>

      <Installation />
    </div>
  );

  return (
    <div className="relative min-h-dvh bg-ink text-paper">
      {/*
        The sweep: one continuous curve carrying light across the whole frame.
        It sits under everything and is never a line the eye has to read.
      */}
      <div className="g-sweep" aria-hidden="true" />

      {/* ── the rail, permanent on a wide screen ────────────────────── */}
      <aside className="fixed inset-y-0 start-0 z-20 hidden w-[260px] overflow-y-auto bg-surface/70 px-3 py-6 shadow-[1px_0_0_rgba(25,23,19,0.055)] backdrop-blur-xl lg:block">
        {rail}
      </aside>

      <div className="relative lg:ps-[260px]">
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
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <Mark />
            <div className="min-w-0">
              <div className="font-display text-[19px] leading-none tracking-[-0.016em]">
                {t('app.name')}
              </div>
              {boardName && (
                <div className="mt-1.5 truncate text-[11.5px] leading-none text-muted">
                  {boardName}
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
            <Link
              to="/search"
              aria-label={t('besides.search')}
              className="grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-raised/60 hover:text-paper"
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

        {/* The language, before anything else, because a reader who cannot
            read the screen needs this before they need the screen. */}
        <div className="sticky top-[60px] z-20 flex justify-end bg-ink/80 px-5 pb-2.5 backdrop-blur-xl lg:hidden">
          <div className="flex gap-0.5 rounded-xl bg-paper/[0.045] p-[3px]">
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang(l.code)}
                aria-pressed={lang === l.code}
                className={
                  'rounded-lg px-3 py-1 text-[12px] transition-all ' +
                  (lang === l.code
                    ? 'bg-raised font-semibold text-paper shadow-[0_1px_2px_rgba(25,23,19,0.08)]'
                    : 'text-muted')
                }
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── the wide bar: where you are, who you are ────────────────── */}
        <header className="sticky top-0 z-30 hidden items-center justify-between gap-4 bg-ink/80 px-5 py-3 shadow-[0_1px_0_rgba(25,23,19,0.055)] backdrop-blur-xl lg:flex">
          <span className="text-[13px] text-muted">{t('shell.where')}</span>

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
              <span className="text-[12.5px]">{t('besides.search')}</span>
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
                className="rounded-xl bg-lapis px-4 py-2 text-[12.5px] font-semibold text-white shadow-act transition-shadow hover:shadow-lift"
              >
                {t('door.asked.put')}
              </Link>
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
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLang(l.code)}
                  aria-pressed={lang === l.code}
                  className={
                    'rounded-lg px-2.5 py-1 text-[12px] transition-all ' +
                    (lang === l.code
                      ? 'bg-raised font-semibold text-paper shadow-[0_1px_2px_rgba(25,23,19,0.08)]'
                      : 'text-muted hover:text-sand')
                  }
                >
                  {l.label}
                </button>
              ))}
            </div>

            {/* Who is here, and what they may do. It decides what half the
                controls in this application are allowed to be. */}
            <div className="flex items-center gap-3">
              <div className="text-end">
                <div className="text-[12.5px] font-semibold leading-tight text-paper">
                  {identity?.scholarId ?? t('shell.anonymous')}
                </div>
                <div className="text-[11px] leading-tight text-muted">
                  {t(`role.${identity?.role ?? 'observer'}`)}
                </div>
              </div>
              <Avatar id={identity?.scholarId} />
            </div>
          </div>
        </header>

        <main
          key={path}
          className={
            'mx-auto w-full px-5 py-8 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-8 lg:pb-24 ' +
            (atWorkArea(path) ? 'max-w-work' : 'max-w-reading')
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
              <div className="font-display text-[17px] leading-snug">{t('lang.notReady')}</div>
              <p className="mt-2.5 max-w-[62ch] text-[13px] leading-[1.7] text-muted">
                {t('lang.notReadyBody')}
              </p>
            </div>
          )}

          {/*
            ── the same three things on every screen ──────────────────────

            Where you are, what you do here, and what happens next. They are
            rendered by the frame rather than by each page on purpose: the
            screens that most need them are the thin ones, and those are
            exactly the ones that would have been forgotten. A dead end is now
            impossible by construction — `lib/journey.ts` has no route without
            an onward step.
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
              <PhaseBar />
              <WhatYouDo />

              {children}

              <WhatNext />
            </>
          )}
        </main>
      </div>

      <TabBar />

      {/* A page change should be felt, not just happen. */}
      <style>{`@keyframes shellFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
