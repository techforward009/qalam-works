# Qalam IndoPak Quranic — Phase 1A design notes

This is an original prototype. The centerlines in `sources/build_prototype.py` are the editable source. A shared stroke builds the outlines. No reference font was opened, traced, or renamed.

## Stroke

One thin round stroke, about 30 units on a 1000-unit em. Vertical stems taper slightly. Horizontal joins are a little thinner. Terminals are short curves, not heavy naskh slabs. The aim is a printed Indo-Pak mushaf: delicate, compact, and quieter than Noto Naskh.

## Proportions

The baseline bar sits near y=22 and is the skeleton every joining letter shares. Teeth and eyes stay low. Alef and lam rise to about 670. Descenders (reh, jeem, final noon, yeh) stay inside roughly -200 so a line of marks still fits. Sidebearings are tight, and the bar overlaps the next letter by about 20 units so joins meet.

## Spacing

Joining forms use the same bar, so the color of a word comes from that bar plus a few accents. Dots are small and close to the body. This is not final spacing. Phase 2 needs optical sidebearings per pair.

## Marks

Marks are zero-width and positioned with real anchors.

- `mark` places top marks (fatha, damma, shadda, sukun, superscript alif, madda, hamza, representative pauses) and bottom marks (kasra, hamza below, inverted damma, low meem, low seen).
- `mkmk` stacks a following top mark on shadda, sukun, or superscript alif.

Shadda plus fatha, and meem plus superscript alif, are the two stacks this phase proves. Marks are not positioned with spaces.

## Indo-Pak letters

The AhmedGraf corpus encodes kaf as U+0643, yeh as U+064A, and heh mostly as U+06C1. Those codepoints get Indo-Pak drawings:

- Kaf is one bowed arm over the baseline, not an Arabic naskh kaf.
- Heh goal is an open bowl. Medial heh goal is a small eye on the bar.
- Do-chashmi heh is two eyes on the bar.
- Yeh returns under the baseline. U+06CC is the same skeleton without dots. Bari yeh (U+06D2) is a larger open tail and does not join forward. The corpus does not use U+06CC or U+06D2; they are here so the Indo-Pak set exists.
- U+06DD is a small ring with a center dot, not a display medallion. Eastern digits U+06F0–U+06F9 sit beside it.

## OpenType

`init`, `medi`, and `fina` are single substitutions. HarfBuzz chooses them from Unicode joining. There is no private-use encoding. Unencoded alternates are `name_init`, `name_medi`, and `name_fina`.

## License target

SIL Open Font License 1.1, after the outlines are reviewed as original. This phase does not claim a finished OFL release. Reserved name, when released: Qalam IndoPak Quranic.

Phase 2A redraws only heh, kaf, and seen. A `chain()` helper strokes several cubics as one centerline, so a letter can be one gesture instead of stacked pieces. No new base letters.

Heh goal is a shallow open bowl: the left wall is taller, the bottom stays near the baseline, and the end turns in without closing. Final uses that same bowl plus the entry bar. Medial and initial are small asymmetric eyes from the same curve, not circles.

Kaf is one bowed stroke. It leaves the baseline, bends as it rises, and the arm sags on the way left before a short lift. The top anchor sits above the arm so fatha clears it.

Seen is one wave of three rounded teeth. The middle tooth is the tallest and its crest comes early. The baseline bar stops at the wave instead of running under it.

## Source choice

Parametric Python, compiled with fontTools to TrueType, plus a generated `build/features.fea`. The centerlines are easier to edit than a dumped contour file, and the script rebuilds the font without FontForge. WOFF2 can be added later with the same outlines.
