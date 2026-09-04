import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { governance, oversight, type AssetDetail as Detail } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { DateText, ErrorText, Loading, Section, Tag } from '../components/ui.js';
import { mayDeliberate, useIdentity } from '../lib/identity.js';
import { DriftForAsset } from '../components/Drift.js';
import Recorded from '../components/Recorded.js';

/**
 * One holding: where it stands, what the board has said about it, what it is
 * made of — and the one action that matters, which is putting it to the board.
 *
 * **Judging is one click.** The matter opens already naming this asset, with
 * the question written from what the register knows, rather than from an empty
 * box a scholar has to compose into. That link is what makes the fatwa and the
 * registry entry refer to the same object instead of to two hand-typed strings.
 *
 * The composition is read out and never concluded from. Parts that do not sum
 * to a hundred are shown as supplied with the shortfall stated, because a
 * proportion nobody supplied is not one the board can rule on.
 */

export default function AssetDetail() {
  const { id = '' } = useParams();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { identity } = useIdentity();

  const [data, setData] = useState<Detail | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  useEffect(() => {
    oversight
      .asset(id)
      .then(setData)
      .catch(() => setFailed(true));
  }, [id]);

  if (failed) return <ErrorText />;
  if (!data) return <Loading />;

  const a = data.asset;
  const canRaise = mayDeliberate(identity?.role) && !a.retiredAt;

  /**
   * Open a matter that already knows what it is about.
   *
   * The direction is not chosen here. It is the one field a proposer must think
   * about — permitting is slow and restricting is fast, and choosing "restrict"
   * to move faster is a misunderstanding — so the matter opens as a draft and
   * the proposer sets it on the matter itself.
   */
  async function putToTheBoard() {
    if (busy) return;
    setBusy(true);
    setRefusal(null);
    try {
      const created = await governance.openMatter({
        boardId: 'demo-board',
        title: `${t('reg.raiseTitle')} ${a.name}`,
        proposal: t('reg.raiseProposal'),
        direction: 'permit',
        origin: 'institution_request',
        assetIds: [a.id],
      });
      navigate(`/matters/${created.id}`);
    } catch (error) {
      setRefusal(error instanceof Error ? error.message : String(error));
      setBusy(false);
    }
  }

  return (
    <article>
      <Link to="/register" className="mb-4 inline-block text-[13px] text-muted hover:text-paper">
        ← {t('reg.title')}
      </Link>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Tag
          tone={
            data.status === 'restricted' || data.status === 'lapsed'
              ? 'warn'
              : data.status === 'never_examined'
                ? 'gold'
                : data.status === 'permitted'
                  ? 'ok'
                  : undefined
          }
        >
          {t(`reg.status.${data.status}`)}
        </Tag>
        <span className="text-[11px] uppercase tracking-wider text-muted">
          {t(`reg.kind.${a.kind}`)}
        </span>
      </div>

      <h1 className="mb-2 text-[21px] font-semibold leading-tight">{a.name}</h1>
      <p className="mb-5 text-[13px] leading-relaxed text-muted">{data.note}</p>

      {refusal && (
        <div className="mb-5 rounded-lg border border-warn/60 bg-warn/[0.06] px-4 py-3 text-[13px] leading-relaxed text-warn">
          {refusal}
        </div>
      )}

      {/*
        Above the composition it concerns, so a reader looking at 50.00% sees at
        once what the board set rather than assembling it from two places.
      */}
      <DriftForAsset assetId={a.id} />

      {canRaise && (
        <button
          onClick={putToTheBoard}
          disabled={busy}
          className="mb-7 rounded border border-gold/60 px-4 py-2 text-[13px] text-goldsoft disabled:opacity-50"
        >
          {t('reg.putToTheBoard')}
        </button>
      )}

      <Section title={t('reg.identifiers')}>
        <ul className="space-y-1.5">
          {a.identifiers.map((i, n) => (
            <li key={n} className="text-[13px]">
              <span className="text-[11px] uppercase tracking-wider text-muted">{i.scheme}</span>
              <span className="mx-2 font-mono break-all">{i.value}</span>
              {i.network && <span className="text-[12px] text-muted">{i.network}</span>}
            </li>
          ))}
        </ul>
        <p className="mt-2.5 text-[12px] leading-relaxed text-muted">
          {t(`reg.source.${a.source}`)}
          <span className="mx-1.5 opacity-40">·</span>
          <DateText iso={a.addedAt} />
          {a.addedBy ? <> · {a.addedBy}</> : null}
        </p>
      </Section>

      {/*
        Read out, never concluded from. The percentages are facts about what the
        holding contains; whether they make it permissible is a ruling.
      */}
      <Section title={t('reg.composition')}>
        {data.composition ? (
          <>
            <ul className="mb-3 space-y-1.5">
              {data.composition.byKind.map((k) => (
                <li key={k.kind} className="flex items-baseline justify-between gap-3 text-[13.5px]">
                  <span>{t(`reg.part.${k.kind}`)}</span>
                  <span className="font-mono tabular-nums">{k.percent}%</span>
                </li>
              ))}
            </ul>

            <details className="mb-3">
              <summary className="cursor-pointer text-[12px] text-muted hover:text-paper">
                {t('reg.everyPart')}
              </summary>
              <ul className="mt-2 space-y-1">
                {data.composition.parts.map((p, n) => (
                  <li key={n} className="flex items-baseline justify-between gap-3 text-[12.5px] text-muted">
                    <span>{p.label}</span>
                    <span className="font-mono tabular-nums">{p.percent}%</span>
                  </li>
                ))}
              </ul>
            </details>

            <p
              className={
                'text-[12px] leading-relaxed ' +
                (data.composition.incomplete ? 'text-warn' : 'text-muted')
              }
            >
              {data.composition.note}
            </p>
          </>
        ) : (
          <p className="text-[13px] text-muted">{t('reg.noComposition')}</p>
        )}
      </Section>

      <Section title={t('reg.whatTheBoardSaid')}>
        {data.openMatters.length === 0 && data.history.length === 0 ? (
          <p className="text-[13px] text-muted">{t('reg.nothingSaid')}</p>
        ) : (
          <ul className="space-y-2">
            {data.openMatters.map((m) => (
              <li key={m}>
                <Link
                  to={`/matters/${m}`}
                  className="flex items-baseline gap-2 rounded-lg border border-gold/40 px-3 py-2 text-[13px] hover:border-gold/70"
                >
                  <Tag tone="gold">{t('reg.open')}</Tag>
                  <span className="font-mono text-[12px] break-all">{m}</span>
                </Link>
              </li>
            ))}
            {data.history.map((m) => (
              <li key={m}>
                <Link
                  to={`/matters/${m}`}
                  className="flex items-baseline gap-2 rounded-lg border border-line px-3 py-2 text-[13px] hover:border-muted"
                >
                  {m === data.governedBy && <Tag>{t('reg.governs')}</Tag>}
                  <span className="font-mono text-[12px] break-all">{m}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/*
        What has been worked out on this holding, and when. A scholar looking
        at a holding is the reader most likely to want last period's
        purification, and having to go to another page to find it is how a
        figure gets computed twice.
      */}
      <Section title={t('reg.calculations')}>
        <Recorded assetId={a.id} />
      </Section>

      {a.retiredAt && (
        <div className="mt-6 rounded-lg border border-line px-4 py-3">
          <div className="text-[11px] uppercase tracking-wider text-muted">{t('reg.retired')}</div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
            <DateText iso={a.retiredAt} />
            {a.retiredReason ? <> — {a.retiredReason}</> : null}
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-muted">{t('reg.retiredNote')}</p>
        </div>
      )}
    </article>
  );
}
