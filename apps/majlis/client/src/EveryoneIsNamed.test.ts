import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * A person on the screen is a name, never the key the record files them under.
 *
 * ── the fault this holds shut ─────────────────────────────────────────────
 *
 * The record attributes every act to a scholar id — `member-a` — because a
 * name is not a key and can change. Nineteen places drew that id as it came:
 * who spoke in the deliberation and whom a reply answers, who voted, who was
 * present at a sitting, who found a breach actual, who recorded a figure, who
 * adopted a shape, who gave an undertaking — and the top bar of every screen,
 * which told each member they were `member-b`. On the demonstration board
 * every avatar was the same letter, the first of `member-`.
 *
 * Found by looking at the screens, after the column that says who holds a step
 * had been fixed for the same fault and the rest had not been looked at.
 *
 * ── what this checks ──────────────────────────────────────────────────────
 *
 * Every screen, for a field that holds a person being drawn as text — as a
 * child of an element, or inside a string that is. A field passed as a prop
 * (`scholarId={…}`, `key={…}`) is not drawn and is left alone; `<Person>`
 * and `nameOf` are how a person is drawn.
 *
 * A static reading, like the dictionary guard beside it, because the nineteen
 * are on nineteen different screens and a guard that rendered each would be
 * nineteen fixtures that stop being kept up. It says what it cannot see: a
 * person held in a variable of some other name and drawn later is past it.
 */

/** The fields in this record that hold a person. */
const PERSON = ['scholarId', 'by', 'recordedBy', 'reportedBy', 'decidedBy', 'askedBy', 'who', 'holder'];
/*
 * Not `whoName`. It holds a name wherever it is left — the undertakings and the
 * margin notes resolve it on the server — and the passage's field that held an
 * id under that name is `who` now. See `Step.who` in services/passage-shape.ts.
 */

const chain = String.raw`[A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*)*\??\.`;
const field = `(?:${PERSON.join('|')})`;

/** `{x.by}`, `{x?.scholarId ?? …}`, `{x.who || …}` — a person as a child, not a prop. */
const AS_CHILD = new RegExp(String.raw`(?<!(?:=\s*|\$))\{\s*(${chain}${field})\s*(?:\}|\?\?|\|\|)`, 'g');
/** `${x.who}` or `${x.by ?? '—'}` inside a template — which, on these screens, is drawn. */
const IN_TEMPLATE = new RegExp(String.raw`\$\{\s*(${chain}${field})\s*(?:\}|\?\?|\|\|)`, 'g');

/**
 * The ids drawn on purpose, each with its reason.
 *
 * Named by file **and** field, so an exception for one line is not a licence
 * for the rest of the file.
 */
const ON_PURPOSE: Record<string, { fields: string[]; why: string }> = {
  'pages/Settings.tsx': {
    fields: ['m.scholarId'],
    why:
      'The settings screen compares the board’s list with the credential file, and the id is the ' +
      'one thing the two have in common: it answers *which line of MAJLIS_MEMBERS is this*, beside the name.',
  },
  'components/ReadDocument.tsx': {
    fields: ['identity?.scholarId'],
    why:
      'Not drawn: it goes into the provenance sentence stored with a confirmed figure. The record ' +
      'attributes by id, and a name frozen into a stored sentence could never be resolved again.',
  },
};

function screens(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...screens(path));
    else if (/\.tsx$/.test(path) && !path.includes('.test.')) out.push(path);
  }
  return out;
}

/** A template that is an attribute's value — `key={`${s.scholarId}-${i}`}` — is not drawn. */
const TEMPLATE_PROP = /[A-Za-z-]+=\{\s*`[^`]*`\s*\}/g;

function drawn(source: string): string[] {
  source = source.replace(TEMPLATE_PROP, '');
  const found: string[] = [];
  for (const re of [AS_CHILD, IN_TEMPLATE]) {
    re.lastIndex = 0;
    for (let m = re.exec(source); m; m = re.exec(source)) found.push(m[1]);
  }
  return found;
}

describe('a person is drawn by name', () => {
  it('finds the shapes it is looking for, or it proves nothing', () => {
    // Each of these was on a screen.
    expect(drawn('<span className="x">{entry.scholarId}</span>')).toEqual(['entry.scholarId']);
    expect(drawn("{identity?.scholarId ?? t('shell.anonymous')}")).toEqual(['identity?.scholarId']);
    expect(drawn("{t('recorded.by')} {c.recordedBy} · {c.source}")).toEqual(['c.recordedBy']);
    expect(drawn("{theirs ? `${t('moved.theirs')} · ${theirs.who}` : x}")).toEqual(['theirs.who']);
    expect(drawn("`${t('read.confirmedBy')} ${identity?.scholarId ?? '—'} `")).toEqual(['identity?.scholarId']);
    // And these are not drawn.
    expect(drawn('<li key={a.scholarId}>')).toEqual([]);
    expect(drawn('<Avatar id={identity?.scholarId} />')).toEqual([]);
    expect(drawn('<li key={`${s.scholarId}-${s.at}-${i}`}>')).toEqual([]);
    expect(drawn('{nameOf(members, row.who)}')).toEqual([]);
    expect(drawn('<Person id={row.who} />')).toEqual([]);
    expect(drawn("{t('recorded.by')}")).toEqual([]);
  });

  it('draws no id where a name belongs, on any screen', () => {
    const root = join(__dirname);
    const files = screens(root);
    expect(files.length, 'the walk found no screens').toBeGreaterThan(80);

    const wrong = files
      .map((f) => {
        const file = relative(root, f).replace(/\\/g, '/');
        const allowed = ON_PURPOSE[file]?.fields ?? [];
        return { file, hits: drawn(readFileSync(f, 'utf8')).filter((h) => !allowed.includes(h)) };
      })
      .filter((x) => x.hits.length > 0)
      .map((x) => `${x.file}: ${x.hits.join(', ')}`);

    expect(wrong).toEqual([]);
  });

  it('still sees every exception, or an exception hides nothing', () => {
    for (const [file, { fields }] of Object.entries(ON_PURPOSE)) {
      const hits = drawn(readFileSync(join(__dirname, file), 'utf8'));
      for (const f of fields) expect(hits, `${file} no longer draws ${f}; drop the exception`).toContain(f);
    }
  });
});
