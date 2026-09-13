import { useState } from 'react';
import { oversight, type AssetIdentifier, type AssetKind } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Field, HEADING } from './field.js';

/**
 * Put a holding into the register by hand.
 *
 * ── why this had to exist ─────────────────────────────────────────────────
 *
 * The register is normally supplied, from the protocol's own registry or from
 * the institution's universe. The server has always been able to take one by
 * hand as well, and no screen ever asked: the route worked, nothing called it,
 * so for anybody actually using this the register was a list you could read and
 * never add to. A board that notices a holding nobody has entered could do
 * nothing about it.
 *
 * ── it enters the universe, it does not enter a ruling ────────────────────
 *
 * Adding a holding says *this exists and we know about it*. It says nothing
 * about whether it is permissible, and the register shows it as never examined
 * until the board puts it to itself. The two are different states and the wording
 * here keeps them apart: **nobody has ruled on this** and **nobody has even
 * told us about it** are not the same absence.
 *
 * ── one identifier, required ──────────────────────────────────────────────
 *
 * The server refuses a holding with none, and it is right to: a name alone
 * cannot be matched against anything a desk is holding, so the entry would
 * look like a record and be unusable as one.
 */

const KINDS: AssetKind[] = ['token', 'pool', 'security', 'instrument', 'product'];
const SCHEMES: AssetIdentifier['scheme'][] = ['chain', 'isin', 'ticker', 'internal'];

const BOX = 'w-full rounded-xl bg-raised px-3 py-2.5 text-[13.5px] shadow-ring outline-none';

export default function EnterAHolding({ onEntered }: { onEntered: () => void }) {
  const { t } = useI18n();

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<AssetKind>('token');
  const [name, setName] = useState('');
  const [scheme, setScheme] = useState<AssetIdentifier['scheme']>('chain');
  const [value, setValue] = useState('');
  const [network, setNetwork] = useState('');
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-lapis px-5 py-2.5 text-[13px] font-semibold text-white shadow-act transition-all hover:bg-lapissoft"
      >
        {t('reg.enter')}
      </button>
    );
  }

  async function enter(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setRefusal(null);
    try {
      await oversight.addAsset({
        kind,
        name: name.trim(),
        identifiers: [
          {
            scheme,
            value: value.trim(),
            ...(network.trim() ? { network: network.trim() } : {}),
          },
        ],
      });
      setName('');
      setValue('');
      setNetwork('');
      setOpen(false);
      onEntered();
    } catch (error) {
      setRefusal(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={enter} className="mb-6 rounded-sheet bg-raised px-6 py-5 shadow-card">
      <p className="mb-4 max-w-[62ch] text-[12.5px] leading-[1.6] text-muted">{t('reg.enterLead')}</p>

      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <Field label={t('reg.kindLabel')} headingClass={HEADING}>
          {(attrs) => (
            <select
              {...attrs}
              value={kind}
              onChange={(e) => setKind(e.target.value as AssetKind)}
              className={BOX}
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`reg.kind.${k}`)}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label={t('reg.nameLabel')} headingClass={HEADING}>
          {(attrs) => (
            <input
              {...attrs}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={BOX}
              required
              minLength={2}
            />
          )}
        </Field>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[10rem_1fr_10rem]">
        <Field label={t('reg.schemeLabel')} headingClass={HEADING}>
          {(attrs) => (
            <select
              {...attrs}
              value={scheme}
              onChange={(e) => setScheme(e.target.value as AssetIdentifier['scheme'])}
              className={BOX}
            >
              {SCHEMES.map((s) => (
                <option key={s} value={s}>
                  {t(`reg.scheme.${s}`)}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label={t('reg.identifierLabel')} headingClass={HEADING}>
          {(attrs) => (
            <input
              {...attrs}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={BOX + ' font-mono text-[12.5px]'}
              required
            />
          )}
        </Field>

        {/* Only a chain identifier sits on a network; the others do not. */}
        <Field label={t('reg.networkLabel')} headingClass={HEADING}>
          {(attrs) => (
            <input
              {...attrs}
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              className={BOX}
              placeholder={scheme === 'chain' ? 'base' : ''}
            />
          )}
        </Field>
      </div>

      {refusal && <p className="mt-3 text-[12.5px] text-breach">{refusal}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy || name.trim().length < 2 || value.trim().length === 0}
          className="rounded-xl bg-lapis px-5 py-2.5 text-[13px] font-semibold text-white shadow-act disabled:opacity-40"
        >
          {busy ? t('common.loading') : t('reg.enterIt')}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setRefusal(null);
          }}
          className="text-[12.5px] text-muted underline decoration-line underline-offset-4"
        >
          {t('common.cancel')}
        </button>
      </div>

      <p className="mt-3 max-w-[62ch] text-[11.5px] leading-[1.6] text-muted">
        {t('reg.enterNote')}
      </p>
    </form>
  );
}
