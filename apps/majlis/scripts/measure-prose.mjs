/**
 * Measure the guide's prose rather than judge it by ear.
 *
 * The same method the interface strings were put through: count the tells,
 * count the sentence lengths, and print the worst offenders with their text so
 * they can be rewritten one at a time. The author is the worst possible judge
 * of whether his own writing reads as machine-written.
 */

import { readFileSync } from 'node:fs';

const html = readFileSync(process.argv[2] ?? 'GUIDE-BODY.html', 'utf8');

// Strip tags, scripts and svg, and decode the few entities the file uses.
const text = html
  .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&rsaquo;/g, '>')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&mdash;/g, '—')
  .replace(/\s+/g, ' ')
  .trim();

const sentences = text
  .split(/(?<=[.!?])\s+/)
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && /[a-z]/i.test(s));

const words = (s) => s.split(/\s+/).filter(Boolean).length;

const TELLS = [
  [/\bnot only\b.{0,40}\bbut\b/i, 'not only ... but'],
  [/\bit'?s not just\b/i, "it's not just"],
  [/\bdelve\b/i, 'delve'],
  [/\bleverage\b/i, 'leverage'],
  [/\brobust\b/i, 'robust'],
  [/\bseamless/i, 'seamless'],
  [/\bcutting[- ]edge\b/i, 'cutting-edge'],
  [/\bin today'?s\b/i, "in today's"],
  [/\bever[- ]evolving\b/i, 'ever-evolving'],
  [/\bcrucial\b/i, 'crucial'],
  [/\bvital\b/i, 'vital'],
  [/\bcomprehensive\b/i, 'comprehensive'],
  [/\bempower/i, 'empower'],
  [/\bfoster/i, 'foster'],
  [/\bstreamlin/i, 'streamline'],
  /*
   * Narrowed after they flagged correct sentences. "Unlock" is a tell in
   * *unlock value*, not in *unlock a phone with a PIN*, and a checker that
   * cannot tell the two apart teaches the writer to avoid the true word.
   */
  [/\bunlock(ing)? (the |its |your )?(potential|value|power|insight)/i, 'unlock value'],
  [/\b(customer|user|learning) journey\b/i, 'journey'],
  [/\brealm\b/i, 'realm'],
  [/\blandscape\b/i, 'landscape'],
  [/\btapestry\b/i, 'tapestry'],
  [/\bnavigate the\b/i, 'navigate the'],
  [/\bat the end of the day\b/i, 'at the end of the day'],
  [/\bmoreover\b/i, 'moreover'],
  [/\bfurthermore\b/i, 'furthermore'],
  [/\bin conclusion\b/i, 'in conclusion'],
  [/\bstate[- ]of[- ]the[- ]art\b/i, 'state-of-the-art'],
  [/—/, 'em dash'],
];

const LONG = 25;

const counts = new Map();
const long = [];

for (const s of sentences) {
  for (const [re, name] of TELLS) {
    if (re.test(s)) counts.set(name, [...(counts.get(name) ?? []), s]);
  }
  if (words(s) > LONG) long.push(s);
}

const total = sentences.reduce((n, s) => n + words(s), 0);

console.log(`sentences        ${sentences.length}`);
console.log(`words            ${total}`);
console.log(`average sentence ${(total / sentences.length).toFixed(1)} words`);
console.log(`over ${LONG} words      ${long.length}`);
console.log('');

if (counts.size === 0) {
  console.log('tells            none');
} else {
  for (const [name, hits] of [...counts].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`tell: ${name} (${hits.length})`);
    for (const h of hits.slice(0, 4)) console.log(`   ${h.slice(0, 150)}`);
  }
}

if (long.length) {
  console.log('');
  console.log('the longest:');
  for (const s of long.sort((a, b) => words(b) - words(a)).slice(0, 8)) {
    console.log(`   [${words(s)}] ${s.slice(0, 170)}`);
  }
}
