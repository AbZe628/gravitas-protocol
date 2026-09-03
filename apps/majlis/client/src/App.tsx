import { NavLink, Route, Routes } from 'react-router-dom';
import { useI18n } from './lib/i18n.js';
import { LANGS } from './locales/index.js';
import Dashboard from './pages/Dashboard.js';
import MatterDetail from './pages/MatterDetail.js';
import Rules from './pages/Rules.js';
import Calendar from './pages/Calendar.js';
import Settings from './pages/Settings.js';
import Incidents from './pages/Incidents.js';
import IncidentDetail from './pages/IncidentDetail.js';
import Briefings from './pages/Briefings.js';
import Assistant from './pages/Assistant.js';
import Record from './pages/Record.js';
import Search from './pages/Search.js';
import SignedInAs from './components/SignedInAs.js';
import { useHealth } from './lib/health.js';

function Nav() {
  const { t } = useI18n();
  const health = useHealth();
  const items = [
    { to: '/', label: t('nav.matters'), end: true },
    // Finding a matter is the same errand as reading one, so it sits beside it.
    { to: '/search', label: t('nav.search') },
    { to: '/rules', label: t('nav.rules') },
    // A reported breach is not a proposal and does not belong in the list of
    // them. It has its own clock, which is the whole difference.
    { to: '/incidents', label: t('nav.incidents') },
    { to: '/calendar', label: t('nav.calendar') },
    { to: '/briefings', label: t('nav.briefings') },
    // Offering a page that can only refuse is worse than not offering it.
    ...(health?.assistantKind === 'off' ? [] : [{ to: '/assistant', label: t('nav.assistant') }]),
    { to: '/record', label: t('nav.record') },
    { to: '/settings', label: t('nav.settings') },
  ];
  return (
    <nav className="sticky bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur md:static md:border-b md:border-t-0">
      <ul className="mx-auto flex max-w-reading items-stretch justify-between px-2 md:justify-start md:gap-1 md:px-5">
        {items.map((i) => (
          <li key={i.to} className="flex-1 md:flex-none">
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

      <div className="hidden md:block">
        <Nav />
      </div>

      <main className="mx-auto w-full max-w-reading flex-1 px-5 py-6 pb-24 md:pb-10">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/matters/:id" element={<MatterDetail />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/incidents/:id" element={<IncidentDetail />} />
          <Route path="/briefings" element={<Briefings />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/search" element={<Search />} />
          <Route path="/record" element={<Record />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>

      <div className="md:hidden">
        <Nav />
      </div>
    </div>
  );
}
