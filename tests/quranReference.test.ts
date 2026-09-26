import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { diacritizeArabic } from "../app/tools/arabic-diacritics/engine/diacritizeArabic";
import { CREATION_INPUT, CREATION_OUTPUT, GOLDEN_INPUT, GOLDEN_OUTPUT } from "../app/tools/arabic-diacritics/engine/goldenPassage";
import { restoreQuran } from "../app/tools/arabic-diacritics/quran/matchQuran";
import { quranKeyStable, quranMatchKey } from "../app/tools/arabic-diacritics/quran/normalizeQuran";
import { canUseForQuranMode, createQuranReference, quranReferenceHash, quranReferenceLabel, validateQuranReference } from "../app/tools/arabic-diacritics/quran/reference";
import { unresolvedQuranReference, UNRESOLVED_QURAN_METADATA } from "../app/tools/arabic-diacritics/quran/unresolvedProvider";
import type { QuranAyah, QuranReferenceMetadata, QuranReferenceProvider } from "../app/tools/arabic-diacritics/quran/types";

const FIXTURE_AYAHS: QuranAyah[] = [
  { id: "1:1", surah: 1, ayah: 1, text: "فِيْ الْاَرْضِ" },
  { id: "1:2", surah: 1, ayah: 2, text: "اِلٰى رِضْوَانِهٖ" },
  { id: "1:3", surah: 1, ayah: 3, text: "مَا اُمِرُوْا" },
  { id: "1:4", surah: 1, ayah: 4, text: "مِنْ عَذَابِ" },
  { id: "1:5", surah: 1, ayah: 5, text: "مِنَ اللّٰهِ" },
  { id: "1:6", surah: 1, ayah: 6, text: "وَتَتَوَقَّوْا" },
];

function fixture(ayahs: QuranAyah[] = FIXTURE_AYAHS, patch: Partial<QuranReferenceMetadata> = {}): QuranReferenceProvider {
  const hash = quranReferenceHash(ayahs);
  const metadata: QuranReferenceMetadata = {
    referenceName: "Unit test fixture",
    referenceEdition: "not an edition",
    referenceScript: "Indo-Pakistani",
    referenceSource: "In-memory test strings. Not Taj Company and not a mushaf.",
    referenceVersion: "test",
    referenceLicense: "Test-only. Not a redistribution of a mushaf.",
    referenceVerifiedAt: null,
    verseCountConvention: "partial-test",
    provenanceStatus: "test-fixture",
    tajCompanyOfficial: false,
    referenceHash: hash,
    expectedHash: hash,
    ...patch,
  };
  return createQuranReference(ayahs, metadata);
}

function out(input: string, provider: QuranReferenceProvider = fixture()): string {
  const result = restoreQuran(input, provider);
  expect(result.input).toBe(input);
  return result.output;
}

