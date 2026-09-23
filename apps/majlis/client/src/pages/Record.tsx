import { Nothing } from '../components/page.js';
import { useEffect, useState } from 'react';
import Act from '../components/Act.js';
import AfterAct from '../components/AfterAct.js';
import { Link } from 'react-router-dom';
import { api, oversight, type AssistantExchange, type Health, type MatterSummary } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Card, DateText, ErrorText, Loading, Tag } from '../components/ui.js';
import { DocumentLink, YearPicker } from '../components/Documents.js';
import { Row, Rows } from '../components/shapes.js';
import { State } from '../components/kit.js';
import { Button } from '../components/Button';

/** Everything this board has settled, newest first. */
const SETTLED = ['in_force', 'rejected', 'lapsed', 'withdrawn'];

function Decided({ matters, lost }: { matters: MatterSummary[] | null; lost: boolean }) {
  const { t } = useI18n();

  if (matters === null) return <p className="mb-6 text-ui text-muted">{t('common.loading')}</p>;

  const settled = matters
    .filter((m) => SETTLED.includes(m.status))
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt));

  return (
    <div className="mb-8">
      <h2 className="mb-3 text-label font-bold uppercase tracking-caps text-muted">
        {t('decided.heading')}
      </h2>

      {/*
        In the list's own place, not under it.

        The gap line was first put at the foot of the page, and the screen
        went on saying "Nothing has been settled yet" where the list belongs
        — the false claim still first, the correction below the fold. A
        member reads the first one. So when the read failed, that sentence
        is not shown at all: what stands there says the list could not be
        fetched.
      */}
      {lost ? (
        <div role="alert" className="rounded-card bg-raised px-5 py-4 shadow-ring">
          <p className="max-w-[62ch] text-body leading-relaxed text-sand">
            {t('gap.decidedLost')}
          </p>
        </div>
      ) : settled.length === 0 ? (
        <Nothing>{t('decided.none')}</Nothing>
      ) : (
        <Rows>
          {settled.map((m) => (
            /*
              The two facts a reader scans for, before the title: which way it
              went, and what became of it. A list of titles with the outcome
              buried in the sentence is a list nobody can read at a glance.
            */
            <Row
              key={m.id}
              to={`/matters/${m.id}`}
              phase="inforce"
              kind={t(`matter.direction.${m.direction}`)}
              title={m.title}
              note={<span className="font-mono text-note">{m.openedAt.slice(0, 10)}</span>}
              standing={
                <State tone={m.status === 'in_force' ? 'settled' : 'plain'}>
                  {t(`matter.status.${m.status}`)}
                </State>
              }
            />
          ))}
        </Rows>
      )}
    </div>
  );
}

