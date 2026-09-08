import { useEffect, useState } from 'react';
import { oversight, type Margin, type AnnotationThread } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { mayDeliberate, useIdentity } from '../lib/identity.js';
import { Nothing } from './page.js';

/**
 * The papers, with what members wrote in the margin beside them.
 *
 * ── what it is for ───────────────────────────────────────────────────────
 *
 * Every board portal has this and Majlis did not. A member reads the proposal,
 * marks a line, and writes what they think about that line; the rest of the
 * board sees the mark where the words are. It is how a board actually reads a
 * document together, and without it the reading happens in email.
 *
 * ── it is not the deliberation ───────────────────────────────────────────
 *
 * A note is one member saying *look at this line*. The argument about the
 * matter belongs under the matter, where the fatwa is assembled from it, and
 * this says so in one sentence rather than leaving a member to guess which of
 * the two boxes their sentence belongs in.
 *
 * ── marking is selecting ─────────────────────────────────────────────────
 *
 * There is no *add a note* button that then asks which passage. A member
 * selects the words the way they would in any document and the control appears
 * with the selection already in it, because a form that asks somebody to
 * retype the sentence they just pointed at will not be used twice.
 *
 * ── a note that has come loose says so ───────────────────────────────────
 *
 * The server re-finds every passage in the text as it stands now. Where the
 * words have gone, the note is listed under its own heading with what it was
 * about, rather than deleted or moved to somewhere plausible.
 */

