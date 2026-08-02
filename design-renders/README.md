# Design renders

**These are renders, not screenshots.** There was no browser available in the session that
produced them, so nothing here is a photograph of a running application.

What they are: the parametric geometry is genuine output of `apps/web/client/src/design/geometry.ts`
— the same module the application imports — composed into page layouts using the real values
from `design/tokens.css` and rasterised with cairosvg.

| File | |
|---|---|
| `web-desktop.png` | Public site hero, desktop 1440×900 |
| `web-mobile.png` | Public site hero, mobile 430×932 |
| `majlis-desktop.png` | Majlis matter view, desktop — denser, calmer |
| `majlis-arabic-rtl.png` | Majlis matter view, Arabic, right-to-left |

Two artefacts of the rendering pipeline rather than of the design: the Arabic render uses a
subset Noto Naskh face, so a few Latin punctuation marks fall back to boxes, and cairosvg
does not perform the same text shaping a browser does. Neither applies in a browser with the
full webfont.

`majlis-arabic-rtl.png` shows the vote-is-not-execution notice at the top of a matter. Stage Two, which
would make that notice mean something, is not built — see `SESSION-REPORT.md` §7.
