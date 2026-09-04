import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, oversight, type HeldStructure, type Library as LibraryData, type MatterSummary } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { mayVote, useIdentity } from '../lib/identity.js';
import { Card, ErrorText, Loading, Tag } from '../components/ui.js';

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
 */

function tone(held: HeldStructure): 'warn' | 'gold' | 'ok' | undefined {
  if (held.declined) return 'warn';
  if (held.source === 'draft') return 'gold';
  return 'ok';
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
    <Card>
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <Tag tone={tone(held)}>
          {t(held.declined ? 'adopt.declined' : `adopt.${held.source}`)}
        </Tag>
        <span className="text-[11px] uppercase tracking-wider text-muted">
          {t(`family.${held.structure.family}`)}
        </span>
      </div>

      <div className="text-[14px] font-medium leading-snug">{held.structure.name}</div>
      <p className="mt-0.5 text-[12px] text-muted">{held.structure.authority}</p>

      <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
        {held.structure.conditions.length} {t('adopt.conditions')}
      </p>

      {/*
        What the board said, where it said something. The amendments are the
        part a later reader is looking for: the difference between the board's
        version and the shipped one.
      */}
      {held.adoption && held.adoption.amendments.length > 0 && (
        <ul className="mt-2 space-y-1">
          {held.adoption.amendments.map((a, i) => (
            <li key={i} className="text-[12.5px] leading-relaxed">
              {a}
            </li>
          ))}
        </ul>
      )}

      {held.adoption && (
        <p className="mt-2 text-[12px] text-muted">
          {t('adopt.under')}{' '}
          <Link
            to={`/matters/${held.adoption.matterId}`}
            className="font-mono underline underline-offset-2 hover:text-fg"
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
          className="mt-2.5 rounded border border-line px-3 py-1.5 text-[12.5px] text-muted transition-colors hover:border-muted hover:text-paper"
        >
          {held.source === 'draft' && !held.declined ? t('adopt.take') : t('adopt.reconsider')}
        </button>
      )}

      {canRule && open && (
        <div className="mt-3 rounded border border-line px-3 py-3">
          {/*
            No matter, no adoption. The list holds only decisions of this board
            that carried and are in force — one still inside its timelock is a
            decision a signatory may yet object to.
          */}
          {carried.length === 0 ? (
            <p className="text-[12.5px] leading-relaxed text-muted">{t('adopt.noDecision')}</p>
          ) : (
            <>
              <label className="mb-2.5 block">
                <span className="mb-1 block text-[11px] uppercase tracking-wider text-muted">
                  {t('adopt.decidedIn')}
                </span>
                <select
                  value={matterId}
                  onChange={(e) => setMatterId(e.target.value)}
                  className="w-full rounded border border-line bg-transparent px-3 py-2 text-[13px]"
                >
                  <option value="">{t('adopt.pickDecision')}</option>
                  {carried.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mb-2.5 block">
                <span className="mb-1 block text-[11px] uppercase tracking-wider text-muted">
                  {t('adopt.reason')}
                </span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder={t('adopt.reasonHint')}
                  className="w-full rounded border border-line bg-transparent px-3 py-2 text-[13px]"
                />
              </label>

              {error && (
                <p className="mb-2.5 rounded border border-warn/50 px-3 py-2 text-[12.5px] leading-relaxed text-warn">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || !matterId}
                  onClick={() => take('adopted')}
                  className="rounded border border-gold/60 px-3 py-1.5 text-[12.5px] text-goldsoft disabled:opacity-40"
                >
                  {t('adopt.confirm')}
                </button>
                <button
                  type="button"
                  disabled={busy || !matterId}
                  onClick={() => take('declined')}
                  className="rounded border border-warn/50 px-3 py-1.5 text-[12.5px] text-warn disabled:opacity-40"
                >
                  {t('adopt.decline')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setError(null);
                  }}
                  className="rounded border border-line px-3 py-1.5 text-[12.5px] text-muted"
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
              <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted">
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
      <h1 className="mb-1 text-[19px] font-semibold tracking-tight">{t('adopt.title')}</h1>
      <p className="mb-4 max-w-prose text-[13px] leading-relaxed text-muted">{t('adopt.intro')}</p>

      {/*
        The count that matters is how much of the library nobody has looked at,
        for the same reason the register leads with the unexamined holdings.
      */}
      <div className="mb-5 flex flex-wrap gap-4 text-[13px]">
        <span>
          <span className="font-medium tabular-nums">{untouched}</span>{' '}
          <span className="text-muted">{t('adopt.untouched')}</span>
        </span>
        <span>
          <span className="font-medium tabular-nums">{data.adopted}</span>{' '}
          <span className="text-muted">{t('adopt.taken')}</span>
        </span>
        <span>
          <span className="font-medium tabular-nums">{data.declined}</span>{' '}
          <span className="text-muted">{t('adopt.declinedCount')}</span>
        </span>
      </div>

      <div className="space-y-3">
        {ORDER.flatMap((source) =>
          data.library
            .filter((h) => (h.declined ? source === 'draft' : h.source === source))
            .map((h) => (
              <Shape
                key={h.structure.id}
                held={h}
                boardId={data.boardId}
                canRule={canRule}
                carried={carried}
                onAdopted={() => void load()}
              />
            )),
        )}
      </div>

      <p className="mt-4 rounded border border-line px-3 py-2.5 text-[12.5px] leading-relaxed text-muted">
        {data.notes.draft}
      </p>
    </div>
  );
}
