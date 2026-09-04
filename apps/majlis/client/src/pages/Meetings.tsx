import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  api,
  oversight,
  type Attendance,
  type Board,
  type MeetingRow,
  type Meetings as MeetingsData,
} from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { useIdentity } from '../lib/identity.js';
import { Card, DateText, ErrorText, Loading, Tag } from '../components/ui.js';

/**
 * Meetings, as a record rather than a room.
 *
 * Majlis does not host the call, and this page does not pretend to. There is
 * one field for the board's own tool — Teams, Zoom, a room with a table — and
 * everything else here is what a call leaves behind: who was there, what was
 * discussed, and which matters it was discussed under.
 *
 * ── the page leads with the clock ─────────────────────────────────────────
 *
 * Meeting cadence is the one deadline with a regulatory floor behind it and
 * was the last of the six clocks with nothing to count from. So the first
 * thing here is when the board last met and when it is next due — and where
 * nothing has been recorded, the server's own sentence saying that is an
 * absence in this record rather than a finding about the board.
 *
 * ── and it decides nothing ────────────────────────────────────────────────
 *
 * No control here approves anything. An agenda item that names a matter links
 * to it, and the decision lives there with the votes and the reasons attached
 * to them. A minute is an account of a discussion.
 */

function tone(state: MeetingRow['state']): 'warn' | 'gold' | 'ok' | undefined {
  if (state === 'closed') return 'ok';
  if (state === 'held') return 'warn';
  if (state === 'convened') return 'gold';
  return undefined;
}

/**
 * One meeting, and the controls for the state it is in.
 *
 * Attendance and the minute are offered only while it is open. A closed
 * meeting shows what it holds and nothing to change it with, which is the
 * interface saying the same thing the server does: a board approves its
 * minutes and they stop moving.
 */
