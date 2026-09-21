import { useRef, useState } from 'react';
import { oversight, type MatterSummary, type StructureCondition } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import Act from './Act.js';
import { Button } from './Button';

/**
 * The board's own version of a shape's conditions.
 *
 * ── the promise this keeps ────────────────────────────────────────────────
 *
 * The adoption panel said, in so many words, that rewording a condition is
 * drafting and *belongs beside the condition it changes* — and there was no
 * beside. The server has taken an amended shape with its own conditions
 * since the day adoption was written: `standing: 'amended'`, the conditions
 * copied not referenced, refused without a decision behind it. Nothing ever
 * sent one. A board could take the shipped conditions or refuse them, and
 * that was all.
 *
 * *"uci u ove psotojece i mjenajti u njima stavke kako zele."*
 *
 * ── it is not a settings form ─────────────────────────────────────────────
 *
 * What a board judges a murabaha by is not something a member edits and
 * saves. Every amendment names **a decision of this board that carried**,
 * says what changed and why, and supersedes the version before it rather
 * than overwriting it — the earlier one stays, because findings were
 * recorded against it and a later reader has to see what the board was
 * working from at the time. The server refuses each of those in its own
 * words; this screen asks for them up front so the refusal is rare.
 *
 * Every condition carries its reason, and the reason is not decoration: a
 * condition stated without one can only be accepted or refused on
 * authority, and the board is the authority here. So a new condition
 * without a reason is not offered for recording, and the screen says which
 * one is missing rather than letting the server say it after the press.
 *
 * ── and the board's own paper ─────────────────────────────────────────────
 *
 * A board amending a shape usually has its own standard in front of it. It
 * is opened here and **read in the browser** — it is not uploaded, which
 * matters for a document that is confidential and works on an installation
 * with no volume mounted — and its text sits beside the conditions while
 * they are written. What goes into the record is the file's name, as the
 * place the board's version came from, never the file itself: this screen
 * records conditions, and quietly storing somebody's standard because they
 * opened it here would be keeping a document nobody decided to keep.
 */

const READABLE = /\.(txt|md|csv|json|html?|xml)$/i;
const EVIDENCE: StructureCondition['evidence'][] = [
  'document',
  'sequence',
  'figure',
  'undertaking',
];

/** The shortest reason the server will take. Said here so it is not a surprise. */
const MIN_REASON = 20;

/**
 * A row the board has just added and not yet named.
 *
 * Its real id is worked out at the moment it is recorded, from the words
 * the board ended up writing. Naming it while the box is still empty would
 * put `condition-2` in the record for a condition about ownership.
 */
const UNNAMED = 'new:';

/**
 * An id for a condition the board wrote, from its own words.
 *
 * Findings are recorded against this, so it has to be stable and it has to
 * be distinct. A slug of the requirement is both, and it is legible in the
 * record — which a random string is not, and a reader looking at a finding
 * from three years ago is the person who needs it to be.
 */
function idFor(requirement: string, taken: Set<string>): string {
  const base =
    requirement
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .split('-')
      .slice(0, 5)
      .join('-') || 'condition';

  let id = base;
  let n = 2;
  while (taken.has(id)) id = `${base}-${n++}`;
  return id;
}

/**
 * The conditions as they go into the record, with the new ones named.
 *
 * Exported and pure, because this is the part that decides what a finding
 * three years from now will point at. A condition that was already there
 * keeps its id — a rewording is not a new condition, and findings are
 * recorded against the id — and two new ones whose words slug the same way
 * must not collide, which is why the names are taken as they are handed
 * out rather than counted up front.
 */
export function named(rows: StructureCondition[]): StructureCondition[] {
  const taken = new Set(rows.filter((r) => !r.id.startsWith(UNNAMED)).map((r) => r.id));

  return rows.map((r) => {
    const requirement = r.requirement.trim();
    let id = r.id;
    if (id.startsWith(UNNAMED)) {
      id = idFor(requirement, taken);
      taken.add(id);
    }
    return { id, requirement, why: r.why.trim(), evidence: r.evidence };
  });
}

