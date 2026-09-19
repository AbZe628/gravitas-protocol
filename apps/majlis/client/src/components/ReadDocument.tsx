import Act from './Act.js';
import { useEffect, useState } from 'react';
import {
  oversight,
  type BoardDocument,
  type Extraction,
  type FigureCandidate,
} from '../lib/api.js';
import { useHealth } from '../lib/health.js';
import { useI18n } from '../lib/i18n.js';
import { useIdentity } from '../lib/identity.js';
import { Button } from './Button';

/**
 * Reading figures out of a document the bank supplied.
 *
 * A board's screening needs five numbers off a balance sheet, and today
 * somebody types them. A typed figure carries no provenance at all: one member
 * entered 3,200,000 and nobody afterwards can say from where.
 *
 * ── this proposes, and fills nothing in ───────────────────────────────────
 *
 * Every candidate arrives unconfirmed and stays unconfirmed until a person
 * presses the button beside it. There is no "confirm all". A scholar checking
 * five figures against five quotes is doing the work the feature exists for,
 * and a control that let them agree to all of it at once would turn confirming
 * into rubber-stamping — which is the failure this is built against, not a
 * convenience it forgot.
 *
 * **The quote is not decoration.** It sits beside the value, on this screen,
 * so a scholar checks the figure against the sentence it came from without
 * opening the document. That is the whole difference.
 *
 * **A gap is shown as a gap.** A field the reading could not find says so
 * rather than offering a plausible zero, and nothing fills that field.
 *
 * ── and it appears only where it can work ─────────────────────────────────
 *
 * Off unless the institution turned it on, and the panel is absent rather than
 * disabled — an institution that will not send its accounts anywhere types the
 * figures in and loses nothing but time.
 */

export interface ReadDocumentProps {
  /** The fields this calculation wants, in the order the form shows them. */
  fields: { key: string; label: string }[];
  /**
   * Called once per confirmation, never in bulk.
   *
   * `provenance` is the sentence that goes into the calculation's source, and
   * from there into the fatwa: the document, the page, the quote and the member
   * who agreed it was right.
   */
  onConfirm: (field: string, value: string, provenance: string) => void;
}

function Candidate({
  candidate,
  label,
  documentName,
  onConfirm,
}: {
  candidate: FigureCandidate;
  label: string;
  documentName: string;
  onConfirm: (field: string, value: string, provenance: string) => void;
}) {
  const { t } = useI18n();
  const { identity } = useIdentity();
  const [taken, setTaken] = useState(false);

  if (candidate.notFound) {
    return (
      <li className="rounded-xl shadow-ring px-3 py-2.5">
        <div className="text-ui font-medium">{label}</div>
        {/* A gap a scholar looks at, rather than a plausible zero. */}
        <p className="mt-0.5 text-note leading-relaxed text-muted">{t('read.notFound')}</p>
      </li>
    );
  }

  const confirm = () => {
    const where = candidate.locator ? `, page ${candidate.locator.page}` : '';
    const unchecked = candidate.quoteVerified ? '' : ' ' + t('read.unverifiedNote');
    const provenance =
      `${t('read.extractedFrom')} "${documentName}"${where} — "${candidate.quote}" — ` +
      `${t('read.confirmedBy')} ${identity?.scholarId ?? '—'} ` +
      `${new Date().toISOString().slice(0, 10)}.${unchecked}`;

    onConfirm(candidate.field, candidate.value ?? '', provenance);
    setTaken(true);
  };

  return (
    <li className="rounded-xl shadow-ring px-3 py-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-ui font-medium">{label}</span>
        <span className="font-mono text-body tabular-nums text-lapis">{candidate.value}</span>
      </div>

      {/*
        The sentence it came from, beside the value. A scholar confirming is
        checking one against the other on this screen, which is the difference
        between confirming and rubber-stamping.
      */}
      <p className="mt-1.5 border-s-2 border-line ps-2.5 text-note leading-relaxed text-muted">
        “{candidate.quote}”
        {candidate.locator && (
          <span className="ms-1.5 font-mono text-note">
            {t('read.page')} {candidate.locator.page}
          </span>
        )}
      </p>

      {!candidate.quoteVerified && (
        <p className="mt-1.5 text-note leading-relaxed text-breach">{t('read.unverified')}</p>
      )}

      {taken ? (
        <p className="mt-2 text-note text-muted">{t('read.taken')}</p>
      ) : (
        <Button
          type="button"
          onClick={confirm}
          className="mt-2 rounded-xl shadow-ring px-3 py-1 text-note text-muted transition-colors hover:text-paper"
        >
          {t('read.confirm')}
        </Button>
      )}
    </li>
  );
}