/** The text, with every marked passage underlined where it actually sits. */
function Marked({ text, threads }: { text: string; threads: AnnotationThread[] }) {
  /*
   * Built by walking the marks in order and cutting the text between them.
   * Overlapping marks are not merged: the later one starts a new span, which
   * is visually noisier than merging and never claims a member marked words
   * they did not.
   */
  const marks = threads
    .filter((t) => t.note.at !== null && !t.note.annotation.withdrawn)
    .map((t) => ({ from: t.note.at as number, to: (t.note.at as number) + t.note.annotation.quote.length }))
    .sort((a, b) => a.from - b.from);

  const parts: { text: string; marked: boolean }[] = [];
  let at = 0;
  for (const m of marks) {
    if (m.from < at) continue;
    if (m.from > at) parts.push({ text: text.slice(at, m.from), marked: false });
    parts.push({ text: text.slice(m.from, m.to), marked: true });
    at = m.to;
  }
  if (at < text.length) parts.push({ text: text.slice(at), marked: false });

  return (
    <p className="max-w-[58ch] whitespace-pre-wrap font-display text-[17px] leading-[1.6]">
      {parts.map((p, i) =>
        p.marked ? (
          <mark
            key={i}
            className="bg-[#F7F0E2] text-paper shadow-[inset_0_-1px_0_rgba(176,132,48,0.5)]"
          >
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </p>
  );
}

function Note({
  thread,
  mine,
  onChanged,
}: {
  thread: AnnotationThread;
  mine: string | undefined;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const [replying, setReplying] = useState(false);
  const [said, setSaid] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const a = thread.note.annotation;

  async function reply() {
    setBusy(true);
    setFailed(null);
    try {
      await oversight.annotate({ on: a.on, subjectId: a.subjectId, said, replyTo: a.id });
      setSaid('');
      setReplying(false);
      onChanged();
    } catch (e) {
      setFailed(e instanceof Error ? e.message : t('margin.failed'));
    } finally {
      setBusy(false);
    }
  }

  async function drop() {
    setBusy(true);
    setFailed(null);
    try {
      await oversight.withdrawNote(a.id);
      onChanged();
    } catch (e) {
      setFailed(e instanceof Error ? e.message : t('margin.failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-card bg-ink px-4 py-3.5 shadow-ring">
      <p className="mb-2 border-s-2 border-gold/40 ps-3 text-[12.5px] italic leading-[1.55] text-muted">
        {a.quote}
      </p>

      {thread.note.adrift && (
        <p className="mb-2 text-[12px] leading-[1.55] text-gold">{t('margin.adrift')}</p>
      )}

      <p
        className={
          'max-w-[58ch] text-[13.5px] leading-[1.65] ' +
          (a.withdrawn ? 'text-muted line-through decoration-line' : 'text-paper')
        }
      >
        {a.said}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted">
        <span>{a.whoName ?? thread.whoName ?? a.by}</span>
        <span className="opacity-40">·</span>
        <span className="font-mono">{a.atTime.slice(0, 10)}</span>
        {a.withdrawn && <span className="text-gold">{t('margin.withdrawn')}</span>}
      </div>

      {thread.replies.length > 0 && (
        <ul className="mt-3 space-y-2 border-s border-line ps-3.5">
          {thread.replies.map((r) => (
            <li key={r.id}>
              <p className="max-w-[56ch] text-[13px] leading-[1.6] text-sand">{r.said}</p>
              <div className="mt-1 text-[11.5px] text-muted">
                {r.whoName ?? r.by}
                <span className="mx-1.5 opacity-40">·</span>
                <span className="font-mono">{r.atTime.slice(0, 10)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {failed && <p className="mt-2 text-[12.5px] text-breach">{failed}</p>}

      <div className="mt-2.5 flex flex-wrap items-center gap-4 text-[12px]">
        {!a.withdrawn && !replying && (
          <button
            type="button"
            onClick={() => setReplying(true)}
            className="font-semibold text-lapis underline decoration-line underline-offset-4"
          >
            {t('margin.reply')}
          </button>
        )}
        {/*
          Withdrawing belongs to whoever wrote it. Somebody else removing a
          note would be editing what a colleague read, and the route refuses
          regardless of what is shown.
        */}
        {!a.withdrawn && a.by === mine && (
          <button
            type="button"
            onClick={drop}
            disabled={busy}
            className="text-muted underline decoration-line underline-offset-4 disabled:opacity-50"
          >
            {t('margin.withdraw')}
          </button>
        )}
      </div>

      {replying && (
        <div className="mt-2.5">
          <textarea
            aria-label={t('margin.reply')}
            value={said}
            onChange={(e) => setSaid(e.target.value)}
            rows={3}
            className="w-full rounded-card bg-raised px-3.5 py-2.5 text-[13px] leading-[1.6] text-paper shadow-ring outline-none"
          />
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={reply}
              disabled={busy || said.trim().length < 2}
              className="rounded-card bg-lapis px-4 py-2 text-[12.5px] font-bold text-white shadow-act disabled:opacity-50"
            >
              {t('margin.send')}
            </button>
            <button
              type="button"
              onClick={() => setReplying(false)}
              className="text-[12px] text-muted underline decoration-line underline-offset-4"
            >
              {t('common.back')}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function InTheMargin({
  on,
  subjectId,
}: {
  on: 'proposal' | 'briefing' | 'document';
  subjectId: string;
}) {
  const { t } = useI18n();
  const { identity } = useIdentity();
  const [margin, setMargin] = useState<Margin | null>(null);
  const [failed, setFailed] = useState(false);

  /** What the reader has selected inside the text, if anything. */
  const [selected, setSelected] = useState('');
  const [said, setSaid] = useState('');
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);

  function load() {
    setFailed(false);
    oversight
      .margin(on, subjectId)
      .then((m) => (m && Array.isArray(m.threads) && typeof m.text === 'string' ? setMargin(m) : setFailed(true)))
      .catch(() => setFailed(true));
  }

  useEffect(load, [on, subjectId]);

  const mayWrite = mayDeliberate(identity?.role);

  /*
   * Read from the browser's own selection rather than from a field. A member
   * who has to retype the sentence they just pointed at will do it once.
   */
  function takeSelection() {
    const text = window.getSelection()?.toString() ?? '';
    setSelected(text.trim());
    setRefused(null);
  }

  async function write() {
    setBusy(true);
    setRefused(null);
    try {
      await oversight.annotate({ on, subjectId, quote: selected, said });
      setSaid('');
      setSelected('');
      load();
    } catch (e) {
      setRefused(e instanceof Error ? e.message : t('margin.failed'));
    } finally {
      setBusy(false);
    }
  }

  if (failed) return <Nothing>{t('margin.unavailable')}</Nothing>;
  if (!margin) return <p className="text-[13px] text-muted">{t('common.loading')}</p>;

  const standing = margin.threads.filter((x) => !x.note.annotation.withdrawn);

  return (
    <div>
      <div onMouseUp={takeSelection} onTouchEnd={takeSelection}>
        <Marked text={margin.text} threads={margin.threads} />
      </div>

      {mayWrite && (
        <div className="mt-4">
          {selected ? (
            <div className="rounded-card bg-ink px-4 py-4 shadow-ring">
              <p className="mb-2 border-s-2 border-gold/40 ps-3 text-[12.5px] italic leading-[1.55] text-sand">
                {selected}
              </p>
              <textarea
                aria-label={t('margin.write')}
                value={said}
                onChange={(e) => setSaid(e.target.value)}
                rows={3}
                placeholder={t('margin.placeholder')}
                className="w-full rounded-card bg-raised px-3.5 py-2.5 text-[13px] leading-[1.6] text-paper shadow-ring outline-none placeholder:text-muted"
              />
              {refused && <p className="mt-2 text-[12.5px] text-breach">{refused}</p>}
              <div className="mt-2.5 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={write}
                  disabled={busy || said.trim().length < 2}
                  className="rounded-card bg-lapis px-5 py-2.5 text-[13px] font-bold text-white shadow-act disabled:opacity-50"
                >
                  {t('margin.write')}
                </button>
                <button
                  type="button"
                  onClick={() => setSelected('')}
                  className="text-[12px] text-muted underline decoration-line underline-offset-4"
                >
                  {t('common.back')}
                </button>
              </div>
              <p className="mt-3 max-w-[58ch] text-[12px] leading-[1.6] text-muted">
                {t('margin.notDeliberation')}
              </p>
            </div>
          ) : (
            <p className="text-[12.5px] text-muted">{t('margin.howTo')}</p>
          )}
        </div>
      )}

      {margin.threads.length > 0 && (
        <div className="mt-5">
          <div className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            {t('margin.heading')}
            <span className="ms-2 font-mono tabular-nums opacity-70">{standing.length}</span>
          </div>
          <ul className="space-y-2.5">
            {margin.threads.map((thread) => (
              <Note
                key={thread.note.annotation.id}
                thread={thread}
                mine={identity?.scholarId}
                onChanged={load}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
