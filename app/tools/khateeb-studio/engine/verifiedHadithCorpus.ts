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
        sourceUrl: "https://ablibrary.net/book_content/b/3250/87?lang=ar",
        citation: {
          bookUr: "الکافی",
          bookEn: "Al-Kafi",
          volume: 2,
          page: 87,
          chapterUr: "باب الصبر",
          chapterEn: "Chapter on patience",
          hadithNumber: "2",
        },
        exactArabic:
          "الصبر من الايمان بمنزلة الرأس من الجسد، فإذا ذهب الرأس ذهب الجسد، كذلك إذا ذهب الصبر ذهب الايمان.",
        textVerified: true,
        note: "Directly checked on the cited Al-Kafi page; wording is preserved as a separate textual witness.",
      },
      {
        id: "mishkat-footnote-kafi-1625-b",
        role: "cross-reference",
        sourceTitleUr: "الکافی",
        sourceTitleEn: "Al-Kafi",
        sourceUrl: "https://ablibrary.net/book_content/b/3250/89?lang=ar",
        citation: {
          bookUr: "الکافی",
          bookEn: "Al-Kafi",
          volume: 2,
          page: 89,
          chapterUr: "باب الصبر",
          chapterEn: "Chapter on patience",
          hadithNumber: "4",
        },
        exactArabic:
          "الصبر من الايمان بمنزلة الرأس من الجسد، ولا إيمان لمن لا صبر له.",
        textVerified: true,
        note: "Directly checked on the cited Al-Kafi page; this is a distinct shorter witness attributed to Ali ibn al-Husayn.",
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
        sourceUrl: "https://ablibrary.net/book_content/b/3251/228?lang=ar",
        citation: {
          bookUr: "الکافی",
          bookEn: "Al-Kafi",
          volume: 3,
          page: 224,
          hadithNumber: "5",
        },
        exactArabic:
          "ما من عبد يصاب بمصيبة فيسترجع عند ذكره المصيبة ويصبر حين تفجأه إلا غفر الله له ما تقدم من ذنبه وكلما ذكر مصيبته فاسترجع عند ذكر المصيبة غفر الله له كل ذنب اكتسب فيما بينهما.",
        textVerified: true,
        note: "Directly checked on the cited Al-Kafi page; wording is preserved independently from the Mishkat witness.",
      },
    ],
  },
  {
    id: "dua-kafi-468-1",
    topicIds: ["dua"],
    dossierPrimaryTextId: "dua-weapon-believer",
    attributedToUr: "رسول اکرمؐ",
    attributedToEn: "The Prophet",
    sourceTitleUr: "الکافی",
    sourceTitleEn: "Al-Kafi",
    citedReferenceUr: "الکافی، ج2، ص468، ح1۔",
    citedReferenceEn: "Al-Kafi, vol. 2, p. 468, hadith 1.",
    sourceUrl:
      "https://najafdesertlibrary.com/book/%D8%A7%D9%84%D9%83%D8%A7%D9%81%D9%8A/v/2/p/468",
    candidateArabic:
      "الدُّعاءُ سِلاحُ المُؤمِنِ، وعَمودُ الدِّينِ، ونورُ السَّماواتِ والأرضِ.",
    status: "verified",
    exactArabic:
      "الدعاء سلاح المؤمن وعمود الدين ونور السماوات والأرض.",
    verifiedReferenceUr: "الکافی، ج2، ص468، ح1۔",
    verifiedReferenceEn: "Al-Kafi, vol. 2, p. 468, hadith 1.",
    verifiedSourceUrl:
      "https://najafdesertlibrary.com/book/%D8%A7%D9%84%D9%83%D8%A7%D9%81%D9%8a/v/2/p/468",
    verificationWitnessId: "kafi-najaf-468-1",
    witnesses: [
      {
        id: "kafi-najaf-468-1",
        role: "verification-source",
        sourceTitleUr: "الکافی",
        sourceTitleEn: "Al-Kafi",
        sourceUrl:
          "https://najafdesertlibrary.com/book/%D8%A7%D9%84%D9%83%D8%A7%D9%81%D9%8a/v/2/p/468",
        citation: {
          bookUr: "الکافی",
          bookEn: "Al-Kafi",
          volume: 2,
          page: 468,
          chapterUr: "باب أن الدعاء سلاح المؤمن",
          chapterEn: "Chapter: Supplication is the believer's weapon",
          hadithNumber: "1",
        },
        exactArabic:
          "الدعاء سلاح المؤمن وعمود الدين ونور السماوات والأرض.",
        textVerified: true,
      },
    ],
  },
  {
    id: "dua-tanbih-2-237",
    topicIds: ["dua"],
    dossierPrimaryTextId: "dua-best-worship",
    attributedToUr: "رسول اکرمؐ",
    attributedToEn: "The Prophet",
    sourceTitleUr: "تنبیہ الخواطر",
    sourceTitleEn: "Tanbih al-Khawatir",
    citedReferenceUr: "تنبیہ الخواطر، ج2، ص237۔",
    citedReferenceEn: "Tanbih al-Khawatir, vol. 2, p. 237.",
    sourceUrl: "https://al-islam.org/mizan-al-hikmah-scale-wisdom/supplication",
    candidateArabic:
      "أفضَلُ العِبادَةِ الدُّعاءُ، فإذا أذِنَ اللهُ لِلعَبدِ في الدُّعاءِ فَتَحَ لَهُ بابَ الرَّحمَةِ.",
    status: "pending-verification",
    witnesses: [],
    verificationNote:
      "Citation is preserved from the existing dossier. Direct source verification is still required before this can be shown as an exact quotation.",
  },
  {
    id: "dua-kafi-467-8",
    topicIds: ["dua"],
    dossierPrimaryTextId: "dua-beloved-action",
    attributedToUr: "امیرالمومنینؑ",
    attributedToEn: "Imam Ali",
    sourceTitleUr: "الکافی",
    sourceTitleEn: "Al-Kafi",
    citedReferenceUr: "الکافی، ج2، ص467، ح8۔",
    citedReferenceEn: "Al-Kafi, vol. 2, p. 467, hadith 8.",
    sourceUrl:
      "https://najafdesertlibrary.com/book/%D8%A7%D9%84%D9%83%D8%A7%D9%81%D9%8a/v/2/p/467",
    candidateArabic:
      "أحَبُّ الأعمالِ إلى اللهِ عزَّ وجلَّ في الأرضِ الدُّعاءُ.",
    status: "verified",
    exactArabic:
      "أحب الأعمال إلى الله عز وجل في الأرض الدعاء وأفضل العبادة العفاف، قال: وكان أمير المؤمنين عليه السلام رجلا دعاء.",
    verifiedReferenceUr: "الکافی، ج2، ص467–468، ح8۔",
    verifiedReferenceEn: "Al-Kafi, vol. 2, pp. 467–468, hadith 8.",
    verifiedSourceUrl:
      "https://najafdesertlibrary.com/book/%D8%A7%D9%84%D9%83%D8%A7%D9%81%D9%8a/v/2/p/467",
    verificationWitnessId: "kafi-najaf-467-468-8",
    witnesses: [
      {
        id: "kafi-najaf-467-468-8",
        role: "verification-source",
        sourceTitleUr: "الکافی",
        sourceTitleEn: "Al-Kafi",
        sourceUrl:
          "https://najafdesertlibrary.com/book/%D8%A7%D9%84%D9%83%D8%A7%D9%81%D9%8a/v/2/p/467",
        citation: {
          bookUr: "الکافی",
          bookEn: "Al-Kafi",
          volume: 2,
          page: 467,
          chapterUr: "باب فضل الدعاء والحث عليه",
          chapterEn: "Chapter on the merit of supplication and encouragement toward it",
          hadithNumber: "8",
        },
        exactArabic:
          "أحب الأعمال إلى الله عز وجل في الأرض الدعاء وأفضل العبادة العفاف، قال: وكان أمير المؤمنين عليه السلام رجلا دعاء.",
        textVerified: true,
        note: "The narration begins on p. 467 and continues onto p. 468.",
      },
    ],
  },
  {
    id: "dua-kafi-468-7",
    topicIds: ["dua"],
    dossierPrimaryTextId: "dua-shield-believer",
    attributedToUr: "امیرالمومنینؑ",
    attributedToEn: "Imam Ali",
    sourceTitleUr: "الکافی",
    sourceTitleEn: "Al-Kafi",
    citedReferenceUr: "الکافی، ج2، ص468، ح7۔",
    citedReferenceEn: "Al-Kafi, vol. 2, p. 468, hadith 7.",
    sourceUrl:
      "https://najafdesertlibrary.com/book/%D8%A7%D9%84%D9%83%D8%A7%D9%81%D9%8a/v/2/p/468",
    candidateArabic: "الدُّعاءُ تُرسُ المُؤمِنِ.",
    status: "verified",
    exactArabic:
      "الدعاء ترس المؤمن ومتى تكثر قرع الباب يفتح لك.",
    verifiedReferenceUr: "الکافی، ج2، ص468، ح4۔",
    verifiedReferenceEn: "Al-Kafi, vol. 2, p. 468, hadith 4.",
    verifiedSourceUrl:
      "https://najafdesertlibrary.com/book/%D8%A7%D9%84%D9%83%D8%A7%D9%81%D9%8a/v/2/p/468",
    verificationWitnessId: "kafi-najaf-468-4",
    witnesses: [
      {
        id: "kafi-najaf-468-4",
        role: "verification-source",
        sourceTitleUr: "الکافی",
        sourceTitleEn: "Al-Kafi",
        sourceUrl:
          "https://najafdesertlibrary.com/book/%D8%A7%D9%84%D9%83%D8%A7%D9%81%D9%8a/v/2/p/468",
        citation: {
          bookUr: "الکافی",
          bookEn: "Al-Kafi",
          volume: 2,
          page: 468,
          chapterUr: "باب أن الدعاء سلاح المؤمن",
          chapterEn: "Chapter: Supplication is the believer's weapon",
          hadithNumber: "4",
        },
        exactArabic:
          "الدعاء ترس المؤمن ومتى تكثر قرع الباب يفتح لك.",
        textVerified: true,
        note: "Direct source check corrects the dossier's hadith number from 7 to 4 and restores the omitted second clause.",
      },
    ],
  },
  {
    id: "dua-kafi-466-3",
    topicIds: ["dua"],
    dossierPrimaryTextId: "dua-station-through-asking",
    attributedToUr: "امام صادقؑ",
    attributedToEn: "Imam al-Sadiq",
    sourceTitleUr: "الکافی",
    sourceTitleEn: "Al-Kafi",
    citedReferenceUr: "الکافی، ج2، ص466، ح3۔",
    citedReferenceEn: "Al-Kafi, vol. 2, p. 466, hadith 3.",
    sourceUrl:
      "https://najafdesertlibrary.com/book/%D8%A7%D9%84%D9%83%D8%A7%D9%81%D9%8a/v/2/p/466",
    candidateArabic:
      "يا مُيَسِّرُ، اُدعُ ولا تَقُلْ: إنَّ الأمرَ قَد فُرِغَ مِنهُ؛ إنَّ عِندَ اللهِ عزَّ وجلَّ مَنزِلَةً لا تُنالُ إلّا بِمَسألَةٍ.",
    status: "verified",
    exactArabic:
      "يا ميسر ادع ولا تقل: إن الامر قد فرغ منه، إن عند الله عز وجل منزلة لا تنال إلا بمسألة، ولو أن عبدا سد فاه ولم يسأل لم يعط شيئا فسل تعط، يا ميسر إنه ليس من باب يقرع إلا يوشك أن يفتح لصاحبه.",
    verifiedReferenceUr: "الکافی، ج2، ص466–467، ح3۔",
    verifiedReferenceEn: "Al-Kafi, vol. 2, pp. 466–467, hadith 3.",
    verifiedSourceUrl:
      "https://najafdesertlibrary.com/book/%D8%A7%D9%84%D9%83%D8%A7%D9%81%D9%8a/v/2/p/466",
    verificationWitnessId: "kafi-najaf-466-467-3",
    witnesses: [
      {
        id: "kafi-najaf-466-467-3",
        role: "verification-source",
        sourceTitleUr: "الکافی",
        sourceTitleEn: "Al-Kafi",
        sourceUrl:
          "https://najafdesertlibrary.com/book/%D8%A7%D9%84%D9%83%D8%A7%D9%81%D9%8a/v/2/p/466",
        citation: {
          bookUr: "الکافی",
          bookEn: "Al-Kafi",
          volume: 2,
          page: 466,
          chapterUr: "باب فضل الدعاء والحث عليه",
          chapterEn: "Chapter on the merit of supplication and encouragement toward it",
          hadithNumber: "3",
        },
        exactArabic:
          "يا ميسر ادع ولا تقل: إن الامر قد فرغ منه، إن عند الله عز وجل منزلة لا تنال إلا بمسألة، ولو أن عبدا سد فاه ولم يسأل لم يعط شيئا فسل تعط، يا ميسر إنه ليس من باب يقرع إلا يوشك أن يفتح لصاحبه.",
        textVerified: true,
        note: "The narration begins on p. 466 and continues onto p. 467.",
      },
    ],
  },

  {
    id: "parents-risalat-mother",
    topicIds: ["parents-barsi"],
    dossierPrimaryTextId: "risalat-mother",
    attributedToUr: "امام زین العابدینؑ",
    attributedToEn: "Imam Zayn al-Abidin",
    sourceTitleUr: "روضۃ الواعظین",
    sourceTitleEn: "Rawdat al-Wa'izin",
    citedReferenceUr:
      "رسالۃ الحقوق؛ روضۃ الواعظین، ج2، ص241، ح1032۔",
    citedReferenceEn:
      "Risalat al-Huquq; Rawdat al-Wa'izin, vol. 2, p. 241, hadith 1032.",
    sourceUrl:
      "https://najafdesertlibrary.com/book/%D8%B1%D9%88%D8%B6%D8%A9-%D8%A7%D9%84%D9%88%D8%A7%D8%B9%D8%B8%D9%8A%D9%86-%D9%88%D8%A8%D8%B5%D9%8A%D8%B1%D8%A9-%D8%A7%D9%84%D9%85%D8%AA%D8%B9%D8%B8%D9%8A%D9%86/v/2/p/241",
    candidateArabic:
      "وأما حق أمك أن تعلم أنها حملتك حيث لا يحتمل أحد أحدا، وأعطتك من ثمرة قلبها ما لا يعطي أحد أحدا، ووقتك بجميع جوارحها، ولم تبال أن تجوع وتطعمك، وتعطش وتسقيك، وتعرى وتكسوك، وتضحى وتظلك، وتهجر النوم لأجلك، ووقتك الحر والبرد لتكون لها، وأنك لا تطيق شكرها إلا بعون الله وتوفيقه.",
    status: "verified",
    exactArabic:
      "حق امك أن تعلم أنها حملتك حيث لا يحمل أحد أحدا، وأعطتك من ثمرة قلبها ما لا يعطي أحد أحدا، ووقتك بجميع جوارحها، ولم تبال أن تجوع وتطعمك، وتعطش وتسقيك، وتعرى وتكسوك، وتضحى وتظلك، وتهجر النوم لأجلك، ووقتك الحر والبرد لتكون لها، فإنك لا تطيق شكرها إلا بعون الله وتوفيقه.",
    verifiedReferenceUr:
      "روضۃ الواعظین، ج2، ص241، ح1032 — حقِ مادر۔",
    verifiedReferenceEn:
      "Rawdat al-Wa'izin, vol. 2, p. 241, hadith 1032 — right of the mother.",
    verifiedSourceUrl:
      "https://najafdesertlibrary.com/book/%D8%B1%D9%88%D8%B6%D8%A9-%D8%A7%D9%84%D9%88%D8%A7%D8%B9%D8%B8%D9%8A%D9%86-%D9%88%D8%A8%D8%B5%D9%8A%D8%B1%D8%A9-%D8%A7%D9%84%D9%85%D8%AA%D8%B9%D8%B8%D9%8A%D9%86/v/2/p/241",
    verificationWitnessId: "rawdat-2-241-1032",
    witnesses: [
      {
        id: "rawdat-2-241-1032",
        role: "verification-source",
        sourceTitleUr: "روضۃ الواعظین",
        sourceTitleEn: "Rawdat al-Wa'izin",
        sourceUrl:
          "https://najafdesertlibrary.com/book/%D8%B1%D9%88%D8%B6%D8%A9-%D8%A7%D9%84%D9%88%D8%A7%D8%B9%D8%B8%D9%8A%D9%86-%D9%88%D8%A8%D8%B5%D9%8A%D8%B1%D8%A9-%D8%A7%D9%84%D9%85%D8%AA%D8%B9%D8%B8%D9%8A%D9%86/v/2/p/241",
        citation: {
          bookUr: "روضۃ الواعظین",
          bookEn: "Rawdat al-Wa'izin",
          volume: 2,
          page: 241,
          chapterUr: "مجلس في ذكر وجوب برّ الوالدين وما يلزم الولد من حقوقهما",
          chapterEn: "On dutifulness to parents and their rights",
          hadithNumber: "1032",
        },
        exactArabic:
          "حق امك أن تعلم أنها حملتك حيث لا يحمل أحد أحدا، وأعطتك من ثمرة قلبها ما لا يعطي أحد أحدا، ووقتك بجميع جوارحها، ولم تبال أن تجوع وتطعمك، وتعطش وتسقيك، وتعرى وتكسوك، وتضحى وتظلك، وتهجر النوم لأجلك، ووقتك الحر والبرد لتكون لها، فإنك لا تطيق شكرها إلا بعون الله وتوفيقه. وأما حق أبيك فأن تعلم أنه أصلك، وأنك لولاه لم تكن فيما رأيت في نفسك مما يعجبك. واعلم أن أباك أصل النعمة عليك فيه، فاحمد الله واشكره على قدر ذلك، ولا قوة إلا بالله.",
        textVerified: true,
        note:
          "The page footnote notes a printed variant: «فمهما» in place of «فيما». This witness preserves the displayed page text.",
      },
    ],
  },
  {
    id: "parents-risalat-father",
    topicIds: ["parents-barsi"],
    dossierPrimaryTextId: "risalat-father",
    attributedToUr: "امام زین العابدینؑ",
    attributedToEn: "Imam Zayn al-Abidin",
    sourceTitleUr: "روضۃ الواعظین",
    sourceTitleEn: "Rawdat al-Wa'izin",
    citedReferenceUr:
      "رسالۃ الحقوق؛ روضۃ الواعظین، ج2، ص241، ح1032۔",
    citedReferenceEn:
      "Risalat al-Huquq; Rawdat al-Wa'izin, vol. 2, p. 241, hadith 1032.",
    sourceUrl:
      "https://najafdesertlibrary.com/book/%D8%B1%D9%88%D8%B6%D8%A9-%D8%A7%D9%84%D9%88%D8%A7%D8%B9%D8%B8%D9%8A%D9%86-%D9%88%D8%A8%D8%B5%D9%8A%D8%B1%D8%A9-%D8%A7%D9%84%D9%85%D8%AA%D8%B9%D8%B8%D9%8A%D9%86/v/2/p/241",
    candidateArabic:
      "وأما حق أبيك فأن تعلم أنه أصلك، وأنك لولاه لم تكن، فمهما رأيت من نفسك ما يعجبك فاعلم أن أباك أصل النعمة عليك فيه، فاحمد الله واشكره على قدر ذلك، ولا قوة إلا بالله.",
    status: "verified",
    exactArabic:
      "وأما حق أبيك فأن تعلم أنه أصلك، وأنك لولاه لم تكن فيما رأيت في نفسك مما يعجبك. واعلم أن أباك أصل النعمة عليك فيه، فاحمد الله واشكره على قدر ذلك، ولا قوة إلا بالله.",
    verifiedReferenceUr:
      "روضۃ الواعظین، ج2، ص241، ح1032 — حقِ پدر۔",
    verifiedReferenceEn:
      "Rawdat al-Wa'izin, vol. 2, p. 241, hadith 1032 — right of the father.",
    verifiedSourceUrl:
      "https://najafdesertlibrary.com/book/%D8%B1%D9%88%D8%B6%D8%A9-%D8%A7%D9%84%D9%88%D8%A7%D8%B9%D8%B8%D9%8A%D9%86-%D9%88%D8%A8%D8%B5%D9%8A%D8%B1%D8%A9-%D8%A7%D9%84%D9%85%D8%AA%D8%B9%D8%B8%D9%8A%D9%86/v/2/p/241",
    verificationWitnessId: "rawdat-2-241-1032",
    witnesses: [
      {
        id: "rawdat-2-241-1032",
        role: "verification-source",
        sourceTitleUr: "روضۃ الواعظین",
        sourceTitleEn: "Rawdat al-Wa'izin",
        sourceUrl:
          "https://najafdesertlibrary.com/book/%D8%B1%D9%88%D8%B6%D8%A9-%D8%A7%D9%84%D9%88%D8%A7%D8%B9%D8%B8%D9%8A%D9%86-%D9%88%D8%A8%D8%B5%D9%8A%D8%B1%D8%A9-%D8%A7%D9%84%D9%85%D8%AA%D8%B9%D8%B8%D9%8A%D9%86/v/2/p/241",
        citation: {
          bookUr: "روضۃ الواعظین",
          bookEn: "Rawdat al-Wa'izin",
          volume: 2,
          page: 241,
          chapterUr: "مجلس في ذكر وجوب برّ الوالدين وما يلزم الولد من حقوقهما",
          chapterEn: "On dutifulness to parents and their rights",
          hadithNumber: "1032",
        },
        exactArabic:
          "حق امك أن تعلم أنها حملتك حيث لا يحمل أحد أحدا، وأعطتك من ثمرة قلبها ما لا يعطي أحد أحدا، ووقتك بجميع جوارحها، ولم تبال أن تجوع وتطعمك، وتعطش وتسقيك، وتعرى وتكسوك، وتضحى وتظلك، وتهجر النوم لأجلك، ووقتك الحر والبرد لتكون لها، فإنك لا تطيق شكرها إلا بعون الله وتوفيقه. وأما حق أبيك فأن تعلم أنه أصلك، وأنك لولاه لم تكن فيما رأيت في نفسك مما يعجبك. واعلم أن أباك أصل النعمة عليك فيه، فاحمد الله واشكره على قدر ذلك، ولا قوة إلا بالله.",
        textVerified: true,
        note:
          "The displayed page reads «فيما» and notes «فمهما» as the printed variant. The record keeps the displayed witness text.",
      },
    ],
  },
  {
    id: "parents-rida-thank",
    topicIds: ["parents-barsi"],
    dossierPrimaryTextId: "rida-thank-parents",
    attributedToUr: "امام رضاؑ",
    attributedToEn: "Imam al-Ridha",
    sourceTitleUr: "الخصال",
    sourceTitleEn: "Al-Khisal",
    citedReferenceUr: "الخصال، ج1، ص156، ح196۔",
    citedReferenceEn: "Al-Khisal, vol. 1, p. 156, hadith 196.",
    sourceUrl:
      "https://al-islam.org/al-khisal-numeric-classification-traditions-characteristics-shaykh-saduq/part-3-three-numbered",
    candidateArabic:
      "إن الله عز وجل أمر بالشكر له وللوالدين، فمن لم يشكر والديه لم يشكر الله.",
    status: "verified",
    exactArabic:
      "وأمر بالشكر له وللوالدين، فمن لم يشكر والديه لم يشكر الله",
    verifiedReferenceUr: "الخصال، باب الثلاثة، ح3-196۔",
    verifiedReferenceEn: "Al-Khisal, Part Three, hadith 3-196.",
    verifiedSourceUrl:
      "https://al-islam.org/al-khisal-numeric-classification-traditions-characteristics-shaykh-saduq/part-3-three-numbered",
    verificationWitnessId: "khisal-3-196",
    witnesses: [
      {
        id: "khisal-3-196",
        role: "verification-source",
        sourceTitleUr: "الخصال",
        sourceTitleEn: "Al-Khisal",
        sourceUrl:
          "https://al-islam.org/al-khisal-numeric-classification-traditions-characteristics-shaykh-saduq/part-3-three-numbered",
        citation: {
          bookUr: "الخصال",
          bookEn: "Al-Khisal",
          chapterUr: "باب الثلاثة",
          chapterEn: "Three-numbered characteristics",
          hadithNumber: "3-196",
        },
        exactArabic:
          "إن الله عز وجل أمر بثلاثة مقرون بها ثلاثة اخرى: أمر بالصلاة والزكاة فمن صلى ولم يزك لم تقبل منه صلاته، وأمر بالشكر له وللوالدين، فمن لم يشكر والديه لم يشكر الله، وأمر باتقاء الله وصلة الرحم، فمن لم يصل رحمه لم يتق الله عز وجل.",
        textVerified: true,
        note:
          "The record displays the parents-related clause as a verbatim excerpt from the directly checked Al-Khisal narration.",
      },
    ],
  },
  {
    id: "parents-kafi-157-1-kindness",
    topicIds: ["parents-barsi"],
    dossierPrimaryTextId: "sadiq-ihsan-before-asking",
    attributedToUr: "امام صادقؑ",
    attributedToEn: "Imam al-Sadiq",
    sourceTitleUr: "الکافی",
    sourceTitleEn: "Al-Kafi",
    citedReferenceUr: "الکافی، ج2، ص157، ح1۔",
    citedReferenceEn: "Al-Kafi, vol. 2, p. 157, hadith 1.",
    sourceUrl:
      "https://najafdesertlibrary.com/book/%D8%A7%D9%84%D9%83%D8%A7%D9%81%D9%8A/v/2/p/157",
    candidateArabic:
      "الإحسان أن تحسن صحبتهما، وألا تكلفهما أن يسألاك شيئا مما يحتاجان إليه وإن كانا مستغنيين.",
    status: "verified",
    exactArabic:
      "الاحسان أن تحسن صحبتهما وأن لا تكلفهما أن يسألاك شيئا مما يحتاجان إليه وإن كانا مستغنيين",
    verifiedReferenceUr: "الکافی، ج2، ص157–158، ح1۔",
    verifiedReferenceEn: "Al-Kafi, vol. 2, pp. 157–158, hadith 1.",
    verifiedSourceUrl:
      "https://najafdesertlibrary.com/book/%D8%A7%D9%84%D9%83%D8%A7%D9%81%D9%8A/v/2/p/157",
    verificationWitnessId: "kafi-2-157-158-1",
    witnesses: [
      {
        id: "kafi-2-157-158-1",
        role: "verification-source",
        sourceTitleUr: "الکافی",
        sourceTitleEn: "Al-Kafi",
        sourceUrl:
          "https://najafdesertlibrary.com/book/%D8%A7%D9%84%D9%83%D8%A7%D9%81%D9%8A/v/2/p/157",
        citation: {
          bookUr: "الکافی",
          bookEn: "Al-Kafi",
          volume: 2,
          page: 157,
          chapterUr: "باب البر بالوالدين",
          chapterEn: "Chapter on dutifulness to parents",
          hadithNumber: "1",
        },
        exactArabic:
          "الاحسان أن تحسن صحبتهما وأن لا تكلفهما أن يسألاك شيئا مما يحتاجان إليه وإن كانا مستغنيين أليس يقول الله عز وجل: لن تنالوا البر حتى تنفقوا مما تحبون قال: ثم قال أبو عبد الله عليه السلام وأما قول الله عز وجل: إما يبلغن عندك الكبر أحدهما أو كلاهما فلا تقل لهما أف ولا تنهرهما قال: إن أضجراك فلا تقل لهما: أف، ولا تنهرهما إن ضرباك، قال: وقل لهما قولا كريما قال: إن ضرباك فقل لهما: غفر الله لكما، فذلك منك قول كريم، قال واخفض لهما جناح الذل من الرحمة قال: لا تملأ عينيك من النظر إليهما إلا برحمة ورقة ولا ترفع صوتك فوق أصواتهما ولا يدك فوق أيديهما ولا تقدم قدامهما.",
        textVerified: true,
        note: "Hadith 1 begins on p. 157 and continues on p. 158.",
      },
    ],
  },
  {
    id: "parents-kafi-157-158-1-mercy",
    topicIds: ["parents-barsi"],
    dossierPrimaryTextId: "sadiq-mercy-voice-steps",
    attributedToUr: "امام صادقؑ",
    attributedToEn: "Imam al-Sadiq",
    sourceTitleUr: "الکافی",
    sourceTitleEn: "Al-Kafi",
    citedReferenceUr: "الکافی، ج2، ص157–158، ح1۔",
    citedReferenceEn: "Al-Kafi, vol. 2, pp. 157–158, hadith 1.",
    sourceUrl:
      "https://najafdesertlibrary.com/book/%D8%A7%D9%84%D9%83%D8%A7%D9%81%D9%8a/v/2/p/158",
    candidateArabic:
      "لا تملأ عينيك من النظر إليهما إلا برحمة ورقة، ولا ترفع صوتك فوق أصواتهما، ولا يدك فوق أيديهما، ولا تقدم قدامهما.",
    status: "verified",
    exactArabic:
      "لا تملأ عينيك من النظر إليهما إلا برحمة ورقة ولا ترفع صوتك فوق أصواتهما ولا يدك فوق أيديهما ولا تقدم قدامهما.",
    verifiedReferenceUr: "الکافی، ج2، ص158، ح1۔",
    verifiedReferenceEn: "Al-Kafi, vol. 2, p. 158, hadith 1.",
    verifiedSourceUrl:
      "https://najafdesertlibrary.com/book/%D8%A7%D9%84%D9%83%D8%A7%D9%81%D9%8A/v/2/p/158",
    verificationWitnessId: "kafi-2-157-158-1",
    witnesses: [
      {
        id: "kafi-2-157-158-1",
        role: "verification-source",
        sourceTitleUr: "الکافی",
        sourceTitleEn: "Al-Kafi",
        sourceUrl:
          "https://najafdesertlibrary.com/book/%D8%A7%D9%84%D9%83%D8%A7%D9%81%D9%8A/v/2/p/158",
        citation: {
          bookUr: "الکافی",
          bookEn: "Al-Kafi",
          volume: 2,
          page: 158,
          chapterUr: "باب البر بالوالدين",
          chapterEn: "Chapter on dutifulness to parents",
          hadithNumber: "1",
        },
        exactArabic:
          "الاحسان أن تحسن صحبتهما وأن لا تكلفهما أن يسألاك شيئا مما يحتاجان إليه وإن كانا مستغنيين أليس يقول الله عز وجل: لن تنالوا البر حتى تنفقوا مما تحبون قال: ثم قال أبو عبد الله عليه السلام وأما قول الله عز وجل: إما يبلغن عندك الكبر أحدهما أو كلاهما فلا تقل لهما أف ولا تنهرهما قال: إن أضجراك فلا تقل لهما: أف، ولا تنهرهما إن ضرباك، قال: وقل لهما قولا كريما قال: إن ضرباك فقل لهما: غفر الله لكما، فذلك منك قول كريم، قال واخفض لهما جناح الذل من الرحمة قال: لا تملأ عينيك من النظر إليهما إلا برحمة ورقة ولا ترفع صوتك فوق أصواتهما ولا يدك فوق أيديهما ولا تقدم قدامهما.",
        textVerified: true,
        note: "This verified excerpt is the closing clause of hadith 1 spanning pp. 157–158.",
      },
    ],
  },
  {
    id: "parents-three-rights",
    topicIds: ["parents-barsi"],
    dossierPrimaryTextId: "sadiq-three-parental-rights",
    attributedToUr: "امام صادقؑ",
    attributedToEn: "Imam al-Sadiq",
    sourceTitleUr: "تحف العقول",
    sourceTitleEn: "Tuhaf al-Uqul",
    citedReferenceUr: "تحف العقول، ص322۔",
    citedReferenceEn: "Tuhaf al-Uqul, p. 322.",
    sourceUrl: "https://ablibrary.net/book_content/b/6129/333",
    candidateArabic:
      "يجب للوالدين على الولد ثلاثة أشياء: شكرهما على كل حال، وطاعتهما فيما يأمرانه وينهيانه عنه في غير معصية الله، ونصيحتهما في السر والعلانية.",
    status: "verified",
    exactArabic:
      "ويجب للوالدين على الولد ثلاثة أشياء : شكرهما على كل حال . وطاعتهما فيما يأمرانه وينهيانه عنه في غير معصية الله . ونصيحتهما في السر والعلانية .",
    verifiedReferenceUr: "تحف العقول، ص322۔",
    verifiedReferenceEn: "Tuhaf al-Uqul, p. 322.",
    verifiedSourceUrl: "https://ablibrary.net/book_content/b/6129/333",
    verificationWitnessId: "tuhaf-322-parent-rights",
    witnesses: [
      {
        id: "tuhaf-322-parent-rights",
        role: "verification-source",
        sourceTitleUr: "تحف العقول",
        sourceTitleEn: "Tuhaf al-Uqul",
        sourceUrl: "https://ablibrary.net/book_content/b/6129/333",
        citation: {
          bookUr: "تحف العقول",
          bookEn: "Tuhaf al-Uqul",
          page: 322,
        },
        exactArabic:
          "ويجب للوالدين على الولد ثلاثة أشياء : شكرهما على كل حال . وطاعتهما فيما يأمرانه وينهيانه عنه في غير معصية الله . ونصيحتهما في السر والعلانية .",
        textVerified: true,
      },
    ],
  },
  {
    id: "parents-kafi-5-554-5",
    topicIds: ["parents-barsi"],
    dossierPrimaryTextId: "sadiq-generational-birr",
    attributedToUr: "امام صادقؑ",
    attributedToEn: "Imam al-Sadiq",
    sourceTitleUr: "الکافی",
    sourceTitleEn: "Al-Kafi",
    citedReferenceUr: "الکافی، ج5، ص554، ح5۔",
    citedReferenceEn: "Al-Kafi, vol. 5, p. 554, hadith 5.",
    sourceUrl:
      "https://najafdesertlibrary.com/book/%D8%A7%D9%84%D9%83%D8%A7%D9%81%D9%8A/v/5/p/554",
    candidateArabic: "بروا آباءكم يبركم أبناؤكم.",
    status: "verified",
    exactArabic:
      "بروا آبائكم يبركم أبناؤكم وعفوا عن نساء الناس تعف نساؤكم.",
    verifiedReferenceUr: "الکافی، ج5، ص554، ح5۔",
    verifiedReferenceEn: "Al-Kafi, vol. 5, p. 554, hadith 5.",
    verifiedSourceUrl:
      "https://najafdesertlibrary.com/book/%D8%A7%D9%84%D9%83%D8%A7%D9%81%D9%8A/v/5/p/554",
    verificationWitnessId: "kafi-5-554-5",
    witnesses: [
      {
        id: "kafi-5-554-5",
        role: "verification-source",
        sourceTitleUr: "الکافی",
        sourceTitleEn: "Al-Kafi",
        sourceUrl:
          "https://najafdesertlibrary.com/book/%D8%A7%D9%84%D9%83%D8%A7%D9%81%D9%8A/v/5/p/554",
        citation: {
          bookUr: "الکافی",
          bookEn: "Al-Kafi",
          volume: 5,
          page: 554,
          chapterUr: "باب نوادر",
          chapterEn: "Miscellaneous narrations",
          hadithNumber: "5",
        },
        exactArabic:
          "بروا آبائكم يبركم أبناؤكم وعفوا عن نساء الناس تعف نساؤكم.",
        textVerified: true,
      },
    ],
  },
  {
    id: "parents-birr-after-death",
    topicIds: ["parents-barsi"],
    dossierPrimaryTextId: "birr-after-death",
    attributedToUr: "رسول اکرمؐ",
    attributedToEn: "The Prophet",
    sourceTitleUr: "بحار الانوار",
    sourceTitleEn: "Bihar al-Anwar",
    citedReferenceUr: "بحار الانوار، ج71، ص88۔",
    citedReferenceEn: "Bihar al-Anwar, vol. 71, p. 88.",
    sourceUrl:
      "https://najafdesertlibrary.com/book/%D8%A8%D8%AD%D8%A7%D8%B1-%D8%A7%D9%84%D8%A3%D9%86%D9%88%D8%A7%D8%B1/v/71/p/88",
    candidateArabic:
      "سيد الأبرار يوم القيامة، رجل بر والديه بعد موتهما.",
    status: "verified",
    exactArabic:
      "سيد الأبرار يوم القيامة رجل بر والديه بعد موتهما.",
    verifiedReferenceUr:
      "بحار الانوار، ج71، ص88؛ منقول از کتاب الامامة والتبصرة۔",
    verifiedReferenceEn:
      "Bihar al-Anwar, vol. 71, p. 88; quoting Kitab al-Imama wa al-Tabsira.",
    verifiedSourceUrl:
      "https://najafdesertlibrary.com/book/%D8%A8%D8%AD%D8%A7%D8%B1-%D8%A7%D9%84%D8%A3%D9%86%D9%88%D8%A7%D8%B1/v/71/p/88",
    verificationWitnessId: "bihar-71-88-birr-after-death",
    witnesses: [
      {
        id: "bihar-71-88-birr-after-death",
        role: "verification-source",
        sourceTitleUr: "بحار الانوار",
        sourceTitleEn: "Bihar al-Anwar",
        sourceUrl:
          "https://najafdesertlibrary.com/book/%D8%A8%D8%AD%D8%A7%D8%B1-%D8%A7%D9%84%D8%A3%D9%86%D9%88%D8%A7%D8%B1/v/71/p/88",
        citation: {
          bookUr: "بحار الانوار",
          bookEn: "Bihar al-Anwar",
          volume: 71,
          page: 88,
          chapterUr: "حق الوالد على الولد، وحق الولد على الوالد",
          chapterEn: "The rights of parent and child",
        },
        exactArabic:
          "سيد الأبرار يوم القيامة رجل بر والديه بعد موتهما.",
        textVerified: true,
        note:
          "The Bihar page explicitly attributes this cluster to Kitab al-Imama wa al-Tabsira. The old dossier citation to vol. 74, p. 86 did not match the direct source check and is corrected separately.",
      },
    ],
  },

  {
    id: "imamate-ghurar-1095",
    topicIds: ["imamate"],
    dossierPrimaryTextId: "imamate-system-community",
    attributedToUr: "امیرالمومنینؑ",
    attributedToEn: "Imam Ali",
    sourceTitleUr: "غرر الحکم",
    sourceTitleEn: "Ghurar al-Hikam",
    citedReferenceUr: "غرر الحکم، ح1095۔",
    citedReferenceEn: "Ghurar al-Hikam, no. 1095.",
    sourceUrl: "https://ablibrary.net/book_content/b/3732/115?lang=ar",
    candidateArabic: "الإمامَةُ نِظامُ الاُمَّةِ.",
    status: "verified",
    exactArabic: "الإمامة نظام الأمة",
    verifiedReferenceUr: "غرر الحکم، ح1095؛ میزان الحکمہ، ج1، ص115۔",
    verifiedReferenceEn: "Ghurar al-Hikam, no. 1095; Mizan al-Hikmah, vol. 1, p. 115.",
    verifiedSourceUrl: "https://ablibrary.net/book_content/b/3732/115?lang=ar",
    verificationWitnessId: "mizan-1-115-ghurar-1095",
    witnesses: [
      {
        id: "mizan-1-115-ghurar-1095",
        role: "verification-source",
        sourceTitleUr: "میزان الحکمہ",
        sourceTitleEn: "Mizan al-Hikmah",
        sourceUrl: "https://ablibrary.net/book_content/b/3732/115?lang=ar",
        citation: {
          bookUr: "میزان الحکمہ",
          bookEn: "Mizan al-Hikmah",
          volume: 1,
          page: 115,
          chapterUr: "الامامة نظام الأمة",
          chapterEn: "Imamate as the order of the community",
        },
        exactArabic: "الإمامة نظام الأمة",
        textVerified: true,
        note: "The page explicitly cites Ghurar al-Hikam no. 1095 for this wording.",
      },
    ],
  },
  {
    id: "imamate-kafi-2-18-1",
    topicIds: ["imamate"],
    dossierPrimaryTextId: "imamate-five-pillars-wilayah",
    attributedToUr: "امام باقرؑ",
    attributedToEn: "Imam al-Baqir",
    sourceTitleUr: "الکافی",
    sourceTitleEn: "Al-Kafi",
    citedReferenceUr: "الکافی، ج2، ص18، ح1۔",
    citedReferenceEn: "Al-Kafi, vol. 2, p. 18, hadith 1.",
    sourceUrl: "https://ablibrary.net/book_content/b/3250/18",
    candidateArabic:
      "بُنِيَ الإسلامُ على خَمْسٍ: عَلى الصَّلاةِ، والزَّكاةِ، والصَّومِ، والحَجِّ، والوَلايةِ، ولَمْ يُنادَ بِشَيْءٍ كَما نُودِيَ بالوَلايةِ.",
    status: "verified",
    exactArabic:
      "بني الاسلام على خمس : على الصلاة والزكاة والصوم والحج والولاية ولم يناد بشئ كما نودي بالولاية",
    verifiedReferenceUr: "الکافی، ج2، ص18، ح1۔",
    verifiedReferenceEn: "Al-Kafi, vol. 2, p. 18, hadith 1.",
    verifiedSourceUrl: "https://ablibrary.net/book_content/b/3250/18",
    verificationWitnessId: "kafi-2-18-1",
    witnesses: [
      {
        id: "kafi-2-18-1",
        role: "verification-source",
        sourceTitleUr: "الکافی",
        sourceTitleEn: "Al-Kafi",
        sourceUrl: "https://ablibrary.net/book_content/b/3250/18",
        citation: {
          bookUr: "الکافی",
          bookEn: "Al-Kafi",
          volume: 2,
          page: 18,
          chapterUr: "باب دعائم الاسلام",
          chapterEn: "Chapter on the pillars of Islam",
          hadithNumber: "1",
        },
        exactArabic:
          "بني الاسلام على خمس : على الصلاة والزكاة والصوم والحج والولاية ولم يناد بشئ كما نودي بالولاية",
        textVerified: true,
        note: "Direct source check corrects the old dossier reference from vol. 3, p. 18, hadith 2 to vol. 2, p. 18, hadith 1.",
      },
    ],
  },
  {
    id: "imamate-kafi-1-175-2",
    topicIds: ["imamate"],
    dossierPrimaryTextId: "imamate-ibrahim-rank",
    attributedToUr: "امام صادقؑ",
    attributedToEn: "Imam al-Sadiq",
    sourceTitleUr: "الکافی",
    sourceTitleEn: "Al-Kafi",
    citedReferenceUr: "الکافی، ج1، ص175، ح2۔",
    citedReferenceEn: "Al-Kafi, vol. 1, p. 175, hadith 2.",
    sourceUrl: "https://ablibrary.net/book_content/b/3249/223",
    candidateArabic:
      "إنَّ اللهَ تباركَ وتعالى اتَّخَذَ إبراهيمَ عَبداً قَبلَ أن يَتَّخِذَهُ نَبِيّاً ... واتَّخَذَهُ خَليلاً قَبلَ أن يَجعَلَهُ إماماً ... قالَ: إنّي جاعِلُكَ لِلنّاسِ إماماً.",
    status: "verified",
    exactArabic:
      "إن الله تبارك وتعالى اتخذ إبراهيم عبدا قبل أن يتخذه نبيا وإن الله اتخذه نبيا قبل أن يتخذه رسولا وإن الله اتخذه رسولا قبل أن يتخذه خليلا وإن الله اتخذه خليلا قبل أن يجعله إماما ، فلما جمع له الأشياء قال : إني جاعلك للناس إماما",
    verifiedReferenceUr: "الکافی، ج1، ص175، ح2۔",
    verifiedReferenceEn: "Al-Kafi, vol. 1, p. 175, hadith 2.",
    verifiedSourceUrl: "https://ablibrary.net/book_content/b/3249/223",
    verificationWitnessId: "kafi-1-175-2",
    witnesses: [
      {
        id: "kafi-1-175-2",
        role: "verification-source",
        sourceTitleUr: "الکافی",
        sourceTitleEn: "Al-Kafi",
        sourceUrl: "https://ablibrary.net/book_content/b/3249/223",
        citation: {
          bookUr: "الکافی",
          bookEn: "Al-Kafi",
          volume: 1,
          page: 175,
          hadithNumber: "2",
        },
        exactArabic:
          "إن الله تبارك وتعالى اتخذ إبراهيم عبدا قبل أن يتخذه نبيا وإن الله اتخذه نبيا قبل أن يتخذه رسولا وإن الله اتخذه رسولا قبل أن يتخذه خليلا وإن الله اتخذه خليلا قبل أن يجعله إماما ، فلما جمع له الأشياء قال : إني جاعلك للناس إماما",
        textVerified: true,
        note: "The source continues with Abraham's question about his progeny and Qur'an 2:124.",
      },
    ],
  },
  {
    id: "imamate-kafi-1-178-2",
    topicIds: ["imamate"],
    dossierPrimaryTextId: "imamate-earth-never-empty",
    attributedToUr: "امام صادقؑ",
    attributedToEn: "Imam al-Sadiq",
    sourceTitleUr: "الکافی",
    sourceTitleEn: "Al-Kafi",
    citedReferenceUr: "الکافی، ج1، ص178، ح2۔",
    citedReferenceEn: "Al-Kafi, vol. 1, p. 178, hadith 2.",
    sourceUrl: "https://ablibrary.net/book_content/b/3249/226",
    candidateArabic:
      "إنَّ الأرضَ لا تَخْلو إلّا وَفيها إمامٌ، كَيما إن زادَ المؤمنونَ شيئاً رَدَّهُم، وإن نَقَصوا شيئاً أتَمَّهُ لَهُم.",
    status: "verified",
    exactArabic:
      "إن الأرض لا تخلو إلا وفيها إمام ، كيما إن زاد المؤمنون شيئا ردهم ، وإن نقصوا شيئا أتمه لهم",
    verifiedReferenceUr: "الکافی، ج1، ص178، ح2۔",
    verifiedReferenceEn: "Al-Kafi, vol. 1, p. 178, hadith 2.",
    verifiedSourceUrl: "https://ablibrary.net/book_content/b/3249/226",
    verificationWitnessId: "kafi-1-178-2",
    witnesses: [
      {
        id: "kafi-1-178-2",
        role: "verification-source",
        sourceTitleUr: "الکافی",
        sourceTitleEn: "Al-Kafi",
        sourceUrl: "https://ablibrary.net/book_content/b/3249/226",
        citation: {
          bookUr: "الکافی",
          bookEn: "Al-Kafi",
          volume: 1,
          page: 178,
          chapterUr: "باب أن الأرض لا تخلو من حجة",
          chapterEn: "Chapter: the earth is never without a proof",
          hadithNumber: "2",
        },
        exactArabic:
          "إن الأرض لا تخلو إلا وفيها إمام ، كيما إن زاد المؤمنون شيئا ردهم ، وإن نقصوا شيئا أتمه لهم",
        textVerified: true,
      },
    ],
  },
  {
    id: "imamate-mahasin-recognition",
    topicIds: ["imamate"],
    dossierPrimaryTextId: "imamate-know-your-imam",
    attributedToUr: "رسول اکرمؐ",
    attributedToEn: "The Prophet",
    sourceTitleUr: "المحاسن",
    sourceTitleEn: "Al-Mahasin",
    citedReferenceUr: "المحاسن، ج1، ص251، ح474؛ بحار الانوار، ج23، ص76، ح1۔",
    citedReferenceEn:
      "Al-Mahasin, vol. 1, p. 251, hadith 474; Bihar al-Anwar, vol. 23, p. 76, hadith 1.",
    sourceUrl: "https://ablibrary.net/book_content/b/1449/105",
    candidateArabic:
      "مَن ماتَ وهُوَ لا يَعرِفُ إمامَهُ ماتَ مِيتَةً جاهِلِيَّةً.",
    status: "verified",
    exactArabic:
      "من مات وهو لا يعرف إمامه مات ميتة جاهلية",
    verifiedReferenceUr:
      "المحاسن، ج1، ص251، ح474؛ بحار الانوار، ج23، ص76، ح1۔",
    verifiedReferenceEn:
      "Al-Mahasin, vol. 1, p. 251, hadith 474; Bihar al-Anwar, vol. 23, p. 76, hadith 1.",
    verifiedSourceUrl: "https://ablibrary.net/book_content/b/1449/105",
    verificationWitnessId: "ahl-al-bayt-105-mahasin-474",
    witnesses: [
      {
        id: "ahl-al-bayt-105-mahasin-474",
        role: "verification-source",
        sourceTitleUr: "اہل البیت فی الکتاب والسنۃ",
        sourceTitleEn: "Ahl al-Bayt fi al-Kitab wa al-Sunnah",
        sourceUrl: "https://ablibrary.net/book_content/b/1449/105",
        citation: {
          bookUr: "اہل البیت فی الکتاب والسنۃ",
          bookEn: "Ahl al-Bayt fi al-Kitab wa al-Sunnah",
          page: 105,
          hadithNumber: "141",
        },
        exactArabic:
          "من مات وهو لا يعرف إمامه مات ميتة جاهلية",
        textVerified: true,
        note:
          "The page explicitly traces this wording to Al-Mahasin 1/251/474 and also references Bihar al-Anwar 23/76.",
      },
    ],
  },
  {
    id: "ismah-ghurar-8469",
    topicIds: ["ismah"],
    dossierPrimaryTextId: "ismah-safe-from-error",
    attributedToUr: "امیرالمومنینؑ",
    attributedToEn: "Imam Ali",
    sourceTitleUr: "غرر الحکم",
    sourceTitleEn: "Ghurar al-Hikam",
    citedReferenceUr: "غرر الحکم، ح8469۔",
    citedReferenceEn: "Ghurar al-Hikam, no. 8469.",
    sourceUrl: "https://ablibrary.net/book_content/b/8814/318?lang=ar",
    candidateArabic: "مَن اُلهِمَ العِصمَةَ أمِنَ الزَّلَلَ.",
    status: "verified",
    exactArabic: "مَنْ أُلْهِمَ الْعِصْمَةَ أَمِنَ الزَّلَلَ",
    verifiedReferenceUr:
      "غرر الحکم، ح8469؛ تصنیف غرر الحکم ودرر الکلم، ص318، ش7338۔",
    verifiedReferenceEn:
      "Ghurar al-Hikam, no. 8469; Tasnif Ghurar al-Hikam wa Durar al-Kalim, p. 318, no. 7338.",
    verifiedSourceUrl: "https://ablibrary.net/book_content/b/8814/318?lang=ar",
    verificationWitnessId: "tasnif-ghurar-318-7338",
    witnesses: [
      {
        id: "tasnif-ghurar-318-7338",
        role: "verification-source",
        sourceTitleUr: "تصنیف غرر الحکم ودرر الکلم",
        sourceTitleEn: "Tasnif Ghurar al-Hikam wa Durar al-Kalim",
        sourceUrl: "https://ablibrary.net/book_content/b/8814/318?lang=ar",
        citation: {
          bookUr: "تصنیف غرر الحکم ودرر الکلم",
          bookEn: "Tasnif Ghurar al-Hikam wa Durar al-Kalim",
          page: 318,
          chapterUr: "فصل دوم: العصمة",
          chapterEn: "Chapter on infallibility",
          hadithNumber: "7338",
        },
        exactArabic: "مَنْ أُلْهِمَ الْعِصْمَةَ أَمِنَ الزَّلَلَ",
        textVerified: true,
        note: "The classified edition preserves the saying and its Ghurar source location.",
      },
    ],
  },
  {
    id: "ismah-maani-132-1",
    topicIds: ["ismah"],
    dossierPrimaryTextId: "ismah-imam-quran",
    attributedToUr: "امام زین العابدینؑ",
    attributedToEn: "Imam Zayn al-Abidin",
    sourceTitleUr: "معانی الاخبار",
    sourceTitleEn: "Ma'ani al-Akhbar",
    citedReferenceUr: "معانی الاخبار، ص132، ح1۔",
    citedReferenceEn: "Ma'ani al-Akhbar, p. 132, hadith 1.",
    sourceUrl: "https://ablibrary.net/book_content/b/3540/226",
    candidateArabic:
      "الإمامُ مِنّا لا يَكونُ إلّا مَعصوماً ... هُوَ المُعتَصِمُ بِحَبلِ اللهِ، وحَبلُ اللهِ هُوَ القُرآنُ ... والإمامُ يَهدي إلَى القُرآنِ، والقُرآنُ يَهدي إلَى الإمامِ.",
    status: "verified",
    exactArabic:
      "الامام منا لا يكون إلا معصوما وليست العصمة في ظاهر الخلقة فيعرف بها ولذلك لا يكون إلا منصوصا . فقيل له : يا ابن رسول الله فما معنى المعصوم ؟ فقال : هو المعتصم بحبل الله ، وحبل الله هو القرآن لا يفترقان إلى يوم القيامة ، والامام يهدي إلى القرآن والقرآن يهدي إلى الامام",
    verifiedReferenceUr: "معانی الاخبار، ص132، ح1۔",
    verifiedReferenceEn: "Ma'ani al-Akhbar, p. 132, hadith 1.",
    verifiedSourceUrl: "https://ablibrary.net/book_content/b/3540/226",
    verificationWitnessId: "maani-132-1",
    witnesses: [
      {
        id: "maani-132-1",
        role: "verification-source",
        sourceTitleUr: "معانی الاخبار",
        sourceTitleEn: "Ma'ani al-Akhbar",
        sourceUrl: "https://ablibrary.net/book_content/b/3540/226",
        citation: {
          bookUr: "معانی الاخبار",
          bookEn: "Ma'ani al-Akhbar",
          page: 132,
          chapterUr: "باب معنى عصمة الامام",
          chapterEn: "Chapter on the meaning of the Imam's infallibility",
          hadithNumber: "1",
        },
        exactArabic:
          "الامام منا لا يكون إلا معصوما وليست العصمة في ظاهر الخلقة فيعرف بها ولذلك لا يكون إلا منصوصا . فقيل له : يا ابن رسول الله فما معنى المعصوم ؟ فقال : هو المعتصم بحبل الله ، وحبل الله هو القرآن لا يفترقان إلى يوم القيامة ، والامام يهدي إلى القرآن والقرآن يهدي إلى الامام",
        textVerified: true,
      },
    ],
  },
  {
    id: "ismah-maani-132-2",
    topicIds: ["ismah"],
    dossierPrimaryTextId: "ismah-sadiq-definition",
    attributedToUr: "امام صادقؑ",
    attributedToEn: "Imam al-Sadiq",
    sourceTitleUr: "معانی الاخبار",
    sourceTitleEn: "Ma'ani al-Akhbar",
    citedReferenceUr: "معانی الاخبار، ص132، ح2۔",
    citedReferenceEn: "Ma'ani al-Akhbar, p. 132, hadith 2.",
    sourceUrl: "https://ablibrary.net/book_content/b/3540/226",
    candidateArabic:
      "المَعصومُ هُوَ المُمتَنِعُ بِاللهِ مِن جَميعِ مَحارِمِ اللهِ.",
    status: "verified",
    exactArabic:
      "المعصوم هو الممتنع بالله من جميع محارم الله",
    verifiedReferenceUr: "معانی الاخبار، ص132، ح2۔",
    verifiedReferenceEn: "Ma'ani al-Akhbar, p. 132, hadith 2.",
    verifiedSourceUrl: "https://ablibrary.net/book_content/b/3540/226",
    verificationWitnessId: "maani-132-2",
    witnesses: [
      {
        id: "maani-132-2",
        role: "verification-source",
        sourceTitleUr: "معانی الاخبار",
        sourceTitleEn: "Ma'ani al-Akhbar",
        sourceUrl: "https://ablibrary.net/book_content/b/3540/226",
        citation: {
          bookUr: "معانی الاخبار",
          bookEn: "Ma'ani al-Akhbar",
          page: 132,
          chapterUr: "باب معنى عصمة الامام",
          chapterEn: "Chapter on the meaning of the Imam's infallibility",
          hadithNumber: "2",
        },
        exactArabic:
          "المعصوم هو الممتنع بالله من جميع محارم الله",
        textVerified: true,
      },
    ],
  },
  {
    id: "ismah-kafi-1-204-2",
    topicIds: ["ismah"],
    dossierPrimaryTextId: "ismah-imam-free-from-lapses",
    attributedToUr: "امام صادقؑ",
    attributedToEn: "Imam al-Sadiq",
    sourceTitleUr: "الکافی",
    sourceTitleEn: "Al-Kafi",
    citedReferenceUr: "الکافی، ج1، ص204، ح2۔",
    citedReferenceEn: "Al-Kafi, vol. 1, p. 204, hadith 2.",
    sourceUrl: "https://ablibrary.net/book_content/b/3249/252?lang=ar",
    candidateArabic:
      "مَعصوماً مِنَ الزَّلّاتِ، مَصوناً عَنِ الفَواحِشِ كُلِّها.",
    status: "verified",
    exactArabic:
      "معصوما من الزلات ، مصونا عن الفواحش كلها",
    verifiedReferenceUr: "الکافی، ج1، ص204، ح2۔",
    verifiedReferenceEn: "Al-Kafi, vol. 1, p. 204, hadith 2.",
    verifiedSourceUrl: "https://ablibrary.net/book_content/b/3249/252?lang=ar",
    verificationWitnessId: "kafi-1-203-204-2",
    witnesses: [
      {
        id: "kafi-1-203-204-2",
        role: "verification-source",
        sourceTitleUr: "الکافی",
        sourceTitleEn: "Al-Kafi",
        sourceUrl: "https://ablibrary.net/book_content/b/3249/252?lang=ar",
        citation: {
          bookUr: "الکافی",
          bookEn: "Al-Kafi",
          volume: 1,
          page: 204,
          hadithNumber: "2",
        },
        exactArabic:
          "معصوما من الزلات ، مصونا عن الفواحش كلها",
        textVerified: true,
        note: "This is a verbatim excerpt from the longer description of the Imam in hadith 2.",
      },
    ],
  },
  {
    id: "ismah-kafi-1-203-1",
    topicIds: ["ismah"],
    dossierPrimaryTextId: "ismah-rida-proof",
    attributedToUr: "امام رضاؑ",
    attributedToEn: "Imam al-Ridha",
    sourceTitleUr: "الکافی",
    sourceTitleEn: "Al-Kafi",
    citedReferenceUr: "الکافی، ج1، ص203، ح1۔",
    citedReferenceEn: "Al-Kafi, vol. 1, p. 203, hadith 1.",
    sourceUrl: "https://ablibrary.net/book_content/b/3249/251",
    candidateArabic:
      "فَهُوَ مَعصومٌ مُؤَيَّدٌ مُوَفَّقٌ مُسَدَّدٌ، قَد أمِنَ مِنَ الخَطايا والزَّلَلِ والعِثارِ، يَخُصُّهُ اللهُ بِذلكَ لِيَكونَ حُجَّتَهُ عَلى عِبادِهِ وشاهِدَهُ عَلى خَلقِهِ.",
    status: "verified",
    exactArabic:
      "فهو معصوم مؤيد ، موفق مسدد ، قد أمن من الخطايا والزلل والعثار ، يخصه الله بذلك ليكون حجته على عباده ، وشاهده على خلقه",
    verifiedReferenceUr: "الکافی، ج1، ص203، ح1۔",
    verifiedReferenceEn: "Al-Kafi, vol. 1, p. 203, hadith 1.",
    verifiedSourceUrl: "https://ablibrary.net/book_content/b/3249/251",
    verificationWitnessId: "kafi-1-203-1",
    witnesses: [
      {
        id: "kafi-1-203-1",
        role: "verification-source",
        sourceTitleUr: "الکافی",
        sourceTitleEn: "Al-Kafi",
        sourceUrl: "https://ablibrary.net/book_content/b/3249/251",
        citation: {
          bookUr: "الکافی",
          bookEn: "Al-Kafi",
          volume: 1,
          page: 203,
          hadithNumber: "1",
        },
        exactArabic:
          "فهو معصوم مؤيد ، موفق مسدد ، قد أمن من الخطايا والزلل والعثار ، يخصه الله بذلك ليكون حجته على عباده ، وشاهده على خلقه",
        textVerified: true,
        note: "This page contains the closing portion of the longer Imam al-Ridha narration.",
      },
    ],
  },

];

