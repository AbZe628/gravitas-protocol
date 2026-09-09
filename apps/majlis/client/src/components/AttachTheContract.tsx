import { useRef, useState } from 'react';
import { useI18n } from '../lib/i18n.js';

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
 * ── a PDF is the case that matters, and the honest answer is no ───────────
 *
 * A bank's contract is almost always a PDF. Its text sits behind a layer this
 * has no reader for, and a scanned one has no text at all. Filling the box
 * with the bytes would produce a reading reporting every condition absent —
 * true of the rubbish and false of the agreement — so the file is named and
 * refused, with what to send instead.
 *
 * That is worth more than a silent failure: the desk still has the document
 * open and can export it in one step, which nobody can do a week later when a
 * scholar wonders why the reading was empty.
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

  async function take(file: File) {
    setRefused(null);
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
      <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {t('attach.title')}
      </div>
      <p className="mb-3 max-w-[62ch] text-[12.5px] leading-[1.6] text-muted">{t('attach.note')}</p>

      {draft ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[13px] text-paper">{draft.name}</span>
          <span className="font-mono text-[11.5px] text-muted">
            {draft.text.length} {t('draftfrom.characters')}
          </span>
          <button
            type="button"
            onClick={() => {
              onDraft(null);
              setRefused(null);
            }}
            className="text-[12.5px] text-muted underline decoration-line underline-offset-4 hover:text-paper"
          >
            {t('attach.remove')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => chooser.current?.click()}
          className="rounded-xl bg-ink/60 px-3.5 py-2 text-[12.5px] text-sand shadow-ring transition-colors hover:text-paper"
        >
          {t('attach.choose')}
        </button>
      )}

      <input
        ref={chooser}
        type="file"
        hidden
        accept=".txt,.md,.csv,.json,.html,.htm,.xml,.rtf"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void take(f);
        }}
      />

      {refused && (
        <p className="mt-2.5 max-w-[62ch] text-[12.5px] leading-[1.6] text-breach">{refused}</p>
      )}
    </div>
  );
}
