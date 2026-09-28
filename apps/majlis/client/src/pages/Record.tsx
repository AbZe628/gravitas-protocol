import { Nothing } from '../components/page.js';
import { useEffect, useState } from 'react';
import Act from '../components/Act.js';
import { api, oversight, type Health, type MatterSummary } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { DateText, Loading } from '../components/ui.js';
import { DocumentLink, YearPicker } from '../components/Documents.js';
import { Sheet, Line, Mark, Figure, type Column } from '../components/sheet.js';
import { Quiet } from '../components/kit.js';
import { Button } from '../components/Button';

const DECIDED_COLS = (t: (k: string) => string): readonly Column[] => [
  { head: t('col.matter'), width: 'minmax(0,3fr)', phone: 'lead' },
  { head: t('col.direction'), width: '7rem', phone: 'under' },
  { head: t('col.stage'), width: '8rem', phone: 'under' },
  { head: t('col.opened'), width: '6.5rem', end: true, phone: 'trailing' },
];

/** Everything this board has settled, newest first. */
const SETTLED = ['in_force', 'rejected', 'lapsed', 'withdrawn'];

function Decided({ matters, lost }: { matters: MatterSummary[] | null; lost: boolean }) {
  const { t } = useI18n();

  if (matters === null) return <div className="mb-6"><Loading rows={3} bare /></div>;

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
        /*
          The two facts a reader scans for stand in their own columns now:
          which way it went, and what became of it. Stacked under the title
          they had to be read one record at a time.
        */
        <Sheet columns={DECIDED_COLS(t)}>
          {settled.map((m) => (
            <Line
              key={m.id}
              to={`/matters/${m.id}`}
              columns={DECIDED_COLS(t)}
              cells={[
                m.title,
                <Mark tone={m.direction === 'restrict' ? 'text-breach' : 'text-settled'}>
                  {t(`matter.direction.${m.direction}`)}
                </Mark>,
                <Mark tone={m.status === 'in_force' ? 'text-settled' : 'text-muted'}>
                  {t(`matter.status.${m.status}`)}
                </Mark>,
                <Figure>{m.openedAt.slice(0, 10)}</Figure>,
              ]}
            />
          ))}
        </Sheet>
      )}
    </div>
  );
}

/**
 * The whole record, as a file an auditor can hold.
 *
 * Its own component because of where it belongs: the head of the screen,
 * beside the title, which is where every other screen keeps the one thing
 * a member came to do. It sat in a card at the foot instead — 974 pixels
 * down, under three other boxes — and an act that moves from screen to
 * screen is how an application starts feeling like a pile of pages.
 *
 * The screen that owns the frame draws it there. This page draws it itself
 * only when nothing else is drawing it, so the classic route keeps it.
 */
export function ExportForAudit() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  /** The name the file lands under, so the window can say it afterwards. */
  const [filed, setFiled] = useState<string | null>(null);

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
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[44px] items-center rounded-xl bg-lapis px-5 py-2.5 text-ui font-semibold text-white shadow-act transition-colors hover:bg-lapissoft lg:min-h-0"
      >
        {t('record.export')}
      </Button>

      <Act
        open={open}
        onClose={() => setOpen(false)}
        title={t('record.export')}
        does={t('wm.export.does')}
        means={t('wm.export.means')}
        label={t('record.export')}
        perform={exportAudit}
        after={{
          did: t('wm.export.did'),
          /*
           * The name it landed under. A file that falls into the downloads
           * tray changes nothing on the screen, and a member who missed the
           * tray presses again, and again.
           */
          means: filed ? `${t('wm.export.didMeans')} ${filed}` : t('wm.export.didMeans'),
          next: [{ label: t('wm.next.theRecord'), says: t('wm.next.theRecordSays') }],
        }}
      />
    </>
  );
}

export default function Record({ embedded = false }: { embedded?: boolean }) {
  const { t } = useI18n();
  const [decided, setDecided] = useState<MatterSummary[] | null>(null);
  /*
   * What was decided was asked for and did not come.
   *
   * This used to become an empty list, which on this screen of all screens
   * reads as: the board has decided nothing. Measured by failing that one
   * request — the page showed its heading and said exactly that.
   */
  const [decidedLost, setDecidedLost] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [year, setYear] = useState(new Date().getUTCFullYear());

  useEffect(() => {
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

  return (
    <div>
      {!embedded && (<h1 className="mb-5 font-display leading-tight tracking-display text-head sm:text-display">{t('record.title')}</h1>)}

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

        {/*
          The papers, still reachable from the screen that produces them.

          This link was taken out with the card it stood in, on the reasoning
          that the briefings are a destination the rail carries. They are a
          destination the *spine* carries, which is not the same thing: the
          rail draws nine of them, and measured from the arrival screen the
          briefings became the one address in the application no link led
          to. Read the data, believe the screen.
        */}
        <div className="mt-3">
          <Quiet to="/briefings">{t('record.toPapers')}</Quiet>
        </div>
      </div>

      {/*
        The export, when nothing above is drawing it.

        On the screen a member actually reaches, the frame puts it in the
        head beside the title. This is the classic route, which has no head
        to put it in, and an act that exists on one route and not the other
        is worse than an act in an odd place.
      */}
      {!embedded && (
        <div className="mt-6">
          <ExportForAudit />
        </div>
      )}
    </div>
  );
}
