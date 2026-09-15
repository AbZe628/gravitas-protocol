import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Refused, governance } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Card } from './ui.js';
import { Field } from './field.js';
import { Button } from './Button';

/** This form sets its headings and help tighter than the ordinary screens. */
const TIGHT = 'mb-1 block text-note text-muted';
const HELP = 'mb-1.5 text-note leading-relaxed text-muted';

/**
 * Raising a matter.
 *
 * Opening one is not a vote, so anyone who deliberates may do it. What the form
 * insists on is the two fields that decide how the rest of the process runs and
 * are easiest to get wrong afterwards.
 *
 * **Direction** decides everything downstream: permitting is slow — full
 * quorum, a timelock any signatory can halt — and restricting is fast, on a
 * reduced quorum, and then has to be ratified or it lapses. It is asked as a
 * question about what the change does rather than offered as a pair of labels,
 * because a proposer choosing "restrict" to move faster has misunderstood what
 * the speed is for.
 *
 * **What is not being decided** is optional and prompted anyway. A narrow
 * approval later read as a broad endorsement is the specific failure the field
 * exists to prevent, and nobody writes it unless they are asked.
 *
 * It opens as a draft. The proposer writes it before the board is asked to look,
 * and opening deliberation is a separate, deliberate act.
 */

const ORIGINS = ['institution_request', 'protocol_change', 'periodic_review', 'compliance_concern'] as const;

export default function RaiseMatter({ boardId }: { boardId: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [proposal, setProposal] = useState('');
  const [direction, setDirection] = useState<'permit' | 'restrict' | null>(null);
  const [origin, setOrigin] = useState<(typeof ORIGINS)[number]>('protocol_change');
  const [notDecided, setNotDecided] = useState('');
  const [arrivedAt, setArrivedAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  const ready = title.trim().length >= 3 && proposal.trim().length > 0 && direction !== null;

  async function submit() {
    if (!ready || busy || !direction) return;
    setBusy(true);
    setRefusal(null);
    try {
      const created = await governance.openMatter({
        boardId,
        title: title.trim(),
        proposal: proposal.trim(),
        direction,
        origin,
        notDecided: notDecided
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        /*
         * Sent only where it was given, never defaulted to today.
         *
         * A date input yields a day; the record wants an instant, so it is the
         * start of that day — which understates the wait by up to a few hours
         * rather than overstating it by any.
         */
        ...(arrivedAt ? { arrivedAt: new Date(arrivedAt + 'T00:00:00Z').toISOString() } : {}),
      });
      navigate(`/matters/${created.id}`);
    } catch (error) {
      setRefusal(error instanceof Refused ? error.message : String(error));
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-5 rounded-xl shadow-ring px-3 py-1.5 text-note hover:bg-raised"
      >
        {t('raise.open')}
      </Button>
    );
  }

  const field = 'w-full rounded-xl bg-raised shadow-ring p-2 text-body leading-relaxed outline-none';

  return (
    <Card>
      <div className="mb-3 text-ui font-medium">{t('raise.title')}</div>

      <Field label={t('raise.subject')} className="mb-3" headingClass={TIGHT}>
        {(attrs) => (
          <input
            {...attrs}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={field}
          />
        )}
      </Field>

      <Field label={t('raise.proposal')} className="mb-3" headingClass={TIGHT}>
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
        A choice between two buttons, not a box to fill in, so the words above
        it head a group rather than pointing at one control.
      */}
      <div className="mb-1 block text-note text-muted" id="raise-direction">
        {t('raise.direction')}
      </div>
      <p id="raise-direction-help" className="mb-2 text-note leading-relaxed text-muted">
        {t('raise.directionHelp')}
      </p>
      <div
        role="group"
        aria-labelledby="raise-direction"
        aria-describedby="raise-direction-help"
        className="mb-3 flex flex-wrap gap-2"
      >
        {(['permit', 'restrict'] as const).map((d) => (
          <Button
            key={d}
            type="button"
            onClick={() => setDirection(d)}
            className={
              'rounded-xl px-4 py-2 text-ui transition-all ' +
              (direction === d ? 'bg-lapistint font-semibold text-lapis shadow-pick' : 'bg-raised text-sand shadow-ring hover:text-paper')
            }
          >
            {t(`raise.direction.${d}`)}
          </Button>
        ))}
      </div>

      <Field label={t('raise.origin')} className="mb-3" headingClass={TIGHT}>
        {(attrs) => (
          <select
            {...attrs}
            value={origin}
            onChange={(e) => setOrigin(e.target.value as (typeof ORIGINS)[number])}
            className={field}
          >
            {ORIGINS.map((o) => (
              <option key={o} value={o}>
                {t(`matter.origin.${o}`)}
              </option>
            ))}
          </select>
        )}
      </Field>

      {/*
        When the institution asked, which is not when somebody found time to
        type it in. Left empty the wait is reported as covering this system's
        part only — an understated figure that says so beats a confident wrong
        one, and this is the number people put in front of a board.
      */}
      <Field
        label={t('raise.arrivedAt')}
        help={t('raise.arrivedAtHelp')}
        className="mb-3"
        headingClass={TIGHT}
        helpClass={HELP}
      >
        {(attrs) => (
          <input
            {...attrs}
            type="date"
            value={arrivedAt}
            onChange={(e) => setArrivedAt(e.target.value)}
            className={field}
          />
        )}
      </Field>

      <Field
        label={t('raise.notDecided')}
        help={t('raise.notDecidedHelp')}
        headingClass={TIGHT}
        helpClass={HELP}
      >
        {(attrs) => (
          <textarea
            {...attrs}
            value={notDecided}
            onChange={(e) => setNotDecided(e.target.value)}
            rows={2}
            className={field + ' resize-y'}
          />
        )}
      </Field>

      {refusal && <p className="mt-2 text-note leading-relaxed text-breach">{refusal}</p>}

      <div className="mt-3 flex items-center gap-2">
        <Button
          type="button"
          onClick={submit}
          disabled={!ready || busy}
          className="rounded-xl shadow-ring px-3 py-1.5 text-note hover:bg-raised disabled:opacity-40"
        >
          {t('raise.submit')}
        </Button>
        <Button type="button" onClick={() => setOpen(false)} className="text-note text-muted hover:text-paper">
          {t('say.cancel')}
        </Button>
      </div>
      <p className="mt-2 text-note text-muted">{t('raise.draftNote')}</p>
    </Card>
  );
}
