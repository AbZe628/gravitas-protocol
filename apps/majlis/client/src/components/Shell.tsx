
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useI18n } from '../lib/i18n.js';
import { useIdentity } from '../lib/identity.js';
import { useHealth } from '../lib/health.js';
import { useBoardName } from '../lib/board.js';
import { LANGS, dirFor } from '../locales/index.js';

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
    <div className="mb-7">
      <div className="mb-2.5 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
        {title}
      </div>
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

  const tabs = [
    { to: '/', label: t('tab.work'), end: true, icon: 'work' },
    { to: '/record', label: t('nav.record'), icon: 'record' },
    { to: '/calendar', label: t('nav.calendar'), icon: 'coming' },
    { to: '/more', label: t('tab.more'), icon: 'more' },
  ] as const;

  const icon = (kind: string, active: boolean) => {
    const stroke = active ? '#164470' : '#B3A896';
    if (kind === 'work') {
      return (
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.9" strokeLinecap="round">
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      );
    }
    if (kind === 'record') {
      return (
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.9" strokeLinecap="round">
          <rect x="4" y="4" width="16" height="16" rx="2.5" />
          <path d="M9 9h6M9 14h4" />
        </svg>
      );
    }
    if (kind === 'coming') {
      return (
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.9" strokeLinecap="round">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5v5l3.2 2" />
        </svg>
      );
    }
    // Everything the four do not hold.
    return (
      <svg width="21" height="21" viewBox="0 0 24 24" fill={stroke}>
        <circle cx="5" cy="12" r="1.9" />
        <circle cx="12" cy="12" r="1.9" />
        <circle cx="19" cy="12" r="1.9" />
      </svg>
    );
  };

  return (
    <nav
      aria-label={t('shell.menu')}
      className="fixed inset-x-0 bottom-0 z-40 flex items-start bg-raised/85 px-1.5 pt-2.5 shadow-[0_-0.5px_0_rgba(25,23,19,0.09)] backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={'end' in tab ? tab.end : undefined}
          className="flex flex-1 flex-col items-center gap-1.5 pb-1.5"
        >
          {({ isActive }) => (
            <>
              {icon(tab.icon, isActive)}
              <span
                className={
                  'text-[10.5px] leading-none ' +
                  (isActive ? 'font-bold text-lapis' : 'text-muted')
                }
              >
                {tab.label}
              </span>
            </>
          )}
        </NavLink>
      ))}

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

  const groups: { title: string; items: Item[] }[] = [
    {
      title: t('shell.theWork'),
      items: [
        { to: '/', label: t('guided.greeting'), end: true },
        { to: '/incidents', label: t('nav.incidents') },
        { to: '/calendar', label: t('nav.calendar') },
      ],
    },
    {
      title: t('more.decided'),
      items: [
        { to: '/record', label: t('stands.title') },
        { to: '/search', label: t('nav.search') },
        { to: '/classic', label: t('more.allMatters') },
      ],
    },
    {
      title: t('more.hold'),
      items: [
        { to: '/register', label: t('nav.register') },
        { to: '/library', label: t('nav.library') },
        { to: '/calculations', label: t('nav.calculations') },
      ],
    },
    {
      title: t('more.theBoard'),
      items: [
        { to: '/meetings', label: t('nav.meetings') },
        { to: '/briefings', label: t('nav.briefings') },
        ...(health?.assistantKind === 'off'
          ? []
          : [{ to: '/assistant', label: t('nav.assistant') }]),
        { to: '/settings', label: t('nav.settings') },
      ],
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
          <Avatar id={identity?.scholarId} />
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

          {children}
        </main>
      </div>

      <TabBar />

      {/* A page change should be felt, not just happen. */}
      <style>{`@keyframes shellFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
