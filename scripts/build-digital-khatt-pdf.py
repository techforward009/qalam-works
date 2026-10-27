#!/usr/bin/env python3
"""Build the shared editor/export face: fonttools[woff] and uharfbuzz.

Restore GDEF mark-filter sets from the Quran reference; never disable the
original filtering lookups. Arabic shaping probes map between the fonts' very
different glyph orders. Four unencoded marks require bounds/anchor matching,
verified with identical, in-memory PUA shaping probes (not added to the output).
"""
import copy
import io
from collections import defaultdict
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables import otTables
from fontTools.ttLib.tables.DefaultTable import DefaultTable
import uharfbuzz as hb

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "public/fonts"
SOURCE = FONTS / "DigitalKhattIndoPakQalam-v3.woff2"
REFERENCE = FONTS / "DigitalKhattIndoPak.woff2"
OUTPUT = FONTS / "DigitalKhattIndoPakQalamPdf-v2.woff2"
NOTICE = (
    "Qalam Works editor/export derivative: GDEF upgraded to version 1.2 with "
    "12 MarkGlyphSetsDef coverages mapped from the Quran Digital Khatt face. "
    "Original UseMarkFilteringSet lookup flags, MarkFilteringSet indices and "
    "GSUB/GPOS substitution/positioning subtables are preserved. Glyph outlines, "
    "cmap aliases, glyph order and advances are unchanged. SIL OFL 1.1."
)


def shaping_font(font, aliases=None):
    if aliases:
        font = copy.deepcopy(font)
        for table in font["cmap"].tables:
            if table.isUnicode():
                table.cmap.update(aliases)
    flavor = font.flavor
    try:
        font.flavor = None
        data = io.BytesIO()
        font.save(data)
    finally:
        font.flavor = flavor
    result = hb.Font(hb.Face(data.getvalue()))
    hb.ot_font_set_funcs(result)
    return result


def clusters(font, shaper, text):
    buf = hb.Buffer()
    buf.add_str(text)
    # Mark-only/tatweel probes otherwise guess Common, bypassing Arabic ccmp.
    buf.direction, buf.script, buf.language = "rtl", "arab", "ar"
    hb.shape(shaper, buf)
    result = defaultdict(list)
    for glyph in buf.glyph_infos:
        result[glyph.cluster].append(font.getGlyphName(glyph.codepoint))
    return result


def mark_anchors(font, glyph):
    anchors = set()
    for lookup in font["GPOS"].table.LookupList.Lookup:
        for subtable in lookup.SubTable:
            subtable = getattr(subtable, "ExtSubTable", subtable)
            for coverage_name, array_name in (("MarkCoverage", "MarkArray"), ("Mark1Coverage", "Mark1Array")):
                coverage = getattr(subtable, coverage_name, None)
                if coverage and glyph in coverage.glyphs:
                    anchor = getattr(subtable, array_name).MarkRecord[coverage.glyphs.index(glyph)].MarkAnchor
                    anchors.add((anchor.XCoordinate, anchor.YCoordinate))
    return anchors


def mark_bounds(glyphs, glyph):
    pen = BoundsPen(glyphs)
    glyphs[glyph].draw(pen)
    return pen.bounds


