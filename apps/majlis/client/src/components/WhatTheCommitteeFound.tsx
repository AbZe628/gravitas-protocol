import { useEffect, useState } from 'react';
import Act from './Act.js';
import AfterAct from './AfterAct.js';
import { oversight, type ReferralOnMatter } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { mayDeliberate, useIdentity } from '../lib/identity.js';
import { Nothing } from './page.js';
import ReportBack from './ReportBack.js';
import { useStillThere } from '../lib/stillThere.js';
import { Button } from './Button';

/**
 * What the board asked a committee to look at, and what came back.
 *
 * ── the one thing a reader must not assume ────────────────────────────────
 *
 * That a committee settled anything. It did not, and it cannot: a board's
 * threshold is the number of signatures that bind the institution, and if
 * three of nine could settle a matter inside a committee the institution would
 * be bound by three while its own governance document says five.
 *
 * So the sentence saying so is on the panel, not in a help page. It is the
 * server's own wording, sent with every read, because two screens with two
 * versions of that sentence is how one of them ends up softer than the other.
 *
 * ── dissent is named, never counted ───────────────────────────────────────
 *
 * *Four agreed* tells a board nothing it can act on. *Board Member C did not,
 * and this is what they said instead* is the sentence the board has to read
 * before it votes, so it is the one shown — at the same size as the account
 * itself, not in a footnote under it.
 *
 * Silence is shown too, and is not agreement. A committee member who recorded
 * nothing either way is named as having recorded nothing.
 */

function Standing({ r }: { r: ReferralOnMatter }) {
  const { t } = useI18n();
  if (!r.stood) return null;

  return (
    <div className="mt-4 border-t border-line pt-3.5">
      {r.stood.unanimous ? (
        <p className="text-ui text-settled">{t('cttee.ofOneMind')}</p>
      ) : (
        <p className="text-ui text-gold">{t('cttee.notOfOneMind')}</p>
      )}

      {r.stood.agreedNames.length > 0 && (
        <p className="mt-2 text-ui leading-relaxed text-muted">
          <span className="font-semibold text-sand">{t('cttee.stoodBehind')}</span>{' '}
          {r.stood.agreedNames.join(', ')}
        </p>
      )}

      {/*
        At the same size as the account. A dissent in smaller type under the
        thing it disagrees with is a dissent the reader is being told to skip.
      */}
      {r.stood.dissentedNames.map((d) => (
        <div key={d.scholarId} className="mt-3 rounded-card bg-[#FCF6EA] px-4 py-3 shadow-ring">
          <div className="mb-1.5 text-note font-semibold text-gold">
            {d.name} {t('cttee.didNot')}
          </div>
          <p className="max-w-[58ch] text-body leading-relaxed text-paper">{d.said}</p>
        </div>
      ))}

      {r.stood.silentNames.length > 0 && (
        <p className="mt-2.5 text-ui leading-relaxed text-muted">
          <span className="font-semibold">{t('cttee.recordedNothing')}</span>{' '}
          {r.stood.silentNames.join(', ')}
        </p>
      )}
    </div>
  );
}

function One({
  r,
  mine,
  onReported,
}: {
  r: ReferralOnMatter;
  /** Whether the person reading this sat on the committee. */
  mine: boolean;
  onReported: () => void;
}) {
  const { t } = useI18n();

  return (
    <li className="rounded-card bg-ink px-5 py-4 shadow-ring">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-body font-semibold text-paper">
          {r.committee?.name ?? t('cttee.unknown')}
        </span>
        <span className="text-note font-bold uppercase tracking-caps text-muted">
          {t(`cttee.state.${r.state}`)}
        </span>
      </div>

      {r.committee && (
        <p className="mb-3 max-w-[58ch] text-note leading-relaxed text-muted">{r.committee.remit}</p>
      )}

      <div className="mb-1 text-label font-bold uppercase tracking-caps text-muted">
        {t('cttee.asked')}
      </div>
      <p className="max-w-[58ch] text-body leading-relaxed text-sand">{r.referral.asking}</p>
      <p className="mt-1.5 text-note text-muted">
        {r.referredByName}
        <span className="mx-1.5 opacity-40">·</span>
        <span className="font-mono">{r.referral.referredAt.slice(0, 10)}</span>
      </p>

      {r.referral.report && (
        <div className="mt-4">
          <div className="mb-1 text-label font-bold uppercase tracking-caps text-muted">
            {t('cttee.found')}
          </div>
          <p className="max-w-[58ch] font-display text-lead leading-relaxed text-paper">
            {r.referral.report.found}
          </p>
          <p className="mt-1.5 text-note font-mono text-muted">
            {r.referral.report.at.slice(0, 10)}
          </p>
        </div>
      )}

      {r.referral.withdrawn && (
        <p className="mt-3 max-w-[58ch] text-ui leading-relaxed text-muted">
          <span className="font-semibold">{t('cttee.takenBack')}</span> {r.referral.withdrawn.why}
        </p>
      )}

      {/* Waiting, and nothing has come back. Said, rather than left blank. */}
      {r.state === 'waiting' && (
        <p className="mt-3 text-ui leading-relaxed text-muted">{t('cttee.stillWaiting')}</p>
      )}

      {/*
        And, for somebody who actually sat on it, the way to end the waiting.

        Offered only to a member of this committee: the service refuses anybody
        else, and a control that leads to a refusal is a control that lied. The
        board at large sees the sentence above and nothing to press, which is
        the honest state of things for them.
      */}
      {r.state === 'waiting' && r.committee && mine && (
        <ReportBack referralId={r.referral.id} committee={r.committee} onReported={onReported} />
      )}

      <Standing r={r} />
    </li>
  );
}

