import type { Scholar } from '../types.js';

/**
 * What somebody undertook, found in the text of a minute.
 *
 * ── the gap ───────────────────────────────────────────────────────────────
 *
 * A sitting produces two things: a minute, which is prose, and undertakings,
 * which are the board's own clocks. The minute is written once, at the end,
 * and the undertakings are then typed in again from it, by hand, by the person
 * who has just finished writing the prose. What is lost there is lost
 * silently: an obligation nobody re-typed is an obligation with no date on it
 * and nothing that will ever raise it.
 *
 * ── and what this is not ──────────────────────────────────────────────────
 *
 * It records nothing. It reads the minute that is already in the record and
 * hands back sentences with a name and, where there is one, a date — as a
 * draft for the secretary to edit, drop or record. The board's clocks are not
 * started by a machine reading prose.
 *
 * ── it names nobody the board has not ─────────────────────────────────────
 *
 * The only names it can return are the board's own, matched against its member
 * list. A line about *the auditor* or *the treasury desk* carries no board
 * member and is not offered at all, because an undertaking is a member's and
 * guessing whose would be the one mistake worth more than the whole feature.
 */
export interface Undertook {
  /** The sentence, as the minute has it. Edited by a person before anything is recorded. */
  what: string;
  /** A member of this board, matched by name. Never invented. */
  who: string;
  /** Where the sentence carries one, as a date. Absent otherwise — never today. */
  dueAt?: string;
  /** Where in the minute it was found, so an interface can show it in place. */
  at: number;
}

/**
 * The words that make a sentence a commitment rather than a record of one.
 *
 * *Board Member C asked whether the auditor had replied* is a minute of a
 * question. *Board Member C will ask the auditor* is an undertaking. The
 * difference is here, and it is the reason this reads for a verb at all
 * rather than offering every sentence with a name in it: a minute of an hour's
 * discussion names the same five people forty times.
 */
const COMMITS = [
  'will ',
  'shall ',
  'undertakes to ',
  'undertook to ',
  'is to ',
  'are to ',
  'agreed to ',
  'agrees to ',
  'to prepare',
  'to circulate',
  'to confirm',
  'to draft',
];

/** Sentences, with where each one starts. The same reading the contract takes. */
function sentencesOf(text: string): { text: string; at: number }[] {
  const out: { text: string; at: number }[] = [];
  const re = /[^.!?\n]+[.!?]?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const trimmed = m[0].trim();
    if (trimmed.length < 12) continue;
    out.push({ text: trimmed, at: m.index + m[0].indexOf(trimmed[0]) });
  }
  return out;
}

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

/**
 * A date in the sentence, where there is one written out.
 *
 * ── why only two shapes, and why no clock ─────────────────────────────────
 *
 * `2026-11-20` and *20 November 2026*, and nothing else. *Next Tuesday*, *in
 * two weeks*, *before the quarter ends* all mean something only against a day
 * this file does not know and must not assume — the minute may be read a month
 * after the sitting, and a relative date resolved against the wrong day is a
 * clock set wrong with nothing to show it.
 *
 * A year is required. *20 November* with no year is two possible dates and the
 * secretary is the one who knows which; offered without one it would be a
 * guess wearing a date's clothes.
 */
export function dateIn(sentence: string): string | undefined {
  const iso = sentence.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) {
    const at = Date.parse(`${iso[0]}T00:00:00.000Z`);
    return Number.isNaN(at) ? undefined : new Date(at).toISOString();
  }

  const written = sentence
    .toLowerCase()
    .match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\s+(\d{4})\b/);
  if (!written) return undefined;

  const month = MONTHS.indexOf(written[2]);
  if (month === -1) return undefined;

  const day = Number(written[1]);
  const year = Number(written[3]);
  const at = Date.UTC(year, month, day);
  const back = new Date(at);
  /* A day the calendar does not have — 31 November — is not a date. */
  if (back.getUTCMonth() !== month || back.getUTCDate() !== day) return undefined;
  return back.toISOString();
}

/**
 * The member a sentence names, where it names exactly one.
 *
 * Exactly one, deliberately. *Board Member C and Board Member D will prepare
 * the note* is two undertakings or one shared, and which it is, is the
 * secretary's to say — offering it as one member's would put a colleague's
 * name on nothing or theirs on both.
 */
function memberIn(sentence: string, members: readonly Scholar[]): string | null {
  const said = sentence.toLowerCase();
  const hit = members.filter((m) => m.name.trim().length > 0 && said.includes(m.name.toLowerCase()));
  return hit.length === 1 ? hit[0].id : null;
}

/**
 * Read a minute for what members undertook in it.
 *
 * Order is the minute's own: a secretary reading the draft beside the text
 * should find them in the order they were written, not ranked by anything.
 */
export function undertookIn(minute: string, members: readonly Scholar[]): Undertook[] {
  const out: Undertook[] = [];
  for (const sentence of sentencesOf(minute)) {
    const said = sentence.text.toLowerCase();
    if (!COMMITS.some((w) => said.includes(w))) continue;

    const who = memberIn(sentence.text, members);
    if (!who) continue;

    const dueAt = dateIn(sentence.text);
    out.push({ what: sentence.text, who, at: sentence.at, ...(dueAt ? { dueAt } : {}) });
  }
  return out;
}