export default function ChangeTheConditions({
  structureId,
  boardId,
  /** What the board holds today: the shipped conditions, or its own. */
  held,
  supersedes,
  /** Decisions of this board that carried. An amendment names one. */
  carried,
  onDone,
}: {
  structureId: string;
  boardId: string;
  held: StructureCondition[];
  supersedes: string | null;
  carried: MatterSummary[];
  onDone: () => void;
}) {
  const { t } = useI18n();
  const chooser = useRef<HTMLInputElement | null>(null);

  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<StructureCondition[]>(held.map((c) => ({ ...c })));
  const [matterId, setMatterId] = useState('');
  const [why, setWhy] = useState('');
  const [asking, setAsking] = useState(false);
  const [paper, setPaper] = useState<{ name: string; text: string } | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const set = (i: number, patch: Partial<StructureCondition>) =>
    setRows((was) => was.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  async function takePaper(file: File) {
    setNote(null);
    if (!READABLE.test(file.name)) {
      setNote(t('draftfrom.cannotRead') + ' ' + file.name);
      return;
    }
    try {
      const text = await file.text();
      setPaper({ name: file.name, text });
    } catch {
      setNote(t('draftfrom.cannotRead') + ' ' + file.name);
    }
  }

  /*
   * What is about to change, named before it is recorded.
   *
   * A board pressing this is changing what every arrangement of this kind is
   * judged by from that moment. Reading that off two lists side by side is
   * work; saying "two reworded, one added, one dropped" is the sentence the
   * press deserves to be made against.
   */
  const heldById = new Map(held.map((c) => [c.id, c]));
  const kept = rows.filter((r) => heldById.has(r.id));
  const added = rows.filter((r) => !heldById.has(r.id));
  const dropped = held.filter((c) => !rows.some((r) => r.id === c.id));
  const changed = kept.filter((r) => {
    const was = heldById.get(r.id)!;
    return (
      was.requirement.trim() !== r.requirement.trim() ||
      was.why.trim() !== r.why.trim() ||
      was.evidence !== r.evidence
    );
  });

  const moved = added.length + dropped.length + changed.length;

  /*
   * What is missing, said rather than left to the server.
   *
   * These are the server's own rules. Repeating them here is not
   * duplication of the refusal — the refusal stays, and is what actually
   * holds — it is the difference between a board being told before they
   * press and after.
   */
  const missing: string[] = [];
  if (rows.length === 0) missing.push(t('amend.needConditions'));
  if (rows.some((r) => r.requirement.trim() === '')) missing.push(t('amend.needRequirement'));
  const thin = rows.find((r) => r.why.trim().length < MIN_REASON);
  if (thin) missing.push(t('amend.needWhy') + ' “' + (thin.requirement.trim().slice(0, 40) || '—') + '”');
  if (why.trim() === '') missing.push(t('amend.needWhat'));
  if (!matterId) missing.push(t('amend.needDecision'));
  if (moved === 0) missing.push(t('amend.needChange'));

  async function record() {
    /*
     * No quiet return. The window has already said what this changes;
     * coming back as though it worked would have it announce an amendment
     * that never happened.
     */
    await oversight.adopt({
      structureId,
      boardId,
      standing: 'amended',
      matterId,
      /*
       * The board's sentence first, then where their version came from.
       * The file is named and not kept: this records conditions, and
       * storing somebody's standard because they opened it here would be
       * keeping a document nobody decided to keep.
       */
      amendments: [
        why.trim(),
        ...(paper ? [`${t('amend.takenFrom')} ${paper.name}`] : []),
      ],
      /*
       * A new condition is named here, from the words the board wrote,
       * and never before: an id settled while the box was empty would put
       * `condition-2` in the record for a condition about ownership. A
       * condition that was already there keeps its id, because findings
       * are recorded against it and a rewording is not a new condition.
       */
      conditions: named(rows),
      supersedes,
    });
    setOpen(false);
    onDone();
  }

  if (!open) {
    return (
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3.5 rounded-card bg-raised px-4 py-2.5 text-ui font-semibold text-lapis shadow-ring transition-colors hover:text-paper"
      >
        {t('amend.open')}
      </Button>
    );
  }

  return (
    <div className="mt-4 rounded-card bg-ink px-4 py-4 shadow-ring">
      <p className="mb-3.5 max-w-[62ch] text-ui leading-relaxed text-muted">{t('amend.lead')}</p>

      {/* The board's own standard, read here and not uploaded. */}
      <div className="mb-4">
        <Button
          type="button"
          onClick={() => chooser.current?.click()}
          className="rounded-xl bg-raised px-3.5 py-2 text-ui text-sand shadow-ring transition-colors hover:text-paper"
        >
          {paper ? t('amend.paperAgain') : t('amend.paper')}
        </Button>
        <input
          ref={chooser}
          type="file"
          hidden
          aria-label={t('amend.paper')}
          accept=".txt,.md,.csv,.json,.html,.htm,.xml"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void takePaper(f);
          }}
        />
        <p className="mt-1.5 max-w-[58ch] text-note leading-relaxed text-muted">
          {t('amend.paperNote')}
        </p>
        {note && <p className="mt-1.5 text-note leading-relaxed text-breach">{note}</p>}

        {paper && (
          <div className="mt-2.5 rounded-xl bg-raised px-3.5 py-3 shadow-ring">
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-ui font-semibold text-paper">{paper.name}</span>
              <span className="font-mono text-note text-muted">
                {paper.text.length} {t('draftfrom.characters')}
              </span>
            </div>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-display text-note leading-relaxed text-sand">
              {paper.text}
            </pre>
          </div>
        )}
      </div>

      {/* ── the conditions themselves ───────────────────────────────────── */}

      <ol className="space-y-3">
        {rows.map((r, i) => (
          <li key={r.id} className="rounded-card bg-raised px-3.5 py-3 shadow-ring">
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-mono text-note text-muted">{r.id}</span>
              <Button
                type="button"
                onClick={() => setRows((was) => was.filter((_, j) => j !== i))}
                className="text-note text-muted underline decoration-line underline-offset-4 hover:text-breach"
              >
                {t('amend.drop')}
              </Button>
            </div>

            <label className="block">
              <span className="mb-1 block text-label font-bold uppercase tracking-caps text-muted">
                {t('amend.requirement')}
              </span>
              <textarea
                value={r.requirement}
                rows={2}
                onChange={(e) => set(i, { requirement: e.target.value })}
                className="w-full rounded-xl bg-ink px-3 py-2 text-ui leading-relaxed text-paper shadow-ring focus:shadow-lift focus:outline-none"
              />
            </label>

            {/*
              The reason, beside the requirement rather than behind a press.
              A condition without one can only be accepted or refused on
              authority, and the board is the authority here.
            */}
            <label className="mt-2 block">
              <span className="mb-1 block text-label font-bold uppercase tracking-caps text-muted">
                {t('amend.why')}
              </span>
              <textarea
                value={r.why}
                rows={2}
                onChange={(e) => set(i, { why: e.target.value })}
                className="w-full rounded-xl bg-ink px-3 py-2 text-ui leading-relaxed text-paper shadow-ring focus:shadow-lift focus:outline-none"
              />
            </label>

            <label className="mt-2 block max-w-[280px]">
              <span className="mb-1 block text-label font-bold uppercase tracking-caps text-muted">
                {t('amend.evidence')}
              </span>
              <select
                value={r.evidence}
                onChange={(e) =>
                  set(i, { evidence: e.target.value as StructureCondition['evidence'] })
                }
                className="w-full rounded-xl bg-ink px-3 py-2 text-ui text-paper shadow-ring"
              >
                {EVIDENCE.map((k) => (
                  <option key={k} value={k}>
                    {t(`chk.evidence.${k}`)}
                  </option>
                ))}
              </select>
            </label>
          </li>
        ))}
      </ol>

      <Button
        type="button"
        onClick={() =>
          setRows((was) => [
            ...was,
            {
              id: UNNAMED + was.length,
              requirement: '',
              why: '',
              evidence: 'document',
            },
          ])
        }
        className="mt-3 rounded-xl bg-raised px-3.5 py-2 text-ui text-sand shadow-ring transition-colors hover:text-paper"
      >
        {t('amend.add')}
      </Button>

      {/* ── what changes, and under what decision ───────────────────────── */}

      <div className="mt-5 border-t border-line pt-4">
        <p className="mb-3 max-w-[58ch] text-ui leading-relaxed text-sand">
          {moved === 0 ? (
            t('amend.nothingYet')
          ) : (
            <>
              <span className="tabular-nums">{changed.length}</span> {t('amend.reworded')}
              <span className="mx-1.5 opacity-40">·</span>
              <span className="tabular-nums">{added.length}</span> {t('amend.addedN')}
              <span className="mx-1.5 opacity-40">·</span>
              <span className="tabular-nums">{dropped.length}</span> {t('amend.droppedN')}
            </>
          )}
        </p>

        <label className="mb-3 block">
          <span className="mb-1 block text-label font-bold uppercase tracking-caps text-muted">
            {t('amend.what')}
          </span>
          <textarea
            value={why}
            rows={3}
            placeholder={t('amend.whatHint')}
            onChange={(e) => setWhy(e.target.value)}
            className="w-full rounded-xl bg-raised px-3 py-2 text-ui leading-relaxed text-paper shadow-ring focus:shadow-lift focus:outline-none"
          />
        </label>

        {/*
          Absent rather than disabled where there is no decision to name.
          Nothing becomes binding by administration: without a ruling that
          carried, there is nothing for an amendment to stand on.
        */}
        {carried.length === 0 ? (
          <p className="max-w-[58ch] text-ui leading-relaxed text-muted">{t('adopt.noDecision')}</p>
        ) : (
          <label className="mb-3 block">
            <span className="mb-1 block text-label font-bold uppercase tracking-caps text-muted">
              {t('adopt.decidedIn')}
            </span>
            <select
              value={matterId}
              onChange={(e) => setMatterId(e.target.value)}
              className="w-full rounded-xl bg-raised px-3 py-2 text-ui text-paper shadow-ring"
            >
              <option value="">{t('adopt.pickDecision')}</option>
              {carried.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </label>
        )}

        {/* What is still missing, named one at a time rather than as a refusal. */}
        {missing.length > 0 && carried.length > 0 && (
          <ul className="mb-3 space-y-1">
            {missing.map((m, i) => (
              <li key={i} className="max-w-[58ch] text-note leading-relaxed text-muted">
                {m}
              </li>
            ))}
          </ul>
        )}

        <Act
          open={asking}
          onClose={() => setAsking(false)}
          title={t('amend.record')}
          does={t('wm.amend.does')}
          means={t('wm.amend.means')}
          label={t('amend.record')}
          perform={record}
          after={{
            did: t('wm.amend.did'),
            means: t('wm.amend.didMeans'),
            next: [{ label: t('wm.next.theShape'), says: t('wm.next.theShapeSays') }],
          }}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={missing.length > 0}
            onClick={() => setAsking(true)}
            className="rounded-card bg-lapis px-5 py-2.5 text-ui font-semibold text-white shadow-act disabled:opacity-40"
          >
            {t('amend.record')}
          </Button>
          <Button
            type="button"
            onClick={() => setOpen(false)}
            className="px-4 py-1 text-ui text-muted"
          >
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
}