describe("Quran reference validation", () => {
  test("the production provider loads no ayahs and does not claim Taj Company", () => {
    const validation = validateQuranReference(unresolvedQuranReference);
    expect(validation.ayahCount).toBe(0);
    expect(validation.ok).toBe(false);
    expect(validation.reasons.join(" ")).toContain("not loaded");
    expect(unresolvedQuranReference.getAyah(1, 1)).toBeNull();
    expect(unresolvedQuranReference.listAyahs()).toEqual([]);
    expect(UNRESOLVED_QURAN_METADATA.tajCompanyOfficial).toBe(false);
    expect(UNRESOLVED_QURAN_METADATA.referenceLicense).toBe("");
    expect(UNRESOLVED_QURAN_METADATA.referenceSource).toBe("");
    expect(quranReferenceLabel(UNRESOLVED_QURAN_METADATA)).toBe(
      "Quran reference: unresolved. Taj Company 16-line text is not loaded.",
    );
    expect(quranReferenceLabel(UNRESOLVED_QURAN_METADATA)).not.toBe(
      "Quran reference: Indo-Pakistani / Taj Company 16-line",
    );
    expect(canUseForQuranMode(unresolvedQuranReference).ok).toBe(false);
  });

  test("a test fixture is structurally usable and is not labeled Taj Company", () => {
    const provider = fixture();
    const validation = validateQuranReference(provider);
    expect(validation.ok).toBe(true);
    expect(validation.ayahCount).toBe(6);
    expect(validation.surahCount).toBe(1);
    expect(canUseForQuranMode(provider).ok).toBe(true);
    expect(quranReferenceLabel(provider.getMetadata())).toBe(
      "Quran reference: Unit test fixture (not an edition, Indo-Pakistani)",
    );
    expect(provider.getAyah(1, 1)?.text).toBe("فِيْ الْاَرْضِ");
    expect(provider.findExact(quranMatchKey("فِيْ الْاَرْضِ"))).toHaveLength(1);
    expect(provider.findCandidates(quranMatchKey("الارض")).some((hit) => hit.kind === "word")).toBe(true);
  });

  test("hash, duplicates, empties, range, Hafs count, and a false Taj claim fail closed", () => {
    expect(validateQuranReference(fixture(FIXTURE_AYAHS, { expectedHash: "deadbeef" })).ok).toBe(false);
    expect(validateQuranReference(fixture([{ ...FIXTURE_AYAHS[0]!, text: "" }])).reasons.join(" ")).toContain("empty");
    expect(
      validateQuranReference(fixture([FIXTURE_AYAHS[0]!, { ...FIXTURE_AYAHS[0]!, text: "فِيْ" }])).reasons.join(" "),
    ).toContain("duplicate");
    expect(validateQuranReference(fixture([{ id: "0:1", surah: 0, ayah: 1, text: "فِيْ" }])).ok).toBe(false);
    expect(validateQuranReference(fixture([{ id: "1:1", surah: 1, ayah: 1, text: "فِيْ\u0000" }])).ok).toBe(false);
    const hafs = validateQuranReference(fixture(FIXTURE_AYAHS, { verseCountConvention: "hafs-6236" }));
    expect(hafs.ok).toBe(false);
    expect(hafs.reasons.join(" ")).toContain("6236");
    expect(validateQuranReference(fixture(FIXTURE_AYAHS, { tajCompanyOfficial: true })).ok).toBe(false);
    expect(quranReferenceHash(FIXTURE_AYAHS)).toBe(quranReferenceHash([...FIXTURE_AYAHS].reverse()));
    expect(quranKeyStable("فی الارض")).toBe(true);
  });

  test("Uthmani script is refused even when the string is present", () => {
    const uthmani = fixture([{ id: "1:1", surah: 1, ayah: 1, text: "فِي الْأَرْضِ" }], { referenceScript: "Uthmani" });
    expect(canUseForQuranMode(uthmani).ok).toBe(false);
    expect(canUseForQuranMode(uthmani).reasons.join(" ")).toContain("Uthmani");
    expect(out("فی الارض", uthmani)).toBe("فی الارض");
  });

  test("reference text is immutable", () => {
    const ayah = fixture().getAyah(1, 1);
    expect(ayah?.text).toBe("فِيْ الْاَرْضِ");
    expect(() => {
      if (ayah) (ayah as { text: string }).text = "changed";
    }).toThrow();
    expect(fixture().getAyah(1, 1)?.text).toBe("فِيْ الْاَرْضِ");
  });
});

