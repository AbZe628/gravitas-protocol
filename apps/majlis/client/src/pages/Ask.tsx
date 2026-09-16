import { useEffect, useState } from 'react';
import { theWayIn, type Delivery, type Notice, type Submission } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import AttachTheContract from '../components/AttachTheContract.js';
import { useIdentity, isInstitution } from '../lib/identity.js';
import { MainAct, Card, Edge, Quiet, State } from '../components/kit.js';
import TheNotice from '../components/TheNotice.js';
import { ErrorText } from '../components/ui.js';
import { Field } from '../components/field.js';
import Act from '../components/Act.js';
import AfterAct from '../components/AfterAct.js';

/**
 * The bank's own screen: put a question, and see what became of it.
 *
 * This *replaces* the interface for an institution credential rather than
 * hiding parts of the board's one. A desk shown the board's screens with most
 * of it greyed out would spend its time looking for what it is not allowed to
 * touch, and would reasonably conclude the product was not built for it.
 *
 * A member sees the same form, with one field more: who actually asked. Most
 * questions arrive by email from somebody who will never hold a credential, and
 * the secretary typing one in is the ordinary case rather than a workaround —
 * so the form supports it, and the record says which of the two happened.
 *
 * What it will not do is help anyone rewrite the question. The field is the
 * institution's own words, it is never edited afterwards, and the help text
 * under it says so, because a desk that thinks it is drafting something the
 * board will polish writes a different sentence.
 */

const field = 'w-full rounded-xl bg-raised shadow-ring p-2.5 text-body leading-relaxed outline-none';
const label = 'mb-1 block text-note text-muted';
const help = 'mb-2 max-w-[62ch] text-note leading-relaxed text-muted';

function Standing({ s }: { s: Submission }) {
  const { t } = useI18n();
  if (s.standing === 'opened') return <State tone="settled">{t('queue.opened')}</State>;
  if (s.standing === 'declined') return <State tone="breach">{t('queue.declined')}</State>;
  if (s.standing === 'withdrawn') return <State tone="plain">{t('queue.withdrawn')}</State>;
  return <State tone="attention">{t('queue.waiting')}</State>;
}

/** One of my own questions, with whatever the board said back. */
function Mine({ s, onWithdraw }: { s: Submission; onWithdraw: (id: string, why: string) => void }) {
  const { t } = useI18n();
  const [why, setWhy] = useState('');
  const [open, setOpen] = useState(false);

  const last = s.dispositions[s.dispositions.length - 1];

  return (
    <Card>
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <Standing s={s} />
        <span className="text-note text-muted">
          {t('queue.asked')} {s.arrivedAt.slice(0, 10)}
        </span>
      </div>

      <div className="font-display text-sub leading-snug">{s.subject}</div>
      <p className="mt-2 max-w-[62ch] text-ui leading-relaxed text-muted">{s.question}</p>

      {/*
        What the board said back, in the board's words. A decline is the only
        thing a desk gets, so it is shown in full rather than summarised.
      */}
      {last?.reason && (
        <p className="mt-3 max-w-[62ch] rounded-xl bg-raised px-3.5 py-2.5 text-ui leading-relaxed shadow-ring">
          {last.reason}
        </p>
      )}

      {s.standing === 'waiting' &&
        (open ? (
          <div className="mt-3">
            <Field label={t('ask.withdrawWhy')} className="mb-2" headingClass={label}>
              {(attrs) => (
                <textarea
                  {...attrs}
                  value={why}
                  onChange={(e) => setWhy(e.target.value)}
                  rows={2}
                  className={field + ' resize-y'}
                />
              )}
            </Field>
            <MainAct onClick={() => onWithdraw(s.id, why)} disabled={!why.trim()}>
              {t('ask.withdraw')}
            </MainAct>
          </div>
        ) : (
          <div className="mt-3">
            <Quiet onClick={() => setOpen(true)}>{t('ask.withdraw')}</Quiet>
          </div>
        ))}
    </Card>
  );
}

