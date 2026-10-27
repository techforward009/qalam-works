#!/usr/bin/env python3
"""Build the shared editor/export Digital Khatt face (fonttools[woff]).

Both consumers load this repaired output; the historical Pdf-v2 filename does
not denote a PDF-only asset. The v3 input provides the Urdu/jazm cmap aliases.
Repair dangling mark-filter references without changing outlines, advances,
cmap aliases or substitution/positioning subtables.
"""
from pathlib import Path
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "public/fonts"
SOURCE = FONTS / "DigitalKhattIndoPakQalam-v3.woff2"
OUTPUT = FONTS / "DigitalKhattIndoPakQalamPdf-v2.woff2"
NOTICE = (
    "Qalam Works PDF compatibility derivative: dangling OpenType mark-filter "
    "references (UseMarkFilteringSet 0x0010) are replaced by IgnoreMarks 0x0008 "
    "in nine GSUB and three GPOS lookup flags; their dangling MarkFilteringSet "
    "fields are removed. Glyph outlines, cmap aliases, advances and substitution/"
    "positioning subtables are unchanged. SIL OFL 1.1."
)


def main():
    font = TTFont(SOURCE, recalcTimestamp=False)
    unchanged = {tag: font.getTableData(tag) for tag in ("glyf", "hmtx", "cmap")}
    glyph_order = font.getGlyphOrder()
    sets = getattr(font["GDEF"].table, "MarkGlyphSetsDef", None)
    count = len(sets.Coverage) if sets else 0
    repaired = []
    for tag in ("GSUB", "GPOS"):
        for index, lookup in enumerate(font[tag].table.LookupList.Lookup):
            if lookup.LookupFlag & 0x10 and lookup.MarkFilteringSet >= count:
                repaired.append((tag, index))
                lookup.LookupFlag = (lookup.LookupFlag & ~0x10) | 0x08
                del lookup.MarkFilteringSet
    assert len(repaired) == 12, f"Source font changed; review mark-filter rules: {repaired}"
    old_notice = font["name"].getDebugName(10) or ""
    copyright_notice = old_notice[old_notice.index("Copyright"): ] if "Copyright" in old_notice else ""
    for record in list(font["name"].names):
        if record.nameID == 10:
            font["name"].setName(NOTICE + " " + copyright_notice, 10, record.platformID, record.platEncID, record.langID)
    font.save(OUTPUT)
    result = TTFont(OUTPUT, recalcTimestamp=False)
    assert result.getGlyphOrder() == glyph_order
    for tag, data in unchanged.items():
        assert result.getTableData(tag) == data, f"Unexpected {tag} change"
    (FONTS / "DigitalKhattIndoPakQalamPdf-v2-OFL.txt").write_text(
        NOTICE + "\n\n" + (FONTS / "DigitalKhattIndoPakQalam-v3-OFL.txt").read_text(encoding="utf-8"), encoding="utf-8"
    )
    print(f"Repaired {len(repaired)} dangling mark-filter references: {repaired}")


if __name__ == "__main__":
    main()
