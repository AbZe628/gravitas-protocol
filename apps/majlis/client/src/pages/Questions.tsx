import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { theWayIn, type Delivery, type Notice, type Submission } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { useIdentity, mayDeliberate, maySubmit } from '../lib/identity.js';
import { Act, Card, Quiet, State } from '../components/kit.js';
import TheNotice from '../components/TheNotice.js';
import { Division, Gaps, Nothing, PageHead } from '../components/page.js';

/**
 * What the institution has asked, and what the board did about it.
 *
 * Oldest first, and that ordering is the one opinion this screen holds. A queue
 * sorted newest-first buries the question that has waited longest, which is the
 * one most likely to have gone wrong — and the wait is the number this product
 * is judged on.
 *
 * The two acts a board has here are genuinely different and are shown as
 * different. Taking it up asks for the board's own wording of the question, in
 * a field that starts empty: defaulting it to the institution's subject line
 * would make the board's reading and the bank's wording the same string by
 * accident, which is the confusion this whole path exists to prevent. Declining
 * asks for a reason, compulsorily, because a decline the desk cannot learn
 * anything from is the board refusing to answer and refusing to say why.
 */

const field = 'w-full rounded-xl bg-raised shadow-ring p-2.5 text-[14px] leading-relaxed outline-none';
const label = 'mb-1 block text-[12px] text-muted';

function span(hours: number, t: (k: string) => string): string {
  if (hours < 48) return `${hours} ${t('attention.hours')}`;
  return `${Math.floor(hours / 24)} ${t('attention.days')}`;
}

/**
 * How long it took, said differently depending on whether it is over.
 *
 * A question the board answered inside the hour rendered as *0 hours waiting*,
 * which reads as a fault rather than as the best possible outcome. So a settled
 * one says how long it took to answer, and a same-day answer says that in
 * words — the figure is not the point once the number is small.
 */
function clock(s: Submission, t: (k: string) => string): string {
  if (s.standing === 'waiting') return `${span(s.waitedHours, t)} ${t('queue.waited')}`;
  if (s.waitedHours < 24) return t('queue.answeredSame');
  return `${t('queue.answeredIn')} ${span(s.waitedHours, t)}`;
}

