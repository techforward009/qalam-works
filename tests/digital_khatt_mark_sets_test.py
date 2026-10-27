"""Local font-build regressions: fontTools[woff] and uharfbuzz are required."""
import io
import importlib.util
import tempfile
import json
from pathlib import Path
import unittest

from fontTools.ttLib import TTFont
import uharfbuzz as hb

ROOT = Path(__file__).resolve().parents[1]
FONT = ROOT / "public/fonts/DigitalKhattIndoPakQalamPdf-v2.woff2"
SOURCE = ROOT / "public/fonts/DigitalKhattIndoPakQalam-v3.woff2"


def shape(text, path=FONT):
    tt = TTFont(path, recalcTimestamp=False)
    tt.flavor = None
    data = io.BytesIO()
    tt.save(data)
    font = hb.Font(hb.Face(data.getvalue()))
    hb.ot_font_set_funcs(font)
    buf = hb.Buffer()
    buf.add_str(text)
    buf.direction, buf.script, buf.language = "rtl", "arab", "ar"
    hb.shape(font, buf)
    return [[tt.getGlyphName(i.codepoint), i.cluster, p.x_advance,
             p.y_advance, p.x_offset, p.y_offset]
            for i, p in zip(buf.glyph_infos, buf.glyph_positions)]


class DigitalKhattMarkSets(unittest.TestCase):
    def assert_baa_kasra(self, text):
        glyphs = shape(text)
        cluster = text.index("ب")
        kasra = next(g for g in glyphs if g[0] == "kasra" and g[1] == cluster)
        dot = next(g for g in glyphs if g[0] == "onedotdown" and g[1] == cluster)
        self.assertLessEqual(kasra[5], -400, (text, kasra, dot))
        self.assertGreaterEqual(dot[5] - kasra[5], 180, (text, kasra, dot))

    def test_rabbi_kasra_clears_the_baa_dot(self):
        self.assert_baa_kasra("رَبِّ")

    def test_biyadika_kasra_clears_the_baa_dot(self):
        self.assert_baa_kasra("بِیَدِکَ")

    def test_original_mark_filter_lookups_are_preserved(self):
        output, source = TTFont(FONT), TTFont(SOURCE)
        gdef = output["GDEF"].table
        self.assertEqual(gdef.Version, 0x00010002)
        self.assertEqual(gdef.MarkGlyphSetsDef.MarkSetCount, 12)
        self.assertEqual(gdef.MarkGlyphSetsDef.MarkSetTableFormat, 1)
        for tag in ("GSUB", "GPOS"):
            self.assertEqual(output.getTableData(tag), source.getTableData(tag), tag)

    def test_ligatures_and_allah_keep_the_existing_shapes_and_positions(self):
        expected = json.loads((ROOT / "tests/fixtures/digitalKhatt/qalam-v2-shaping.json").read_text())
        for text, previous in expected.items():
            with self.subTest(text=text):
                self.assertEqual(shape(text), previous)

    def test_waqf_and_iqlab_base_insertion_is_active(self):
        for text in ("عَلِيمٌۢ", "كِتَابٌۚ"):
            with self.subTest(text=text):
                self.assertIn("waqfbase.isol", [g[0] for g in shape(text)])

    def test_all_reported_dotted_letters_have_mark_clearance(self):
        for text, base, dot_name in (("بِاَمۡرِہٖ", "ب", "onedotdown"),
                                     ("الۡمَیِّتِ", "ی", "twodotsdown")):
            glyphs, cluster = shape(text), text.index(base)
            kasra = next(g for g in glyphs if g[0] == "kasra" and g[1] == cluster)
            dot = next(g for g in glyphs if g[0] == dot_name and g[1] == cluster)
            self.assertGreaterEqual(dot[5] - kasra[5], 180)

    def test_builder_is_reproducible_and_does_not_modify_either_input(self):
        spec = importlib.util.spec_from_file_location("dk_builder", ROOT / "scripts/build-digital-khatt-pdf.py")
        builder = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(builder)
        before = {p: p.read_bytes() for p in (SOURCE, builder.REFERENCE)}
        with tempfile.TemporaryDirectory() as directory:
            a, b = Path(directory) / "a.woff2", Path(directory) / "b.woff2"
            builder.build_font(output=a)
            builder.build_font(output=b)
            self.assertEqual(a.read_bytes(), b.read_bytes())
            self.assertEqual(a.read_bytes(), FONT.read_bytes())
        for path, data in before.items():
            self.assertEqual(path.read_bytes(), data)

    def test_outlines_advances_and_urdu_aliases_are_unchanged(self):
        output, source = TTFont(FONT), TTFont(SOURCE)
        for tag in ("glyf", "hmtx", "cmap"):
            self.assertEqual(output.getTableData(tag), source.getTableData(tag), tag)
        self.assertEqual(output.getGlyphOrder(), source.getGlyphOrder())
        self.assertEqual(sorted(output.getBestCmap()), json.loads((ROOT / "app/tools/document-studio/utils/digitalKhattCmap.json").read_text()))
        cmap = output.getBestCmap()
        for cp in (0x06CC, 0x06D2, 0x06C1, 0x06BE, 0x06C3, 0x06A9, 0x06E1):
            self.assertEqual(cmap[cp], source.getBestCmap()[cp])


if __name__ == "__main__":
    unittest.main()
