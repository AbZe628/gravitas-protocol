import { useEffect, useState } from 'react';
import { api, oversight, type Health, type Settings as SettingsData } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Card, DateText, ErrorText, Loading, Tag } from '../components/ui.js';

/**
 * Who is on this board, and how it decides.
 *
 * The sixth surface, and the only one a scholar visits rarely. It is worth a
 * screen anyway for one reason: it is where a misconfiguration becomes visible.
 *
 * The board record says who holds signing authority; the credential file says
 * who may act. Two lists, maintained separately, and until now nothing compared
 * them. When they disagree they disagree in silence — a member counted toward
 * the quorum who cannot reach the application, or a vote recorded and then
 * discarded by an arithmetic that only counts board signatories. Nobody finds
 * out until a threshold does not move.
 *
 * So the disagreements are the loudest thing on the page, above the composition
 * they concern, and each says what it costs rather than what it is. Nothing
 * here offers to fix one: an application that edited its own board membership
 * would be deciding who sits on a Shariah board.
 */

export default function Settings() {
  const { t } = useI18n();
  const [data, setData] = useState<SettingsData | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    oversight
      .settings()
      .then(setData)
      .catch(() => setFailed(true));
    api.health().then(setHealth).catch(() => setHealth(null));
  }, []);

  if (failed) return <ErrorText />;
  if (!data) return <Loading />;

  const mismatches = Array.isArray(data.mismatches) ? data.mismatches : [];

  return (
    <div>
      <h1 className="mb-1 text-[19px] font-semibold">{data.boardName}</h1>
      <p className="mb-6 text-[13px] text-muted">{t('set.intro')}</p>

      {/*
        No credentials at all is not a misconfigured board. It is a development
        installation where everyone reads and nobody acts, and it is one calm
        sentence rather than a warning on every row.
      */}
      {!data.credentialsConfigured && (
        <div className="mb-7 rounded-lg border border-line bg-surface/60 px-4 py-3 text-[13px] leading-relaxed text-muted">
          {t('set.noCredentialsAtAll')}
        </div>
      )}

      {/*
        Above the composition, because a fault here makes the composition below
        it untrue in a way the page cannot otherwise show.
      */}
      {mismatches.length > 0 && (
        <div className="mb-7 rounded-lg border border-warn/60 bg-warn/[0.06] px-4 py-3.5">
          <div className="mb-2 text-[13px] font-semibold text-warn">
            {mismatches.length === 1 ? t('set.oneMismatch') : `${mismatches.length} ${t('set.mismatches')}`}
          </div>
          <ul className="space-y-2.5">
            {mismatches.map((m, i) => (
              <li key={i} className="text-[12.5px] leading-relaxed">
                <span className="font-mono text-[11.5px] text-warn">{m.scholarId}</span>
                <p className="mt-0.5 text-muted">{m.consequence}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-warn/30 pt-2.5 text-[12px] leading-relaxed text-muted">
            {t('set.fixIn')} <span className="font-mono text-[11.5px]">{data.fixIn}</span>
          </p>
        </div>
      )}

      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-muted">
        {t('set.whoIsHere')}
      </h2>
      <ul className="mb-8 space-y-2">
        {data.members.map((m) => (
          <li key={m.scholarId}>
            <Card>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[14px] font-medium">{m.name}</span>
                <span className="font-mono text-[11px] text-muted">{m.scholarId}</span>
              </div>
              {m.title && <div className="mt-0.5 text-[12px] text-muted">{m.title}</div>}

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Tag tone={m.signatory ? 'gold' : undefined}>
                  {t(m.signatory ? 'set.signs' : 'set.advisory')}
                </Tag>
                {m.office && <Tag>{t(`set.office.${m.office}`)}</Tag>}
                {/*
                  Absent is a state, not a blank. A member with no credential
                  cannot reach this application at all, which is the thing worth
                  seeing on their row.
                */}
                {m.role !== null ? (
                  <span className="text-[11.5px] text-muted">{t(`role.${m.role}`)}</span>
                ) : data.credentialsConfigured ? (
                  // Missing one while others have them is a real fault, and the
                  // panel above already says what it costs.
                  <Tag tone="warn">{t('set.noCredential')}</Tag>
                ) : null}
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-muted">
        {t('set.howItDecides')}
      </h2>
      <Card>
        <dl className="space-y-2.5 text-[13px]">
          <Row label={t('set.quorumPermit')} value={String(data.decides.quorumPermit)} />
          <Row label={t('set.quorumRestrict')} value={String(data.decides.quorumRestrict)} />
          <Row
            label={t('set.signatories')}
            value={
              data.decides.signatoriesSeated === data.decides.totalSignatories
                ? String(data.decides.signatoriesSeated)
                : `${data.decides.signatoriesSeated} / ${data.decides.totalSignatories}`
            }
          />
          <Row label={t('set.timelock')} value={`${data.decides.timelockHours} h`} />
          <Row label={t('set.ratification')} value={`${data.decides.ratificationWindowHours} h`} />
        </dl>
        <p className="mt-3 border-t border-line pt-3 text-[12.5px] leading-relaxed text-muted">
          {t('set.asymmetry')}
        </p>
      </Card>

      <h2 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-[0.14em] text-muted">
        {t('set.whatIsAttached')}
      </h2>
      <Card>
        <dl className="space-y-2.5 text-[13px]">
          <Row
            label={t('set.assistant')}
            value={health?.assistantKind === 'off' ? t('set.assistantOff') : (health?.assistantKind ?? '—')}
          />
          <Row label={t('set.enforcement')} value={health?.enforcement ?? '—'} />
        </dl>
        {health?.recordSince && (
          <p className="mt-3 border-t border-line pt-3 text-[12.5px] leading-relaxed text-muted">
            {t('record.since')} <DateText iso={health.recordSince} />
          </p>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="font-mono tabular-nums">{value}</dd>
    </div>
  );
}
