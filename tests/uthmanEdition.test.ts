import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { QURAN_LAYOUT_PROFILE } from "../app/quran/reader/profile";
import { pageCount } from "../app/quran/reader/model";
import { QURAN_SIMPLE_SHA256 } from "../app/tools/arabic-diacritics/quran/corpusIntegrity";
import { UTHMAN_EDITION } from "../app/quran/uthman/edition";
import { parseUthmaniLines } from "../app/quran/uthman/parseUthmaniLines";

const FATIHA = [
  "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
  "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ",
  "ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
  "مَٰلِكِ يَوْمِ ٱلدِّينِ",
  "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
  "ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ",
  "صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ",
].join("\n");

describe("Uthman Taha edition investigation", () => {
  test("keeps Indo-Pak production untouched", () => {
    expect(QURAN_SIMPLE_SHA256).toBe("ab31a2a8672b45571367f9884bd0a43f820f9699544289dd1b8d0efe1bdece0e");
    expect(pageCount()).toBe(604);
    expect(QURAN_LAYOUT_PROFILE.id).toBe("qalam-indopak-v1");
    expect(QURAN_LAYOUT_PROFILE.productionFont).toBe("Muhammadi Quranic");
    expect(UTHMAN_EDITION.productionEnabled).toBe(false);
    expect(UTHMAN_EDITION.officialPageCount).toBeNull();
    expect(UTHMAN_EDITION.sourceHasPageNumbers).toBe(false);
    expect(UTHMAN_EDITION.license.bundle).toBe(false);
    expect(UTHMAN_EDITION.license.webEmbedding).toBe("not confirmed");
    expect(UTHMAN_EDITION.font.directUnicodeCompatibleWithSuppliedText).toBe(false);
    expect(UTHMAN_EDITION.font.missingCodePoints).toContain("U+0671");
    const gate = readFileSync("app/quran/font-test/page.tsx", "utf8");
    expect(gate).toContain("notFound()");
  });

  test("segments basmala lines without rewriting them", () => {
    const source = `\uFEFF${FATIHA}\r\nبِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ الٓمٓ\r\nبَرَآءَةٌۭ مِّنَ ٱللَّهِ\r\nبِّسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ إِنَّآ\r\n`;
    const parsed = parseUthmaniLines(source);
    expect(parsed.surahAyahCounts).toEqual([7, 1, 1, 1]);
    expect(parsed.ayahs[0]?.text).toBe("بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ");
    expect(parsed.ayahs[7]?.text.startsWith("بِسْمِ ٱللَّهِ")).toBe(true);
    expect(parsed.ayahs[7]?.text.endsWith("الٓمٓ")).toBe(true);
    expect(parsed.ayahs[8]?.surah).toBe(3);
    expect(parsed.ayahs[9]?.text.startsWith("بِّسْمِ")).toBe(true);
  });

  test.skipIf(!existsSync("/workspace/attachments/quran-uthmani.txt"))("supplied quran-uthmani.txt is 114 groups and 6236 untouched lines", () => {
    const parsed = parseUthmaniLines(readFileSync("/workspace/attachments/quran-uthmani.txt", "utf8"));
    expect(parsed.ayahs).toHaveLength(6236);
    expect(parsed.surahAyahCounts).toHaveLength(114);
    expect(parsed.surahAyahCounts[0]).toBe(7);
    expect(parsed.surahAyahCounts[8]).toBe(129);
    expect(parsed.surahAyahCounts[18]).toBe(98);
    expect(parsed.surahAyahCounts[113]).toBe(6);
    expect(parsed.ayahs[0]?.text).toBe("بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ");
    expect(parsed.ayahs.at(-1)?.text).toBe("مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ");
    expect(parsed.ayahs.find((ayah) => ayah.surah === 19 && ayah.ayah === 1)?.text.startsWith("بِسْمِ")).toBe(true);
  });
});
