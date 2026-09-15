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

        /*
         * Tinted grounds, one per state, and the ink that reads on them.
         *
         * These four tints were already in tokens.css and had no name here, so
         * the markup wrote the hex — `#FCF0EE` appeared 25 times. The three
         * inks are the dark ends of gold and breach, used for text sitting on
         * a tint; they were only ever written as hex too.
         */
        settledtint: '#EBF3EF',
        goldtint: '#FBF4E4',
        breachtint: '#FCF0EE',
        lapistint: '#EAF1F7',
        goldink: '#8A6524',
        breachink: '#7A3A33',
        faint: '#B3A896',
      },
      fontFamily: {
        display: ['Newsreader', 'Iowan Old Style', 'Palatino Linotype', 'Amiri', 'serif'],
        body: ['Manrope', 'system-ui', '-apple-system', 'Segoe UI', 'Noto Sans Arabic', 'Noto Nastaliq Urdu', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
        sans: ['Manrope', 'system-ui', 'Segoe UI', 'Noto Sans Arabic', 'Noto Nastaliq Urdu', 'sans-serif'],
        serif: ['Newsreader', 'Iowan Old Style', 'Palatino Linotype', 'Georgia', 'Amiri', 'serif'],
      },
      /*
       * ── jedna ljestvica, i nista izvan nje ──────────────────────────────
       *
       * Mjereno prije ovoga: 38 razlicitih velicina slova u markupu, sa
       * polupikselima — 12.5px i 13px i 13.5px jedno pored drugog. Ljestvica
       * je postojala u tokens.css i nije bila pozvana nijednom, jer je bila
       * pisana za stranicu a ovo je instrument: gusce i sitnije.
       *
       * Ovih deset koraka su izvedeni iz onoga sto je aplikacija stvarno
       * koristila, a ne iz lijepog broja. Svaka od 38 vrijednosti otisla je na
       * najblizi korak, mehanicki. Prored i razmak slova isto: 15 proreda na
       * pet, 18 razmaka na pet.
       *
       * Bez line-height u ntorci, namjerno — inace bi fontSize gasio svaki
       * leading-* na istom elementu.
       */
      fontSize: {
        label: '10px', note: '11.5px', ui: '12.5px', body: '13.5px',
        lead: '15px', sub: '18px', title: '22px', head: '28px',
        display: '36px', hero: '44px',
      },
      lineHeight: {
        none: '0.95', tight: '1.15', snug: '1.45', relaxed: '1.6', loose: '1.7',
      },
      letterSpacing: {
        display: '-0.026em', title: '-0.018em', tight: '-0.01em',
        label: '0.1em', caps: '0.14em',
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

        /*
         * Coloured rings, one per state, and the two rings that mean chosen.
         *
         * Measured before this: 23 distinct hand-written shadows across 100
         * places, and most of them were the same half-pixel ring at four
         * slightly different opacities — 0.18, 0.2, 0.22, 0.25 of the same
         * red. Nobody can see the difference and everybody had to write it.
         */
        ringbreach: '0 0 0 0.5px rgba(154,56,48,0.22)',
        ringsettled: '0 0 0 0.5px rgba(44,107,87,0.2)',
        ringgold: '0 0 0 0.5px rgba(176,132,48,0.25)',
        ringlapis: '0 0 0 0.5px rgba(22,68,112,0.22)',
        // Chosen. 1.5px, because half a pixel cannot carry a selection.
        pick: '0 0 0 1.5px #164470',
        picksettled: '0 0 0 1.5px #2C6B57',
        pickgold:
          '0 0 0 1px rgba(176,132,48,0.3), 0 1px 2px rgba(25,23,19,0.045), 0 12px 24px -14px rgba(25,23,19,0.16)',
        // A window over the page.
        sheeted:
          '0 0 0 0.5px rgba(25,23,19,0.08), 0 2px 6px rgba(25,23,19,0.09), 0 24px 48px -16px rgba(25,23,19,0.35)',
        hairline: '0 1px 2px rgba(25,23,19,0.08)',
      },
    },
  },
  plugins: [],
};
