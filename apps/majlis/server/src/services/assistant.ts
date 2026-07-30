import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'node:crypto';
import type { AssistantExchange, SourceRef } from '../types.js';

/**
 * The comprehension assistant.
 */

export const ASSISTANT_MODEL = 'claude-sonnet-4-6';
export const CLASSIFIER_MODEL = 'claude-haiku-4-5';

const SYSTEM_PROMPT = `You explain financial and blockchain technology to Shariah scholars who serve on the board governing the Gravitas Protocol policy registry.

Your readers are senior jurists. They are expert in fiqh and in Islamic finance. They are not engineers, and they should never be made to feel that they ought to be. Explain mechanism the way a competent engineer would explain it to a competent lawyer: precisely, in ordinary language, without condescension and without jargon left unexplained.

ABSOLUTE CONSTRAINT — you do not issue, imply, suggest, estimate or approximate Shariah rulings.

You describe how a mechanism works. You do not say whether it is permissible, impermissible, compliant, non-compliant, halal, haram, problematic, acceptable, or safe from a Shariah perspective.

The following are all forbidden, because each is a ruling wearing a disguise:

- summarising what scholars hold, have held, or would likely hold on a matter
- describing the majority or minority view, or characterising a difference of opinion
- listing "considerations", "factors", "arguments for and against", or "things the board might weigh" in relation to permissibility
- naming which fiqh concepts a mechanism "raises", "engages", "implicates" or "touches on"
- answering the fiqh part of a question that also contains a mechanical part
- saying what you would do, or what a reasonable board would do

If a question turns on a ruling — wholly or in part, directly or indirectly — say so plainly and stop. You may then offer to explain the mechanism the ruling would attach to, which is the useful thing you can actually do.

This is not modesty. Your explanation may be the basis on which a scholar rules. An explanation dressed as an answer would substitute your judgement for his, and you have no standing to make that judgement.

You may state, as facts about a mechanism, the matters a jurist reads for: whether an outcome is knowable in advance, when settlement occurs, who holds what at each moment, whether a step can fail halfway. State them as properties of the system. Never label them with a fiqh category and never evaluate them.

SOURCES — every substantive claim must be attributable. Where you rely on the protocol's own code, tests or documentation, name the file. Where you rely on general knowledge of how a public protocol works, say so explicitly and mark it as general knowledge rather than as something verified in this codebase. Never invent a file path, a test name or a line reference. If you do not know where something is, say so.

UNCERTAINTY — where you are not confident, say so in the answer itself and recommend the question be put to the technical liaison in writing. A correct answer tomorrow is worth more than a fluent answer now.

STYLE — plain, measured, no marketing language, no enthusiasm, no flattery. Short paragraphs. Define a technical term the first time you use it.`;

const CLASSIFIER_PROMPT = `You classify questions put to a technical assistant that serves Shariah scholars. The assistant explains how financial mechanisms work. It is forbidden from giving Shariah evaluations of any kind.

Answer YES if the question seeks a Shariah evaluation, directly OR indirectly. This includes:
- whether something is permissible, impermissible, halal, haram, valid, compliant
- whether something involves or constitutes riba, gharar, maysir, or any fiqh category
- what scholars hold, have held, generally think, or would likely conclude
- the majority view, the minority view, or the shape of a difference of opinion
- considerations, factors, arguments, or "things to weigh" bearing on permissibility
- which fiqh concepts a mechanism raises, engages, implicates or touches on
- how a board should decide, vote, approach, or think about a matter
- comparison of fiqh positions or schools
- any of the above embedded anywhere inside a longer question about mechanism
- any of the above framed hypothetically, historically, academically, or as a request for "context" or "background"

Answer NO only if the question asks purely how something works: the sequence of operations, who holds what and when, what can fail and what follows from failure, what a parameter does, what changed between two versions, what a term means technically.

If a question contains both a mechanical part and an evaluative part, answer YES.
If you are unsure, answer YES.

Reply with exactly one word: YES or NO.`;

