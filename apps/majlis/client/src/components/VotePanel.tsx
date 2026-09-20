import { useEffect, useState } from 'react';
import { governance, type Matter, type Tally } from '../lib/api.js';
import { useRevision } from '../lib/pulse.js';
import Act from './Act.js';
import AfterAct from './AfterAct.js';
import { useI18n } from '../lib/i18n.js';
import Dictate from './Dictate.js';
import { Card } from './ui.js';
import { Field } from './field.js';
import { Button } from './Button';

/**
 * Where the vote stands, and what this member can still do about it.
 *
 * Only what the role and the status both allow is offered. A disabled button
 * with no explanation asks the reader to guess why; an absent one asks nothing.
 * The server refuses regardless — nothing here is a control — but an interface
 * that offers an action and then refuses it is an interface that has wasted
 * someone's time and made them doubt what else it is wrong about.
 *
 * A vote cannot be submitted without reasoning, and the form says why rather
 * than only refusing. The requirement is the point of the record, not a
 * validation rule that happens to be there.
 */

interface Props {
  matter: Matter;
  role: string | undefined;
  scholarId: string | undefined;
  onChanged: (matter: Matter) => void;
  /**
   * Conditions of the shape nobody on the board has answered.
   *
   * The server refuses to open a vote while any stands, so the button for it
   * is absent rather than shown and refused. Zero where the case is judged
   * against no shape, which is the ordinary case and is not held up.
   */
  stepsOutstanding?: number;
  /**
   * Where what-follows is shown after an act.
   *
   * Handed in rather than shown here, because most of these acts change the
   * status and the screen shows a different panel at a different status —
   * this one is unmounted before anybody reads the sentence. Proved in the
   * browser: withdrawing worked and said nothing.
   */
  onDid?: (after: { did: string; means: string; next: readonly { label: string; to?: string; says?: string }[] }) => void;
}

const MIN_REASON = 20;

function useCountdown(iso: string | null): { text: string; elapsed: boolean } | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!iso) return;
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [iso]);

  if (!iso) return null;
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return { text: '', elapsed: true };

  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return {
    text: hours >= 48 ? `${Math.round(hours / 24)}d` : hours >= 1 ? `${hours}h ${minutes}m` : `${minutes}m`,
    elapsed: false,
  };
}

