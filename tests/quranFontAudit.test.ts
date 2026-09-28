import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { QURAN_SIMPLE_SHA256 } from "../app/tools/arabic-diacritics/quran/corpusIntegrity";
import { ahmedgrafQuranReference } from "../app/tools/arabic-diacritics/quran/ahmedgrafProvider";
import { FONT_CANDIDATES } from "../app/quran/reader/fontAudit";
import { fontComparisonBlocks } from "../app/quran/reader/fontSample";
import { pageCount } from "../app/quran/reader/model";
import { QURAN_LAYOUT_PROFILE } from "../app/quran/reader/profile";

describe("Quran font audit", () => {
  test("production font and the 887-page map stay in place", () => {
    expect(QURAN_LAYOUT_PROFILE.id).toBe("qalam-indopak-v1");
    expect(QURAN_LAYOUT_PROFILE.productionFont).toBe("Noto Naskh Arabic");
    expect(QURAN_LAYOUT_PROFILE.pdmsBundled).toBe(false);
    expect(pageCount()).toBe(887);
    expect(ahmedgrafQuranReference.getMetadata().sourceSha256).toBe("ab31a2a8672b45571367f9884bd0a43f820f9699544289dd1b8d0efe1bdece0e");
    expect(ahmedgrafQuranReference.getMetadata().sourceSha256).toBe(QURAN_SIMPLE_SHA256);
  });

  test("supplied fonts are recorded and none are production-enabled", () => {
    expect(FONT_CANDIDATES.map((item) => item.filename)).toEqual([
      "PDMS_Saleem_Quran.ttf",
      "Al Qalam Quran.ttf",
      "Al_Mushaf.ttf",
      "Attari_Quran_Shipped.ttf",
      "Noor_e_Quran.ttf",
      "noorehira.ttf",
      "Al Majeed Quranic Font_shiped.ttf",
    ]);
    expect(new Set(FONT_CANDIDATES.map((item) => item.id)).size).toBe(FONT_CANDIDATES.length);
    for (const font of FONT_CANDIDATES) {
      expect(font.productionEnabled).toBe(false);
      expect(["restricted", "unconfirmed", "unknown"]).toContain(font.licenseStatus);
    }
  });

  test("the comparison uses canonical ayah text and the reader direction", () => {
    const blocks = fontComparisonBlocks();
    const pause = blocks.find((block) => block.id === "pause");
    const maryam = blocks.find((block) => block.id === "maryam");
    const opening = blocks.find((block) => block.id === "opening");
    const closing = blocks.find((block) => block.id === "closing");
    expect(pause?.ayahs[0]?.text).toBe(ahmedgrafQuranReference.getAyah(2, 2)?.text);
    expect(pause?.ayahs[0]?.text).toContain("\u06dd\u06f0");
    expect(maryam?.ayahs[0]?.text).toBe(ahmedgrafQuranReference.getAyah(19, 1)?.text);
    expect(opening?.ayahs[0]?.text).toBe(ahmedgrafQuranReference.getAyah(1, 1)?.text);
    expect(closing?.ayahs.at(-1)?.id).toBe("114:6");
    expect(blocks.flatMap((block) => block.ayahs)).toHaveLength(20);
    const page = readFileSync("app/quran/font-test/FontComparison.tsx", "utf8");
    const gate = readFileSync("app/quran/font-test/page.tsx", "utf8");
    expect(page).toContain('dir="rtl"');
    expect(page).toContain("createObjectURL");
    expect(page).not.toContain("/workspace/attachments");
    expect(page).not.toContain("public/fonts");
    expect(gate).toContain('process.env.NODE_ENV === "production"');
    expect(gate).toContain("notFound()");
  });
});
