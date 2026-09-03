import { useEffect, useState } from 'react';
import { oversight, Refused, type Checklist as ChecklistData, type ConditionState, type Structure } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Tag } from './ui.js';

/**
 * The conditions of a contract shape, ruled on one at a time.
 *
 * This is the compression argument applied to a single product. A board that
 * has to compose the question spends its time on the question; a board handed
 * the shape it recognises spends its time on the judgement.
 *
 * ── three things this must not become ─────────────────────────────────────
 *
 * **A tick list.** Every finding takes a written reason, in all three
 * directions, and the form will not submit without one. A checklist of ticks
 * produces a document full of agreement nobody can review, which is worse than
 * no checklist because it looks like scrutiny.
 *
 * **A score.** It shows how many conditions have been answered and how many
 * have not, and nothing else. There is no bar, no percentage and no colour that
 * tracks toward approval — deciding from six met conditions that a product is
 * permissible is the ruling this is built not to make.
 *
 * **A resolution of disagreement.** Where two members read one condition
 * differently the panel says so and leaves it. That is the work, not a fault.
 */

const HOLDS = ['met', 'not_met', 'not_applicable'] as const;

function toneFor(holds: string | undefined): 'ok' | 'warn' | undefined {
  if (holds === 'met') return 'ok';
  if (holds === 'not_met') return 'warn';
  return undefined;
}

