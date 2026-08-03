/** @type {import('tailwindcss').Config} */

// Values mirror src/design/tokens.css. They are literal here rather than
// var(--g-*) because Tailwind v3 needs a parseable colour to derive opacity
// modifiers such as bg-gold/30 from. If a value changes, change it in both.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0A1428',
        surface: '#0C1A33',
        deep: '#0E2A2E',
        line: '#22314F',
        muted: '#7C8BA5',
        paper: '#EDEAE0',
        sand: '#C9BFA6',
        gold: '#C9A845',
        goldsoft: '#E3C878',
        warn: '#B85C50',
      },
      fontFamily: {
        display: ['Iowan Old Style', 'Palatino Linotype', 'Palatino', 'Amiri', 'serif'],
        body: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Noto Sans Arabic', 'Noto Nastaliq Urdu', 'sans-serif'],
        mono: ['ui-monospace', 'SF Mono', 'JetBrains Mono', 'Menlo', 'monospace'],
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Noto Sans Arabic', 'Noto Nastaliq Urdu', 'sans-serif'],
        serif: ['Iowan Old Style', 'Palatino Linotype', 'Georgia', 'Amiri', 'serif'],
      },
      maxWidth: { reading: '46rem' },
    },
  },
  plugins: [],
};
