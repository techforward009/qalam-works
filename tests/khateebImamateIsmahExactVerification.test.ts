import { describe, expect, test } from "vitest";
import { researchKhateebTopic } from "../app/tools/khateeb-studio/engine/researchEngine";
import {
  VERIFIED_HADITH_CORPUS,
  validateVerifiedHadithCorpus,
  verifiedHadithForDossierText,
} from "../app/tools/khateeb-studio/engine/verifiedHadithCorpus";
import {
  buildDossierText,
  getTopicDossier,
} from "../app/tools/khateeb-studio/engine/topicDossier";

describe("Khateeb Imamate and Ismah exact hadith verification", () => {
  const imamate = VERIFIED_HADITH_CORPUS.filter((row) =>
    row.topicIds.includes("imamate"),
  );
  const ismah = VERIFIED_HADITH_CORPUS.filter((row) =>
    row.topicIds.includes("ismah"),
  );

  test("verifies all five Imamate and all five Ismah dossier narrations", () => {
    expect(imamate).toHaveLength(5);
    expect(ismah).toHaveLength(5);
    expect([...imamate, ...ismah].every((row) => row.status === "verified")).toBe(true);
    expect(
      [...imamate, ...ismah].every((row) =>
        Boolean(verifiedHadithForDossierText(row.dossierPrimaryTextId)),
      ),
    ).toBe(true);
  });

  test("corrects the five-pillars narration to Al-Kafi vol. 2 p. 18 hadith 1", () => {
    const row = verifiedHadithForDossierText("imamate-five-pillars-wilayah");
    expect(row?.verifiedReferenceUr).toBe("الکافی، ج2، ص18، ح1۔");
    expect(row?.verifiedReferenceUr).not.toContain("ج3");
    expect(row?.witnesses[0]?.citation).toMatchObject({
      volume: 2,
      page: 18,
      hadithNumber: "1",
    });
    expect(row?.exactArabic).toContain("ولم يناد بشئ كما نودي بالولاية");
  });

  test("restores the full Abrahamic progression instead of the dossier ellipses", () => {
    const row = verifiedHadithForDossierText("imamate-ibrahim-rank");
    expect(row?.candidateArabic).toContain("...");
    expect(row?.exactArabic).not.toContain("...");
    expect(row?.exactArabic).toContain("اتخذه رسولا قبل أن يتخذه خليلا");
    expect(row?.exactArabic).toContain("إني جاعلك للناس إماما");
  });

  test("locks the direct Al-Kafi witness for the earth-never-empty narration", () => {
    const row = verifiedHadithForDossierText("imamate-earth-never-empty");
    expect(row?.verifiedReferenceUr).toBe("الکافی، ج1، ص178، ح2۔");
    expect(row?.witnesses[0]?.citation.chapterUr).toContain("الأرض لا تخلو");
    expect(row?.exactArabic).toContain("وإن نقصوا شيئا أتمه لهم");
  });

  test("preserves source genealogy for the Imam-recognition narration", () => {
    const row = verifiedHadithForDossierText("imamate-know-your-imam");
    expect(row?.exactArabic).toBe(
      "من مات وهو لا يعرف إمامه مات ميتة جاهلية",
    );
    expect(row?.verifiedReferenceUr).toContain("المحاسن");
    expect(row?.verifiedReferenceUr).toContain("ج1، ص251، ح474");
    expect(row?.verifiedReferenceUr).toContain("بحار الانوار");
    expect(row?.witnesses[0]?.note).toContain("Al-Mahasin 1/251/474");
  });

  test("verifies the two Ma'ani al-Akhbar Ismah narrations from page 132", () => {
    const imamQuran = verifiedHadithForDossierText("ismah-imam-quran");
    const definition = verifiedHadithForDossierText("ismah-sadiq-definition");

    expect(imamQuran?.witnesses[0]?.citation).toMatchObject({
      page: 132,
      hadithNumber: "1",
    });
    expect(imamQuran?.exactArabic).toContain("والامام يهدي إلى القرآن");
    expect(imamQuran?.exactArabic).not.toContain("...");

    expect(definition?.witnesses[0]?.citation).toMatchObject({
      page: 132,
      hadithNumber: "2",
    });
    expect(definition?.exactArabic).toBe(
      "المعصوم هو الممتنع بالله من جميع محارم الله",
    );
  });

  test("keeps Al-Kafi Ismah excerpts tied to their checked witnesses", () => {
    const lapses = verifiedHadithForDossierText("ismah-imam-free-from-lapses");
    const proof = verifiedHadithForDossierText("ismah-rida-proof");

    expect(lapses?.verifiedReferenceUr).toBe("الکافی، ج1، ص204، ح2۔");
    expect(lapses?.exactArabic).toBe(
      "معصوما من الزلات ، مصونا عن الفواحش كلها",
    );

    expect(proof?.verifiedReferenceUr).toBe("الکافی، ج1، ص203، ح1۔");
    expect(proof?.exactArabic).toContain("قد أمن من الخطايا والزلل والعثار");
    expect(proof?.exactArabic).toContain("ليكون حجته على عباده");
  });

  test("locks the Ghurar infallibility saying through the classified source witness", () => {
    const row = verifiedHadithForDossierText("ismah-safe-from-error");
    expect(row?.verifiedReferenceUr).toContain("غرر الحکم، ح8469");
    expect(row?.verificationWitnessId).toBe("tasnif-ghurar-318-7338");
    expect(row?.exactArabic).toBe("مَنْ أُلْهِمَ الْعِصْمَةَ أَمِنَ الزَّلَلَ");
  });

  test("live research exposes all ten records as exact verified evidence", () => {
    const imamateResearch = researchKhateebTopic({
      query: "امامت",
      locale: "ur",
      maxEvidence: 50,
    });
    const ismahResearch = researchKhateebTopic({
      query: "عصمت",
      locale: "ur",
      maxEvidence: 50,
    });

    const imamateHadiths = imamateResearch.evidence.filter(
      (row) => row.kind === "hadith" && row.topicId === "imamate",
    );
    const ismahHadiths = ismahResearch.evidence.filter(
      (row) => row.kind === "hadith" && row.topicId === "ismah",
    );

    expect(imamateHadiths).toHaveLength(5);
    expect(ismahHadiths).toHaveLength(5);
    expect(
      [...imamateHadiths, ...ismahHadiths].every(
        (row) => row.status === "verified" && Boolean(row.arabic),
      ),
    ).toBe(true);
  });

  test("copied dossier output uses verified source text, not old marked candidates", () => {
    const imamateText = buildDossierText(getTopicDossier("imamate")!, "ur");
    const ismahText = buildDossierText(getTopicDossier("ismah")!, "ur");

    expect(imamateText).toContain("لفظ بہ لفظ مصدقہ حوالہ");
    expect(imamateText).toContain("الکافی، ج2، ص18، ح1");
    expect(imamateText).not.toContain("الکافی، ج3، ص18، ح2");

    expect(ismahText).toContain("لفظ بہ لفظ مصدقہ حوالہ");
    expect(ismahText).toContain("معانی الاخبار، ص132، ح1");
    expect(ismahText).not.toContain("...");
  });

  test("the expanded corpus still satisfies all exact-verification invariants", () => {
    expect(validateVerifiedHadithCorpus()).toEqual([]);
  });
});