function One({
  s,
  onDone,
}: {
  s: Submission;
  onDone: (notice?: { notice: Notice; delivery: Delivery }) => void;
}) {
  const { t } = useI18n();
  const [act, setAct] = useState<'none' | 'open' | 'decline'>('none');
  const [title, setTitle] = useState('');
  const [proposal, setProposal] = useState('');
  const [direction, setDirection] = useState<'permit' | 'restrict'>('permit');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const settled = s.standing !== 'waiting';
  const wasDeclined = s.dispositions.some((d) => d.kind === 'declined');

  async function open() {
    setBusy(true);
    setError(null);
    try {
      const res = await theWayIn.open(s.id, { title, proposal, direction });
      onDone({ notice: res.notice, delivery: res.delivery });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function decline() {
    setBusy(true);
    setError(null);
    try {
      await theWayIn.decline(s.id, reason);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        {s.standing === 'waiting' && <State tone="attention">{t('queue.waiting')}</State>}
        {s.standing === 'opened' && <State tone="settled">{t('queue.opened')}</State>}
        {s.standing === 'declined' && <State tone="breach">{t('queue.declined')}</State>}
        {s.standing === 'withdrawn' && <State tone="plain">{t('queue.withdrawn')}</State>}

        <span className="text-[11.5px] text-muted">
          {t('queue.asked')} {s.arrivedAt.slice(0, 10)}
          <span className="mx-1.5 opacity-40">·</span>
          <span className="tabular-nums">{clock(s, t)}</span>
        </span>
      </div>

      <div className="font-display text-[18px] leading-snug">{s.subject}</div>

      <div className="mt-1 text-[11.5px] text-muted">
        {s.askedBy}
        {s.onBehalf && (
          <>
            <span className="mx-1.5 opacity-40">·</span>
            {t('queue.onBehalf')}
          </>
        )}
      </div>

      {/*
        The institution's own words, marked as theirs. The label matters: a
        reader has to be able to tell at a glance which sentences the bank
        wrote and which the board did.
      */}
      <div className="mt-3.5">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
          {t('queue.theirWords')}
        </div>
        <p className="max-w-[62ch] font-display text-[15.5px] leading-[1.55]">{s.question}</p>
      </div>

      {s.background && (
        <p className="mt-2.5 max-w-[62ch] text-[12.5px] leading-[1.6] text-muted">{s.background}</p>
      )}

      {s.awaiting && (
        <p className="mt-2.5 max-w-[62ch] text-[12.5px] leading-[1.6] text-muted">
          <span className="font-semibold">{t('queue.awaiting')}</span> {s.awaiting}
        </p>
      )}

      {/* What was said back, whichever way it went. */}
      {settled &&
        s.dispositions
          .filter((d) => d.reason)
          .map((d, i) => (
            <p
              key={i}
              className="mt-3 max-w-[62ch] rounded-xl bg-raised px-3.5 py-2.5 text-[12.5px] leading-[1.6] shadow-ring"
            >
              {d.reason}
            </p>
          ))}

      {s.matterId && (
        <p className="mt-3 text-[12.5px]">
          <Link to={`/matters/${s.matterId}`} className="text-lapis underline underline-offset-2">
            {t('queue.seeMatter')}
          </Link>
        </p>
      )}

      {!settled && act === 'none' && (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Act onClick={() => setAct('open')}>{t('queue.open')}</Act>
          <Quiet onClick={() => setAct('decline')}>{t('queue.decline')}</Quiet>
        </div>
      )}

      {/*
        A decline that is being reconsidered says so. Without it a member would
        be reopening something the board already turned down without knowing
        that it had.
      */}
      {s.standing === 'declined' && (
        <div className="mt-4">
          {act === 'none' ? (
            <Quiet onClick={() => setAct('open')}>{t('queue.open')}</Quiet>
          ) : null}
        </div>
      )}

      {act === 'open' && (
        <div className="mt-4">
          {wasDeclined && (
            <p className="mb-3 rounded-xl bg-[#F7F0E2] px-3.5 py-2.5 text-[12px] leading-[1.55] text-[#8A6524] shadow-[0_0_0_0.5px_rgba(176,132,48,0.28)]">
              {t('queue.reconsider')}
            </p>
          )}

          <label className={label}>{t('queue.yourReading')}</label>
          <p className="mb-2 max-w-[62ch] text-[11.5px] leading-[1.6] text-muted">
            {t('queue.yourReadingHelp')}
          </p>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={field + ' mb-3'} />

          <label className={label}>{t('raise.proposal')}</label>
          <textarea
            value={proposal}
            onChange={(e) => setProposal(e.target.value)}
            rows={3}
            className={field + ' mb-3 resize-y'}
          />

          <label className={label}>{t('raise.direction')}</label>
          <div className="mb-3 flex flex-wrap gap-2">
            {(['permit', 'restrict'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDirection(d)}
                className={
                  'rounded-xl px-4 py-2 text-[12.5px] transition-all ' +
                  (direction === d
                    ? 'bg-[#EAF1F7] font-semibold text-lapis shadow-[0_0_0_1.5px_#164470]'
                    : 'bg-raised text-sand shadow-ring hover:text-paper')
                }
              >
                {t(`raise.direction.${d}`)}
              </button>
            ))}
          </div>

          {error && (
            <p className="mb-3 rounded-xl bg-[#FCF0EE] px-3.5 py-2.5 text-[12.5px] text-breach shadow-[0_0_0_0.5px_rgba(154,56,48,0.2)]">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <Act onClick={open} disabled={busy || title.trim().length < 3 || !proposal.trim()}>
              {t('queue.open')}
            </Act>
            <Quiet onClick={() => setAct('none')}>{t('common.back')}</Quiet>
          </div>
        </div>
      )}

      {act === 'decline' && (
        <div className="mt-4">
          <label className={label}>{t('queue.declineWhy')}</label>
          <p className="mb-2 max-w-[62ch] text-[11.5px] leading-[1.6] text-muted">
            {t('queue.declineHelp')}
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className={field + ' mb-3 resize-y'}
          />

          {error && (
            <p className="mb-3 rounded-xl bg-[#FCF0EE] px-3.5 py-2.5 text-[12.5px] text-breach shadow-[0_0_0_0.5px_rgba(154,56,48,0.2)]">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <Act onClick={decline} disabled={busy || !reason.trim()}>
              {t('queue.decline')}
            </Act>
            <Quiet onClick={() => setAct('none')}>{t('common.back')}</Quiet>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function Questions({ boardId }: { boardId: string }) {
  const { t } = useI18n();
  const { identity } = useIdentity();
  const [all, setAll] = useState<Submission[]>([]);
  const [notice, setNotice] = useState<{ notice: Notice; delivery: Delivery } | null>(null);

  const load = () => {
    theWayIn
      .list(boardId)
      // A 200 with the wrong shape crashes a whole page; every fetch here
      // checks before it sets.
      .then((r) => setAll(Array.isArray(r.submissions) ? r.submissions : []))
      .catch(() => undefined);
  };

  useEffect(load, [boardId]);

  const canAct = mayDeliberate(identity?.role);
  const open = all.filter((s) => s.standing === 'waiting');
  const settled = all.filter((s) => s.standing !== 'waiting');

  /*
   * The longest wait, above everything.
   *
   * It is the number this product is judged on and it was nowhere on the
   * screen that holds it — a reader had to scan the list and compare. Floored
   * to whole days for the same reason it is floored everywhere else.
   */
  const longest = open.reduce((most, s) => Math.max(most, s.waitedHours ?? 0), 0);

  /*
   * What this screen cannot tell you.
   *
   * Both of these were true before and neither was said. A board reading a
   * queue of three has no way of knowing that the desk sent five, or that the
   * clock on two of them starts later than the question did.
   */
  const gaps: string[] = [];
  if (open.some((s) => !s.arrivedAt || s.arrivedAt === s.recordedAt)) {
    gaps.push(t('queue.gap.arrival'));
  }
  if (all.length > 0) gaps.push(t('queue.gap.only'));

  return (
    <div className="mx-auto max-w-reading px-5 pb-16 pt-6">
      <PageHead
        phase="asked"
        title={t('queue.title')}
        says={t('queue.lead')}
        live={
          open.length > 0 ? (
            <>
              <State tone={longest >= 24 * 7 ? 'attention' : 'plain'}>
                {open.length} {t('spine.asked.count')}
              </State>
              <span className="text-[12.5px] text-muted">
                {t('spine.longestWait')}{' '}
                <span className="font-mono tabular-nums text-gold">{span(longest, t)}</span>
              </span>
            </>
          ) : undefined
        }
        act={
          maySubmit(identity?.role) ? <Act to="/ask">{t('door.asked.put')}</Act> : undefined
        }
      />

      {notice && (
        <div className="mb-6">
          <TheNotice notice={notice.notice} delivery={notice.delivery} />
        </div>
      )}

      <Division heading={t('queue.waitingHere')}>
        {open.length === 0 ? (
          <Nothing>{t('queue.none')}</Nothing>
        ) : (
          <div className="space-y-3">
            {open.map((s) => (
              <One
                key={s.id}
                s={s}
                onDone={(n) => {
                  if (n) setNotice(n);
                  load();
                }}
              />
            ))}
          </div>
        )}
      </Division>

      {settled.length > 0 && (
        <Division heading={t('queue.settledHere')} note={t('queue.settledNote')}>
          <div className="space-y-3">
            {settled.map((s) => (
              <One key={s.id} s={s} onDone={load} />
            ))}
          </div>
        </Division>
      )}

      <Gaps items={gaps} />

      {/* Nothing here is a control: the route refuses regardless of what shows. */}
      {!canAct && all.length > 0 && (
        <p className="mt-6 text-[12px] text-muted">{t('whoami.observerBody')}</p>
      )}
    </div>
  );
}
