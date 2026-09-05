/** @type {import('tailwindcss').Config} */

/*
 * These values mirror src/design/tokens.css and must be kept in step by hand.
 *
 * They are literal rather than var(--g-*) because Tailwind v3 needs a parseable
 * colour to derive an opacity modifier such as bg-gold/30 from. That
 * duplication is a real hazard and it has already caused one drift, so if a
 * value changes here, change it there in the same commit.
 *
 * ── colour carries meaning, and each role is spent on one thing ───────────
 *
 *   gold      the board's own — its words, its authority, its acts
 *   settled   what holds: in force, met, recorded, done
 *   attention time running out, and nothing else
 *   breach    overdue, refused, a threshold crossed
 *   muted     context, and only context
 *
 * The grounds are three real steps rather than three shades of the same dark,
 * so a raised card reads as raised without needing a border to say so.
 */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Grounds. Warmer and further apart than the old blue-blacks.
        ink: '#0B0C10',
        surface: '#14161C',
        raised: '#1C1F27',
        line: '#2C303B',

        // Text.
        paper: '#F6F5F2',
        sand: '#A8ABB8',
        muted: '#71747F',

        // The board's own.
        gold: '#F2C464',
        goldsoft: '#D9A648',

        // What holds.
        settled: '#6FBF9B',

        // Time running out.
        attention: '#E8A33D',

        // Overdue, refused, crossed.
        breach: '#DB6A5A',

        // Kept: a great deal of existing markup names it, and it now means
        // what its name says rather than doubling as the accent.
        warn: '#E8A33D',
      },
      fontFamily: {
        display: ['Newsreader', 'Iowan Old Style', 'Palatino Linotype', 'Amiri', 'serif'],
        body: ['Manrope', 'system-ui', '-apple-system', 'Segoe UI', 'Noto Sans Arabic', 'Noto Nastaliq Urdu', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
        sans: ['Manrope', 'system-ui', 'Segoe UI', 'Noto Sans Arabic', 'Noto Nastaliq Urdu', 'sans-serif'],
        serif: ['Newsreader', 'Iowan Old Style', 'Palatino Linotype', 'Georgia', 'Amiri', 'serif'],
      },
      // Wider. The old 46rem left a column of text in a field of black on any
      // screen a board actually uses.
      maxWidth: { reading: '58rem' },
      borderRadius: { card: '14px' },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.4), 0 8px 24px -12px rgba(0,0,0,0.6)',
        lift: '0 2px 4px rgba(0,0,0,0.4), 0 16px 40px -16px rgba(0,0,0,0.7)',
      },
    },
  },
  plugins: [],
};