export default function Record({ embedded = false }: { embedded?: boolean }) {
  const { t } = useI18n();
  const [log, setLog] = useState<AssistantExchange[] | null>(null);
  const [decided, setDecided] = useState<MatterSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  /*
   * What was decided was asked for and did not come.
   *
   * This used to become an empty list, which on this screen of all screens
   * reads as: the board has decided nothing. Measured by failing that one
   * request — the page showed its heading and said exactly that.
   */
  const [decidedLost, setDecidedLost] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [exporting, setExporting] = useState(false);
  const [year, setYear] = useState(new Date().getUTCFullYear());

  useEffect(() => {
    api
      .assistantLog()
      .then((r) => (Array.isArray(r) ? setLog(r) : setFailed(true)))
      .catch(() => setFailed(true));
    api.health().then(setHealth).catch(() => setHealth(null));
    api
      .matters()
      .then((r) => {
        const dobar = Array.isArray(r);
        setDecided(dobar ? r : []);
        setDecidedLost(!dobar);
      })
      .catch(() => {
        setDecided([]);
        setDecidedLost(true);
      });
  }, []);

  /** The name the file lands under, so the screen can say it afterwards. */
  const [filed, setFiled] = useState<string | null>(null);
  const [justDid, setJustDid] = useState<{
    did: string;
    means: string;
    next: readonly { label: string; to?: string; says?: string }[];
  } | null>(null);

  async function exportAudit() {
    const boards = await api.boards();
    /*
     * Not a quiet return. With no board there is nothing to export, and a
     * press that does nothing and says nothing is indistinguishable from a
     * press that failed.
     */
    if (!boards.length) throw new Error(t('record.noBoard'));

    const data = await api.exportBoard(boards[0].id);
    const name = `majlis-audit-${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    setFiled(name);
  }

  return (
    <div>
      {!embedded && (<h1 className="mb-5 font-display font-normal leading-tight tracking-display text-head sm:text-display">{t('record.title')}</h1>)}

      {/*
        What the board decided, which is what this page is named after and
        what it did not contain. Settled first and newest first: a decision
        made last week is the one somebody is looking for.
      */}
      <Decided matters={decided} lost={decidedLost} />

      {health?.recordSince && (
        <div className="mb-5 rounded-card shadow-ring bg-raised px-4 py-3">
          <div className="text-ui text-paper">
            {t('record.since')} <DateText iso={health.recordSince} />
          </div>
          <p className="mt-1 text-ui leading-relaxed text-muted">{t('record.notDurable')}</p>
        </div>
      )}

      {/*
        The year's work, assembled. Above the raw export because it is the
        document a person reads; the JSON below it is what a system consumes,
        and offering the machine-readable one first would have the priorities
        the wrong way round.
      */}
      <div className="mb-4">
        <div className="mb-2 flex items-center gap-2 text-ui text-muted">
          <span>{t('doc.year')}</span>
          <YearPicker year={year} onChange={setYear} />
        </div>
        <DocumentLink
          href={oversight.hrefs.annual(year)}
          label={t('doc.annual')}
          note={t('doc.annualNote')}
        />
      </div>

      {justDid && (
        <div className="mb-4">
          <AfterAct
            did={justDid.did}
            means={justDid.means}
            next={justDid.next}
            onClose={() => setJustDid(null)}
          />
        </div>
      )}

      {/*
        The papers, in one place at the end.

        They were scattered down the screen: a link to the briefings styled
        as a button in the middle of the list, the annual report under a
        year picker, and the audit export in a card of its own at the foot
        — which put the one act of this screen 1 027 pixels down. Reading
        is what the screen is for and the papers are what it produces, so
        they are gathered where a reader arrives after reading.
      */}
      <Card>
        <Link
          to="/briefings"
          className="inline-flex min-h-[44px] items-center rounded-xl bg-raised px-4 py-2 text-ui font-semibold text-lapis shadow-ring lg:min-h-0"
        >
          {t('record.toPapers')}
        </Link>

        <p className="mt-4 text-ui leading-relaxed text-muted">{t('record.exportNote')}</p>
        <Button
          type="button"
          onClick={() => setExporting(true)}
          className="mt-3 rounded-xl bg-lapis px-5 py-2.5 text-ui font-semibold text-white shadow-act transition-colors hover:bg-lapissoft"
        >
          {t('record.export')}
        </Button>

        <Act
          open={exporting}
          onClose={() => setExporting(false)}
          title={t('record.export')}
          does={t('wm.export.does')}
          means={t('wm.export.means')}
          label={t('record.export')}
          perform={exportAudit}
          onDone={setJustDid}
          after={{
            did: t('wm.export.did'),
            means: t('wm.export.didMeans'),
            next: [{ label: t('wm.next.theRecord'), says: t('wm.next.theRecordSays') }],
          }}
        />

        {/*
          The name it landed under. A file that falls into the downloads tray
          changes nothing on the screen, and a member who missed the tray
          presses again, and again. This is the one thing the press leaves
          behind here.
        */}
        {filed && (
          <p className="mt-3 font-mono text-note text-muted">{filed}</p>
        )}
      </Card>

      <h2 className="mb-2 mt-8 text-label font-bold uppercase tracking-caps text-muted">
        {t('record.assistantLog')}
      </h2>
      <p className="mb-4 text-ui leading-relaxed text-muted">{t('record.assistantLogNote')}</p>

      {failed ? (
        <ErrorText />
      ) : !log ? (
        <Loading />
      ) : log.length === 0 ? (
        <p className="text-ui text-muted">{t('common.none')}</p>
      ) : (
        <ul className="space-y-3">
          {log.map((x) => (
            <li key={x.id} className="rounded-card shadow-ring p-3.5">
              <div className="mb-1.5 flex flex-wrap items-center gap-2 text-note text-muted">
                <DateText iso={x.at} />
                {x.declinedAsRuling && <Tag tone="warn">{t('asst.declined')}</Tag>}
                {x.escalated && <Tag tone="gold">{t('asst.escalated')}</Tag>}
              </div>
              <div className="text-body">{x.question}</div>
              <div className="mt-1.5 text-ui text-sand line-clamp-3">{x.answer}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
