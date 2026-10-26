#!/usr/bin/env python3
"""Rebuild Qalam Page's OFL Digital Khatt derivative (no text/GSUB changes).

Requirements: Python 3, fontTools with WOFF2 support (fonttools[woff]).
Run from any directory: python scripts/build-digital-khatt-qalam.py
The original font, outlines, layout tables and glyph order stay unchanged.
"""
from pathlib import Path
import json
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "public/fonts"
SOURCE = FONTS / "DigitalKhattIndoPakRegular.woff2"
OUTPUT = FONTS / "DigitalKhattIndoPakQalam.woff2"
NOTICE = (
    "Modified by Qalam Works: Urdu character cmap aliases for Qalam Page; "
    "Arabic-use Urdu codepoint/digit aliases; original outlines, GSUB and GPOS unchanged. "
    "Copyright (c) 2024 Amine Anane; Copyright (c) 2024 Tarteel Inc. "
    "Licensed under SIL Open Font License 1.1."
)


def main():
    font = TTFont(SOURCE, recalcTimestamp=False)
    original_cmap = font.getBestCmap()
    layout = {tag: font.getTableData(tag) for tag in ("GSUB", "GPOS", "glyf") if tag in font}
    aliases = {
        0x06CC: original_cmap[0x064A],
        0x06D2: original_cmap[0x064A],
        0x06C1: original_cmap[0x0647],
        0x06BE: original_cmap[0x0647],
        0x06C3: original_cmap[0x0629],
        0x06A9: original_cmap[0x0643],
    }
    aliases.update({0x06F0 + digit: original_cmap[0x0660 + digit] for digit in range(10)})
    optional = "alefmaksura.hamzaabove.isol"
    if optional in font.getGlyphOrder():
        aliases[0x06D3] = optional
    for table in font["cmap"].tables:
        if table.isUnicode():
            table.cmap.update(aliases)
    names = {
        1: "DigitalKhatt IndoPak Qalam",
        3: "DigitalKhattIndoPakQalam-Regular-0.1-Qalam2",
        4: "DigitalKhatt IndoPak Qalam Regular",
        5: "Version 0.1; Qalam Urdu cmap modification 2",
        6: "DigitalKhattIndoPakQalam-Regular",
        10: NOTICE,
        16: "DigitalKhatt IndoPak Qalam",
        21: "DigitalKhatt IndoPak Qalam",
    }
    for name_id, value in names.items():
        records = [record for record in font["name"].names if record.nameID == name_id]
        for record in records:
            font["name"].setName(value, name_id, record.platformID, record.platEncID, record.langID)
        font["name"].setName(value, name_id, 3, 1, 0x409)
    font.save(OUTPUT)
    rebuilt = TTFont(OUTPUT, recalcTimestamp=False)
    for tag, data in layout.items():
        assert rebuilt.getTableData(tag) == data, f"Unexpected {tag} change"
    assert rebuilt.getGlyphOrder() == font.getGlyphOrder()
    assert rebuilt["name"].getDebugName(21) == "DigitalKhatt IndoPak Qalam"
    cmap = rebuilt.getBestCmap()
    assert {cp: cmap[cp] for cp in aliases} == aliases
    assert all(cmap[0x06F0 + digit] == original_cmap[0x0660 + digit] for digit in range(10))
    fallback = TTFont(FONTS / "naskh-400.woff2").getBestCmap()
    (ROOT / "app/tools/document-studio/utils/naskhCmap.json").write_text(
        json.dumps(sorted(fallback), separators=(",", ":")) + "\n", encoding="utf-8"
    )
    (ROOT / "app/tools/document-studio/utils/digitalKhattCmap.json").write_text(
        json.dumps(sorted(cmap), separators=(",", ":")) + "\n", encoding="utf-8"
    )
    license_text = (FONTS / "DigitalKhattIndoPakRegular-OFL.txt").read_text(encoding="utf-8")
    (FONTS / "DigitalKhattIndoPakQalam-OFL.txt").write_text(NOTICE + "\n\n" + license_text, encoding="utf-8")
    for cp, glyph in sorted(aliases.items()):
        print(f"U+{cp:04X} -> {glyph}")


if __name__ == "__main__":
    main()
