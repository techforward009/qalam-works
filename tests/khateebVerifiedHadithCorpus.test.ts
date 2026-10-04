import { describe, expect, test } from "vitest";
import { researchKhateebTopic } from "../app/tools/khateeb-studio/engine/researchEngine";
import {
  VERIFIED_HADITH_CORPUS,
  hadithRecordForDossierText,
  verifiedHadithForDossierText,
} from "../app/tools/khateeb-studio/engine/verifiedHadithCorpus";

describe("Khateeb verified hadith corpus", () => {
  test("verifies the five existing sabr narrations against concrete source witnesses", () => {
    expect(VERIFIED_HADITH_CORPUS).toHaveLength(5);
    expect(
      VERIFIED_HADITH_CORPUS.every(
        (row) => row.topicIds.includes("sabr") && row.status === "verified",
      ),
    ).toBe(true);
    expect(
      VERIFIED_HADITH_CORPUS.every(
        (row) =>
          row.verificationWitnessId &&
          row.witnesses.some(
            (witness) =>
              witness.id === row.verificationWitnessId &&
              witness.textVerified &&
              witness.exactArabic === row.exactArabic,
          ),
      ),
    ).toBe(true);
  });

  test("keeps candidate text separate from exact source text", () => {
    const record = hadithRecordForDossierText("sabr-head-of-faith");
    expect(record?.candidateArabic).toContain("الصَّبرُ");
    expect(record?.exactArabic).toBe(
      "الصبر من الإيمان بمنزلة الرأس من الجسد، فإذا ذهب الرأس ذهب الجسد، وكذلك إذا ذهب الصبر ذهب الإيمان.",
    );
    expect(record?.candidateArabic).not.toBe(record?.exactArabic);
  });

  test("restores the full source wording for previously abbreviated dossier quotations", () => {
    const beforeReckoning = verifiedHadithForDossierText("sabr-before-reckoning");
    const istirja = verifiedHadithForDossierText("sabr-istirja-calamity");

    expect(beforeReckoning?.candidateArabic).toContain("...");
    expect(beforeReckoning?.exactArabic).not.toContain("...");
    expect(beforeReckoning?.exactArabic).toContain("حتى يضربوا باب الجنة قبل الحساب");

    expect(istirja?.candidateArabic).toContain("...");
    expect(istirja?.exactArabic).not.toContain("...");
    expect(istirja?.exactArabic).toContain("وكلما ذكر مصيبة");
  });

  test("stores structured cross-references without treating them as verified witnesses", () => {
    const headOfFaith = verifiedHadithForDossierText("sabr-head-of-faith");
    const kafi = headOfFaith?.witnesses.filter(
      (witness) => witness.sourceTitleEn === "Al-Kafi",
    );

    expect(kafi).toHaveLength(2);
    expect(kafi?.every((witness) => witness.role === "cross-reference")).toBe(true);
    expect(kafi?.every((witness) => witness.textVerified === false)).toBe(true);
    expect(kafi?.[0]?.citation).toMatchObject({
      volume: 2,
      page: 87,
      hadithNumber: "2",
    });
  });

  test("research exposes verified sabr hadiths only from exact witnesses", () => {
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
    expect(sabrHadiths.every((row) => row.status === "verified")).toBe(true);
    expect(sabrHadiths.every((row) => Boolean(row.arabic))).toBe(true);

    for (const row of sabrHadiths) {
      const inventory = VERIFIED_HADITH_CORPUS.find(
        (item) => row.id === `sabr-primary-${item.dossierPrimaryTextId}`,
      );
      expect(row.arabic).toBe(inventory?.exactArabic);
      expect(row.citationUr).toBe(inventory?.verifiedReferenceUr);
    }
  });
});
