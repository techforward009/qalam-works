"""Deterministic checks for the Phase 1A prototype. Does not read reference fonts."""

from pathlib import Path

import uharfbuzz as hb
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
FONT = ROOT / "build" / "QalamIndoPakQuranic-Prototype.ttf"


def main() -> None:
    raw = FONT.read_bytes()
    assert raw[:4] in (b"\x00\x01\x00\x00", b"OTTO"), "not a font"
    font = TTFont(FONT)
    name = {rec.nameID: rec.toUnicode() for rec in font["name"].names if rec.platformID == 3}
    assert name[1] == "Qalam IndoPak Quranic"
    assert name[6] == "QalamIndoPakQuranic-Prototype"
    assert "Original" in name[10]
    gsub = {rec.FeatureTag for rec in font["GSUB"].table.FeatureList.FeatureRecord}
    gpos = {rec.FeatureTag for rec in font["GPOS"].table.FeatureList.FeatureRecord}
    assert {"init", "medi", "fina"} <= gsub
    assert {"mark", "mkmk"} <= gpos
    assert "GDEF" in font
    face = hb.Face(hb.Blob.from_file_path(str(FONT)))
    shaped = hb.Font(face)

    def names(text: str) -> list[str]:
        buf = hb.Buffer()
        buf.add_str(text)
        buf.direction = "rtl"
        buf.script = "Arab"
        hb.shape(shaped, buf)
        return [(shaped.get_glyph_name(i.codepoint), p.y_offset) for i, p in zip(buf.glyph_infos, buf.glyph_positions)]

    bism = [n for n, _y in names("بِسْمِ")]
    assert "beh_init" in bism and "seen_medi" in bism and "meem_fina" in bism
    stack = dict(names("رَّ"))
    assert stack["fatha"] > stack["shadda"] > 0
    sup = dict(names("مٰ"))
    assert sup["supalif"] > 0
    assert ".notdef" not in [n for n, _y in names("۝۱۲")]
    for path in ROOT.rglob("*"):
        if path.suffix.lower() in {".ttf", ".otf", ".woff", ".woff2"} and path.name != FONT.name:
            raise SystemExit(f"unexpected font in tree: {path}")
    print("ok", FONT.name, "glyphs", len(font.getGlyphOrder()))


if __name__ == "__main__":
    main()
