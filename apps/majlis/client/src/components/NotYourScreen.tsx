import { Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n.js';
import { DESK_DOORS, mainOf } from '../lib/spine.js';
import { PageHead } from './page.js';

/**
 * A board screen, opened by a bank.
 *
 * ── what this replaces ────────────────────────────────────────────────────
 *
 * A bank was given the board's whole navigation and every one of its screens
 * answered. `/matters` answered in two hundred and eighteen characters whose
 * only heading belonged to the footer. `/holdings` answered in fifty-five and
 * had no heading at all. `/questions` — the board's own triage queue — opened
 * with the instruction *take a question up as a matter, or say why you are
 * not*, addressed to a reader who does neither.
 *
 * The acts on those screens were correctly absent. That is the rule working,
 * and it was being applied to controls and never to the screens themselves,
 * so what a bank actually got was a board screen with its contents removed
 * and its instructions left behind.
 *
 * ── it says whose it is, rather than pretending it does not exist ─────────
 *
 * Not a refusal and not a four-oh-four. Nothing here is secret from a bank —
 * the board's record is the thing it is being shown across three other
 * screens — and an address that answered *not found* would tell a desk it had
 * mistyped something. What is true is narrower and is what it says: this is
 * where the board does its own work, and you have nothing to do on it.
 *
 * ── and it offers the three places that are the bank's ───────────────────
 *
 * Read from `DESK_DOORS`, so a door added there appears here without anybody
 * remembering to add it. A dead end reached by a wrong turn is still a dead
 * end.
 */
export default function NotYourScreen() {
  const { t } = useI18n();

  return (
    <div>
      <PageHead title={t('notyours.title')} says={t('notyours.says')} />

      <section className="border-t border-line py-6">
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
          {t('notyours.yours')}
        </div>
        <ul className="space-y-2.5">
          {DESK_DOORS.map((door) => (
            <li key={door.phase}>
              <Link
                to={mainOf(door)}
                className="block rounded-card bg-raised px-5 py-4 shadow-ring transition-all hover:shadow-card"
              >
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-mono text-[11px] text-muted">{door.ordinal}</span>
                  <span className="font-display text-[17px] leading-snug">{t(door.label)}</span>
                </div>
                <p className="mt-1 max-w-[58ch] text-[12.5px] leading-[1.6] text-muted">
                  {t(door.meaning)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
