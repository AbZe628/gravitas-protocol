import { useRef, useState } from 'react';
import { governance, Refused, SOURCE_KINDS, type Matter, type SourceKind } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { useHealth } from '../lib/health.js';
import { DateText } from './ui.js';

/**
 * What the board is arguing from.
 *
 * A matter could carry sources and nobody could add one, so a scholar could
 * argue from an AAOIFI standard for a week with nowhere to write down which
 * standard. For a board whose entire output is reasoning, evidence that cannot
 * be attached to the reasoning was the largest ordinary gap in the application.
 *
 * Withdrawn rather than removed, and only by whoever attached it. One member
 * deleting another's citation is not a correction — it is an argument conducted
 * by deletion, and the deliberation exists for the other kind.
 *
 * ── a document, where there is somewhere to keep one ──────────────────────
 *
 * The bank sends a term sheet as a PDF, and until now the board could cite it
 * and not hold it. Attaching one produces an ordinary source of kind
 * 'document', so withdrawal and attribution work on it unchanged.
 *
 * The control appears only where the installation can actually keep a file.
 * An upload offered on a deployment with no volume is a control that lies, and
 * the lie is discovered later, by a board citing something that is gone.
 */

interface Props {
  matter: Matter;
  scholarId: string | undefined;
  canAttach: boolean;
  onChanged: (m: Matter) => void;
}

const OPEN = ['draft', 'deliberation', 'voting', 'timelock'];

