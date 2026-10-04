export type HadithVerificationStatus =
  | "pending-verification"
  | "verified"
  | "rejected";

export type HadithCitationMetadata = {
  bookUr: string;
  bookEn: string;
  volume?: number;
  page?: number;
  chapterUr?: string;
  chapterEn?: string;
  hadithNumber?: string;
};

export type HadithTextWitness = {
  id: string;
  role: "verification-source" | "cross-reference";
  sourceTitleUr: string;
  sourceTitleEn: string;
  sourceUrl: string;
  citation: HadithCitationMetadata;
  /**
   * Present only when this exact witness text has been checked on the cited source.
   * Keep source spelling and source-provided marks unchanged.
   */
  exactArabic?: string;
  textVerified: boolean;
  note?: string;
};

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
   * Text currently present in the dossier. Inventory only.
   * It may differ from an exact source witness in punctuation/diacritics or be abbreviated.
   */
  candidateArabic: string;
  status: HadithVerificationStatus;
  /**
   * Exact text used for presentation after verification. This must come from one
   * specific witness below; it is never reconstructed by the model.
   */
  exactArabic?: string;
  verifiedReferenceUr?: string;
  verifiedReferenceEn?: string;
  verifiedSourceUrl?: string;
  verificationWitnessId?: string;
  witnesses: readonly HadithTextWitness[];
  verificationNote?: string;
};

const MISHKAT_AL_ISLAM =
  "https://al-islam.org/mishkat-ul-anwar-fi-ghurar-il-akhbar-lamp-niche-best-traditions-abu-ali-al-fadl-ibn-al-hasan-ibn--12";
