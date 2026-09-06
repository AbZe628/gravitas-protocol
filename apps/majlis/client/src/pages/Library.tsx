import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, oversight, type HeldStructure, type Library as LibraryData, type MatterSummary } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { mayVote, useIdentity } from '../lib/identity.js';
import { ErrorText, Loading } from '../components/ui.js';
import { Card, State, type Tone } from '../components/kit.js';
import { Display, Note } from '../components/type.js';

/**
 * The library as this board holds it.
 *
 * Nineteen contract shapes ship as a draft. Until a board has done something
 * with one, its conditions are somebody else's reading — offered so a scholar
 * stops composing a question from an empty box, and binding on nobody.
 *
 * This is where that changes, and the page is arranged around the state most
 * shapes are in on the day a board starts: **untouched**. Those come first,
 * because the useful question here is not "what have we adopted" but "what
 * have we never looked at" — the same reason the register puts the unexamined
 * holdings at the top.
 *
 * ── what adopting is, and is not ──────────────────────────────────────────
 *
 * It is not approving a product. It is the board saying: when we judge a
 * murabaha, these are the conditions we judge it against. A board may amend
 * them, or rule against using the shape at all, and either way says why.
 *
 * ── and it happens under a decision ───────────────────────────────────────
 *
 * Every adoption names a matter of this board that carried and is in force.
 * The page will not offer to adopt without one, because a form that let a
 * signatory pick a shape and press a button would make the library binding by
 * administration rather than by decision — and the timelock, which exists so a
 * signatory can object before a ruling takes effect, would be skipped.
 *
 * ── the counts stand beside the list, not above it ────────────────────────
 *
 * They were a line of three figures in the running text, which is where a
 * number goes to be skipped. On the work area they are a column of their own,
 * and the one that matters — how much of the library nobody has looked at — is
 * the size of a figure rather than of a sentence.
 */

/*
 * A shape nobody has touched is an absence, not an alarm — the same reading
 * the register takes of a holding never put to the board. Only a shape this
 * board ruled against is a refusal.
 */
function toneFor(held: HeldStructure): Tone {
  if (held.declined) return 'breach';
  if (held.source === 'draft') return 'plain';
  return 'settled';
}

/** Untouched first: it is the state most shapes are in and the one worth acting on. */
const ORDER: HeldStructure['source'][] = ['draft', 'amended', 'adopted'];

