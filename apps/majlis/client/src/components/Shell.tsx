import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useI18n } from '../lib/i18n.js';
import { useIdentity } from '../lib/identity.js';
import { useHealth } from '../lib/health.js';
import { LANGS } from '../locales/index.js';

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
 */

interface Item {
  to: string;
  label: string;
  end?: boolean;
}

function Group({ title, items }: { title: string; items: Item[] }) {
  return (
    <div className="mb-7">
      <div className="mb-2 px-3 text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted/70">
        {title}
      </div>
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                'relative block rounded-lg px-3 py-2 text-[13.5px] transition-colors ' +
                (isActive
                  ? 'bg-white/[0.06] font-medium text-paper'
                  : 'text-sand hover:bg-white/[0.03] hover:text-paper')
              }
            >
              {({ isActive }) => (
                <>
                  {/* The active mark is a bar, not a colour change alone: it
                      survives being read at a glance and in high contrast. */}
                  {isActive && (
                    <span className="absolute inset-y-1.5 start-0 w-[3px] rounded-full bg-gold" />
                  )}
                  {item.label}
                </>
              )}
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
      <div className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted/70">
        {t('shell.installation')}
      </div>

      <div className="space-y-1.5 text-[12px]">
        <div className="flex items-center gap-2">
          <span
            className={
              'h-1.5 w-1.5 shrink-0 rounded-full ' + (enforced ? 'bg-settled' : 'bg-muted')
            }
          />
          <span className="text-muted">
            {t(enforced ? 'shell.enforced' : 'shell.notEnforced')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={
              'h-1.5 w-1.5 shrink-0 rounded-full ' +
              (health.assistantKind === 'off' ? 'bg-muted' : 'bg-settled')
            }
          />
          <span className="text-muted">
            {t(health.assistantKind === 'off' ? 'shell.noAssistant' : 'shell.assistant')}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const { identity } = useIdentity();
  const health = useHealth();
  const [drawer, setDrawer] = useState(false);
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
      <Link to="/" className="mb-8 block px-3">
        <div className="font-display text-[19px] leading-none text-paper">{t('app.name')}</div>
        <div className="mt-1.5 text-[11px] leading-snug text-muted">{t('app.stage')}</div>
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
    <div className="min-h-dvh bg-ink text-paper">
      {/* ── the rail, permanent on a wide screen ────────────────────── */}
      <aside className="fixed inset-y-0 start-0 hidden w-[260px] overflow-y-auto border-e border-line bg-surface px-3 py-6 lg:block">
        {rail}
      </aside>

      {/*
        On a narrow screen the same rail slides in. A board reads this on a
        phone between two other things, and a navigation that only exists at
        1024px is a navigation half the board never sees.
      */}
      {drawer && (
        <>
          <button
            type="button"
            aria-label={t('shell.close')}
            onClick={() => setDrawer(false)}
            className="fixed inset-0 z-40 bg-ink/70 backdrop-blur-sm lg:hidden"
          />
          <aside className="fixed inset-y-0 start-0 z-50 w-[280px] overflow-y-auto border-e border-line bg-surface px-3 py-6 shadow-lift lg:hidden">
            <div onClick={() => setDrawer(false)}>{rail}</div>
          </aside>
        </>
      )}

      <div className="lg:ps-[260px]">
        {/* ── the bar: where you are, who you are ─────────────────────── */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-line bg-ink/85 px-5 py-3 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawer(true)}
              aria-label={t('shell.menu')}
              className="rounded-lg border border-line px-2.5 py-1.5 text-[13px] text-sand transition-colors hover:text-paper lg:hidden"
            >
              ☰
            </button>
            <span className="text-[13px] text-muted">{t('shell.where')}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex gap-0.5 rounded-lg border border-line p-0.5">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLang(l.code)}
                  aria-pressed={lang === l.code}
                  className={
                    'rounded-md px-2 py-1 text-[12px] transition-colors ' +
                    (lang === l.code ? 'bg-white/[0.07] text-paper' : 'text-muted hover:text-sand')
                  }
                >
                  {l.label}
                </button>
              ))}
            </div>

            {/* Who is here, and what they may do. It decides what half the
                controls in this application are allowed to be. */}
            <div className="flex items-center gap-2.5">
              <div className="text-end">
                <div className="text-[12.5px] leading-tight text-paper">
                  {identity?.scholarId ?? t('shell.anonymous')}
                </div>
                <div className="text-[11px] leading-tight text-muted">
                  {t(`role.${identity?.role ?? 'observer'}`)}
                </div>
              </div>
              <div className="grid h-8 w-8 place-items-center rounded-full border border-line bg-raised font-display text-[13px] text-gold">
                {(identity?.scholarId ?? '?').slice(0, 1).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main
          key={path}
          className="mx-auto w-full max-w-reading px-5 py-8 pb-24 sm:px-8"
          style={{ animation: 'shellFade 220ms ease-out' }}
        >
          {children}
        </main>
      </div>

      {/* A page change should be felt, not just happen. */}
      <style>{`@keyframes shellFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
