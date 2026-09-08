import { useEffect, useState } from 'react';
import { account, type Me } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Division, Nothing } from './page.js';

/**
 * Your own account: your password, and letting somebody back in.
 *
 * ── the fault this closes ─────────────────────────────────────────────────
 *
 * There was no account. A member was a line in an environment variable, so
 * nobody could change their own password and a forgotten one could only be
 * fixed by whoever had shell access to the deployment. For a board of nine
 * scholars in four countries that is not a governance product, it is a
 * prototype.
 *
 * ── it says when a board is still on the seed ─────────────────────────────
 *
 * A bank running on the passwords somebody typed into a deployment
 * configuration should be told so, in plain words, by the one person who can
 * fix it. It is not a warning banner and it is not red: it is a sentence, and
 * it goes away the moment they set their own.
 *
 * ── the code is shown once ────────────────────────────────────────────────
 *
 * Nothing reads an outstanding code back out — not this screen, not any
 * route. So the secretary sees it once, reads it to the member, and if they
 * lose it they issue another. That is deliberate: a screen that could show it
 * again would let anybody who reached that screen take an account.
 */

const field =
  'w-full rounded-card bg-ink px-4 py-3 text-[13.5px] leading-[1.6] text-paper shadow-ring outline-none placeholder:text-muted focus:shadow-lift';

export default function YourAccount() {
  const { t } = useI18n();
  const [me, setMe] = useState<Me | null>(null);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [changing, setChanging] = useState(false);
  const [changed, setChanged] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const [who, setWho] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [issueFailed, setIssueFailed] = useState<string | null>(null);

  useEffect(() => {
    account
      .me()
      .then(setMe)
      // Not knowing is a state: the panel stays away rather than offering a
      // password change against an installation that holds no credentials.
      .catch(() => undefined);
  }, []);

  if (!me) return null;

  async function change(e: React.FormEvent) {
    e.preventDefault();
    setChanging(true);
    setFailed(null);
    try {
      await account.changePassword(current, next);
      setCurrent('');
      setNext('');
      setChanged(true);
      setMe(await account.me());
    } catch (err) {
      setFailed(err instanceof Error ? err.message : t('acct.failed'));
    } finally {
      setChanging(false);
    }
  }

  async function issue(e: React.FormEvent) {
    e.preventDefault();
    setIssuing(true);
    setIssueFailed(null);
    setCode(null);
    try {
      const res = await account.issueReset(who.trim());
      // `issued: false` is the answer for a member nobody holds a credential
      // for, and it is deliberately the same shape as a success.
      setCode(res.issued && res.code ? res.code : '');
    } catch (err) {
      setIssueFailed(err instanceof Error ? err.message : t('acct.failed'));
    } finally {
      setIssuing(false);
    }
  }

  const mayIssue = me.office === 'secretary' || me.office === 'chair';

  return (
    <>
      <Division heading={t('acct.yours')}>
        {me.stillOnTheSeed && (
          <p className="mb-5 max-w-[62ch] text-[13px] leading-[1.65] text-sand">
            {t('acct.onTheSeed')}
          </p>
        )}

        {!me.resetsPossible ? (
          <Nothing>{t('acct.noCredentials')}</Nothing>
        ) : (
          <form onSubmit={change} className="max-w-[46ch] space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-[12px] text-muted">{t('acct.current')}</span>
              <input
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className={field}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[12px] text-muted">{t('acct.new')}</span>
              <input
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                className={field}
              />
              {/* The floor, and why it is the only rule. */}
              <span className="mt-1.5 block text-[11.5px] leading-[1.55] text-muted">
                {t('acct.howLong').replace('{n}', String(me.passwordMinimum))}
              </span>
            </label>

            {failed && <p className="text-[12.5px] text-breach">{failed}</p>}
            {changed && <p className="text-[12.5px] text-settled">{t('acct.changed')}</p>}

            <button
              type="submit"
              disabled={changing || !current || next.length < me.passwordMinimum}
              className="rounded-card bg-lapis px-6 py-3 text-[14px] font-bold text-white shadow-act disabled:opacity-50"
            >
              {changing ? t('acct.changing') : t('acct.change')}
            </button>
          </form>
        )}
      </Division>

      {/*
        Letting somebody back in. Only for the secretary and the chair, and
        absent rather than disabled for everybody else — a control that cannot
        be honoured should not be on the screen.
      */}
      {mayIssue && me.resetsPossible && (
        <Division heading={t('acct.letBackIn')} note={t('acct.letBackInNote')}>
          <form onSubmit={issue} className="max-w-[46ch] space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-[12px] text-muted">{t('acct.whoForgot')}</span>
              <input
                value={who}
                onChange={(e) => setWho(e.target.value)}
                placeholder="member-a"
                className={field + ' font-mono'}
              />
            </label>

            {issueFailed && <p className="text-[12.5px] text-breach">{issueFailed}</p>}

            <button
              type="submit"
              disabled={issuing || !who.trim()}
              className="rounded-card bg-raised px-5 py-2.5 text-[13.5px] font-semibold text-lapis shadow-ring disabled:opacity-50"
            >
              {issuing ? t('acct.issuing') : t('acct.issue')}
            </button>
          </form>

          {code !== null &&
            (code === '' ? (
              // Said the same way as a success, on purpose: the difference is
              // how a board's membership gets read off the door.
              <p className="mt-4 max-w-[62ch] text-[13px] leading-[1.65] text-muted">
                {t('acct.ifTheyHold')}
              </p>
            ) : (
              <div className="mt-4 max-w-[46ch] rounded-card bg-ink px-5 py-4 shadow-ring">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                  {t('acct.readThis')}
                </div>
                <div className="mt-2 font-mono text-[22px] tracking-[0.08em] text-lapis">{code}</div>
                <p className="mt-3 text-[12px] leading-[1.6] text-muted">{t('acct.shownOnce')}</p>
              </div>
            ))}
        </Division>
      )}
    </>
  );
}
