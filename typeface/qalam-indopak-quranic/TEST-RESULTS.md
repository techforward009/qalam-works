# Qalam IndoPak Quranic — Phase 1A test results

## Samples

Rendered from the AhmedGraf Indo-Pak corpus, unmodified:

- Al-Fatihah 1:1–7
- Maryam 19:1–4
- Al-Baqarah 2:282
- The same passages carry the mark-heavy sequences, U+06DD, and the Indo-Pak letters ہ، ھ، ي، ك

`sources/check_prototype.py` shapes بِسْمِ, رَّ, مٰ, and ۝۱۲.

## What rendered

- بِسْمِ becomes beh initial, seen medial, meem final, with kasra and sukun attached.
- رَّ places shadda on reh and fatha above the shadda (`mkmk`). Measured offsets: shadda above the base, fatha higher than the shadda.
- مٰ places the superscript alif on meem.
- اللہِ joins alef, lam initial, lam medial, heh-goal final.
- ۝ plus an eastern digit uses the small ring, not a missing glyph.
- The stroke is visibly thinner and more compact than Noto Naskh on the same line.
- Kaf reads as a slanted arm rather than a Naskh kaf. Final yeh returns under the line. The verse ring is small.

## What is still wrong

- Only the first letter set exists. Fatiha still drops waw, hah, tah, thal, ghain, dad, and teh to `.notdef`. That is expected for this phase and it breaks the line.
- Heh goal is recognizable as a bowl, but the contour is still stiff.
- Kaf’s arm is the right idea and not yet elegant.
- Seen teeth and meem tails need a calligrapher’s pass; some joins look mechanically even.
- Pause marks are simple ticks, not the small ligatures of a finished mushaf.
- No kerning, no real kasheeda behavior beyond U+0640, no lam-alef ligature.
- Bari yeh and dotless yeh are drawn but unused by this corpus.
- `1 MUHAMMADI QURANIC.ttf` was not in the attachment folder, so that reference could not be rendered here. PDMS Saleem, Al Qalam, and Al Majeed were available as visual references only.

## Before Phase 2

1. Redraw heh goal, kaf, seen, and final yeh by hand on top of these proportions.
2. Add the missing base letters that Fatiha and 2:282 actually use, still from this stroke, before any ornament.
3. Replace the placeholder pause marks with small original signs.
4. Tune anchors on tall letters so fatha does not sit as high as it does on lam.
5. Only then consider a page specimen against PDMS at the same point size.

The corpus file and the production reader were not modified.
