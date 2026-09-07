import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { oversight, type Inheritance, type Proposal } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';

/**
 * What this board already decided about a question of this shape.
 *
 * The verdict this exists to answer: *doing it here is harder than getting on
 * Zoom and making a PDF.* It was right, and the cause was that Majlis asked a
 * scholar to author everything into empty boxes. The fourth murabaha of the
 * year opened the same blank checklist as the first, and the board had answered
 * those conditions three times already.
 *
 * So this panel makes the work **reading and correcting** rather than writing
 * from nothing — which is the thing a scholar trained for, and the thing the
 * call does not save them from, because somebody still has to write the PDF
 * afterwards.
 *
 * ── accepting is an act ───────────────────────────────────────────────────
 *
 * There is no "accept all", for the same reason there is none on a document
 * reading. A scholar taking four inherited answers in one click has reviewed
 * nothing, and the record would then say they found four things they never
 * read. Each is taken on its own, and taking one records it as **their**
 * finding, under their name, at today's date.
 *
 * ── and it never looks decided ────────────────────────────────────────────
 *
 * Every proposal says where it came from and that nobody has looked at it.
 * *Inherited and unreviewed* is a different state from *decided*, and a draft
 * that read as authored would make this a machine for producing rulings nobody
 * read — worse than the call by every measure that matters.
 *
 * ── the first of a kind gets the honest answer ────────────────────────────
 *
 * Where there is no precedent the panel does not disappear. It says so, and
 * says that a first of its kind costs the whole apparatus and that this is
 * right. A scholar who was expecting help and got silence would conclude the
 * feature was broken.
 */

function Item({
  proposal,
  onTake,
  taken,
  busy,
}: {
  proposal: Proposal;
  onTake: () => void;
  taken: boolean;
  busy: boolean;
}) {
  const { t } = useI18n();

  return (
    <li className="rounded-card bg-ink px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
          {t(`inherit.kind.${proposal.kind}`)}
        </span>
        {proposal.key && <span className="font-mono text-[12px]">{proposal.key}</span>}
        {proposal.holds && (
          <span
            className={
              'rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] ' +
              (proposal.holds === 'met' ? 'bg-[#EBF3EF] text-settled shadow-[0_0_0_0.5px_rgba(44,107,87,0.18)]' : 'bg-black/[0.045] text-sand')
            }
          >
            {t(`inherit.holds.${proposal.holds}`)}
          </span>
        )}
      </div>

      {/* The board's own words from its own past ruling. Never rewritten. */}
      <p className="mt-2.5 max-w-[62ch] font-display text-[15.5px] leading-[1.55]">
        {proposal.value}
        {proposal.unit && <span className="ms-1.5 font-body text-[11.5px] text-muted">{proposal.unit}</span>}
      </p>

      {taken ? (
        <p className="mt-3 text-[12px] text-settled">{t('inherit.taken')}</p>
      ) : (
        <button
          type="button"
          onClick={onTake}
          disabled={busy}
          className="mt-3 rounded-xl bg-raised px-3.5 py-2 text-[12.5px] text-sand shadow-ring transition-colors hover:text-paper disabled:opacity-40"
        >
          {t('inherit.take')}
        </button>
      )}
    </li>
  );
}

