import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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
import HowItChanged from '../components/HowItChanged.js';
import { ErrorText, Loading, Section } from '../components/ui.js';
import { State, type Tone } from '../components/kit.js';

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

export default function StructureDetail() {
  const { id = '' } = useParams();
  const { t } = useI18n();
  const { identity } = useIdentity();

  const [data, setData] = useState<LibraryData | null>(null);
  const [carried, setCarried] = useState<MatterSummary[]>([]);
  const [failed, setFailed] = useState(false);

  const [open, setOpen] = useState(false);
  const [matterId, setMatterId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    if (!held) return;
    setBusy(true);
    setError(null);
    try {
      await oversight.adopt({
        structureId: held.structure.id,
        boardId: data!.boardId,
        standing,
        matterId,
        amendments: reason.trim() ? [reason.trim()] : undefined,
        supersedes: held.adoption?.id ?? null,
      });
      setOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const aside = (
    <>
      {canRule && (
        <ActionPanel next={untouched ? t('adopt.nextUntouched') : t('adopt.nextHeld')}>
          {!open ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="w-full rounded-xl bg-lapis px-4 py-2.5 text-[13px] font-semibold text-white shadow-act"
            >
              {untouched ? t('adopt.take') : t('adopt.reconsider')}
            </button>
          ) : carried.length === 0 ? (
            /*
              No ruling in force, so no adoption. Said here rather than as a
              disabled button: a control that cannot be honoured is absent.
            */
            <p className="text-[12.5px] leading-relaxed text-muted">{t('adopt.noDecision')}</p>
          ) : (
            <>
              <label className="mb-3 block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
                  {t('adopt.decidedIn')}
                </span>
                <select
                  value={matterId}
                  onChange={(e) => setMatterId(e.target.value)}
                  className="w-full rounded-xl bg-raised px-3 py-2.5 text-[13px] shadow-ring"
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
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
                  {t('adopt.reason')}
                </span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder={t('adopt.reasonHint')}
                  className="w-full rounded-xl bg-raised px-3 py-2.5 text-[13px] shadow-ring"
                />
              </label>

              {error && (
                <p className="mb-3 rounded-xl bg-[#FCF0EE] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-breach shadow-[0_0_0_0.5px_rgba(154,56,48,0.18)]">
                  {error}
                </p>
              )}

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={busy || !matterId}
                  onClick={() => take('adopted')}
                  className="rounded-xl bg-lapis px-4 py-2 text-[12.5px] font-semibold text-white shadow-act disabled:opacity-40"
                >
                  {t('adopt.confirm')}
                </button>
                <button
                  type="button"
                  disabled={busy || !matterId}
                  onClick={() => take('declined')}
                  className="rounded-xl bg-raised px-4 py-2 text-[12.5px] font-medium text-breach shadow-[0_0_0_0.5px_rgba(154,56,48,0.25)] disabled:opacity-40"
                >
                  {t('adopt.decline')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setError(null);
                  }}
                  className="px-4 py-1 text-[12.5px] text-muted"
                >
                  {t('common.cancel')}
                </button>
              </div>

              {/*
                Amending a condition's text is not offered here. Rewriting a
                condition in a textarea is drafting, and it belongs beside the
                condition it changes.
              */}
              <p className="mt-3 text-[11.5px] leading-relaxed text-muted">
                {t('adopt.amendElsewhere')}
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
        className="mt-3.5 block rounded-card bg-raised p-4 text-[12.5px] font-semibold text-lapis shadow-ring"
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
      <p className="max-w-[62ch] text-[13.5px] leading-[1.65] text-muted">{held.note}</p>
      <p className="mb-7 mt-2 text-[12.5px] text-muted">
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
              <p className="font-display text-[15px] leading-[1.55] text-paper">{c.requirement}</p>
              <p className="mt-1.5 text-[12.5px] leading-[1.6] text-muted">{c.why}</p>
              <p className="mt-1.5 text-[11.5px] text-muted">{t(`chk.evidence.${c.evidence}`)}</p>
            </li>
          ))}
        </ol>
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
              <li key={i} className="font-display text-[15px] leading-[1.55] text-paper">
                {a}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-muted">
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
          <p className="max-w-[62ch] text-[12.5px] leading-[1.6] text-muted">
            {t('adopt.neverUsed')}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {(held.usedBy ?? []).map((u) => (
              <li key={u.matterId} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Link to={`/matters/${u.matterId}`} className="text-[13px] text-lapis hover:underline">
                  {u.title}
                </Link>
                <span className="text-[11.5px] text-muted">{t(`matter.status.${u.status}`)}</span>
                {/* Offered only where the route will honour it. */}
                {u.hasDraft && (
                  <a
                    href={oversight.hrefs.contract(u.matterId)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12.5px] font-semibold text-lapis underline decoration-line underline-offset-4"
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
