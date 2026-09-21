import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '../lib/i18n.js';
import { isInstitution, useIdentity } from '../lib/identity.js';
import { DESK_DOORS, DOORS, mainOf } from '../lib/spine.js';
import { PageHead } from './page.js';

/**
 * An address that is not a screen.
 *
 * ── what was there before ─────────────────────────────────────────────────
 *
 * Nothing. The route table had no catch-all, so a mistyped address, a stale
 * bookmark or a link from a mail somebody sent last quarter rendered the
 * frame with an **empty middle** — rail, masthead, tab bar, status bar, and
 * between them nothing at all. Measured: zero characters inside `main` on
 * every width. A member reads that as the application having broken, and
 * the honest reading is narrower: that address has never been a screen.
 *
 * ── and it is not a refusal ───────────────────────────────────────────────
 *
 * `NotYourScreen` answers a real screen opened by the wrong person, and says
 * whose it is. This answers an address that is nobody's. Keeping the two
 * apart matters: a bank told *not found* on the board's own record would
 * conclude it had mistyped, and a member told *this is not yours* about a
 * typo would go looking for permission they do not need.
 *
 * ── it names what was asked for ───────────────────────────────────────────
 *
 * The address itself, written out. A screen that says only *not found* leaves
 * a member unable to tell a typo from a link that has moved, and the first
 * thing anybody does is look at what they actually opened.
 *
 * The doors come from the spine and are whoever's this installation is
 * serving, so a dead end still ends somewhere.
 */
export default function NoSuchAddress() {
  const { t } = useI18n();
  const { identity } = useIdentity();
  const path = useLocation().pathname;
  const doors = isInstitution(identity?.role) ? DESK_DOORS : DOORS;

  return (
    <div>
      <PageHead title={t('nowhere.title')} says={t('nowhere.says')} />

      <p className="mb-8 font-mono text-ui text-muted" dir="ltr">
        {path}
      </p>

      <section className="border-t border-line py-6">
        <div className="mb-3 text-label font-bold uppercase tracking-caps text-muted">
          {t('nowhere.instead')}
        </div>
        <ul className="space-y-2.5">
          {doors.map((door) => (
            <li key={door.phase}>
              <Link
                to={mainOf(door)}
                className="block rounded-card bg-raised px-5 py-4 shadow-ring transition-all hover:shadow-card"
              >
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-mono text-note text-muted">{door.ordinal}</span>
                  <span className="font-display text-sub leading-snug">{t(door.label)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
