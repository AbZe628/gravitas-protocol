import { useEffect, useState } from 'react';
import Act from '../components/Act.js';
import AfterAct from '../components/AfterAct.js';
import { Link } from 'react-router-dom';
import { oversight, type Undertaking } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { useIdentity, mayKeepMinutes } from '../lib/identity.js';
import { Loading, ErrorText } from '../components/ui.js';
import { State } from '../components/kit.js';
import { Division, Gaps, Nothing, PageHead } from '../components/page.js';
import { useStillThere } from '../lib/stillThere.js';
import { Button } from '../components/Button';

/**
 * What was undertaken, and what became of it.
 *
 * Built, tested, reachable from nowhere. The service and its three routes went
 * in and no screen ever asked for them — the undertakings appeared inside a
 * board book and could not be added, closed or listed anywhere. This is the
 * screen.
 *
 * ── open first, oldest first ──────────────────────────────────────────────
 *
 * The one that has been open longest is the one most likely to have been
 * forgotten, which is the whole reason a board keeps this list at all.
 *
 * ── closing it is an account, not a tick ──────────────────────────────────
 *
 * A tick records that somebody pressed a button. The next sitting needs to
 * read what was actually done, so the control asks for words and refuses
 * without them. *Dropped* sits beside *done* as an equal outcome: boards
 * decide not to do things, and an undertaking quietly deleted is how a record
 * starts disagreeing with what the board resolved.
 */

function day(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 10);
}

/** What an act did, as the page holds it. */
type WhatFollowed = {
  did: string;
  means: string;
  next: readonly { label: string; to?: string; says?: string }[];
};

