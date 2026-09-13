import { useState } from 'react';
import { oversight, Refused, type Matter } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';

/**
 * What the institution has to do once this carries.
 *
 * ── the ruling said what, and nothing said how ────────────────────────────
 *
 * A board can rule *this is permitted at a tangible share above fifty-one per
 * cent* and mean by it: the desk reprices weekly, the custodian confirms the
 * breakdown monthly, treasury reports a crossing within a day. None of that is
 * a term of the rule and all of it is what the board expects to happen.
 *
 * The record has held these steps all along. They are printed on the written
 * ruling and in the compliance manual, and the route that sets them has always
 * worked — and no screen ever called it, so every board writing a ruling here
 * issued one whose implementation section was empty, and nobody could see why.
 *
 * ── they freeze with the terms, and for the same reason ───────────────────
 *
 * A ruling whose implementation could be rewritten after the vote is a ruling
 * nobody signed. The server refuses once the matter leaves drafting; this
 * shows them as a record from that moment rather than pretending the control
 * is still there. A control that cannot be honoured is absent, not disabled.
 */

interface Props {
  matter: Matter;
  canEdit: boolean;
  onChanged: (m: Matter) => void;
}

export default function WhatMustHappen({ matter, canEdit, onChanged }: Props) {
  const { t } = useI18n();

  const steps = matter.implementationSteps ?? [];
  const drafting = matter.status === 'draft' || matter.status === 'deliberation';
  const mayEdit = canEdit && drafting;

  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  function start() {
    setRows(steps.length ? [...steps] : ['']);
    setRefusal(null);
    setEditing(true);
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    setRefusal(null);
    try {
      onChanged(
        await oversight.setImplementation(
          matter.id,
          rows.map((r) => r.trim()).filter(Boolean),
        ),
      );
      setEditing(false);
    } catch (error) {
      setRefusal(error instanceof Refused ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <div>
        {steps.length === 0 ? (
          <p className="max-w-[62ch] text-[13px] leading-[1.6] text-muted">
            {mayEdit ? t('doing.noneYet') : t('doing.noneEver')}
          </p>
        ) : (
          <ol className="space-y-2">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3 rounded-card bg-raised px-4 py-3 shadow-ring">
                <span className="mt-[2px] font-mono text-[11px] tabular-nums text-muted">
                  {i + 1}
                </span>
                <span className="max-w-[58ch] text-[13.5px] leading-[1.6] text-sand">{s}</span>
              </li>
            ))}
          </ol>
        )}

        {mayEdit && (
          <button
            type="button"
            onClick={start}
            className="mt-3 text-[12.5px] font-semibold text-lapis underline decoration-line underline-offset-4"
          >
            {steps.length === 0 ? t('doing.write') : t('doing.change')}
          </button>
        )}

        {!drafting && steps.length > 0 && (
          <p className="mt-2.5 text-[11.5px] leading-[1.6] text-muted">{t('doing.frozen')}</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-card bg-ink/70 px-4 py-4 shadow-ring">
      <p className="mb-3 max-w-[58ch] text-[12.5px] leading-[1.6] text-muted">{t('doing.lead')}</p>

      <ol className="space-y-2">
        {rows.map((row, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="mt-3 font-mono text-[11px] tabular-nums text-muted">{i + 1}</span>
            <textarea
              value={row}
              onChange={(e) =>
                setRows((r) => r.map((v, n) => (n === i ? e.target.value : v)))
              }
              rows={2}
              aria-label={`${t('doing.step')} ${i + 1}`}
              className="w-full rounded-xl bg-raised px-3 py-2 text-[13px] leading-[1.5] shadow-ring outline-none"
            />
            <button
              type="button"
              onClick={() => setRows((r) => r.filter((_, n) => n !== i))}
              aria-label={`${t('common.remove')} ${i + 1}`}
              className="mt-2.5 px-1 text-[14px] text-muted hover:text-breach"
            >
              ×
            </button>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={() => setRows((r) => [...r, ''])}
        className="mt-2.5 text-[12.5px] text-lapis underline decoration-line underline-offset-4"
      >
        {t('doing.addStep')}
      </button>

      {refusal && <p className="mt-3 text-[12.5px] text-breach">{refusal}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-xl bg-lapis px-5 py-2.5 text-[13px] font-semibold text-white shadow-act disabled:opacity-40"
        >
          {busy ? t('common.loading') : t('doing.save')}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-[12.5px] text-muted underline decoration-line underline-offset-4"
        >
          {t('common.cancel')}
        </button>
      </div>

      <p className="mt-3 max-w-[58ch] text-[11.5px] leading-[1.6] text-muted">
        {t('doing.freezeWarning')}
      </p>
    </div>
  );
}
