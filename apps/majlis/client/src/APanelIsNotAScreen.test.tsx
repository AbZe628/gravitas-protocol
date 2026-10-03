import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { I18nProvider } from './lib/i18n.js';
import SlideOver from './components/SlideOver.js';
import en from './locales/en.js';

/**
 * A panel that covers the whole phone is a screen.
 *
 * ── what was measured ─────────────────────────────────────────────────────
 *
 * The calculations, opened at 375 × 812: the panel arrived as **375 × 812 at
 * the origin**. The whole screen, over what the member was reading, with the
 * seven calculations in the top third and five hundred pixels of nothing
 * under them. A member who opened it to look something up had lost the thing
 * they opened it from — which is the one promise a panel makes over a screen.
 *
 * ── what it does now ──────────────────────────────────────────────────────
 *
 * Comes up from the foot at two heights, with the work still above it. The
 * height changes by pressing the grip, not by dragging it: the board's owner
 * was asked about gestures on a phone and said not for now, and a press is
 * the one way that also works from a keyboard.
 *
 * It opens at the shorter height every time. The height somebody wanted for
 * the contract library is not a decision about the next thing they open.
 *
 * ── and the desk is untouched ─────────────────────────────────────────────
 *
 * Full height against the edge, no grip. Measured at 1622: 720 wide, against
 * the window's edge, and the grip not drawn.
 */

function Open({ open = true }: { open?: boolean }) {
  return (
    <I18nProvider>
      <SlideOver open={open} title="The calculations" onClose={() => undefined}>
        <p>Something to work in.</p>
      </SlideOver>
    </I18nProvider>
  );
}

const panel = () => screen.getByRole('dialog', { name: 'The calculations' });
const grip = () => screen.getByRole('button', { name: new RegExp(`${en['sheet.raise']}|${en['sheet.lower']}`) });

afterEach(cleanup);

describe('a panel on a phone', () => {
  it('comes up from the foot, not over the whole screen', () => {
    render(<Open />);

    /*
     * The container puts it at the foot below `sm` and against the edge above
     * it. jsdom applies no stylesheet, so what is asserted is the instruction
     * — the pixels were measured by opening it at 375 and again at 1622.
     */
    const holder = panel().parentElement!;
    expect(holder.className).toContain('items-end');
    expect(holder.className).toContain('sm:items-stretch');
    expect(holder.className).toContain('sm:justify-end');
  });

  it('opens at the shorter of its two heights', () => {
    render(<Open />);
    expect(panel().className).toContain('h-[62svh]');
    expect(panel().className).not.toContain('h-[92svh]');
    /* And it is the whole height at a desk, where there is one. */
    expect(panel().className).toContain('sm:h-full');
  });

  it('takes the taller one when the grip is pressed, and gives it back', () => {
    render(<Open />);

    expect(grip().getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(grip());

    expect(panel().className).toContain('h-[92svh]');
    expect(grip().getAttribute('aria-expanded')).toBe('true');
    expect(grip().getAttribute('aria-label')).toBe(en['sheet.lower']);

    fireEvent.click(grip());
    expect(panel().className).toContain('h-[62svh]');
  });

  it('opens short again the next time, whatever the last one was left at', () => {
    const { rerender } = render(<Open />);

    fireEvent.click(grip());
    expect(panel().className).toContain('h-[92svh]');

    rerender(<Open open={false} />);
    rerender(<Open open={true} />);

    expect(panel().className).toContain('h-[62svh]');
  });

  it('draws no grip where there is nothing to raise', () => {
    render(<Open />);
    /*
     * It is there and it is a phone's control. The desk never sees it, which
     * is said in the one place a test without a stylesheet can read.
     */
    expect(grip().className).toContain('sm:hidden');
  });
});