function MeetingCard({
  row,
  board,
  canKeep,
  canClose,
  onChanged,
}: {
  row: MeetingRow;
  board: Board | null;
  canKeep: boolean;
  canClose: boolean;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const m = row.meeting;
  const [open, setOpen] = useState(row.state !== 'closed');
  const [minute, setMinute] = useState(m.minute);
  const [present, setPresent] = useState<Record<string, boolean>>(
    Object.fromEntries(m.attendance.map((a) => [a.scholarId, a.present])),
  );
  const [notes, setNotes] = useState<Record<string, string>>(
    Object.fromEntries(m.attendance.flatMap((a) => (a.note ? [[a.scholarId, a.note]] : []))),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const saveAttendance = () => {
    // Only members the board actually answered for. Sending an entry for
    // everybody would write down an absence nobody recorded.
    const attendance: Attendance[] = Object.entries(present).map(([scholarId, was]) => ({
      scholarId,
      present: was,
      note: notes[scholarId]?.trim() || undefined,
    }));
    return run(() => oversight.recordAttendance(m.id, attendance));
  };

  return (
    <Card>
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <Tag tone={tone(row.state)}>{t(`meet.${row.state}`)}</Tag>
        <span className="font-mono text-[12.5px] tabular-nums">
          <DateText iso={m.at} />
        </span>
        {m.joinUrl && (
          <a
            href={m.joinUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[12px] text-muted underline underline-offset-2 hover:text-paper"
          >
            {t('meet.join')}
          </a>
        )}
      </div>

      {/* The agenda, with each item that is a matter linking to it. */}
      <ul className="mb-2 space-y-1">
        {m.agenda.map((item, i) => (
          <li key={i} className="text-[13px] leading-snug">
            {item.matterId ? (
              <Link to={`/matters/${item.matterId}`} className="underline underline-offset-2 hover:text-fg">
                {item.item}
              </Link>
            ) : (
              item.item
            )}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-[12px] text-muted underline underline-offset-2 hover:text-paper"
      >
        {open ? t('meet.hide') : t('meet.show')}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {/* ── who was there ───────────────────────────────────────────── */}
          <div>
            <div className="mb-1.5 text-[11px] uppercase tracking-wider text-muted">
              {t('meet.attendance')}
            </div>

            {canKeep && row.state !== 'closed' && board ? (
              <div className="space-y-1.5">
                {board.members.map((member) => (
                  <div key={member.id} className="flex flex-wrap items-center gap-2">
                    <label className="flex min-w-[180px] cursor-pointer items-center gap-2 text-[13px]">
                      <input
                        type="checkbox"
                        checked={present[member.id] ?? false}
                        onChange={(e) =>
                          setPresent({ ...present, [member.id]: e.target.checked })
                        }
                      />
                      {member.name}
                    </label>
                    {/*
                      A reason for an absence, where the board gives one. It
                      travels into the annual report with the figure, because a
                      framework that sets an attendance floor expects absence
                      to be explicable.
                    */}
                    {present[member.id] === false && (
                      <input
                        value={notes[member.id] ?? ''}
                        onChange={(e) => setNotes({ ...notes, [member.id]: e.target.value })}
                        placeholder={t('meet.absenceNote')}
                        className="flex-1 rounded border border-line bg-transparent px-2 py-1 text-[12.5px]"
                      />
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  disabled={busy}
                  onClick={saveAttendance}
                  className="rounded border border-line px-3 py-1.5 text-[12.5px] text-muted hover:border-muted hover:text-paper disabled:opacity-40"
                >
                  {t('meet.saveAttendance')}
                </button>
              </div>
            ) : (
              <ul className="space-y-1 text-[12.5px]">
                {m.attendance.map((a) => (
                  <li key={a.scholarId}>
                    <span className={a.present ? '' : 'text-muted'}>
                      {a.scholarId} · {t(a.present ? 'meet.present' : 'meet.absent')}
                    </span>
                    {a.note && <span className="text-muted"> — {a.note}</span>}
                  </li>
                ))}
                {m.attendance.length === 0 && (
                  <li className="text-muted">{t('meet.noAttendance')}</li>
                )}
              </ul>
            )}

            {/*
              Named rather than assumed absent. Writing them down as absent
              would assert an absence nobody recorded.
            */}
            {row.unaccountedFor.length > 0 && (
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
                {t('meet.unaccounted')}: {row.unaccountedFor.join(', ')}
              </p>
            )}
          </div>

          {/* ── the minute ──────────────────────────────────────────────── */}
          <div>
            <div className="mb-1.5 text-[11px] uppercase tracking-wider text-muted">
              {t('meet.minute')}
            </div>

            {canKeep && row.state !== 'closed' ? (
              <>
                <textarea
                  value={minute}
                  onChange={(e) => setMinute(e.target.value)}
                  rows={4}
                  placeholder={t('meet.minuteHint')}
                  className="w-full rounded border border-line bg-transparent px-3 py-2 text-[13px] leading-relaxed"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => oversight.writeMinute(m.id, minute))}
                  className="mt-1.5 rounded border border-line px-3 py-1.5 text-[12.5px] text-muted hover:border-muted hover:text-paper disabled:opacity-40"
                >
                  {t('meet.saveMinute')}
                </button>
              </>
            ) : (
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
                {m.minute || <span className="text-muted">{t('meet.noMinute')}</span>}
              </p>
            )}
          </div>

          {error && (
            <p className="rounded border border-warn/50 px-3 py-2 text-[12.5px] leading-relaxed text-warn">
              {error}
            </p>
          )}

          {/*
            Closing is the board approving the minute. After it nothing about
            the meeting changes, and there is no control here that would.
          */}
          {canClose && row.state !== 'closed' && (
            <div>
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => oversight.closeMeeting(m.id))}
                className="rounded border border-gold/60 px-3.5 py-1.5 text-[13px] text-goldsoft hover:bg-gold/10 disabled:opacity-40"
              >
                {t('meet.close')}
              </button>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
                {t('meet.closeMeans')}
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function Meetings() {
  const { t } = useI18n();
  const { identity } = useIdentity();
  const [data, setData] = useState<MeetingsData | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [failed, setFailed] = useState(false);

  const [convening, setConvening] = useState(false);
  const [at, setAt] = useState('');
  const [joinUrl, setJoinUrl] = useState('');
  const [agenda, setAgenda] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    oversight
      .meetings()
      .then((d) => {
        if (!d || !Array.isArray(d.meetings)) {
          setFailed(true);
          return;
        }
        setData(d);
        return api.board(d.boardId).then(setBoard).catch(() => undefined);
      })
      .catch(() => setFailed(true));

  useEffect(() => {
    void load();
  }, []);

  if (failed) return <ErrorText />;
  if (!data) return <Loading />;

  const office = identity?.office ?? null;
  const canConvene = office === 'chair';
  const canKeep = office === 'chair' || office === 'secretary';

  async function convene(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await oversight.convene({
        boardId: data!.boardId,
        at: new Date(at).toISOString(),
        joinUrl: joinUrl.trim() || null,
        // One item per line. A board writing an agenda is writing a list, and
        // a form with an "add item" button for each line is a form nobody
        // finishes.
        agenda: agenda
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line !== '')
          .map((item) => ({ item })),
      });
      setConvening(false);
      setAgenda('');
      setJoinUrl('');
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-[19px] font-semibold tracking-tight">{t('meet.title')}</h1>
      <p className="mb-4 max-w-prose text-[13px] leading-relaxed text-muted">{t('meet.intro')}</p>

      {/*
        The clock first. Cadence is the one deadline with a regulatory floor
        behind it, and it was the last of the six with nothing to count from.
      */}
      <div
        className={
          'mb-5 rounded-lg border px-4 py-3 ' +
          (data.cadence.overdue ? 'border-warn/60 bg-warn/[0.05]' : 'border-line')
        }
      >
        {data.cadence.dueBy ? (
          <>
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-[13px]">
              <span>
                <span className="text-muted">{t('meet.lastHeld')} </span>
                <DateText iso={data.cadence.lastHeldAt} />
              </span>
              <span className={data.cadence.overdue ? 'text-warn' : ''}>
                <span className="text-muted">{t('meet.dueBy')} </span>
                <DateText iso={data.cadence.dueBy} />
              </span>
              {data.cadence.nextConvenedAt && (
                <span>
                  <span className="text-muted">{t('meet.nextConvened')} </span>
                  <DateText iso={data.cadence.nextConvenedAt} />
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{data.cadence.note}</p>
          </>
        ) : (
          // The server's own sentence: an absence in this record rather than a
          // finding about a board that may have met for years without it.
          <p className="text-[12.5px] leading-relaxed text-muted">{data.cadence.note}</p>
        )}
      </div>

      {canConvene && !convening && (
        <button
          type="button"
          onClick={() => setConvening(true)}
          className="mb-5 rounded border border-line px-3 py-1.5 text-[13px] text-muted hover:border-muted hover:text-paper"
        >
          {t('meet.convene')}
        </button>
      )}

      {canConvene && convening && (
        <form onSubmit={convene} className="mb-5 rounded-lg border border-line px-4 py-3.5">
          {/*
            Wrapping labels rather than sitting beside the field. A label a
            screen reader cannot associate with its input is a label only some
            people have.
          */}
          <label className="mb-2.5 block">
            <span className="mb-1 block text-[11px] uppercase tracking-wider text-muted">
              {t('meet.when')}
            </span>
            <input
              type="datetime-local"
              value={at}
              onChange={(e) => setAt(e.target.value)}
              className="w-full rounded border border-line bg-transparent px-3 py-2 text-[13px]"
            />
          </label>

          <label className="mb-2.5 block">
            <span className="mb-1 block text-[11px] uppercase tracking-wider text-muted">
              {t('meet.agenda')}
            </span>
            <textarea
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              rows={3}
              placeholder={t('meet.agendaHint')}
              className="w-full rounded border border-line bg-transparent px-3 py-2 text-[13px]"
            />
          </label>

          <label className="mb-3 block">
            <span className="mb-1 block text-[11px] uppercase tracking-wider text-muted">
              {t('meet.joinUrl')}
            </span>
            <input
              value={joinUrl}
              onChange={(e) => setJoinUrl(e.target.value)}
              placeholder={t('meet.joinUrlHint')}
              className="w-full rounded border border-line bg-transparent px-3 py-2 text-[13px]"
            />
          </label>

          {error && (
            <p className="mb-2.5 rounded border border-warn/50 px-3 py-2 text-[12.5px] leading-relaxed text-warn">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy || !at}
              className="rounded border border-gold/60 px-3.5 py-1.5 text-[13px] text-goldsoft disabled:opacity-40"
            >
              {t('meet.conveneIt')}
            </button>
            <button
              type="button"
              onClick={() => {
                setConvening(false);
                setError(null);
              }}
              className="rounded border border-line px-3 py-1.5 text-[13px] text-muted"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}

      {data.meetings.length === 0 ? (
        <p className="text-[12.5px] leading-relaxed text-muted">{t('meet.none')}</p>
      ) : (
        <div className="space-y-3">
          {data.meetings.map((row) => (
            <MeetingCard
              key={row.meeting.id}
              row={row}
              board={board}
              canKeep={canKeep}
              canClose={canConvene}
              onChanged={() => void load()}
            />
          ))}
        </div>
      )}

      {/*
        Attendance across the year, which is what GS-1 asks the annual report
        for. Per member rather than averaged: a board that met four times with
        one member at none is a different board from one where everybody came
        three times, and a percentage hides exactly that.
      */}
      {data.attendance.some((a) => a.of > 0) && (
        <div className="mt-6">
          <h2 className="mb-2 text-[15px] font-semibold">{t('meet.attendanceAcross')}</h2>
          <ul className="space-y-1.5">
            {data.attendance.map((a) => (
              <li key={a.scholarId} className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[13px]">{a.name}</span>
                <span className="font-mono text-[12.5px] tabular-nums text-muted">
                  {a.attended} {t('reg.of')} {a.of}
                  {a.notes.length > 0 && <span> · {a.notes.join('; ')}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
