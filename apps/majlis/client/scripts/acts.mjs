/*
 * Faza 5, mjerena a ne procijenjena.
 *
 * Koliko cinova ima prozor prije sebe i „sta slijedi" poslije, a koliko ih se
 * desi tiho. Brojano iz koda, po ekranu na kojem se cin poziva.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename, relative } from 'node:path';

const SRC = process.argv[2] ?? '.';
const api = readFileSync(join(SRC, 'lib/api.ts'), 'utf8');

/* Cin je sve sto ide kroz `send<` — citanja ne mijenjaju zapis. */
const acts = [
  ...new Set(
    [...api.matchAll(/^\s{2}([a-zA-Z][a-zA-Z0-9]*):\s*\([^)]*\)[^=]*=>[\s\S]{0,240}?send</gm)].map(
      (m) => m[1],
    ),
  ),
];

const files = [];
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.tsx') && !p.includes('.test.')) files.push(p);
  }
})(SRC);

const text = new Map(files.map((f) => [f, readFileSync(f, 'utf8')]));

const hasWindow = (t) => /<Act\b/.test(t) || /<Dialog\b/.test(t);
const hasAfter = (t) => /AfterAct|whatFollows|<NextAct|onDid|after={{/.test(t);

let counted = 0;
const quiet = [];
const windowed = [];

for (const act of acts) {
  const calls = files.filter((f) => text.get(f).includes('.' + act + '('));
  const screens = calls.filter((f) => !f.includes(join('lib', '')));
  if (screens.length === 0) continue;
  counted++;

  const anyWindow = screens.some((f) => hasWindow(text.get(f)));
  const anyAfter = screens.some((f) => hasAfter(text.get(f)));

  const where = screens.map((f) => basename(f)).join(', ');
  if (anyWindow && anyAfter) windowed.push(`${act}  ·  ${where}`);
  else quiet.push(`${act}  ·  ${where}  ·  ${anyWindow ? 'prozor bez „šta slijedi"' : 'ni prozora'}`);
}

console.log(`činova pozvanih sa nekog ekrana:  ${counted}`);
console.log(`  prozor I „šta slijedi":         ${windowed.length}`);
console.log(`  bez jednog ili oba:             ${quiet.length}`);
console.log();
console.log('— sa oboje —');
console.log(windowed.map((l) => '  ' + l).join('\n') || '  (nijedan)');
console.log();
console.log('— bez —');
console.log(quiet.map((l) => '  ' + l).join('\n'));