describe("Quran matching", () => {
  test("exact and normalized ayahs return the stored Indo-Pak string", () => {
    expect(out("فِيْ الْاَرْضِ")).toBe("فِيْ الْاَرْضِ");
    expect(out("فی الارض")).toBe("فِيْ الْاَرْضِ");
    expect(out("فی الارض.")).toBe("فِيْ الْاَرْضِ.");
    expect(out("  فی الارض")).toBe("  فِيْ الْاَرْضِ");
    expect(out("فی  الارض")).toBe("فِيْ الْاَرْضِ");
    expect(out("فی الارض")).toContain("\u0652");
    expect(out("الی رضوانہ")).toBe("اِلٰى رِضْوَانِهٖ");
    expect(out("الی رضوانہ")).toContain("\u0670");
    expect(out("الی رضوانہ")).toContain("\u0656");
    expect(out("فی الارض")).not.toBe("فِي الْأَرْضِ");
    const result = restoreQuran("فی الارض", fixture());
    expect(result.segments[0]?.status).toBe("verified");
    expect(result.segments[0]?.matchedReferenceId).toBe("1:1");
    expect(result.segments[0]?.referenceText).toBe("فِيْ الْاَرْضِ");
  });

  test("multiple ayahs keep the line break and use stored text", () => {
    expect(out("فی الارض\nالی رضوانہ")).toBe("فِيْ الْاَرْضِ\nاِلٰى رِضْوَانِهٖ");
    expect(out("فی الارض الی رضوانہ")).toBe("فِيْ الْاَرْضِ اِلٰى رِضْوَانِهٖ");
  });

  test("a listed missing alif is restored only when the reference context confirms it", () => {
    const result = restoreQuran("ما امرو", fixture());
    expect(result.output).toBe("مَا اُمِرُوْا");
    expect(result.segments[0]?.status).toBe("corrected");
    expect(result.segments[0]?.matchedReferenceId).toBe("1:3");
    expect(out("امرو")).toBe("امرو");
    expect(out("وتتوقو")).toBe("وتتوقو");
    expect(out("لتعتبرو")).toBe("لتعتبرو");
    expect(out("وتتوصلو")).toBe("وتتوصلو");
  });

  test("ambiguous and near-miss tokens are not corrected", () => {
    const ambiguous = restoreQuran("من", fixture());
    expect(ambiguous.output).toBe("من");
    expect(ambiguous.segments[0]?.status).toBe("ambiguous");
    expect(out("من عذاب")).toBe("مِنْ عَذَابِ");
    expect(out("تتقوا")).toBe("تتقوا");
    expect(out("جمیع")).toBe("جمیع");
    expect(out("نرانہ")).toBe("نرانہ");
    expect(out("قلم")).toBe("قلم");
  });

  test("Urdu, Persian, English, and mixed text stay unless a Quran span is verified", () => {
    expect(out("کتاب خوب ہے")).toBe("کتاب خوب ہے");
    expect(out("این کتاب خوب است")).toBe("این کتاب خوب است");
    expect(out("Page 2 فی الارض 123")).toBe("Page 2 فِيْ الْاَرْضِ 123");
    expect(out("")).toBe("");
    expect(out("   ")).toBe("   ");
  });

  test("a hash mismatch or the unloaded production reference does not rewrite text", () => {
    const sealed = fixture(FIXTURE_AYAHS, { expectedHash: "deadbeef" });
    const failed = restoreQuran("فی الارض", sealed);
    expect(failed.referenceReady).toBe(false);
    expect(failed.output).toBe("فی الارض");
    expect(failed.segments[0]?.category).toBe("Quranic reference match not established.");
    const unloaded = restoreQuran(CREATION_INPUT, unresolvedQuranReference);
    expect(unloaded.output).toBe(CREATION_INPUT);
    expect(unloaded.output).not.toBe(CREATION_OUTPUT);
    expect(unloaded.referenceReady).toBe(false);
  });
});

describe("general mode remains the diacritizer", () => {
  test("both existing golden passages still match exactly", () => {
    expect(diacritizeArabic(GOLDEN_INPUT).output).toBe(GOLDEN_OUTPUT);
    expect(diacritizeArabic(CREATION_INPUT).output).toBe(CREATION_OUTPUT);
    expect(diacritizeArabic("وتتوقو").output).toBe("وَتَتَوَقَّوْا");
    expect(diacritizeArabic("کتاب خوب ہے").output).toBe("کتاب خوب ہے");
    expect(diacritizeArabic("تتقوا").output).toBe("تتقوا");
  });

  test("the tool shows Quran mode without claiming a loaded Taj text", () => {
    const source = readFileSync("app/tools/arabic-diacritics/ArabicDiacriticsTool.tsx", "utf8");
    expect(source).toContain("General Arabic");
    expect(source).toContain("Quran — Indo-Pak");
    expect(source).toContain("unresolvedQuranReference");
    expect(source).not.toContain("Quran reference: Indo-Pakistani / Taj Company 16-line");
  });
});