export function validateVerifiedHadithCorpus(
  records: readonly VerifiedHadithRecord[] = VERIFIED_HADITH_CORPUS,
): readonly string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const dossierIds = new Set<string>();

  for (const record of records) {
    if (ids.has(record.id)) errors.push(`duplicate record id: ${record.id}`);
    ids.add(record.id);

    if (dossierIds.has(record.dossierPrimaryTextId)) {
      errors.push(`duplicate dossier text id: ${record.dossierPrimaryTextId}`);
    }
    dossierIds.add(record.dossierPrimaryTextId);

    if (!record.sourceUrl.startsWith("https://")) {
      errors.push(`${record.id}: sourceUrl must be https`);
    }

    const witnessIds = new Set<string>();
    for (const witness of record.witnesses) {
      if (witnessIds.has(witness.id)) {
        errors.push(`${record.id}: duplicate witness id ${witness.id}`);
      }
      witnessIds.add(witness.id);

      if (!witness.sourceUrl.startsWith("https://")) {
        errors.push(`${record.id}/${witness.id}: sourceUrl must be https`);
      }
      if (witness.textVerified) {
        if (!witness.exactArabic?.trim()) {
          errors.push(`${record.id}/${witness.id}: verified witness has no exactArabic`);
        }
        if (witness.exactArabic?.includes("...")) {
          errors.push(`${record.id}/${witness.id}: verified witness contains ellipsis`);
        }
      }
    }

    if (record.status === "verified") {
      if (!record.exactArabic?.trim()) {
        errors.push(`${record.id}: verified record has no exactArabic`);
      }
      if (record.exactArabic?.includes("...")) {
        errors.push(`${record.id}: verified exactArabic contains ellipsis`);
      }
      if (!record.verifiedReferenceUr || !record.verifiedReferenceEn) {
        errors.push(`${record.id}: verified references are incomplete`);
      }
      if (!record.verifiedSourceUrl?.startsWith("https://")) {
        errors.push(`${record.id}: verifiedSourceUrl must be https`);
      }
      if (!record.verificationWitnessId) {
        errors.push(`${record.id}: verificationWitnessId is missing`);
      } else {
        const witness = record.witnesses.find(
          (item) => item.id === record.verificationWitnessId,
        );
        if (!witness) {
          errors.push(`${record.id}: verification witness not found`);
        } else if (!witness.textVerified || !witness.exactArabic) {
          errors.push(`${record.id}: verification witness is not text-verified`);
        } else if (
          record.exactArabic &&
          !witness.exactArabic.includes(record.exactArabic)
        ) {
          errors.push(`${record.id}: exactArabic is not a verbatim witness segment`);
        }
      }
    }

    if (record.status === "pending-verification") {
      if (record.exactArabic || record.verificationWitnessId) {
        errors.push(
          `${record.id}: pending record must not expose verified exact text or witness`,
        );
      }
    }
  }

  return errors;
}

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
  return witness?.textVerified &&
    Boolean(witness.exactArabic) &&
    witness.exactArabic!.includes(record.exactArabic)
    ? record
    : null;
}
