import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  oversight,
  theWayIn,
  type Delivery,
  type Notice,
  type Passage,
  type Submission,
} from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { mayDeliberate, useIdentity } from '../lib/identity.js';
import TheDraftThatCame from '../components/TheDraftThatCame.js';
import Fold from '../components/Fold.js';
import { MainAct, Quiet, State } from '../components/kit.js';
import Act from '../components/Act.js';
import AfterAct from '../components/AfterAct.js';
import TheNotice from '../components/TheNotice.js';
import { Field } from '../components/field.js';
import { DateText, ErrorText, Loading } from '../components/ui.js';
import { Button } from '../components/Button';
import Person from '../components/Person.js';
import Holding from '../components/Holding.js';
import WorkWindow, { type WorkPanel } from '../components/WorkWindow.js';
import { clock } from './Questions.js';

/**
 * One question the institution put, as a window.
 *
 * ── what it was ───────────────────────────────────────────────────────────
 *
 * A card in a list. The queue printed every question whole, one under the
 * other, each with its own acts — so taking one up meant finding it on a
 * page of them, and the row on *what needs you* that said *take this up*
 * opened the whole list and scrolled to it. It is its own address now, drawn
 * in the window every piece of work is drawn in: where the question stands
 * across the top, the one act and whose it is in the middle, the bank's own
 * words beside it, and what has happened under it.
 *
 * ── what it keeps apart ───────────────────────────────────────────────────
 *
 * The institution's words and the board's. The question is shown as sent and
 * marked as theirs; the board's reading of it, when it takes the question up,
 * starts empty — prefilling it with the bank's subject line would make the two
 * the same string by accident, and the path exists to keep them two.
 */

const field = 'w-full rounded-xl bg-raised shadow-ring p-2.5 text-body leading-relaxed outline-none';
const label = 'mb-1 block text-note text-muted';

type Did = {
  did: string;
  means: string;
  next: readonly { label: string; to?: string; says?: string }[];
};

/** A submission as the server should have sent it, or null. */
function wellFormed(r: unknown): Submission | null {
  const s = (r as { submission?: Submission } | null)?.submission;
  return s && typeof s.id === 'string' && Array.isArray(s.dispositions) ? s : null;
}

