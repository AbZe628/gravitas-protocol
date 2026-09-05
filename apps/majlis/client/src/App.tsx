import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useI18n } from './lib/i18n.js';
import { LANGS } from './locales/index.js';
import Dashboard from './pages/Dashboard.js';
import Guided from './pages/Guided.js';
import MatterAction from './pages/MatterAction.js';
import More from './pages/More.js';
import WhatStands from './pages/WhatStands.js';
import MatterDetail from './pages/MatterDetail.js';
import Rules from './pages/Rules.js';
import AssetDetail from './pages/AssetDetail.js';
import Calculations from './pages/Calculations.js';
import Library from './pages/Library.js';
import Calendar from './pages/Calendar.js';
import Meetings from './pages/Meetings.js';
import Register from './pages/Register.js';
import Settings from './pages/Settings.js';
import Incidents from './pages/Incidents.js';
import IncidentDetail from './pages/IncidentDetail.js';
import Briefings from './pages/Briefings.js';
import Assistant from './pages/Assistant.js';
import Record from './pages/Record.js';
import Search from './pages/Search.js';
import SignedInAs from './components/SignedInAs.js';
import Guide from './components/Guide.js';
import { useHealth } from './lib/health.js';

function Nav() {
  const { t } = useI18n();
  const health = useHealth();
  const items = [
    { to: '/', label: t('nav.matters'), end: true },
    // Finding a matter is the same errand as reading one, so it sits beside it.
    { to: '/search', label: t('nav.search') },
    // The domain, before the questions raised about it. A scholar looking for
    // the work starts here; everything else lists work already started.
    { to: '/register', label: t('nav.register') },
    { to: '/rules', label: t('nav.rules') },
    // What the board holds, beside what it has decided. The library is the
    // standard a matter is judged against; the rules are what came out of it.
    { to: '/library', label: t('nav.library') },
    // The arithmetic, beside the rules it is done under. A scholar computing
    // purification is doing the ordinary work of a ruling already in force.
    { to: '/calculations', label: t('nav.calculations') },
    // A reported breach is not a proposal and does not belong in the list of
    // them. It has its own clock, which is the whole difference.
    { to: '/incidents', label: t('nav.incidents') },
    { to: '/calendar', label: t('nav.calendar') },
    // Beside the calendar, because the cadence is one of its six clocks and a
    // reader looking for when the board last met is looking at dates.
    { to: '/meetings', label: t('nav.meetings') },
    { to: '/briefings', label: t('nav.briefings') },
    // Offering a page that can only refuse is worse than not offering it.
    ...(health?.assistantKind === 'off' ? [] : [{ to: '/assistant', label: t('nav.assistant') }]),
    { to: '/record', label: t('nav.record') },
    { to: '/settings', label: t('nav.settings') },
  ];
  return (
    <nav className="sticky bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur md:static md:border-b md:border-t-0">
      {/*
        Scrollable on a narrow screen, and it has needed to be for a while: at
        ten items the labels already wanted about 670px in a 375px viewport, so
        the last of them were simply cut off with no way to reach them. Sharing
        the width equally would have made every label unreadable instead.
      */}
      <ul className="mx-auto flex max-w-reading items-stretch gap-1 overflow-x-auto px-2 [scrollbar-width:none] md:justify-start md:overflow-visible md:px-5">
        {items.map((i) => (
          <li key={i.to} className="shrink-0">
            <NavLink
              to={i.to}
              end={i.end}
              className={({ isActive }) =>
                'block px-3 py-3 text-center text-[12px] md:text-[13px] transition-colors ' +
                (isActive
                  ? 'text-goldsoft border-t-2 md:border-t-0 md:border-b-2 border-gold'
                  : 'text-muted border-t-2 md:border-t-0 md:border-b-2 border-transparent hover:text-paper')
              }
            >
              {i.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function LangSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex gap-1">
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          aria-pressed={lang === l.code}
          className={
            'rounded px-2 py-1 text-[12px] transition-colors ' +
            (lang === l.code ? 'bg-gold/15 text-goldsoft' : 'text-muted hover:text-paper')
          }
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const { t } = useI18n();

  /*
   * The three guided screens carry no navigation.
   *
   * Twelve items under a screen whose whole point is that one thing needs you
   * contradicts the screen. What needs me, one matter, and everything else each
   * carry the single link they need instead.
   *
   * Every other page keeps it. Somebody who has gone into the register from
   * 'everything else' needs a way out that is not the browser's back button,
   * and that is where the nav has always earned its place.
   */
  const path = useLocation().pathname;
  const guided =
    path === '/' || path === '/more' || /^\/matters\/[^/]+$/.test(path);

  return (
    <div className="min-h-dvh bg-ink text-paper font-sans flex flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-reading items-center justify-between px-5 py-4">
          <div>
            <div className="text-[17px] font-semibold tracking-tight">{t('app.name')}</div>
            <div className="text-[11px] text-muted mt-0.5">{t('app.stage')}</div>
          </div>
          <div className="flex items-center gap-4">
            <SignedInAs />
            <LangSwitch />
          </div>
        </div>
      </header>

      {!guided && (
        <div className="hidden md:block">
          <Nav />
        </div>
      )}

      <main className="mx-auto w-full max-w-reading flex-1 px-5 py-6 pb-24 md:pb-10">
        <Routes>
          {/*
            Guided answers the only question a scholar arrives with — is there
            anything here for me — and stops. Classic is the same Dashboard,
            unchanged, one link away: nothing was removed, and what changed is
            what a person sees first.
          */}
          <Route path="/" element={<Guided />} />
          <Route path="/more" element={<More />} />

          {/*
            One matter, one act. `MatterDetail` puts twelve sections on a page
            and a scholar scrolls past all of them to reach the thing they came
            to do. Every section still exists, unchanged, at the classic path —
            what changed is that they no longer compete with the act.
          */}
          <Route path="/matters/:id" element={<MatterAction />} />
          <Route path="/classic/matters/:id" element={<MatterDetail />} />
          <Route path="/classic" element={<Dashboard />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register/:id" element={<AssetDetail />} />
          <Route path="/rules" element={<WhatStands />} />
          <Route path="/classic/rules" element={<Rules />} />
          <Route path="/library" element={<Library />} />
          <Route path="/calculations" element={<Calculations />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/meetings" element={<Meetings />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/incidents/:id" element={<IncidentDetail />} />
          <Route path="/briefings" element={<Briefings />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/search" element={<Search />} />
          {/*
            What we decided and what stands, in one place. Two pages that were
            always two answers to one question, neither of them changed — the
            classic paths still reach each on its own.
          */}
          <Route path="/record" element={<WhatStands />} />
          <Route path="/classic/record" element={<Record />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>

      {!guided && (
        <div className="md:hidden">
          <Nav />
        </div>
      )}

      {/*
        On every screen, because the question "what does this mean" arrives
        wherever somebody happens to be standing — and an application that keeps
        its explanations on a page of their own has explanations nobody reads.
      */}
      <Guide />
    </div>
  );
}
