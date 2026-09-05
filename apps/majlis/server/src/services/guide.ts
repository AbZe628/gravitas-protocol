/**
 * How this application works, answered without a model.
 *
 * The complaint this exists to answer: *an application full of good solutions
 * nobody will ever discover.* A board member opening Majlis for the first time
 * meets words it never explains — matter, direction, timelock, drift, standing,
 * passage, adoption — and screens whose purpose is obvious only to whoever
 * built them. Documentation nobody opens is not an answer to that.
 *
 * So the application can be asked about itself, from anywhere, at any time.
 *
 * ── and it is not the assistant ───────────────────────────────────────────
 *
 * Nothing here is generated and no question leaves the building. The subject is
 * **Majlis** — what a screen is for, what a word means, what an act does, what
 * happens next — which is knowledge this codebase has and a language model
 * would only be guessing at. It is instant, it is the same every time, and it
 * works in the installations that have no assistant, which is most of them.
 *
 * The assistant answers a different question: *how does this financial
 * mechanism work.* That one genuinely needs a model, is off unless an
 * institution turns it on, and is bounded by three gates. Where a question is
 * about a mechanism rather than about this application, the answer says so and
 * points there rather than guessing.
 *
 * ── the one thing it will never do ────────────────────────────────────────
 *
 * It does not say whether anything is permissible. Not for a contract, not for
 * an instrument, not in general, and not by summarising what scholars hold. A
 * guide that answered *is this halal* would be the whole application's
 * guarantee broken by its help text — so a question that seeks a ruling is
 * refused here as it is everywhere else, and the refusal offers what this can
 * properly do instead.
 */

export interface GuideAnswer {
  /** What the question was matched to. Null where nothing matched. */
  topic: string | null;
  answer: string;
  /** Where in the application this is, when it is somewhere. */
  goTo: { label: string; path: string } | null;
  /** Related things a reader is likely to want next. */
  seeAlso: string[];
  /**
   * True where the question sought a ruling and was refused.
   *
   * Carried so an interface can show a refusal as what it is rather than as an
   * answer that happens to be unhelpful.
   */
  refused: boolean;
}

interface Topic {
  id: string;
  /** Words that mean this topic. Matched whole, so `vote` does not catch `votes`
   * by accident and `drift` does not catch `driftwood`. */
  terms: string[];
  answer: string;
  goTo?: { label: string; path: string };
  seeAlso?: string[];
}

/*
 * The ruling gate, first and without exception.
 *
 * The same shape as the assistant's own lexical gate. A guide is a likelier
 * place to be asked "is this halal" than the assistant is, because it is the
 * thing that looks like it will answer anything.
 */
const SEEKS_A_RULING: readonly RegExp[] = [
  /\b(?:is|are|would)\s+(?:it|this|that|they)\s+(?:halal|haram|permissible|impermissible|allowed|lawful)\b/i,
  /\b(?:halal|haram)\s*\?/i,
  /\bis\s+.{1,60}\s+(?:halal|haram|permissible|impermissible|shariah[- ]compliant)\b/i,
  /\b(?:can|may|should)\s+(?:we|the board|i)\s+(?:approve|permit|allow|reject|refuse)\b/i,
  // "how should we vote" and plain "should we vote for it" alike. The word
  // "how" was doing load-bearing work it should never have been trusted with.
  /\b(?:how\s+)?should\s+(?:we|i|the\s+board)\s+(?:vote|rule|decide|approve|permit|refuse)\b/i,
  /\bwhat\s+(?:do|would)\s+(?:scholars|jurists|the majority)\s+(?:say|hold)\b/i,
  /\b(?:which|that)\s+(?:is|are|would\s+be)\s+(?:halal|haram|permissible|impermissible)\b/i,
];

export const NOT_A_RULING =
  'This is the guide to using Majlis, and it does not answer whether something ' +
  'is permissible — not for a contract, not for an instrument, and not by ' +
  'summarising what others hold. That is the board’s, and an application that ' +
  'answered it in its help text would have broken its own guarantee in the one ' +
  'place nobody was watching. What it can do is show you where the question ' +
  'goes: open a matter, set out what actually happens, cite what it turns on, ' +
  'state the conditions, and record your position with your reasoning.';

