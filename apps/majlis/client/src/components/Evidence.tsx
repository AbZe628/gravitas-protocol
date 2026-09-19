import { useRef, useState } from 'react';
import { governance, Refused, SOURCE_KINDS, type Matter, type SourceKind } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { useHealth } from '../lib/health.js';
import { DateText } from './ui.js';
import { Button } from './Button';
import Act from './Act.js';
import AfterAct from './AfterAct.js';

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
  /** Which source is being withdrawn, if any. */
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  /** What the last act did, held above the list it changes. */
  const [justDid, setJustDid] = useState<{
    did: string;
    means: string;
    next: readonly { label: string; to?: string; says?: string }[];
  } | null>(null);
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

  /** Whether the window that attaches the source is showing. */
  const [attaching, setAttaching] = useState(false);

  async function submit() {
    onChanged(
      await governance.attachSource(matter.id, {
        kind,
        label: label.trim(),
        ref: ref.trim(),
        note: note.trim() || undefined,
      }),
    );
    setLabel('');
    setRef('');
    setNote('');
    setAdding(false);
  }

  const field = 'w-full rounded-xl bg-raised shadow-ring p-2 text-body outline-none';

  return (
    <div className="space-y-3">
      {/*
        What the last act did, above the list.

        Withdrawing a source redraws the row it was pressed on, so the sentence
        cannot be rendered inside that row.
      */}
      {justDid && (
        <AfterAct
          did={justDid.did}
          means={justDid.means}
          next={justDid.next}
          onClose={() => setJustDid(null)}
        />
      )}

      {/*
        Taking a source back.

        It was a line of small grey text and a press, with nothing said before
        or after — and what it does is not obvious: the source is not deleted,
        it stays in the record marked withdrawn, and anything already argued on
        the strength of it stays exactly as it was said. That is worth a window.

        Attaching one is not here because it already has its own: the composer
        below asks for the kind, the title and where it is found, which is the
        dialog `N-90` describes, opened in place rather than over the screen.
      */}
      {/*
        A source is what an argument rests on, and putting one on a matter is
        visible to the whole board at once. The words for this were written
        when the rest of the acts got theirs; the window was not, and a
        measure that looked at the file rather than the act did not notice.
      */}
      <Act
        open={attaching}
        onClose={() => setAttaching(false)}
        title={t('evidence.add')}
        does={t('wm.attach.does')}
        means={t('wm.attach.means')}
        label={t('evidence.add')}
        perform={submit}
        onDone={setJustDid}
        after={{
          did: t('wm.attach.did'),
          means: t('wm.attach.didMeans'),
          next: [{ label: t('wm.next.backToMatter'), says: t('wm.next.backToMatterSays') }],
        }}
      />

      <Act
        open={withdrawing !== null}
        onClose={() => setWithdrawing(null)}
        title={t('evidence.withdraw')}
        does={t('wm.withdrawSource.does')}
        means={t('wm.withdrawSource.means')}
        label={t('evidence.withdraw')}
        grave
        reason={{
          label: t('wm.withdrawSource.reason'),
          help: t('wm.withdrawSource.reasonHelp'),
        }}
        perform={async () => {
          if (!withdrawing) return;
          onChanged(await governance.withdrawSource(matter.id, withdrawing));
        }}
        onDone={setJustDid}
        after={{
          did: t('wm.withdrawSource.did'),
          means: t('wm.withdrawSource.didMeans'),
          next: [{ label: t('wm.next.backToMatter'), says: t('wm.next.backToMatterSays') }],
        }}
      />

      {sources.length === 0 && !adding && (
        <p className="text-ui text-muted">{t('evidence.none')}</p>
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
                  'rounded-card px-5 py-4 ' +
                  (withdrawn ? 'bg-raised/50 shadow-ring' : 'bg-raised shadow-card')
                }
              >
                <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-note">
                  <span className="rounded-full bg-black/[0.045] px-2.5 py-0.5 text-label font-bold uppercase tracking-label text-sand">
                    {t(`evidence.kind.${s.kind}`)}
                  </span>
                  {s.addedBy && (
                    <span className={withdrawn ? 'text-muted' : 'text-lapis'}>{s.addedBy}</span>
                  )}
                  {s.at && (
                    <span className="text-muted">
                      <DateText iso={s.at} />
                    </span>
                  )}
                  {withdrawn && (
                    <span className="rounded-full bg-black/[0.045] px-2.5 py-0.5 text-label font-bold uppercase tracking-label text-sand">
                      {t('evidence.withdrawn')}
                    </span>
                  )}
                </div>

                <div className={'text-body ' + (withdrawn ? 'text-muted' : 'text-paper')}>
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
                    className="mt-0.5 inline-block break-words text-ui underline underline-offset-2 hover:text-fg"
                  >
                    {s.file.name}{' '}
                    <span className="font-mono text-note text-muted">
                      {(s.file.bytes / 1024).toFixed(0)} kB
                    </span>
                  </a>
                ) : (
                  <div className="mt-0.5 break-words font-mono text-note text-muted">{s.ref}</div>
                )}
                {s.note && (
                  <p className="mt-1.5 text-ui leading-relaxed text-muted">{s.note}</p>
                )}

                {withdrawn && (
                  <p className="mt-1.5 text-note leading-relaxed text-muted">
                    {t('evidence.withdrawnNote')}
                  </p>
                )}

                {!withdrawn && mine && stillOpen && s.id && (
                  <Button
                    tone="grave"
                    size="sm"
                    className="mt-2"
                    disabled={busy}
                    onClick={() => setWithdrawing(s.id!)}
                  >
                    {t('evidence.withdraw')}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {refusal && !adding && (
        <p className="rounded-xl bg-breachtint px-4 py-2.5 text-ui leading-relaxed text-breach shadow-ringbreach">
          {refusal}
        </p>
      )}

      {mayAdd && !adding && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => {
              setRefusal(null);
              setAdding(true);
            }}
            className="rounded-xl shadow-ring px-3 py-1.5 text-note hover:bg-raised"
          >
            {t('evidence.add')}
          </Button>

          {mayAttachDocument && (
            <>
              <Button
                type="button"
                disabled={busy}
                onClick={() => {
                  setRefusal(null);
                  chooser.current?.click();
                }}
                className="rounded-xl shadow-ring px-3 py-1.5 text-note hover:bg-raised disabled:opacity-40"
              >
                {t('evidence.attachDocument')}
              </Button>
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
        <div className="space-y-2 rounded-card shadow-ring p-3">
          <p className="text-note leading-relaxed text-muted">{t('evidence.help')}</p>

          <div className="flex flex-wrap gap-1.5">
            {SOURCE_KINDS.map((k) => (
              <Button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={
                  'rounded-full px-3 py-1 text-label font-bold uppercase tracking-label transition-all ' +
                  (kind === k
                    ? 'bg-lapistint text-lapis shadow-pick'
                    : 'bg-black/[0.045] text-sand hover:text-paper')
                }
              >
                {t(`evidence.kind.${k}`)}
              </Button>
            ))}
          </div>

          <label className="block text-note text-muted" htmlFor="ev-label">
            {t('evidence.label')}
          </label>
          <input
            id="ev-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t('evidence.labelHint')}
            className={field}
          />

          <label className="block text-note text-muted" htmlFor="ev-ref">
            {t('evidence.ref')}
          </label>
          <input
            id="ev-ref"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder={t('evidence.refHint')}
            className={field + ' font-mono text-ui'}
          />

          <label className="block text-note text-muted" htmlFor="ev-note">
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

          {refusal && <p className="text-ui text-breach">{refusal}</p>}

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              disabled={busy || label.trim().length < 3 || ref.trim().length < 1}
              onClick={() => setAttaching(true)}
              className="rounded-xl shadow-ring px-3 py-1.5 text-note hover:bg-raised disabled:opacity-40"
            >
              {t('evidence.attach')}
            </Button>
            <Button
              type="button"
              onClick={() => setAdding(false)}
              className="text-note text-muted hover:text-paper"
            >
              {t('say.cancel')}
            </Button>
          </div>
        </div>
      )}

      {canAttach && !stillOpen && sources.length > 0 && (
        <p className="text-note leading-relaxed text-muted">{t('evidence.closed')}</p>
      )}
    </div>
  );
}
