import { useEffect, useState } from 'react';
import { theWayIn, type Delivery, type Notice, type Submission } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { useIdentity, isInstitution } from '../lib/identity.js';
import { Act, Card, Edge, Quiet, State } from '../components/kit.js';
import TheNotice from '../components/TheNotice.js';

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

const field = 'w-full rounded-xl bg-raised shadow-ring p-2.5 text-[14px] leading-relaxed outline-none';
const label = 'mb-1 block text-[12px] text-muted';
const help = 'mb-2 max-w-[62ch] text-[11.5px] leading-[1.6] text-muted';

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
        <span className="text-[11.5px] text-muted">
          {t('queue.asked')} {s.arrivedAt.slice(0, 10)}
        </span>
      </div>

      <div className="font-display text-[17px] leading-snug">{s.subject}</div>
      <p className="mt-2 max-w-[62ch] text-[12.5px] leading-[1.6] text-muted">{s.question}</p>

      {/*
        What the board said back, in the board's words. A decline is the only
        thing a desk gets, so it is shown in full rather than summarised.
      */}
      {last?.reason && (
        <p className="mt-3 max-w-[62ch] rounded-xl bg-raised px-3.5 py-2.5 text-[12.5px] leading-[1.6] shadow-ring">
          {last.reason}
        </p>
      )}

      {s.standing === 'waiting' &&
        (open ? (
          <div className="mt-3">
            <label className={label}>{t('ask.withdrawWhy')}</label>
            <textarea
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              rows={2}
              className={field + ' mb-2 resize-y'}
            />
            <Act onClick={() => onWithdraw(s.id, why)} disabled={!why.trim()}>
              {t('ask.withdraw')}
            </Act>
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

  const [mine, setMine] = useState<Submission[]>([]);
  const [notice, setNotice] = useState<{ notice: Notice; delivery: Delivery } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    theWayIn
      .list(boardId)
      .then((r) => setMine(Array.isArray(r.submissions) ? r.submissions : []))
      .catch(() => undefined);
  };

  useEffect(load, [boardId]);

  async function put() {
    setBusy(true);
    setError(null);
    try {
      const res = await theWayIn.put({
        boardId,
        subject,
        question,
        background,
        awaiting,
        askedBy,
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
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
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
      <h1 className="font-display text-[27px] leading-tight tracking-[-0.018em]">{t('ask.title')}</h1>
      <p className="mt-2 max-w-[62ch] text-[13px] leading-[1.65] text-muted">{t('ask.lead')}</p>

      <Edge />

      <div className="mt-6">
        <Card>
          <label className={label}>{t('ask.subject')}</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={field + ' mb-4'}
          />

          <label className={label}>{t('ask.question')}</label>
          <p className={help}>{t('ask.questionHelp')}</p>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={5}
            className={field + ' mb-4 resize-y'}
          />

          <label className={label}>{t('ask.background')}</label>
          <textarea
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            rows={3}
            className={field + ' mb-4 resize-y'}
          />

          <label className={label}>{t('ask.awaiting')}</label>
          <p className={help}>{t('ask.awaitingHelp')}</p>
          <input
            value={awaiting}
            onChange={(e) => setAwaiting(e.target.value)}
            className={field + ' mb-4'}
          />

          {/*
            Only a member sees these two. A desk asking its own question is the
            person who asked, and is asking now — offering it the fields would
            be inviting it to misdate its own question.
          */}
          {!own && (
            <>
              <label className={label}>{t('ask.askedBy')}</label>
              <p className={help}>{t('ask.askedByHelp')}</p>
              <input
                value={askedBy}
                onChange={(e) => setAskedBy(e.target.value)}
                placeholder={t('ask.askedByHint')}
                className={field + ' mb-4'}
              />

              <label className={label}>{t('ask.arrivedAt')}</label>
              <p className={help}>{t('ask.arrivedHelp')}</p>
              <input
                type="date"
                value={arrivedAt}
                onChange={(e) => setArrivedAt(e.target.value)}
                className={field + ' mb-4'}
              />
            </>
          )}

          {error && (
            <p className="mb-3 rounded-xl bg-[#FCF0EE] px-3.5 py-2.5 text-[12.5px] leading-[1.55] text-breach shadow-[0_0_0_0.5px_rgba(154,56,48,0.2)]">
              {error}
            </p>
          )}

          <Act onClick={put} disabled={busy || !subject.trim() || !question.trim()}>
            {t('ask.send')}
          </Act>
        </Card>
      </div>

      {notice && (
        <div className="mt-6">
          <p className="mb-3 font-display text-[17px]">{t('ask.sent')}</p>
          <TheNotice notice={notice.notice} delivery={notice.delivery} />
        </div>
      )}

      <div className="mt-10">
        <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
          {t('ask.mine')}
        </h2>
        {mine.length === 0 ? (
          <p className="text-[13px] text-muted">{t('ask.mineNone')}</p>
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