export default function QuestionDetail() {
  const { id = '' } = useParams();
  const { t } = useI18n();
  const { identity } = useIdentity();
  const [s, setS] = useState<Submission | null>(null);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [failed, setFailed] = useState(false);
  const shown = useRef(false);

  const [act, setAct] = useState<'none' | 'open' | 'decline'>('none');
  const [title, setTitle] = useState('');
  const [proposal, setProposal] = useState('');
  const [direction, setDirection] = useState<'permit' | 'restrict'>('permit');
  const [justDid, setJustDid] = useState<Did | null>(null);
  const [told, setTold] = useState<{ notice: Notice; delivery: Delivery } | null>(null);
  const [moved, setMoved] = useState(0);
  /** Where the matter it became can be opened, once it is one. */
  const [became, setBecame] = useState<string | null>(null);

  const load = () => {
    theWayIn
      .one(id)
      .then((r) => {
        const got = wellFormed(r);
        if (got) {
          shown.current = true;
          setS(got);
        } else if (!shown.current) setFailed(true);
      })
      .catch(() => {
        if (!shown.current) setFailed(true);
      });
    oversight
      .passageOf('question', id)
      .then((p) => setPassage(Array.isArray(p?.groups) ? p : null))
      .catch(() => setPassage(null));
  };
  useEffect(load, [id]);

  if (failed) return <ErrorText />;
  if (!s) return <Loading />;

  const canAct = mayDeliberate(identity?.role);
  const settled = s.standing !== 'waiting';
  const wasDeclined = s.dispositions.some((d) => d.kind === 'declined');

  /*
   * Taken up, and what follows is the matter it became — at its address,
   * which only exists once the server has answered. The link was named *go to
   * what needs you* and pointed at the matter, found by matching its label;
   * it says where it goes now, because it is written once the matter is there.
   */
  async function open() {
    const res = await theWayIn.open(id, { title, proposal, direction });
    setTold({ notice: res.notice, delivery: res.delivery });
    const matter = res.matter?.id ?? null;
    setBecame(matter);
    setMoved((n) => n + 1);
    load();
    return {
      did: t('wm.openQ.did'),
      means: t('wm.openQ.didMeans'),
      next: matter
        ? [{ label: t('wm.next.openTheMatter'), to: `/matters/${matter}`, says: t('wm.next.openTheMatterSays') }]
        : [{ label: t('wm.next.theMatter'), to: '/', says: t('wm.next.theMatterSays') }],
    };
  }

  async function decline(why: string) {
    await theWayIn.decline(id, why);
    setMoved((n) => n + 1);
    load();
  }

  const standing = (
    <>
      {s.standing === 'waiting' && <State tone="attention">{t('queue.waiting')}</State>}
      {s.standing === 'opened' && <State tone="settled">{t('queue.opened')}</State>}
      {s.standing === 'declined' && <State tone="breach">{t('queue.declined')}</State>}
      {s.standing === 'withdrawn' && <State tone="plain">{t('queue.withdrawn')}</State>}
    </>
  );

  const matterId = became ?? s.matterId;

  const takeUp = canAct ? (
    !settled ? (
      <>
        <Quiet onClick={() => setAct('decline')}>{t('queue.decline')}</Quiet>
        <MainAct onClick={() => setAct('open')}>{t('queue.open')}</MainAct>
      </>
    ) : s.standing === 'declined' ? (
      /*
        A decline that is being reconsidered says so, inside the window it
        opens. Without it a member would be reopening something the board
        already turned down without knowing that it had.
      */
      <Quiet onClick={() => setAct('open')}>{t('queue.open')}</Quiet>
    ) : undefined
  ) : undefined;

  const panels: WorkPanel[] = [
    {
      key: 'arrived',
      detail: (
        <>
          <Person id={s.askedBy} />
          {s.onBehalf && (
            <>
              <span className="mx-1.5 opacity-40">·</span>
              {t('queue.onBehalf')}
            </>
          )}
        </>
      ),
    },
    {
      key: 'contract',
      detail: s.draft ? <TheDraftThatCame draft={s.draft} submissionId={s.id} /> : undefined,
      summary: s.draft ? t('queue.aDraftCame') : undefined,
    },
    {
      key: 'take_up',
      detail: (
        <>
          {s.awaiting && (
            <p className="max-w-[62ch] text-ui leading-relaxed text-sand">
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
                  className="mt-3 max-w-[62ch] rounded-xl bg-raised px-3.5 py-2.5 text-ui leading-relaxed shadow-ring"
                >
                  {d.reason}
                </p>
              ))}
          {matterId && (
            <p className="mt-3 text-ui">
              <Link
                to={`/matters/${matterId}`}
                className="inline-flex min-h-[44px] items-center text-lapis underline underline-offset-2 lg:min-h-0"
              >
                {t('queue.seeMatter')}
              </Link>
            </p>
          )}
        </>
      ),
      summary: settled ? s.dispositions.find((d) => d.reason)?.reason : undefined,
      action: takeUp,
    },
  ];

  const notice =
    justDid || told ? (
      <div className="space-y-3">
        {justDid && (
          <AfterAct
            did={justDid.did}
            means={justDid.means}
            next={justDid.next}
            onClose={() => setJustDid(null)}
          />
        )}
        {told && <TheNotice notice={told.notice} delivery={told.delivery} />}
      </div>
    ) : undefined;

  const theirWords = (
    <>
      <p>{s.question}</p>
      {s.background && (
        <div className="mt-3 font-ui">
          <Fold heading={t('queue.moreOnThis')}>
            <p className="max-w-[62ch] text-ui leading-relaxed text-muted">{s.background}</p>
          </Fold>
        </div>
      )}
    </>
  );

  const windows = (
    <>
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
          /* Said only where the server named no matter; `open` answers with the matter's own address. */
          next: [{ label: t('wm.next.theMatter'), to: '/', says: t('wm.next.theMatterSays') }],
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
              <input {...attrs} value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
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
          <div role="group" aria-labelledby="direction-heading" className="mb-3 flex flex-wrap gap-2">
            {(['permit', 'restrict'] as const).map((d) => (
              <Button
                key={d}
                type="button"
                onClick={() => setDirection(d)}
                aria-pressed={direction === d}
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
          next: [{ label: t('win.next.backToQueue'), to: '/', says: t('win.next.backToQueueSays') }],
        }}
      />
    </>
  );

  if (!passage) {
    /*
     * Where the reading has not arrived, the question and its acts on their
     * own, with nothing claimed about where it stands.
     */
    return (
      <div>
        {windows}
        <h1 className="mb-2 font-display text-head leading-tight tracking-display">{s.subject}</h1>
        <div className="mb-4 flex flex-wrap items-center gap-2">{standing}</div>
        {notice && <div className="mb-5">{notice}</div>}
        <div className="mb-1 text-label font-bold uppercase tracking-caps text-muted">{t('queue.theirWords')}</div>
        <div className="mb-5 max-w-[62ch] font-read text-lead leading-relaxed">{theirWords}</div>
        {panels.map((p) => p.detail && <div key={p.key} className="mb-4">{p.detail}</div>)}
        {takeUp && <div className="mt-4 flex flex-wrap gap-3">{takeUp}</div>}
      </div>
    );
  }

  return (
    <>
      {windows}
      <WorkWindow
        passage={passage}
        title={s.subject}
        chips={
          <>
            {standing}
            <span className="text-note tabular-nums text-muted">{clock(s, t)}</span>
          </>
        }
        panels={panels}
        facts={[
          { label: t('queue.askedBy'), value: <Person id={s.askedBy} /> },
          { label: t('queue.asked'), value: <DateText iso={s.arrivedAt} /> },
        ]}
        documentLabel={t('queue.theirWords')}
        document={theirWords}
        holding={passage.holdable && !settled ? <Holding passage={passage} onChanged={load} /> : undefined}
        notice={notice}
        moved={moved}
      />
    </>
  );
}
