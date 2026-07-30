/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0A1428',
        surface: '#0C1A33',
        line: '#22314F',
        muted: '#7C8BA5',
        paper: '#EDEAE0',
        gold: '#C9A845',
        goldsoft: '#E3C878',
        warn: '#B85C50',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Noto Sans Arabic', 'Noto Nastaliq Urdu', 'sans-serif'],
        serif: ['Georgia', 'Amiri', 'serif'],
      },
      maxWidth: { reading: '46rem' },
    },
  },
  plugins: [],
};
