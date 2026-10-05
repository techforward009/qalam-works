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

  test("verifies all eight Parents/Barsi narrations against checked source witnesses", () => {
    expect(parents).toHaveLength(8);
    expect(parents.every((row) => row.status === "verified")).toBe(true);
    expect(
      parents.every((row) =>
        Boolean(verifiedHadithForDossierText(row.dossierPrimaryTextId)),
      ),
    ).toBe(true);
  });

  test("verifies the Al-Khisal gratitude clause and Tuhaf parental-rights text directly", () => {
    const gratitude = verifiedHadithForDossierText("rida-thank-parents");
    const rights = verifiedHadithForDossierText("sadiq-three-parental-rights");

    expect(gratitude?.verificationWitnessId).toBe("khisal-3-196");
    expect(gratitude?.witnesses[0]?.exactArabic).toContain(gratitude?.exactArabic);
    expect(rights?.verificationWitnessId).toBe("tuhaf-322-parent-rights");
    expect(rights?.verifiedReferenceUr).toBe("تحف العقول، ص322۔");
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

  test("live research exposes all eight parent narrations from verified witnesses", () => {
    const result = researchKhateebTopic({
      query: "والدین",
      locale: "ur",
      maxEvidence: 50,
    });
    const hadiths = result.evidence.filter(
      (row) => row.kind === "hadith" && row.topicId === "parents-barsi",
    );

    expect(hadiths).toHaveLength(8);
    expect(hadiths.every((row) => row.status === "verified")).toBe(true);
    expect(hadiths.every((row) => Boolean(row.arabic))).toBe(true);
  });

  test("copied Parents/Barsi dossier uses verified source text and references", () => {
    const dossier = getTopicDossier("parents-barsi");
    expect(dossier).not.toBeNull();
    const text = buildDossierText(dossier!, "ur");

    expect(text).toContain("لفظ بہ لفظ مصدقہ حوالہ");
    expect(text).not.toContain("ماخذی حوالہ (زیرِ تصدیق)");
    expect(text).toContain("الخصال، باب الثلاثة، ح3-196");
    expect(text).toContain("تحف العقول، ص322");
    expect(text).toContain("بحار الانوار، ج71، ص88");
  });

  test("copied dossiers globally suppress unverified candidate hadith wording", () => {
    const dossier = getTopicDossier("dua");
    expect(dossier).not.toBeNull();
    const text = buildDossierText(dossier!, "ur");

    expect(text).toContain(
      "اصل عربی متن کی لفظ بہ لفظ ماخذی تصدیق ابھی باقی ہے؛ غیر مصدقہ عبارت نقل نہیں کی گئی۔",
    );
    expect(text).toContain("ماخذی حوالہ (زیرِ تصدیق)");
    expect(text).not.toContain("أفضَلُ العِبادَةِ الدُّعاءُ");
  });
});
