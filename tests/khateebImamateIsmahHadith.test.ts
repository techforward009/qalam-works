import { describe, expect, test } from "vitest";
import { getTopicDossier } from "../app/tools/khateeb-studio/engine/topicDossier";
import { hadithBankCoverage } from "../app/tools/khateeb-studio/engine/hadithBank";

describe("Khateeb Imamate and Ismah hadith coverage", () => {
  for (const topicId of ["imamate", "ismah"] as const) {
    test(`${topicId} has a sermon-ready referenced hadith bank`, () => {
      const dossier = getTopicDossier(topicId);
      expect(dossier).not.toBeNull();
      expect(hadithBankCoverage(dossier, 20).ready).toBe(true);

      const hadiths = dossier?.primaryTexts?.filter((item) => item.kind === "hadith") ?? [];
      expect(hadiths.length).toBeGreaterThanOrEqual(5);
      expect(hadiths.every((item) => Boolean(item.sourceArabicMarked || item.sourceArabic))).toBe(true);
      expect(hadiths.every((item) => Boolean(item.sourceRefUr))).toBe(true);
      expect(hadiths.every((item) => Boolean(item.sourceUrl))).toBe(true);
    });
  }
});