const RULING_PATTERNS: RegExp[] = [
  // direct
  /\bis\s+(?:it|this|that|there)\s+(?:halal|haram|permissible|impermissible|allowed|forbidden|compliant|valid)\b/i,
  /\b(?:halal|haram|permissible|impermissible)\s+or\s+not\b/i,
  /\bwould\s+(?:it|this|that)\s+be\s+(?:halal|haram|permissible|impermissible|allowed|acceptable|valid)\b/i,
  /\bcan\s+(?:i|we|a\s+muslim|muslims)\s+(?:invest|trade|buy|sell|use|hold)\b/i,
  /\bdoes\s+(?:it|this|that)\s+(?:involve|constitute|amount\s+to|raise|engage|implicate)\s+(?:riba|gharar|maysir|usury)\b/i,
  /\bis\s+(?:it|this|that)\s+(?:riba|gharar|maysir)\b/i,
  /\bshould\s+(?:the\s+board|we|i)\s+(?:approve|permit|allow|reject|refuse)\b/i,
  /\bwhat\s+(?:is|would\s+be)\s+the\s+(?:ruling|hukm|fatwa)\b/i,
  /\brule\s+on\s+(?:this|it|the\s+following)\b/i,
  /\bhow\s+should\s+(?:the\s+board|we|i)\s+(?:vote|decide|rule|approach|think)\b/i,

  // indirect
  /\bwhat\s+(?:do|would)\s+scholars\s+(?:generally\s+)?(?:hold|say|think|consider)\b/i,
  /\b(?:summari[sz]e|outline|describe|explain)\s+(?:the\s+)?(?:scholarly|fiqh|juristic|shariah|islamic)\s+(?:views?|positions?|opinions?|debate|perspective)\b/i,
  /\b(?:majority|minority|prevailing|dominant)\s+(?:view|opinion|position)\b/i,
  /\bdifferences?\s+of\s+opinion\b/i,
  /\bconsiderations?\s+(?:that|which)\s+(?:would\s+)?(?:suggest|indicate|point|bear)\b/i,
  /\b(?:arguments?|considerations?|factors?)\s+(?:for\s+and\s+against|in\s+favou?r\s+of|against)\b/i,
  /\bwhat\s+(?:fiqh|shariah|islamic)\s+(?:concepts?|categories|issues?|concerns?|principles?)\b/i,
  /\bwhat\s+(?:would|might)\s+(?:a\s+)?(?:scholar|jurist|board|mufti)\s+(?:consider|look\s+at|weigh|focus|care)\b/i,
  /\bfrom\s+an?\s+(?:shariah|fiqh|islamic)\s+(?:perspective|standpoint|point\s+of\s+view|lens)\b/i,
  /\bshariah\s+implications?\b/i,
  /\bis\s+there\s+(?:any\s+)?(?:riba|gharar|maysir)\b/i,
  /\b(?:raises?|engages?|implicates?|touches\s+on)\s+(?:any\s+)?(?:riba|gharar|maysir|fiqh|shariah)\b/i,
];

export function seeksRuling(question: string): boolean {
  return RULING_PATTERNS.some((re) => re.test(question));
}

export async function seeksRulingSemantic(
  question: string,
  client: Anthropic,
): Promise<{ seeks: boolean; reachable: boolean }> {
  try {
    const res = await client.messages.create({
      model: CLASSIFIER_MODEL,
      max_tokens: 5,
      messages: [
        { role: 'user', content: `${CLASSIFIER_PROMPT}\n\nQuestion: ${question}` }
      ],
    });
    const verdict = (res.content[0].type === 'text' ? res.content[0].text : '').trim().toUpperCase();
    return { seeks: !verdict.startsWith('NO'), reachable: true };
  } catch (err) {
    console.error('Classifier error:', err);
    return { seeks: true, reachable: false };
  }
}

const RULING_REFUSAL =
  'This question asks for a ruling, and I am not able to give one. That judgement belongs to the board ' +
  'and I have no standing to anticipate it, even indirectly.\n\n' +
  'What I can do is describe the mechanism the ruling would attach to: what happens, in what order, who ' +
  'holds what at each point, what can fail and what the consequence of failure is. If you tell me which ' +
  'mechanism is in view, I will set it out and you can rule on it with the facts in front of you.';

const UNAVAILABLE_REFUSAL =
  'I could not complete the check that confirms a question asks about mechanism rather than about a ' +
  'ruling, so I have not answered it.\n\n' +
  'This is deliberate. Where that check cannot run, the assistant declines rather than proceeding, ' +
  'because an unchecked answer carries a risk that a delayed answer does not. Please try again, or put ' +
  'the question to the technical liaison in writing.';

