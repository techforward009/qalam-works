import { describe, expect, test } from "vitest";
import { researchKhateebTopic } from "../app/tools/khateeb-studio/engine/researchEngine";
import {
  VERIFIED_HADITH_CORPUS,
  verifiedHadithForDossierText,
} from "../app/tools/khateeb-studio/engine/verifiedHadithCorpus";
import {
  buildDossierText,
  getTopicDossier,
} from "../app/tools/khateeb-studio/engine/topicDossier";

describe("Khateeb Parents/Barsi exact hadith verification", () => {
  const parents = VERIFIED_HADITH_CORPUS.filter((row) =>
    row.topicIds.includes("parents-barsi"),
  );

  test("inventories all eight Parents/Barsi narrations with six direct verifications", () => {
    expect(parents).toHaveLength(8);
    expect(parents.filter((row) => row.status === "verified")).toHaveLength(6);
    expect(
      parents.filter((row) => row.status === "pending-verification"),
    ).toHaveLength(2);
    expect(
      parents
        .filter((row) => row.status === "pending-verification")
        .map((row) => row.dossierPrimaryTextId),
    ).toEqual(["rida-thank-parents", "sadiq-three-parental-rights"]);
  });

  test("supports a verified verbatim excerpt inside a larger checked source witness", () => {
    const mother = verifiedHadithForDossierText("risalat-mother");
    const father = verifiedHadithForDossierText("risalat-father");

    expect(mother?.verificationWitnessId).toBe("rawdat-2-241-1032");
    expect(father?.verificationWitnessId).toBe("rawdat-2-241-1032");
    expect(mother?.witnesses[0]?.exactArabic).toContain(mother?.exactArabic);
    expect(father?.witnesses[0]?.exactArabic).toContain(father?.exactArabic);
    expect(mother?.exactArabic).not.toContain("...");
    expect(father?.exactArabic).not.toContain("...");
  });

  test("keeps the two thematic excerpts from Al-Kafi 2:157-158 tied to hadith 1", () => {
    const kindness = verifiedHadithForDossierText("sadiq-ihsan-before-asking");
    const mercy = verifiedHadithForDossierText("sadiq-mercy-voice-steps");

    expect(kindness?.witnesses[0]?.citation).toMatchObject({
      volume: 2,
      page: 157,
      hadithNumber: "1",
    });
    expect(mercy?.witnesses[0]?.citation).toMatchObject({
      volume: 2,
      page: 158,
      hadithNumber: "1",
    });
    expect(kindness?.witnesses[0]?.exactArabic).toContain(kindness?.exactArabic);
    expect(mercy?.witnesses[0]?.exactArabic).toContain(mercy?.exactArabic);
  });

  test("restores the complete directly checked wording of the intergenerational narration", () => {
    const row = verifiedHadithForDossierText("sadiq-generational-birr");
    expect(row?.verifiedReferenceUr).toBe("الکافی، ج5، ص554، ح5۔");
    expect(row?.exactArabic).toContain("وعفوا عن نساء الناس");
    expect(row?.exactArabic).toContain("تعف نساؤكم");
  });

  test("corrects the memorial narration to the directly checked Bihar witness", () => {
    const row = verifiedHadithForDossierText("birr-after-death");
    expect(row?.verifiedReferenceUr).toContain("ج71، ص88");
    expect(row?.verifiedReferenceUr).not.toContain("ج74، ص86");
    expect(row?.witnesses[0]?.citation).toMatchObject({
      volume: 71,
      page: 88,
    });
    expect(row?.witnesses[0]?.note).toContain("Kitab al-Imama wa al-Tabsira");
  });

  test("live research exposes six verified parent narrations and keeps two as source leads", () => {
    const result = researchKhateebTopic({
      query: "والدین",
      locale: "ur",
      maxEvidence: 50,
    });
    const hadiths = result.evidence.filter(
      (row) => row.kind === "hadith" && row.topicId === "parents-barsi",
    );

    expect(hadiths.filter((row) => row.status === "verified")).toHaveLength(6);
    expect(hadiths.filter((row) => row.status === "source-lead")).toHaveLength(2);
    expect(
      hadiths
        .filter((row) => row.status === "source-lead")
        .every((row) => !row.arabic),
    ).toBe(true);
  });

  test("copied dossier text never reproduces pending candidate Arabic as exact text", () => {
    const dossier = getTopicDossier("parents-barsi");
    expect(dossier).not.toBeNull();
    const text = buildDossierText(dossier!, "ur");

    expect(text).toContain("لفظ بہ لفظ مصدقہ حوالہ");
    expect(text).toContain("ماخذی حوالہ (زیرِ تصدیق)");
    expect(text).toContain(
      "اصل عربی متن کی لفظ بہ لفظ ماخذی تصدیق ابھی باقی ہے؛ غیر مصدقہ عبارت نقل نہیں کی گئی۔",
    );
    expect(text).not.toContain(
      "إن الله عز وجل أمر بالشكر له وللوالدين، فمن لم يشكر والديه لم يشكر الله.",
    );
  });
});
