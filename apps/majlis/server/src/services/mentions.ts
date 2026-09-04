/**
 * Naming a colleague in a deliberation.
 *
 * A board of five people argues by asking each other things. Until now a
 * question put to one member in particular — *what does the treasury actually
 * do here, and does the liaison agree* — sat in a thread nobody was told about,
 * and whether it was answered depended on who happened to read.
 *
 * ── what a mention does, and what it deliberately does not ────────────────
 *
 * **It puts the matter on that member's attention list.** Nothing more. There
 * is no email here and no push, for the reasons `attention.ts` gives: a service
 * that sends mail needs an account, a sender domain and a deliverability
 * problem, and a mention that claimed to notify while doing nothing would be
 * worse than no mention at all. Attention is where a scholar already looks, so
 * that is where a mention arrives.
 *
 * **It is derived from the text, never stored.** The body is the record. A
 * parallel list of mentions would be a second copy of the truth, and a second
 * copy drifts: the body is edited, the list is not, and the two disagree about
 * what a member was asked. Parsing on read cannot go stale because there is
 * nothing to go stale.
 *
 * **It does not compel.** Being named is a colleague asking, not a duty with a
 * clock behind it. The attention item says so, and carries no deadline.
 *
 * ── and it stops standing when it is answered ─────────────────────────────
 *
 * A mention is outstanding until the member named says something in that matter
 * afterwards. Derived the same way: no flag to clear, no way for the record and
 * the list to disagree, and an answer to one mention answers every mention that
 * preceded it — which is what a conversation actually does.
 */

import type { Board, Deliberation, Matter } from '../types.js';

/**
 * `@` followed by a scholar id.
 *
 * Ids rather than names, because names are ambiguous and change. A board
 * writing this by hand would find that tedious, which is why the composer
 * offers a picker; the parser's job is only to be exact about what it matched.
 *
 * The character class is deliberately the one scholar ids already use, and the
 * `@` has to begin a word. Both halves matter: without the second,
 * `treasury@s1.example` in a pasted document named a member of the board, and a
 * scholar was asked a question by a quotation.
 */
const MENTION = /(^|[^A-Za-z0-9_@.-])@([A-Za-z0-9][A-Za-z0-9_-]{0,63})/g;

/**
 * What matched, without the character in front of it.
 *
 * The `@` has to start a word. Without that guard `treasury@s1.example` in a
 * pasted document named a member of the board, and a scholar would have been
 * asked a question by a quotation.
 */
function nameIn(match: RegExpMatchArray): { id: string; at: number; text: string } {
  const lead = match[1] ?? '';
  return { id: match[2], at: (match.index ?? 0) + lead.length, text: '@' + match[2] };
}

/**
 * Who was named, and who is on the board.
 *
 * Anything that is not a member of this board is ignored rather than reported.
 * A typo naming nobody should read as ordinary text, and a mention of somebody
 * on another board should not be a route to discovering that they exist.
 */
export function mentionedIn(body: string, board: Board): string[] {
  const members = new Set(board.members.map((m) => m.id));
  const found = new Set<string>();

  for (const match of body.matchAll(MENTION)) {
    const { id } = nameIn(match);
    if (members.has(id)) found.add(id);
  }
  return [...found];
}

export interface Mention {
  matterId: string;
  boardId: string;
  /** The deliberation the name appears in. */
  deliberationId: string;
  /** Who named them. */
  by: string;
  at: string;
  /** The whole entry, so a reader can see what they were asked. */
  body: string;
}

/**
 * Mentions of one member in one matter that they have not spoken after.
 *
 * A member who has said something later in the thread has answered — not
 * necessarily well, and not necessarily the question, but the record cannot
 * judge that and should not try. What it can say is whether they have been back
 * since being asked.
 */
export function outstandingFor(scholarId: string, matter: Matter, board: Board): Mention[] {
  const said = matter.deliberation
    .filter((d) => d.scholarId === scholarId)
    .map((d) => d.at)
    .sort();
  const lastSpoke = said[said.length - 1] ?? null;

  return matter.deliberation
    .filter((d) => {
      // Naming yourself is not a question to yourself.
      if (d.scholarId === scholarId) return false;
      if (!mentionedIn(d.body, board).includes(scholarId)) return false;
      return lastSpoke === null || d.at > lastSpoke;
    })
    .map((d) => ({
      matterId: matter.id,
      boardId: matter.boardId,
      deliberationId: d.id,
      by: d.scholarId,
      at: d.at,
      body: d.body,
    }));
}

/** Every mention in a matter, whoever it names. For a reader of the thread. */
export function allIn(matter: Matter, board: Board): Mention[] {
  return matter.deliberation.flatMap((d) =>
    mentionedIn(d.body, board).map((who) => ({
      matterId: matter.id,
      boardId: matter.boardId,
      deliberationId: d.id,
      by: d.scholarId,
      at: d.at,
      body: d.body,
      /** Who was named. Only present on this listing, which is about the names. */
      named: who,
    })),
  ) as (Mention & { named: string })[];
}

/**
 * The sentence an interface shows for a mention.
 *
 * Written here rather than at the surface, so it says the same thing wherever
 * it appears — and so the thing it is careful about survives: being named is a
 * colleague asking, not an instruction.
 */
export function noteFor(mention: Mention, board: Board): string {
  const who = board.members.find((m) => m.id === mention.by);
  return (
    `${who?.name ?? mention.by} named you in the deliberation. That is a colleague asking, not a ` +
    'step the process is waiting on — nothing lapses if you leave it.'
  );
}

/**
 * What a deliberation looks like once the names in it are known.
 *
 * Returned as segments rather than as marked-up text: an interface that had to
 * parse HTML back out of a record would be the record's problem rather than the
 * interface's.
 */
export interface Segment {
  text: string;
  /** Set where this segment is a name the board recognises. */
  scholarId?: string;
}

export function segmentsOf(body: string, board: Board): Segment[] {
  const members = new Set(board.members.map((m) => m.id));
  const out: Segment[] = [];
  let at = 0;

  for (const match of body.matchAll(MENTION)) {
    const { id, at: start, text } = nameIn(match);
    if (!members.has(id)) continue;

    if (start > at) out.push({ text: body.slice(at, start) });
    out.push({ text, scholarId: id });
    at = start + text.length;
  }

  if (at < body.length) out.push({ text: body.slice(at) });
  return out;
}

/** Deliberations naming this member, newest first. For their own reading. */
export function threadFor(scholarId: string, matter: Matter, board: Board): Deliberation[] {
  return matter.deliberation
    .filter((d) => d.scholarId !== scholarId && mentionedIn(d.body, board).includes(scholarId))
    .sort((a, b) => b.at.localeCompare(a.at));
}
