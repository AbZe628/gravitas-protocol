import { useEffect, useRef, useState } from 'react';
import { api, oversight, type MatterSummary } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';

/**
 * Three ways to get a contract into the reader, only one of which existed.
 *
 * ── the fault ─────────────────────────────────────────────────────────────
 *
 * The reader was a single empty box and the instruction *paste a draft*. A
 * scholar with a contract has it as a file, or the board has already
 * assembled one from its own ruling — and neither could be used. The only
 * supported way to check a contract was to open it somewhere else, select all
 * of it, and paste. That is the whole of *"mora se kopirati neki sadrzaj, gdje
 * su opcije da preuzima odmah ugovore, uploadei"*.
 *
 * ── what it offers ────────────────────────────────────────────────────────
 *
 * **A file from this computer.** Read in the browser, never uploaded. That
 * matters twice over: a draft contract is confidential and this way it does
 * not leave the machine, and it works on an installation with no mounted
 * volume, which is every installation by default.
 *
 * A file whose text cannot be read in the browser says so, by name, rather
 * than putting bytes in the box. A PDF is the common case: its text layer
 * needs a reader this does not have, and a scan has no text at all. Saying
 * *this is a PDF and I cannot read it here* is a better answer than filling
 * the box with rubbish and reading the conditions against it.
 *
 * **A draft the board already assembled.** Where a matter of this board
 * carried and produced one, it is offered by name. This is the case the
 * application was built for and could not reach: the board rules, a draft
 * follows from the ruling, and checking that draft against the conditions it
 * came from is the loop closing.
 *
 * **Typing or pasting**, which is what there was.
 */

const READABLE = /\.(txt|md|csv|json|html?|xml)$/i;

export default function WhereTheDraftComesFrom({
  structureId,
  onText,
}: {
  /** Only drafts from matters that used this shape are offered. */
  structureId?: string;
  onText: (text: string, from: string) => void;
}) {
  const { t } = useI18n();
  const chooser = useRef<HTMLInputElement | null>(null);
  const [drafts, setDrafts] = useState<{ id: string; title: string }[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /*
   * Which matters of this board have a draft to take.
   *
   * A draft is assembled from a ruling, so only a matter that carried has one.
   * The route answers 409 for anything else, in its own words, and asking it
   * per matter is how this list stays honest rather than guessing from status.
   */
  useEffect(() => {
    let live = true;
    api
      .matters()
      .then(async (all: MatterSummary[]) => {
        const settled = Array.isArray(all) ? all.filter((m) => m.status === 'in_force') : [];
        const found: { id: string; title: string }[] = [];
        for (const m of settled) {
          try {
            const res = await fetch(oversight.hrefs.contract(m.id), { method: 'HEAD' });
            if (res.ok) found.push({ id: m.id, title: m.title });
          } catch {
            // A draft that cannot be reached is simply not offered.
          }
        }
        if (live) setDrafts(found);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [structureId]);

  async function takeFile(file: File) {
    setNote(null);
    if (!READABLE.test(file.name)) {
      setNote(t('draftfrom.cannotRead') + ' ' + file.name);
      return;
    }
    setBusy(true);
    try {
      const text = await file.text();
      if (text.trim().length < 40) {
        setNote(t('draftfrom.tooShort'));
        return;
      }
      onText(text, file.name);
    } catch {
      setNote(t('draftfrom.cannotRead') + ' ' + file.name);
    } finally {
      setBusy(false);
    }
  }

  async function takeDraft(id: string, title: string) {
    setNote(null);
    setBusy(true);
    try {
      const res = await fetch(oversight.hrefs.contract(id));
      const html = await res.text();
      // The draft is a printable page; the reader wants its words.
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const text = (doc.body?.innerText || doc.body?.textContent || '').trim();
      if (text.length < 40) {
        setNote(t('draftfrom.tooShort'));
        return;
      }
      onText(text, title);
    } catch {
      setNote(t('draftfrom.draftFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4 rounded-card bg-raised px-4 py-3.5 shadow-ring">
      <div className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {t('draftfrom.title')}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => chooser.current?.click()}
          className="rounded-xl bg-ink/60 px-3.5 py-2 text-[12.5px] text-sand shadow-ring transition-colors hover:text-paper disabled:opacity-50"
        >
          {t('draftfrom.file')}
        </button>
        <input
          ref={chooser}
          type="file"
          hidden
          accept=".txt,.md,.csv,.json,.html,.htm,.xml"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void takeFile(f);
          }}
        />

        {drafts.map((d) => (
          <button
            key={d.id}
            type="button"
            disabled={busy}
            onClick={() => void takeDraft(d.id, d.title)}
            className="max-w-[30ch] truncate rounded-xl bg-ink/60 px-3.5 py-2 text-[12.5px] text-sand shadow-ring transition-colors hover:text-paper disabled:opacity-50"
          >
            {t('draftfrom.ours')} {d.title}
          </button>
        ))}
      </div>

      <p className="mt-2.5 text-[11.5px] leading-[1.6] text-muted">{t('draftfrom.note')}</p>
      {note && <p className="mt-2 text-[12.5px] leading-[1.6] text-breach">{note}</p>}
    </div>
  );
}
