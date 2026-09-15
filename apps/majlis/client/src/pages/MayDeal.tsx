import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  api,
  oversight,
  type AssetStanding,
  type AssetStatus,
  type Matter,
  type Register as RegisterData,
} from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Division, Nothing } from '../components/page.js';
import { ListPage, Row, Rows } from '../components/shapes.js';
import { State, type Tone } from '../components/kit.js';
import { ErrorText, Loading } from '../components/ui.js';

/**
 * What this desk may deal in, and on what condition.
 *
 * ── the promise this keeps ────────────────────────────────────────────────
 *
 * *Wherever someone in the bank has to choose an instrument, the choice is a
 * list taken from the register and filtered to what is in force at that
 * moment. It is not a free text field and it is not a list kept by hand.*
 *
 * The register has always held this and the board has always been able to read
 * it. The desk could not: its three doors were the question it puts, the
 * rulings that bind it, and what it owes. Which instruments it may actually
 * deal in — the thing somebody at a terminal asks twenty times a day — was on
 * the board's side of the building.
 *
 * ── the last group is the point ───────────────────────────────────────────
 *
 * A list showing only what is permitted and what is restricted lets a desk
 * read silence as approval. An instrument the board has never been asked about
 * is **not permitted and not forbidden**, and it is named as such, in its own
 * group, with that sentence under the heading. A desk that wants to deal in
 * one knows to ask rather than to assume.
 *
 * ── and the condition travels with it ─────────────────────────────────────
 *
 * A standing on its own is half an answer. *Permitted* means permitted on the
 * terms the board set, so the terms are on the row: the board's own sentence
 * for each, not this screen's summary of it, and not a figure converted into
 * some other unit on the way.
 */

/** In force first, then what is held up, then what nobody has asked about. */
const ORDER: AssetStatus[] = [
  'permitted',
  'under_consideration',
  'restricted',
  'lapsed',
  'never_examined',
  'retired',
];

function toneFor(status: AssetStatus): Tone {
  if (status === 'restricted' || status === 'lapsed') return 'breach';
  if (status === 'under_consideration') return 'attention';
  if (status === 'permitted') return 'settled';
  return 'plain';
}

export default function MayDeal() {
  const { t } = useI18n();
  const [data, setData] = useState<RegisterData | null>(null);
  const [failed, setFailed] = useState(false);

  /*
   * The rulings the register points at, so a row can carry the terms.
   *
   * Only the ones actually named by a holding are fetched, and a failure on
   * any of them costs that row its terms rather than the screen. A desk that
   * can see what it may deal in but not on what condition is still better off
   * than a desk looking at nothing.
   */
  const [rulings, setRulings] = useState<Map<string, Matter>>(new Map());

  useEffect(() => {
    let live = true;
    oversight
      .register()
      .then(async (r) => {
        if (!live) return;
        setData(r);

        const ids = [...new Set(r.assets.map((a) => a.governedBy).filter(Boolean))] as string[];
        const got = await Promise.all(ids.map((id) => api.matter(id).catch(() => null)));
        if (!live) return;
        setRulings(new Map(got.filter(Boolean).map((m) => [(m as Matter).id, m as Matter])));
      })
      .catch(() => setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  if (failed) return <ErrorText />;
  if (!data) return <Loading />;

  const assets = Array.isArray(data.assets) ? data.assets : [];
  const grouped = ORDER.map((band) => ({
    band,
    items: assets.filter((a) => a.status === band),
  })).filter((g) => g.items.length > 0);

  const permitted = assets.filter((a) => a.status === 'permitted').length;
  const unasked = assets.filter((a) => a.status === 'never_examined').length;

  /** One instrument, with the ruling behind it and the terms it carries. */
  function instrument(s: AssetStanding) {
    const ruling = s.governedBy ? rulings.get(s.governedBy) : null;
    const terms = ruling?.proposedRule?.parameters ?? [];

    return (
      <Row
        key={s.asset.id}
        to={`/register/${s.asset.id}`}
        phase="bindsme"
        kind={t(`reg.kind.${s.asset.kind}`)}
        title={s.asset.name}
        note={
          <>
            {s.asset.identifiers.map((id, i) => (
              <span key={i} className="me-3 break-all font-mono text-note">
                {id.value}
                {id.network ? <span className="opacity-60"> · {id.network}</span> : null}
              </span>
            ))}

            {/*
              The board's own sentence for each term, unconverted. A ratio the
              board set in basis points stays in basis points: restating it
              here would be this screen doing arithmetic on a binding term.
            */}
            {terms.length > 0 && (
              <span className="mt-1 block">
                <span className="text-label font-bold uppercase tracking-caps text-muted">
                  {t('deal.onConditionThat')}
                </span>
                {terms.map((p) => (
                  <span key={p.key} className="mt-0.5 block text-note leading-relaxed">
                    {p.meaning}
                  </span>
                ))}
              </span>
            )}

            {s.governedBy && (
              <Link
                to={`/matters/${s.governedBy}`}
                className="mt-1 inline-block font-mono text-note text-lapis underline decoration-line underline-offset-4"
              >
                {t('deal.under')} {s.governedBy}
              </Link>
            )}
          </>
        }
        standing={<State tone={toneFor(s.status)}>{t(`reg.status.${s.status}`)}</State>}
      />
    );
  }

  return (
    <ListPage
      phase="bindsme"
      title={t('deal.title')}
      says={t('deal.says')}
      live={
        assets.length > 0 ? (
          <span className="text-ui text-muted">
            <span className="font-mono tabular-nums text-paper">{permitted}</span>{' '}
            <span>{t('deal.permittedCount')}</span>
            {unasked > 0 && (
              <>
                <span className="mx-2 opacity-40">·</span>
                <span className="font-mono tabular-nums text-paper">{unasked}</span>{' '}
                <span>{t('deal.unaskedCount')}</span>
              </>
            )}
          </span>
        ) : undefined
      }
      limits={t('deal.limits')}
    >
      {assets.length === 0 ? (
        <Nothing>{t('deal.none')}</Nothing>
      ) : (
        grouped.map((g) => (
          <Division
            key={g.band}
            heading={`${t(`reg.status.${g.band}`)} · ${g.items.length}`}
            /*
              The group that stops silence reading as approval. Its sentence is
              under its own heading rather than in a footnote, because a desk
              scanning for an instrument reads the heading it lands under and
              nothing else.
            */
            note={g.band === 'never_examined' ? t('deal.neverAsked') : undefined}
          >
            <Rows>{g.items.map(instrument)}</Rows>
          </Division>
        ))
      )}
    </ListPage>
  );
}
