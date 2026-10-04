import { describe, expect, test } from "vitest";
import { researchKhateebTopic } from "../app/tools/khateeb-studio/engine/researchEngine";
import {
  VERIFIED_HADITH_CORPUS,
  hadithRecordForDossierText,
  verifiedHadithForDossierText,
} from "../app/tools/khateeb-studio/engine/verifiedHadithCorpus";

describe("Khateeb verified hadith corpus", () => {
  test("starts with the five existing sabr narrations as pending inventory", () => {
    expect(VERIFIED_HADITH_CORPUS).toHaveLength(5);
    expect(
      VERIFIED_HADITH_CORPUS.every(
        (row) => row.topicIds.includes("sabr") && row.status === "pending-verification",
      ),
    ).toBe(true);
    expect(
      VERIFIED_HADITH_CORPUS.every(
        (row) => row.sourceTitleEn === "Mishkat al-Anwar",
      ),
    ).toBe(true);
  });

  test("does not expose a pending candidate as exact verified text", () => {
    const pending = hadithRecordForDossierText("sabr-head-of-faith");
    expect(pending?.candidateArabic).toContain("الصَّبرُ");
    expect(verifiedHadithForDossierText("sabr-head-of-faith")).toBeNull();
  });

  test("marks abbreviated dossier quotations for explicit re-verification", () => {
    const abbreviated = VERIFIED_HADITH_CORPUS.filter((row) =>
      row.candidateArabic.includes("..."),
    );
    expect(abbreviated.map((row) => row.dossierPrimaryTextId)).toEqual([
      "sabr-before-reckoning",
      "sabr-istirja-calamity",
    ]);
    expect(
      abbreviated.every((row) => row.verificationNote?.includes("ellipsis")),
    ).toBe(true);
  });

  test("research downgrades inventoried sabr hadiths until exact verification", () => {
    const result = researchKhateebTopic({
      query: "صبر",
      locale: "ur",
      maxEvidence: 50,
    });
    const sabrHadiths = result.evidence.filter(
      (row) =>
        row.kind === "hadith" &&
        row.topicId === "sabr" &&
        VERIFIED_HADITH_CORPUS.some(
          (inventory) =>
            row.id === `sabr-primary-${inventory.dossierPrimaryTextId}`,
        ),
    );

    expect(sabrHadiths).toHaveLength(5);
    expect(sabrHadiths.every((row) => row.status === "source-lead")).toBe(true);
    expect(sabrHadiths.every((row) => !row.arabic)).toBe(true);
    expect(
      sabrHadiths.every((row) =>
        row.detailUr.includes("لفظ بہ لفظ ماخذ سے verify ہونا باقی"),
      ),
    ).toBe(true);
  });
});
