# The artboards

Six screens, drawn before they were built, in the language `../docs/DESIGN.md`
records:

| file | size | what it shows |
|---|---|---|
| `Main.dc.html` | 1440×900 | arrival — *what needs you* |
| `Matter.dc.html` | 1440×980 | one matter — the question, and the act |
| `Phone.dc.html` | 390×844 | arrival on a phone |
| `Calculations.dc.html` | 1440×980 | a rule the board wrote, applied to figures |
| `Library.dc.html` | 1440×980 | what already stands about a contract shape |
| `Register.dc.html` | 1440×980 | what stands, and the supersession chain behind it |
| `canvas.json` | — | layout, and the six notes on the canvas |

Two rows on the canvas: the journey on top, the tools underneath.

Published at
**https://claude.ai/code/artifact/05e2cfc1-89ff-4a56-9e23-6c143ce1d5e1**

## Changing one

Edit the `.dc.html`, then re-seed and republish to the **same URL** — a new URL
means a second canvas and the link the user holds stops being the design.

```
node <design-skill>/seed-canvas.mjs \
  --template <design-skill>/payload.template.html \
  --out majlis-interface.html --title "Majlis Interface" \
  --artboard Main.dc.html --artboard Matter.dc.html --artboard Phone.dc.html \
  --artboard Calculations.dc.html --artboard Library.dc.html --artboard Register.dc.html \
  --canvas canvas.json
```

then publish `majlis-interface.html` with `contract: "0.1.31"` and no
`capabilities` (the stored declaration carries forward).

The seeder runs in `C:\Users\Abdusamed\Desktop\Website_demo_gravitas\design\`,
which holds the same seven files plus the 2.5 MB seeded output. That output is
regenerable and is **not** committed here. Keep the two copies of the seven
source files in step.

## The pattern the three tool screens share

One narrow, quiet list and one open thing carrying the shadow — the shape a
scholar already knows from mail. Never a grid of equal cards, because nothing
here is equally important.

Each of the three also states what it is **not**: the calculation says Majlis
did not choose the threshold, the library names the shapes never put to this
board, the register says what nobody can do here.