export default function ReadDocument({ fields, onConfirm }: ReadDocumentProps) {
  const { t } = useI18n();
  const health = useHealth();

  const [open, setOpen] = useState(false);
  const [documents, setDocuments] = useState<BoardDocument[]>([]);
  const [chosen, setChosen] = useState('');
  const [result, setResult] = useState<Extraction | null>(null);

  /** Whether the window that performs the reading is open. */
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (!open) return;
    oversight
      .documents()
      .then((d) => setDocuments(d.documents ?? []))
      .catch(() => setDocuments([]));
  }, [open]);

  // Absent rather than disabled. An institution that will not send its accounts
  // anywhere types the figures in, and a control that only refuses is worse
  // than no control.
  if (health?.reading !== 'anthropic') return null;

  async function read() {
    const document = documents.find((d) => d.sourceId === chosen);
    /*
     * Not a quiet return. The window has already told the member what is
     * about to happen; coming back as though it worked would have it
     * announce a reading of a document nobody chose.
     */
    if (!document) throw new Error(t('read.noneChosen'));

    setResult(null);
    setResult(
      await oversight.readDocument(
        document.matterId,
        document.sourceId,
        fields.map((f) => f.key),
      ),
    );
  }

  if (!open) {
    return (
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-3 rounded-xl shadow-ring px-3 py-1.5 text-ui text-muted transition-colors hover:text-paper"
      >
        {t('read.open')}
      </Button>
    );
  }

  const labelOf = (key: string) => fields.find((f) => f.key === key)?.label ?? key;

  return (
    <div className="mb-4 rounded-card shadow-ring px-4 py-3.5">
      <div className="mb-2 text-label font-bold uppercase tracking-caps text-muted">{t('read.title')}</div>
      <p className="mb-3 text-ui leading-relaxed text-muted">{t('read.intro')}</p>

      {documents.length === 0 ? (
        <p className="text-ui leading-relaxed text-muted">{t('read.noDocuments')}</p>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-[220px] flex-1">
            <span className="mb-1 block text-label font-bold uppercase tracking-caps text-muted">
              {t('read.document')}
            </span>
            <select
              value={chosen}
              onChange={(e) => setChosen(e.target.value)}
              className="w-full rounded-xl shadow-ring bg-raised px-3 py-2 text-ui"
            >
              <option value="">{t('read.pickDocument')}</option>
              {documents.map((d) => (
                <option key={d.sourceId} value={d.sourceId}>
                  {d.label} — {d.name}
                  {d.withdrawn ? ` (${t('read.withdrawn')})` : ''}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            disabled={!chosen}
            onClick={() => setAsking(true)}
            className="rounded-xl bg-raised shadow-ring px-3.5 py-2 text-ui text-lapis font-medium disabled:opacity-40"
          >
            {t('read.read')}
          </Button>

          {/*
            A machine reading a document the institution sent. What comes
            back is a list of fields with figures in them, which is the shape
            of an answer — so the window says, before the press, that nothing
            is recorded, that every figure carries the words it was taken
            from, and that a field it could not find stays empty and named
            rather than filled with a plausible number.
          */}
          <Act
            open={asking}
            onClose={() => setAsking(false)}
            title={t('read.read')}
            does={t('wm.readDoc.does')}
            means={t('wm.readDoc.means')}
            label={t('read.read')}
            perform={read}
            after={{
              did: t('wm.readDoc.did'),
              means: t('wm.readDoc.didMeans'),
              next: [{ label: t('wm.next.theFields'), says: t('wm.next.theFieldsSays') }],
            }}
          />
        </div>
      )}


      {result && (
        <div className="mt-4">
          <ul className="space-y-2">
            {result.candidates.map((c) => (
              <Candidate
                key={c.field}
                candidate={c}
                label={labelOf(c.field)}
                documentName={result.documentName}
                onConfirm={onConfirm}
              />
            ))}
          </ul>

          {/*
            What was thrown away and why, shown rather than hidden. A model that
            contradicted itself twice on one document is a fact a scholar should
            have — and a silent discard would make a bad reading look like a
            thin one.
          */}
          {result.discarded.length > 0 && (
            <div className="mt-3 rounded-xl shadow-ringbreach px-3 py-2.5">
              <div className="mb-1.5 text-label font-bold uppercase tracking-caps text-gold">
                {t('read.discarded')}
              </div>
              <ul className="space-y-1">
                {result.discarded.map((d, i) => (
                  <li key={i} className="text-note leading-relaxed text-muted">
                    <span className="font-mono">{labelOf(d.field)}</span> — {d.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Carried from the server, so nothing here can soften it. */}
          <p className="mt-3 text-note leading-relaxed text-muted">{result.note}</p>
        </div>
      )}
    </div>
  );
}
