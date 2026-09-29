import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { oversight, type Passage, type Undertaking } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { mayKeepMinutes, useIdentity } from '../lib/identity.js';
import Act from '../components/Act.js';
import AfterAct from '../components/AfterAct.js';
import { State } from '../components/kit.js';
import { ErrorText, Loading } from '../components/ui.js';
import { Button } from '../components/Button';
import WorkWindow, { type WorkPanel } from '../components/WorkWindow.js';

/**
 * One undertaking, as a window.
 *
 * It was a line in a list with a button on it, and the row on *what needs
 * you* that said *say what happened, and close it* opened the whole list and
 * scrolled to it. It is its own address now, drawn in the window every piece
 * of work is: given at a sitting, the date the room set, and the account that
 * closes it — with the undertaking's own words beside them.
 *
 * ── closing it is an account, not a tick ──────────────────────────────────
 *
 * The next sitting needs to read what was actually done, so the act asks for
 * words and refuses without them. *Dropped* sits beside *done* as an equal
 * outcome: boards decide not to do things, and an undertaking quietly deleted
 * is how a record starts disagreeing with what the board resolved.
 */

type Row = { undertaking: Undertaking; whoName: string; overdue: boolean };
type Did = { did: string; means: string; next: readonly { label: string; to?: string; says?: string }[] };

const day = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 10);
};

export default function UndertakingDetail() {
  const { id = '' } = useParams();
  const { t } = useI18n();
  const { identity } = useIdentity();
  const [row, setRow] = useState<Row | null>(null);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [failed, setFailed] = useState(false);
  const shown = useRef(false);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<'done' | 'dropped'>('done');
  const [said, setSaid] = useState('');
  const [justDid, setJustDid] = useState<Did | null>(null);
  const [moved, setMoved] = useState(0);

  /* There is no read of one undertaking; the list is short, and this is one of it. */
  const load = () => {
    oversight
      .undertakings()
      .then((d) => {
        const found = (Array.isArray(d?.undertakings) ? d.undertakings : []).find((r) => r.undertaking?.id === id);
        if (found) {
          shown.current = true;
          setRow(found);
        } else if (!shown.current) setFailed(true);
      })
      .catch(() => {
        if (!shown.current) setFailed(true);
      });
    oversight
      .passageOf('undertaking', id)
      .then((p) => setPassage(Array.isArray(p?.groups) ? p : null))
      .catch(() => setPassage(null));
  };
  useEffect(load, [id]);

  if (failed) return <ErrorText />;
  if (!row) return <Loading />;

  const u = row.undertaking;
  /*
   * Theirs to close, or the secretary's. Anybody else closing it would be
   * writing an account of work they did not do, under a name not theirs.
   */
  const mayClose =
    u.state === 'open' &&
    (u.who === identity?.scholarId || mayKeepMinutes(identity?.role, identity?.office));

  async function close() {
    await oversight.closeUndertaking(u.id, state, said);
    setSaid('');
    setMoved((n) => n + 1);
    load();
  }

  const fromSitting = (
    <Link
      to={`/meetings/${u.meetingId}/book`}
      className="inline-flex min-h-[44px] items-center text-lapis underline underline-offset-2 lg:min-h-0"
    >
      {t('und.fromSitting')}
    </Link>
  );

  const panels: WorkPanel[] = [
    { key: 'given', detail: fromSitting, summary: row.whoName },
    {
      key: 'due_date',
      detail: u.dueAt ? <span className="font-mono">{day(u.dueAt)}</span> : undefined,
      summary: u.dueAt ? day(u.dueAt) : undefined,
    },
    {
      key: 'account',
      detail: u.outcome ? (
        <p className="max-w-[62ch] border-s-2 border-line ps-3 text-ui leading-relaxed text-sand">{u.outcome.said}</p>
      ) : undefined,
      summary: u.outcome?.said,
      action: mayClose ? (
        <Button type="button" tone="act" size="md" onClick={() => setOpen(true)}>
          {t('und.closeIt')}
        </Button>
      ) : undefined,
      /* The secretary closes it for the member who gave it; the step still names them. */
      onTheirBehalf: mayClose,
    },
  ];

  const standing = (
    <State tone={u.state === 'open' ? (row.overdue ? 'breach' : 'attention') : 'plain'}>
      {t(row.overdue ? 'und.overdue' : `book.state.${u.state}`)}
    </State>
  );

  const windows = (
    <Act
      open={open}
      onClose={() => setOpen(false)}
      title={t('und.closeIt')}
      does={t('wm.closeUnd.does')}
      means={t('wm.closeUnd.means')}
      label={t('und.record')}
      perform={close}
      onDone={setJustDid}
      after={{
        did: t('wm.closeUnd.did'),
        means: t('wm.closeUnd.didMeans'),
        next: [{ label: t('win.next.backToQueue'), to: '/', says: t('win.next.backToQueueSays') }],
      }}
    >
      <div>
        <div role="group" aria-label={t('und.closeIt')} className="mb-2 flex gap-2">
          {(['done', 'dropped'] as const).map((s) => (
            <Button
              key={s}
              type="button"
              aria-pressed={state === s}
              onClick={() => setState(s)}
              className={
                'rounded-card px-4 py-2 text-ui shadow-ring ' +
                (state === s ? 'bg-raised font-semibold text-paper' : 'text-muted')
              }
            >
              {t(`book.state.${s}`)}
            </Button>
          ))}
        </div>
        <textarea
          value={said}
          onChange={(e) => setSaid(e.target.value)}
          rows={3}
          placeholder={t('und.whatHappened')}
          aria-label={t('und.whatHappened')}
          className="w-full rounded-card bg-ink px-4 py-3 text-body leading-relaxed text-paper shadow-ring outline-none placeholder:text-muted"
        />
      </div>
    </Act>
  );

  const notice = justDid ? (
    <AfterAct did={justDid.did} means={justDid.means} next={justDid.next} onClose={() => setJustDid(null)} />
  ) : undefined;

  if (!passage) {
    return (
      <div>
        {windows}
        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          {standing}
          <span className="text-body font-semibold">{row.whoName}</span>
        </div>
        {notice && <div className="mb-4">{notice}</div>}
        <p className="mb-4 max-w-[62ch] font-read text-lead leading-relaxed">{u.what}</p>
        {panels.map((p) => p.detail && <div key={p.key} className="mb-3">{p.detail}</div>)}
        {panels[2].action && <div className="mt-4">{panels[2].action}</div>}
      </div>
    );
  }

  return (
    <>
      {windows}
      <WorkWindow
        passage={passage}
        title={u.what}
        chips={standing}
        panels={panels}
        facts={[
          { label: t('und.who'), value: row.whoName },
          { label: t('und.due'), value: u.dueAt ? <span className="font-mono">{day(u.dueAt)}</span> : t('book.noDate') },
          { label: t('und.sitting'), value: fromSitting },
        ]}
        documentLabel={t('und.theWords')}
        document={<p>{u.what}</p>}
        notice={notice}
        moved={moved}
      />
    </>
  );
}