const MISHKAT_PAGE_484 =
  "https://shiaonlinelibrary.com/%D8%A7%D9%84%D9%83%D8%AA%D8%A8/1383_%D9%85%D8%B4%D9%83%D8%A7%D8%A9-%D8%A7%D9%84%D8%A3%D9%86%D9%88%D8%A7%D8%B1-%D8%B9%D9%84%D9%8A-%D8%A7%D9%84%D8%B7%D8%A8%D8%B1%D8%B3%D9%8A/%D8%A7%D9%84%D8%B5%D9%81%D8%AD%D8%A9_430";

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
    sourceUrl: MISHKAT_AL_ISLAM,
    candidateArabic:
      "لا يُصبِحُ المُسلِمُ إلّا عَلى ثَلاثِ خِصالٍ: التَّفَقُّهِ في الدِّينِ، وحُسنِ التَّقديرِ في المَعيشَةِ، والصَّبرِ عَلى النّائِبَةِ.",
    status: "verified",
    exactArabic:
      "لا يصبح المسلم إلا على ثلاث خصالٍ: التفقّه في الدين، وحُسن التقدير في المعيشة، والصبر على النائبة.",
    verifiedReferenceUr: "مشکاۃ الانوار، روایت 1622۔",
    verifiedReferenceEn: "Mishkat al-Anwar, tradition 1622.",
    verifiedSourceUrl: MISHKAT_AL_ISLAM,
    verificationWitnessId: "mishkat-al-islam-1622",
    witnesses: [
      {
        id: "mishkat-al-islam-1622",
        role: "verification-source",
        sourceTitleUr: "مشکاۃ الانوار — Al-Islam.org",
        sourceTitleEn: "Mishkat al-Anwar — Al-Islam.org",
        sourceUrl: MISHKAT_AL_ISLAM,
        citation: {
          bookUr: "مشکاۃ الانوار",
          bookEn: "Mishkat al-Anwar",
          chapterUr: "باب المصائب، فصل صبر بر مصائب",
          chapterEn: "Section on hardships and patience in calamities",
          hadithNumber: "1622",
        },
        exactArabic:
          "لا يصبح المسلم إلا على ثلاث خصالٍ: التفقّه في الدين، وحُسن التقدير في المعيشة، والصبر على النائبة.",
        textVerified: true,
      },
    ],
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
    sourceUrl: MISHKAT_PAGE_484,
    candidateArabic: "كِتمانُ المُصيبَةِ مِن كُنوزِ البِرِّ.",
    status: "verified",
    exactArabic: "كتمان المصيبة من كنوز البر.",
    verifiedReferenceUr: "مشکاۃ الانوار، ص 484، روایت 1623۔",
    verifiedReferenceEn: "Mishkat al-Anwar, p. 484, tradition 1623.",
    verifiedSourceUrl: MISHKAT_PAGE_484,
    verificationWitnessId: "mishkat-page-484-1623",
    witnesses: [
      {
        id: "mishkat-page-484-1623",
        role: "verification-source",
        sourceTitleUr: "مشکاۃ الانوار",
        sourceTitleEn: "Mishkat al-Anwar",
        sourceUrl: MISHKAT_PAGE_484,
        citation: {
          bookUr: "مشکاۃ الانوار",
          bookEn: "Mishkat al-Anwar",
          page: 484,
          hadithNumber: "1623",
        },
        exactArabic: "كتمان المصيبة من كنوز البر.",
        textVerified: true,
      },
    ],
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
    sourceUrl: MISHKAT_PAGE_484,
    candidateArabic:
      "إنَّ قَوماً يَأتونَ يَومَ القِيامَةِ ... فَيُقالُ لَهُم: بِمَ تَستَحِقّونَ الدُّخولَ إلَى الجَنَّةِ قَبلَ الحِسابِ؟ فَيَقولونَ: كُنّا مِنَ الصّابِرينَ في الدُّنيا.",
    status: "verified",
    exactArabic:
      "إن قوما يأتون يوم القيامة يتخللون رقاب الناس حتى يضربوا باب الجنة قبل الحساب، فيقولون لهم: بم تستحقون الدخول إلى الجنة قبل الحساب؟ فيقولون: كنا من الصابرين في الدنيا.",
    verifiedReferenceUr: "مشکاۃ الانوار، ص 484، روایت 1624۔",
    verifiedReferenceEn: "Mishkat al-Anwar, p. 484, tradition 1624.",
    verifiedSourceUrl: MISHKAT_PAGE_484,
    verificationWitnessId: "mishkat-page-484-1624",
    witnesses: [
      {
        id: "mishkat-page-484-1624",
        role: "verification-source",
        sourceTitleUr: "مشکاۃ الانوار",
        sourceTitleEn: "Mishkat al-Anwar",
        sourceUrl: MISHKAT_PAGE_484,
        citation: {
          bookUr: "مشکاۃ الانوار",
          bookEn: "Mishkat al-Anwar",
          page: 484,
          hadithNumber: "1624",
        },
        exactArabic:
          "إن قوما يأتون يوم القيامة يتخللون رقاب الناس حتى يضربوا باب الجنة قبل الحساب، فيقولون لهم: بم تستحقون الدخول إلى الجنة قبل الحساب؟ فيقولون: كنا من الصابرين في الدنيا.",
        textVerified: true,
      },
      {
        id: "mishkat-footnote-mustadrak-1624",
        role: "cross-reference",
        sourceTitleUr: "مستدرک الوسائل",
        sourceTitleEn: "Mustadrak al-Wasa'il",
        sourceUrl: MISHKAT_PAGE_484,
        citation: {
          bookUr: "مستدرک الوسائل",
          bookEn: "Mustadrak al-Wasa'il",
          volume: 11,
          page: 283,
          hadithNumber: "13030",
        },
        textVerified: false,
        note: "Cross-reference printed in the Mishkat page footnote; underlying text not yet checked directly.",
      },
    ],
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
    sourceUrl: MISHKAT_PAGE_484,
    candidateArabic:
      "الصَّبرُ مِنَ الإيمانِ بِمَنزِلَةِ الرَّأسِ مِنَ الجَسَدِ، فَإذا ذَهَبَ الرَّأسُ ذَهَبَ الجَسَدُ، وكَذلِكَ إذا ذَهَبَ الصَّبرُ ذَهَبَ الإيمانُ.",
    status: "verified",
    exactArabic:
      "الصبر من الإيمان بمنزلة الرأس من الجسد، فإذا ذهب الرأس ذهب الجسد، وكذلك إذا ذهب الصبر ذهب الإيمان.",
    verifiedReferenceUr: "مشکاۃ الانوار، ص 484، روایت 1625۔",
    verifiedReferenceEn: "Mishkat al-Anwar, p. 484, tradition 1625.",
    verifiedSourceUrl: MISHKAT_PAGE_484,
    verificationWitnessId: "mishkat-page-484-1625",
    witnesses: [
      {
        id: "mishkat-page-484-1625",
        role: "verification-source",
        sourceTitleUr: "مشکاۃ الانوار",
        sourceTitleEn: "Mishkat al-Anwar",
        sourceUrl: MISHKAT_PAGE_484,
        citation: {
          bookUr: "مشکاۃ الانوار",
          bookEn: "Mishkat al-Anwar",
          page: 484,
          hadithNumber: "1625",
        },
        exactArabic:
          "الصبر من الإيمان بمنزلة الرأس من الجسد، فإذا ذهب الرأس ذهب الجسد، وكذلك إذا ذهب الصبر ذهب الإيمان.",
        textVerified: true,
      },
      {
        id: "mishkat-footnote-kafi-1625-a",
        role: "cross-reference",
        sourceTitleUr: "الکافی",
        sourceTitleEn: "Al-Kafi",
        sourceUrl: MISHKAT_PAGE_484,
        citation: {
          bookUr: "الکافی",
          bookEn: "Al-Kafi",
          volume: 2,
          page: 87,
          hadithNumber: "2",
        },
        textVerified: false,
        note: "Cross-reference printed in the Mishkat page footnote; Al-Kafi text not yet checked directly.",
      },
      {
        id: "mishkat-footnote-kafi-1625-b",
        role: "cross-reference",
        sourceTitleUr: "الکافی",
        sourceTitleEn: "Al-Kafi",
        sourceUrl: MISHKAT_PAGE_484,
        citation: {
          bookUr: "الکافی",
          bookEn: "Al-Kafi",
          volume: 2,
          page: 89,
          hadithNumber: "4",
        },
        textVerified: false,
        note: "Second Al-Kafi cross-reference printed in the Mishkat page footnote; underlying text not yet checked directly.",
      },
    ],
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
    sourceUrl: MISHKAT_PAGE_484,
    candidateArabic:
      "ما مِن عَبدٍ يُصابُ بِمُصيبَةٍ فَيَستَرجِعُ عِندَ ذِكرِ المُصيبَةِ ويَصبِرُ ... إلّا غَفَرَ اللهُ لَهُ.",
    status: "verified",
    exactArabic:
      "ما من عبد يصاب بمصيبة فيسترجع عند ذكر المصيبة ويصبر حين تفجأه إلا غفر الله له ما تقدم من ذنبه، وكلما ذكر مصيبة فاسترجع عند ذكره المصيبة غفر له كل ذنب اكتسبه فيما بينهما.",
    verifiedReferenceUr: "مشکاۃ الانوار، ص 484، روایت 1627۔",
    verifiedReferenceEn: "Mishkat al-Anwar, p. 484, tradition 1627.",
    verifiedSourceUrl: MISHKAT_PAGE_484,
    verificationWitnessId: "mishkat-page-484-1627",
    witnesses: [
      {
        id: "mishkat-page-484-1627",
        role: "verification-source",
        sourceTitleUr: "مشکاۃ الانوار",
        sourceTitleEn: "Mishkat al-Anwar",
        sourceUrl: MISHKAT_PAGE_484,
        citation: {
          bookUr: "مشکاۃ الانوار",
          bookEn: "Mishkat al-Anwar",
          page: 484,
          hadithNumber: "1627",
        },
        exactArabic:
          "ما من عبد يصاب بمصيبة فيسترجع عند ذكر المصيبة ويصبر حين تفجأه إلا غفر الله له ما تقدم من ذنبه، وكلما ذكر مصيبة فاسترجع عند ذكره المصيبة غفر له كل ذنب اكتسبه فيما بينهما.",
        textVerified: true,
      },
      {
        id: "mishkat-footnote-kafi-1627",
        role: "cross-reference",
        sourceTitleUr: "الکافی",
        sourceTitleEn: "Al-Kafi",
        sourceUrl: MISHKAT_PAGE_484,
        citation: {
          bookUr: "الکافی",
          bookEn: "Al-Kafi",
          volume: 3,
          page: 224,
          hadithNumber: "5",
        },
        textVerified: false,
        note: "Cross-reference printed in the Mishkat page footnote; Al-Kafi text not yet checked directly.",
      },
    ],
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
  if (
    record?.status !== "verified" ||
    !record.exactArabic ||
    !record.verifiedReferenceUr ||
    !record.verifiedReferenceEn ||
    !record.verificationWitnessId
  ) {
    return null;
  }

  const witness = record.witnesses.find(
    (item) => item.id === record.verificationWitnessId,
  );
  return witness?.textVerified && witness.exactArabic === record.exactArabic
    ? record
    : null;
}
