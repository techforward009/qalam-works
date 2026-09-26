import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { sampleInput } from "../app/tools/arabic-diacritics/ArabicDiacriticsTool";
import { diacritizeArabic } from "../app/tools/arabic-diacritics/engine/diacritizeArabic";
import { CREATION_INPUT, CREATION_OUTPUT, GOLDEN_INPUT, GOLDEN_OUTPUT } from "../app/tools/arabic-diacritics/engine/goldenPassage";
import { ahmedgrafQuranReference } from "../app/tools/arabic-diacritics/quran/ahmedgrafProvider";
import { QURAN_SIMPLE_SHA256 } from "../app/tools/arabic-diacritics/quran/corpusIntegrity";
import { HAFS_AYAH_COUNTS } from "../app/tools/arabic-diacritics/quran/hafsCounts";
import { restoreQuran } from "../app/tools/arabic-diacritics/quran/matchQuran";
import { quranMatchKey } from "../app/tools/arabic-diacritics/quran/normalizeQuran";
import { canUseForQuranMode, quranReferenceLabel, validateQuranReference } from "../app/tools/arabic-diacritics/quran/reference";
import { QURAN_SIMPLE_SOURCE } from "../app/tools/arabic-diacritics/quran/quranSimpleSource";

const SOURCE_PATH = "app/tools/arabic-diacritics/quran/data/quran-simple.txt";
const provider = ahmedgrafQuranReference;

function stripMarks(text: string): string {
  return text.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u06DD]/gu, "");
}

