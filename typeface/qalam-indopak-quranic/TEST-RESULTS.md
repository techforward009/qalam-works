# Qalam IndoPak Quranic — Phase 1B test results

Built with fontTools. Checked with fontTools and HarfBuzz (`sources/check_prototype.py`). Browser specimen uses the compiled font, not images of text.

## Al-Fatihah

1:1–1:7 now shapes with no `.notdef`. The seven ayahs are in `sources/fatiha-1.txt`, copied from the AhmedGraf corpus and not rewritten. HarfBuzz reports 316 glyphs for that passage and zero missing boxes.

Joins that matter in the surah are present: lam initial, seen medial, yeh medial, dad medial, noon final, heh-goal final, waw final.

## Other samples

Maryam 19:1–4 and Al-Baqarah 2:282 still contain letters this phase does not draw:

ء خ ز ش ظ ى

and marks U+064B, U+064C, U+064D, U+0656, U+06E0. Those stay boxes. That is intentional.

## What improved

- Heh goal is a shallower open bowl instead of a cornered hook. It is rounder, and still not soft enough.
- Kaf keeps the long arm, now as a curve with a small terminal rather than two straight strokes.
- Seen teeth are uneven in height and the peak sits off-center, so the row is less like three identical arches. It is still more regular than a pen.
- Final yeh returns under the baseline and ends in a short hook. The two dots sit closer to the tail.
- Fatha and shadda are smaller. Alef and lam are shorter, so vowels sit nearer the letters.
- Sad now shares the baseline bar, so it joins.

## Comparison

Against Noto, the line is thinner, tighter, and the kaf and gol heh are not Naskh. Against PDMS Saleem, Qalam is still stiffer: the bowls are simpler, the teeth are more even, and the marks are plainer. It reads as a Quranic line, not as a finished mushaf face.

## Still weak

Heh goal’s bowl, the kaf arm, and seen’s rhythm need a drawn pass before any more letters. Waw’s tail and tah’s stem are serviceable and plain. No kerning. No lam-alef.

The corpus and the production reader were not modified.
