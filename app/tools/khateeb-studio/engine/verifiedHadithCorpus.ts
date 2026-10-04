export type HadithVerificationStatus =
  | "pending-verification"
  | "verified"
  | "rejected";

export type VerifiedHadithRecord = {
  id: string;
  topicIds: readonly string[];
  dossierPrimaryTextId: string;
  attributedToUr: string;
  attributedToEn: string;
  sourceTitleUr: string;
  sourceTitleEn: string;
  citedReferenceUr: string;
  citedReferenceEn: string;
  sourceUrl: string;
  /**
   * Text currently present in the dossier. It is inventory only and MUST NOT be
   * presented as an exact quotation until status becomes "verified".
   */
  candidateArabic: string;
  status: HadithVerificationStatus;
  /**
   * Filled only after the source page/book has been checked word-for-word.
   * Preserve the source spelling and diacritics exactly; never model-normalize it.
   */
  exactArabic?: string;
  verifiedReferenceUr?: string;
  verifiedReferenceEn?: string;
  verifiedSourceUrl?: string;
  verificationNote?: string;
};

export const VERIFIED_HADITH_CORPUS: readonly VerifiedHadithRecord[] = [
  {
    id: "sabr-mishkat-1622",
    topicIds: ["sabr"],
    dossierPrimaryTextId: "sabr-muslim-three-traits",
    attributedToUr: "امام صادقؑ",
    attributedToEn: "Imam al-Sadiq",
    sourceTitleUr: "مشکاۃ الانوار",
    sourceTitleEn: "Mishkat al-Anwar",
    citedReferenceUr: "مشکاۃ الانوار، حدیث 1622۔",
    citedReferenceEn: "Mishkat al-Anwar, hadith 1622.",
    sourceUrl:
      "https://al-islam.org/mishkat-ul-anwar-fi-ghurar-il-akhbar-lamp-niche-best-traditions-abu-ali-al-fadl-ibn-al-hasan-ibn--12",
    candidateArabic:
      "لا يُصبِحُ المُسلِمُ إلّا عَلى ثَلاثِ خِصالٍ: التَّفَقُّهِ في الدِّينِ، وحُسنِ التَّقديرِ في المَعيشَةِ، والصَّبرِ عَلى النّائِبَةِ.",
    status: "pending-verification",
  },
  {
    id: "sabr-mishkat-1623",
    topicIds: ["sabr"],
    dossierPrimaryTextId: "sabr-conceal-calamity",
    attributedToUr: "امام صادقؑ",
    attributedToEn: "Imam al-Sadiq",
    sourceTitleUr: "مشکاۃ الانوار",
    sourceTitleEn: "Mishkat al-Anwar",
    citedReferenceUr: "مشکاۃ الانوار، حدیث 1623۔",
    citedReferenceEn: "Mishkat al-Anwar, hadith 1623.",
    sourceUrl:
      "https://al-islam.org/mishkat-ul-anwar-fi-ghurar-il-akhbar-lamp-niche-best-traditions-abu-ali-al-fadl-ibn-al-hasan-ibn--12",
    candidateArabic: "كِتمانُ المُصيبَةِ مِن كُنوزِ البِرِّ.",
    status: "pending-verification",
  },
  {
    id: "sabr-mishkat-1624",
    topicIds: ["sabr"],
    dossierPrimaryTextId: "sabr-before-reckoning",
    attributedToUr: "امام صادقؑ",
    attributedToEn: "Imam al-Sadiq",
    sourceTitleUr: "مشکاۃ الانوار",
    sourceTitleEn: "Mishkat al-Anwar",
    citedReferenceUr: "مشکاۃ الانوار، حدیث 1624۔",
    citedReferenceEn: "Mishkat al-Anwar, hadith 1624.",
    sourceUrl:
      "https://al-islam.org/mishkat-ul-anwar-fi-ghurar-il-akhbar-lamp-niche-best-traditions-abu-ali-al-fadl-ibn-al-hasan-ibn--12",
    candidateArabic:
      "إنَّ قَوماً يَأتونَ يَومَ القِيامَةِ ... فَيُقالُ لَهُم: بِمَ تَستَحِقّونَ الدُّخولَ إلَى الجَنَّةِ قَبلَ الحِسابِ؟ فَيَقولونَ: كُنّا مِنَ الصّابِرينَ في الدُّنيا.",
    status: "pending-verification",
    verificationNote:
      "Candidate text contains an ellipsis in the dossier and therefore cannot qualify as exact-source text.",
  },
  {
    id: "sabr-mishkat-1625",
    topicIds: ["sabr"],
    dossierPrimaryTextId: "sabr-head-of-faith",
    attributedToUr: "امام صادقؑ",
    attributedToEn: "Imam al-Sadiq",
    sourceTitleUr: "مشکاۃ الانوار",
    sourceTitleEn: "Mishkat al-Anwar",
    citedReferenceUr: "مشکاۃ الانوار، حدیث 1625۔",
    citedReferenceEn: "Mishkat al-Anwar, hadith 1625.",
    sourceUrl:
      "https://al-islam.org/mishkat-ul-anwar-fi-ghurar-il-akhbar-lamp-niche-best-traditions-abu-ali-al-fadl-ibn-al-hasan-ibn--12",
    candidateArabic:
      "الصَّبرُ مِنَ الإيمانِ بِمَنزِلَةِ الرَّأسِ مِنَ الجَسَدِ، فَإذا ذَهَبَ الرَّأسُ ذَهَبَ الجَسَدُ، وكَذلِكَ إذا ذَهَبَ الصَّبرُ ذَهَبَ الإيمانُ.",
    status: "pending-verification",
  },
  {
    id: "sabr-mishkat-1627",
    topicIds: ["sabr"],
    dossierPrimaryTextId: "sabr-istirja-calamity",
    attributedToUr: "امام باقرؑ",
    attributedToEn: "Imam al-Baqir",
    sourceTitleUr: "مشکاۃ الانوار",
    sourceTitleEn: "Mishkat al-Anwar",
    citedReferenceUr: "مشکاۃ الانوار، حدیث 1627۔",
    citedReferenceEn: "Mishkat al-Anwar, hadith 1627.",
    sourceUrl:
      "https://al-islam.org/mishkat-ul-anwar-fi-ghurar-il-akhbar-lamp-niche-best-traditions-abu-ali-al-fadl-ibn-al-hasan-ibn--12",
    candidateArabic:
      "ما مِن عَبدٍ يُصابُ بِمُصيبَةٍ فَيَستَرجِعُ عِندَ ذِكرِ المُصيبَةِ ويَصبِرُ ... إلّا غَفَرَ اللهُ لَهُ.",
    status: "pending-verification",
    verificationNote:
      "Candidate text contains an ellipsis in the dossier and therefore cannot qualify as exact-source text.",
  },
];

export function hadithRecordForDossierText(
  dossierPrimaryTextId: string,
): VerifiedHadithRecord | null {
  return (
    VERIFIED_HADITH_CORPUS.find(
      (item) => item.dossierPrimaryTextId === dossierPrimaryTextId,
    ) ?? null
  );
}

export function verifiedHadithForDossierText(
  dossierPrimaryTextId: string,
): VerifiedHadithRecord | null {
  const record = hadithRecordForDossierText(dossierPrimaryTextId);
  return record?.status === "verified" &&
    record.exactArabic &&
    record.verifiedReferenceUr &&
    record.verifiedReferenceEn
    ? record
    : null;
}
