import { useEffect, useState } from 'react';
import { Refused, governance, type Matter, type Tally } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Card, Tag } from './ui.js';

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
  return <p className="mt-2 text-[12px] leading-relaxed text-amber-300">{message}</p>;
}

export default function VotePanel({ matter, role, scholarId, onChanged }: Props) {
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

  const showsTally = ['voting', 'timelock', 'in_force', 'rejected'].includes(matter.status);

  useEffect(() => {
    if (!showsTally) return;
    governance
      .tally(matter.id)
      .then(setTally)
      .catch(() => setTally(null));
  }, [matter.id, matter.status, matter.reasoning?.length, showsTally]);

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
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={
        'rounded border px-3 py-1.5 text-[12px] disabled:opacity-40 ' +
        (tone === 'warn'
          ? 'border-amber-500/40 text-amber-200 hover:bg-amber-500/10'
          : 'border-line hover:bg-surface/60')
      }
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      {showsTally && tally && (
        <Card>
          <div className="flex flex-wrap items-baseline gap-3 text-[14px]">
            <span className="text-[19px] font-semibold tabular-nums">
              {tally.for} / {tally.required}
            </span>
            <Tag tone={tally.met ? 'gold' : undefined}>
              {t(tally.met ? 'vote.met' : 'vote.notMet')}
            </Tag>
            <span className="text-[12px] text-muted tabular-nums">
              {t('vote.against')} {tally.against} · {t('vote.abstain')} {tally.abstain}
            </span>
          </div>
          {tally.outstanding.length > 0 && (
            <p className="mt-2 text-[12px] text-muted">
              {t('vote.outstanding')}: {tally.outstanding.join(', ')}
            </p>
          )}
        </Card>
      )}

      {matter.status === 'timelock' && countdown && (
        <Card accent={countdown.elapsed}>
          <div className="text-[12px] uppercase tracking-wide text-muted">
            {t(countdown.elapsed ? 'vote.timelockDone' : 'vote.timelockRunning')}
          </div>
          {!countdown.elapsed && (
            <div className="mt-1 text-[19px] font-semibold tabular-nums">{countdown.text}</div>
          )}
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
            {t(countdown.elapsed ? 'vote.timelockDoneNote' : 'vote.timelockNote')}
          </p>
        </Card>
      )}

      {/* Casting a position */}
      {matter.status === 'voting' && signatory && !alreadyVoted && (
        <Card>
          <div className="mb-2 flex flex-wrap gap-2">
            {(['for', 'against', 'abstain'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPosition(p)}
                className={
                  'rounded border px-3 py-1.5 text-[12px] ' +
                  (position === p ? 'border-goldsoft text-goldsoft' : 'border-line hover:bg-surface/60')
                }
              >
                {t(`vote.${p}`)}
              </button>
            ))}
          </div>

          <label className="mb-1 block text-[12px] text-muted">{t('vote.reason')}</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full resize-y rounded border border-line bg-transparent p-2 text-[14px] leading-relaxed outline-none"
          />
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">{t('vote.reasonHelp')}</p>
          <Refusal message={refusal} />

          <div className="mt-2">
            <button
              type="button"
              disabled={busy || reason.trim().length < MIN_REASON}
              onClick={() => run(() => governance.vote(matter.id, position, reason.trim()))}
              className="rounded border border-line px-3 py-1.5 text-[12px] hover:bg-surface/60 disabled:opacity-40"
            >
              {t('vote.submit')}
            </button>
          </div>
        </Card>
      )}

      {matter.status === 'voting' && signatory && alreadyVoted && (
        <p className="text-[13px] text-muted">{t('vote.recorded')}</p>
      )}

      {/* Objecting during a timelock */}
      {matter.status === 'timelock' && signatory && objecting && (
        <Card accent>
          <div className="mb-1 text-[13px] font-medium">{t('object.title')}</div>
          <p className="mb-2 text-[12px] leading-relaxed text-muted">{t('object.help')}</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full resize-y rounded border border-line bg-transparent p-2 text-[14px] leading-relaxed outline-none"
          />
          <Refusal message={refusal} />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={busy || reason.trim().length < MIN_REASON}
              onClick={() => run(() => governance.object(matter.id, reason.trim()))}
              className="rounded border border-amber-500/40 px-3 py-1.5 text-[12px] text-amber-200 hover:bg-amber-500/10 disabled:opacity-40"
            >
              {t('object.submit')}
            </button>
            <button type="button" onClick={() => setObjecting(false)} className="text-[12px] text-muted hover:text-paper">
              {t('say.cancel')}
            </button>
          </div>
        </Card>
      )}

      {/* Returning an open vote to deliberation */}
      {matter.status === 'voting' && signatory && reopening && (
        <Card accent>
          <div className="mb-1 text-[13px] font-medium">{t('reopen.title')}</div>
          <p className="mb-2 text-[12px] leading-relaxed text-muted">{t('reopen.help')}</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full resize-y rounded border border-line bg-transparent p-2 text-[14px] leading-relaxed outline-none"
          />
          <Refusal message={refusal} />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={busy || reason.trim().length < MIN_REASON}
              onClick={() => run(() => governance.reopen(matter.id, reason.trim()))}
              className="rounded border border-line px-3 py-1.5 text-[12px] hover:bg-surface/60 disabled:opacity-40"
            >
              {t('reopen.submit')}
            </button>
            <button type="button" onClick={() => setReopening(false)} className="text-[12px] text-muted hover:text-paper">
              {t('say.cancel')}
            </button>
          </div>
        </Card>
      )}

      {/* Moving the matter along */}
      <div className="flex flex-wrap gap-2">
        {matter.status === 'draft' && deliberator &&
          button(t('action.openDeliberation'), () => run(() => governance.openDeliberation(matter.id)))}

        {matter.status === 'deliberation' && signatory &&
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
