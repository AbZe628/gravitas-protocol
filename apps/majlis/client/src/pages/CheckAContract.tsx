import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { oversight, theWayIn, type Library } from '../lib/api.js';
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
  /*
   * Arriving with the shape already chosen.
   *
   * The contracts screen lists nineteen shapes and the reason a scholar is
   * looking at one is almost always "I have a draft of this kind" — and there
   * was no way to get from there to here carrying that. So every shape in the
   * library now links to `/check?shape=<id>` and lands with the picker already
   * on it, which is the path between the two screens that did not exist.
   *
   * An unknown id is ignored rather than reported: a stale bookmark should
   * open the picker, not an error.
   */
  const [params] = useSearchParams();
  const [pick, setPick] = useState(params.get('shape') ?? '');

  /*
   * Arriving from a question that came with a contract.
   *
   * `?from=<submission>` fetches that question's draft and hands it straight
   * to the reader. Without it the suggestion on the queue landed here with the
   * shape chosen and the box empty, so a scholar who had just been shown the
   * contract had to go back, find it, and paste it in — which is the copying
   * this whole path exists to remove.
   *
   * Its failure costs the text and nothing else: the picker still works and
   * the box can still be filled by hand or from a file.
   */
  const from = params.get('from');
  const [came, setCame] = useState<{ name: string; text: string } | null>(null);

  useEffect(() => {
    if (!from) return;
    let live = true;
    theWayIn
      .one(from)
      .then((r) => {
        const d = r?.submission?.draft;
        if (live && d) setCame({ name: d.name, text: d.text });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [from]);

  /*
   * The answer comes to the finger.
   *
   * Nineteen shapes make a tall picker, so the paste box a choice reveals sits
   * roughly a screen and a half below the card that was pressed. Growing the
   * page there and leaving the reader where they were is indistinguishable
   * from nothing having happened, which is exactly what it was reported as.
   */
  const draft = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    oversight
      .library()
      .then((r) => (r && Array.isArray(r.library) ? setLibrary(r) : setFailed(true)))
      .catch(() => setFailed(true));
  }, []);

  /*
   * After the block exists, not when the choice is made.
   *
   * Keying this on `pick` alone was wrong and measured wrong: arriving with
   * `?shape=` already set, the effect ran on the first render, when the
   * library was still loading and the block it wants to scroll to had not been
   * rendered. The paste box then sat at 1,909px in an 812px viewport — the
   * exact fault this was written to fix, surviving the fix.
   *
   * `library` in the dependencies is what makes it run again once there is
   * something to scroll to.
   */
  useEffect(() => {
    if (!pick || !library || !draft.current) return;
    draft.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [pick, library]);

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

      {/*
        Before the picker, not after it.
        A session that cannot run a reading used to be told so at the very
        bottom of the page — measured at y=1858 for a press at y=488, which is
        1.7 screens below the finger. From where the person was standing,
        choosing a contract did nothing at all. If the answer is no, it is said
        before the choice, not after it.
      */}
      {!mayDeliberate(identity?.role) && (
        <div className="mb-7">
          <Nothing>{t('check.readOnly')}</Nothing>
        </div>
      )}

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
        <div ref={draft}>
          <Division heading={t('check.theText')}>
            {/*
              Keyed on the shape, so choosing another one clears a reading made
              against the previous one. A result left standing under a new
              heading would be a reading of the wrong conditions.
            */}
            <ReadTheContract
              key={chosen.structure.id + (came ? ":" + came.name : "")}
              structureId={chosen.structure.id}
              startWith={came}
              canRead={mayDeliberate(identity?.role)}
            />
          </Division>
        </div>
      )}
    </div>
  );
}