describe("ahmedgraf Indo-Pak corpus", () => {
  test("the source file hash and the embedded copy are the unchanged upload", () => {
    const bytes = readFileSync(SOURCE_PATH);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(QURAN_SIMPLE_SHA256);
    expect(QURAN_SIMPLE_SHA256).toBe("ab31a2a8672b45571367f9884bd0a43f820f9699544289dd1b8d0efe1bdece0e");
    expect(Buffer.from(QURAN_SIMPLE_SOURCE, "utf8").equals(bytes)).toBe(true);
    expect(QURAN_SIMPLE_SOURCE).toContain("CHANGING IT IS NOT ALLOWED");
    expect(QURAN_SIMPLE_SOURCE).toContain("ahmedgraf.com");
  });

  test("metadata names ahmedgraf and does not claim Taj Company", () => {
    const metadata = provider.getMetadata();
    expect(metadata.referenceSource).toBe("ahmedgraf.com");
    expect(metadata.referenceVersion).toBe("1.0");
    expect(metadata.provenanceStatus).toBe("source-attributed");
    expect(metadata.tajCompanyOfficial).toBe(false);
    expect(metadata.referenceScript).toBe("Indo-Pakistani");
    expect(metadata.sourceSha256).toBe(QURAN_SIMPLE_SHA256);
    expect(metadata.referenceLicense).toContain("CHANGING IT IS NOT ALLOWED");
    expect(quranReferenceLabel(metadata)).toBe("Quran reference: Indo-Pak Quran Text — source: ahmedgraf.com");
    expect(quranReferenceLabel(metadata)).not.toContain("Taj Company 16-line");
    const validation = validateQuranReference(provider);
    expect(validation.ok).toBe(true);
    expect(validation.ayahCount).toBe(6236);
    expect(validation.surahCount).toBe(114);
    expect(canUseForQuranMode(provider).ok).toBe(true);
  });

  test("114 surahs and the Hafs ayah counts are unique and non-empty", () => {
    expect(HAFS_AYAH_COUNTS).toHaveLength(114);
    expect(HAFS_AYAH_COUNTS.reduce((sum, count) => sum + count, 0)).toBe(6236);
    const ayahs = provider.listAyahs();
    expect(ayahs).toHaveLength(6236);
    const ids = new Set(ayahs.map((ayah) => ayah.id));
    expect(ids.size).toBe(6236);
    for (const ayah of ayahs) {
      expect(ayah.text.trim().length).toBeGreaterThan(0);
      expect(ayah.text).not.toContain("PLEASE DO NOT REMOVE");
      expect(ayah.text).not.toContain("ahmedgraf.com");
      expect(ayah.id).toBe(`${ayah.surah}:${ayah.ayah}`);
    }
    let cursor = 0;
    for (let surah = 1; surah <= 114; surah += 1) {
      const count = HAFS_AYAH_COUNTS[surah - 1] ?? 0;
      for (let ayah = 1; ayah <= count; ayah += 1) {
        expect(ayahs[cursor]?.id).toBe(`${surah}:${ayah}`);
        cursor += 1;
      }
      expect(provider.getAyah(surah, count + 1)).toBeNull();
    }
  });

  test("Al-Fatihah is seven ayahs and an internal pause is not a new ayah", () => {
    for (let ayah = 1; ayah <= 7; ayah += 1) expect(provider.getAyah(1, ayah)?.text).toBeTruthy();
    expect(provider.getAyah(1, 8)).toBeNull();
    const first = provider.getAyah(1, 1);
    const sixth = provider.getAyah(1, 6);
    const seventh = provider.getAyah(1, 7);
    expect(first?.text).toBe("بِسْمِ اللہِ الرَّحْمٰنِ الرَّحِيْمِ\u06dd");
    expect(sixth?.text.startsWith("اِھْدِنَا")).toBe(true);
    expect(sixth?.text.endsWith("\u06dd\u06f5\u06d9")).toBe(true);
    expect(seventh?.text).toContain("الْمَغْضُوْبِ");
    expect(seventh?.text).not.toContain("اِھْدِنَا");
    expect(seventh?.text.endsWith("\u06dd\u06f7\u06e7")).toBe(true);

    const twoTwo = provider.getAyah(2, 2);
    expect(twoTwo?.text).toContain("\u06dd\u06f0");
    expect(twoTwo?.text).not.toBe(provider.getAyah(2, 3)?.text);
    expect(provider.getAyah(2, 286)?.text).toBeTruthy();
    expect(provider.getAyah(2, 287)).toBeNull();
    expect(provider.getAyah(2, 1)?.text.startsWith("بِسْمِ اللہِ")).toBe(true);
    expect(provider.getAyah(2, 1)?.text).toContain("ال\u06d7م");
    expect(provider.getAyah(9, 1)?.text.startsWith("بِسْمِ")).toBe(false);
  });

  test("an exact ayah and a normalized ayah both return the corpus string", () => {
    const ayah = provider.getAyah(1, 2);
    expect(ayah).toBeTruthy();
    const exact = restoreQuran(ayah?.text ?? "", provider);
    expect(exact.output).toBe(ayah?.text);
    expect(exact.segments[0]?.category).toBe("verified_exact");
    expect(exact.segments[0]?.matchedReferenceId).toBe("1:2");
    const folded = "الحمد للہ رب العلمین";
    const normalized = restoreQuran(folded, provider);
    expect(normalized.output).toBe(ayah?.text);
    expect(normalized.segments[0]?.category).toBe("verified_normalized");
    expect(normalized.output).not.toBe(folded);
    expect(quranMatchKey(folded)).toBe(quranMatchKey(ayah?.text ?? ""));
  });

  test("a repeated phrase, a conflicting citation, and non-Quran words are not guessed", () => {
    const repeated = provider.findCandidates(quranMatchKey("الرحمن"));
    const ayahs = new Set(repeated.map((hit) => hit.ayahId));
    expect(ayahs.size).toBeGreaterThan(1);
    const ambiguous = restoreQuran("الرحمن", provider);
    expect(ambiguous.output).toBe("الرحمن");
    expect(ambiguous.segments[0]?.status).toBe("ambiguous");
    expect(ambiguous.segments[0]?.category).toBe("Quranic reference match not established.");

    expect(restoreQuran("1:1", provider).output).toBe("1:1");
    const conflict = restoreQuran("1:1 قل هو اللہ احد", provider);
    expect(conflict.output).toBe("1:1 قل هو اللہ احد");
    expect(conflict.output).not.toBe(provider.getAyah(112, 1)?.text);
    expect(conflict.segments[0]?.category).toBe("Quranic reference match not established.");

    expect(restoreQuran("وتتوقو", provider).output).toBe("وتتوقو");
    expect(restoreQuran("تتقوا", provider).output).toBe("تتقوا");
    expect(restoreQuran("جمیع", provider).output).toBe("جمیع");
    expect(restoreQuran("نرانہ", provider).output).toBe("نرانہ");
    expect(restoreQuran("قلم", provider).output).toBe("قلم");
    expect(restoreQuran("کافر", provider).output).toBe("کافر");
    expect(restoreQuran("هذا ليس قرآنا عثمانيا", provider).output).toBe("هذا ليس قرآنا عثمانيا");
  });

  test("a cited ayah is verified against that ayah only", () => {
    const ayah = provider.getAyah(112, 1);
    const cited = restoreQuran(`112:1 ${stripMarks(ayah?.text ?? "")}`, provider);
    expect(cited.output).toBe(ayah?.text);
    expect(cited.segments[0]?.matchedReferenceId).toBe("112:1");
    const indic = restoreQuran(`١١٢:١ ${stripMarks(ayah?.text ?? "")}`, provider);
    expect(indic.output).toBe(ayah?.text);
  });

  test("a missing final alif is accepted only when one canonical context confirms it", () => {
    const occurrences = new Map<string, { prev: string; word: string; ayahId: string }>();
    const counts = new Map<string, number>();
    for (const ayah of provider.listAyahs()) {
      const parts = ayah.text.split(/\s+/).filter(Boolean);
      for (let index = 1; index < parts.length; index += 1) {
        const word = stripMarks(parts[index] ?? "");
        const prev = stripMarks(parts[index - 1] ?? "");
        if (!word.endsWith("\u0627") || word.length < 3 || !quranMatchKey(prev)) continue;
        const key = `${quranMatchKey(prev)}|${quranMatchKey(word)}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
        if (!occurrences.has(key)) occurrences.set(key, { prev, word, ayahId: ayah.id });
      }
    }
    const uniqueKey = [...counts.entries()].find(([, count]) => count === 1)?.[0];
    const found = uniqueKey ? occurrences.get(uniqueKey) : undefined;
    expect(found).toBeTruthy();
    if (!found) return;
    const input = `${found.prev} ${found.word.slice(0, -1)}`;
    const restored = restoreQuran(input, provider);
    expect(restored.output).not.toBe(input);
    expect(restored.segments.some((segment) => segment.category === "verified_recovered" && segment.matchedReferenceId === found.ayahId)).toBe(true);
    expect(stripMarks(restored.output)).toContain(found.word);
  });

  test("the Quran sample is a stored corpus line, not the general golden passage", () => {
    expect(sampleInput("general")).toBe(GOLDEN_INPUT);
    const quranSample = sampleInput("quran");
    expect(quranSample).not.toBe(GOLDEN_INPUT);
    expect(quranSample).not.toContain("القائل بالجبر");
    const stored = provider.listAyahs().find((ayah) => ayah.text === quranSample);
    expect(stored?.id).toBe("1:1");
    const verified = restoreQuran(quranSample, provider);
    expect(verified.output).toBe(quranSample);
    expect(verified.segments[0]?.status).toBe("verified");
    expect(verified.segments[0]?.category).toBe("verified_exact");
  });

  test("general Arabic mode is not the Quran fallback", () => {
    expect(diacritizeArabic(GOLDEN_INPUT).output).toBe(GOLDEN_OUTPUT);
    expect(diacritizeArabic(CREATION_INPUT).output).toBe(CREATION_OUTPUT);
    expect(diacritizeArabic("کافر").output).toBe("كَافِرٌ");
    expect(restoreQuran(CREATION_INPUT, provider).output).not.toBe(CREATION_OUTPUT);
    expect(stripMarks("بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ")).not.toBe(provider.getAyah(1, 1)?.text);
  });
});
