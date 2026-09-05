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
      <li className="rounded border border-line px-3 py-2.5">
        <div className="text-[12.5px] font-medium">{label}</div>
        {/* A gap a scholar looks at, rather than a plausible zero. */}
        <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{t('read.notFound')}</p>
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
    <li className="rounded border border-line px-3 py-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[12.5px] font-medium">{label}</span>
        <span className="font-mono text-[14px] tabular-nums text-goldsoft">{candidate.value}</span>
      </div>

      {/*
        The sentence it came from, beside the value. A scholar confirming is
        checking one against the other on this screen, which is the difference
        between confirming and rubber-stamping.
      */}
      <p className="mt-1.5 border-s-2 border-line ps-2.5 text-[12px] leading-relaxed text-muted">
        “{candidate.quote}”
        {candidate.locator && (
          <span className="ms-1.5 font-mono text-[11.5px]">
            {t('read.page')} {candidate.locator.page}
          </span>
        )}
      </p>

      {!candidate.quoteVerified && (
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-warn">{t('read.unverified')}</p>
      )}

      {taken ? (
        <p className="mt-2 text-[12px] text-muted">{t('read.taken')}</p>
      ) : (
        <button
          type="button"
          onClick={confirm}
          className="mt-2 rounded border border-line px-3 py-1 text-[12px] text-muted transition-colors hover:border-muted hover:text-paper"
        >
          {t('read.confirm')}
        </button>
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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    if (!document) return;

    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(
        await oversight.readDocument(
          document.matterId,
          document.sourceId,
          fields.map((f) => f.key),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-3 rounded border border-line px-3 py-1.5 text-[12.5px] text-muted transition-colors hover:border-muted hover:text-paper"
      >
        {t('read.open')}
      </button>
    );
  }

  const labelOf = (key: string) => fields.find((f) => f.key === key)?.label ?? key;

  return (
    <div className="mb-4 rounded-lg border border-line px-4 py-3.5">
      <div className="mb-2 text-[11px] uppercase tracking-wider text-muted">{t('read.title')}</div>
      <p className="mb-3 text-[12.5px] leading-relaxed text-muted">{t('read.intro')}</p>

      {documents.length === 0 ? (
        <p className="text-[12.5px] leading-relaxed text-muted">{t('read.noDocuments')}</p>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-[220px] flex-1">
            <span className="mb-1 block text-[11px] uppercase tracking-wider text-muted">
              {t('read.document')}
            </span>
            <select
              value={chosen}
              onChange={(e) => setChosen(e.target.value)}
              className="w-full rounded border border-line bg-transparent px-3 py-2 text-[13px]"
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
          <button
            type="button"
            disabled={busy || !chosen}
            onClick={read}
            className="rounded border border-gold/60 px-3.5 py-2 text-[13px] text-goldsoft disabled:opacity-40"
          >
            {t('read.read')}
          </button>
        </div>
      )}

      {/* The refusal in the server's words: off is a setting, not a fault. */}
      {error && (
        <p className="mt-3 rounded border border-warn/50 px-3 py-2 text-[12.5px] leading-relaxed text-warn">
          {error}
        </p>
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
            <div className="mt-3 rounded border border-warn/40 px-3 py-2.5">
              <div className="mb-1 text-[11px] uppercase tracking-wider text-warn">
                {t('read.discarded')}
              </div>
              <ul className="space-y-1">
                {result.discarded.map((d, i) => (
                  <li key={i} className="text-[12px] leading-relaxed text-muted">
                    <span className="font-mono">{labelOf(d.field)}</span> — {d.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Carried from the server, so nothing here can soften it. */}
          <p className="mt-3 text-[12px] leading-relaxed text-muted">{result.note}</p>
        </div>
      )}
    </div>
  );
}
