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
  'app.stage': 'Stage One — record and comprehension. Read only.',

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
  'dash.readOnlyNotice':
    'This stage carries the record and the explanations. It does not yet carry voting or signing authority.',

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
  'common.opened': 'Opened',
  'common.none': 'None',
};

const ar: Dict = {
  ...en,
  'app.stage': 'المرحلة الأولى — السجل والفهم. للاطلاع فقط.',
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
  'app.stage': 'پہلا مرحلہ — ریکارڈ اور فہم۔ صرف مطالعہ کے لیے۔',
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
