import { useState } from 'react';
import { governance, Refused, type Matter, type RuleParameter } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';

/**
 * The operative terms of the rule being proposed.
 *
 * A board can say *permit this asset*. Saying *at a ratio of 30%, measured
 * quarterly, with a 30-day cure for drift* is a different act, and until now
 * there was nowhere to put it — every matter carried an empty parameter list
 * and an empty hash, so the canonicalisation design had nothing to work on.
 *
 * The hash is the point. Once the vote opens the terms stop moving and the hash
 * is fixed, and every position recorded afterwards carries it. "Did this member
 * approve these exact terms" becomes a comparison rather than an argument about
 * what was on the screen at the time.
 */

interface Props {
  matter: Matter;
  canEdit: boolean;
  onChanged: (m: Matter) => void;
}

const blank = (): RuleParameter => ({ key: '', value: '', unit: '', meaning: '' });

export default function Terms({ matter, canEdit, onChanged }: Props) {
  const { t } = useI18n();
  const rule = matter.proposedRule;
  const drafting = matter.status === 'draft' || matter.status === 'deliberation';
  const mayEdit = canEdit && drafting;

  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<RuleParameter[]>([]);
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  function start() {
    setRows(rule.parameters.length ? rule.parameters.map((p) => ({ ...p })) : [blank()]);
    setRefusal(null);
    setEditing(true);
  }

  function edit(i: number, field: keyof RuleParameter, value: string) {
    setRows((r) => r.map((row, n) => (n === i ? { ...row, [field]: value } : row)));
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    setRefusal(null);
    try {
      const kept = rows.filter((r) => r.key.trim() && r.value.trim());
      onChanged(await governance.setParameters(matter.id, kept));
      setEditing(false);
    } catch (error) {
      setRefusal(error instanceof Refused ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  const field = 'w-full rounded border border-line bg-transparent p-1.5 text-[13px] outline-none';

  // ── reading ─────────────────────────────────────────────────────────────
  if (!editing) {
    return (
      <div className="space-y-3">
        {rule.parameters.length === 0 ? (
          <p className="text-[13px] text-muted">{t('terms.none')}</p>
        ) : (
          <ul className="space-y-2">
            {rule.parameters.map((p) => (
              <li key={p.key} className="rounded-lg border border-line p-3">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-mono text-[12.5px] text-muted">{p.key}</span>
                  <span className="text-[15px] font-medium text-paper tabular-nums">
                    {p.value}
                    {p.unit ? <span className="ml-1 text-[12px] text-muted">{p.unit}</span> : null}
                  </span>
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{p.meaning}</p>
              </li>
            ))}
          </ul>
        )}

        {/*
          The hash state is the honest signal here: empty means the terms can
          still move, and a value means the board is committed to exactly these.
        */}
        <div className="rounded-lg border border-line bg-surface/30 p-3">
          {rule.parameterHash ? (
            <>
              <div className="mb-1 text-[11.5px] uppercase tracking-wide text-muted">
                {t('terms.fixed')}
              </div>
              <div className="break-all font-mono text-[11.5px] text-goldsoft">
                {rule.parameterHash}
              </div>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{t('terms.fixedNote')}</p>
            </>
          ) : (
            <p className="text-[12.5px] leading-relaxed text-muted">{t('terms.notFixed')}</p>
          )}
        </div>

        {refusal && <p className="text-[12.5px] text-amber-200">{refusal}</p>}

        {mayEdit && (
          <button
            type="button"
            onClick={start}
            className="rounded border border-line px-3 py-1.5 text-[12px] hover:bg-surface/60"
          >
            {rule.parameters.length ? t('terms.edit') : t('terms.set')}
          </button>
        )}
      </div>
    );
  }

  // ── drafting ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3 rounded-lg border border-line p-3">
      <p className="text-[12px] leading-relaxed text-muted">{t('terms.help')}</p>

      <ul className="space-y-3">
        {rows.map((row, i) => (
          <li key={i} className="space-y-1.5 border-b border-line pb-3 last:border-b-0 last:pb-0">
            <div className="flex flex-wrap gap-1.5">
              <input
                value={row.key}
                onChange={(e) => edit(i, 'key', e.target.value)}
                placeholder={t('terms.keyHint')}
                aria-label={t('terms.key')}
                className={field + ' flex-[2] font-mono min-w-[9rem]'}
              />
              <input
                value={row.value}
                onChange={(e) => edit(i, 'value', e.target.value)}
                placeholder={t('terms.valueHint')}
                aria-label={t('terms.value')}
                className={field + ' flex-1 min-w-[5rem]'}
              />
              <input
                value={row.unit ?? ''}
                onChange={(e) => edit(i, 'unit', e.target.value)}
                placeholder={t('terms.unitHint')}
                aria-label={t('terms.unit')}
                className={field + ' flex-1 min-w-[5rem]'}
              />
            </div>
            <textarea
              value={row.meaning}
              onChange={(e) => edit(i, 'meaning', e.target.value)}
              rows={2}
              placeholder={t('terms.meaningHint')}
              aria-label={t('terms.meaning')}
              className={field + ' resize-y leading-relaxed'}
            />
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => setRows((r) => r.filter((_, n) => n !== i))}
                className="text-[12px] text-muted hover:text-paper"
              >
                {t('terms.removeRow')}
              </button>
            )}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setRows((r) => [...r, blank()])}
        className="text-[12px] text-muted hover:text-paper"
      >
        {t('terms.addRow')}
      </button>

      {refusal && <p className="text-[12.5px] text-amber-200">{refusal}</p>}

      <div className="flex gap-2 border-t border-line pt-3">
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="rounded border border-line px-3 py-1.5 text-[12px] hover:bg-surface/60 disabled:opacity-40"
        >
          {t('terms.save')}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-[12px] text-muted hover:text-paper"
        >
          {t('say.cancel')}
        </button>
      </div>
    </div>
  );
}
