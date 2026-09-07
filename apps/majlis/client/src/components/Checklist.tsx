import { useEffect, useState } from 'react';
import {
  oversight,
  Refused,
  type Checklist as ChecklistData,
  type ConditionState,
  type Proposal,
  type Structure,
} from '../lib/api.js';
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

/**
 * What this board said about this condition the last time it ruled on a
 * question of this shape.
 *
 * It used to live in its own panel above, which meant the same six conditions
 * were rendered twice on one screen — the requirement, then two hundred words
 * later the requirement again with the previous finding under it. Here it sits
 * under the condition it belongs to, which is where a scholar is already
 * looking when they decide whether to carry it across.
 *
 * Recording it is one act with the member's name on it. The button says so:
 * an unreviewed proposal is not an answer, and nothing counts as one until the
 * member says it does.
 */
function Carried({
  proposal,
  taken,
  busy,
  onTake,
}: {
  proposal: Proposal;
  taken: boolean;
  busy: boolean;
  onTake: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="mt-3 rounded-card bg-ink px-4 py-3">
      <div className="mb-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
          {t('inherit.lastTime')}
        </span>
        {proposal.holds && (
          <span
            className={
              'rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] ' +
              (proposal.holds === 'met'
                ? 'bg-[#EBF3EF] text-settled shadow-[0_0_0_0.5px_rgba(44,107,87,0.18)]'
                : 'bg-black/[0.045] text-sand')
            }
          >
            {t(`inherit.holds.${proposal.holds}`)}
          </span>
        )}
      </div>

      {/* The board's own words from its own past ruling. Never rewritten. */}
      <p className="max-w-[62ch] text-[13px] leading-[1.6]">{proposal.value}</p>

      {taken ? (
        <p className="mt-2 text-[12px] text-settled">{t('inherit.taken')}</p>
      ) : (
        <button
          type="button"
          onClick={onTake}
          disabled={busy}
          className="mt-2.5 rounded-xl bg-gradient-to-br from-lapissoft to-[#143E67] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-act transition-all hover:brightness-110 disabled:opacity-40"
        >
          {t('inherit.take')}
        </button>
      )}
    </div>
  );
}

