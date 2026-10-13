import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { HAFS_AYAH_COUNTS } from "../app/tools/arabic-diacritics/quran/hafsCounts";
import { TAFSIR_WORKS, tafsirForAyah, tafsirWorkById } from "../app/quran/reader/tafsirCatalog";
import { transliterationGlobalIndex } from "../app/quran/reader/transliterationCorpus";

describe("Quran transliteration and tafsir", () => {
  test("maps the supplied English transliteration to all 6236 verses by surah and ayah", () => {
    const manifest = JSON.parse(readFileSync("public/quran/transliteration/manifest.json", "utf8"));
    expect(manifest.ayahCount).toBe(6236);
    expect(manifest.chunkCount).toBe(25);
    expect(manifest.direction).toBe("ltr");
    const rows: string[] = [];
    for (let chunk = 0; chunk < manifest.chunkCount; chunk += 1) {
      const part = JSON.parse(readFileSync("public/quran/transliteration/" + String(chunk).padStart(2, "0") + ".json", "utf8"));
      expect(part.every((line: unknown) => typeof line === "string" && line.length > 0 && !/[<>]/.test(String(line)))).toBe(true);
      rows.push(...part);
    }
    expect(rows).toHaveLength(6236);
    expect(rows[transliterationGlobalIndex(1, 1)!]).toMatch(/^Bismi/);
    expect(rows[transliterationGlobalIndex(2, 1)!]).toMatch(/^Alif/);
    expect(rows[transliterationGlobalIndex(114, 6)!]).toMatch(/jinnati/);
    expect(transliterationGlobalIndex(1, 8)).toBeNull();
    let cursor = 0;
    HAFS_AYAH_COUNTS.forEach((count) => {
      expect(rows[cursor].length).toBeGreaterThan(0);
      cursor += count;
    });
    expect(cursor).toBe(6236);
  });

  test("lists the five tafsir works and does not invent commentary", () => {
    expect(TAFSIR_WORKS.map((work) => work.id)).toEqual(["nemuneh", "kawthar", "mizan", "majma", "safi"]);
    for (const work of TAFSIR_WORKS) {
      expect(tafsirWorkById(work.id)?.authorEn.length).toBeGreaterThan(0);
      expect(tafsirForAyah(work.id, 1, 1)).toBeNull();
      expect(tafsirForAyah(work.id, 2, 255)).toBeNull();
    }
    expect(tafsirForAyah("missing", 1, 1)).toBeNull();
  });
});
