import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AfterAct from '../components/AfterAct.js';
import {
  api,
  oversight,
  type HeldStructure,
  type Library as LibraryData,
  type MatterSummary,
} from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { mayVote, useIdentity } from '../lib/identity.js';
import { Nothing } from '../components/page.js';
import { ActionPanel, Facts, RecordPage } from '../components/shapes.js';
import ChangeTheConditions from '../components/ChangeTheConditions.js';
import HowItChanged from '../components/HowItChanged.js';
import { ErrorText, Loading, Section } from '../components/ui.js';
import { State, type Tone } from '../components/kit.js';
import { Button } from '../components/Button';
import Act from '../components/Act.js';

/**
 * One contract shape, as this board holds it.
 *
 * ── it used to be nineteen of these on one page ───────────────────────────
 *
 * The library printed every shape in full: its conditions, where it had been
 * used, the board's amendments, and the form for adopting it. Nineteen of
 * those down a single screen, each one a small page of its own. A member
 * looking for one shape scrolled past eighteen, and nothing could be linked
 * to or handed to anybody.
 *
 * A shape held by a board is a record — it has a standing, a decision behind
 * it and a history — so it is a record page, and the library is a list.
 *
 * ── adopting still happens under a decision ───────────────────────────────
 *
 * Unchanged by the move, and the reason is worth keeping in front of whoever
 * edits this next: every adoption names a matter of this board that carried
 * and is in force. Without one the form refuses, because a signatory picking
 * a shape from a menu and pressing a button would make the library binding by
 * administration rather than by decision, and the waiting period — which
 * exists so a signatory can object before a ruling takes effect — would never
 * run.
 */

function toneFor(held: HeldStructure): Tone {
  if (held.declined) return 'breach';
  if (held.source === 'draft') return 'plain';
  return 'settled';
}

