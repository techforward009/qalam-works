import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getReaderAyah } from "../app/quran/reader/model";
import { getReaderAyah as getDigitalAyah } from "../app/quran/reader/digitalModel";
import { ayahReferenceCopy, popoverOrigin, splitTrailingAyahMark } from "../app/quran/reader/ayahOptions";

describe("ayah marker copy menu", () => {
  it("removes per-ayah copy icons and copies the same Unicode from one shared menu", () => {
    const reader = readFileSync("app/quran/QuranReader.tsx", "utf8");
    const translation = readFileSync("app/quran/QuranTranslationPage.tsx", "utf8");
    expect(reader).not.toContain("Copy exact Unicode verse");
    expect(reader).not.toContain("Copy verse");
    expect(reader).not.toContain("CopyIcon");
    expect(translation).not.toContain("Copy exact Unicode verse");
    expect(translation).not.toContain("CopyIcon");
    expect(reader).toContain("Ayah ${ayah} options");
    expect(reader).toContain("Copy ayah");
    expect(reader).toContain("Copy with reference (S:A)");
    expect(reader).toContain('data-ayah-options="true"');
    expect(reader).toContain("onCopyCapture={handlePageCopy}");
    expect(reader).toContain("ahmedReaderModel.getReaderAyah(item.surah,item.ayah)");
    expect(reader).toContain("digitalReaderModel.getReaderAyah(item.surah,item.ayah)");
  });

  it("keeps Ahmed's trailing end marker as the same glyphs", () => {
    const failures: string[] = [];
    for (const [surah, ayah] of [[1, 1], [2, 1], [2, 2], [2, 255], [9, 1], [114, 6]] as const) {
      const text = getReaderAyah(surah, ayah)?.text ?? "";
      const parts = splitTrailingAyahMark(text);
      if (!parts.marker || !/^\u06dd/u.test(parts.marker)) {
        failures.push(`${surah}:${ayah} end=${JSON.stringify(text.slice(-16))}`);
        continue;
      }
      if (parts.body + parts.marker !== text.trimEnd()) failures.push(`${surah}:${ayah} join`);
    }
    expect(failures).toEqual([]);
  });

  it("builds a reference copy without changing the verse", () => {
    const text = getDigitalAyah(2, 6)?.text ?? "";
    expect(text.length).toBeGreaterThan(10);
    expect(ayahReferenceCopy(text, 2, 6)).toBe(text + " (2:6)");
  });

  it("keeps the menu inside a narrow viewport", () => {
    const below = popoverOrigin({ left: 12, top: 40, bottom: 64 }, { width: 390, height: 800 }, { width: 210, height: 76 });
    expect(below).toEqual({ left: 12, top: 68 });
    const flipped = popoverOrigin({ left: 300, top: 740, bottom: 768 }, { width: 390, height: 800 }, { width: 210, height: 76 });
    expect(flipped.left + 210).toBeLessThanOrEqual(382);
    expect(flipped.left).toBeGreaterThanOrEqual(8);
    expect(flipped.top).toBe(740 - 76 - 4);
    expect(flipped.top + 76).toBeLessThanOrEqual(792);
  });
});
