# The design language

The artboards in `apps/majlis/design/` are the source. This file is what they
mean, written down so the application can be brought to them without deriving
the rules a second time.

The brief that produced it, in the words it was given in: *islamic, more light,
flawless on a phone, terribly simple to use, intuitive, very powerful with all
the tools but not thrown together* — then, once the direction was accepted:
*nicer, tidier, higher quality, more Apple, Zaha Hadid.*

Apple and Zaha are not two briefs. Apple is precision; Zaha is a single
calligraphic sweep. Arabic writing is where they meet, and that is the whole
idea: **one continuous curve, everything else exact.**

---

## Ground and light

The screen has a light source. It is not a flat colour.

```
vellum        #FBF8F1   the page
rail          rgba(247,243,234,0.72)  translucent, backdrop-filter: blur(20px)
sheet         #FFFFFF   a card, lifted off the vellum, never fenced by a border
quiet sheet   rgba(255,255,255,0.72–0.78)  a card that is not the subject
```

Every screen carries a `radialGradient` of white at 0.9–0.95 opacity in one
corner, falling to zero. That is the light. It is the reason the vellum reads
as paper rather than as beige.

## Ink

```
ink           #191713   body and display
strong        #4E483F   secondary body
muted         #635C52   explanatory prose
quiet         #9C9284   captions, meta
faint         #B3A896   section labels, disabled, placeholder
hairline      rgba(25,23,19,0.05–0.09)
```

## The four colours that mean something

Colour is never decoration here. Each one carries exactly one meaning, and a
screen that uses one for anything else is wrong.

| colour | hex | gradient for solid controls | means |
|---|---|---|---|
| lapis | `#164470` | `linear-gradient(150deg,#1E5A8A,#143E67)` | the board's own acts — put a question, record a position |
| manuscript gold | `#B08430` | `linear-gradient(150deg,#C29438,#A67A28)` | the mark, and time running out |
| verdigris | `#2C6B57` | `linear-gradient(150deg,#35806A,#24594A)` | what holds — settled, in favour, ratified |
| madder | `#9A3830` | — | overdue, refused, breached |

Tinted pill backgrounds, one per colour, all with a `0.5px` ring of the colour
at 0.18–0.22 alpha: `#EBF3EF` green, `#FBF4E4` gold, `#FCF0EE` madder.

## Elevation, not borders

There is not one `1px solid` border in the design. There are three levels:

```css
/* hairline ring — a quiet surface, a field, a tab */
box-shadow: 0 0 0 0.5px rgba(25,23,19,0.05);

/* a card */
box-shadow: 0 0 0 0.5px rgba(25,23,19,0.055),
            0 1px 2px rgba(25,23,19,0.045),
            0 12px 24px -14px rgba(25,23,19,0.16);

/* the one thing on the screen that matters */
box-shadow: 0 0 0 0.5px rgba(25,23,19,0.055),
            0 1px 2px rgba(25,23,19,0.045),
            0 12px 24px -14px rgba(25,23,19,0.16),
            0 40px 64px -40px rgba(25,23,19,0.24);
```

Solid coloured controls carry a **coloured** shadow, never a grey one:
`0 1px 2px rgba(19,58,95,0.2), 0 8px 18px -8px rgba(19,58,95,0.45)`.

Radii: `12px` controls and small cards, `16–18px` panels, `20–22px` the
principal card, `999px` pills and avatars.

## The sweep

One continuous curve per screen, in an absolutely positioned `<svg>` behind
everything, `pointer-events: none`. It is a pointed arch opened out until it is
a sweep. It carries light from one corner across the screen and is never a line
the eye is asked to read — two fills at 0.05–0.075 alpha, plus at most two
hairline strokes at 0.10–0.13.

- **Main** — enters top-left at the rail, crosses to the top-right; a second
  gold-tinted sweep falls down the right.
- **Matter** — enters top-left, curves down through the middle and out the
  bottom, separating the question from the act without a divider.
- **Phone** — falls from the top-right across the masthead.

The card rule is the same gesture at small scale: **not** a flat 4px bar, but a
path that tapers the way a nib lifts off the page.

```html
<svg width="14" height="220" viewBox="0 0 14 220" style="position:absolute;left:0;top:0;">
  <path d="M0 0 C 6 26, 6 60, 4.5 108 C 3.4 150, 2 182, 0 220 Z" fill="#9A3830"/>
</svg>
```
(the parent needs `position: relative; overflow: hidden`.)

## Geometry

The eight-point khatam inside a pointed arch is the board's mark. It appears
**once per screen**, at the top of the rail, and nowhere else.

The girih tessellation that earlier ran behind mastheads has been **removed
entirely**. Pattern fills read as wallpaper; the sweep does the same work as
architecture. Do not put it back.

## Type

```
Newsreader     display serif — the board's words, headings, figures, quotations
Manrope        UI — labels, buttons, body, meta
IBM Plex Mono  figures that are read as data — bps, hours, countdowns
Amiri          Arabic
```

The scale actually in use, with its tracking:

| role | size / line-height | tracking |
|---|---|---|
| page title (Newsreader 400) | 36–38 / 1.06–1.12 | −0.024 to −0.026em |
| card title (Newsreader 400) | 23–28 / 1.2 | −0.018 to −0.02em |
| quoted question (Newsreader 400) | 19 / 1.62 | −0.004em |
| big figure (Newsreader 400) | 40–56 / 0.9 | −0.028 to −0.03em, `tabular-nums` |
| body (Manrope 400) | 14 / 1.65 | — |
| meta (Manrope 400) | 12–13 / 1.5 | — |
| section label (Manrope 700, caps) | 10 | 0.15em |
| pill (Manrope 700, caps) | 10.5 | 0.1em |

Every column of digits gets `font-variant-numeric: tabular-nums`. Running prose
is capped with `max-width` in `ch` (56–62ch), never in pixels.

## The phone

Not a small desktop. Status bar and home indicator are drawn so it reads as a
device. One card is the subject; the primary control is **52px** tall (the 44px
floor is a minimum, not a target); the tab bar is four items on a
`backdrop-filter: blur(24px)` surface above the home indicator; the sweep is
scaled to the hand, not cropped from the desktop.

## What was removed, and stays removed

- every `1px solid` border → a `0.5px` ring or a shadow
- the girih pattern fills
- flat 4px accent bars → tapering paths
- grey shadows under coloured buttons → coloured shadows
- flat colour on solid controls → a 150° gradient
- `#FAF6ED` / `#1C1A17` → `#FBF8F1` / `#191713` (lighter ground, softer ink)

---

## Bringing this into the application

`client/src/components/kit.tsx` was written against the *previous* palette and
**is not imported anywhere yet**. It is the intended landing point: rewrite its
tokens to the table above, then use it, rather than starting a third system.

`client/tailwind.config.js` and `client/src/design/tokens.css` currently hold a
**dark** ground (`ink #0B0C10 / surface #14161C / raised #1C1F27`) from an
earlier pass. Those two files and `kit.tsx` have to move together — changing
one alone leaves the application in two languages at once.
