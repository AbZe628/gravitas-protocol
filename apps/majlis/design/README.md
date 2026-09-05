# The artboards

Three screens, drawn before they were built, in the language `../docs/DESIGN.md`
records:

| file | size | what it shows |
|---|---|---|
| `Main.dc.html` | 1440×900 | arrival — *what needs you* |
| `Matter.dc.html` | 1440×980 | one matter — the question, and the act |
| `Phone.dc.html` | 390×844 | arrival on a phone |
| `canvas.json` | — | layout, and the three notes on the canvas |

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
  --canvas canvas.json
```

then publish `majlis-interface.html` with `contract: "0.1.31"` and no
`capabilities` (the stored declaration carries forward).

The seeder runs in `C:\Users\Abdusamed\Desktop\Website_demo_gravitas\design\`,
which holds the same four files plus the 2.5 MB seeded output. That output is
regenerable and is **not** committed here. Keep the two copies of the four
source files in step.

## Not drawn yet

Calculations, contract library, register.
