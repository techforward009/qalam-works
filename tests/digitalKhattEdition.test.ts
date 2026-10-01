import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  buildDigitalKhattPages,
  DIGITAL_KHATT_EDITION,
  flattenDigitalKhatt,
  type DigitalKhattCorpus,
} from "../app/quran/indopak-digital-khatt/data";

describe("Qalam Digital Khatt IndoPak edition", () => {
  test("keeps the separate edition identity", () => {
    expect(DIGITAL_KHATT_EDITION.id).toBe("qalam-indopak-digitalkhatt-v1");
    expect(DIGITAL_KHATT_EDITION.verseCount).toBe(6236);
    expect(DIGITAL_KHATT_EDITION.pageCount).toBe(604);
    expect(DIGITAL_KHATT_EDITION.license).toBe("MIT");
    expect(DIGITAL_KHATT_EDITION.fontLicense).toBe("OFL-1.1");
  });

  test("asset snapshot is the unchanged DigitalKhatt chapter map", () => {
    const raw = readFileSync("public/quran/indopak-digital-khatt.json", "utf8");
    const chapters = JSON.parse(raw) as DigitalKhattCorpus;
    expect(Array.isArray(chapters)).toBe(false);
    expect(Object.keys(chapters)).toHaveLength(114);
    const verses = flattenDigitalKhatt(chapters);
    expect(verses).toHaveLength(6236);
    for (let surah = 1; surah <= 114; surah += 1) {
      const rows = chapters[String(surah)];
      expect(rows.map((verse) => verse.verse)).toEqual(rows.map((_, index) => index + 1));
      expect(rows.every((verse) => verse.chapter === surah && verse.text.length > 0)).toBe(true);
    }
    expect(chapters["1"]).toHaveLength(7);
    expect(chapters["1"][0].text.startsWith("اَلْحَمْدُ")).toBe(true);
    expect(chapters["1"].some((verse) => verse.text.startsWith("بِسْمِ"))).toBe(false);
    expect(chapters["114"]).toHaveLength(6);
    expect(readFileSync("public/fonts/DigitalKhattIndoPak.woff2").subarray(0, 4).toString("ascii")).toBe("wOF2");
  });

  test("builds the fixed 604-page navigation map without rewriting corpus text", () => {
    const raw = readFileSync("public/quran/indopak-digital-khatt.json", "utf8");
    const chapters = JSON.parse(raw) as DigitalKhattCorpus;
    const pages = buildDigitalKhattPages(chapters);

    expect(pages).toHaveLength(604);
    expect(pages[0]).toMatchObject({ page: 1, startChapter: 1, startVerse: 1 });
    expect(pages[603]).toMatchObject({ page: 604, endChapter: 114, endVerse: 6 });

    for (let index = 1; index < pages.length; index += 1) {
      expect(pages[index].fromIndex).toBe(pages[index - 1].toIndex + 1);
    }
  });

  test("reader header, marker, and display size stay explicit", () => {
    const source = readFileSync("app/quran/indopak-digital-khatt/DigitalKhattReader.tsx", "utf8");
    const css = readFileSync("app/quran/indopak-digital-khatt/reader.module.css", "utf8");
    expect(source).toContain("juzRunningHead");
    expect(source).toContain("surahRunningHead");
    expect(source).toContain("qalam-digital-khatt-display-scale");
    expect(source).not.toContain("current-ayah");
    expect(source).not.toContain("currentAyah");
    expect(source).toContain('className={styles.waqf}');
    expect(source).toContain("styles.ayahDigit");
    expect(css).toContain("min-height: 0");
    expect(css).not.toContain("min-height: 900px");
    expect(css).not.toContain("margin-top: auto");
  });
});