export default function Inherited({
  matterId,
  canRule,
  onChanged,
  conditionsBelow,
}: {
  matterId: string;
  canRule: boolean;
  onChanged?: () => void;
  /**
   * Whether the checklist below is drawing the condition-level proposals.
   *
   * It is, on the matter screen, and this panel then draws only its header and
   * the terms and exclusions. The two used to render the same six conditions
   * one after the other — 826 of the page's 997 words — and a scholar read
   * each requirement twice before reaching the act.
   *
   * A flag rather than a split component: the header, the count of previous
   * rulings and the sentence about nothing being decided belong to this panel
   * wherever the conditions are drawn, and duplicating them into the checklist
   * would trade one repetition for another.
   */
  conditionsBelow?: boolean;
}) {
  const { t } = useI18n();
  const [inheritance, setInheritance] = useState<Inheritance | null>(null);
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    oversight
      .inheritance(matterId)
      // The shape is checked rather than assumed: a panel that explains the
      // matter must not be able to take the page down with it.
      .then((i) => live && Array.isArray(i?.proposals) && setInheritance(i))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [matterId]);

  if (!inheritance) return null;

  const idOf = (p: Proposal, i: number) => `${p.kind}:${p.key ?? i}`;

  async function take(proposal: Proposal, id: string) {
    // Only a condition can be recorded as a finding today. The others are
    // shown so a scholar can read what the board said and carry it across
    // deliberately; offering a button that wrote a term or a line of prose
    // without a stated reason would be recording an edit as a ruling.
    if (proposal.kind !== 'condition' || !proposal.key || !proposal.holds) return;

    setBusy(true);
    setRefusal(null);
    try {
      await oversight.recordFinding(matterId, {
        conditionId: proposal.key,
        holds: proposal.holds,
        reason: proposal.value,
      });
      setTaken((was) => new Set(was).add(id));
      onChanged?.();
    } catch (e) {
      setRefusal(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const conditions = inheritance.proposals.filter((p) => p.kind === 'condition');
  const rest = inheritance.proposals.filter((p) => p.kind !== 'condition');

  return (
    <div className="mb-6 rounded-sheet bg-raised/75 px-6 py-5 shadow-ring">
      <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
        {t('inherit.title')}
      </div>

      {inheritance.from ? (
        <>
          {/*
            The sentence that answers "why not just get on a call". A board
            hearing that it has ruled on this three times, and being shown what
            it said, is being handed the thing a call cannot give it.
          */}
          {/*
            Counted as previous rulings rather than as an ordinal for this one.
            'the 2th question' was wrong in English and an ordinal does not
            survive translation into Arabic or Urdu at all.
          */}
          <p className="max-w-[62ch] font-display text-[19px] leading-[1.45] tracking-[-0.008em]">
            {inheritance.timesRuled > 2
              ? t('inherit.timesMany').replace('{n}', String(inheritance.timesRuled - 1))
              : t('inherit.timesOnce')}
          </p>
          <p className="mt-2.5 max-w-[62ch] text-[12.5px] leading-[1.6] text-muted">
            <Link to={`/matters/${inheritance.from.id}`} className="text-lapis underline decoration-lapis/30 underline-offset-4">
              {inheritance.from.title}
            </Link>
            {inheritance.from.decidedAt && (
              <span> — {new Date(inheritance.from.decidedAt).toISOString().slice(0, 10)}</span>
            )}
            {inheritance.because && <span>. {inheritance.because}</span>}
          </p>
        </>
      ) : (
        <p className="max-w-[62ch] text-[13px] leading-[1.6] text-muted">{inheritance.note}</p>
      )}

      {inheritance.proposals.length > 0 && (
        <>
          <p className="mt-4 max-w-[62ch] text-[12.5px] leading-[1.6] text-muted">
            {inheritance.note}
          </p>

          {refusal && (
            <p className="mt-3 rounded-xl bg-[#FCF0EE] px-4 py-2.5 text-[12.5px] leading-[1.55] text-breach shadow-[0_0_0_0.5px_rgba(154,56,48,0.18)]">
              {refusal}
            </p>
          )}

          {conditions.length > 0 && conditionsBelow && (
            <p className="mt-3 max-w-[62ch] text-[12.5px] leading-[1.6] text-muted">
              {t('inherit.underEach')}
            </p>
          )}

          {conditions.length > 0 && !conditionsBelow && (
            <ul className="mt-4 space-y-2.5">
              {conditions.map((p, i) => {
                const id = idOf(p, i);
                return (
                  <Item
                    key={id}
                    proposal={p}
                    taken={taken.has(id)}
                    busy={busy || !canRule}
                    onTake={() => void take(p, id)}
                  />
                );
              })}
            </ul>
          )}

          {/*
            Terms, what was held outside the question, and the mechanism. Read
            rather than taken: each of these belongs in a field a scholar edits
            with their own reason beside it, and a button that copied one in
            would record an edit as though it were a ruling.
          */}
          {rest.length > 0 && (
            <div className="mt-5 border-t border-line pt-4">
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
                {t('inherit.alsoSaid')}
              </div>
              <ul className="space-y-2.5">
                {rest.map((p, i) => (
                  <li key={idOf(p, i)} className="rounded-card bg-ink px-5 py-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
                      {t(`inherit.kind.${p.kind}`)}
                      {p.key && <span className="ms-2 font-mono normal-case tracking-normal">{p.key}</span>}
                    </div>
                    <p className="mt-2.5 max-w-[62ch] font-display text-[15.5px] leading-[1.55]">
                      {p.value}
                      {p.unit && <span className="ms-1.5 font-body text-[11.5px] text-muted">{p.unit}</span>}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
