import { useState } from 'react';
import Act from './Act.js';
import { governance, type Matter, type RuleParameter } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Button } from './Button';

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

  function start() {
    setRows(rule.parameters.length ? rule.parameters.map((p) => ({ ...p })) : [blank()]);
    setEditing(true);
  }

  function edit(i: number, field: keyof RuleParameter, value: string) {
    setRows((r) => r.map((row, n) => (n === i ? { ...row, [field]: value } : row)));
  }

  /** Whether the window that writes the figures is open. */
  const [saving, setSaving] = useState(false);

  async function save() {
    const kept = rows.filter((r) => r.key.trim() && r.value.trim());
    onChanged(await governance.setParameters(matter.id, kept));
    setEditing(false);
  }

  const field = 'w-full rounded-xl bg-raised shadow-ring p-1.5 text-ui outline-none';

  // ── reading ─────────────────────────────────────────────────────────────
  if (!editing) {
    return (
      <div className="space-y-3">
        {rule.parameters.length === 0 ? (
          <p className="text-ui text-muted">{t('terms.none')}</p>
        ) : (
          <ul className="space-y-2.5">
            {rule.parameters.map((p) => (
              <li
                key={p.key}
                className="flex items-center justify-between gap-6 rounded-xl bg-ink px-5 py-3.5"
              >
                {/*
                  The board's sentence first, the identifier under it.

                  This led with `maxProviderBorrowingBps` in the reading face
                  and put the board's own words below in muted grey, so the
                  first thing a scholar's eye met on the terms of a ruling was
                  a field name from the registry. The board wrote the sentence;
                  the key is what the software calls it.

                  It is kept, small and in mono, because an engineer wiring the
                  ruling into the registry and an auditor tracing a finding
                  both need it — the same reason the examination keeps it.
                */}
                <div className="min-w-0">
                  <p className="text-body leading-snug text-paper">{p.meaning}</p>
                  <div className="mt-1 font-mono text-label text-muted opacity-70">{p.key}</div>
                </div>
                <div className="shrink-0 text-end">
                  <div className="font-mono text-sub font-medium tabular-nums tracking-tight text-lapis">
                    {p.value}
                  </div>
                  {p.unit ? <div className="mt-0.5 text-note text-muted">{p.unit}</div> : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/*
          The hash state is the honest signal here: empty means the terms can
          still move, and a value means the board is committed to exactly these.
        */}
        <div className="rounded-card bg-raised px-5 py-4 shadow-ring">
          {rule.parameterHash ? (
            <>
              <div className="mb-2 text-label font-bold uppercase tracking-caps text-muted">
                {t('terms.fixed')}
              </div>
              <div className="break-all font-mono text-note text-lapis">
                {rule.parameterHash}
              </div>
              <p className="mt-1.5 text-note leading-relaxed text-muted">{t('terms.fixedNote')}</p>
            </>
          ) : (
            <p className="text-ui leading-relaxed text-muted">{t('terms.notFixed')}</p>
          )}
        </div>

          {mayEdit && (
          <Button
            type="button"
            onClick={start}
            className="rounded-xl bg-raised px-4 py-2 text-ui text-sand shadow-ring transition-colors hover:text-paper"
          >
            {rule.parameters.length ? t('terms.edit') : t('terms.set')}
          </Button>
        )}
      </div>
    );
  }

  // ── drafting ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3 rounded-card shadow-ring p-3">
      <p className="text-note leading-relaxed text-muted">{t('terms.help')}</p>

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
              <Button
                type="button"
                onClick={() => setRows((r) => r.filter((_, n) => n !== i))}
                className="text-note text-muted hover:text-paper"
              >
                {t('terms.removeRow')}
              </Button>
            )}
          </li>
        ))}
      </ul>

      <Button
        type="button"
        onClick={() => setRows((r) => [...r, blank()])}
        className="text-note text-muted hover:text-paper"
      >
        {t('terms.addRow')}
      </Button>

      {/*
        The figures in these rows are what the conditions are measured
        against. A ratio written here is the number a later examination is
        checked by, so it is not a note — it is part of what the board is
        ruling.
      */}
      {/*
        NO-AFTER: setParameters — shown, not announced.

        The rows close and the figures appear in the reading view directly
        above this button, in the place the ruling will always carry them. A
        panel saying "the figures are written" over the top of the written
        figures is the same sentence twice, and the second one has to be
        dismissed.
      */}
      <Act
        open={saving}
        onClose={() => setSaving(false)}
        title={t('terms.save')}
        does={t('wm.terms.does')}
        means={t('wm.terms.means')}
        label={t('terms.save')}
        perform={save}
      />

      <div className="flex gap-2 border-t border-line pt-3">
        <Button
          type="button"
          onClick={() => setSaving(true)}
          className="rounded-xl shadow-ring px-3 py-1.5 text-note hover:bg-raised"
        >
          {t('terms.save')}
        </Button>
        <Button
          type="button"
          onClick={() => setEditing(false)}
          className="text-note text-muted hover:text-paper"
        >
          {t('say.cancel')}
        </Button>
      </div>
    </div>
  );
}
