/** @type {import('tailwindcss').Config} */

/*
 * These values mirror src/design/tokens.css and must be kept in step by hand.
 *
 * They are literal rather than var(--g-*) because Tailwind v3 needs a parseable
 * colour to derive an opacity modifier such as bg-gold/30 from, and 149 places
 * use one. That duplication is a real hazard and it has already caused one
 * drift, so if a value changes here, change it there in the same commit.
 *
 * ── the ground turned over ────────────────────────────────────────────────
 *
 * This was a dark interface. It is now a light one, and the names did not
 * change — 1,167 places in the markup already speak this vocabulary, so what
 * moved is what each word means, not what it is called. `ink` is still the
 * page and `paper` is still the text; they simply swapped which one is dark.
 *
 * The reference is apps/majlis/design/*.dc.html, written down in
 * docs/DESIGN.md. Read that before changing a value here.
 *
 * ── colour carries meaning, and each role is spent on one thing ───────────
 *
 *   lapis     the board's own acts — put a question, record a position
 *   gold      the mark, and time running out
 *   settled   what holds: in force, met, recorded, done
 *   breach    overdue, refused, a threshold crossed
 *   muted     context, and only context
 *
 * `attention` is deliberately the same hex as `gold` now. The previous note
 * here warned against exactly that, and it was right at the time: gold was
 * then the accent, so an alarm sharing its hex said nothing. The accent has
 * since moved to lapis, which leaves gold free to mean the one thing it means
 * on every artboard — look here, the clock is running.
 */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Grounds. Vellum, a quiet surface, and a white sheet that is lifted
        // by shadow rather than fenced by a border.
        ink: '#FBF8F1',
        surface: '#F7F3EA',
        raised: '#FFFFFF',
        line: '#E8E1D4',

        // Text.
        paper: '#191713',
        sand: '#4E483F',
        muted: '#9C9284',

        // The board's own acts.
        lapis: '#164470',
        lapissoft: '#1E5A8A',

        // The mark, and time running out.
        gold: '#B08430',
        goldsoft: '#C29438',

        // What holds.
        settled: '#2C6B57',

        // Time running out. One hue with gold, for the reason above.
        attention: '#B08430',

        // Overdue, refused, crossed.
        breach: '#9A3830',

        // Kept: a great deal of existing markup names it.
        warn: '#B08430',
      },
      fontFamily: {
        display: ['Newsreader', 'Iowan Old Style', 'Palatino Linotype', 'Amiri', 'serif'],
        body: ['Manrope', 'system-ui', '-apple-system', 'Segoe UI', 'Noto Sans Arabic', 'Noto Nastaliq Urdu', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
        sans: ['Manrope', 'system-ui', 'Segoe UI', 'Noto Sans Arabic', 'Noto Nastaliq Urdu', 'sans-serif'],
        serif: ['Newsreader', 'Iowan Old Style', 'Palatino Linotype', 'Georgia', 'Amiri', 'serif'],
      },
      /*
       * Two widths, and a page belongs to one of them.
       *
       * `reading` is a column of prose. `work` is the width the artboards
       * are drawn at — a narrow list beside an open thing — and a page only
       * earns it once it is built to fill it. Widening a page of prose does
       * nothing but lengthen its lines.
       */
      maxWidth: { reading: '58rem', work: '76rem' },
      borderRadius: { card: '14px', sheet: '20px' },
      /*
       * Elevation instead of outline. The half-pixel ring is the first layer
       * of every one of these, so a surface never needs a border to be a
       * surface — which is what stops a page of fifteen identical rectangles
       * from happening again.
       */
      boxShadow: {
        ring: '0 0 0 0.5px rgba(25,23,19,0.05)',
        card:
          '0 0 0 0.5px rgba(25,23,19,0.055), 0 1px 2px rgba(25,23,19,0.045), 0 12px 24px -14px rgba(25,23,19,0.16)',
        lift:
          '0 0 0 0.5px rgba(25,23,19,0.055), 0 1px 2px rgba(25,23,19,0.045), 0 12px 24px -14px rgba(25,23,19,0.16), 0 40px 64px -40px rgba(25,23,19,0.24)',
        // Solid coloured controls carry their own colour, never a grey.
        act: '0 1px 2px rgba(19,58,95,0.2), 0 8px 18px -8px rgba(19,58,95,0.45)',
        actgold: '0 1px 2px rgba(166,122,40,0.24), 0 8px 18px -8px rgba(166,122,40,0.5)',
      },
    },
  },
  plugins: [],
};
