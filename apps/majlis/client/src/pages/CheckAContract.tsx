import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { theWayIn } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { mayDeliberate, useIdentity } from '../lib/identity.js';
import { Division, Nothing, PageHead } from '../components/page.js';
import ReadTheContract from '../components/ReadTheContract.js';

/**
 * Here is a contract. Show me where it answers each condition.
 *
 * ── what this page is now ─────────────────────────────────────────────────
 *
 * The same reading the library offers, at an address, for the links that
 * arrive carrying something: a shape already chosen, or a question with a
 * draft attached. It is a wrapper and deliberately nothing more.
 *
 * It used to be a screen of its own that reprinted all nineteen shapes as a
 * wall of cards before anything could be typed — the same nineteen the
 * library lists, in a second arrangement, so choosing one meant reading the
 * library twice. Two ways to do one thing is how one of them ends up weaker,
 * and this was the weaker one. The choosing is a dropdown now and it lives
 * beside the draft.
 *
 * ── it answers, and it does not rule ──────────────────────────────────────
 *
 * The competing products return *compliant*, *partially compliant*,
 * *non-compliant*. This says where each condition is answered in the text,
 * quotes the sentence, and stops. Whether the arrangement is permissible is a
 * ruling, and a ruling carries a scholar's name.
 */
export default function CheckAContract() {
  const { t } = useI18n();
  const { identity } = useIdentity();
  const [params] = useSearchParams();

  /*
   * Arriving with the shape already chosen.
   *
   * Every shape in the library links to `/check?shape=<id>`, and the queue's
   * suggestions do too. An unknown id is ignored rather than reported: a
   * stale bookmark should open the picker, not an error.
   */
  const shape = params.get('shape') ?? undefined;

  /*
   * Arriving from a question that came with a contract.
   *
   * `?from=<submission>` fetches that question's draft and hands it straight
   * to the reader. Without it the suggestion on the queue landed here with
   * the shape chosen and the box empty, so a scholar who had just been shown
   * the contract had to go back, find it, and paste it in — which is the
   * copying this whole path exists to remove.
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

  return (
    <div className="mx-auto max-w-reading px-5 pb-16 pt-6">
      <PageHead phase="inforce" title={t('check.title')} says={t('check.lead')} />

      {/*
        Before the reader, not after it. A session that cannot run a reading
        used to be told so at the very bottom of the page — 1.7 screens below
        the finger — so from where the person was standing, choosing a
        contract did nothing at all.
      */}
      {!mayDeliberate(identity?.role) && (
        <div className="mb-7">
          <Nothing>{t('check.readOnly')}</Nothing>
        </div>
      )}

      <Division heading={t('check.theText')}>
        {/*
          Keyed on what it arrived carrying, so a different link lands on a
          fresh reader rather than on the previous draft's result.
        */}
        <ReadTheContract
          onItsOwnScreen
          key={(shape ?? '') + (came ? ':' + came.name : '')}
          structureId={shape}
          startWith={came}
          canRead={mayDeliberate(identity?.role)}
        />
      </Division>
    </div>
  );
}
