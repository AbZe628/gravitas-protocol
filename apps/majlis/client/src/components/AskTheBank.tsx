import { useState } from 'react';
import { governance, type AskedOfTheInstitution } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { DateText } from './ui.js';
import { Field, HEADING } from './field.js';
import { Button } from './Button';
import Act from './Act.js';
import AfterAct from './AfterAct.js';

/**
 * A question to the desk, from the step that needs it.
 *
 * ── what a board used to do instead ───────────────────────────────────────
 *
 * A condition regularly requires something the draft never mentions: whether
 * possession passes before the sale is struck, what the custodian confirms
 * each month, which of two dates the profit is taken on. The board had three
 * ways out and all three were bad. Guess. Record *not met* for something that
 * might well be met. Or leave the software, send an email, and come back to a
 * case that said it was waiting with nothing saying what for.
 *
 * ── the draft is the condition, and it is editable ────────────────────────
 *
 * The question opens with the requirement in it, because the member is
 * standing on that step and that is what they need answered. It opens as a
 * draft rather than being sent: a message carrying a member's name should be
 * one they read first. The wording that goes out is theirs.
 *
 * ── asking does not answer ────────────────────────────────────────────────
 *
 * The step stays unanswered and the vote still waits for it. What changes is
 * whose delay the waiting is, and the case clock reports the two apart.
 */

export default function AskTheBank({
  matterId,
  conditionId,
  requirement,
  asked,
  canAsk,
  onAsked,
}: {
  matterId: string;
  conditionId: string;
  /** The condition's own words, which the draft opens with. */
  requirement: string;
  /** Questions already put on this condition, newest last. */
  asked: AskedOfTheInstitution[];
  canAsk: boolean;
  onAsked: () => void;
}) {
  const { t } = useI18n();

  const outstanding = asked.find((q) => q.answeredAt === null);
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState('');
  /** Whether the window that sends the question is open. */
  const [sending, setSending] = useState(false);
  const [justDid, setJustDid] = useState<{
    did: string;
    means: string;
    next: readonly { label: string; to?: string; says?: string }[];
  } | null>(null);

  async function send() {
    await governance.ask(matterId, asking.trim(), conditionId);
    setOpen(false);
    setAsking('');
    onAsked();
  }

  return (
    <div className="mt-3">
      {asked.length > 0 && (
        <ul className="space-y-2">
          {asked.map((q) => (
            <li
              key={q.id}
              className={
                'rounded-xl px-4 py-3 shadow-ring ' +
                (q.answeredAt ? 'bg-raised' : 'bg-goldtint')
              }
            >
              <div className="mb-1 text-label font-bold uppercase tracking-caps text-muted">
                {q.answeredAt ? t('toDesk.answered') : t('toDesk.waiting')}
                <span className="mx-1.5 opacity-40">·</span>
                <DateText iso={q.askedAt} />
              </div>
              <p className="max-w-[58ch] text-ui leading-relaxed text-sand">{q.asking}</p>

              {q.answer ? (
                <>
                  <div className="mt-2.5 text-label font-bold uppercase tracking-caps text-muted">
                    {t('toDesk.theySaid')} {q.answeredBy}
                  </div>
                  <p className="mt-1 max-w-[58ch] font-display text-lead leading-relaxed text-paper">
                    {q.answer}
                  </p>
                </>
              ) : (
                /* Said in place. A step that is waiting and does not say so is a
                   step a member checks again tomorrow for no reason. */
                <p className="mt-2 text-note leading-relaxed text-muted">{t('toDesk.clockNote')}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {canAsk && !outstanding && (
        open ? (
          <form onSubmit={send} className="mt-3 rounded-card bg-ink/70 px-4 py-4 shadow-ring">
            <p className="mb-3 max-w-[58ch] text-note leading-relaxed text-muted">{t('toDesk.lead')}</p>
            <Field label={t('toDesk.whatToAsk')} headingClass={HEADING}>
              {(attrs) => (
                <textarea
                  {...attrs}
                  rows={4}
                  value={asking}
                  onChange={(e) => setAsking(e.target.value)}
                  className="w-full rounded-xl bg-raised px-3 py-2.5 text-ui leading-relaxed shadow-ring outline-none"
                  required
                />
              )}
            </Field>
            <Act
              open={sending}
              onClose={() => setSending(false)}
              title={t('toDesk.send')}
              does={t('wm.toDesk.does')}
              means={t('wm.toDesk.means')}
              label={t('toDesk.send')}
              perform={send}
              onDone={setJustDid}
              after={{
                did: t('wm.toDesk.did'),
                means: t('wm.toDesk.didMeans'),
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

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={() => setSending(true)}
                disabled={asking.trim().length < 10}
                className="rounded-xl bg-lapis px-4 py-2 text-ui font-semibold text-white shadow-act disabled:opacity-40"
              >
                {t('toDesk.send')}
              </Button>
              <Button
                type="button"
                onClick={() => setOpen(false)}
                className="text-note text-muted underline decoration-line underline-offset-4"
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        ) : (
          <Button
            type="button"
            onClick={() => {
              /* The draft opens with the condition in it, because that is what
                 the member standing on this step needs answered. */
              setAsking(`${t('toDesk.draftPrefix')}\n\n${requirement}\n\n${t('toDesk.draftTail')}`);
              setOpen(true);
            }}
            className="text-ui font-semibold text-lapis underline decoration-line underline-offset-4"
          >
            {t('toDesk.title')}
          </Button>
        )
      )}
    </div>
  );
}
