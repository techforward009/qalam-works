import { describe, expect, test } from "vitest";
import { PARENTS_BARSI_DOSSIER } from "../app/tools/khateeb-studio/engine/parentsBarsiDossier";
import {
  hadithBankCoverage,
  KHATEEB_HADITH_BANK_TARGETS,
} from "../app/tools/khateeb-studio/engine/hadithBank";

describe("Khateeb hadith bank", () => {
  test("sets a richer hadith target for longer preparations", () => {
    expect(KHATEEB_HADITH_BANK_TARGETS[20]).toBe(5);
    expect(KHATEEB_HADITH_BANK_TARGETS[30]).toBe(8);
    expect(KHATEEB_HADITH_BANK_TARGETS[45]).toBe(10);
  });

  test("parents memorial dossier now carries at least eight usable hadith texts", () => {
    const hadiths =
      PARENTS_BARSI_DOSSIER.primaryTexts?.filter((item) => item.kind === "hadith") ?? [];

    expect(hadiths.length).toBeGreaterThanOrEqual(8);
    expect(hadiths.every((item) => Boolean(item.sourceRefUr))).toBe(true);
    expect(hadiths.every((item) => Boolean(item.sourceArabicMarked || item.sourceArabic))).toBe(true);
    expect(hadiths.every((item) => Boolean(item.sourceUrl))).toBe(true);
  });

  test("thirty-minute parents preparation meets the richer hadith-bank target", () => {
    expect(hadithBankCoverage(PARENTS_BARSI_DOSSIER, 30)).toEqual({
      count: 8,
      target: 8,
      missing: 0,
      ready: true,
    });
  });
});
