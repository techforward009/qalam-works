# Known Limitations

Structural limitations of a current format/approach — not bugs to be
"fixed" with more effort, but constraints to design around or resolve by
changing approach entirely. Distinct from `DECISIONS.md` (one-time
decisions with reasoning) and `AI-COLLABORATION.md` (day-to-day process
rules): this file is where "we know this is imperfect, and here's why
that's expected" lives, so nobody re-discovers the same dead end twice.

---

## Plain TXT → Word bidi rendering (bracket mirroring)

**Status:** Accepted limitation, not fixed
**Affects:** Document Studio's Copy Text / Download .txt, when the
document contains bracket/paren characters `( ) [ ]` next to RTL
Urdu/Arabic text, opened in Microsoft Word with an RTL paragraph

**What happens:**
A citation like `[Reference]` sitting inside RTL Urdu/Arabic text can
render with the bracket glyphs visually swapped (`]Reference[`-looking)
when the downloaded `.txt` file is opened directly in Word with the
paragraph set to RTL. The same text pasted directly into an LTR context,
or with the Word paragraph set to LTR, renders correctly.

**Why this is a plain-text limitation, not a bug in Document Studio:**
Brackets/parens are Unicode "mirrored" characters — by design, a
bidi-aware renderer flips their glyph when the surrounding run resolves
as RTL, so a "grouping" symbol still visually opens toward the reading
direction. That's correct, intentional behavior for brackets used as
grouping symbols. It's the wrong behavior for brackets that are just
literal citation-marker characters authored as part of the text — but
a plain `.txt` file has no way to express "this text is RTL, but treat
these specific bracket characters as literal, not as mirrored grouping
symbols." There's no metadata slot for that distinction in plain text;
the file is just a sequence of Unicode codepoints, and the renderer's own
bidi algorithm decides direction and mirroring per its own rules.

**What was tried and rolled back (2026-08-07):**
1. Wrapping brackets/digits in RLM (U+200F, "treat as RTL") marks — no
   effect, since the surrounding text was already RTL.
2. Wrapping the same characters in LRM (U+200E, "treat as LTR") marks
   instead — still didn't fix Word, AND broke direct-copy-paste, which
   had been working correctly before either attempt.

Both were fully reverted. Document Studio's plain-text export now
contains no invisible bidi marks at all — see `PHASE-3B-CLOSURE.md` and
the code comments in `extractPlainText.ts` for the detailed trail.

**Resolution path:**
Not a 3B blocker. Expected to become moot with Phase 3C's DOCX export:
a real `.docx` file has an actual paragraph-direction property (`w:bidi`
in the underlying XML) that can be set explicitly per paragraph, instead
of relying on a renderer's guess. If plain-text export specifically still
needs to look correct in Word someday, revisit only with controlled,
one-variable-at-a-time evidence from real Word documents — not further
speculation from Unicode bidi theory alone, which is what produced both
failed attempts here.
