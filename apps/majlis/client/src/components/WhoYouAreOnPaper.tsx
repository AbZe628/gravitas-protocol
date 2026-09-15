import { useEffect, useState } from 'react';
import { account, api, Refused, type Board } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { useIdentity } from '../lib/identity.js';
import { Division } from './page.js';
import { Field, HEADING } from './field.js';
import { Button } from './Button';

/**
 * Your own name, title and where you can be reached.
 *
 * ── what this changes, and what it deliberately does not ──────────────────
 *
 * A member's name and title are printed on every ruling they sign, and the
 * board is the only place that knows when one changes. Until now they came
 * from whatever a deployment configuration said on the day the board was set
 * up, and nobody could correct them.
 *
 * **A ruling already issued does not move.** A position now keeps the name and
 * title it was recorded under, so a correction made today does not rewrite the
 * signature block of something signed two years ago. That is the whole reason
 * this can be offered at all, and it is said on the screen because a member
 * about to change how they are named deserves to know which way it cuts.
 *
 * ── an address is kept, never claimed as confirmed ────────────────────────
 *
 * The handbook asks that a new address be confirmed before it takes effect.
 * Confirming means sending to it, and this installation sends nothing until
 * the institution wires its own mail relay. So it is stored, marked
 * unconfirmed, and the screen says so rather than the software claiming a
 * confirmation it never performed.
 *
 * ── two settings this does not offer, and why ─────────────────────────────
 *
 * **Which notifications arrive.** Nothing is sent. A panel of preferences for
 * a system that delivers nothing is a screen that lies to the person filling
 * it in, and it would be believed.
 *
 * **A signature.** Signing is done with a key held on the member's own device
 * and that is not built. An image kept here and printed on a ruling would look
 * exactly like a signature and be nothing of the kind, which is worse than
 * having none.
 *
 * Both are named at the foot of the panel rather than silently missing.
 */

export default function WhoYouAreOnPaper() {
  const { t } = useI18n();
  const { identity } = useIdentity();

  const [board, setBoard] = useState<Board | null>(null);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');

  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [kept, setKept] = useState(false);

  useEffect(() => {
    let live = true;
    api
      .boards()
      .then((list) => {
        if (!live) return;
        const mine = list.find((b) => b.members.some((m) => m.id === identity?.scholarId));
        if (!mine) return;
        setBoard(mine);

        const me = mine.members.find((m) => m.id === identity?.scholarId);
        setName(me?.name ?? '');
        setTitle(me?.title ?? '');
        setEmail(me?.email ?? '');
        setTelephone(me?.telephone ?? '');
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [identity?.scholarId]);

  /*
   * Absent for a credential that sits on no board — the institution's desk.
   * It has no entry to change, and a form that refused on submission would be
   * a control that could not be honoured.
   */
  const me = board?.members.find((m) => m.id === identity?.scholarId);
  if (!me) return null;

  async function keep(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setRefusal(null);
    setKept(false);
    try {
      await account.changeDetails({
        name: name.trim(),
        title: title.trim(),
        email: email.trim() || null,
        telephone: telephone.trim() || null,
      });
      setKept(true);
    } catch (error) {
      setRefusal(error instanceof Refused ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  const BOX = 'w-full rounded-xl bg-raised px-3 py-2.5 text-body shadow-ring outline-none';

  return (
    <Division heading={t('you.heading')} note={t('you.note')}>
      <form onSubmit={keep}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('you.name')} headingClass={HEADING}>
            {(attrs) => (
              <input
                {...attrs}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={BOX}
                required
              />
            )}
          </Field>

          <Field label={t('you.title')} help={t('you.titleHelp')} headingClass={HEADING}>
            {(attrs) => (
              <input
                {...attrs}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={BOX}
              />
            )}
          </Field>

          <Field label={t('you.email')} headingClass={HEADING}>
            {(attrs) => (
              <input
                {...attrs}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={BOX}
              />
            )}
          </Field>

          <Field label={t('you.telephone')} headingClass={HEADING}>
            {(attrs) => (
              <input
                {...attrs}
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                className={BOX}
              />
            )}
          </Field>
        </div>

        {/*
          What the record actually holds about the address, said plainly. A
          member who believes an unconfirmed address has been verified will
          expect notices that are not coming.
        */}
        {me.email && (
          <p className="mt-2.5 text-note leading-relaxed text-muted">
            {me.emailConfirmed ? t('you.confirmed') : t('you.notConfirmed')}
          </p>
        )}

        {refusal && <p className="mt-3 text-ui leading-relaxed text-breach">{refusal}</p>}
        {kept && <p className="mt-3 text-ui text-settled">{t('you.kept')}</p>}

        <Button
          type="submit"
          disabled={busy || name.trim().length === 0}
          className="mt-4 rounded-xl bg-lapis px-5 py-2.5 text-ui font-semibold text-white shadow-act disabled:opacity-40"
        >
          {busy ? t('common.loading') : t('you.keep')}
        </Button>
      </form>

      {/* Named rather than silently missing. */}
      <ul className="mt-5 space-y-2 border-t border-line pt-4">
        <li className="max-w-[62ch] text-note leading-relaxed text-muted">
          {t('you.noNotifications')}
        </li>
        <li className="max-w-[62ch] text-note leading-relaxed text-muted">
          {t('you.noSignature')}
        </li>
      </ul>
    </Division>
  );
}