export default function WhatTheCommitteeFound({ matterId }: { matterId: string }) {
  const { t } = useI18n();
  const { identity } = useIdentity();

  const [data, setData] = useState<{ referrals: ReferralOnMatter[]; note: string } | null>(null);
  const [failed, setFailed] = useState(false);
  /** A failed refresh keeps a screen that is already there. */
  const there = useStillThere();

  /* Referring one, where the board keeps a committee to refer it to. */
  const [committees, setCommittees] = useState<{ id: string; name: string }[] | null>(null);
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState('');
  const [asking, setAsking] = useState('');
  /** Whether the window that sends the referral is open. */
  const [sending, setSending] = useState(false);
  const [justDid, setJustDid] = useState<{
    did: string;
    means: string;
    next: readonly { label: string; to?: string; says?: string }[];
  } | null>(null);

  function load() {
    setFailed(false);
    oversight
      .referrals(matterId)
      .then((r) => {
        if (r && Array.isArray(r.referrals)) {
          there.arrived();
          setData(r);
        } else {
          there.lost(setFailed);
        }
      })
      .catch(() => there.lost(setFailed));
  }

  useEffect(load, [matterId]);

  useEffect(() => {
    oversight
      .committees()
      .then((r) =>
        setCommittees(
          Array.isArray(r?.committees)
            ? r.committees
                .filter((c) => !c.committee.dissolvedAt)
                .map((c) => ({ id: c.committee.id, name: c.committee.name }))
            : [],
        ),
      )
      .catch(() => setCommittees([]));
  }, []);

  async function send() {
    await oversight.referMatter({ committeeId: pick, matterId, asking });
    setAsking('');
    setOpen(false);
    load();
  }

  if (failed) return <Nothing>{t('cttee.unavailable')}</Nothing>;
  if (!data) return <p className="text-ui text-muted">{t('common.loading')}</p>;

  /*
   * A control that cannot be honoured is absent. A board that keeps no
   * committee is offered nothing to refer to, and is told why in one line
   * rather than shown an empty picker.
   */
  const canRefer = mayDeliberate(identity?.role) && (committees?.length ?? 0) > 0;

  return (
    <div>
      {data.referrals.length === 0 ? (
        <Nothing>{t('cttee.noneOnThis')}</Nothing>
      ) : (
        <>
          <ul className="space-y-3">
            {data.referrals.map((r) => (
              <One
                key={r.referral.id}
                r={r}
                mine={Boolean(
                  identity?.scholarId && r.committee?.members.includes(identity.scholarId),
                )}
                onReported={load}
              />
            ))}
          </ul>
          {/* The server's own sentence, so no screen can soften it. */}
          <p className="mt-3.5 max-w-[58ch] text-note leading-relaxed text-muted">{data.note}</p>
        </>
      )}

      {canRefer && !open && (
        <Button
          type="button"
          onClick={() => {
            setOpen(true);
            setPick(committees?.[0]?.id ?? '');
          }}
          className="mt-3 text-ui font-semibold text-lapis underline decoration-line underline-offset-4"
        >
          {t('cttee.refer')}
        </Button>
      )}

      {canRefer && open && (
        <div className="mt-3 rounded-card bg-ink px-4 py-4 shadow-ring">
          <label className="mb-1.5 block text-note text-muted" htmlFor="refer-committee">
            {t('cttee.whichCommittee')}
          </label>
          <select
            id="refer-committee"
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            className="mb-3 w-full rounded-card bg-raised px-4 py-2.5 text-body text-paper shadow-ring outline-none"
          >
            {(committees ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <label className="mb-1.5 block text-note text-muted" htmlFor="refer-asking">
            {t('cttee.whatToAsk')}
          </label>
          <textarea
            id="refer-asking"
            value={asking}
            onChange={(e) => setAsking(e.target.value)}
            rows={4}
            className="w-full rounded-card bg-raised px-4 py-3 text-body leading-relaxed text-paper shadow-ring outline-none"
          />


          <Act
            open={sending}
            onClose={() => setSending(false)}
            title={t('cttee.sendIt')}
            does={t('wm.refer.does')}
            means={t('wm.refer.means')}
            label={t('cttee.sendIt')}
            perform={send}
            onDone={setJustDid}
            after={{
              did: t('wm.refer.did'),
              means: t('wm.refer.didMeans'),
              next: [{ label: t('wm.next.backToMatter'), says: t('wm.next.backToMatterSays') }],
            }}
          />

          {justDid && (
            <div className="mt-3">
              <AfterAct
                did={justDid.did}
                means={justDid.means}
                next={justDid.next}
                onClose={() => setJustDid(null)}
              />
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-4">
            <Button
              type="button"
              onClick={() => setSending(true)}
              disabled={!pick || asking.trim().length < 5}
              className="rounded-card bg-lapis px-5 py-2.5 text-body font-bold text-white shadow-act disabled:opacity-50"
            >
              {t('cttee.sendIt')}
            </Button>
            <Button
              type="button"
              onClick={() => setOpen(false)}
              className="text-ui text-muted underline decoration-line underline-offset-4"
            >
              {t('common.back')}
            </Button>
          </div>

          <p className="mt-3 max-w-[58ch] text-note leading-relaxed text-muted">
            {t('cttee.stillTheBoards')}
          </p>
        </div>
      )}
    </div>
  );
}
