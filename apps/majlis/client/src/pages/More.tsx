import { Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n.js';
import { useHealth } from '../lib/health.js';

/**
 * Everything else, in one place, in the order a board would look for it.
 *
 * Twelve navigation items across the top was the shape of the problem: every
 * screen in the application shouting at equal volume, so a scholar could not
 * tell which two they would ever use. None of them is removed. They are moved
 * behind one link and given the grouping they always had and never showed.
 *
 * Four groups, and the grouping is the explanation. **What we decided** and
 * **what we hold** are the record. **Working something out** is the arithmetic
 * a ruling needs. **The board itself** is who sits and when. A person looking
 * for the register is looking under what we hold, and that is the whole of the
 * navigation they have to learn.
 *
 * A page this installation cannot honour is absent rather than listed and
 * refusing, exactly as everywhere else — the assistant does not appear where
 * there is no assistant.
 */

interface Entry {
  to: string;
  label: string;
  note: string;
}

export default function More() {
  const { t } = useI18n();
  const health = useHealth();

  const groups: { title: string; entries: Entry[] }[] = [
    {
      title: t('more.decided'),
      entries: [
        { to: '/record', label: t('stands.title'), note: t('more.record.note') },
        { to: '/search', label: t('nav.search'), note: t('more.search.note') },
        { to: '/classic', label: t('more.allMatters'), note: t('more.allMatters.note') },
      ],
    },
    {
      title: t('more.hold'),
      entries: [
        { to: '/register', label: t('nav.register'), note: t('more.register.note') },
        { to: '/library', label: t('nav.library'), note: t('more.library.note') },
        { to: '/incidents', label: t('nav.incidents'), note: t('more.incidents.note') },
      ],
    },
    {
      title: t('more.workOut'),
      entries: [
        { to: '/calculations', label: t('nav.calculations'), note: t('more.calculations.note') },
        { to: '/briefings', label: t('nav.briefings'), note: t('more.briefings.note') },
        // Absent rather than listed and refusing, like every other control.
        ...(health?.assistantKind === 'off'
          ? []
          : [{ to: '/assistant', label: t('nav.assistant'), note: t('more.assistant.note') }]),
      ],
    },
    {
      title: t('more.theBoard'),
      entries: [
        { to: '/meetings', label: t('nav.meetings'), note: t('more.meetings.note') },
        { to: '/calendar', label: t('nav.calendar'), note: t('more.calendar.note') },
        { to: '/settings', label: t('nav.settings'), note: t('more.settings.note') },
      ],
    },
  ];

  return (
    <div>
      <h1 className="mb-1 text-[19px] font-semibold tracking-tight">{t('more.title')}</h1>
      <p className="mb-6 max-w-prose text-[13px] leading-relaxed text-muted">{t('more.intro')}</p>

      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.title}>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">{group.title}</div>
            <ul className="space-y-1.5">
              {group.entries.map((entry) => (
                <li key={entry.to}>
                  <Link
                    to={entry.to}
                    className="block rounded-xl shadow-ring px-3.5 py-2.5 transition-colors hover:text-paper"
                  >
                    <div className="text-[13.5px]">{entry.label}</div>
                    {/* What it is for, because the name alone taught nobody. */}
                    <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{entry.note}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-8 border-t border-line pt-4">
        <Link
          to="/"
          className="text-[12.5px] text-muted underline decoration-line underline-offset-4 transition-colors hover:text-paper"
        >
          {t('more.back')}
        </Link>
      </div>
    </div>
  );
}
