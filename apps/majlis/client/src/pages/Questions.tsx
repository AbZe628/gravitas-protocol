import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { theWayIn, type Delivery, type Notice, type Submission } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import TheDraftThatCame from '../components/TheDraftThatCame.js';
import Fold from '../components/Fold.js';
import { useIdentity, mayDeliberate, maySubmit } from '../lib/identity.js';
import { MainAct, Card, Quiet, State } from '../components/kit.js';
import Act from '../components/Act.js';
import AfterAct from '../components/AfterAct.js';
import TheNotice from '../components/TheNotice.js';
import { Division, Gaps, Nothing, PageHead } from '../components/page.js';
import { Field } from '../components/field.js';
import { ErrorText, Loading } from '../components/ui.js';
import { useStillThere } from '../lib/stillThere.js';
import { Button } from '../components/Button';

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

const field = 'w-full rounded-xl bg-raised shadow-ring p-2.5 text-body leading-relaxed outline-none';
const label = 'mb-1 block text-note text-muted';

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
  /**
   * What the last act did, held by the card rather than by the window.
   *
   * Opening a question changes its standing, and the card redraws into its
   * settled shape the moment the list comes back. Anything the window was
   * about to say would go with it, so the card keeps the answer.
   */
  const [justDid, setJustDid] = useState<{
    did: string;
    means: string;
    next: readonly { label: string; to?: string; says?: string }[];
  } | null>(null);

  const settled = s.standing !== 'waiting';
  const wasDeclined = s.dispositions.some((d) => d.kind === 'declined');

  async function open() {
    const res = await theWayIn.open(s.id, { title, proposal, direction });
    onDone({ notice: res.notice, delivery: res.delivery });
  }

  async function decline(why: string) {
    await theWayIn.decline(s.id, why);
    onDone();
  }

  return (
    <Card>
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        {s.standing === 'waiting' && <State tone="attention">{t('queue.waiting')}</State>}
        {s.standing === 'opened' && <State tone="settled">{t('queue.opened')}</State>}
        {s.standing === 'declined' && <State tone="breach">{t('queue.declined')}</State>}
        {s.standing === 'withdrawn' && <State tone="plain">{t('queue.withdrawn')}</State>}

        <span className="text-note text-muted">
          {t('queue.asked')} {s.arrivedAt.slice(0, 10)}
          <span className="mx-1.5 opacity-40">·</span>
          <span className="tabular-nums">{clock(s, t)}</span>
        </span>
      </div>

      <div className="font-display text-sub leading-snug">{s.subject}</div>

      <div className="mt-1 text-note text-muted">
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
        <div className="mb-1 text-label font-bold uppercase tracking-caps text-muted">
          {t('queue.theirWords')}
        </div>
        <p className="max-w-[62ch] font-display text-lead leading-relaxed">{s.question}</p>
      </div>

      {/*
        Everything below the question folds.

        The queue printed the background, what the desk was waiting for, the
        file that came with it and a reading of which of nineteen shapes its
        words match — for every question, all at once. Three questions came to
        819 words and the first act sat 1,043 pixels down. A queue is a place
        to pick something up, not to read it.
      */}
      {s.awaiting && (
        <p className="mt-2.5 max-w-[62ch] text-ui leading-relaxed text-muted">
          <span className="font-semibold">{t('queue.awaiting')}</span> {s.awaiting}
        </p>
      )}

      {(s.background || s.draft) && (
        <div className="mt-3">
          <Fold heading={t('queue.moreOnThis')} summary={s.draft ? t('queue.withDraft') : undefined}>
            {s.background && (
              <p className="max-w-[62ch] text-ui leading-relaxed text-muted">{s.background}</p>
            )}



      {/*
        The contract, where one came with the question, and the shapes its
        conditions turn up in. This is the step a scholar could not take: the
        reader needs a shape named from nineteen before it will read, and
        nobody can name one without having read the document first.
      */}
            {s.draft && <TheDraftThatCame draft={s.draft} submissionId={s.id} />}
          </Fold>
        </div>
      )}

      {/* What was said back, whichever way it went. */}
      {settled &&
        s.dispositions
          .filter((d) => d.reason)
          .map((d, i) => (
            <p
              key={i}
              className="mt-3 max-w-[62ch] rounded-xl bg-raised px-3.5 py-2.5 text-ui leading-relaxed shadow-ring"
            >
              {d.reason}
            </p>
          ))}

      {s.matterId && (
        <p className="mt-3 text-ui">
          <Link to={`/matters/${s.matterId}`} className="text-lapis underline underline-offset-2">
            {t('queue.seeMatter')}
          </Link>
        </p>
      )}

      {!settled && act === 'none' && (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <MainAct onClick={() => setAct('open')}>{t('queue.open')}</MainAct>
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

      <Act
        open={act === 'open'}
        onClose={() => setAct('none')}
        title={t('queue.open')}
        does={t('wm.openQ.does')}
        means={t('wm.openQ.means')}
        label={t('queue.open')}
        perform={open}
        onDone={setJustDid}
        after={{
          did: t('wm.openQ.did'),
          means: t('wm.openQ.didMeans'),
          next: [
            { label: t('wm.next.theMatter'), to: '/', says: t('wm.next.theMatterSays') },
          ],
        }}
      >
        <div>
          {wasDeclined && (
            <p className="mb-3 rounded-xl bg-[#F7F0E2] px-3.5 py-2.5 text-note leading-relaxed text-goldink shadow-ringgold">
              {t('queue.reconsider')}
            </p>
          )}

          <Field label={t('queue.yourReading')} help={t('queue.yourReadingHelp')} className="mb-3">
            {(attrs) => (
              <input
                {...attrs}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={field}
              />
            )}
          </Field>

          <Field label={t('raise.proposal')} className="mb-3">
            {(attrs) => (
              <textarea
                {...attrs}
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
                rows={3}
                className={field + ' resize-y'}
              />
            )}
          </Field>

          {/*
            A choice between two buttons, not a box to fill in — so the words
            above it head a group rather than pointing at a single control.
          */}
          <div className={label} id="direction-heading">
            {t('raise.direction')}
          </div>
          <div
            role="group"
            aria-labelledby="direction-heading"
            className="mb-3 flex flex-wrap gap-2"
          >
            {(['permit', 'restrict'] as const).map((d) => (
              <Button
                key={d}
                type="button"
                onClick={() => setDirection(d)}
                className={
                  'rounded-xl px-4 py-2 text-ui transition-all ' +
                  (direction === d
                    ? 'bg-lapistint font-semibold text-lapis shadow-pick'
                    : 'bg-raised text-sand shadow-ring hover:text-paper')
                }
              >
                {t(`raise.direction.${d}`)}
              </Button>
            ))}
          </div>

        </div>
      </Act>

      <Act
        open={act === 'decline'}
        onClose={() => setAct('none')}
        title={t('queue.decline')}
        does={t('wm.declineQ.does')}
        means={t('wm.declineQ.means')}
        label={t('queue.decline')}
        grave
        reason={{ label: t('queue.declineWhy'), help: t('queue.declineHelp') }}
        perform={({ reason: why }) => decline(why)}
        onDone={setJustDid}
        after={{
          did: t('wm.declineQ.did'),
          means: t('wm.declineQ.didMeans'),
          next: [
            { label: t('wm.next.theQuestions'), to: '/questions', says: t('wm.next.theQuestionsSays') },
          ],
        }}
      />

      {justDid && (
        <div className="mt-4">
          <AfterAct
            did={justDid.did}
            means={justDid.means}
            next={justDid.next}
            onClose={() => setJustDid(null)}
          />
        </div>
      )}
    </Card>
  );
}

export default function Questions({ boardId }: { boardId: string }) {
  const { t } = useI18n();
  const { identity } = useIdentity();
  const [all, setAll] = useState<Submission[] | null>(null);
  const [failed, setFailed] = useState(false);
  /** A failed refresh keeps a screen that is already there. */
  const there = useStillThere();
  const [notice, setNotice] = useState<{ notice: Notice; delivery: Delivery } | null>(null);

  const load = () => {
    theWayIn
      .list(boardId)
      // A 200 with the wrong shape crashes a whole page; every fetch here
      // checks before it sets.
      .then((r) => {
        there.arrived();
        setAll(Array.isArray(r.submissions) ? r.submissions : []);
      })
      .catch(() => there.lost(setFailed));
  };

  useEffect(load, [boardId]);

  /*
   * Unreachable is not empty.
   *
   * This screen used to start at an empty array and swallow the failure, so
   * a board whose server was down read "nothing has been asked" — a claim
   * about the bank rather than about the connection.
   */
  if (failed) return <ErrorText />;
  if (!all) return <Loading />;

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
    <div>
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
              <span className="text-ui text-muted">
                {t('spine.longestWait')}{' '}
                <span className="font-mono tabular-nums text-gold">{span(longest, t)}</span>
              </span>
            </>
          ) : undefined
        }
        act={
          maySubmit(identity?.role) ? <MainAct to="/ask">{t('door.asked.put')}</MainAct> : undefined
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
        <p className="mt-6 text-note text-muted">{t('whoami.observerBody')}</p>
      )}
    </div>
  );
}