function Condition({
  state,
  contested,
  canRule,
  carried,
  onCarry,
  onRecord,
}: {
  state: ConditionState;
  contested: boolean;
  canRule: boolean;
  /** What the board said last time, where it ruled on this shape before. */
  carried?: { proposal: Proposal; taken: boolean; busy: boolean } | null;
  onCarry?: () => void;
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
        'rounded-card px-5 py-4 ' +
        (contested
          ? 'bg-raised shadow-[0_0_0_1px_rgba(176,132,48,0.3),0_1px_2px_rgba(25,23,19,0.045),0_12px_24px_-14px_rgba(25,23,19,0.16)]'
          : mine
            ? 'bg-raised shadow-card'
            : 'bg-raised/60 shadow-ring')
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        {mine ? (
          <Tag tone={toneFor(mine.holds)}>{t(`chk.${mine.holds}`)}</Tag>
        ) : (
          <Tag>{t('chk.unanswered')}</Tag>
        )}
        {contested && <Tag tone="gold">{t('chk.contested')}</Tag>}
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
          {t(`chk.evidence.${c.evidence}`)}
        </span>
      </div>

      <p className="max-w-[62ch] font-display text-[16px] leading-[1.55]">{c.requirement}</p>

      {/*
        The reason the condition exists, so a scholar can disagree with the
        reasoning rather than only with the citation. It is the most important
        sentence on the condition and the one least often needed *now*.

        Six of these open on a screen whose job is to record findings is two
        hundred words of background a scholar reads past on every visit after
        the first. Behind a disclosure it is one tap, in place, and the summary
        says what is under it — which is a different thing from removing it.
        Nothing here is ever collapsed unless it can be opened where it sits.
      */}
      <details className="group mt-2">
        <summary className="cursor-pointer list-none text-[12px] text-muted underline decoration-line underline-offset-4 hover:text-paper">
          {t('chk.why')}
        </summary>
        <p className="mt-2 max-w-[62ch] text-[12.5px] leading-[1.6] text-muted">{c.why}</p>
      </details>

      {state.history.length > 0 && (
        <details className="mt-2.5">
          <summary className="cursor-pointer text-[12px] text-muted hover:text-paper">
            {state.answeredBy.length} {t('chk.answeredBy')}
          </summary>
          <ul className="mt-2 space-y-2">
            {state.history.map((f, i) => (
              <li
                key={i}
                className={'border-s-2 border-line ps-4 ' + (f.supersededAt ? 'opacity-60' : '')}
              >
                <div className="text-[12px]">
                  <span className={f.holds === 'not_met' ? 'font-semibold text-breach' : 'font-semibold text-settled'}>
                    {t(`chk.${f.holds}`)}
                  </span>
                  <span className="mx-1.5 opacity-40">·</span>
                  <span className="text-muted">{f.scholarId}</span>
                  {f.supersededAt && (
                    <>
                      <span className="mx-1.5 opacity-40">·</span>
                      <span className="text-muted">{t('chk.superseded')}</span>
                    </>
                  )}
                </div>
                <p className="mt-1.5 max-w-[62ch] font-display text-[14.5px] leading-[1.55] text-sand">
                  {f.reason}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/*
        What the board said last time, under the condition it is about — and
        only where this member has not already answered it themselves. A
        proposal shown beside a finding the member has made is offering them
        their own past as a suggestion.
      */}
      {carried && !mine && (
        <Carried
          proposal={carried.proposal}
          taken={carried.taken}
          busy={carried.busy || !canRule}
          onTake={() => onCarry?.()}
        />
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
                      'rounded-xl px-4 py-2 text-[12.5px] transition-all ' +
                      (holds === h
                        ? 'bg-[#EAF1F7] font-bold text-lapis shadow-[0_0_0_1.5px_#164470]'
                        : 'bg-raised text-sand shadow-ring hover:text-paper')
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
                className="mb-2 h-20 w-full rounded-xl shadow-ring bg-raised px-3 py-2 text-[13.5px]"
              />

              {refusal && <p className="mb-2 text-[12.5px] leading-relaxed text-breach">{refusal}</p>}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={submit}
                  disabled={!holds || busy}
                  className="rounded-xl bg-raised shadow-ring px-3 py-1.5 text-[12.5px] text-lapis font-medium disabled:opacity-40"
                >
                  {t('chk.record')}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl shadow-ring px-3 py-1.5 text-[12.5px] text-muted"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-xl shadow-ring px-3 py-1.5 text-[12.5px] text-muted hover:text-paper"
            >
              {mine ? t('chk.changeFinding') : t('chk.recordFinding')}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * Choosing the shape a matter is judged against.
 *
 * The library grew from three shapes to nineteen, and a flat row of nineteen
 * buttons is a wall rather than a list. Grouped by family, because that is how
 * a scholar already thinks about it: whatever this arrangement is, it is a
 * sale, or a lease, or a partnership, and the question is which one.
 *
 * Combining contracts is deliberately its own family rather than a note under
 * the others. Most arrangements that fail do so as a combination — each part
 * passes and the sequence produces what the parts were chosen to avoid — and a
 * board looking for that has to be able to pick it as the shape.
 */
const FAMILIES = [
  'sale',
  'lease',
  'partnership',
  'agency',
  'security',
  'exchange',
  'support',
  'protection',
  'gratuitous',
  'combination',
] as const;

function Picker({
  structures,
  onChoose,
}: {
  structures: Structure[];
  onChoose: (id: string) => void;
}) {
  const { t } = useI18n();

  // Any family the library gains and this list has not caught up with still
  // appears, at the end, rather than silently vanishing from the picker.
  const known = new Set<string>(FAMILIES);
  const order = [...FAMILIES, ...structures.map((s) => s.family).filter((f) => !known.has(f))];

  return (
    <div className="space-y-3">
      {order.map((family) => {
        const inFamily = structures.filter((s) => s.family === family);
        if (inFamily.length === 0) return null;

        return (
          <div key={family}>
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
              {t(`family.${family}`)}
            </div>
            <div className="flex flex-wrap gap-2">
              {inFamily.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onChoose(s.id)}
                  className="rounded-xl shadow-ring px-3 py-1.5 text-left text-[12.5px] text-muted transition-colors hover:text-paper"
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Checklist({ matterId, canRule }: { matterId: string; canRule: boolean }) {
  const { t } = useI18n();
  const [data, setData] = useState<ChecklistData | null>(null);
  const [structures, setStructures] = useState<Structure[] | null>(null);
  const [none, setNone] = useState(false);

  /*
   * What the board said last time, keyed by condition.
   *
   * Fetched here rather than passed in, because the checklist is what draws
   * the conditions and one owner is what stops the two lists drifting apart
   * again. A failure is silent by design: the checklist is the record and the
   * inheritance is a convenience, so losing the second must not cost the first.
   */
  const [carried, setCarried] = useState<Map<string, Proposal>>(new Map());
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [carrying, setCarrying] = useState(false);
  const [carryRefusal, setCarryRefusal] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    oversight
      .inheritance(matterId)
      .then((i) => {
        if (!live || !Array.isArray(i?.proposals)) return;
        const map = new Map<string, Proposal>();
        for (const proposal of i.proposals) {
          if (proposal.kind === 'condition' && proposal.key && proposal.holds) {
            map.set(proposal.key, proposal);
          }
        }
        setCarried(map);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [matterId]);

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
        {canRule && structures && <Picker structures={structures} onChoose={choose} />}
      </div>
    );
  }

  if (!data) return null;

  /**
   * Carry one across. One act, with this member's name on it.
   *
   * The reason recorded is the board's own sentence from the earlier ruling,
   * unedited — which is what makes this a citation of the board's reasoning
   * rather than a tick. A member who disagrees answers the condition normally
   * instead, and both stay in the record.
   */
  async function carry(conditionId: string) {
    const proposal = carried.get(conditionId);
    if (!proposal?.holds) return;

    setCarrying(true);
    setCarryRefusal(null);
    try {
      await oversight.recordFinding(matterId, {
        conditionId,
        holds: proposal.holds,
        reason: proposal.value,
      });
      setTaken((was) => new Set(was).add(conditionId));
      await load();
    } catch (e) {
      setCarryRefusal(e instanceof Refused ? e.message : String(e));
    } finally {
      setCarrying(false);
    }
  }

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="text-[14px] font-medium">{data.structure.name}</span>
        {/*
          Whose conditions these are, on the face of the checklist.
          A board judging a matter beside somebody else's reading and a board
          judging it against its own are different acts, and an interface that
          showed them identically would let the first be mistaken for the
          second.
        */}
        <Tag tone={data.declined ? 'warn' : data.source === 'draft' ? 'gold' : 'ok'}>
          {t(data.declined ? 'adopt.declined' : `adopt.${data.source}`)}
        </Tag>
      </div>
      {/*
        The basis, where the board stated one on its own adoption. Never a
        standard of ours: the shipped library names none, so a board that has
        not said reads as not having said.
      */}
      <p className="mb-2 text-[12px] text-muted">
        {data.basis ?? t('adopt.noBasis')}
      </p>

      {/* The server's own sentence about what that means. Not restated here. */}
      <p
        className={
          'mb-4 rounded-xl px-4 py-2.5 text-[12.5px] leading-[1.55] ' +
          (data.declined
            ? 'bg-[#FCF0EE] text-breach shadow-[0_0_0_0.5px_rgba(154,56,48,0.2)]'
            : 'bg-raised/60 text-muted shadow-ring')
        }
      >
        {data.sourceNote}
      </p>

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
            <span className="text-lapis">
              {data.contested.length} {t('chk.contestedCount')}
            </span>
          </>
        )}
      </p>

      {carryRefusal && (
        <p className="mb-3 rounded-xl bg-[#FCF0EE] px-4 py-2.5 text-[12.5px] leading-[1.55] text-breach shadow-[0_0_0_0.5px_rgba(154,56,48,0.18)]">
          {carryRefusal}
        </p>
      )}

      <ul className="space-y-2.5">
        {data.conditions.map((c) => (
          <Condition
            key={c.condition.id}
            state={c}
            contested={data.contested.includes(c.condition.id)}
            canRule={canRule}
            carried={
              carried.has(c.condition.id)
                ? {
                    proposal: carried.get(c.condition.id)!,
                    taken: taken.has(c.condition.id),
                    busy: carrying,
                  }
                : null
            }
            onCarry={() => void carry(c.condition.id)}
            onRecord={async (holds, reason) => {
              await oversight.recordFinding(matterId, { conditionId: c.condition.id, holds, reason });
              await load();
            }}
          />
        ))}
      </ul>

      <p className="mt-4 rounded-xl shadow-ring bg-raised px-3 py-2.5 text-[12.5px] leading-relaxed text-muted">
        {data.note}
      </p>
    </div>
  );
}
