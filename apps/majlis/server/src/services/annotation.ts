/**
 * A note on a passage: what one member marked, and what they wrote about it.
 *
 * The last thing every board portal has that Majlis did not. A director
 * reading the papers marks a sentence and writes beside it, the rest of the
 * board sees the mark where it sits, and the discussion happens against the
 * words rather than against the document as a whole.
 *
 * ── it is not deliberation, and it does not become a ruling ───────────────
 *
 * Deliberation is the argument about the matter and it is what the record
 * shows a regulator. A note is one member saying *look at this line*. Keeping
 * them apart is the point: a board that argued in the margins would have its
 * reasoning scattered across the documents it read instead of held under the
 * matter it decided, and the fatwa is assembled from the latter.
 *
 * So a note carries no position, no vote and no direction. Where a note turns
 * out to be an argument, the member says it in the deliberation, and the
 * interface offers exactly that.
 *
 * ── it anchors to the words, not to a number ──────────────────────────────
 *
 * `quote` is what the member actually marked. `at` is where it was found when
 * they marked it, and it is a hint for finding the same passage quickly — not
 * the anchor. Offsets rot: a document gains a paragraph and every note below
 * it points at the wrong sentence while still looking correct, which is worse
 * than a note that has plainly come loose.
 *
 * So `locate` re-finds the quote in the document as it stands now, and where
 * the quote is no longer there it says so and gives the note back with what
 * was marked. A note that has come loose is still one member's reading of a
 * passage that used to exist, and deleting it would let a document be edited
 * into agreement with itself.
 *
 * ── withdrawn, never deleted ──────────────────────────────────────────────
 *
 * The record is append-only everywhere else and it is append-only here. A
 * member may withdraw a note; the note stays, marked withdrawn, with what it
 * said. A board where a member could erase a reading they had circulated is a
 * board whose record disagrees with what its members saw.
 *
 * ── one reply deep ────────────────────────────────────────────────────────
 *
 * A note may be replied to and a reply may not. Threads that nest turn a
 * margin into a forum, and a member scrolling a document to find where the
 * argument got to is doing the thing this application exists to stop.
 */

/** What is being read. The note is on a passage of one of these. */
export type Annotated =
  /** A matter's proposal — the words the board will decide on. */
  | 'proposal'
  /** A briefing from the technical team. */
  | 'briefing'
  /** A contract or document put in front of the board. */
  | 'document';

export interface Annotation {
  id: string;
  boardId: string;

  /** What is being read, and which one. */
  on: Annotated;
  /** The matter, briefing or document the passage belongs to. */
  subjectId: string;

  /**
   * The words the member marked, exactly as they stood.
   *
   * This is the anchor. Kept verbatim so a note can be shown with what it was
   * about even when the passage it came from is gone.
   */
  quote: string;
  /**
   * Where the quote was found when it was marked. A hint, not the anchor —
   * `locate` re-finds the quote and ignores this when the two disagree.
   */
  at: number;

  /** What the member wrote about it. */
  said: string;

  by: string;
  atTime: string;

  /** The note this replies to, where it is a reply. One deep, never more. */
  replyTo?: string;

  withdrawn?: { by: string; at: string };
}

export type AnnotationRefusal =
  | 'nothing_written'
  | 'nothing_marked'
  | 'passage_not_in_the_document'
  | 'not_on_this_board'
  | 'already_withdrawn'
  | 'not_your_note'
  | 'replies_do_not_nest';

export class Refused extends Error {
  constructor(
    readonly reason: AnnotationRefusal,
    message: string,
  ) {
    super(message);
    this.name = 'Refused';
  }
}

/*
 * Whitespace is normalised on both sides before the quote is looked for.
 *
 * A selection dragged across a line break in the browser carries the break;
 * the same sentence in the stored text carries a single space. Comparing them
 * literally refuses a passage that is plainly there, and a member told their
 * own selection is not in the document they are looking at will not try twice.
 */
const flat = (s: string) => s.replace(/\s+/g, ' ').trim();

export interface MarkInput {
  id: string;
  boardId: string;
  on: Annotated;
  subjectId: string;
  /** The document as it stands, so the quote can be checked against it. */
  text: string;
  quote: string;
  said: string;
  by: string;
  at: string;
  replyTo?: Annotation;
  /** Who is on this board, so a stranger cannot write in its margins. */
  members: readonly { id: string }[];
}