function One({
  row,
  mine,
  canKeep,
  onChanged,
  onDid,
}: {
  row: { undertaking: Undertaking; whoName: string; overdue: boolean };
  mine: boolean;
  canKeep: boolean;
  onChanged: () => void;
  /*
   * Handed up rather than kept here. Closing an undertaking moves it from the
   * open list to the closed one — two different maps in two different places
   * in the tree — so React takes this row down and builds a new one. Anything
   * this row was holding goes with it.
   */
  onDid: (what: WhatFollowed) => void;
}) {
  const { t } = useI18n();
  const u = row.undertaking;

  const [open, setOpen] = useState(false);
  const [state, setState] = useState<'done' | 'dropped'>('done');
  const [said, setSaid] = useState('');

  /*
   * Theirs to close, or the secretary's. Anybody else closing it would be
   * writing an account of work they did not do, under a name not theirs.
   */
  const mayClose = u.state === 'open' && (mine || canKeep);

  async function close() {
    await oversight.closeUndertaking(u.id, state, said);
    setSaid('');
    onChanged();
  }

  return (
    <li className="rounded-card bg-raised/60 px-5 py-4 shadow-ring">
      <div className="flex flex-wrap items-center gap-2.5">
        <State tone={u.state === 'open' ? (row.overdue ? 'breach' : 'attention') : 'plain'}>
          {t(row.overdue ? 'und.overdue' : `book.state.${u.state}`)}
        </State>
        <span className="text-body font-semibold">{row.whoName}</span>
        {u.dueAt ? (
          <span className="font-mono text-note text-muted">{day(u.dueAt)}</span>
        ) : (
          <span className="text-note text-muted">{t('book.noDate')}</span>
        )}
        <Link
          to={`/meetings/${u.meetingId}/book`}
          className="ms-auto text-note text-muted hover:text-paper"
        >
          {t('und.fromSitting')}
        </Link>
      </div>

      <p className="mt-2 max-w-[62ch] text-body leading-relaxed">{u.what}</p>

      {u.outcome && (
        <p className="mt-2 max-w-[62ch] border-s-2 border-line ps-3 text-ui leading-relaxed text-muted">
          {u.outcome.said}
        </p>
      )}

      {mayClose && !open && (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 text-ui font-semibold text-lapis underline decoration-line underline-offset-4"
        >
          {t('und.closeIt')}
        </Button>
      )}

      <Act
        open={open}
        onClose={() => setOpen(false)}
        title={t('und.closeIt')}
        does={t('wm.closeUnd.does')}
        means={t('wm.closeUnd.means')}
        label={t('und.record')}
        perform={close}
        onDone={onDid}
        after={{
          did: t('wm.closeUnd.did'),
          means: t('wm.closeUnd.didMeans'),
          next: [{ label: t('wm.next.undertakings'), says: t('wm.next.undertakingsSays') }],
        }}
      >
        <div>
          <div className="mb-2 flex gap-2">
            {(['done', 'dropped'] as const).map((s) => (
              <Button
                key={s}
                type="button"
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

    </li>
  );
}

export default function Undertakings() {
  const { t } = useI18n();
  const { identity } = useIdentity();
  const [data, setData] = useState<Awaited<ReturnType<typeof oversight.undertakings>> | null>(null);
  const [failed, setFailed] = useState(false);
  /**
   * What the last act did, held here rather than on the row that did it.
   *
   * A closed undertaking leaves the open list and appears in the closed one,
   * which is a different place in the tree: the row that performed the act is
   * gone by the time there is anything to say about it.
   */
  const [justDid, setJustDid] = useState<WhatFollowed | null>(null);
  /** A failed refresh keeps a screen that is already there. */
  const there = useStillThere();

  function load() {
    oversight
      .undertakings()
      .then((d) => {
        there.arrived();
        setData(d);
      })
      .catch(() => there.lost(setFailed));
  }
  useEffect(load, []);

  if (failed) return <ErrorText />;
  if (!data) return <Loading />;

  const rows = data.undertakings ?? [];
  const open = rows.filter((r) => r.undertaking.state === 'open');
  const closed = rows.filter((r) => r.undertaking.state !== 'open');
  const canKeep = mayKeepMinutes(identity?.role, identity?.office);

  /*
   * What this list cannot tell you. An undertaking with no date the board set
   * is not late and never will be, which is its own problem and a different
   * one from being overdue.
   */
  const gaps: string[] = [];
  if (data.summary?.openWithNoDate) {
    gaps.push(t('und.gap.noDate').replace('{n}', String(data.summary.openWithNoDate)));
  }
  if (rows.length > 0) gaps.push(t('und.gap.onlyMinuted'));

  return (
    <article>
      {justDid && (
        <div className="mb-5">
          <AfterAct
            did={justDid.did}
            means={justDid.means}
            next={justDid.next}
            onClose={() => setJustDid(null)}
          />
        </div>
      )}

      <PageHead
        phase="deciding"
        title={t('und.title')}
        says={t('und.lead')}
        live={
          open.length > 0 ? (
            <>
              <State tone={data.summary?.overdue ? 'breach' : 'attention'}>
                {open.length} {t('und.stillOpen')}
              </State>
              {data.summary?.overdue ? (
                <span className="text-ui text-breach">
                  {data.summary.overdue} {t('und.pastTheDate')}
                </span>
              ) : null}
            </>
          ) : undefined
        }
      />

      <Division heading={t('und.openHere')}>
        {open.length === 0 ? (
          <Nothing>{t('und.noneOpen')}</Nothing>
        ) : (
          <ul className="space-y-2.5">
            {open.map((r) => (
              <One
                key={r.undertaking.id}
                row={r}
                mine={r.undertaking.who === identity?.scholarId}
                canKeep={canKeep}
                onChanged={load}
                onDid={setJustDid}
              />
            ))}
          </ul>
        )}
      </Division>

      {closed.length > 0 && (
        <Division heading={t('und.closedHere')} note={t('und.closedNote')}>
          <ul className="space-y-2.5">
            {closed.map((r) => (
              <One
                key={r.undertaking.id}
                row={r}
                mine={r.undertaking.who === identity?.scholarId}
                canKeep={canKeep}
                onChanged={load}
                onDid={setJustDid}
              />
            ))}
          </ul>
        </Division>
      )}

      <Gaps items={gaps} />
    </article>
  );
}
