import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { governance, oversight, type AssetDetail as Detail } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { DateText, ErrorText, Loading, Section, Tag } from '../components/ui.js';
import { mayDeliberate, useIdentity } from '../lib/identity.js';
import { DriftForAsset } from '../components/Drift.js';
import { DocumentLink } from '../components/Documents.js';
import Recorded from '../components/Recorded.js';
import { ActionPanel, Facts, RecordPage } from '../components/shapes.js';
import HowThisIsHeld from '../components/HowThisIsHeld.js';
import { Field, HEADING } from '../components/field.js';

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
  const [retiring, setRetiring] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    oversight
      .asset(id)
      .then((r) =>
        r &&
        r.asset &&
        Array.isArray(r.asset.identifiers) &&
        Array.isArray(r.history) &&
        Array.isArray(r.openMatters)
          ? setData(r)
          : setFailed(true),
      )
      .catch(() => setFailed(true));
  }, [id]);

  if (failed) return <ErrorText />;
  if (!data) return <Loading />;

  const a = data.asset;
  const canRaise = mayDeliberate(identity?.role) && !a.retiredAt;

  /**
   * Withdraw it from the universe.
   *
   * Retired, never deleted: a holding that is gone still has a history the
   * board is answerable for. The page reloads rather than patching its own
   * copy, so what a reader sees afterwards is what the record says.
   */
  async function retire(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setRefusal(null);
    try {
      await oversight.retireAsset(a.id, reason.trim());
      const fresh = await oversight.asset(a.id);
      setRetiring(false);
      setReason('');
      setData(fresh);
    } catch (error) {
      setRefusal(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

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

  /*
   * No stage bar on a holding.
   *
   * The other records have one because their stages are a sequence: a matter
   * is opened, read, argued, voted, and comes into force in that order. A
   * holding's standing is not a line. It can be permitted or restricted from
   * the same starting point, and it can be retired from anywhere. Drawing it
   * as a track would claim an order the record does not have.
   */
  const aside = (
    <>
      {canRaise ? (
        <ActionPanel
          next={t('reg.putToTheBoardNext')}
          whose={t('passage.whose.board')}
          /*
            Retiring is folded away rather than offered beside the act.
            It is the rarer thing by far, it is not what the board is
            waiting for, and a control that removes a holding from the
            universe should take one more press than the one that puts
            it to the board.
          */
          more={
            <div>
              {!retiring ? (
                <button
                  type="button"
                  onClick={() => setRetiring(true)}
                  className="text-start text-[12.5px] text-breach underline decoration-line underline-offset-4"
                >
                  {t('reg.retire')}
                </button>
              ) : (
                <form onSubmit={retire}>
                  <p className="mb-2 text-[11.5px] leading-[1.6] text-muted">
                    {t('reg.retireLead')}
                  </p>
                  <Field label={t('reg.retireWhy')} headingClass={HEADING}>
                    {(attrs) => (
                      <textarea
                        {...attrs}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl bg-raised px-3 py-2 text-[12.5px] shadow-ring outline-none"
                        required
                      />
                    )}
                  </Field>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      disabled={busy || reason.trim().length === 0}
                      className="rounded-xl bg-raised px-3.5 py-2 text-[12.5px] font-medium text-breach shadow-[0_0_0_0.5px_rgba(154,56,48,0.25)] disabled:opacity-40"
                    >
                      {t('reg.retireIt')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRetiring(false)}
                      className="text-[12px] text-muted"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          }
        >
          <button
            onClick={putToTheBoard}
            disabled={busy}
            className="w-full rounded-xl bg-lapis px-4 py-2.5 text-[13px] font-semibold text-white shadow-act disabled:opacity-50"
          >
            {t('reg.putToTheBoard')}
          </button>
          {refusal && <p className="mt-2.5 text-[12.5px] text-breach">{refusal}</p>}
        </ActionPanel>
      ) : null}

      <Facts
        rows={[
          { label: t('reg.kindLabel'), value: t(`reg.kind.${a.kind}`) },
          { label: t('reg.statusLabel'), value: t(`reg.status.${data.status}`) },
        ]}
      />

      {/*
        The page an auditor is handed. It is a link rather than a fetch: the
        browser opens it as a tab the reader can save as a PDF, which is what
        a scholar actually wants.
      */}
      <div className="mt-3.5">
        <DocumentLink
          href={oversight.hrefs.holding(a.id)}
          label={t('doc.holding')}
          note={t('doc.holdingNote')}
        />
      </div>
    </>
  );

  return (
    <RecordPage
      phase="inforce"
      title={a.name}
      states={
        <>
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
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
            {t(`reg.kind.${a.kind}`)}
          </span>
        </>
      }
      aside={aside}
    >
      <p className="mb-7 max-w-[62ch] text-[13.5px] leading-[1.65] text-muted">{data.note}</p>

      {/*
        Above the composition it concerns, so a reader looking at 50.00% sees at
        once what the board set rather than assembling it from two places.
      */}
      {/*
        How it is held, above the drift it explains. Whether a breach is
        refused at the transaction or found at the next review is the first
        thing a reader of the figures below needs to know.
      */}
      <HowThisIsHeld asset={a} />

      <DriftForAsset assetId={a.id} />

      <Section title={t('reg.identifiers')}>
        <ul className="space-y-1.5">
          {a.identifiers.map((i, n) => (
            <li key={n} className="text-[13px]">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">{i.scheme}</span>
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
                (data.composition.incomplete ? 'text-breach' : 'text-muted')
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
                  className="flex items-baseline gap-2 rounded-card shadow-[0_0_0_0.5px_rgba(176,132,48,0.24)] px-3 py-2 text-[13px]"
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
                  className="flex items-baseline gap-2 rounded-card shadow-ring px-3 py-2 text-[13px] hover:text-paper"
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
        <div className="mt-6 rounded-card shadow-ring px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">{t('reg.retired')}</div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
            <DateText iso={a.retiredAt} />
            {a.retiredReason ? <> — {a.retiredReason}</> : null}
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-muted">{t('reg.retiredNote')}</p>
        </div>
      )}
    </RecordPage>
  );
}