const TOPICS: readonly Topic[] = [
  {
    id: 'matter',
    terms: ['matter', 'matters', 'question', 'case', 'proposal'],
    answer:
      'A matter is one question put to the board. It holds the question as it was asked, what ' +
      'actually happens, what is deliberately not being decided, what it rests on, the operative ' +
      'terms, everything said about it and every position taken. A ruling is what comes out of ' +
      'one.',
    goTo: { label: 'What needs you', path: '/' },
    seeAlso: ['direction', 'passage', 'terms'],
  },
  {
    id: 'direction',
    terms: ['direction', 'permit', 'permitting', 'restrict', 'restricting'],
    answer:
      'Whether a matter permits something or restricts it, and it is not a label — it decides how ' +
      'the matter is treated. Permitting carries the full quorum and a delay before it takes ' +
      'effect, so a member who sees something can object in time. Restricting takes effect at ' +
      'once on a reduced quorum, because waiting is the greater risk there, and is then ratified ' +
      'within a window or it lapses.',
    seeAlso: ['timelock', 'quorum'],
  },
  {
    id: 'passage',
    terms: ['passage', 'next', 'step', 'steps', 'stage', 'order'],
    answer:
      'Where a matter stands and what the next act is. Putting a question into shape happens in ' +
      'whatever order the work happens, so those steps are a set. Deciding waits on itself — ' +
      'somebody speaks, the vote opens, positions are recorded, the vote is closed — so those are ' +
      'a sequence. Only one step is actually required before a vote: that something has been said.',
    seeAlso: ['matter', 'quorum'],
  },
  {
    id: 'timelock',
    terms: ['timelock', 'delay', 'objection', 'object'],
    answer:
      'The delay between a permitting vote closing and the ruling taking effect. Any member may ' +
      'object during it. A restriction has no delay: it takes effect at once and is ratified ' +
      'afterwards.',
    seeAlso: ['direction'],
  },
  {
    id: 'quorum',
    terms: ['quorum', 'threshold', 'tally', 'majority'],
    answer:
      'How many signatures a matter needs, and it differs by direction: the full quorum to ' +
      'permit, a reduced one to restrict. Abstentions never count toward it. Reaching the ' +
      'threshold permits the vote to be closed — it never closes it, because a decision that ' +
      'happened because a counter reached a number is a decision nobody took.',
    seeAlso: ['direction', 'vote'],
  },
  {
    id: 'vote',
    terms: ['vote', 'voting', 'position', 'reasoning', 'reason'],
    answer:
      'A position with your reasoning in your own words, and the reasoning is required. A tally ' +
      'of names without reasons is a show of hands, and a board that cannot say why it decided ' +
      'cannot be followed the next time. Your position is recorded against the hash of the exact ' +
      'terms it was cast on, so whether you approved these words is a comparison rather than a ' +
      'recollection.',
    seeAlso: ['terms', 'quorum'],
  },
  {
    id: 'terms',
    terms: ['terms', 'parameters', 'parameter', 'hash', 'operative'],
    answer:
      'The operative terms are a key, a value, a unit and what it does — the part a system can ' +
      'carry out and an auditor can test against. They stop moving when the vote opens, and every ' +
      'position afterwards carries their hash.',
    seeAlso: ['vote', 'carrying'],
  },
  {
    id: 'carrying',
    terms: ['carrying', 'enforced', 'enforcement', 'registry', 'checked'],
    answer:
      'When the terms get checked. Where nothing is attached they are carried out by whatever the ' +
      'institution already uses and tested when somebody looks — which means a breach can stand ' +
      'between reviews. Where an enforcing registry is attached they are read before every ' +
      'transaction that depends on them, and the transaction that would breach one does not ' +
      'execute. Majlis records; it never carries anything out.',
    seeAlso: ['terms', 'drift'],
  },
  {
    id: 'drift',
    terms: ['drift', 'drifted', 'crossed', 'composition'],
    answer:
      'When the ground moves under a ruling. A pool that was 51% tangible in March is 47% in ' +
      'July because it rebalanced, and nobody did anything. Majlis compares the composition ' +
      'against the terms the board itself set and raises the question. It does not re-rule: the ' +
      'status stays what the board made it until the board says otherwise.',
    goTo: { label: 'The register', path: '/register' },
    seeAlso: ['carrying', 'register'],
  },
  {
    id: 'register',
    terms: ['register', 'asset', 'assets', 'holding', 'holdings', 'examined'],
    answer:
      'Everything this institution holds or offers, and where each of them stands with the board. ' +
      'Its most useful line is usually the count of holdings never put to the board at all.',
    goTo: { label: 'The register', path: '/register' },
    seeAlso: ['drift', 'matter'],
  },
  {
    id: 'inherit',
    terms: ['inherit', 'inherited', 'precedent', 'before', 'previously', 'last time'],
    answer:
      'Where this board has ruled on a question of the same contract shape before, its own ' +
      'previous answers are offered on the new one: each condition with the finding and the ' +
      'reason it gave, the operative terms, and what it held outside the question. Nothing is ' +
      'filled in. Accepting one records it as your finding, under your name, today — an ' +
      'unreviewed proposal is not an answer.',
    seeAlso: ['checklist', 'matter'],
  },
  {
    id: 'checklist',
    terms: ['checklist', 'condition', 'conditions', 'shape', 'structure', 'library'],
    answer:
      'Choosing a contract shape attaches the conditions this board holds such a contract to, and ' +
      'the board answers each in its own words. A board may also rule against a condition it ' +
      'considers wrongly drawn — that is an answer too. Until a board has adopted a shape, its ' +
      'conditions are a shipped draft, binding on nobody.',
    goTo: { label: 'The library', path: '/library' },
    seeAlso: ['inherit', 'matter'],
  },
  {
    id: 'fatwa',
    terms: ['fatwa', 'ruling', 'document', 'written', 'export'],
    answer:
      'When the board closes the vote and the delay has run, the ruling is assembled: the question ' +
      'put, what occurs, what it does not decide, how it is implemented, the operative terms, and ' +
      'each member’s reasoning attached to their position. It is produced when the board has ' +
      'decided and not before — a page that looked final for an open question would be acted on.',
    goTo: { label: 'What we decided', path: '/record' },
    seeAlso: ['vote', 'record'],
  },
  {
    id: 'record',
    terms: ['record', 'audit', 'history', 'append', 'correction', 'superseded'],
    answer:
      'The record is append-only. Nothing is edited and nothing is deleted: a correction is ' +
      'written as a new entry that supersedes the old one, and what stands is worked out by ' +
      'following that chain rather than by comparing timestamps. A withdrawn source stays visible ' +
      'and stops counting.',
    goTo: { label: 'What we decided', path: '/record' },
    seeAlso: ['fatwa'],
  },
  {
    id: 'roles',
    // 'who' included: "who can vote here" is a question about roles, and the
    // word 'vote' in it would otherwise carry it to the wrong topic entirely.
    terms: ['who', 'role', 'roles', 'signatory', 'advisory', 'liaison', 'observer', 'secretary', 'chair'],
    answer:
      'A signatory deliberates and votes. An advisory member deliberates; their written position ' +
      'is recorded and stays out of the arithmetic. A technical liaison answers what a mechanism ' +
      'actually is and has no vote and no key. An observer reads. The secretary records what the ' +
      'institution did — filing a rectification plan, the directors’ approval — because a board ' +
      'that could record those would be producing a document saying something nobody outside the ' +
      'room ever said.',
    goTo: { label: 'This board', path: '/settings' },
    seeAlso: ['vote'],
  },
  {
    id: 'incident',
    terms: ['incident', 'breach', 'event', 'thirty', 'rectification', 'purification'],
    answer:
      'Something that already happened. The board determines whether it was actual — now, not ' +
      'next quarter — and from that moment thirty days run for a rectification plan. Four of the ' +
      'nine steps belong to the institution rather than to the board, and are not offered to a ' +
      'board member.',
    goTo: { label: 'Events', path: '/incidents' },
    seeAlso: ['roles'],
  },
  {
    id: 'assistant',
    terms: ['assistant', 'ai', 'model', 'chatbot', 'explain'],
    answer:
      'The assistant answers questions of mechanism — what a structure does, how a protocol ' +
      'works — and never whether something is permissible. Three gates enforce that in code ' +
      'rather than in a prompt: known ruling-seeking phrasings are refused before any model runs, ' +
      'a separate classifier reads the intent of everything that survives, and any answer with ' +
      'ruling language in it is discarded and escalated. It is off unless the institution turned ' +
      'it on, because a board’s deliberation is among the most sensitive text it holds.',
    seeAlso: ['roles'],
  },
  {
    id: 'start',
    terms: ['start', 'begin', 'how', 'new', 'raise', 'open', 'first'],
    answer:
      'From the first screen, if you may deliberate, choose what kind of decision it is in your ' +
      'own words and write what is being asked. That opens a draft — nothing is decided by ' +
      'sending it. The shape it is judged against, the conditions and the terms are the board’s, ' +
      'and where this board has ruled on the same shape before, its own answers are offered.',
    goTo: { label: 'What needs you', path: '/' },
    seeAlso: ['matter', 'passage', 'inherit'],
  },
];

