import { useEffect, useState } from 'react';
import { oversight, type Matter, type SignedDocument } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { useIdentity, mayVote } from '../lib/identity.js';

/**
 * Signing the written decision.
 *
 * Voting and signing are two acts, and this panel exists because the board
 * kept doing the first and never doing the second. A member votes on what is
 * proposed. Days later somebody writes it up. Signing is putting your name
 * under the write-up, having read it — which is what a bank files, what an
 * auditor asks for, and what every board outside Islamic finance has had in
 * software for twenty years.
 *
 * ── what this panel refuses to imply ──────────────────────────────────────
 *
 * It never says "verified" or shows a padlock. What the seal proves is a
 * narrow thing and the wording keeps it narrow: this text is what was sealed,
 * and these people signed it having proved who they were in the stated way.
 * A member's own key is Stage Three and does not exist yet, so nothing here
 * may look like it does.
 *
 * Where the installation holds no sealing key the panel says the document is
 * unsealed, in the same place and the same size. Hiding it would make an
 * unsealed installation indistinguishable from a sealed one, which is the
 * failure this whole feature exists to prevent.
 */

const SETTLED = ['in_force', 'timelock', 'rejected', 'lapsed', 'withdrawn'];

/**
 * Eight groups of four, so a person can actually compare two copies.
 *
 * A 64-character hex string is not something anyone checks by eye; grouped,
 * it is. The same function exists on the server and the two must agree, which
 * is why both take the first thirty-two characters and neither takes more.
 */
function readable(hash: string): string {
  const hex = hash.startsWith('0x') ? hash.slice(2) : hash;
  return (hex.slice(0, 32).match(/.{1,4}/g) ?? []).join(' ');
}

function day(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 10);
}

export default function SignTheDocument({ matter }: { matter: Matter }) {
  const { t } = useI18n();
  const { identity } = useIdentity();
  const [doc, setDoc] = useState<SignedDocument | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const decided = SETTLED.includes(matter.status);

  useEffect(() => {
    if (!decided) return;
    let live = true;
    oversight
      .document(matter.id)
      .then((d: SignedDocument) => live && setDoc(d))
      // Not knowing is a state. The panel stays away rather than showing an
      // empty signature list, which would read as "nobody signed".
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [matter.id, decided]);

  if (!decided || !doc) return null;

  /*
   * A document that answers without a hash is one this installation cannot
   * offer signing for, and the panel stays away rather than showing a
   * signature list with nothing to sign over. That happens against an older
   * server, and it will happen again the next time the shape moves — a screen
   * that crashes on a missing field takes the whole matter down with it.
   */
  if (!doc.documentHash) return null;

  const signings = doc.signings ?? [];
  const mine = signings.filter((s) => s.scholarId === identity?.scholarId);
  const current = mine.some((s) => s.documentHash === doc.documentHash);
  const canSign = mayVote(identity?.role);

  async function put() {
    setBusy(true);
    setFailed(null);
    try {
      // The proof is what this installation can honestly claim: the member is
      // signed in under their own credential. A one-time code is offered only
      // where one was actually sent, which nothing here does yet, so it is not
      // an option a person can pick.
      await oversight.sign(matter.id, 'their own sign-in', note.trim() || undefined);
      setNote('');
      setDoc(await oversight.document(matter.id));
    } catch (e) {
      setFailed(e instanceof Error ? e.message : t('sign.failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-sheet bg-raised p-6 shadow-card sm:p-7">
      <h2 className="font-display text-[21px] font-normal leading-[1.16] tracking-[-0.02em]">
        {t('sign.title')}
      </h2>
      <p className="mt-2.5 max-w-[62ch] text-[13.5px] leading-[1.65] text-sand">
        {t('sign.what')}
      </p>

      {/* Who has signed. Names, dates, and how each proved who they were. */}
      <div className="mt-5 space-y-2.5">
        {signings.length === 0 && (
          <p className="text-[13px] leading-[1.6] text-muted">{t('sign.nobodyYet')}</p>
        )}
        {signings.map((s, i) => {
          const stale = s.documentHash !== doc.documentHash;
          return (
            <div
              key={`${s.scholarId}-${s.at}-${i}`}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-card bg-ink px-4 py-3"
            >
              <span className="text-[13.5px] font-semibold">{s.name}</span>
              {s.title && <span className="text-[12px] text-muted">{s.title}</span>}
              <span className="ms-auto font-mono text-[11.5px] text-muted">{day(s.at)}</span>
              <div className="w-full text-[12px] leading-[1.55] text-muted">
                {t('sign.provedBy')} {s.provedBy}
                {stale && (
                  <span className="text-breach">
                    {' · '}
                    {t('sign.differentDraft')}
                  </span>
                )}
              </div>
              {s.note && (
                <p className="w-full text-[12.5px] leading-[1.6] text-sand">“{s.note}”</p>
              )}
            </div>
          );
        })}
      </div>

      {/* The act. Absent, not disabled, for anyone who may not sign. */}
      {canSign && !current && (
        <div className="mt-5">
          <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
            {t('sign.noteLabel')}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={600}
            placeholder={t('sign.notePlaceholder')}
            className="mt-2 w-full rounded-card bg-ink px-4 py-3 text-[13.5px] leading-[1.6] text-paper shadow-ring outline-none placeholder:text-muted focus:shadow-lift"
          />
          <button
            type="button"
            onClick={put}
            disabled={busy}
            className="mt-3 rounded-card bg-lapis px-6 py-3 text-[14px] font-bold text-white shadow-act disabled:opacity-60"
          >
            {busy ? t('sign.signing') : t('sign.doIt')}
          </button>
          {failed && <p className="mt-2 text-[12.5px] text-breach">{failed}</p>}
        </div>
      )}

      {canSign && current && (
        <p className="mt-5 text-[13px] text-settled">{t('sign.youHave')}</p>
      )}

      {/* The seal, or the absence of one, always in the same place. */}
      <div className="mt-6 border-t border-line pt-5">
        {doc.seal ? (
          <>
            <p className="text-[12.5px] leading-[1.65] text-sand">
              {t('sign.sealedBy')} {doc.seal.issuer} · {day(doc.seal.at)}
            </p>
            <p className="mt-2 max-w-[62ch] text-[12.5px] leading-[1.65] text-muted">
              {t('sign.sealProves')}
            </p>
            <p className="mt-2 max-w-[62ch] text-[12.5px] leading-[1.65] text-muted">
              {t('sign.sealDoesNotProve')}
            </p>
          </>
        ) : (
          <p className="max-w-[62ch] text-[12.5px] leading-[1.65] text-muted">
            {t('sign.unsealed')}
          </p>
        )}

        <div className="mt-3 rounded-card bg-ink px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
            {t('sign.reference')}
          </div>
          <div className="mt-1.5 break-all font-mono text-[12px] text-lapis">
            {readable(doc.documentHash)}
          </div>
        </div>
        <p className="mt-2 max-w-[62ch] text-[12px] leading-[1.6] text-muted">
          {t('sign.compare')}
        </p>
      </div>

      <p className="mt-5 max-w-[62ch] text-[12px] leading-[1.6] text-muted">{t('sign.pdf')}</p>
    </div>
  );
}
