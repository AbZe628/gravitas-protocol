import { useRef, useState } from 'react';
import { useI18n } from '../lib/i18n.js';
import { Button } from './Button';
import { TooFewWords, wordsFrom } from '../lib/pdf.js';

/**
 * The bank attaches the contract its question is about.
 *
 * ── why the words rather than the file ────────────────────────────────────
 *
 * The file never leaves the desk's machine. Its text is read in the browser
 * and travels with the question, which is what the board actually needs: the
 * sentences its conditions are read against. Keeping the file would need a
 * mounted volume, which no installation has by default, and it would put a
 * confidential draft on a server for no gain the board can use.
 *
 * ── the PDF, which is what actually arrives ──────────────────────────────
 *
 * A bank's contract is almost always a PDF, and this used to name the file
 * and refuse it. That was honest and it meant the way in worked on every
 * format except the one every real enquiry comes in — so every proof that
 * the path from a bank to a board worked was a proof on text somebody had
 * typed.
 *
 * Its words are now taken out here, on the desk's own machine, by a reader
 * loaded only when a PDF is chosen. Nothing is uploaded and nothing is
 * kept: what travels with the question is the sentences the board's
 * conditions are read against.
 *
 * ── and a scan is still refused, by name ──────────────────────────────────
 *
 * A PDF is a container. One made by printing carries a text layer; one made
 * by a scanner carries a picture of a page. Filling the box with what comes
 * out of a scan — a stamp, a page number — would produce a reading
 * reporting every condition absent, true of those twenty characters and
 * false of the agreement. So it is refused and said to be a scan, while the
 * desk still has the document open and can do something about it.
 */

const READABLE = /\.(txt|md|csv|json|html?|xml|rtf)$/i;
const MIN = 200;

export default function AttachTheContract({
  draft,
  onDraft,
}: {
  draft: { name: string; text: string } | null;
  onDraft: (draft: { name: string; text: string } | null) => void;
}) {
  const { t } = useI18n();
  const chooser = useRef<HTMLInputElement | null>(null);
  const [refused, setRefused] = useState<string | null>(null);
  /* Reading a PDF takes a moment, and a press that looks dead is a press somebody makes twice. */
  const [busy, setBusy] = useState(false);

  async function take(file: File) {
    setRefused(null);

    /*
     * The PDF first, because it is the one that actually arrives. Its
     * reader is a megabyte and is fetched here rather than at the top of
     * the module, so it costs nothing to a member who never attaches one.
     */
    if (/\.pdf$/i.test(file.name)) {
      setBusy(true);
      try {
        onDraft({ name: file.name, text: await wordsFrom(file) });
      } catch (e) {
        /*
         * A scan says it is a scan. Anything else says the file could not
         * be read, by name — the desk still has it open, which nobody does
         * a week later when a scholar wonders why the reading was empty.
         */
        setRefused(
          e instanceof TooFewWords
            ? t('attach.isAScan')
            : `${t('attach.cannotRead')} ${file.name}`,
        );
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!READABLE.test(file.name)) {
      setRefused(`${t('attach.cannotRead')} ${file.name}`);
      return;
    }
    try {
      const text = await file.text();
      if (text.trim().length < MIN) {
        setRefused(t('attach.tooShort'));
        return;
      }
      onDraft({ name: file.name, text });
    } catch {
      setRefused(`${t('attach.cannotRead')} ${file.name}`);
    }
  }

  return (
    <div className="mb-4 rounded-card bg-raised px-4 py-3.5 shadow-ring">
      <div className="mb-1 text-label font-bold uppercase tracking-caps text-muted">
        {t('attach.title')}
      </div>
      <p className="mb-3 max-w-[62ch] text-ui leading-relaxed text-muted">{t('attach.note')}</p>

      {draft ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-ui text-paper">{draft.name}</span>
          <span className="font-mono text-note text-muted">
            {draft.text.length} {t('draftfrom.characters')}
          </span>
          <Button
            type="button"
            onClick={() => {
              onDraft(null);
              setRefused(null);
            }}
            className="text-ui text-muted underline decoration-line underline-offset-4 hover:text-paper"
          >
            {t('attach.remove')}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          onClick={() => chooser.current?.click()}
          disabled={busy}
          aria-busy={busy}
          className="rounded-xl bg-ink/60 px-3.5 py-2 text-ui text-sand shadow-ring transition-colors hover:text-paper"
        >
          {busy ? t('attach.reading') : t('attach.choose')}
        </Button>
      )}

      <input
        ref={chooser}
        type="file"
        hidden
        accept=".pdf,.txt,.md,.csv,.json,.html,.htm,.xml,.rtf"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void take(f);
        }}
      />

      {refused && (
        <p className="mt-2.5 max-w-[62ch] text-ui leading-relaxed text-breach">{refused}</p>
      )}
    </div>
  );
}