export default function StructureDetail({ structureId }: { structureId?: string } = {}) {
  /*
   * From a prop when it is opened in a slide beside the library, from the
   * address when it is opened on its own. The same screen either way, which
   * is the point: a shape a member opens from a list of nineteen should not
   * take them off the list.
   */
  const { id: fromRoute = '' } = useParams();
  const id = structureId ?? fromRoute;
  const { t } = useI18n();
  const { identity } = useIdentity();

  const [data, setData] = useState<LibraryData | null>(null);
  const [carried, setCarried] = useState<MatterSummary[]>([]);
  const [failed, setFailed] = useState(false);

  const [open, setOpen] = useState(false);
  const [matterId, setMatterId] = useState('');
  const [reason, setReason] = useState('');
  /** Which of the two windows is open, if either. */
  const [taking, setTaking] = useState<'none' | 'adopted' | 'declined'>('none');
  /**
   * What was just done, so the panel can say what follows from it.
   *
   * Taking a shape changes what this board judges every arrangement of that
   * kind by, from that moment on. It used to end by closing a form and
   * reloading a list, which left the member to work out what they had caused.
   */
  const [just, setJust] = useState<'adopted' | 'declined' | null>(null);

  const load = () =>
    oversight
      .library()
      .then((d) => (d && Array.isArray(d.library) ? setData(d) : setFailed(true)))
      .catch(() => setFailed(true));

  useEffect(() => {
    void load();
    api
      .matters()
      .then((all) => setCarried(all.filter((m) => m.status === 'in_force')))
      .catch(() => setCarried([]));
  }, []);

  if (failed) return <ErrorText />;
  if (!data) return <Loading />;

  const held = data.library.find((h) => h.structure.id === id);
  if (!held) return <Nothing>{t('adopt.notFound')}</Nothing>;

  const s = held.structure;
  const canRule = mayVote(identity?.role);
  const untouched = held.source === 'draft' && !held.declined;

  async function take(standing: 'adopted' | 'declined') {
    /*
     * No guard that returns quietly. The window calling this has already
     * drawn what the shape is; returning as though it worked would have it
     * announce a change to what the board judges by that never happened.
     */
    await oversight.adopt({
      structureId: held!.structure.id,
      boardId: data!.boardId,
      standing,
      matterId,
      amendments: reason.trim() ? [reason.trim()] : undefined,
      supersedes: held!.adoption?.id ?? null,
    });
    setOpen(false);
    setJust(standing);
    await load();
  }

  /**
   * What follows taking a shape, which is not the same from both doors.
   *
   * Opened from inside a matter, the next thing is the matter itself: its
   * conditions are the board's own now instead of the shipped draft, and
   * that is what the member came to change.
   *
   * Opened from the library with no question behind it — a scholar reading
   * the shapes on their own — the next thing is using it: checking a draft
   * against it, or putting a question to the board judged by it.
   */
  const after = just ? (
    <AfterAct
      did={t(just === 'adopted' ? 'after.tookShape' : 'after.declinedShape')}
      means={t(just === 'adopted' ? 'after.tookShapeMeans' : 'after.declinedShapeMeans')}
      onClose={() => setJust(null)}
      next={
        matterId
          ? [
              {
                to: `/matters/${matterId}`,
                label: t('after.backToMatter'),
                says: t('after.backToMatterSays'),
              },
            ]
          : [
              {
                to: `/check?structure=${held?.structure.id ?? ''}`,
                label: t('after.checkADraft'),
                says: t('after.checkADraftSays'),
              },
              {
                to: '/ask',
                label: t('after.putAQuestion'),
                says: t('after.putAQuestionSays'),
              },
            ]
      }
    />
  ) : null;

  const aside = (
    <>
      {canRule && (
        <ActionPanel next={untouched ? t('adopt.nextUntouched') : t('adopt.nextHeld')}>
          {after ? (
            after
          ) : !open ? (
            <Button
              type="button"
              onClick={() => setOpen(true)}
              className="w-full rounded-xl bg-lapis px-4 py-2.5 text-ui font-semibold text-white shadow-act"
            >
              {untouched ? t('adopt.take') : t('adopt.reconsider')}
            </Button>
          ) : carried.length === 0 ? (
            /*
              No ruling in force, so no adoption. Said here rather than as a
              disabled button: a control that cannot be honoured is absent.
            */
            <p className="text-ui leading-relaxed text-muted">{t('adopt.noDecision')}</p>
          ) : (
            <>
              <label className="mb-3 block">
                <span className="mb-1.5 block text-label font-bold uppercase tracking-caps text-muted">
                  {t('adopt.decidedIn')}
                </span>
                <select
                  value={matterId}
                  onChange={(e) => setMatterId(e.target.value)}
                  className="w-full rounded-xl bg-raised px-3 py-2.5 text-ui shadow-ring"
                >
                  <option value="">{t('adopt.pickDecision')}</option>
                  {carried.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mb-3 block">
                <span className="mb-1.5 block text-label font-bold uppercase tracking-caps text-muted">
                  {t('adopt.reason')}
                </span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder={t('adopt.reasonHint')}
                  className="w-full rounded-xl bg-raised px-3 py-2.5 text-ui shadow-ring"
                />
              </label>

              {/*
                Two windows, because the two acts do not mean the same thing.
                Taking a shape changes what every matter of this kind is
                judged by from now on; declining it records that the board
                looked and said no, so nobody reopens it every few months.
              */}
              <Act
                open={taking === 'adopted'}
                onClose={() => setTaking('none')}
                title={t('adopt.confirm')}
                does={t('wm.adopt.does')}
                means={t('wm.adopt.means')}
                label={t('adopt.confirm')}
                perform={() => take('adopted')}
              />

              <Act
                open={taking === 'declined'}
                onClose={() => setTaking('none')}
                title={t('adopt.decline')}
                does={t('wm.declineShape.does')}
                means={t('wm.declineShape.means')}
                label={t('adopt.decline')}
                grave
                perform={() => take('declined')}
              />

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  disabled={!matterId}
                  onClick={() => setTaking('adopted')}
                  className="rounded-xl bg-lapis px-4 py-2 text-ui font-semibold text-white shadow-act disabled:opacity-40"
                >
                  {t('adopt.confirm')}
                </Button>
                <Button
                  type="button"
                  disabled={!matterId}
                  onClick={() => setTaking('declined')}
                  className="rounded-xl bg-raised px-4 py-2 text-ui font-medium text-breach shadow-ringbreach disabled:opacity-40"
                >
                  {t('adopt.decline')}
                </Button>
                <Button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-1 text-ui text-muted"
                >
                  {t('common.cancel')}
                </Button>
              </div>

              {/*
                Amending is not offered here, and now there is a beside to
                send people to: rewriting a condition is drafting, and it
                happens under the conditions themselves.
              */}
              <p className="mt-3 text-note leading-relaxed text-muted">
                {t('adopt.amendBelow')}
              </p>
            </>
          )}
        </ActionPanel>
      )}

      <Facts
        rows={[
          /*
            The standing is not repeated here. It is a pill beside the title,
            and saying it twice on one page is how two places end up
            disagreeing about one fact.
          */
          { label: t('adopt.family'), value: t(`family.${s.family}`) },
          { label: t('adopt.theConditions'), value: s.conditions.length },
        ]}
      />

      {/*
        The reason a scholar is looking at a shape at all: they have a draft of
        this kind and want to know what it answers.
      */}
      <Link
        to={`/check?shape=${encodeURIComponent(s.id)}`}
        className="mt-3.5 block rounded-card bg-raised p-4 text-ui font-semibold text-lapis shadow-ring"
      >
        {t('adopt.checkADraft')}
      </Link>
    </>
  );

  return (
    <RecordPage
      phase="inforce"
      title={s.name}
      states={
        <State tone={toneFor(held)}>
          {t(held.declined ? 'adopt.declined' : `adopt.${held.source}`)}
        </State>
      }
      aside={aside}
    >
      {/* What this standing means, in the words the library uses for it. */}
      <p className="max-w-[62ch] text-body leading-relaxed text-muted">{held.note}</p>
      <p className="mb-7 mt-2 text-ui text-muted">
        {held.adoption?.basis ?? t('adopt.noBasis')}
      </p>

      {/*
        The conditions themselves, which the library never showed — it showed
        a count of them. A board deciding whether to take a shape as its own
        cannot do it from a number.
      */}
      <Section title={t('adopt.theConditions')}>
        <ol className="space-y-3">
          {s.conditions.map((c) => (
            <li key={c.id} className="rounded-card bg-raised px-4 py-3 shadow-ring">
              <p className="font-display text-lead leading-relaxed text-paper">{c.requirement}</p>
              <p className="mt-1.5 text-ui leading-relaxed text-muted">{c.why}</p>
              <p className="mt-1.5 text-note text-muted">{t(`chk.evidence.${c.evidence}`)}</p>
            </li>
          ))}
        </ol>

        {/*
          The board's own version, written beside the conditions it changes.

          The adoption panel promised this in so many words and there was
          no beside: the server has taken an amended shape with its own
          conditions since adoption was written, and nothing ever sent one.
          A board could take the shipped conditions or refuse them.
        */}
        {canRule && (
          <ChangeTheConditions
            structureId={s.id}
            boardId={data.boardId}
            held={s.conditions}
            supersedes={held.adoption?.id ?? null}
            carried={carried}
            onDone={() => void load()}
          />
        )}
      </Section>

      {/*
        What the board said, where it said something. The amendments are the
        part a later reader is looking for: the difference between the board's
        version and the shipped one.
      */}
      {held.adoption && held.adoption.amendments.length > 0 && (
        <Section title={t('adopt.reason')}>
          <ul className="space-y-2 border-s-2 border-gold/50 ps-4">
            {held.adoption.amendments.map((a, i) => (
              <li key={i} className="font-display text-lead leading-relaxed text-paper">
                {a}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-note text-muted">
            {t('adopt.under')}{' '}
            <Link
              to={`/matters/${held.adoption.matterId}`}
              className="font-mono underline underline-offset-2 hover:text-paper"
            >
              {held.adoption.matterId}
            </Link>
            <span className="mx-1.5 opacity-40">·</span>
            {held.adoption.decidedBy}
          </p>
        </Section>
      )}

      {/*
        How the board got to what it holds today. Promised by the handbook as
        "this board's amendments with their history" and, until now, a route
        that worked with nothing calling it.
      */}
      <HowItChanged structureId={s.id} />

      <Section title={t('adopt.usedIn')}>
        {(held.usedBy ?? []).length === 0 ? (
          <p className="max-w-[62ch] text-ui leading-relaxed text-muted">
            {t('adopt.neverUsed')}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {(held.usedBy ?? []).map((u) => (
              <li key={u.matterId} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Link to={`/matters/${u.matterId}`} className="text-ui text-lapis hover:underline">
                  {u.title}
                </Link>
                <span className="text-note text-muted">{t(`matter.status.${u.status}`)}</span>
                {/* Offered only where the route will honour it. */}
                {u.hasDraft && (
                  <a
                    href={oversight.hrefs.contract(u.matterId)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ui font-semibold text-lapis underline decoration-line underline-offset-4"
                  >
                    {t('adopt.theDraft')}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </RecordPage>
  );
}
