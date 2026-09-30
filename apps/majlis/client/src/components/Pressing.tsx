import { useState } from 'react';
import { oversight, type PassageStep } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { useIdentity } from '../lib/identity.js';
import Act from './Act.js';
import { Button } from './Button';
import Person from './Person.js';
import { DateText } from './ui.js';

/**
 * Pressing the institution on a step the board does not own.
 *
 * ── the sentence this replaces ────────────────────────────────────────────
 *
 * A breach forty-seven days old, its plan endorsed, thirty-four days since
 * anything went to the Board of Directors. The breach's own screen said
 * *awaiting the Directors*, *overdue by 13 days*, and then offered a board
 * member exactly two things:
 *
 *     Nobody has taken this on yet.   [ Take this on ]  [ Place with… ]
 *     Waiting on the institution. Nothing here is yours to press.
 *
 * *Take this on* would have put a scholar's name on the bank's own filing.
 * And the sentence beneath it is the fault stated outright: pressing is the
 * one thing that *is* the board's when the work is the bank's. A Shariah
 * board cannot approve on the Directors' behalf and must not appear to; what
 * it can do is ask, again, and on the record.
 *
 * ── it does not send ──────────────────────────────────────────────────────
 *
 * Nothing leaves the application. What is written down is that the board
 * asked, who asked, when, and in what words — so that a year later the file
 * answers *was this ever chased* with something other than a shrug, and so
 * that a board which did press is not read as one that let it sit. How the
 * words reach the bank is the board's own business and always was.
 *
 * ── and it does not decide when to raise it ───────────────────────────────
 *
 * There is no threshold in days. A board decides how long it is willing to
 * wait, and a number written here would be this application setting that for
 * them. What the server does insist on is the order — raising a step nobody
 * ever chased is the board escalating its own silence — and that the chair is
 * the one who raises it, because a system that let anyone record the chair as
 * having acted would be putting words in the chair's mouth in the one place a
 * regulator later reads them.
 */
/**
 * Whether this member, on this step, has anything to press at all.
 *
 * Exported because the window has to know the answer before it draws the
 * sentence that says there is nothing here. It asked the step instead —
 * `step.pressing.may`, which is about the step and not about the reader — and
 * an observer on the bank's own filing was left with an empty act bar and no
 * sentence: nothing to do and nothing saying why. A render prop returning
 * `<Pressing/>` is truthy whatever `Pressing` then renders, so the window
 * cannot learn this by looking at what came back.
 */
export function mayPress(
  step: PassageStep,
  identity: { role?: string | null; office?: string | null } | null,
): boolean {
  if (!step.pressing?.may) return false;
  return identity?.role === 'signatory' || identity?.office === 'secretary';
}

export default function Pressing({
  incidentId,
  step,
  onPressed,
}: {
  incidentId: string;
  step: PassageStep;
  onPressed: () => void;
}) {
  const { t } = useI18n();
  const { identity } = useIdentity();
  const [acting, setActing] = useState<'chase' | 'raise' | null>(null);

  // The narrowing the predicate already did, said again for the compiler.
  if (!mayPress(step, identity) || !step.pressing) return null;
  const pressing = step.pressing;

  /*
   * Raising is the chair's. A control that cannot be honoured is absent, not
   * disabled — *raise it* offered to every signatory would be a button four
   * members in five press once and are refused.
   */
  const mayRaise = identity?.office === 'chair' && pressing.mayRaise;

  const chased = pressing.chases.length;
  const last = chased > 0 ? pressing.chases[chased - 1] : null;
  /** Whatever was said last on this step, which is the raising once there is one. */
  const said = pressing.raised ?? last;

  return (
    <div className="mt-4 border-t border-line pt-3">
      {/*
        How long this step has stood, and what has been done about it.

        This step's own days, not the file's: the file was forty-seven days
        old and said so on the same screen, and thirteen of those were the
        board determining and endorsing. A board pressing the bank about its
        own thirteen days is a board apologising to itself.
      */}
      <p className="max-w-[62ch] text-ui leading-relaxed text-muted">
        {/*
          One day is one day, not "1 days".

          There is no plural machinery in this i18n layer, and building one for
          two sentences would be a system for Arabic's six forms that nobody
          asked for. Found on the screen, reading *Asked 1 times*, after the
          first chase landed.
        */}
        {pressing.days !== null && (
          <span className="text-sand">
            {pressing.days === 1 ? t('press.standingOne') : t('press.standing', { days: pressing.days })}{' '}
          </span>
        )}
        {pressing.raised ? (
          <>
            {t('press.raisedBy')} <Person id={pressing.raised.by} />
            {' · '}
            <DateText iso={pressing.raised.at} />
          </>
        ) : last ? (
          <>
            {chased === 1 ? t('press.chasedOnce') : t('press.chased', { times: chased })}{' '}
            {t('press.lastBy')} <Person id={last.by} />
            {' · '}
            <DateText iso={last.at} />
          </>
        ) : (
          t('press.neverChased')
        )}
      </p>

      {/*
        The words of the act the line above names, and not of some other one.

        This quoted the last chase whatever had happened since, so after the
        chair raised it the screen read *raised to the chair by Board Member
        A* and then quoted, as though it were the raising, what that same
        member had written when chasing days earlier. Found by doing it.
      */}
      {said && <p className="mt-1.5 max-w-[62ch] text-ui leading-relaxed text-muted">“{said.reason}”</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" tone="act" size="sm" onClick={() => setActing('chase')}>
          {t(chased > 0 ? 'press.again' : 'press.chase')}
        </Button>

        {mayRaise && (
          <Button type="button" tone="grave" size="sm" onClick={() => setActing('raise')}>
            {t('press.raise')}
          </Button>
        )}
      </div>

      <Act
        open={acting !== null}
        onClose={() => setActing(null)}
        title={t(acting === 'raise' ? 'press.raise' : 'press.chase')}
        does={t(acting === 'raise' ? 'press.raise.does' : 'press.chase.does')}
        means={t(acting === 'raise' ? 'press.raise.means' : 'press.chase.means')}
        label={t(acting === 'raise' ? 'press.raise' : 'press.chase')}
        reason={{ label: t('press.why'), help: t('press.whyHelp'), required: true }}
        perform={async ({ reason, sending }) => {
          await oversight.press(incidentId, { step: step.key, kind: acting ?? 'chase', reason }, sending);
          setActing(null);
          onPressed();
        }}
        after={{
          did: t(acting === 'raise' ? 'press.raise.did' : 'press.chase.did'),
          means: t('press.didMeans'),
          next: [],
        }}
      />
    </div>
  );
}