export default function Ask({ boardId }: { boardId: string }) {
  const { t } = useI18n();
  const { identity } = useIdentity();
  const own = isInstitution(identity?.role);

  const [subject, setSubject] = useState('');
  const [question, setQuestion] = useState('');
  const [background, setBackground] = useState('');
  const [awaiting, setAwaiting] = useState('');
  const [askedBy, setAskedBy] = useState('');
  const [arrivedAt, setArrivedAt] = useState('');
  /* The contract the question is about, read out of a file at this desk. */
  const [draft, setDraft] = useState<{ name: string; text: string } | null>(null);

  const [mine, setMine] = useState<Submission[] | null>(null);
  const [mineFailed, setMineFailed] = useState(false);
  const [notice, setNotice] = useState<{ notice: Notice; delivery: Delivery } | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Whether the window that performs the act is open. */
  const [sending, setSending] = useState(false);
  const [justDid, setJustDid] = useState<{
    did: string;
    means: string;
    next: readonly { label: string; to?: string; says?: string }[];
  } | null>(null);

  const load = () => {
    theWayIn
      .list(boardId)
      .then((r) => setMine(Array.isArray(r.submissions) ? r.submissions : []))
      .catch(() => setMineFailed(true));
  };

  useEffect(load, [boardId]);

  /*
   * No try here. The window that calls this needs the refusal to reach it —
   * caught here it would return normally, and the window would say the
   * question was with the board while it was not.
   */
  async function put() {
    const res = await theWayIn.put({
      boardId,
      subject,
      question,
      background,
      awaiting,
      askedBy,
      ...(draft ? { draft } : {}),
      /*
       * Sent only when somebody actually gave one. A blank date field means
       * "they are asking now", and turning that into today's date explicitly
       * would be the same value with a false claim of precision attached.
       */
      ...(arrivedAt ? { arrivedAt: new Date(arrivedAt).toISOString() } : {}),
    });
    setNotice({ notice: res.notice, delivery: res.delivery });
    setSubject('');
    setQuestion('');
    setBackground('');
    setAwaiting('');
    setArrivedAt('');
    setDraft(null);
    load();
  }

  async function withdraw(id: string, reason: string) {
    try {
      await theWayIn.withdraw(id, reason);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="mx-auto max-w-reading px-5 pb-16 pt-6">
      <h1 className="font-display text-head leading-tight tracking-title">{t('ask.title')}</h1>
      <p className="mt-2 max-w-[62ch] text-ui leading-relaxed text-muted">{t('ask.lead')}</p>

      <Edge />

      <div className="mt-6">
        <Card>
          <Field label={t('ask.subject')} className="mb-4" headingClass={label}>
            {(attrs) => (
              <input
                {...attrs}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={field}
              />
            )}
          </Field>

          <Field
            label={t('ask.question')}
            help={t('ask.questionHelp')}
            className="mb-4"
            headingClass={label}
            helpClass={help}
          >
            {(attrs) => (
              <textarea
                {...attrs}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={5}
                className={field + ' resize-y'}
              />
            )}
          </Field>

          <Field label={t('ask.background')} className="mb-4" headingClass={label}>
            {(attrs) => (
              <textarea
                {...attrs}
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                rows={3}
                className={field + ' resize-y'}
              />
            )}
          </Field>

          <Field
            label={t('ask.awaiting')}
            help={t('ask.awaitingHelp')}
            className="mb-4"
            headingClass={label}
            helpClass={help}
          >
            {(attrs) => (
              <input
                {...attrs}
                value={awaiting}
                onChange={(e) => setAwaiting(e.target.value)}
                className={field}
              />
            )}
          </Field>

          {/*
            Only a member sees these two. A desk asking its own question is the
            person who asked, and is asking now — offering it the fields would
            be inviting it to misdate its own question.
          */}
          {!own && (
            <>
              <Field
                label={t('ask.askedBy')}
                help={t('ask.askedByHelp')}
                className="mb-4"
                headingClass={label}
                helpClass={help}
              >
                {(attrs) => (
                  <input
                    {...attrs}
                    value={askedBy}
                    onChange={(e) => setAskedBy(e.target.value)}
                    placeholder={t('ask.askedByHint')}
                    className={field}
                  />
                )}
              </Field>

              <Field
                label={t('ask.arrivedAt')}
                help={t('ask.arrivedHelp')}
                className="mb-4"
                headingClass={label}
                helpClass={help}
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
            </>
          )}

          {/*
            The contract the question is about.

            Last, because it is optional and because a desk should have said
            what it is asking before it attaches anything. When one is sent the
            board opens the question already looking at the words, with the
            shapes their conditions turn up in offered beside them.
          */}
          <AttachTheContract draft={draft} onDraft={setDraft} />

          {error && (
            <p className="mb-3 rounded-xl bg-breachtint px-3.5 py-2.5 text-ui leading-relaxed text-breach shadow-ringbreach">
              {error}
            </p>
          )}

          <MainAct
            onClick={() => setSending(true)}
            disabled={!subject.trim() || !question.trim()}
          >
            {t('ask.send')}
          </MainAct>

          <Act
            open={sending}
            onClose={() => setSending(false)}
            title={t('ask.send')}
            does={t('wm.putQ.does')}
            means={t('wm.putQ.means')}
            label={t('ask.send')}
            perform={put}
            onDone={setJustDid}
            after={{
              did: t('wm.putQ.did'),
              means: t('wm.putQ.didMeans'),
              next: [
                { label: t('wm.next.mine'), says: t('wm.next.mineSays') },
              ],
            }}
          />
        </Card>
      </div>

      {justDid && (
        <div className="mt-6">
          <AfterAct
            did={justDid.did}
            means={justDid.means}
            next={justDid.next}
            onClose={() => setJustDid(null)}
          />
        </div>
      )}

      {notice && (
        <div className="mt-6">
          <p className="mb-3 font-display text-sub">{t('ask.sent')}</p>
          <TheNotice notice={notice.notice} delivery={notice.delivery} />
        </div>
      )}

      <div className="mt-10">
        <h2 className="mb-3 text-label font-bold uppercase tracking-caps text-muted">
          {t('ask.mine')}
        </h2>
        {mineFailed ? (
          <ErrorText />
        ) : !mine ? (
          <p className="text-ui text-muted">{t('common.loading')}</p>
        ) : mine.length === 0 ? (
          <p className="text-ui text-muted">{t('ask.mineNone')}</p>
        ) : (
          <div className="space-y-3">
            {mine.map((s) => (
              <Mine key={s.id} s={s} onWithdraw={withdraw} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
