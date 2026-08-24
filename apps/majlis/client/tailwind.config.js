/** @type {import('tailwindcss').Config} */

/*
 * These values mirror src/design/tokens.css and must be kept in step by hand.
 *
 * They are literal rather than var(--g-*) because Tailwind v3 needs a parseable
 * colour to derive an opacity modifier such as bg-gold/30 from. That
 * duplication is a real hazard and it has already caused one drift: the tokens
 * were moved to the protocol palette and this file was not, so the application
 * kept rendering the old blue-black ground while the token file claimed
 * otherwise. If a value changes here, change it there in the same commit.
 *
 * The palette is the site's, to the value. What stays Majlis's own is the
 * reading serif and the density: a scholar reads long deliberation here, and
 * the Arabic and Urdu fallbacks matter more than any of it.
 */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0E1017',
        surface: '#171A24',
        deep: '#1E2230',
        line: '#2A2D38',
        muted: '#7F8192',
        paper: '#F5F4F1',
        sand: '#B0B1BE',
        gold: '#F7CC74',
        goldsoft: '#E8964A',
        warn: '#E8964A',
      },
      fontFamily: {
        display: ['Newsreader', 'Iowan Old Style', 'Palatino Linotype', 'Amiri', 'serif'],
        body: ['Manrope', 'system-ui', '-apple-system', 'Segoe UI', 'Noto Sans Arabic', 'Noto Nastaliq Urdu', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
        sans: ['Manrope', 'system-ui', 'Segoe UI', 'Noto Sans Arabic', 'Noto Nastaliq Urdu', 'sans-serif'],
        serif: ['Newsreader', 'Iowan Old Style', 'Palatino Linotype', 'Georgia', 'Amiri', 'serif'],
      },
      maxWidth: { reading: '46rem' },
    },
  },
  plugins: [],
};
