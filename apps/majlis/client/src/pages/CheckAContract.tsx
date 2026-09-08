import { useEffect, useState } from 'react';
import { oversight, type Library } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { mayDeliberate, useIdentity } from '../lib/identity.js';
import { Division, Nothing, PageHead } from '../components/page.js';
import { ErrorText, Loading } from '../components/ui.js';
import ReadTheContract from '../components/ReadTheContract.js';

/**
 * Here is a contract. Show me where it answers each condition.
 *
 * ── why it has a screen of its own ────────────────────────────────────────
 *
 * The reading existed and could only be reached from inside a matter, which
 * meant a scholar had to decide to deliberate before they could look at a
 * draft. That is backwards: looking at the draft is what tells them whether
 * there is anything to deliberate. It was also the reason the one feature the
 * competing products are actually bought for looked, to anybody opening this,
 * like a feature nobody had built.
 *
 * ── it answers, and it does not rule ──────────────────────────────────────
 *
 * The competing products return *compliant*, *partially compliant*,
 * *non-compliant*. This says where each condition is answered in the text,
 * quotes the sentence, and stops. Whether the arrangement is permissible is a
 * ruling, and a ruling carries a scholar's name — which is why the step after
 * a reading is putting it to the board, and that is offered here.
 *
 * ── against the board's own conditions where it has any ───────────────────
 *
 * The shape is picked from the library, and the library is the board's: where
 * it took a shape up with changes, the changed conditions are what the text is
 * read against. Reading against the shipped draft where the board has adopted
 * its own would be checking a contract against conditions this board does not
 * hold.
 */
export default function CheckAContract() {
  const { t } = useI18n();
  const { identity } = useIdentity();

  const [library, setLibrary] = useState<Library | null>(null);
  const [failed, setFailed] = useState(false);
  const [pick, setPick] = useState('');

  useEffect(() => {
    oversight
      .library()
      .then((r) => (r && Array.isArray(r.library) ? setLibrary(r) : setFailed(true)))
      .catch(() => setFailed(true));
  }, []);

  if (failed) return <ErrorText />;
  if (!library) return <Loading />;

  const shapes = library.library;
  const chosen = shapes.find((h) => h.structure.id === pick) ?? null;

  return (
    <div className="mx-auto max-w-reading px-5 pb-16 pt-6">
      <PageHead
        phase="inforce"
        title={t('check.title')}
        says={t('check.lead')}
      />

      <Division heading={t('check.whichShape')} note={t('check.whichShapeNote')}>
        {shapes.length === 0 ? (
          <Nothing>{t('check.noShapes')}</Nothing>
        ) : (
          <div className="flex flex-wrap gap-2">
            {shapes.map((h) => (
              <button
                key={h.structure.id}
                type="button"
                onClick={() => setPick(h.structure.id)}
                className={
                  'rounded-card px-4 py-2.5 text-start text-[13px] leading-snug transition-all ' +
                  (pick === h.structure.id
                    ? 'bg-raised font-semibold text-paper shadow-card'
                    : 'bg-ink text-sand shadow-ring hover:text-paper')
                }
              >
                {h.structure.name}
                {/*
                  Whose conditions these are. A reading against the shipped
                  draft and one against the board's own version are different
                  answers, and the difference has to be visible before the
                  reading rather than explained after it.
                */}
                <span className="mt-0.5 block text-[11px] font-normal text-muted">
                  {t(h.source === 'draft' ? 'adopt.draft' : 'adopt.adopted')}
                  <span className="mx-1.5 opacity-40">·</span>
                  {h.structure.conditions.length} {t('check.conditions')}
                </span>
              </button>
            ))}
          </div>
        )}
      </Division>

      {chosen && (
        <Division heading={t('check.theText')}>
          {/*
            Keyed on the shape, so choosing another one clears a reading made
            against the previous one. A result left standing under a new
            heading would be a reading of the wrong conditions.
          */}
          <ReadTheContract
            key={chosen.structure.id}
            structureId={chosen.structure.id}
            canRead={mayDeliberate(identity?.role)}
          />
          {!mayDeliberate(identity?.role) && <Nothing>{t('check.readOnly')}</Nothing>}
        </Division>
      )}
    </div>
  );
}