const OUTPUT_VIOLATIONS: RegExp[] = [
  /\b(?:this|it|that)\s+(?:is|would\s+be)\s+(?:halal|haram|permissible|impermissible|shariah[- ]compliant|non[- ]compliant)\b/i,
  /\bwould\s+be\s+(?:halal|haram|permissible|impermissible)\b/i,
  /\bi\s+(?:would\s+)?(?:recommend|suggest|advise)\s+(?:approving|rejecting|permitting|refusing)\b/i,
  /\bfrom\s+a\s+shariah\s+perspective,?\s+(?:this|it)\s+(?:is|would\s+be)\b/i,
  /\bscholars\s+(?:generally\s+)?(?:hold|agree|consider|maintain|are\s+of\s+the\s+view)\b/i,
  /\bthe\s+(?:majority|minority|prevailing|dominant)\s+(?:view|opinion|position)\s+(?:is|holds)\b/i,
  /\b(?:some|many|most)\s+(?:scholars|jurists|muftis)\s+(?:hold|say|consider|view|regard)\b/i,
  /\bthis\s+(?:raises|engages|implicates|touches\s+on)\s+(?:the\s+)?(?:question\s+of\s+)?(?:riba|gharar|maysir)\b/i,
  /\bconsiderations?\s+(?:the\s+board|a\s+scholar)\s+(?:might|would|may)\s+weigh\b/i,
  /\bwhether\s+(?:this|it)\s+(?:is|constitutes)\s+(?:riba|gharar|maysir)\s+(?:depends|is\s+a\s+matter)\b/i,
];

export function outputBreachesConstraint(answer: string): boolean {
  return OUTPUT_VIOLATIONS.some((re) => re.test(answer));
}

const UNCERTAINTY_MARKERS: RegExp[] = [
  /\bi (?:am|'m) not (?:certain|sure|confident)\b/i,
  /\bi do not know\b/i,
  /\bi don't know\b/i,
  /\bput (?:this|the) question to the technical liaison\b/i,
  /\bshould be confirmed (?:with|by)\b/i,
  /\bcannot verify\b/i,
];

export function looksUncertain(answer: string): boolean {
  return UNCERTAINTY_MARKERS.some((re) => re.test(answer));
}

export interface AskOptions {
  question: string;
  scholarId?: string | null;
  context?: string;
  client?: any;
  skipSemanticGate?: boolean;
}

export type AskResult = AssistantExchange;

function extractSources(answer: string): SourceRef[] {
  const found = new Map<string, SourceRef>();
  const fileRe = /\b((?:contracts|test|src|docs|integration-kit)\/[A-Za-z0-9._\-/]+)\b/g;
  let m: RegExpExecArray | null;
  while ((m = fileRe.exec(answer)) !== null) {
    const ref = m[1];
    if (!found.has(ref)) {
      found.set(ref, {
        kind: ref.startsWith('test/') ? 'test' : ref.startsWith('docs/') ? 'document' : 'code',
        label: ref.split('/').pop() ?? ref,
        ref,
      });
    }
  }
  return [...found.values()];
}

export async function ask(opts: AskOptions): Promise<AskResult> {
  const at = new Date().toISOString();
  const base = {
    id: randomUUID(),
    at,
    scholarId: opts.scholarId ?? null,
    question: opts.question,
    model: ASSISTANT_MODEL,
  };

  if (seeksRuling(opts.question)) {
    return {
      ...base,
      answer: RULING_REFUSAL,
      sources: [],
      declinedAsRuling: true,
      escalated: false,
    };
  }

  const client = opts.client ?? new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  if (!opts.skipSemanticGate) {
    const verdict = await seeksRulingSemantic(opts.question, client);
    if (verdict.seeks) {
      return {
        ...base,
        answer: verdict.reachable ? RULING_REFUSAL : UNAVAILABLE_REFUSAL,
        sources: [],
        declinedAsRuling: verdict.reachable,
        escalated: !verdict.reachable,
      };
    }
  }

  const userContent = opts.context
    ? `Context the scholar is currently reading:\n\n${opts.context}\n\n---\n\nQuestion: ${opts.question}`
    : opts.question;

  const response = await client.messages.create({
    model: ASSISTANT_MODEL,
    max_tokens: 1400,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: userContent }
    ],
    thinking: { type: 'enabled', budget_tokens: 1024 }
  });

  const answer = response.content[0].type === 'text' ? response.content[0].text : '';

  if (outputBreachesConstraint(answer)) {
    return {
      ...base,
      answer:
        'I began to answer in terms that would have amounted to a ruling, which I am not able to give. ' +
        'The question has been referred to the technical liaison, who will answer the mechanical part of ' +
        'it in writing within the record.',
      sources: [],
      declinedAsRuling: true,
      escalated: true,
    };
  }

  return {
    ...base,
    answer,
    sources: extractSources(answer),
    declinedAsRuling: false,
    escalated: looksUncertain(answer),
  };
}