function Shape({
  held,
  boardId,
  canRule,
  carried,
  onAdopted,
}: {
  held: HeldStructure;
  /** From the library response. A shape nobody has touched carries no adoption
   *  to read it off, and an empty one would be refused as a board that does
   *  not exist. */
  boardId: string;
  canRule: boolean;
  carried: MatterSummary[];
  onAdopted: () => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [matterId, setMatterId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function take(standing: 'adopted' | 'declined') {
    setBusy(true);
    setError(null);
    try {
      await oversight.adopt({
        structureId: held.structure.id,
        boardId,
        standing,
        matterId,
        amendments: reason.trim() ? [reason.trim()] : undefined,
        supersedes: held.adoption?.id ?? null,
      });
      setOpen(false);
      onAdopted();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card tone="quiet">
      {/*
        On a phone the standing sits above the name rather than beside it. A
        pill holding 150px of a 375px row leaves a shape called "Murabaha,
        including commodity murabaha and tawarruq" breaking over five lines.
      */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
        <div className="min-w-0 sm:order-first">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
            <span className="font-display text-[20px] leading-snug tracking-[-0.014em] text-paper">
              {held.structure.name}
            </span>
            <span className="text-[11px] uppercase tracking-[0.1em] text-muted">
              {t(`family.${held.structure.family}`)}
            </span>
          </div>
          <p className="mt-2 text-[12.5px] text-muted">
            {held.adoption?.basis ?? t('adopt.noBasis')}
            <span className="mx-2 opacity-40">·</span>
            <span className="tabular-nums">{held.structure.conditions.length}</span>{' '}
            {t('adopt.conditions')}
          </p>
        </div>
        <div className="order-first shrink-0 sm:order-none">
          <State tone={toneFor(held)}>
            {t(held.declined ? 'adopt.declined' : `adopt.${held.source}`)}
          </State>
        </div>
      </div>

      {/*
        What the board said, where it said something. The amendments are the
        part a later reader is looking for: the difference between the board's
        version and the shipped one — so they are set in the serif behind a
        gold rule, which is what the board's own words look like everywhere
        else in this application.
      */}
      {held.adoption && held.adoption.amendments.length > 0 && (
        <ul className="mt-4 space-y-2 border-s-2 border-gold/50 ps-4">
          {held.adoption.amendments.map((a, i) => (
            <li key={i} className="font-display text-[15px] leading-[1.55] text-paper">
              {a}
            </li>
          ))}
        </ul>
      )}

      {held.adoption && (
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
      )}

      {canRule && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 rounded-xl bg-raised px-3.5 py-2 text-[12.5px] text-sand shadow-ring transition-colors hover:text-paper"
        >
          {held.source === 'draft' && !held.declined ? t('adopt.take') : t('adopt.reconsider')}
        </button>
      )}

      {canRule && open && (
        <div className="mt-4 rounded-card bg-ink/70 px-4 py-4 shadow-ring">
          {/*
            No matter, no adoption. The list holds only decisions of this board
            that carried and are in force — one still inside its timelock is a
            decision a signatory may yet object to.
          */}
          {carried.length === 0 ? (
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
                  rows={2}
                  placeholder={t('adopt.reasonHint')}
                  className="w-full rounded-xl bg-raised px-3 py-2.5 text-[13px] shadow-ring"
                />
              </label>

              {error && (
                <p className="mb-3 rounded-xl bg-[#FCF0EE] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-breach shadow-[0_0_0_0.5px_rgba(154,56,48,0.18)]">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy || !matterId}
                  onClick={() => take('adopted')}
                  className="rounded-xl bg-lapis px-4 py-2 text-[12.5px] font-semibold text-white shadow-act transition-all hover:bg-lapissoft disabled:opacity-40"
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
                  className="rounded-xl px-4 py-2 text-[12.5px] text-muted transition-colors hover:text-paper"
                >
                  {t('common.cancel')}
                </button>
              </div>

              {/*
                Amending a condition's text is not offered here. Rewriting a
                condition in a textarea on a card is the wrong shape for the
                act: it is drafting, and it belongs beside the condition it
                changes. Adopting, declining and reconsidering are what this
                page is for.
              */}
              <p className="mt-3 text-[11.5px] leading-relaxed text-muted">
                {t('adopt.amendElsewhere')}
              </p>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

export default function Library() {
  const { t } = useI18n();
  const { identity } = useIdentity();
  const [data, setData] = useState<LibraryData | null>(null);
  const [carried, setCarried] = useState<MatterSummary[]>([]);
  const [failed, setFailed] = useState(false);

  const load = () =>
    oversight
      .library()
      .then((d) => {
        if (!d || !Array.isArray(d.library)) {
          setFailed(true);
          return;
        }
        setData(d);
      })
      .catch(() => setFailed(true));

  useEffect(() => {
    void load();
    // Only decisions that carried and are in force. Offering one still in its
    // timelock would offer a decision that can still be objected to.
    api
      .matters()
      .then((all) => setCarried(all.filter((m) => m.status === 'in_force')))
      .catch(() => setCarried([]));
  }, []);

  if (failed) return <ErrorText />;
  if (!data) return <Loading />;

  const canRule = mayVote(identity?.role);
  const untouched = data.total - data.adopted - data.declined;

  return (
    <div>
      <div className="mb-8">
        <Display>{t('adopt.title')}</Display>
        <Note className="mt-3">{t('adopt.intro')}</Note>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <ul className="min-w-0 flex-1 space-y-2">
          {ORDER.flatMap((source) =>
            data.library
              .filter((h) => (h.declined ? source === 'draft' : h.source === source))
              .map((h) => (
                <li key={h.structure.id}>
                  <Shape
                    held={h}
                    boardId={data.boardId}
                    canRule={canRule}
                    carried={carried}
                    onAdopted={() => void load()}
                  />
                </li>
              )),
          )}
        </ul>

        <aside className="w-full shrink-0 space-y-4 lg:w-[306px]">
          {/*
            The count that matters is how much of the library nobody has looked
            at, for the same reason the register leads with the unexamined
            holdings. The other two are context and are set as context.
          */}
          <div className="rounded-sheet bg-raised/60 px-6 py-5 shadow-ring">
            <div className="font-display text-[40px] leading-[0.92] tabular-nums tracking-[-0.028em] text-paper">
              {untouched}
            </div>
            <p className="mt-3.5 text-[13px] leading-[1.6] text-sand">{t('adopt.untouched')}</p>

            <div className="mt-5 flex gap-6 border-t border-line pt-4 text-[12.5px]">
              <span>
                <span className="tabular-nums text-paper">{data.adopted}</span>{' '}
                <span className="text-muted">{t('adopt.taken')}</span>
              </span>
              <span>
                <span className="tabular-nums text-paper">{data.declined}</span>{' '}
                <span className="text-muted">{t('adopt.declinedCount')}</span>
              </span>
            </div>
          </div>

          <p className="rounded-sheet bg-raised/60 px-6 py-5 text-[12.5px] leading-[1.6] text-muted shadow-ring">
            {data.notes.draft}
          </p>
        </aside>
      </div>
    </div>
  );
}