export default function Evidence({ matter, scholarId, canAttach, onChanged }: Props) {
  const { t } = useI18n();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  const [kind, setKind] = useState<SourceKind>('standard');
  const [label, setLabel] = useState('');
  const [ref, setRef] = useState('');
  const [note, setNote] = useState('');

  const health = useHealth();
  const chooser = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    // The label is what a reader scans for; without one the record fills with
    // "scan.pdf". The filename is a reasonable first suggestion and the
    // scholar is asked rather than having it chosen for them.
    const chosen = label.trim() || file.name;
    await run(() => governance.attachDocument(matter.id, file, chosen, note), () => {
      setAdding(false);
      setLabel('');
      setNote('');
    });
  }

  const sources = matter.sources ?? [];
  const stillOpen = OPEN.includes(matter.status);
  const mayAdd = canAttach && stillOpen;

  // Only where a file can actually be kept. The server refuses otherwise, and
  // an interface that made the offer anyway would be putting a scholar through
  // choosing a document to be told no.
  const mayAttachDocument = mayAdd && health?.documents === 'disk';

  async function run(action: () => Promise<Matter>, after?: () => void) {
    if (busy) return;
    setBusy(true);
    setRefusal(null);
    try {
      onChanged(await action());
      after?.();
    } catch (error) {
      setRefusal(error instanceof Refused ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  const submit = () =>
    run(
      () =>
        governance.attachSource(matter.id, {
          kind,
          label: label.trim(),
          ref: ref.trim(),
          note: note.trim() || undefined,
        }),
      () => {
        setLabel('');
        setRef('');
        setNote('');
        setAdding(false);
      },
    );

  const field = 'w-full rounded border border-line bg-transparent p-2 text-[14px] outline-none';

  return (
    <div className="space-y-3">
      {sources.length === 0 && !adding && (
        <p className="text-[13px] text-muted">{t('evidence.none')}</p>
      )}

      {sources.length > 0 && (
        <ul className="space-y-2">
          {sources.map((s, i) => {
            const withdrawn = Boolean(s.withdrawnAt);
            const mine = Boolean(scholarId && s.addedBy === scholarId);
            return (
              <li
                key={s.id ?? `${s.ref}-${i}`}
                className={
                  'rounded-lg border p-3 ' +
                  (withdrawn ? 'border-line/50 bg-surface/20' : 'border-line')
                }
              >
                <div className="mb-1 flex flex-wrap items-center gap-2 text-[11.5px]">
                  <span className="rounded border border-line px-1.5 py-0.5 uppercase tracking-wide text-muted">
                    {t(`evidence.kind.${s.kind}`)}
                  </span>
                  {s.addedBy && (
                    <span className={withdrawn ? 'text-muted' : 'text-goldsoft'}>{s.addedBy}</span>
                  )}
                  {s.at && (
                    <span className="text-muted">
                      <DateText iso={s.at} />
                    </span>
                  )}
                  {withdrawn && (
                    <span className="rounded border border-line px-1.5 py-0.5 uppercase tracking-wide text-muted">
                      {t('evidence.withdrawn')}
                    </span>
                  )}
                </div>

                <div className={'text-[14px] ' + (withdrawn ? 'text-muted' : 'text-paper')}>
                  {s.label}
                </div>
                {/*
                  A document shows its name and size rather than its key. The
                  key is the SHA-256 and it is the reference, but a reader
                  scanning a list of citations is looking for a document, not
                  for a hash.
                */}
                {s.file ? (
                  <a
                    href={governance.documentHref(matter.id, s.id ?? '')}
                    className="mt-0.5 inline-block break-words text-[12.5px] underline underline-offset-2 hover:text-fg"
                  >
                    {s.file.name}{' '}
                    <span className="font-mono text-[11.5px] text-muted">
                      {(s.file.bytes / 1024).toFixed(0)} kB
                    </span>
                  </a>
                ) : (
                  <div className="mt-0.5 break-words font-mono text-[12px] text-muted">{s.ref}</div>
                )}
                {s.note && (
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{s.note}</p>
                )}

                {withdrawn && (
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
                    {t('evidence.withdrawnNote')}
                  </p>
                )}

                {!withdrawn && mine && stillOpen && s.id && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => governance.withdrawSource(matter.id, s.id!))}
                    className="mt-2 text-[12px] text-muted hover:text-paper disabled:opacity-40"
                  >
                    {t('evidence.withdraw')}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {refusal && !adding && (
        <p className="rounded border border-amber-500/40 bg-amber-500/5 p-2 text-[12.5px] text-amber-200">
          {refusal}
        </p>
      )}

      {mayAdd && !adding && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setRefusal(null);
              setAdding(true);
            }}
            className="rounded border border-line px-3 py-1.5 text-[12px] hover:bg-surface/60"
          >
            {t('evidence.add')}
          </button>

          {mayAttachDocument && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setRefusal(null);
                  chooser.current?.click();
                }}
                className="rounded border border-line px-3 py-1.5 text-[12px] hover:bg-surface/60 disabled:opacity-40"
              >
                {t('evidence.attachDocument')}
              </button>
              <input
                ref={chooser}
                type="file"
                hidden
                accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  // Cleared either way, so choosing the same file twice after a
                  // refusal still fires.
                  e.target.value = '';
                  if (file) void upload(file);
                }}
              />
            </>
          )}
        </div>
      )}

      {mayAdd && adding && (
        <div className="space-y-2 rounded-lg border border-line p-3">
          <p className="text-[12px] leading-relaxed text-muted">{t('evidence.help')}</p>

          <div className="flex flex-wrap gap-1.5">
            {SOURCE_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={
                  'rounded border px-2 py-1 text-[11.5px] uppercase tracking-wide ' +
                  (kind === k
                    ? 'border-gold text-goldsoft'
                    : 'border-line text-muted hover:text-paper')
                }
              >
                {t(`evidence.kind.${k}`)}
              </button>
            ))}
          </div>

          <label className="block text-[12px] text-muted" htmlFor="ev-label">
            {t('evidence.label')}
          </label>
          <input
            id="ev-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t('evidence.labelHint')}
            className={field}
          />

          <label className="block text-[12px] text-muted" htmlFor="ev-ref">
            {t('evidence.ref')}
          </label>
          <input
            id="ev-ref"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder={t('evidence.refHint')}
            className={field + ' font-mono text-[13px]'}
          />

          <label className="block text-[12px] text-muted" htmlFor="ev-note">
            {t('evidence.note')}
          </label>
          <textarea
            id="ev-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder={t('evidence.noteHint')}
            className={field + ' resize-y leading-relaxed'}
          />

          {refusal && <p className="text-[12.5px] text-amber-200">{refusal}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={busy || label.trim().length < 3 || ref.trim().length < 1}
              onClick={submit}
              className="rounded border border-line px-3 py-1.5 text-[12px] hover:bg-surface/60 disabled:opacity-40"
            >
              {t('evidence.attach')}
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="text-[12px] text-muted hover:text-paper"
            >
              {t('say.cancel')}
            </button>
          </div>
        </div>
      )}

      {canAttach && !stillOpen && sources.length > 0 && (
        <p className="text-[11.5px] leading-relaxed text-muted">{t('evidence.closed')}</p>
      )}
    </div>
  );
}