def map_mark_glyphs(reference, target):
    needed = {g for coverage in reference["GDEF"].table.MarkGlyphSetsDef.Coverage for g in coverage.glyphs}
    mapping = defaultdict(set)
    ref_shaper, target_shaper = shaping_font(reference), shaping_font(target)

    def observe(text, ref_hb=ref_shaper, target_hb=target_shaper):
        left, right = clusters(reference, ref_hb, text), clusters(target, target_hb, text)
        for cluster, ref_glyphs in left.items():
            target_glyphs = right.get(cluster, [])
            if len(ref_glyphs) != len(target_glyphs):
                # The reference can insert a waqf base absent in the incomplete
                # input. Align mark glyphs independently of those base glyphs.
                ref_glyphs = [g for g in ref_glyphs if reference["GDEF"].table.GlyphClassDef.classDefs.get(g) == 3]
                target_glyphs = [g for g in target_glyphs if target["GDEF"].table.GlyphClassDef.classDefs.get(g) == 3]
            if len(ref_glyphs) != len(target_glyphs):
                continue
            for a, b in zip(ref_glyphs, target_glyphs):
                if a in needed:
                    mapping[a].add(b)

    shared = set(reference.getBestCmap()) & set(target.getBestCmap())
    for cp in sorted(cp for cp in shared if 0x0600 <= cp <= 0x08FF):
        char = chr(cp)
        for text in (char, "ب" + char, char + "ب", "ب" + char + "ب", "ـ" + char,
                     "ـ" + char + "ـ", "\u034f" + char, char + "\u034f", "ي\u034f" + char):
            observe(text)

    # small high yeh/waw and the two filled circles have no Unicode/GSUB
    # entry point in either input. Do not guess by glyph IDs or glyph names:
    # compare default-outline bounds (CFF2 vs rounded TrueType) and anchors.
    # The anchor distinguishes the otherwise identical high/low circles.
    missing = sorted(needed - mapping.keys(), key=reference.getGlyphID)
    ref_glyphs, target_glyphs = reference.getGlyphSet(), target.getGlyphSet()
    target_marks = [g for g, cls in target["GDEF"].table.GlyphClassDef.classDefs.items() if cls == 3]
    ref_aliases, target_aliases = {}, {}
    for index, glyph in enumerate(missing):
        bounds, anchors = mark_bounds(ref_glyphs, glyph), mark_anchors(reference, glyph)
        candidates = []
        for candidate in target_marks:
            other = mark_bounds(target_glyphs, candidate)
            if bounds and other and max(abs(a - b) for a, b in zip(bounds, other)) <= 1:
                if mark_anchors(target, candidate) == anchors:
                    candidates.append(candidate)
        assert len(candidates) == 1, f"Ambiguous unencoded mark {glyph}: {candidates}"
        ref_aliases[0xE000 + index], target_aliases[0xE000 + index] = glyph, candidates[0]
    if missing:
        ref_hb, target_hb = shaping_font(reference, ref_aliases), shaping_font(target, target_aliases)
        for cp in ref_aliases:
            observe("ب" + chr(cp), ref_hb, target_hb)
    assert needed <= mapping.keys(), f"Unmapped mark glyphs: {needed - mapping.keys()}"
    assert all(len(mapping[g]) == 1 for g in needed), f"Ambiguous shaping map: {dict(mapping)}"
    return {g: next(iter(mapping[g])) for g in needed}


def build_font(source=SOURCE, reference=REFERENCE, output=OUTPUT):
    font, quran = TTFont(source, recalcTimestamp=False), TTFont(reference, recalcTimestamp=False)
    unchanged = {tag: font.getTableData(tag) for tag in ("glyf", "hmtx", "cmap", "GSUB", "GPOS")}
    glyph_order = font.getGlyphOrder()
    mapping = map_mark_glyphs(quran, font)
    sets = otTables.MarkGlyphSetsDef()
    sets.MarkSetTableFormat = 1
    sets.Coverage = []
    for coverage in quran["GDEF"].table.MarkGlyphSetsDef.Coverage:
        mapped = otTables.Coverage()
        mapped.glyphs = sorted({mapping[g] for g in coverage.glyphs}, key=font.getGlyphID)
        sets.Coverage.append(mapped)
    sets.MarkSetCount = len(sets.Coverage)
    assert sets.MarkSetCount == 12, "Reference mark sets changed; review the mapping"
    font["GDEF"].table.Version = 0x00010002
    font["GDEF"].table.MarkGlyphSetsDef = sets
    filtered = [(tag, i) for tag in ("GSUB", "GPOS")
                for i, lookup in enumerate(font[tag].table.LookupList.Lookup) if lookup.LookupFlag & 0x10]
    assert len(filtered) == 12, f"Filtering lookups changed: {filtered}"
    for tag, i in filtered:
        assert font[tag].table.LookupList.Lookup[i].MarkFilteringSet < sets.MarkSetCount
    old_notice = font["name"].getDebugName(10) or ""
    copyright_notice = old_notice[old_notice.index("Copyright"):] if "Copyright" in old_notice else ""
    for record in list(font["name"].names):
        if record.nameID == 10:
            font["name"].setName(NOTICE + " " + copyright_notice, 10, record.platformID, record.platEncID, record.langID)
    # Probe/anchor inspection decompiles layout tables. Preserve their exact
    # source bytes rather than accepting fontTools' unrelated repacking.
    for tag in ("GSUB", "GPOS"):
        raw = DefaultTable(tag)
        raw.data = unchanged[tag]
        font[tag] = raw
    font.save(output)
    result = TTFont(output, recalcTimestamp=False)
    assert result.getGlyphOrder() == glyph_order
    for tag, data in unchanged.items():
        assert result.getTableData(tag) == data, f"Unexpected {tag} change"
    return mapping


def main():
    mapping = build_font()
    (FONTS / "DigitalKhattIndoPakQalamPdf-v2-OFL.txt").write_text(
        NOTICE + "\n\n" + (FONTS / "DigitalKhattIndoPakQalam-v3-OFL.txt").read_text(encoding="utf-8"), encoding="utf-8"
    )
    print(f"Restored 12 mark-filter sets ({len(mapping)} mapped glyphs); original GSUB/GPOS flags retained")


if __name__ == "__main__":
    main()
