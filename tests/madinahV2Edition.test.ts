import { describe, expect, it } from "vitest";
import { MADINAH_V2_EDITION, MADINAH_BASMALA_GLYPH, lineGlyphText } from "../app/quran/madinah/data";
import { juzTitle, surahTitle } from "../app/quran/reader/metadata";

describe("Madinah Mushaf V2 edition", () => {
  it("pins the 1421H 604-page, 15-line edition", () => {
    expect(MADINAH_V2_EDITION.pageCount).toBe(604);
    expect(MADINAH_V2_EDITION.lineCount).toBe(15);
    expect(MADINAH_V2_EDITION.id).toBe("qalam-madinah-v2-1421h");
  });

  it("joins QCF V2 glyphs without rewriting them", () => {
    expect(lineGlyphText({
      line: 2,
      type: "text",
      centered: true,
      words: [
        { location: "1:1:1", word_id: 1, qpcV2: "ﱁ", kind: "word" },
        { location: "1:1:2", word_id: 2, qpcV2: "ﱂ", kind: "word" },
      ],
    })).toBe("ﱁ ﱂ");
  });

  it("uses the calligraphic Madinah basmala glyph, not the broken ligature", () => {
    expect(MADINAH_BASMALA_GLYPH).toBe("\uFC21");
    expect(MADINAH_BASMALA_GLYPH).not.toBe("\uFDFD");
  });

  it("provides the running-header labels used by the Madinah page layout", () => {
    expect(surahTitle(2)).toBe("سورة البقرة");
    expect(juzTitle(1)).toBe("الجزء الأول");
  });
});
