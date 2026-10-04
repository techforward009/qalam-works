import { describe, expect, test } from "vitest";
import { researchKhateebTopic } from "../app/tools/khateeb-studio/engine/researchEngine";
import {
  validateVerifiedHadithCorpus,
  verifiedHadithForDossierText,
} from "../app/tools/khateeb-studio/engine/verifiedHadithCorpus";
import {
  buildDossierText,
  getTopicDossier,
} from "../app/tools/khateeb-studio/engine/topicDossier";

describe("Khateeb Qur'an and Hidayat exact hadith verification", () => {
  test("verifies both Al-Kafi 2:609 recitation narrations from the direct page", () => {
    const covenant = verifiedHadithForDossierText("quran-hidayat-covenant");
    const treasuries = verifiedHadithForDossierText("quran-hidayat-treasuries");

    expect(covenant?.verifiedReferenceUr).toBe(
      "الکافی، ج2، ص609، باب فی قراءتہ، ح1۔",
    );
    expect(covenant?.exactArabic).toContain("خَمْسِينَ آيَةً");
    expect(covenant?.verificationWitnessId).toBe("eshia-kafi-2-609-1");

    expect(treasuries?.verifiedReferenceUr).toBe(
      "الکافی، ج2، ص609، باب فی قراءتہ، ح2۔",
    );
    expect(treasuries?.exactArabic).toBe(
      "آيَاتُ الْقُرْآنِ خَزَائِنُ فَكُلَّمَا فَتَحْتَ خِزَانَةً يَنْبَغِي لَكَ أَنْ تَنْظُرَ مَا فِيهَا.",
    );
  });

  test("verifies the four consecutive carrier-of-Qur'an narrations on Al-Kafi 2:603", () => {
    const ids = [
      "quran-hidayat-people",
      "quran-hidayat-memorise-act",
      "quran-hidayat-learn",
      "quran-hidayat-youth",
    ] as const;

    const rows = ids.map((id) => verifiedHadithForDossierText(id));
    expect(rows.every(Boolean)).toBe(true);
    expect(rows.map((row) => row?.witnesses[0]?.citation.hadithNumber)).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
    expect(
      rows.every((row) => row?.witnesses[0]?.citation.page === 603),
    ).toBe(true);
  });

  test("keeps long Al-Kafi hadith 3 as a verified contiguous excerpt instead of fabricating a shortened quote", () => {
    const learn = verifiedHadithForDossierText("quran-hidayat-learn");
    expect(learn?.exactArabic).toBe(
      "تَعَلَّمُوا الْقُرْآنَ فَإِنَّهُ يَأْتِي يَوْمَ الْقِيَامَةِ صَاحِبَهُ فِي صُورَةِ شَابٍّ جَمِيلٍ شَاحِبِ اللَّوْنِ",
    );
    expect(learn?.witnesses[0]?.note).toContain(
      "contiguous opening clause",
    );
    expect(learn?.exactArabic).not.toContain("...");
  });

  test("restores the complete omitted middle of the humility narration", () => {
    const humility = verifiedHadithForDossierText("quran-hidayat-humility");

    expect(humility?.candidateArabic).toContain("...");
    expect(humility?.exactArabic).not.toContain("...");
    expect(humility?.exactArabic).toContain(
      "يَا حَامِلَ الْقُرْآنِ تَزَيَّنْ بِهِ لِلَّهِ",
    );
    expect(humility?.exactArabic).toContain(
      "وَ لَكِنَّهُ يَعْفُو وَ يَصْفَحُ وَ يَغْفِرُ وَ يَحْلُمُ لِتَعْظِيمِ الْقُرْآنِ",
    );
    expect(humility?.verifiedReferenceUr).toContain("ج2، ص604");
    expect(humility?.witnesses[0]?.citation.hadithNumber).toBe("5");
  });

  test("verifies Imam al-Sajjad's companionship statement on Al-Kafi 2:602 hadith 13", () => {
    const companionship = verifiedHadithForDossierText(
      "quran-hidayat-companionship",
    );

    expect(companionship?.verifiedReferenceUr).toBe("الکافی، ج2، ص602، ح13۔");
    expect(companionship?.exactArabic).toBe(
      "لَوْ مَاتَ مَنْ بَيْنَ الْمَشْرِقِ وَ الْمَغْرِبِ لَمَا اسْتَوْحَشْتُ بَعْدَ أَنْ يَكُونَ الْقُرْآنُ مَعِي",
    );
    expect(companionship?.witnesses[0]?.sourceUrl).toBe(
      "https://lib.eshia.ir/11005/2/602",
    );
  });

  test("live research exposes all eight Qur'an/Hidayat hadiths as verified source-faithful text", () => {
    const result = researchKhateebTopic({
      query: "قرآن اور ہدایت",
      locale: "ur",
      maxEvidence: 50,
    });
    const hadiths = result.evidence.filter(
      (row) => row.kind === "hadith" && row.topicId === "quran-hidayat",
    );

    expect(hadiths).toHaveLength(8);
    expect(hadiths.every((row) => row.status === "verified")).toBe(true);
    expect(hadiths.every((row) => Boolean(row.arabic))).toBe(true);
    expect(
      hadiths.find((row) => row.id === "quran-hidayat-primary-quran-hidayat-humility")
        ?.arabic,
    ).not.toContain("...");
  });

  test("copied dossier now uses exact verified source text for every hadith", () => {
    const dossier = getTopicDossier("quran-hidayat");
    expect(dossier).not.toBeNull();

    const text = buildDossierText(dossier!, "ur");
    const verifiedLabelCount = text.split("لفظ بہ لفظ مصدقہ حوالہ").length - 1;

    expect(verifiedLabelCount).toBe(8);
    expect(text).not.toContain("ماخذی حوالہ (زیرِ تصدیق)");
    expect(text).not.toContain(
      "يا حامل القرآن تواضع به يرفعك الله ولا تعزز به فيذلك الله ...",
    );
    expect(text).toContain(
      "يَا حَامِلَ الْقُرْآنِ تَوَاضَعْ بِهِ يَرْفَعْكَ اللَّهُ",
    );
  });

  test("expanded corpus still satisfies all exact-verification invariants", () => {
    expect(validateVerifiedHadithCorpus()).toEqual([]);
  });
});
