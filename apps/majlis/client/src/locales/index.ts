/**
 * Three languages at launch. Most of the scholars this is built for do their
 * serious work in Arabic; an English-only instrument would be an
 * English-speaking instrument.
 *
 * Arabic and Urdu strings below are provided as a working baseline and must
 * be reviewed by a native speaker with knowledge of the subject before any
 * board uses this. Terminology in Islamic finance is precise and a plausible
 * translation is not the same as a correct one.
 */

export type Lang = 'en' | 'ar' | 'ur';

export const LANGS: { code: Lang; label: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'ur', label: 'اردو', dir: 'rtl' },
];

export function dirFor(lang: Lang): 'ltr' | 'rtl' {
  return LANGS.find((l) => l.code === lang)?.dir ?? 'ltr';
}

type Dict = Record<string, string>;

const en: Dict = {
  'app.name': 'Gravitas Majlis',
  'app.stage': 'Stage Two — the board decides here. Nothing here signs.',

  'nav.matters': 'Matters',
  'nav.rules': 'Rules in force',
  'nav.briefings': 'Briefings',
  'nav.assistant': 'Assistant',
  'nav.record': 'Record',

  'dash.title': 'Before the board',
  'dash.none': 'Nothing is currently before the board.',
  'dash.registry': 'Policy Registry',
  'dash.registryReachable': 'Reachable',
  'dash.registryUnreachable': 'Not reachable',
  'dash.stageNotice':
    'The board decides here: matters, deliberation and votes are recorded. Signing authority is not here — ' +
    'a decision taken in Majlis does not itself change the Policy Registry.',

  'whoami.observerTitle': 'You are reading, not taking part',
  'whoami.observerBody':
    'This session is authenticated with the board\u2019s shared credential. It can say that someone from ' +
    'the board is here, but not which member \u2014 and a vote that cannot be attributed is not a record ' +
    'of anything. So it reads, and nothing more. To deliberate, vote or object, each member needs their ' +
    'own credential: set MAJLIS_MEMBERS on the server, one line per member. See apps/majlis/.env.example.',

  'attention.title': 'What is waiting for you',
  'attention.none': 'Nothing is waiting for you.',
  'attention.overdue': 'Past its deadline',
  'attention.remaining': 'left',
  'attention.hours': 'hours',
  'attention.days': 'days',
  'attention.awaiting_your_deliberation': 'Your view has not been recorded',
  'attention.awaiting_your_vote': 'Your vote has not been recorded',
  'attention.objection_window_open': 'You can still object',
  'attention.ready_to_take_effect': 'Ready to take effect',
  'attention.awaiting_ratification': 'Awaiting ratification',
  'attention.overdueKind': 'Lapsed',

  'vote.for': 'In favour',
  'vote.against': 'Against',
  'vote.abstain': 'Abstain',
  'vote.reason': 'Your reasoning',
  'vote.reasonHelp':
    'A position with no reasoning attached cannot be reviewed, cited or disagreed with later. It is required.',
  'vote.submit': 'Record my position',
  'vote.recorded': 'Your position is recorded.',
  'vote.tally': 'Where the vote stands',
  'vote.met': 'Threshold met',
  'vote.notMet': 'Threshold not met',
  'vote.timelockRunning': 'In its timelock',
  'vote.timelockNote':
    'Any one signatory can halt this with a written objection until the clock runs out. It does not take effect before then.',
  'vote.timelockDone': 'The timelock has run',
  'vote.timelockDoneNote': 'Nobody objected. It can now be brought into force.',
  'matter.noDeliberation': 'Nothing has been said on this matter yet.',

  'raise.open': 'Raise a matter',
  'raise.title': 'Raise a matter',
  'raise.subject': 'What is the question',
  'raise.proposal': 'What is proposed',
  'raise.direction': 'What would this change do',
  'raise.directionHelp':
    'This decides how the rest runs. Permitting is slow: the full quorum, then a timelock any one signatory can halt. ' +
    'Restricting is fast: a reduced quorum, immediate effect, and then ratification by the full quorum or it lapses. ' +
    'Choose by what the change does, not by how quickly you would like it decided.',
  'raise.direction.permit': 'It permits something that is not permitted now',
  'raise.direction.restrict': 'It restricts something that is permitted now',
  'raise.origin': 'Why it is being raised',
  'raise.notDecided': 'What is expressly not being decided',
  'raise.notDecidedHelp':
    'One per line. A narrow approval later read as a broad endorsement is what this prevents, and nobody writes it unless asked.',
  'raise.submit': 'Open as a draft',
  'raise.draftNote':
    'It opens as a draft: yours to write before the board is asked to look. Opening it for deliberation is a separate step.',
  'vote.outstanding': 'Not yet recorded',
  'say.placeholder': 'Say something on this matter',
  'say.submit': 'Add to the deliberation',
  'say.reply': 'Reply',
  'say.replyingTo': 'Replying to',
  'say.cancel': 'Cancel',
  'object.title': 'Object during the timelock',
  'object.help':
    'One objection halts the change outright. It does not reopen the vote; the matter would return as a fresh proposal.',
  'object.submit': 'Record my objection',
  'action.openDeliberation': 'Open for deliberation',
  'action.openVoting': 'Open the vote',
  'action.close': 'Close the vote',
  'action.force': 'Bring into force',
  'action.withdraw': 'Withdraw',
  'action.refused': 'Not done',

  'matter.origin.institution_request': 'Requested by an institution',
  'matter.origin.protocol_change': 'A mechanism has changed',
  'matter.origin.periodic_review': 'Periodic review',
  'matter.origin.compliance_concern': 'Compliance concern raised',

  'matter.status.draft': 'Draft',
  'matter.status.deliberation': 'In deliberation',
  'matter.status.voting': 'Voting',
  'matter.status.timelock': 'In timelock',
  'matter.status.in_force': 'In force',
  'matter.status.withdrawn': 'Withdrawn',
  'matter.status.rejected': 'Refused',
  'matter.status.lapsed': 'Lapsed',

  'matter.direction.permit': 'Permitting',
  'matter.direction.restrict': 'Restricting',
  'matter.direction.permitNote':
    'A permitting change carries full deliberation, the full threshold, and a 48-hour delay before it takes effect.',
  'matter.direction.restrictNote':
    'A restricting change takes effect immediately at a reduced threshold, and must be confirmed by the full board or it lapses.',

  'matter.proposal': 'What is proposed',
  'matter.notDecided': 'What is not being decided',
  'matter.mechanism': 'What happens mechanically',
  'matter.parameters': 'Operative parameters',
  'matter.simulation': 'Consequence',
  'matter.deliberation': 'Deliberation',
  'matter.reasoning': 'Votes and reasoning',
  'matter.interacts': 'Interacts with',
  'matter.sources': 'Sources',
  'matter.liaison': 'Technical liaison',

  'sim.window': 'Examined',
  'sim.affected': 'would not have proceeded',
  'sim.of': 'of',
  'sim.transactions': 'transactions',
  'sim.sample': 'Examples',

  'rule.hashOk': 'Parameters match the recorded hash',
  'rule.hashBad': 'Parameters do NOT match the recorded hash',
  'rule.hashExplain':
    'What is signed is a hash of the exact parameters. If the two do not match, the record has been altered.',
  'rule.version': 'Version',
  'rule.inForceFrom': 'In force from',
  'rule.statement': 'As the board expressed it',

  'brief.whatChanged': 'What changed',
  'brief.whyChanged': 'Why it was changed',
  'brief.touches': 'Rules this touches',
  'brief.question': 'Question for the board',
  'brief.raisedBy': 'Raised by',
  'brief.raisedBy.technical_team': 'the technical team',
  'brief.raisedBy.board_member': 'a board member',
  'brief.raisedBy.institution': 'an institution',

  'asst.title': 'Comprehension assistant',
  'asst.placeholder': 'Ask how a mechanism works…',
  'asst.send': 'Ask',
  'asst.thinking': 'Reading…',
  'asst.limits':
    'This assistant explains how mechanisms work. It does not give rulings, and will decline any question that asks for one.',
  'asst.declined': 'Declined: this asks for a ruling',
  'asst.escalated': 'Referred to the technical liaison',
  'asst.sources': 'Sources for this explanation',
  'asst.empty': 'Nothing asked yet.',
  'asst.error': 'The assistant is not available. The question was not recorded.',

  'record.title': 'Record',
  'record.export': 'Export for audit',
  'record.exportNote':
    'Produces a signed document: what was permitted, who approved it, on what reasoning, with what dissent.',
  'record.assistantLog': 'Explanations given',
  'record.assistantLogNote':
    'Every explanation is retained. If one is later found to be wrong, the decisions that rested on it can be identified.',

  'common.back': 'Back',
  'common.loading': 'Loading…',
  'common.error': 'Could not load.',
  'record.since': 'This record began on',
  'record.notDurable':
    'It is not held on durable storage, so a redeployment starts it again from the ' +
    'demonstration data. Export anything worth keeping. A board working for real needs ' +
    'a mounted volume first.',

  'reopen.title': 'Return to deliberation',
  'reopen.help':
    'The board is mid-vote and something has changed. Returning it releases every ' +
    'position already recorded — a vote is a position on the matter as it stood, and ' +
    'it cannot be carried across a change the member has not seen. Released positions ' +
    'stay in the record, and everyone votes again once the vote reopens.',
  'reopen.submit': 'Return it',
  'vote.released': 'Released',
  'vote.releasedNote': 'This position was recorded before the matter returned to deliberation. It no longer counts.',

  // ── search ──
  'nav.search': 'Search',
  'search.title': 'Search the record',
  'search.lead':
    'A board that cannot find what it decided last year has lost the thing this record exists to ' +
    'accumulate. Every result says where the words were found.',
  'search.placeholder': 'A word, a standard, a member, a phrase from a reason',
  'search.go': 'Search',
  'search.clear': 'Clear',
  'search.none': 'Nothing matched. Every word has to appear somewhere in the matter.',
  'search.count': 'matters',
  'search.filters': 'Narrow it',
  'search.anyStatus': 'Any status',
  'search.anyDirection': 'Either direction',
  'search.mine': 'Only what I took part in',
  'search.emptyQuery':
    'Search for a word, or narrow by status, direction or your own participation \u2014 a question ' +
    'with no words in it is still a question.',
  'search.field.title': 'in the title',
  'search.field.proposal': 'in what was proposed',
  'search.field.rule': 'in the rule',
  'search.field.parameter': 'in the operative terms',
  'search.field.source': 'in what it rests on',
  'search.field.reasoning': 'in a recorded position',
  'search.field.deliberation': 'in the deliberation',
  'search.field.mechanism': 'in the mechanism',
  'search.field.notDecided': 'in what was not decided',

  // ── precedent ──
  'related.title': 'What the board has already decided about this',
  'related.none': 'Nothing in the record connects to this matter yet.',
  'related.help':
    'Each of these shares something specific with this matter \u2014 a citation, a declared ' +
    'interaction, an operative term. Nothing here is offered on a resemblance.',
  'related.same_source': 'Argued from the same source',
  'related.declared': 'Declared as interacting',
  'related.same_parameter': 'Sets the same term',

  // ── evidence ──
  'evidence.title': 'What this rests on',
  'evidence.none': 'Nothing has been cited yet.',
  'evidence.add': 'Cite something',
  'evidence.attach': 'Attach it',
  'evidence.help':
    'A standard, a prior ruling, a document, a link. What the board is arguing from belongs ' +
    'beside the argument, not in someone\u2019s memory of the meeting.',
  'evidence.label': 'What it is',
  'evidence.labelHint': 'AAOIFI Shariah Standard No. 21',
  'evidence.ref': 'Where it is',
  'evidence.refHint': 'Clause 3/1, or a URL, or a matter id',
  'evidence.note': 'Why it is here',
  'evidence.noteHint': 'The sentence the citation itself does not carry.',
  'evidence.withdraw': 'Withdraw this',
  'evidence.withdrawn': 'Withdrawn',
  'evidence.withdrawnNote':
    'Offered and taken back by the member who attached it. It no longer counts as evidence and ' +
    'stays here, because what was offered is part of how the board arrived.',
  'evidence.closed':
    'Evidence closed when the matter did. A source added after a decision is not a source the ' +
    'decision rested on.',
  'evidence.kind.standard': 'Standard',
  'evidence.kind.ruling': 'Ruling',
  'evidence.kind.document': 'Document',
  'evidence.kind.external': 'Link',
  'evidence.kind.code': 'Code',
  'evidence.kind.test': 'Test',
  'evidence.kind.chain': 'Chain',

  // ── the operative terms ──
  'terms.title': 'The operative terms',
  'terms.none': 'No terms have been set. The rule would carry none.',
  'terms.set': 'Set the terms',
  'terms.edit': 'Change the terms',
  'terms.save': 'Save the terms',
  'terms.help':
    'Deciding to permit something is one act. Saying at what ratio, measured how often, and what ' +
    'happens when it drifts is another \u2014 and it is the one an institution has to implement. ' +
    'The plain-language meaning is required and is deliberately excluded from the hash, so ' +
    'improving a wording never invalidates an approval.',
  'terms.key': 'Term',
  'terms.keyHint': 'tangible_ratio_min',
  'terms.value': 'Value',
  'terms.valueHint': '30',
  'terms.unit': 'Unit',
  'terms.unitHint': 'percent',
  'terms.meaning': 'What it does',
  'terms.meaningHint': 'Tangible assets as a share of total, below which it is not permitted.',
  'terms.addRow': 'Add a term',
  'terms.removeRow': 'Remove',
  'terms.notFixed':
    'The terms are not fixed yet. They are committed to when the vote opens, and every position ' +
    'recorded afterwards carries that commitment.',
  'terms.fixed': 'Committed to',
  'terms.fixedNote':
    'The terms stopped moving when the vote opened. Every position below was recorded against ' +
    'this value, so whether a member approved exactly these terms is a comparison rather than a ' +
    'recollection.',

  'who.role.signatory': 'Signatory',
  'who.role.advisory': 'Advisory',
  'who.role.liaison': 'Liaison',
  'who.role.observer': 'Observer',

  'common.opened': 'Opened',
  'common.none': 'None',
};