export function mark(input: MarkInput): Annotation {
  const said = input.said.trim();
  const quote = input.quote.trim();

  if (!input.members.some((m) => m.id === input.by)) {
    throw new Refused(
      'not_on_this_board',
      `${input.by} is not on this board. The margins of the papers belong to the people who read them.`,
    );
  }
  if (!said) {
    throw new Refused(
      'nothing_written',
      'Write what you wanted to say about it. A mark with no words is a highlighter.',
    );
  }
  if (input.replyTo) {
    if (input.replyTo.replyTo) {
      throw new Refused(
        'replies_do_not_nest',
        'Reply to the note itself. A thread that nests turns a margin into a forum.',
      );
    }
    /*
     * A reply inherits the passage. It is a reply *about that passage*, and
     * letting it carry its own would let two people argue in one thread about
     * two different sentences.
     */
    return {
      id: input.id,
      boardId: input.boardId,
      on: input.replyTo.on,
      subjectId: input.replyTo.subjectId,
      quote: input.replyTo.quote,
      at: input.replyTo.at,
      said,
      by: input.by,
      atTime: input.at,
      replyTo: input.replyTo.id,
    };
  }

  if (!quote) {
    throw new Refused(
      'nothing_marked',
      'Mark the passage you mean. A note on a whole document is a note nobody can place.',
    );
  }

  const found = flat(input.text).indexOf(flat(quote));
  if (found < 0) {
    throw new Refused(
      'passage_not_in_the_document',
      'That passage is not in this document. A note is kept against the words it was written about, so it cannot be attached to words that are not there.',
    );
  }

  return {
    id: input.id,
    boardId: input.boardId,
    on: input.on,
    subjectId: input.subjectId,
    quote,
    at: found,
    said,
    by: input.by,
    atTime: input.at,
  };
}

/**
 * Withdraw a note. It stays, marked, with what it said.
 *
 * Only the member who wrote it. A secretary tidying somebody else's reading
 * out of the margins would be editing a colleague's record of what they saw.
 */
export function withdraw(current: Annotation, by: string, at: string): Annotation {
  if (current.withdrawn) {
    throw new Refused('already_withdrawn', 'This note was already withdrawn.');
  }
  if (current.by !== by) {
    throw new Refused(
      'not_your_note',
      'A note is withdrawn by whoever wrote it. Somebody else removing it would be editing what a colleague read.',
    );
  }
  return { ...current, withdrawn: { by, at } };
}

/** A note found in the document as it stands now. */
export interface Located {
  annotation: Annotation;
  /**
   * Where the quote is in the text now, or null where it is no longer there.
   *
   * Null is a real answer and the interface shows it: the note is listed with
   * what it was about, apart from the passages that can still be pointed at.
   */
  at: number | null;
  /** True where the note has come loose from the document it was written on. */
  adrift: boolean;
}

export function locate(annotation: Annotation, text: string): Located {
  /*
   * Found in the flattened text, then mapped back to an offset in the original
   * so the interface can mark the real characters. Counting non-space
   * characters is the only mapping that survives runs of whitespace of
   * different lengths on the two sides.
   */
  const needle = flat(annotation.quote);
  if (!needle) return { annotation, at: null, adrift: true };

  const flatIndex = flat(text).indexOf(needle);
  if (flatIndex < 0) return { annotation, at: null, adrift: true };

  let seen = 0;
  let inRun = false;
  for (let i = 0; i < text.length; i++) {
    if (seen === flatIndex && !/\s/.test(text[i])) return { annotation, at: i, adrift: false };
    if (/\s/.test(text[i])) {
      // A run of whitespace counts as the single space the flattened text has.
      if (!inRun && seen > 0) seen++;
      inRun = true;
    } else {
      inRun = false;
      seen++;
    }
  }
  return { annotation, at: null, adrift: true };
}

/**
 * One passage's notes, oldest first, with the replies under the note they
 * answer.
 *
 * Withdrawn notes keep their place. A thread that closed up around a
 * withdrawal would leave replies answering nothing.
 */
export interface Thread {
  note: Located;
  replies: Annotation[];
}

export function threads(all: readonly Annotation[], text: string): Thread[] {
  const byTime = [...all].sort((a, b) => a.atTime.localeCompare(b.atTime));
  const roots = byTime.filter((a) => !a.replyTo);

  return roots.map((note) => ({
    note: locate(note, text),
    replies: byTime.filter((a) => a.replyTo === note.id),
  }));
}

export interface AnnotationSummary {
  /** Notes standing, replies included. */
  standing: number;
  withdrawn: number;
  /** Notes whose passage is no longer in the document. Counted, because it is its own problem. */
  adrift: number;
  /** Who has written in these margins, so a board can see who has read it. */
  by: string[];
}

export function summarise(all: readonly Annotation[], text: string): AnnotationSummary {
  const standing = all.filter((a) => !a.withdrawn);
  return {
    standing: standing.length,
    withdrawn: all.length - standing.length,
    adrift: standing.filter((a) => !a.replyTo && locate(a, text).adrift).length,
    by: [...new Set(standing.map((a) => a.by))].sort(),
  };
}
