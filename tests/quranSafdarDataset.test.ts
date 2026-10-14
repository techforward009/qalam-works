import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { HAFS_AYAH_COUNTS } from "../app/tools/arabic-diacritics/quran/hafsCounts";
import { translationGlobalIndex, safdarTranslationChunkPath, quranTranslationFor } from "../app/quran/reader/translationCorpus";

const chunks = Array.from({ length: 25 }, (_, i) => {
  const file = join(process.cwd(), "public/quran/translations/safdar", String(i).padStart(2, "0") + ".json");
  return JSON.parse(readFileSync(file, "utf8")) as string[];
});
const corpus = chunks.flat();
const verse = (surah: number, ayah: number) => corpus[translationGlobalIndex(surah, ayah)!];

describe("Safdar Najafi Urdu Quran translation corpus", () => {
  test("contains every canonical verse, no missing translations", () => {
    expect(corpus).toHaveLength(6236);
    expect(HAFS_AYAH_COUNTS).toHaveLength(114);
    expect(HAFS_AYAH_COUNTS.reduce((sum, count) => sum + count, 0)).toBe(6236);
    for (let surah = 1; surah <= 114; surah++) {
      for (let ayah = 1; ayah <= HAFS_AYAH_COUNTS[surah-1]; ayah++) {
        const index = translationGlobalIndex(surah, ayah);
        expect(index).not.toBeNull();
        expect(corpus[index!]?.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test("uses 25 nonempty indexed files", () => {
    chunks.forEach((rows, i) => {
      expect(rows).toHaveLength(i === 24 ? 92 : 256);
      expect(rows.every(item => typeof item === "string" && !!item.trim())).toBe(true);
      expect(safdarTranslationChunkPath(i)).toBe("/quran/translations/safdar/" + String(i).padStart(2, "0") + ".json");
    });
  });

  test("retains the approved print corrections", () => {
    expect(verse(2, 4)).toContain("روز آخرت پر ایمان رکھتے ہیں");
    expect(verse(2, 255)).toContain("جو کچھ آسمانوں اور زمین میں ہے اسی کی طرف سے ہے");
    expect(verse(66, 1)).toBe("اے پیغمبر! جو چیز خدا نے تیرے لئے حلال کی ہے اسے اپنی بیویوں کو خوش رکھنے کے لئے اپنے اوپر حرام کیوں کرتے ہو اور خدا غفور و رحیم ہے۔");
    expect(verse(29, 41)).toBe("جن لوگوں نے خدا کے سوا دوسروں کو اپنے اولیا بنا رکھا ہے وہ مکڑی کی مانند ہیں کہ وہ بھی اپنے لئے گھر بناتی ہیں اور مکڑی کا گھر کمزور ترین گھر ہے۔ کاش کہ وہ لوگ اس بات کو سمجھتے۔");
  });

  test("loads Safdar only if selected and preserves the existing Mohsin/English paired files", async () => {
    const originalFetch = globalThis.fetch;
    const calls: string[] = [];
    globalThis.fetch = (async (url: string | URL | Request) => {
      const path = String(url);
      calls.push(path);
      const name = path.split("/").pop()!;
      if (path.includes("/safdar/")) {
        const values = chunks[Number(name.slice(0, 2))];
        return { ok: true, json: async () => values } as Response;
      }
      const original = JSON.parse(readFileSync(join(process.cwd(), "public/quran/translations", name), "utf8"));
      return { ok: true, json: async () => original } as Response;
    }) as typeof fetch;
    try {
      expect(await quranTranslationFor(1, 1, "ur", "safdar-najfi")).toBe(verse(1, 1));
      expect(await quranTranslationFor(114, 6, "ur", "safdar-najfi")).toBe(verse(114, 6));
      const mohsin = await quranTranslationFor(1, 1, "ur", "mohsin-najfi");
      const english = await quranTranslationFor(1, 1, "en", "safdar-najfi");
      expect(mohsin).toBeTruthy();
      expect(english).toBeTruthy();
      expect(mohsin).not.toBe(verse(1, 1));
      expect(calls.filter(item => item.includes("/safdar/"))).toHaveLength(2);
      expect(calls.filter(item => !item.includes("/safdar/"))).toHaveLength(1);
    } finally { globalThis.fetch = originalFetch; }
  });
});
