import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from './lib/i18n.js';
import { Line, Sheet, type Column } from './components/sheet.js';

/**
 * A row that opens something says so.
 *
 * ── what was measured ─────────────────────────────────────────────────────
 *
 * On the arrival screen at 1622 pixels: **twelve rows open something and two
 * of them said so**. The mark was drawn in the phone's branch of the row and
 * nowhere else, so at a desk a member had no way of telling a line that is a
 * fact from a line that is a way in except by pointing at it and watching the
 * cursor — on the one screen whose whole job is fourteen things to do.
 *
 * ── and a row that opens nothing must not claim to ────────────────────────
 *
 * Which is the half that makes the first one worth anything: a mark on every
 * row is the same as a mark on none. The register draws rows that are facts
 * beside rows that are ways in, in one list.
 *
 * ── where it is drawn ─────────────────────────────────────────────────────
 *
 * Laid on the end of the row rather than given a column: a column would have
 * to be in `columns`, which the heading row is drawn from too, so every list
 * in the application would need a width for something that is not a column.
 * The row leaves the room for it, and so does the heading, or every heading
 * sits a mark's width to the side of its figures.
 *
 * `useWide` answers *desk* under a test runner, so what is rendered here is
 * the branch that was missing it.
 */

const COLS: readonly Column[] = [
  { head: 'What', width: 'minmax(0,2fr)', phone: 'lead' },
  { head: 'Days', width: '4rem', end: true, phone: 'trailing' },
];

const chevrons = (within: HTMLElement) =>
  within.querySelectorAll('svg[viewBox="0 0 8 13"]').length;

function draw() {
  render(
    <I18nProvider>
      <MemoryRouter>
        <Sheet columns={COLS}>
          <Line columns={COLS} to="/matters/m1" cells={['A way in', '7']} />
          <Line columns={COLS} onPress={() => undefined} cells={['Opens a panel', '3']} />
          <Line columns={COLS} cells={['A fact', '1']} />
        </Sheet>
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe('a row that leads further', () => {
  it('carries the mark, whether it opens a screen or a panel', () => {
    draw();

    const wayIn = screen.getByText('A way in').closest('li')!;
    const panel = screen.getByText('Opens a panel').closest('li')!;

    expect(chevrons(wayIn)).toBe(1);
    expect(chevrons(panel)).toBe(1);
  });

  it('is not drawn on a row that is a fact', () => {
    draw();

    const fact = screen.getByText('A fact').closest('li')!;
    expect(chevrons(fact)).toBe(0);
  });

  it('leaves the room for it on the row and on the headings alike', () => {
    draw();

    const wayIn = screen.getByText('A way in').closest('li')!;
    const fact = screen.getByText('A fact').closest('li')!;
    const head = screen.getByRole('row');

    /*
     * The row that carries one and the heading leave the same end padding;
     * the row that carries none does not, so a list of facts is not indented
     * against nothing.
     */
    expect(wayIn.className).toContain('pe-9');
    expect(head.className).toContain('pe-9');
    expect(fact.className).toContain('pe-5');
    expect(fact.className).not.toContain('pe-9');
  });
});
