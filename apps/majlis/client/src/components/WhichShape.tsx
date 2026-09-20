import { useEffect, useState } from 'react';
import { oversight, type Library, type Recognition } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Button } from './Button';

/**
 * Which of the board's contract shapes to read a draft against.
 *
 * ── what this replaces ────────────────────────────────────────────────────
 *
 * A screen of its own, reached by leaving the library, which printed all
 * nineteen shapes again as a wall of cards — the same nineteen the library
 * had just listed, in a different arrangement, so that choosing one meant
 * reading the whole library twice. *"otvori stranicu sa onim ugovorima
 * bezveze … i jako ruzna."*
 *
 * It is a list of names and one of them is wanted. That is a dropdown, and
 * it belongs beside the draft rather than a page away from it.
 *
 * ── and the case where nobody can choose ──────────────────────────────────
 *
 * A scholar holding a draft often cannot name its shape — naming it is
 * partly what reading it is for. Asking them to pick blind from nineteen was
 * the first step of the old screen and the step people got stuck on.
 *
 * So the other way through is **compare them all**: the draft is read against
 * every shape the board holds and the ranking comes back with its working —
 * how many of that shape's conditions turn up, and whether the draft names
 * itself. It is the reader already here doing the same job nineteen times,
 * never a second looser matcher, so the suggestion cannot disagree with the
 * reading a scholar gets when they act on it.
 *
 * It suggests. Nothing here decides: a shape at the top of the list is where
 * the most matching words are, which is not the same as being right, and the
 * server's own sentence saying so is shown with the list.
 */
export default function WhichShape({
  value,
  onChange,
  /** The draft as it stands. Comparing needs it; choosing by name does not. */
  text,
}: {
  value: string;
  onChange: (structureId: string) => void;
  text: string;
}) {
  const { t } = useI18n();
  const [library, setLibrary] = useState<Library | null>(null);
  const [ranked, setRanked] = useState<Recognition | null>(null);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    let live = true;
    oversight
      .library()
      .then((r) => live && r && Array.isArray(r.library) && setLibrary(r))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  /*
   * A ranking made against one draft is about that draft. Editing the text
   * and leaving the old list standing would have a scholar choosing a shape
   * on the strength of words that are no longer there.
   */
  useEffect(() => {
    setRanked(null);
  }, [text]);

  const enough = text.trim().length >= 40;

  async function compare() {
    setComparing(true);
    try {
      const r = await oversight.recognise(text);
      if (r && Array.isArray(r.guesses)) setRanked(r);
    } catch {
      // The suggestion is lost and nothing else: the dropdown still works and
      // the draft is still there to read against a shape chosen by name.
    } finally {
      setComparing(false);
    }
  }

  const shapes = library?.library ?? [];

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-[260px] flex-1">
          <span className="mb-1 block text-label font-bold uppercase tracking-caps text-muted">
            {t('which.label')}
          </span>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-card bg-ink px-4 py-3 text-ui text-paper shadow-ring focus:shadow-lift focus:outline-none"
          >
            <option value="">{t('which.pick')}</option>
            {shapes.map((h) => (
              <option key={h.structure.id} value={h.structure.id}>
                {h.structure.name}
                {' — '}
                {t(h.source === 'draft' ? 'adopt.draft' : 'adopt.adopted')}
                {', '}
                {h.structure.conditions.length} {t('check.conditions')}
              </option>
            ))}
          </select>
        </label>

        {/*
          The way through for somebody who cannot name the shape, standing
          beside the dropdown rather than hidden behind it. Disabled until
          there is a draft to compare, and the line underneath says why.
        */}
        <Button
          type="button"
          onClick={compare}
          disabled={!enough || comparing}
          aria-busy={comparing}
          className="rounded-card bg-raised px-4 py-3 text-ui font-semibold text-lapis shadow-ring transition-colors hover:text-paper disabled:opacity-40"
        >
          {comparing ? t('which.comparing') : t('which.compare')}
        </Button>
      </div>

      {!enough && (
        <p className="mt-1.5 max-w-[58ch] text-note leading-relaxed text-muted">
          {t('which.needText')}
        </p>
      )}

      {/*
        The ranking, with its working. Each row says why it is where it is —
        the draft naming itself, or the count of conditions whose words turn
        up — and pressing one sets the dropdown rather than reading straight
        away, so the choice stays the scholar's and stays visible.
      */}
      {ranked && ranked.guesses.length > 0 && (
        <div className="mt-3.5 rounded-card bg-ink px-4 py-3.5 shadow-ring">
          <div className="mb-2 text-label font-bold uppercase tracking-caps text-muted">
            {t('camewith.looksLike')}
          </div>
          <ul className="space-y-1.5">
            {ranked.guesses.map((g) => (
              <li key={g.structureId}>
                <Button
                  type="button"
                  onClick={() => onChange(g.structureId)}
                  className={
                    'flex w-full flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-xl px-3 py-2 text-start transition-all ' +
                    (value === g.structureId
                      ? 'bg-raised font-semibold text-paper shadow-pick'
                      : 'text-sand shadow-ring hover:text-paper')
                  }
                >
                  <span className="text-ui">{g.name}</span>
                  <span className="text-note text-muted">
                    {g.namedInTheDraft ? (
                      <>
                        {t('camewith.namesItself')} “{g.namedInTheDraft}”
                      </>
                    ) : (
                      <>
                        <span className="tabular-nums">{g.found + g.partly}</span>{' '}
                        {t('camewith.ofConditions')}{' '}
                        <span className="tabular-nums">{g.of}</span>
                      </>
                    )}
                  </span>
                </Button>
              </li>
            ))}
          </ul>
          {/* The server's own sentence, so nothing here can soften it. */}
          <p className="mt-2.5 max-w-[62ch] text-note leading-relaxed text-muted">{ranked.note}</p>
        </div>
      )}
    </div>
  );
}
