import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { HAFS_AYAH_COUNTS } from "../app/tools/arabic-diacritics/quran/hafsCounts";
import { ahmedgrafQuranReference } from "../app/tools/arabic-diacritics/quran/ahmedgrafProvider";
import { QURAN_SIMPLE_SHA256 } from "../app/tools/arabic-diacritics/quran/corpusIntegrity";
import {
  adjacentAyah,
  adjacentPage,
  ayahsOnPage,
  copyPageText,
  displayPieces,
  getReaderAyah,
  juzOf,
  juzStart,
  pageCount,
  pageOf,
  quranPages,
  searchQuran,
  selectQuranFont,
} from "../app/quran/reader/model";
import {
  juzRunningHead,
  SURAH_NAMES,
  surahRunningHead,
} from "../app/quran/reader/metadata";
import { QURAN_LAYOUT_PROFILE } from "../app/quran/reader/profile";

const provider = ahmedgrafQuranReference;

describe("Quran reader", () => {
  test("uses the existing ahmedgraf corpus without a second copy", () => {
    expect(provider.getMetadata().sourceSha256).toBe(QURAN_SIMPLE_SHA256);
    expect(provider.listAyahs()).toHaveLength(6236);
    expect(SURAH_NAMES).toHaveLength(114);
    expect(HAFS_AYAH_COUNTS).toHaveLength(114);
    expect(getReaderAyah(1, 1)?.text).toBe(provider.getAyah(1, 1)?.text);
    expect(getReaderAyah(1, 7)?.id).toBe("1:7");
    expect(getReaderAyah(19, 1)?.surah).toBe(19);
    expect(getReaderAyah(114, 6)?.id).toBe("114:6");
    expect(getReaderAyah(1, 8)).toBeNull();
  });

  test("page map covers every ayah once and does not hard-code another mushaf", () => {
    const seen = new Map<string, number>();
    for (const page of quranPages) {
      const ayahs = ayahsOnPage(page.page);
      expect(ayahs[0]?.id).toBe(`${page.surahStart}:${page.ayahStart}`);
      expect(ayahs[ayahs.length - 1]?.id).toBe(`${page.surahEnd}:${page.ayahEnd}`);
      for (const ayah of ayahs) {
        expect(seen.has(ayah.id)).toBe(false);
        seen.set(ayah.id, page.page);
      }
    }
    expect(seen.size).toBe(6236);
    expect(quranPages[0]?.surahStart).toBe(1);
    expect(quranPages[0]?.ayahStart).toBe(1);
    const last = quranPages[quranPages.length - 1];
    expect(last?.surahEnd).toBe(114);
    expect(last?.ayahEnd).toBe(6);
    expect(pageCount()).toBe(quranPages.length);
    expect(pageCount()).not.toBe(604);
    expect(pageCount()).not.toBe(548);
    expect(pageCount()).not.toBe(549);
    for (let page = 1; page < quranPages.length; page += 1) {
      expect(quranPages[page]?.fromIndex).toBe((quranPages[page - 1]?.toIndex ?? -1) + 1);
    }
  });

  test("navigation, juz, and deep-link pages resolve", () => {
    expect(adjacentAyah(1, 1, -1)).toBeNull();
    expect(adjacentAyah(1, 1, 1)).toEqual({ surah: 1, ayah: 2 });
    expect(adjacentAyah(1, 7, 1)).toEqual({ surah: 2, ayah: 1 });
    expect(adjacentAyah(114, 6, 1)).toBeNull();
    expect(adjacentPage(1, -1)).toBeNull();
    expect(adjacentPage(1, 1)?.page).toBe(2);
    expect(adjacentPage(pageCount(), 1)).toBeNull();
    const maryam = pageOf(19, 1);
    const opening = pageOf(1, 1);
    const closing = pageOf(114, 6);
    expect(maryam).toBeTruthy();
    expect(opening?.page).toBe(1);
    expect(closing?.page).toBe(pageCount());
    expect(ayahsOnPage(maryam?.page ?? 0).some((ayah) => ayah.id === "19:1")).toBe(true);
    expect(juzOf(19, 1)).toBe(16);
    expect(juzOf(1, 1)).toBe(1);
    expect(juzOf(114, 6)).toBe(30);
    expect(juzStart(4)).toEqual({ surah: 3, ayah: 92 });
    expect(provider.getAyah(3, 92)?.text.startsWith("لَنْ تَنَالُوا")).toBe(true);
    expect(juzStart(30)).toEqual({ surah: 78, ayah: 1 });
  });

  test("ayahs stay inline and canonical text is not rewritten", () => {
    const fatiha = provider.getAyah(1, 1);
    const baqarah = provider.getAyah(2, 1);
    const tawbah = provider.getAyah(9, 1);
    const pause = provider.getAyah(2, 2);
    expect(fatiha && displayPieces(fatiha).map((piece) => piece.text).join("")).toBe(fatiha?.text);
    expect(displayPieces(fatiha!).some((piece) => piece.kind === "bismillah")).toBe(false);
    expect(baqarah && displayPieces(baqarah)[0]?.kind).toBe("bismillah");
    expect(baqarah && displayPieces(baqarah).map((piece) => piece.text).join("")).toBe(baqarah?.text);
    expect(tawbah && displayPieces(tawbah).some((piece) => piece.kind === "bismillah")).toBe(false);
    expect(tawbah?.text.startsWith("بِسْمِ")).toBe(false);
    expect(pause?.text).toContain("\u06dd\u06f0");
    expect(getReaderAyah(2, 2)?.text).toBe(pause?.text);
    const copied = copyPageText(1);
    expect(copied.startsWith(provider.getAyah(1, 1)?.text ?? "missing")).toBe(true);
    expect(copied).not.toContain("Previous ayah");
    expect(copied).not.toContain("Search");
    const source = readFileSync("app/quran/QuranReader.tsx", "utf8");
    expect(source).toContain('className={`quran-ayah inline');
    expect(source).toContain("QURAN_FONT_STACK");
    expect(source).toContain("QURAN_LAYOUT_PROFILE.lineHeight");
    expect(source).not.toContain("skew");
    expect(source).toContain('dir="rtl"');
  });

  test("search finds a stored phrase and ignores a non-quran guess", () => {
    const maryam = provider.getAyah(19, 1);
    const words = (maryam?.text ?? "").split(/\s+/).filter(Boolean);
    const distinctive = words.slice(-2).join(" ");
    expect(searchQuran(distinctive).some((hit) => hit.id === "19:1")).toBe(true);
    expect(searchQuran("قلم ورکس ليس قرآنا")).toEqual([]);
    expect(searchQuran("")).toEqual([]);
  });

  test("PDMS Saleem is a local reference and is not bundled", () => {
    expect(QURAN_LAYOUT_PROFILE.pdmsBundled).toBe(false);
    expect(selectQuranFont(false)).toEqual({ family: "Noto Naskh Arabic", bundled: false, profile: "qalam-indopak-v1" });
    expect(selectQuranFont(true).bundled).toBe(false);
    expect(selectQuranFont(true).family).toBe("PDMS Saleem Quran");
    const files = readdirSync("app/quran", { recursive: true }).map(String);
    expect(files.some((file) => file.endsWith(".ttf"))).toBe(false);
    const local = "/workspace/attachments/PDMS_Saleem_Quran.ttf";
    if (existsSync(local)) {
      const magic = readFileSync(local).readUInt32BE(0);
      expect(magic).toBe(0x00010000);
    }
  });

  test("keeps the Taj-style running heads and the display scale", () => {
    expect(juzRunningHead(2)).toBe("سيقول\u00a0٢");
    expect(surahRunningHead(2)).toBe("البقرة\u00a0٢");
    expect(juzRunningHead(0)).toBe("");
    const source = readFileSync("app/quran/QuranReader.tsx", "utf8");
    expect(source).toContain("qalam-quran-display-scale");
    expect(source).toContain("juzRunningHead");
    expect(source).toContain("surahRunningHead");
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toMatch(/html\.dark \.quran-page-meta-page-number \{\s*color: #ffffff;/);
  });
});
