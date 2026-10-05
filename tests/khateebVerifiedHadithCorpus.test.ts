import { describe, expect, test } from "vitest";
import { researchKhateebTopic } from "../app/tools/khateeb-studio/engine/researchEngine";
import {
  VERIFIED_HADITH_CORPUS,
  hadithRecordForDossierText,
  verifiedHadithForDossierText,
} from "../app/tools/khateeb-studio/engine/verifiedHadithCorpus";

describe("Khateeb verified hadith corpus", () => {
  test("verifies the five existing sabr narrations against concrete source witnesses", () => {
    const sabr = VERIFIED_HADITH_CORPUS.filter(row => row.topicIds.includes("sabr"));
    expect(sabr).toHaveLength(5);
    expect(
      sabr.every(
        (row) => row.topicIds.includes("sabr") && row.status === "verified",
      ),
    ).toBe(true);
    expect(
      sabr.every(
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

  test("stores independently checked cross-reference witnesses without changing the selected presentation text", () => {
    const headOfFaith = verifiedHadithForDossierText("sabr-head-of-faith");
    const kafi = headOfFaith?.witnesses.filter(
      (witness) => witness.sourceTitleEn === "Al-Kafi",
    );

    expect(kafi).toHaveLength(2);
    expect(kafi?.every((witness) => witness.role === "cross-reference")).toBe(true);
    expect(kafi?.every((witness) => witness.textVerified && Boolean(witness.exactArabic))).toBe(true);
    expect(headOfFaith?.verificationWitnessId).not.toBe(kafi?.[0]?.id);
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


describe("Khateeb verified hadith textual variants", () => {
  test("keeps Al-Kafi wording separate from Mishkat for the head-of-faith narration", () => {
    const record = verifiedHadithForDossierText("sabr-head-of-faith");
    const kafi87 = record?.witnesses.find(
      (witness) => witness.sourceTitleEn === "Al-Kafi" && witness.citation.page === 87,
    );
    const kafi89 = record?.witnesses.find(
      (witness) => witness.sourceTitleEn === "Al-Kafi" && witness.citation.page === 89,
    );

    expect(kafi87?.textVerified).toBe(true);
    expect(kafi87?.exactArabic).toBe(
      "الصبر من الايمان بمنزلة الرأس من الجسد، فإذا ذهب الرأس ذهب الجسد، كذلك إذا ذهب الصبر ذهب الايمان.",
    );
    expect(kafi89?.textVerified).toBe(true);
    expect(kafi89?.exactArabic).toBe(
      "الصبر من الايمان بمنزلة الرأس من الجسد، ولا إيمان لمن لا صبر له.",
    );
    expect(kafi87?.exactArabic).not.toBe(record?.exactArabic);
    expect(kafi89?.exactArabic).not.toBe(record?.exactArabic);
  });

  test("keeps the Al-Kafi istirja wording as an independently verified witness", () => {
    const record = verifiedHadithForDossierText("sabr-istirja-calamity");
    const kafi = record?.witnesses.find(
      (witness) => witness.sourceTitleEn === "Al-Kafi",
    );

    expect(kafi?.textVerified).toBe(true);
    expect(kafi?.citation).toMatchObject({
      volume: 3,
      page: 224,
      hadithNumber: "5",
    });
    expect(kafi?.exactArabic).toContain("عند ذكره المصيبة");
    expect(kafi?.exactArabic).toContain("مصيبته");
    expect(kafi?.exactArabic).not.toBe(record?.exactArabic);
  });
});


describe("Khateeb Dua hadith verification inventory", () => {
  test("tracks all five Dua narrations and the one pending source", () => {
    const dua = VERIFIED_HADITH_CORPUS.filter((row) => row.topicIds.includes("dua"));
    expect(dua).toHaveLength(5);
    expect(dua.filter(row => row.status === "pending-verification").map(row => row.dossierPrimaryTextId)).toEqual(["dua-best-worship"]);
    expect(dua.map((row) => row.dossierPrimaryTextId)).toEqual([
      "dua-weapon-believer",
      "dua-best-worship",
      "dua-beloved-action",
      "dua-shield-believer",
      "dua-station-through-asking",
    ]);
  });

  test("does not expose pending Dua candidate text as verified quotation", () => {
    const result = researchKhateebTopic({
      query: "دعا",
      locale: "ur",
      maxEvidence: 50,
    });
    const duaHadiths = result.evidence.filter(
      (row) =>
        row.kind === "hadith" &&
        row.topicId === "dua" &&
        VERIFIED_HADITH_CORPUS.some(
          (inventory) =>
            inventory.topicIds.includes("dua") &&
            row.id === `dua-primary-${inventory.dossierPrimaryTextId}`,
        ),
    );

    expect(duaHadiths).toHaveLength(5);
    const pending = duaHadiths.filter(row => row.status === "source-lead");
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe("dua-primary-dua-best-worship");
    expect(pending[0].arabic).toBeUndefined();
    expect(pending[0].translationUr).toBeUndefined();
    expect(pending[0].detailUr).toContain("اصل متن کی لفظ بہ لفظ ماخذی تصدیق ابھی باقی");
  });
});


describe("Khateeb Dua direct source verification", () => {
  test("verifies four Al-Kafi Dua narrations and leaves Tanbih pending", () => {
    const dua = VERIFIED_HADITH_CORPUS.filter((row) => row.topicIds.includes("dua"));
    expect(dua.filter((row) => row.status === "verified")).toHaveLength(4);
    expect(dua.filter((row) => row.status === "pending-verification")).toHaveLength(1);
    expect(
      dua.find((row) => row.dossierPrimaryTextId === "dua-best-worship")?.status,
    ).toBe("pending-verification");
  });

  test("restores full Al-Kafi wording for abbreviated Dua dossier texts", () => {
    const beloved = verifiedHadithForDossierText("dua-beloved-action");
    const shield = verifiedHadithForDossierText("dua-shield-believer");
    const station = verifiedHadithForDossierText("dua-station-through-asking");

    expect(beloved?.exactArabic).toContain("وأفضل العبادة العفاف");
    expect(shield?.exactArabic).toBe(
      "الدعاء ترس المؤمن ومتى تكثر قرع الباب يفتح لك.",
    );
    expect(station?.exactArabic).toContain("ولو أن عبدا سد فاه ولم يسأل");
  });

  test("locks the corrected Al-Kafi hadith number for the believer's shield", () => {
    const shield = verifiedHadithForDossierText("dua-shield-believer");
    expect(shield?.verifiedReferenceUr).toBe("الکافی، ج2، ص468، ح4۔");
    expect(shield?.witnesses[0]?.citation.hadithNumber).toBe("4");
  });

  test("live research exposes only the four directly verified Dua quotations", () => {
    const result = researchKhateebTopic({
      query: "دعا",
      locale: "ur",
      maxEvidence: 50,
    });
    const duaHadiths = result.evidence.filter(
      (row) => row.kind === "hadith" && row.topicId === "dua",
    );
    expect(duaHadiths.filter((row) => row.status === "verified")).toHaveLength(4);
    expect(duaHadiths.filter((row) => row.status === "source-lead")).toHaveLength(1);
    expect(
      duaHadiths.find((row) => row.id === "dua-primary-dua-shield-believer")?.citationUr,
    ).toBe("الکافی، ج2، ص468، ح4۔");
  });
});
