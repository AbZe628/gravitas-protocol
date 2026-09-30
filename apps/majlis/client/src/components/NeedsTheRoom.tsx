import { useState } from 'react';
import { oversight, type Matter } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { useIdentity } from '../lib/identity.js';
import Act from './Act.js';
import { Button } from './Button';
import Person from './Person.js';

const SETTLED = ['in_force', 'rejected', 'withdrawn', 'lapsed'];

/**
 * Saying a matter cannot be settled in writing.
 *
 * ── what there was before ─────────────────────────────────────────────────
 *
 * Nothing. The chair convened a sitting and typed the agenda into a box, one
 * item to a line, from memory — so the matters that got a room were the ones
 * the chair happened to think of on the day, and a member who believed
 * something needed the board in person had nowhere to say so inside the
 * record. They asked the chair, or they did not.
 *
 * Found by pressing *convene a meeting* and looking at the form: a date, a
 * textarea headed *agenda, one item per line*, and a link box.
 *
 * ── it convenes nothing ───────────────────────────────────────────────────
 *
 * The chair convenes; this is a position, with a reason, like every other
 * position here. A member who could put a date in five colleagues' calendars
 * would not be on a board, they would be running one.
 *
 * ── and the reason is the point ───────────────────────────────────────────
 *
 * *Needs discussion* is the agenda item nobody prepares for. What is written
 * here is what the rest of the board reads before the sitting, and is the
 * whole difference between an agenda and a list of titles.
 */
export default function NeedsTheRoom({ matter, onSaid }: { matter: Matter; onSaid: () => void }) {
  const { t } = useI18n();
  const { identity } = useIdentity();
  const [acting, setActing] = useState<'ask' | 'withdraw' | null>(null);

  /*
   * The board's own people. Not the liaison, who is the institution's person
   * here; an advisory member may, because saying *this cannot be settled in
   * writing* is a view about how the board works and not a vote on the answer.
   * The same rule the route refuses on — a control that cannot be honoured is
   * absent, not disabled.
   */
  const mayAsk = identity?.role === 'signatory' || identity?.role === 'advisory';
  if (!mayAsk || SETTLED.includes(matter.status)) return null;

  /*
   * What stands, per member, which is their last entry — never the count of
   * entries. A member who asked, withdrew and asked again would otherwise be
   * three people wanting a sitting.
   */
  const standing = new Map<string, boolean>();
  for (const c of matter.wantsTheRoom ?? []) standing.set(c.by, c.wanted);
  const asked = [...standing.entries()].filter(([, wanted]) => wanted).map(([who]) => who);
  const mine = identity ? standing.get(identity.scholarId) === true : false;

  const last = (matter.wantsTheRoom ?? []).filter((c) => c.wanted).pop() ?? null;

  return (
    <div className="mb-5 border-b border-line pb-4">
      <p className="text-ui leading-relaxed text-muted">
        {asked.length === 0 ? (
          t('room.nobody')
        ) : (
          <>
            {t('room.asked')}{' '}
            {asked.map((who, k) => (
              <span key={who}>
                {k > 0 ? <span className="mx-1.5 opacity-40">·</span> : null}
                <Person id={who} />
              </span>
            ))}
          </>
        )}
      </p>

      {last && <p className="mt-1.5 text-ui leading-relaxed text-muted">“{last.reason}”</p>}

      <div className="mt-2.5">
        <Button
          type="button"
          tone={mine ? 'plainquiet' : 'quiet'}
          size="sm"
          onClick={() => setActing(mine ? 'withdraw' : 'ask')}
        >
          {t(mine ? 'room.withdraw' : 'room.ask')}
        </Button>
      </div>

      <Act
        open={acting !== null}
        onClose={() => setActing(null)}
        title={t(acting === 'withdraw' ? 'room.withdraw' : 'room.ask')}
        does={t(acting === 'withdraw' ? 'room.withdraw.does' : 'room.ask.does')}
        means={t(acting === 'withdraw' ? 'room.withdraw.means' : 'room.ask.means')}
        label={t(acting === 'withdraw' ? 'room.withdraw' : 'room.ask')}
        reason={{ label: t('room.why'), help: t('room.whyHelp'), required: true }}
        perform={async ({ reason, sending }) => {
          await oversight.askForTheRoom(matter.id, { wanted: acting !== 'withdraw', reason }, sending);
          setActing(null);
          onSaid();
        }}
        after={{
          did: t(acting === 'withdraw' ? 'room.withdraw.did' : 'room.ask.did'),
          means: t('room.didMeans'),
          next: [],
        }}
      />
    </div>
  );
}