const ar: Dict = {
  ...en,
  'nav.matters': 'المسائل',
  'nav.rules': 'القواعد النافذة',
  'nav.briefings': 'الإحاطات',
  'nav.assistant': 'المساعد',
  'nav.record': 'السجل',
  'dash.title': 'المعروض على الهيئة',
  'dash.none': 'لا يوجد حالياً ما هو معروض على الهيئة.',
  'dash.registry': 'سجل السياسات',
  'matter.proposal': 'المقترح',
  'matter.notDecided': 'ما لا يُبتّ فيه',
  'matter.mechanism': 'الآلية',
  'matter.parameters': 'المعايير التشغيلية',
  'matter.simulation': 'الأثر',
  'matter.deliberation': 'المداولة',
  'matter.reasoning': 'التصويت والتعليل',
  'matter.sources': 'المصادر',
  'brief.whatChanged': 'ما الذي تغيّر',
  'brief.whyChanged': 'سبب التغيير',
  'brief.question': 'سؤال إلى الهيئة',
  'asst.title': 'مساعد الفهم',
  'asst.placeholder': 'اسأل عن آلية العمل…',
  'asst.send': 'اسأل',
  'asst.limits': 'يشرح هذا المساعد آليات العمل. لا يصدر أحكاماً شرعية، ويمتنع عن أي سؤال يطلب حكماً.',
  'record.title': 'السجل',
  'record.export': 'تصدير للمراجعة',
  'common.back': 'رجوع',
  'common.loading': 'جارٍ التحميل…',
};

const ur: Dict = {
  ...en,
  'nav.matters': 'مسائل',
  'nav.rules': 'نافذ قواعد',
  'nav.briefings': 'بریفنگ',
  'nav.assistant': 'معاون',
  'nav.record': 'ریکارڈ',
  'dash.title': 'بورڈ کے سامنے',
  'dash.none': 'اس وقت بورڈ کے سامنے کچھ نہیں ہے۔',
  'matter.proposal': 'تجویز',
  'matter.notDecided': 'جس کا فیصلہ نہیں ہو رہا',
  'matter.mechanism': 'طریقۂ کار',
  'matter.simulation': 'اثر',
  'matter.deliberation': 'مشاورت',
  'asst.title': 'فہم کا معاون',
  'asst.limits': 'یہ معاون طریقۂ کار کی وضاحت کرتا ہے۔ یہ شرعی حکم نہیں دیتا۔',
  'common.back': 'واپس',
  'common.loading': 'لوڈ ہو رہا ہے…',
};

const DICTS: Record<Lang, Dict> = { en, ar, ur };

export function translate(lang: Lang, key: string): string {
  return DICTS[lang][key] ?? DICTS.en[key] ?? key;
}
