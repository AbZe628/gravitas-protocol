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

import { classifyLexical, normaliseForMatch } from './assistant.js';
import type { Language as Lang } from '../types.js';

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

/**
 * One string per language, and English is the one that must exist.
 *
 * A missing translation falls back to English rather than to an empty panel.
 * That is the same bargain the interface dictionaries make: a scholar reading
 * an answer in the wrong language can still act on it, and one reading a blank
 * box cannot.
 */
export type Said = { en: string; ar?: string; ur?: string };

export function inLanguage(said: Said, lang: Lang): string {
  return said[lang] ?? said.en;
}

interface Topic {
  id: string;
  /** Words that mean this topic. Matched whole, so `vote` does not catch `votes`
   * by accident and `drift` does not catch `driftwood`. */
  terms: string[];
  answer: Said;
  /**
   * Where in the application this is.
   *
   * The label is said in each language too. A guide that answered in Arabic and
   * then labelled the way there in English would send a reader looking for a
   * screen whose name they had not been given.
   */
  goTo?: { label: Said; path: string };
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

export const NOT_A_RULING: Said = {
  en:
    'This is the guide to using Majlis. It does not say whether something is permissible, for a ' +
    'contract or an instrument or by summarising what others hold. That is the board’s. What it ' +
    'can do is show you where the question goes: open a matter, set out what actually happens, ' +
    'cite what it turns on, state the conditions, and record your position with your reasoning.',
  ar:
    'هذا دليل استعمال مجلس. وهو لا يقول هل الشيء جائز، لا في عقد ولا في أداة ولا بتلخيص ما يقوله ' +
    'غيره. ذلك للمجلس. وما يستطيعه أن يدلّك أين يذهب السؤال: افتح مسألة، وبيّن ما يجري فعلاً، ' +
    'واستشهد بما يتوقف عليه، وضع الشروط، وسجّل موقفك بتعليلك.',
  ur:
    'یہ مجلس کے استعمال کا رہنما ہے۔ یہ نہیں بتاتا کہ کوئی چیز جائز ہے یا نہیں، نہ کسی عقد میں، نہ ' +
    'کسی آلے میں، اور نہ دوسروں کی رائے کا خلاصہ دے کر۔ یہ بورڈ کا کام ہے۔ یہ اتنا کر سکتا ہے کہ ' +
    'بتائے سوال کہاں جاتا ہے: معاملہ کھولیں، بیان کریں کہ اصل میں ہوتا کیا ہے، حوالہ دیں کہ بات ' +
    'کس پر ٹھہرتی ہے، شرائط مقرر کریں، اور اپنی وجہ کے ساتھ موقف درج کریں۔',
};

const TOPICS: readonly Topic[] = [
  {
    id: 'matter',
    terms: ['matter', 'matters', 'question', 'case', 'proposal', 'مسألة', 'مسائل', 'قضية', 'معاملہ', 'مسئلہ'],
    answer: {
      en: "A matter is one question put to the board. It holds the question as it was asked, what actually happens, what is not being decided, what it rests on, the operative terms, everything said about it and every position taken. A ruling comes out of one.",
      ar: "المسألة سؤال واحد يُعرض على المجلس. تحمل السؤال كما طُرح، وما يجري فعلاً، وما لا يُبتّ فيه، وما تستند إليه، والشروط النافذة، وكل ما قيل فيها وكل موقف سُجّل. والحكم يخرج منها.",
      ur: "معاملہ ایک سوال ہے جو بورڈ کے سامنے رکھا جاتا ہے۔ اس میں سوال جیسے پوچھا گیا، اصل میں کیا ہوتا ہے، کیا طے نہیں ہو رہا، یہ کس پر ٹھہرتا ہے، نافذ شرائط، اس پر کہی گئی ہر بات اور درج ہر موقف ہوتا ہے۔ فیصلہ اسی سے نکلتا ہے۔",
    },
    goTo: { label: { en: "What needs you", ar: "ما ينتظرك", ur: "آپ کا کیا منتظر ہے" }, path: '/' },
    seeAlso: ['direction', 'passage', 'terms'],
  },
  {
    id: 'direction',
    terms: ['direction', 'permit', 'permitting', 'restrict', 'restricting', 'اتجاه', 'إباحة', 'تقييد', 'سمت', 'اجازت', 'پابندی'],
    answer: {
      en: "Whether a matter permits something or restricts it. This decides how the matter is treated. Permitting needs the full quorum and waits before taking effect, so a member who spots something can object in time. Restricting takes effect at once on a reduced quorum, and then has to be ratified within a window or it lapses.",
      ar: "هل المسألة تبيح شيئاً أم تقيّده. وهذا يحدّد كيف تُعامَل المسألة. الإباحة تحتاج النصاب الكامل وتنتظر قبل السريان، ليعترض في الوقت من رأى شيئاً. والتقييد يسري فوراً بنصاب مخفَّض، ثم يجب توثيقه في المهلة وإلا سقط.",
      ur: "معاملہ کسی چیز کی اجازت دیتا ہے یا اس پر پابندی لگاتا ہے۔ یہی طے کرتا ہے کہ معاملے کے ساتھ کیا سلوک ہوگا۔ اجازت کے لیے پورا نصاب چاہیے اور نفاذ سے پہلے مہلت ہوتی ہے، تاکہ جو رکن کچھ دیکھے وہ بروقت اعتراض کر سکے۔ پابندی کم نصاب پر فوراً نافذ ہو جاتی ہے، اور پھر مقررہ مدت میں توثیق نہ ہو تو ساقط ہو جاتی ہے۔",
    },
    seeAlso: ['timelock', 'quorum'],
  },
  {
    id: 'passage',
    terms: ['passage', 'next', 'step', 'steps', 'stage', 'order', 'مسار', 'خطوة', 'خطوات', 'مرحلة', 'مرحلہ', 'قدم'],
    answer: {
      en: "Where a matter stands and what comes next. Putting a question into shape happens in whatever order suits the work, so those steps are a set. Deciding waits on itself: somebody speaks, the vote opens, positions are recorded, the vote closes. Only one step is required before a vote: that something has been said.",
      ar: "أين وصلت المسألة وما التالي. صياغة السؤال تجري بأي ترتيب يناسب العمل، فتلك الخطوات مجموعة. وأما البتّ فينتظر نفسه: يتكلّم أحد، ويُفتح التصويت، وتُسجَّل المواقف، ويُغلق التصويت. وخطوة واحدة فقط مطلوبة قبل التصويت: أن يكون قد قيل شيء.",
      ur: "معاملہ کہاں پہنچا اور آگے کیا ہے۔ سوال کو شکل دینا اُسی ترتیب سے ہوتا ہے جو کام کو سازگار ہو، سو وہ قدم ایک مجموعہ ہیں۔ فیصلہ اپنی باری کا منتظر رہتا ہے: کوئی بولتا ہے، ووٹ کھلتا ہے، مواقف درج ہوتے ہیں، ووٹ بند ہوتا ہے۔ ووٹ سے پہلے صرف ایک قدم لازم ہے: کہ کچھ کہا گیا ہو۔",
    },
    seeAlso: ['matter', 'quorum'],
  },
  {
    id: 'timelock',
    terms: ['timelock', 'delay', 'objection', 'object', 'مهلة', 'تأجيل', 'اعتراض', 'التوا', 'مہلت'],
    answer: {
      en: "The delay between a permitting vote closing and the ruling taking effect. Any member may object during it. A restriction has no delay: it takes effect at once and is ratified afterwards.",
      ar: "المهلة بين إغلاق تصويت الإباحة وسريان الحكم. ولأي عضو أن يعترض فيها. وأما التقييد فلا مهلة له: يسري فوراً ويُوثَّق بعد ذلك.",
      ur: "اجازت کا ووٹ بند ہونے اور فیصلہ نافذ ہونے کے درمیان کی مہلت۔ اس دوران کوئی بھی رکن اعتراض کر سکتا ہے۔ پابندی کے لیے مہلت نہیں: وہ فوراً نافذ ہوتی ہے اور توثیق بعد میں ہوتی ہے۔",
    },
    seeAlso: ['direction'],
  },
  {
    id: 'quorum',
    terms: ['quorum', 'threshold', 'tally', 'majority', 'نصاب', 'أغلبية', 'اکثریت'],
    answer: {
      en: "How many signatures a matter needs. It differs by direction: the full quorum to permit, a reduced one to restrict. Abstentions never count toward it. Reaching the threshold lets the vote be closed. A member still has to close it.",
      ar: "كم توقيعاً تحتاج المسألة. ويختلف بحسب الاتجاه: النصاب الكامل للإباحة، ومخفَّض للتقييد. والامتناع لا يُحتسب فيه. وبلوغ النصاب يتيح إغلاق التصويت. ويبقى على عضو أن يغلقه.",
      ur: "معاملے کو کتنے دستخط چاہییں۔ یہ سمت کے حساب سے بدلتا ہے: اجازت کے لیے پورا نصاب، پابندی کے لیے کم۔ غیر جانبداری اس میں شمار نہیں ہوتی۔ نصاب پورا ہونے سے ووٹ بند کیا جا سکتا ہے۔ بند پھر بھی کسی رکن کو کرنا پڑتا ہے۔",
    },
    seeAlso: ['direction', 'vote'],
  },
  {
    id: 'vote',
    terms: ['vote', 'voting', 'position', 'reasoning', 'reason', 'تصويت', 'صوت', 'موقف', 'تعليل', 'ووٹ', 'رائے'],
    answer: {
      en: "A position with your reasoning, in your own words. The reasoning is required: a tally of names without reasons cannot be followed the next time. Your position is recorded against the hash of the exact terms it was cast on, so whether you approved these words can be compared rather than remembered.",
      ar: "موقف مع تعليلك، بكلماتك أنت. والتعليل مطلوب: فعدّ الأسماء بلا أسباب لا يمكن الاقتداء به في المرة التالية. ويُسجَّل موقفك مقابل بصمة الشروط بعينها التي صوّتّ عليها، فتصير موافقتك على هذه الألفاظ مقارنةً لا تذكّراً.",
      ur: "موقف، اپنی وجہ کے ساتھ، اپنے الفاظ میں۔ وجہ لازمی ہے: بغیر وجہ کے ناموں کی گنتی سے اگلی بار رہنمائی نہیں ملتی۔ آپ کا موقف اُنہی شرائط کے ہیش کے مقابل درج ہوتا ہے جن پر ووٹ دیا گیا، سو یہ کہ آپ نے انہی الفاظ کو منظور کیا — موازنہ ہے، یاد نہیں۔",
    },
    seeAlso: ['terms', 'quorum'],
  },
  {
    id: 'terms',
    terms: ['terms', 'parameters', 'parameter', 'hash', 'operative', 'شروط', 'بنود', 'بصمة', 'شرائط', 'ضوابط'],
    answer: {
      en: "The operative terms are a key, a value, a unit and what it does: the part a system can carry out and an auditor can test. They stop moving when the vote opens, and every position afterwards carries their hash.",
      ar: "الشروط النافذة مفتاح وقيمة ووحدة وبيان ما تفعله: الجزء الذي ينفّذه نظام ويختبره مراجع. وتتوقف عن التحرك حين يُفتح التصويت، وكل موقف بعدها يحمل بصمتها.",
      ur: "نافذ شرائط ایک کلید، ایک قدر، ایک اکائی اور یہ کہ وہ کیا کرتی ہے: وہ حصہ جسے نظام نافذ کر سکے اور محاسب جانچ سکے۔ ووٹ کھلتے ہی وہ ہلنا بند کر دیتی ہیں، اور اس کے بعد ہر موقف ان کا ہیش اٹھاتا ہے۔",
    },
    seeAlso: ['vote', 'carrying'],
  },
  {
    id: 'carrying',
    terms: ['carrying', 'enforced', 'enforcement', 'registry', 'checked', 'إنفاذ', 'تنفيذ', 'نفاذ'],
    answer: {
      en: "When the terms get checked. With nothing attached, the institution carries them out however it already does, and they are tested when somebody looks, so a breach can stand between reviews. With an enforcing registry attached, they are read before every transaction that depends on them, and a transaction that would breach one does not execute. Majlis records; it never carries anything out.",
      ar: "متى تُختبر الشروط. فإن لم يكن شيء موصولاً نفّذتها المؤسسة بما تستعمله أصلاً، واختُبرت حين ينظر أحد، فقد تبقى المخالفة قائمة بين مراجعتين. وإن وُصل سجلٌّ منفِّذ قُرئت قبل كل معاملة تعتمد عليها، والمعاملة التي تخالفها لا تُنفَّذ. ومجلس يسجّل ولا ينفّذ شيئاً.",
      ur: "شرائط کب جانچی جاتی ہیں۔ اگر کچھ منسلک نہ ہو تو ادارہ انہیں اُسی طرح نافذ کرتا ہے جیسے پہلے سے کرتا ہے، اور جانچ تب ہوتی ہے جب کوئی دیکھے، سو خلاف ورزی دو نظرثانیوں کے بیچ قائم رہ سکتی ہے۔ اگر نافذ کرنے والی رجسٹری منسلک ہو تو وہ ہر اُس معاملے سے پہلے پڑھی جاتی ہیں جو اُن پر منحصر ہے، اور جو معاملہ انہیں توڑے وہ چلتا ہی نہیں۔ مجلس درج کرتا ہے؛ نافذ کبھی نہیں کرتا۔",
    },
    seeAlso: ['terms', 'drift'],
  },
  {
    id: 'drift',
    terms: ['drift', 'drifted', 'crossed', 'composition', 'انحراف', 'تجاوز', 'تركيبة', 'بہاؤ', 'ترکیب'],
    answer: {
      en: "When the ground moves under a ruling. A pool that was 51% tangible in March is 47% in July because it rebalanced, and nobody did anything. Majlis compares the composition against the terms the board set and raises the question. It does not re-rule: the status stays what the board made it until the board says otherwise.",
      ar: "حين تتحرك الأرض تحت الحكم. محفظة كانت عينيّتها 51% في آذار صارت 47% في تموز لأنها أُعيد توازنها، ولم يفعل أحد شيئاً. ومجلس يقارن التركيب بالشروط التي وضعها المجلس ويطرح السؤال. ولا يعيد الحكم: تبقى الحال كما جعلها المجلس حتى يقول غير ذلك.",
      ur: "جب فیصلے کے نیچے کی زمین ہل جائے۔ جو پول مارچ میں 51% ٹھوس تھا وہ جولائی میں 47% ہے کیونکہ اس کا توازن بدلا، اور کسی نے کچھ نہیں کیا۔ مجلس ترکیب کا موازنہ اُن شرائط سے کرتا ہے جو بورڈ نے مقرر کیں، اور سوال اٹھاتا ہے۔ وہ دوبارہ فیصلہ نہیں کرتا: حالت وہی رہتی ہے جو بورڈ نے بنائی، جب تک بورڈ کچھ اور نہ کہے۔",
    },
    goTo: { label: { en: "The register", ar: "السجل", ur: "رجسٹر" }, path: '/register' },
    seeAlso: ['carrying', 'register'],
  },
  {
    id: 'register',
    terms: ['register', 'asset', 'assets', 'holding', 'holdings', 'examined', 'سجل', 'أصول', 'موجودات', 'رجسٹر', 'اثاثہ'],
    answer: {
      en: "Everything this institution holds or offers, and where each stands with the board. Its most useful line is usually the count of holdings never put to the board at all.",
      ar: "كل ما تملكه هذه المؤسسة أو تعرضه، وأين يقف كل واحد منها عند المجلس. وأنفع سطر فيه عادةً عدد ما لم يُعرض على المجلس قط.",
      ur: "یہ ادارہ جو کچھ رکھتا یا پیش کرتا ہے، اور ہر ایک بورڈ کے ہاں کہاں کھڑا ہے۔ اس کی سب سے کارآمد سطر عموماً اُن کی گنتی ہے جو بورڈ کے سامنے کبھی رکھے ہی نہیں گئے۔",
    },
    goTo: { label: { en: "The register", ar: "السجل", ur: "رجسٹر" }, path: '/register' },
    seeAlso: ['drift', 'matter'],
  },
  {
    id: 'inherit',
    terms: ['inherit', 'inherited', 'precedent', 'before', 'previously', 'last time', 'سابقة', 'سابقا', 'نظیر', 'پہلے'],
    answer: {
      en: "Where this board has ruled on the same contract shape before, its own earlier answers are offered on the new matter: each condition with the finding and the reason it gave, the operative terms, and what it held outside the question. Nothing is filled in. Accepting one records it as your finding, under your name, today.",
      ar: "حيث سبق لهذا المجلس أن حكم في الشكل نفسه من العقود، تُعرض إجاباته السابقة على المسألة الجديدة: كل شرط بما وجده وبتعليله، والشروط النافذة، وما أبقاه خارج السؤال. ولا يُملأ شيء. وقبول واحدة يسجّلها نتيجةً لك، باسمك، اليوم.",
      ur: "جہاں اس بورڈ نے پہلے اسی نوعیت کے عقد پر فیصلہ دیا ہو، وہاں اس کے پچھلے جواب نئے معاملے پر پیش کیے جاتے ہیں: ہر شرط اپنے نتیجے اور دی گئی وجہ کے ساتھ، نافذ شرائط، اور جو سوال سے باہر رکھا گیا۔ کچھ خود سے نہیں بھرا جاتا۔ کسی ایک کو قبول کرنا اسے آج، آپ کے نام سے، آپ کا نتیجہ بنا کر درج کرتا ہے۔",
    },
    seeAlso: ['checklist', 'matter'],
  },
  {
    id: 'checklist',
    terms: ['checklist', 'condition', 'conditions', 'shape', 'structure', 'library', 'هيكل', 'مكتبة', 'قائمة', 'ڈھانچہ', 'کتب'],
    answer: {
      en: "Choosing a contract shape attaches the conditions this board holds such a contract to, and the board answers each in its own words. A board may also rule against a condition it thinks wrongly drawn; that is an answer too. Until a board has adopted a shape, its conditions are a shipped draft, binding on nobody.",
      ar: "اختيار شكل العقد يُرفق الشروط التي يُلزم بها هذا المجلس مثل هذا العقد، ويجيب المجلس عن كل شرط بكلماته. وللمجلس أن يحكم بخطأ شرط يرى صياغته خاطئة؛ وذلك جواب أيضاً. وحتى يعتمد المجلس شكلاً، فشروطه مسودة لا تلزم أحداً.",
      ur: "عقد کی صورت چننے سے وہ شرائط منسلک ہو جاتی ہیں جن کا یہ بورڈ ایسے عقد کو پابند سمجھتا ہے، اور بورڈ ہر ایک کا جواب اپنے الفاظ میں دیتا ہے۔ بورڈ کسی ایسی شرط کے خلاف بھی فیصلہ دے سکتا ہے جسے وہ غلط سمجھے؛ یہ بھی ایک جواب ہے۔ جب تک بورڈ کوئی صورت نہ اپنائے، اس کی شرائط ایک مسودہ ہیں جو کسی پر لازم نہیں۔",
    },
    goTo: { label: { en: "The library", ar: "المكتبة", ur: "لائبریری" }, path: '/library' },
    seeAlso: ['inherit', 'matter'],
  },
  {
    id: 'fatwa',
    terms: ['fatwa', 'ruling', 'document', 'written', 'export', 'فتوى', 'حكم', 'وثيقة', 'فتوی', 'دستاویز'],
    answer: {
      en: "When the board closes the vote and the delay has run, the ruling is assembled: the question put, what occurs, what it does not decide, how it is implemented, the operative terms, and each member’s reasoning attached to their position. It is produced once the board has decided, and not before.",
      ar: "حين يغلق المجلس التصويت وتنقضي المهلة، يُجمَّع الحكم: السؤال كما طُرح، وما يجري، وما لا يبتّ فيه، وكيف يُنفَّذ، والشروط النافذة، وتعليل كل عضو مرفقاً بموقفه. ويُنتَج بعد أن يقرّر المجلس، لا قبله.",
      ur: "جب بورڈ ووٹ بند کر دے اور مہلت گزر جائے، تو فیصلہ مرتب ہوتا ہے: رکھا گیا سوال، کیا ہوتا ہے، کیا طے نہیں ہوتا، کیسے نافذ ہوتا ہے، نافذ شرائط، اور ہر رکن کی وجہ اس کے موقف کے ساتھ۔ یہ تب بنتا ہے جب بورڈ فیصلہ کر چکا ہو، اس سے پہلے نہیں۔",
    },
    goTo: { label: { en: "What we decided", ar: "ما قرّرناه", ur: "ہم نے کیا طے کیا" }, path: '/record' },
    seeAlso: ['vote', 'record'],
  },
  {
    id: 'record',
    terms: ['record', 'audit', 'history', 'append', 'correction', 'superseded', 'تدقيق', 'تصحيح', 'تاريخ', 'ریکارڈ', 'تاریخ'],
    answer: {
      en: "The record is append-only. Nothing is edited and nothing is deleted: a correction is written as a new entry that supersedes the old one, and what stands is worked out by following that chain rather than by comparing timestamps. A withdrawn source stays visible and stops counting.",
      ar: "السجل يُضاف إليه فقط. لا يُحرَّر شيء ولا يُحذف: التصحيح يُكتب قيداً جديداً ينسخ القديم، وما يقوم يُعرف باتباع تلك السلسلة لا بمقارنة التواريخ. والمصدر المسحوب يبقى ظاهراً ويتوقف عن الاحتساب.",
      ur: "ریکارڈ میں صرف اضافہ ہوتا ہے۔ نہ کچھ بدلا جاتا ہے نہ مٹایا: تصحیح ایک نئے اندراج کے طور پر لکھی جاتی ہے جو پرانے کی جگہ لیتا ہے، اور جو قائم ہے وہ اسی سلسلے کے پیچھے چل کر معلوم ہوتا ہے، وقت کے نشانات کا موازنہ کر کے نہیں۔ واپس لیا گیا ماخذ نظر آتا رہتا ہے اور شمار ہونا بند ہو جاتا ہے۔",
    },
    goTo: { label: { en: "What we decided", ar: "ما قرّرناه", ur: "ہم نے کیا طے کیا" }, path: '/record' },
    seeAlso: ['fatwa'],
  },
  {
    id: 'roles',
    // 'who' included: "who can vote here" is a question about roles, and the
    // word 'vote' in it would otherwise carry it to the wrong topic entirely.
    terms: ['who', 'role', 'roles', 'signatory', 'advisory', 'liaison', 'observer', 'secretary', 'chair'],
    answer: {
      en: "A signatory deliberates and votes. An advisory member deliberates, and their written position is recorded but stays out of the arithmetic. A technical liaison answers what a mechanism actually is, and has no vote and no key. An observer reads. The secretary records what the institution did, such as filing a rectification plan or the directors’ approval, because those are the institution’s acts and not the board’s.",
      ar: "الموقّع يداول ويصوّت. والعضو الاستشاري يداول، ويُسجَّل موقفه المكتوب ويبقى خارج الحساب. والوسيط التقني يبيّن ما هي الآلية فعلاً، ولا صوت له ولا مفتاح. والمراقب يقرأ. والأمين يسجّل ما فعلته المؤسسة، كإيداع خطة تصحيح أو موافقة مجلس الإدارة، لأن تلك أفعال المؤسسة لا أفعال المجلس.",
      ur: "دستخط کنندہ بحث بھی کرتا ہے اور ووٹ بھی دیتا ہے۔ مشاورتی رکن بحث کرتا ہے، اس کا تحریری موقف درج ہوتا ہے مگر حساب سے باہر رہتا ہے۔ تکنیکی رابطہ کار بتاتا ہے کہ کوئی طریقۂ کار اصل میں ہے کیا، اور اس کا نہ ووٹ ہے نہ کلید۔ مشاہد پڑھتا ہے۔ سیکرٹری وہ درج کرتا ہے جو ادارے نے کیا، جیسے اصلاحی منصوبہ داخل کرنا یا ڈائریکٹروں کی منظوری، کیونکہ وہ ادارے کے کام ہیں، بورڈ کے نہیں۔",
    },
    goTo: { label: { en: "This board", ar: "هذا المجلس", ur: "یہ بورڈ" }, path: '/settings' },
    seeAlso: ['vote'],
  },
  {
    id: 'incident',
    terms: ['incident', 'breach', 'event', 'thirty', 'rectification', 'purification', 'مخالفة', 'حادثة', 'واقعة', 'تطهير', 'واقعہ', 'تطہیر'],
    answer: {
      en: "Something that already happened. The board decides whether it was actual, now rather than next quarter, and from that moment thirty days run for a rectification plan. Four of the nine steps belong to the institution and are not offered to a board member.",
      ar: "شيء وقع بالفعل. يقرّر المجلس هل هو واقع، الآن لا في الربع القادم، ومن تلك اللحظة تجري ثلاثون يوماً لخطة التصحيح. وأربع من الخطوات التسع للمؤسسة ولا تُعرض على عضو المجلس.",
      ur: "کوئی چیز جو ہو چکی۔ بورڈ طے کرتا ہے کہ وہ واقعی ہوئی یا نہیں، ابھی، اگلی سہ ماہی میں نہیں، اور اسی لمحے سے اصلاحی منصوبے کے لیے تیس دن چلنے لگتے ہیں۔ نو میں سے چار قدم ادارے کے ہیں اور بورڈ کے رکن کو پیش نہیں کیے جاتے۔",
    },
    goTo: { label: { en: "Events", ar: "الوقائع", ur: "واقعات" }, path: '/incidents' },
    seeAlso: ['roles'],
  },
  {
    id: 'assistant',
    terms: ['assistant', 'ai', 'model', 'chatbot', 'explain', 'مساعد', 'ذكاء', 'نموذج', 'معاون'],
    answer: {
      en: "The assistant answers questions of mechanism, such as what a structure does or how a protocol works, and never whether something is permissible. Three gates hold it to that in code: known ruling-seeking phrasings are refused before any model runs, a separate classifier reads the intent of what survives, and any answer with ruling language in it is discarded. It is off unless the institution turned it on.",
      ar: "المساعد يجيب عن أسئلة الآلية، كأن يُسأل ماذا يفعل هيكل أو كيف يعمل بروتوكول، ولا يجيب أبداً هل الشيء جائز. وثلاث بوابات تُلزمه بذلك في الشيفرة: الصيغ المعروفة لطلب الحكم تُرفض قبل تشغيل أي نموذج، ومصنّف مستقل يقرأ قصد ما نجا منها، وكل جواب فيه لغة حكم يُطرح. وهو مطفأ ما لم تشغّله المؤسسة.",
      ur: "معاون طریقۂ کار کے سوالوں کا جواب دیتا ہے، جیسے کوئی ڈھانچہ کیا کرتا ہے یا کوئی پروٹوکول کیسے چلتا ہے، اور کبھی یہ نہیں بتاتا کہ کوئی چیز جائز ہے یا نہیں۔ تین دروازے اسے کوڈ میں اسی پر روکتے ہیں: فیصلہ مانگنے کے معلوم اندازِ بیان کسی ماڈل کے چلنے سے پہلے ہی رد ہو جاتے ہیں، ایک الگ درجہ بند بچی ہوئی بات کی نیت پڑھتا ہے، اور جس جواب میں فیصلے کی زبان ہو وہ پھینک دیا جاتا ہے۔ یہ بند رہتا ہے جب تک ادارہ اسے چالو نہ کرے۔",
    },
    seeAlso: ['roles'],
  },
  {
    id: 'start',
    /*
     * Not `how`, and not its Arabic and Urdu equivalents.
     *
     * They stand in front of most questions somebody asks an application —
     * how does voting work, how is drift measured — so owning them made this
     * topic win almost every time and answer *here is how to begin* to a
     * question about something else entirely.
     */
    terms: ['start', 'begin', 'new', 'raise', 'open', 'first', 'بدء', 'ابدأ', 'جديد', 'شروع'],
    answer: {
      en: "From the first screen, if you may deliberate, choose what kind of decision it is in your own words and write what is being asked. That opens a draft, and sending it decides nothing. The shape it is judged against, the conditions and the terms are the board’s, and where this board has ruled on the same shape before, its earlier answers are offered.",
      ar: "من الشاشة الأولى، إن كنت ممن يداول، اختر نوع القرار بكلماتك واكتب ما هو المطلوب. يفتح ذلك مسودة، وإرسالها لا يقرّر شيئاً. والشكل الذي تُحاكم إليه والشروط والبنود للمجلس، وحيث سبق لهذا المجلس أن حكم في الشكل نفسه تُعرض إجاباته السابقة.",
      ur: "پہلی سکرین سے، اگر آپ بحث کے اہل ہیں، اپنے الفاظ میں چنیں کہ یہ کس قسم کا فیصلہ ہے اور لکھیں کہ کیا پوچھا جا رہا ہے۔ اس سے مسودہ کھلتا ہے، اور اسے بھیجنے سے کچھ طے نہیں ہوتا۔ جس صورت پر اسے پرکھا جائے گا، شرائط اور ضوابط بورڈ کے ہیں، اور جہاں اس بورڈ نے پہلے اسی صورت پر فیصلہ دیا ہو، وہاں اس کے پچھلے جواب پیش کیے جاتے ہیں۔",
    },
    goTo: { label: { en: "What needs you", ar: "ما ينتظرك", ur: "آپ کا کیا منتظر ہے" }, path: '/' },
    seeAlso: ['matter', 'passage', 'inherit'],
  },
];

/*
 * Latin words, and runs of Arabic script.
 *
 * This was `/[a-z']+/g`, so a question typed in Arabic or Urdu produced an
 * empty set of words, matched no topic, and got the sentence that says the
 * guide does not know about it. On a right-to-left screen the guide answered
 * nothing at all — which is what *the guide does not answer questions* turned
 * out to mean.
 *
 * Arabic and Urdu share the block and are matched the same way: a word is a
 * run of letters in either, and `normaliseForMatch` has already made the
 * letters the two scripts share identical.
 */
const WORDS = /[a-z']+|[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]+/g;

/** Whether a term is written in Arabic script, and so agglutinates. */
const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

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
  /*
   * Normalised on both sides. Gate 1 of the assistant already matches across
   * the three scripts this application is read in — tashkeel stripped, alef,
   * ya, kaf and ha forms unified — and the guide simply never used it, so
   * ordinary orthographic variation was enough to miss a topic.
   */
  const lower = normaliseForMatch(question.toLowerCase());
  const asked = new Set(lower.match(WORDS) ?? []);

  let hits = 0;
  let at = Number.MAX_SAFE_INTEGER;

  for (const term of topic.terms) {
    const wanted = normaliseForMatch(term);

    /*
     * English matches whole words; Arabic and Urdu match inside one.
     *
     * `vote` must not be found inside `devoted`, so a Latin term is looked up
     * in the set of words. But Arabic attaches the definite article and its
     * prepositions to the word itself — a reader asking about a matter types
     * `المسألة`, and `مسألة` is not a word in that sentence, it is four fifths
     * of one. Whole-word matching found nothing at all in either script, which
     * is what made the guide silent on a right-to-left screen even after it
     * had the words.
     */
    const script = ARABIC.test(wanted) ? 'inside' : 'whole';
    const matched =
      script === 'inside' || wanted.includes(' ') ? lower.includes(wanted) : asked.has(wanted);
    if (!matched) continue;
    hits += 1;

    /*
     * By index rather than by a word boundary. `\b` is defined on ASCII word
     * characters, so it never fires between two Arabic letters — the tie-break
     * would have gone on working in English and quietly stopped in the other
     * two.
     */
    const where = lower.indexOf(wanted);
    if (where >= 0 && where < at) at = where;
  }

  return { hits, at };
}

const NOTHING_MATCHED: Said = {
  en:
    'This guide does not know about that. It answers questions about Majlis itself: what a screen ' +
    'is for, what a word means, what an act does, and what happens next. How a financial structure ' +
    'works goes to the assistant, where an institution has turned one on. Whether something is ' +
    'permissible goes to the board.',
  ar:
    'هذا الدليل لا يعرف ذلك. وهو يجيب عن أسئلة عن مجلس نفسه: ما وظيفة الشاشة، وما معنى الكلمة، وما ' +
    'الذي يفعله الإجراء، وماذا يحدث بعده. وأما كيف يعمل هيكل مالي فيذهب إلى المساعد حيث فعّلته ' +
    'المؤسسة. وأما هل الشيء جائز فيذهب إلى المجلس.',
  ur:
    'یہ رہنما اس بارے میں نہیں جانتا۔ یہ مجلس ہی کے بارے میں سوالوں کا جواب دیتا ہے: کوئی سکرین کس ' +
    'لیے ہے، کسی لفظ کا کیا مطلب ہے، کوئی عمل کیا کرتا ہے، اور آگے کیا ہوتا ہے۔ کوئی مالیاتی ڈھانچہ ' +
    'کیسے کام کرتا ہے، یہ معاون کے پاس جاتا ہے جہاں ادارے نے اسے چالو کیا ہو۔ اور کوئی چیز جائز ہے ' +
    'یا نہیں، یہ بورڈ کے پاس جاتا ہے۔',
};

export function askTheGuide(question: string, lang: Lang = 'en'): GuideAnswer {
  const asked = question.trim();

  /*
   * First, and without exception — and in every language the record is read
   * in.
   *
   * `SEEKS_A_RULING` is English regular expressions, so `هل هذا جائز` and
   * `کیا یہ جائز ہے` walked straight past it. They then matched no topic and
   * got *the guide does not know about that*, which is a non-answer rather
   * than a wrong one — but the refusal is the whole point of this gate, and a
   * refusal that only fires in English is a guarantee that holds in one third
   * of the application.
   *
   * The assistant's own lexical gate already covers Latin, Arabic and Urdu and
   * is measured against a corpus. It runs first here for the same reason it
   * runs first there.
   */
  /*
   * `hard` only, not `soft`.
   *
   * The assistant sends a soft match to its semantic classifier rather than
   * refusing it, because soft patterns are the ones that catch an innocent
   * question along with a disguised one. Refusing on soft here made
   * `ما هي المسألة` — *what is a matter* — a refused request for a ruling.
   *
   * The guide can afford to be the more permissive of the two: every answer it
   * gives is fixed prose about this application, written in advance. There is
   * nothing for a cleverly worded question to extract.
   */
  if (classifyLexical(asked) === 'hard' || SEEKS_A_RULING.some((p) => p.test(asked))) {
    return {
      topic: null,
      answer: inLanguage(NOT_A_RULING, lang),
      goTo: null,
      seeAlso: [],
      refused: true,
    };
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
    return {
      topic: null,
      answer: inLanguage(NOTHING_MATCHED, lang),
      goTo: null,
      seeAlso: [],
      refused: false,
    };
  }

  return {
    topic: best.id,
    answer: inLanguage(best.answer, lang),
    goTo: best.goTo ? { label: inLanguage(best.goTo.label, lang), path: best.goTo.path } : null,
    seeAlso: best.seeAlso ?? [],
    refused: false,
  };
}

/** Every topic, so an interface can offer them rather than demand a question. */
export function guideTopics(lang: Lang = 'en'): { id: string; answer: string }[] {
  return TOPICS.map((topic) => ({ id: topic.id, answer: inLanguage(topic.answer, lang) }));
}
