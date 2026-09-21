import { useEffect, useState } from 'react';
import { account, type Me } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import Act from './Act.js';
import { Button } from './Button';

/**
 * The board's dates, in the calendar a member already keeps.
 *
 * ── what there was ────────────────────────────────────────────────────────
 *
 * A download. A downloaded calendar is a photograph: the sitting convened
 * tomorrow is not in the copy somebody took last month, and nobody goes back
 * for a second copy. *"Zasto nema opcije da mogu spojiti svoje kalendare sa
 * aplikacijom … da im dodje odmah u kalendar."*
 *
 * ── and why this is a decision rather than a feature ──────────────────────
 *
 * No calendar client can answer a password prompt. It fetches an address
 * every few hours and takes what comes back, so a live subscription is
 * reached by an address carrying its own secret — a bearer credential, in a
 * URL, which will end up in a log and somebody's bookmarks.
 *
 * So the screen says so, before the press and not in a footnote, and the
 * three things that make it survivable are true: the address opens **one
 * route** and nothing else, so the worst it yields is a list of dates; it
 * is shown **once**, because the record keeps a fingerprint and not the
 * secret; and withdrawing it is one press, in the same place.
 */
export default function FollowInYourCalendar() {
  const { t } = useI18n();
  const [me, setMe] = useState<Me | null>(null);
  const [asking, setAsking] = useState<'issue' | 'revoke' | null>(null);
  /** Held only until the member leaves this screen. Nothing stores it. */
  const [shown, setShown] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = () =>
    account
      .me()
      .then(setMe)
      .catch(() => setMe(null));

  useEffect(() => {
    void load();
  }, []);

  /*
   * The whole address, as it will be pasted. Built here from the page's own
   * origin: the member is looking at this installation, so this is the host
   * their calendar must reach.
   */
  const addressFor = (token: string) =>
    `${window.location.origin}/api/calendar.ics?feed=${encodeURIComponent(token)}`;

  async function issue() {
    const made = await account.issueCalendarFeed();
    setShown(addressFor(made.token));
    setCopied(false);
    await load();
  }

  async function withdraw() {
    await account.revokeCalendarFeed();
    setShown(null);
    await load();
  }

  if (!me) return null;

  return (
    <section className="mt-7 rounded-card bg-raised px-4 py-3.5 shadow-ring">
      <div className="mb-1.5 text-label font-bold uppercase tracking-caps text-muted">
        {t('feed.title')}
      </div>
      <p className="mb-3 max-w-[62ch] text-ui leading-relaxed text-muted">{t('feed.lead')}</p>

      {/*
        Said before the press. An address that opens a door without a
        password is not a detail to discover afterwards.
      */}
      <p className="mb-3 max-w-[62ch] text-note leading-relaxed text-sand">{t('feed.cost')}</p>

      {shown && (
        <div className="mb-3 rounded-xl bg-ink px-3.5 py-3 shadow-ring">
          <div className="mb-1.5 text-label font-bold uppercase tracking-caps text-gold">
            {t('feed.onceOnly')}
          </div>
          {/*
            Selectable, wrapping, in a fixed width: this is copied by hand as
            often as by button, and an address that runs off the edge is an
            address somebody pastes half of.
          */}
          <p className="break-all font-mono text-note leading-relaxed text-paper">{shown}</p>
          <Button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(shown).then(
                () => setCopied(true),
                /* A browser that refuses the clipboard leaves the text to hand. */
                () => setCopied(false),
              );
            }}
            className="mt-2 rounded-xl bg-raised px-3 py-1.5 text-note text-lapis shadow-ring hover:text-paper"
          >
            {copied ? t('feed.copied') : t('feed.copy')}
          </Button>
        </div>
      )}

      {me.calendarFeed && !shown && (
        <p className="mb-3 max-w-[62ch] text-ui leading-relaxed text-muted">
          {t('feed.standsSince')} {me.calendarFeed.issuedAt.slice(0, 10)}
          <span className="mx-1.5 opacity-40">·</span>
          {t('feed.lost')}
        </p>
      )}

      <Act
        open={asking === 'issue'}
        onClose={() => setAsking(null)}
        title={me.calendarFeed ? t('feed.again') : t('feed.make')}
        does={t('wm.feed.does')}
        means={t('wm.feed.means')}
        label={me.calendarFeed ? t('feed.again') : t('feed.make')}
        perform={issue}
      />

      <Act
        open={asking === 'revoke'}
        onClose={() => setAsking(null)}
        title={t('feed.withdraw')}
        does={t('wm.feedOff.does')}
        means={t('wm.feedOff.means')}
        label={t('feed.withdraw')}
        grave
        perform={withdraw}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => setAsking('issue')}
          className="rounded-card bg-lapis px-4 py-2 text-ui font-semibold text-white shadow-act"
        >
          {me.calendarFeed ? t('feed.again') : t('feed.make')}
        </Button>

        {/* Absent where there is nothing to withdraw. */}
        {me.calendarFeed && (
          <Button
            type="button"
            onClick={() => setAsking('revoke')}
            className="rounded-card bg-raised px-4 py-2 text-ui font-medium text-breach shadow-ringbreach"
          >
            {t('feed.withdraw')}
          </Button>
        )}
      </div>
    </section>
  );
}