const WORDS = /[a-z']+/g;

/**
 * How well a topic answers a question, and where its evidence sits.
 *
 * `hits` is how many of the topic's words were asked. `at` is where the first
 * of them appears, and it breaks ties — because *"who can vote here"* matches
 * `roles` and `vote` equally, and the word that opens a question is the one
 * that says what the question is about. Without it the answer depended on which
 * topic happened to be declared first, which is not a rule anybody could
 * predict or would want.
 */
function score(question: string, topic: Topic): { hits: number; at: number } {
  const lower = question.toLowerCase();
  const asked = new Set(lower.match(WORDS) ?? []);

  let hits = 0;
  let at = Number.MAX_SAFE_INTEGER;

  for (const term of topic.terms) {
    // Whole words only: `vote` should not be found inside `devoted`, and the
    // terms are short enough that substring matching would be noise.
    const matched = term.includes(' ') ? lower.includes(term) : asked.has(term);
    if (!matched) continue;
    hits += 1;

    const where = new RegExp(`\\b${term}\\b`).exec(lower)?.index;
    if (where !== undefined && where < at) at = where;
  }

  return { hits, at };
}

const NOTHING_MATCHED =
  'That is not something this guide knows about. It answers questions about ' +
  'Majlis itself — what a screen is for, what a word means, what an act does, ' +
  'and what happens next. A question about how a financial structure works goes ' +
  'to the assistant where an institution has turned one on, and a question about ' +
  'whether something is permissible goes to the board.';

export function askTheGuide(question: string): GuideAnswer {
  const asked = question.trim();

  // First, and without exception.
  if (SEEKS_A_RULING.some((pattern) => pattern.test(asked))) {
    return { topic: null, answer: NOT_A_RULING, goTo: null, seeAlso: [], refused: true };
  }

  let best: Topic | null = null;
  let bestHits = 0;
  let bestAt = Number.MAX_SAFE_INTEGER;

  for (const topic of TOPICS) {
    const { hits, at } = score(asked, topic);
    if (hits === 0) continue;
    // More words matched wins; on a tie, the one whose word came first in the
    // question does, because that is what the question is about.
    if (hits > bestHits || (hits === bestHits && at < bestAt)) {
      best = topic;
      bestHits = hits;
      bestAt = at;
    }
  }

  if (!best) {
    return { topic: null, answer: NOTHING_MATCHED, goTo: null, seeAlso: [], refused: false };
  }

  return {
    topic: best.id,
    answer: best.answer,
    goTo: best.goTo ?? null,
    seeAlso: best.seeAlso ?? [],
    refused: false,
  };
}

/** Every topic, so an interface can offer them rather than demand a question. */
export function guideTopics(): { id: string; answer: string }[] {
  return TOPICS.map((topic) => ({ id: topic.id, answer: topic.answer }));
}
