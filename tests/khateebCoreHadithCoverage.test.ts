import { describe, expect, test } from "vitest";
import { getTopicDossier } from "../app/tools/khateeb-studio/engine/topicDossier";
import { hadithBankCoverage } from "../app/tools/khateeb-studio/engine/hadithBank";

describe("Khateeb core-topic hadith coverage", () => {
  for (const topicId of ["sabr", "dua"] as const) {
    test(`${topicId} meets the 20-minute hadith-bank target`, () => {
      const dossier = getTopicDossier(topicId);
      expect(dossier).not.toBeNull();

      const coverage = hadithBankCoverage(dossier, 20);
      expect(coverage.count).toBeGreaterThanOrEqual(5);
      expect(coverage.ready).toBe(true);

      const hadiths = dossier?.primaryTexts?.filter((item) => item.kind === "hadith") ?? [];
      expect(hadiths.every((item) => Boolean(item.sourceRefUr))).toBe(true);
      expect(hadiths.every((item) => Boolean(item.sourceArabicMarked || item.sourceArabic))).toBe(true);
      expect(hadiths.every((item) => Boolean(item.sourceUrl))).toBe(true);
    });
  }
});