export default function VotePanel({
  matter,
  role,
  scholarId,
  onChanged,
  stepsOutstanding = 0,
  onDid,
}: Props) {
  const { t } = useI18n();
  const [tally, setTally] = useState<Tally | null>(null);
  /** The tally was asked for and did not come — different from no votes. */
  const [tallyLost, setTallyLost] = useState(false);
  /*
   * Zauzetost je presla u prozor.
   *
   * `Act` sam drzi je li cin u letu, odbija drugi pritisak i pise
   * `aria-busy`. Ovdje je ostala samo kao uslov na dugmadima koja prozor
   * otvaraju, a ta se ne smiju gasiti dok se ceka — gase se sama time sto
   * je prozor preko njih.
   */
  const busy = false;
  const [position, setPosition] = useState<'for' | 'against' | 'abstain'>('for');
  const [reason, setReason] = useState('');
  const [objecting, setObjecting] = useState(false);
  const [reopening, setReopening] = useState(false);
  /** Which of the five acts has its window open. Null when none has. */
  const [acting, setActing] = useState<string | null>(null);

  const signatory = role === 'signatory';
  const deliberator = signatory || role === 'advisory' || role === 'liaison';
  const countdown = useCountdown(matter.status === 'timelock' ? matter.timelockEndsAt : null);
  // A released position does not stand, so the member may record a new one.
  const alreadyVoted = (matter.reasoning ?? []).some(
    (r) => r.scholarId === scholarId && !r.releasedAt,
  );

  /**
   * The count moves when somebody votes, not when the page is loaded again.
   *
   * §11.7 — *brojevi koji žive*. `2 of 3` sitting still while a colleague
   * votes in the next room is the single clearest way this reads as a
   * document rather than as something several people are using at once. The
   * revision is a count, so this asks again when the record has actually
   * moved and never otherwise.
   */
  const revision = useRevision();

  const showsTally = ['voting', 'timelock', 'in_force', 'rejected'].includes(matter.status);

  useEffect(() => {
    if (!showsTally) return;
    governance
      .tally(matter.id)
      /*
       * Checked before it is set. A 200 carrying the wrong shape threw
       * inside render and took the entire matter screen with it — the
       * vote, the pack and the proposal — over one absent field.
       */
      /*
       * A tally that could not be read is not a tally of nothing.
       *
       * Both the wrong shape and a refused request used to become `null`,
       * and `null` renders no panel at all. Measured: with the tally
       * endpoint failing, a matter in `voting` showed the heading THE VOTE,
       * no counts, and the button that closes the vote. A chair reads that
       * as nobody having voted yet, and closes on it.
       */
      .then((r) => {
        const dobar = !!r && typeof r.for === 'number' && Array.isArray(r.outstanding);
        setTally(dobar ? r : null);
        setTallyLost(!dobar);
      })
      .catch(() => {
        setTally(null);
        setTallyLost(true);
      });
  }, [matter.id, matter.status, matter.reasoning?.length, showsTally, revision]);

  /** Which of the three windows is open, if any. */
  const [saying, setSaying] = useState<'none' | 'vote' | 'object' | 'reopen'>('none');
  /*
   * What the act did, held above the cards rather than inside one.
   *
   * A vote changes the matter's status and this panel draws differently at
   * every status — the voting card is gone the moment the vote lands. The
   * answer has to live where the act cannot take it down with it.
   */
  const [justDid, setJustDid] = useState<{
    did: string;
    means: string;
    next: readonly { label: string; to?: string; says?: string }[];
  } | null>(null);


  const button = (label: string, onClick: () => void, tone: 'plain' | 'warn' = 'plain') => (
    <Button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={
        'rounded-xl px-4 py-2 text-ui disabled:opacity-40 ' +
        (tone === 'warn'
          ? 'bg-raised text-breach shadow-ringbreach hover:brightness-[0.99]'
          : 'bg-raised text-sand shadow-ring hover:text-paper')
      }
    >
      {label}
    </Button>
  );

  return (
    <div className="space-y-4">
      {justDid && (
        <AfterAct
          did={justDid.did}
          means={justDid.means}
          next={justDid.next}
          onClose={() => setJustDid(null)}
        />
      )}

      {/*
        Said in the tally's own place, so it cannot be mistaken for nobody
        having voted. `role="alert"` because a member who cannot see the
        screen needs this more than anybody.
      */}
      {showsTally && tallyLost && (
        <div role="alert" className="rounded-sheet bg-raised px-6 py-5 shadow-card">
          <div className="text-label font-bold uppercase tracking-caps text-muted">
            {t('vote.tallyLost')}
          </div>
          <p className="mt-2 max-w-[62ch] text-body leading-relaxed text-sand">
            {t('vote.tallyLostMeans')}
          </p>
        </div>
      )}

      {showsTally && tally && (
        <div className="rounded-sheet bg-raised px-6 py-5 shadow-card">
          <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span
              className={
                'font-display text-hero leading-none tabular-nums tracking-display ' +
                (tally.met ? 'text-settled' : 'text-paper')
              }
            >
              {tally.for}
            </span>
            <span className="font-display text-title leading-none tracking-title text-muted">
              {t('vote.ofRequired')} {tally.required}
            </span>
            <span className="text-ui text-muted">
              {t(tally.met ? 'vote.met' : 'vote.notMet')}
            </span>
          </div>

          {/* The same fact as a shape: one segment per signature needed. */}
          <div className="flex gap-1.5" aria-hidden="true">
            {Array.from({ length: Math.max(tally.required, tally.for) }, (_, i) => (
              <span
                key={i}
                className={
                  'h-[5px] flex-1 rounded-full ' + (i < tally.for ? 'bg-settled' : 'bg-line')
                }
              />
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-ui text-muted">
            <span className="tabular-nums">
              {t('vote.against')} {tally.against}
            </span>
            <span className="tabular-nums">
              {t('vote.abstain')} {tally.abstain}
            </span>
          </div>

          {tally.outstanding.length > 0 && (
            <p className="mt-3 border-t border-line pt-3 text-ui leading-relaxed text-muted">
              {t('vote.outstanding')}: {tally.outstanding.join(', ')}
            </p>
          )}
        </div>
      )}

      {matter.status === 'timelock' && countdown && (
        <Card accent={countdown.elapsed}>
          <div className="text-note uppercase tracking-wide text-muted">
            {t(countdown.elapsed ? 'vote.timelockDone' : 'vote.timelockRunning')}
          </div>
          {!countdown.elapsed && (
            <div className="mt-1 text-sub font-semibold tabular-nums">{countdown.text}</div>
          )}
          <p className="mt-1.5 text-note leading-relaxed text-muted">
            {t(countdown.elapsed ? 'vote.timelockDoneNote' : 'vote.timelockNote')}
          </p>
        </Card>
      )}

      {/* Casting a position */}
      {matter.status === 'voting' && signatory && !alreadyVoted && (
        <Card>
          <div className="mb-4 grid grid-cols-3 gap-2">
            {(['for', 'against', 'abstain'] as const).map((p) => (
              <Button
                key={p}
                type="button"
                aria-pressed={position === p}
                onClick={() => setPosition(p)}
                className={
                  'h-12 rounded-xl text-ui transition-all ' +
                  (position === p
                    ? 'bg-settledtint font-bold text-[#235A49] shadow-picksettled'
                    : 'bg-raised text-sand shadow-ring hover:text-paper')
                }
              >
                {t(`vote.${p}`)}
              </Button>
            ))}
          </div>

          {/*
            The help follows the box here rather than preceding it, because a
            member arriving at this point has already read the matter and the
            positions: the sentence is a reminder while they write, not an
            instruction before they start. It is joined to the box either way,
            so it is read out with it.
          */}
          <Field
            label={t('vote.reason')}
            headingClass="mb-2 block text-ui text-muted"
            help={t('vote.reasonHelp')}
            helpClass="order-last mt-2 text-note leading-relaxed text-muted"
            className="flex flex-col"
          >
            {(attrs) => (
              <textarea
                {...attrs}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="w-full resize-y rounded-card bg-raised px-4 py-3 font-display text-lead leading-relaxed shadow-ring outline-none focus:shadow-pick"
              />
            )}
          </Field>

          {/*
            Speaking it rather than typing it. The words stay the member's own —
            nothing here is pre-filled, suggested or inherited — and the control
            is absent unless the institution turned dictation on, because the
            browser sends the recording away to be transcribed.
          */}
          <Dictate
            onText={(said) => setReason((was) => (was.trim() ? `${was.trim()} ${said}` : said))}
          />


          {/* What is missing, while it is missing. */}
          {reason.trim().length < MIN_REASON && (
            <p className="mt-3 text-note text-muted">
              {t('vote.reasonShort').replace('{n}', String(MIN_REASON - reason.trim().length))}
            </p>
          )}

          <div className="mt-4">
            <Button
              type="button"
              disabled={busy || reason.trim().length < MIN_REASON}
              onClick={() => setSaying('vote')}
              className="h-12 w-full rounded-xl bg-gradient-to-br from-lapissoft to-lapis text-body font-bold text-white shadow-act transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-40"
            >
              {t('vote.submit')}
            </Button>

            {/*
              The heaviest press in the application, and it had no sentence in
              front of it. A vote goes into the record under the member's name
              and is not edited afterwards.
            */}
            <Act
              open={saying === 'vote'}
              onClose={() => setSaying('none')}
              title={t('vote.submit')}
              does={t('wm.vote.does')}
              means={t('wm.vote.means')}
              label={t('vote.submit')}
              perform={async () => {
                onChanged(await governance.vote(matter.id, position, reason.trim()));
                setReason('');
              }}
              onDone={setJustDid}
              after={{
                did: t('wm.vote.did'),
                means: t('wm.vote.didMeans'),
                next: [{ label: t('wm.next.backToMatter'), says: t('wm.next.backToMatterSays') }],
              }}
            />
          </div>
        </Card>
      )}

      {matter.status === 'voting' && signatory && alreadyVoted && (
        <p className="text-ui text-muted">{t('vote.recorded')}</p>
      )}

      {/* Objecting during a timelock */}
      {matter.status === 'timelock' && signatory && objecting && (
        <Card accent>
          <div className="mb-1 text-ui font-medium">{t('object.title')}</div>
          <p className="mb-2 text-note leading-relaxed text-muted">{t('object.help')}</p>
          <textarea
            aria-label={t('object.title')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full resize-y rounded-xl shadow-ring bg-raised p-2 text-body leading-relaxed outline-none"
          />
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              disabled={busy || reason.trim().length < MIN_REASON}
              onClick={() => setSaying('object')}
              className="rounded-xl bg-raised px-4 py-2 text-ui font-medium text-breach shadow-ringbreach disabled:opacity-40"
            >
              {t('object.submit')}
            </Button>

            {/*
              An objection is not a note of disagreement. It stops the clock:
              the ratification window halts and the matter waits on the board
              again, which everyone can see.
            */}
            <Act
              open={saying === 'object'}
              onClose={() => setSaying('none')}
              title={t('object.submit')}
              does={t('wm.object.does')}
              means={t('wm.object.means')}
              label={t('object.submit')}
              grave
              perform={async () => {
                onChanged(await governance.object(matter.id, reason.trim()));
                setReason('');
                setObjecting(false);
              }}
              onDone={setJustDid}
              after={{
                did: t('wm.object.did'),
                means: t('wm.object.didMeans'),
                next: [{ label: t('wm.next.backToMatter'), says: t('wm.next.backToMatterSays') }],
              }}
            />
            <Button type="button" onClick={() => setObjecting(false)} className="text-note text-muted hover:text-paper">
              {t('say.cancel')}
            </Button>
          </div>
        </Card>
      )}

      {/* Returning an open vote to deliberation */}
      {matter.status === 'voting' && signatory && reopening && (
        <Card accent>
          <div className="mb-1 text-ui font-medium">{t('reopen.title')}</div>
          <p className="mb-2 text-note leading-relaxed text-muted">{t('reopen.help')}</p>
          <textarea
            aria-label={t('reopen.title')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full resize-y rounded-xl shadow-ring bg-raised p-2 text-body leading-relaxed outline-none"
          />
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              disabled={busy || reason.trim().length < MIN_REASON}
              onClick={() => setSaying('reopen')}
              className="rounded-xl shadow-ring px-3 py-1.5 text-note hover:bg-raised disabled:opacity-40"
            >
              {t('reopen.submit')}
            </Button>

            {/*
              An open vote going back to discussion. Votes already cast stay
              in the record and are not deleted; the board is being asked to
              read further before it decides.
            */}
            <Act
              open={saying === 'reopen'}
              onClose={() => setSaying('none')}
              title={t('reopen.submit')}
              does={t('wm.reopen.does')}
              means={t('wm.reopen.means')}
              label={t('reopen.submit')}
              grave
              perform={async () => {
                onChanged(await governance.reopen(matter.id, reason.trim()));
                setReason('');
              }}
              onDone={setJustDid}
              after={{
                did: t('wm.reopen.did'),
                means: t('wm.reopen.didMeans'),
                next: [{ label: t('wm.next.backToMatter'), says: t('wm.next.backToMatterSays') }],
              }}
            />
            <Button type="button" onClick={() => setReopening(false)} className="text-note text-muted hover:text-paper">
              {t('say.cancel')}
            </Button>
          </div>
        </Card>
      )}

      {/*
        What is holding the vote up, where something is.

        Above the acts rather than beside them, because it is the reason one of
        them is missing. A chair reading this is being told the next thing to
        do, which is the whole point of the column.
      */}
      {matter.status === 'deliberation' && signatory && stepsOutstanding > 0 && (
        <p className="mb-3 rounded-xl bg-goldtint px-4 py-3 text-ui leading-relaxed text-goldink shadow-ringgold">
          {stepsOutstanding} {t('vote.stepsFirst')}
        </p>
      )}

      {/* Moving the matter along */}
      <div className="flex flex-wrap gap-2">
        {matter.status === 'draft' && deliberator &&
          button(t('action.openDeliberation'), () => setActing('openDeliberation'))}

        {/*
          The vote opens only when the conditions have been answered.

          The server refuses otherwise, and a button that leads to a refusal is
          a button that lied — the same rule this application applies
          everywhere else: a control that cannot be honoured is absent, not
          disabled. What stands in its place says how many conditions are left
          and where they are, because a chair who cannot open the vote needs to
          know what would let them.
        */}
        {matter.status === 'deliberation' && signatory && stepsOutstanding === 0 &&
          button(t('action.openVoting'), () => setActing('openVoting'))}

        {/*
          And the same rule when the tally never arrived: closing a vote
          turns on how many were for it against how many were required, and
          neither number is on the screen. The control is absent rather than
          offered over an unknown, and the sentence above says why.
        */}
        {matter.status === 'voting' && signatory && !tallyLost &&
          button(t('action.close'), () => setActing('closeVoting'))}

        {matter.status === 'voting' && signatory && !reopening &&
          button(t('reopen.title'), () => { setReason(''); setReopening(true); })}

        {matter.status === 'timelock' && signatory && !objecting &&
          button(t('object.title'), () => { setReason(''); setObjecting(true); }, 'warn')}

        {matter.status === 'timelock' && signatory && countdown?.elapsed &&
          button(t('action.force'), () => setActing('force'))}

        {['draft', 'deliberation', 'voting', 'timelock'].includes(matter.status) && deliberator &&
          button(t('action.withdraw'), () => setActing('withdraw'), 'warn')}
      </div>

      {/*
        ── the five acts that used to happen in silence ──────────────────────
        Each says what it does, what it means to whoever is outside this board,
        and what the member may do next. Before this, a press moved the matter
        and the screen was quietly different.
      */}
      <Act
        open={acting === 'openDeliberation'}
        onClose={() => setActing(null)}
        title={t('action.openDeliberation')}
        does={t('win.openDeliberation.does')}
        means={t('win.openDeliberation.means')}
        label={t('action.openDeliberation')}
        perform={async () => onChanged(await governance.openDeliberation(matter.id))}
        onDone={onDid}
        after={{
          did: t('win.openDeliberation.did'),
          means: t('win.openDeliberation.didMeans'),
          next: [{ label: t('win.next.firstStep'), says: t('win.next.firstStepSays') }],
        }}
      />

      <Act
        open={acting === 'openVoting'}
        onClose={() => setActing(null)}
        title={t('action.openVoting')}
        does={t('win.openVoting.does')}
        means={t('win.openVoting.means')}
        label={t('action.openVoting')}
        perform={async () => onChanged(await governance.openVoting(matter.id))}
        onDone={onDid}
        after={{
          did: t('win.openVoting.did'),
          means: t('win.openVoting.didMeans'),
          next: [{ label: t('win.next.castYours'), says: t('win.next.castYoursSays') }],
        }}
      />

      <Act
        open={acting === 'closeVoting'}
        onClose={() => setActing(null)}
        title={t('action.close')}
        does={t('win.closeVoting.does')}
        means={t('win.closeVoting.means')}
        label={t('action.close')}
        perform={async () => onChanged(await governance.closeVoting(matter.id))}
        onDone={onDid}
        after={{
          did: t('win.closeVoting.did'),
          means: t('win.closeVoting.didMeans'),
          next: [{ label: t('win.next.readOutcome'), says: t('win.next.readOutcomeSays') }],
        }}
      />

      <Act
        open={acting === 'force'}
        onClose={() => setActing(null)}
        title={t('action.force')}
        does={t('win.force.does')}
        means={t('win.force.means')}
        label={t('action.force')}
        perform={async () => onChanged(await governance.bringIntoForce(matter.id))}
        onDone={onDid}
        after={{
          did: t('win.force.did'),
          means: t('win.force.didMeans'),
          next: [
            { label: t('win.next.sign'), says: t('win.next.signSays') },
            { label: t('win.next.papers'), says: t('win.next.papersSays') },
          ],
        }}
      />

      <Act
        open={acting === 'withdraw'}
        onClose={() => setActing(null)}
        title={t('action.withdraw')}
        does={t('win.withdraw.does')}
        means={t('win.withdraw.means')}
        label={t('action.withdraw')}
        grave
        reason={{ label: t('win.withdraw.reason'), help: t('win.withdraw.reasonHelp') }}
        perform={async () => onChanged(await governance.withdraw(matter.id))}
        onDone={onDid}
        after={{
          did: t('win.withdraw.did'),
          means: t('win.withdraw.didMeans'),
          next: [{ label: t('win.next.backToQueue'), to: '/', says: t('win.next.backToQueueSays') }],
        }}
      />
    </div>
  );
}
