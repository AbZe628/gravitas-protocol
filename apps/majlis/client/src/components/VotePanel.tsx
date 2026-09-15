import { useEffect, useState } from 'react';
import { Refused, governance, type Matter, type Tally } from '../lib/api.js';
import { useRevision } from '../lib/pulse.js';
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

function Refusal({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="mt-2 text-note leading-relaxed text-breach">{message}</p>;
}

export default function VotePanel({
  matter,
  role,
  scholarId,
  onChanged,
  stepsOutstanding = 0,
}: Props) {
  const { t } = useI18n();
  const [tally, setTally] = useState<Tally | null>(null);
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [position, setPosition] = useState<'for' | 'against' | 'abstain'>('for');
  const [reason, setReason] = useState('');
  const [objecting, setObjecting] = useState(false);
  const [reopening, setReopening] = useState(false);

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
      .then((r) =>
        setTally(r && typeof r.for === 'number' && Array.isArray(r.outstanding) ? r : null),
      )
      .catch(() => setTally(null));
  }, [matter.id, matter.status, matter.reasoning?.length, showsTally, revision]);

  async function run(action: () => Promise<Matter>) {
    if (busy) return;
    setBusy(true);
    setRefusal(null);
    try {
      onChanged(await action());
      setReason('');
      setObjecting(false);
    } catch (error) {
      setRefusal(error instanceof Refused ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

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

          <Refusal message={refusal} />

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
              onClick={() => run(() => governance.vote(matter.id, position, reason.trim()))}
              className="h-12 w-full rounded-xl bg-gradient-to-br from-lapissoft to-lapis text-body font-bold text-white shadow-act transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-40"
            >
              {t('vote.submit')}
            </Button>
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
          <Refusal message={refusal} />
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              disabled={busy || reason.trim().length < MIN_REASON}
              onClick={() => run(() => governance.object(matter.id, reason.trim()))}
              className="rounded-xl bg-raised px-4 py-2 text-ui font-medium text-breach shadow-ringbreach disabled:opacity-40"
            >
              {t('object.submit')}
            </Button>
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
          <Refusal message={refusal} />
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              disabled={busy || reason.trim().length < MIN_REASON}
              onClick={() => run(() => governance.reopen(matter.id, reason.trim()))}
              className="rounded-xl shadow-ring px-3 py-1.5 text-note hover:bg-raised disabled:opacity-40"
            >
              {t('reopen.submit')}
            </Button>
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
          button(t('action.openDeliberation'), () => run(() => governance.openDeliberation(matter.id)))}

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
          button(t('action.openVoting'), () => run(() => governance.openVoting(matter.id)))}

        {matter.status === 'voting' && signatory &&
          button(t('action.close'), () => run(() => governance.closeVoting(matter.id)))}

        {matter.status === 'voting' && signatory && !reopening &&
          button(t('reopen.title'), () => { setReason(''); setReopening(true); })}

        {matter.status === 'timelock' && signatory && !objecting &&
          button(t('object.title'), () => { setReason(''); setObjecting(true); }, 'warn')}

        {matter.status === 'timelock' && signatory && countdown?.elapsed &&
          button(t('action.force'), () => run(() => governance.bringIntoForce(matter.id)))}

        {['draft', 'deliberation', 'voting', 'timelock'].includes(matter.status) && deliberator &&
          button(t('action.withdraw'), () => run(() => governance.withdraw(matter.id)))}
      </div>

      {!objecting && !reopening && matter.status !== 'voting' && <Refusal message={refusal} />}
    </div>
  );
}