function Condition({
  state,
  contested,
  canRule,
  onRecord,
}: {
  state: ConditionState;
  contested: boolean;
  canRule: boolean;
  onRecord: (holds: (typeof HOLDS)[number], reason: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [holds, setHolds] = useState<(typeof HOLDS)[number] | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  const c = state.condition;
  const mine = state.finding;

  async function submit() {
    if (!holds || busy) return;
    setBusy(true);
    setRefusal(null);
    try {
      await onRecord(holds, reason);
      setOpen(false);
      setHolds(null);
      setReason('');
    } catch (error) {
      setRefusal(error instanceof Refused ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li
      className={
        'rounded-lg border px-4 py-3 ' +
        (contested ? 'border-gold/50 bg-gold/[0.04]' : mine ? 'border-line' : 'border-line/60')
      }
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        {mine ? (
          <Tag tone={toneFor(mine.holds)}>{t(`chk.${mine.holds}`)}</Tag>
        ) : (
          <Tag>{t('chk.unanswered')}</Tag>
        )}
        {contested && <Tag tone="gold">{t('chk.contested')}</Tag>}
        <span className="text-[11px] uppercase tracking-wider text-muted">
          {t(`chk.evidence.${c.evidence}`)}
        </span>
      </div>

      <p className="text-[14px] leading-relaxed">{c.requirement}</p>

      {/*
        The reason the condition exists, so a scholar can disagree with the
        reasoning rather than only with the citation.
      */}
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{c.why}</p>
      <p className="mt-1 text-[11px] text-muted opacity-70">{c.authority}</p>

      {state.history.length > 0 && (
        <details className="mt-2.5">
          <summary className="cursor-pointer text-[12px] text-muted hover:text-paper">
            {state.answeredBy.length} {t('chk.answeredBy')}
          </summary>
          <ul className="mt-2 space-y-2">
            {state.history.map((f, i) => (
              <li
                key={i}
                className={'border-l-2 pl-3 ' + (f.supersededAt ? 'border-line/50 opacity-60' : 'border-line')}
              >
                <div className="text-[12px]">
                  <span className={f.holds === 'not_met' ? 'text-warn' : ''}>{t(`chk.${f.holds}`)}</span>
                  <span className="mx-1.5 opacity-40">·</span>
                  <span className="text-muted">{f.scholarId}</span>
                  {f.supersededAt && (
                    <>
                      <span className="mx-1.5 opacity-40">·</span>
                      <span className="text-muted">{t('chk.superseded')}</span>
                    </>
                  )}
                </div>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{f.reason}</p>
              </li>
            ))}
          </ul>
        </details>
      )}

      {canRule && (
        <div className="mt-3">
          {open ? (
            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                {HOLDS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHolds(h)}
                    className={
                      'rounded border px-3 py-1.5 text-[12px] ' +
                      (holds === h ? 'border-goldsoft text-goldsoft' : 'border-line text-muted hover:border-muted')
                    }
                  >
                    {t(`chk.${h}`)}
                  </button>
                ))}
              </div>

              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('chk.reasonHint')}
                className="mb-2 h-20 w-full rounded border border-line bg-transparent px-3 py-2 text-[13.5px]"
              />

              {refusal && <p className="mb-2 text-[12.5px] leading-relaxed text-warn">{refusal}</p>}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={submit}
                  disabled={!holds || busy}
                  className="rounded border border-gold/60 px-3 py-1.5 text-[12.5px] text-goldsoft disabled:opacity-40"
                >
                  {t('chk.record')}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded border border-line px-3 py-1.5 text-[12.5px] text-muted"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded border border-line px-3 py-1.5 text-[12.5px] text-muted hover:border-muted"
            >
              {mine ? t('chk.changeFinding') : t('chk.recordFinding')}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export default function Checklist({ matterId, canRule }: { matterId: string; canRule: boolean }) {
  const { t } = useI18n();
  const [data, setData] = useState<ChecklistData | null>(null);
  const [structures, setStructures] = useState<Structure[] | null>(null);
  const [none, setNone] = useState(false);

  const load = () =>
    oversight
      .checklist(matterId)
      .then((c) => {
        // A response that is not the shape this expects is treated the same as
        // no shape at all. A panel is not worth taking the matter page down
        // for, and a page that crashes on an unexpected payload takes the
        // deliberation and the vote with it.
        if (!c || !c.structure || !Array.isArray(c.conditions)) {
          setData(null);
          setNone(true);
          return;
        }
        setData(c);
        setNone(false);
      })
      .catch(() => {
        // Not being judged against a shape is a state, not a failure.
        setData(null);
        setNone(true);
      });

  useEffect(() => {
    void load();
    oversight
      .structures()
      .then((s) => setStructures(s.structures))
      .catch(() => setStructures(null));
  }, [matterId]);

  async function choose(structureId: string) {
    await oversight.setStructure(matterId, structureId);
    await load();
  }

  if (none) {
    return (
      <div>
        <p className="mb-3 text-[13px] leading-relaxed text-muted">{t('chk.noShape')}</p>
        {canRule && structures && (
          <div className="flex flex-wrap gap-2">
            {structures.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => choose(s.id)}
                className="rounded border border-line px-3 py-1.5 text-[12.5px] text-muted hover:border-muted"
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <div className="mb-1 text-[14px] font-medium">{data.structure.name}</div>
      <p className="mb-3 text-[12px] text-muted">{data.structure.authority}</p>

      {/*
        A count, not a score. No bar and no percentage: a figure that filled up
        toward approval would be the interface forming a view.
      */}
      <p className="mb-4 text-[13px]">
        <span className="tabular-nums font-medium">
          {data.answered} {t('reg.of')} {data.total}
        </span>{' '}
        <span className="text-muted">{t('chk.answered')}</span>
        {data.contested.length > 0 && (
          <>
            <span className="mx-1.5 opacity-40">·</span>
            <span className="text-goldsoft">
              {data.contested.length} {t('chk.contestedCount')}
            </span>
          </>
        )}
      </p>

      <ul className="space-y-2.5">
        {data.conditions.map((c) => (
          <Condition
            key={c.condition.id}
            state={c}
            contested={data.contested.includes(c.condition.id)}
            canRule={canRule}
            onRecord={async (holds, reason) => {
              await oversight.recordFinding(matterId, { conditionId: c.condition.id, holds, reason });
              await load();
            }}
          />
        ))}
      </ul>

      <p className="mt-4 rounded border border-line bg-surface/60 px-3 py-2.5 text-[12.5px] leading-relaxed text-muted">
        {data.note}
      </p>
    </div>
  );
}
