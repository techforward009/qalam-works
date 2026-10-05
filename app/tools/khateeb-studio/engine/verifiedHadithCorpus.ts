import { hadithTranslationFields, validateHadithTranslation } from "./hadithTranslation";

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
  /**
   * Translation is separate from commentary. "editorial" means Qalam translated
   * the verified Arabic; "published" means a cited published translation is used.
   */
  translationArabic?: string;
  translationUr?: string;
  translationEn?: string;
  translationStatus?: "editorial" | "published";
  translationSourceLabelUr?: string;
  translationSourceLabelEn?: string;
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
    translationUr: "مسلمان کو تین خصلتوں کے ساتھ صبح کرنی چاہیے: دین کی سمجھ، معاش کے معاملات میں اچھی تدبیر، اور مصیبت پر صبر۔",
    translationEn: "A Muslim should begin the day with three qualities: understanding of religion, sound management of livelihood, and patience in calamity.",
    translationStatus: "editorial",
    translationArabic: "لا يصبح المسلم إلا على ثلاث خصالٍ: التفقّه في الدين، وحُسن التقدير في المعيشة، والصبر على النائبة.",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
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
    translationUr: "مصیبت کو پوشیدہ رکھنا نیکی کے خزانوں میں سے ہے۔",
    translationEn: "Keeping a calamity private is among the treasures of goodness.",
    translationStatus: "editorial",
    translationArabic: "كتمان المصيبة من كنوز البر.",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
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
    translationUr: "قیامت کے دن کچھ لوگ لوگوں کی گردنوں کے درمیان سے گزرتے ہوئے حساب سے پہلے جنت کے دروازے پر جا پہنچیں گے۔ ان سے پوچھا جائے گا: تم حساب سے پہلے جنت میں داخل ہونے کے حق دار کیسے ہوئے؟ وہ کہیں گے: ہم دنیا میں صبر کرنے والوں میں سے تھے۔",
    translationEn: "On the Day of Resurrection, some people will pass through the crowds until they knock at the gate of Paradise before the reckoning. They will be asked: How do you merit entering Paradise before the reckoning? They will say: We were among those who were patient in this world.",
    translationStatus: "editorial",
    translationArabic: "إن قوما يأتون يوم القيامة يتخللون رقاب الناس حتى يضربوا باب الجنة قبل الحساب، فيقولون لهم: بم تستحقون الدخول إلى الجنة قبل الحساب؟ فيقولون: كنا من الصابرين في الدنيا.",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
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
    translationUr: "صبر کا ایمان سے وہی تعلق ہے جو سر کا جسم سے ہے۔ سر چلا جائے تو جسم بھی ختم ہو جاتا ہے؛ اسی طرح صبر چلا جائے تو ایمان بھی چلا جاتا ہے۔",
    translationEn: "Patience stands in relation to faith as the head does to the body. When the head is gone, the body is gone; likewise, when patience is gone, faith is gone.",
    translationStatus: "editorial",
    translationArabic: "الصبر من الإيمان بمنزلة الرأس من الجسد، فإذا ذهب الرأس ذهب الجسد، وكذلك إذا ذهب الصبر ذهب الإيمان.",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
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
    translationUr: "جس بندے پر کوئی مصیبت آئے، پھر وہ اسے یاد کرتے وقت اِنّا لِلّٰہِ وَاِنّا اِلَیْہِ رَاجِعُوْن کہے اور اچانک مصیبت آنے پر صبر کرے، اللہ اس کے پچھلے گناہ بخش دیتا ہے۔ جب بھی وہ اس مصیبت کو یاد کرکے یہ کلمات کہتا ہے، ان دونوں مواقع کے درمیان کیے ہوئے اس کے گناہ بخش دیے جاتے ہیں۔",
    translationEn: "Whenever a servant suffers a calamity, declares that we belong to God and return to Him when recalling it, and is patient when it strikes unexpectedly, God forgives that servant's past sins. Each time the servant recalls the calamity and makes that declaration, the sins committed between the two occasions are forgiven.",
    translationStatus: "editorial",
    translationArabic: "ما من عبد يصاب بمصيبة فيسترجع عند ذكر المصيبة ويصبر حين تفجأه إلا غفر الله له ما تقدم من ذنبه، وكلما ذكر مصيبة فاسترجع عند ذكره المصيبة غفر له كل ذنب اكتسبه فيما بينهما.",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
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
    translationUr: "دعا مؤمن کا ہتھیار، دین کا ستون، اور آسمانوں اور زمین کا نور ہے۔",
    translationEn: "Supplication is the believer's weapon, the pillar of religion, and the light of the heavens and the earth.",
    translationStatus: "editorial",
    translationArabic: "الدعاء سلاح المؤمن وعمود الدين ونور السماوات والأرض.",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
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
    witnesses: [
      {
        id: "mizan-869-tanbih-cross-reference",
        role: "cross-reference",
        sourceTitleUr: "میزان الحکمہ",
        sourceTitleEn: "Mizan al-Hikmah",
        sourceUrl: "https://ablibrary.net/book_content/b/3733/13?lang=ar",
        citation: {
          bookUr: "میزان الحکمہ",
          bookEn: "Mizan al-Hikmah",
          page: 869,
        },
        exactArabic:
          "أفضل العبادة الدعاء ، فإذا أذن الله للعبد في الدعاء فتح له باب الرحمة ، إنه لن يهلك مع الدعاء أحد",
        textVerified: true,
        note:
          "Secondary cross-reference explicitly attributes this wording to Tanbih al-Khawatir 2/237. It is not promoted to a primary verification witness.",
      },
    ],
    verificationNote:
      "Edition conflict: the accessible Najaf Desert Library edition of Tanbih al-Khawatir vol. 2 p. 237 contains a different passage and does not show this narration. Secondary compilations cite 2/237, so the record remains pending until the exact cited edition/page is checked directly.",
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
    translationUr: "زمین پر اللہ عزوجل کو سب سے محبوب عمل دعا ہے، اور سب سے افضل عبادت پاک دامنی ہے۔ راوی کہتے ہیں: امیرالمؤمنینؑ بہت دعا کرنے والے تھے۔",
    translationEn: "The deed on earth most beloved to God, Mighty and Majestic, is supplication, and the best worship is chastity. The narrator says: The Commander of the Faithful was a man who supplicated abundantly.",
    translationStatus: "editorial",
    translationArabic: "أحب الأعمال إلى الله عز وجل في الأرض الدعاء وأفضل العبادة العفاف، قال: وكان أمير المؤمنين عليه السلام رجلا دعاء.",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
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
    translationUr: "دعا مؤمن کی ڈھال ہے؛ جب تم بار بار دروازہ کھٹکھٹاؤ گے تو وہ تمہارے لیے کھول دیا جائے گا۔",
    translationEn: "Supplication is the believer's shield; when you knock at the door repeatedly, it will be opened for you.",
    translationStatus: "editorial",
    translationArabic: "الدعاء ترس المؤمن ومتى تكثر قرع الباب يفتح لك.",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
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
    translationUr: "اے میسر! دعا کرو، اور یہ نہ کہو کہ معاملہ طے ہو چکا ہے۔ اللہ عزوجل کے ہاں ایک مقام ایسا ہے جو مانگے بغیر حاصل نہیں ہوتا۔ اگر بندہ اپنا منہ بند رکھے اور کچھ نہ مانگے تو اسے کچھ نہیں دیا جاتا۔ پس مانگو، تمہیں دیا جائے گا۔ اے میسر! کوئی دروازہ ایسا نہیں جسے کھٹکھٹایا جائے اور وہ کھٹکھٹانے والے کے لیے جلد کھلنے کے قریب نہ ہو۔",
    translationEn: "O Maysir, supplicate, and do not say that the matter has already been settled. There is a station with God, Mighty and Majestic, that can be attained only by asking. If a servant keeps their mouth closed and does not ask, they are given nothing. So ask, and you will be given. O Maysir, no door is knocked upon without being close to opening for the one who knocks.",
    translationStatus: "editorial",
    translationArabic: "يا ميسر ادع ولا تقل: إن الامر قد فرغ منه، إن عند الله عز وجل منزلة لا تنال إلا بمسألة، ولو أن عبدا سد فاه ولم يسأل لم يعط شيئا فسل تعط، يا ميسر إنه ليس من باب يقرع إلا يوشك أن يفتح لصاحبه.",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
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
    translationUr: "تمہاری ماں کا حق یہ ہے کہ تم جانو: اس نے تمہیں ایسی جگہ اٹھائے رکھا جہاں کوئی کسی کو نہیں اٹھاتا، اپنے دل کا پھل تمہیں دیا جو کوئی کسی کو نہیں دیتا، اور اپنے تمام اعضا سے تمہاری حفاظت کی۔ اسے پروا نہیں تھی کہ خود بھوکی رہے اور تمہیں کھلائے، پیاسی رہے اور تمہیں پلائے، بے لباس رہے اور تمہیں پہنائے، دھوپ میں رہے اور تمہیں سایہ دے۔ تمہاری خاطر نیند چھوڑی اور گرمی سردی سے تمہیں بچایا تاکہ تم اس کے لیے رہو۔ تم اللہ کی مدد اور توفیق کے بغیر اس کا شکر ادا نہیں کرسکتے۔",
    translationEn: "Your mother's right is that you know she carried you where no one carries another, gave you the fruit of her heart that no one gives another, and protected you with all her limbs. She did not mind going hungry while feeding you, thirsty while giving you drink, unclothed while clothing you, or exposed to the sun while shading you. She gave up sleep for your sake and protected you from heat and cold so that you might remain hers. You cannot thank her adequately without God's help and enabling grace.",
    translationStatus: "editorial",
    translationArabic: "حق امك أن تعلم أنها حملتك حيث لا يحمل أحد أحدا، وأعطتك من ثمرة قلبها ما لا يعطي أحد أحدا، ووقتك بجميع جوارحها، ولم تبال أن تجوع وتطعمك، وتعطش وتسقيك، وتعرى وتكسوك، وتضحى وتظلك، وتهجر النوم لأجلك، ووقتك الحر والبرد لتكون لها، فإنك لا تطيق شكرها إلا بعون الله وتوفيقه.",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
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
    translationUr: "تمہارے باپ کا حق یہ ہے کہ تم جانو کہ وہ تمہاری اصل ہے، اور اگر وہ نہ ہوتا تو تم میں وہ کچھ نہ ہوتا جو تمہیں اپنے اندر پسند آتا ہے۔ جان لو کہ اس نعمت میں تمہارے باپ کا بنیادی حصہ ہے؛ لہٰذا اللہ کی حمد کرو اور اس نعمت کے بقدر اللہ کا شکر ادا کرو۔ اللہ کے سوا کوئی قوت نہیں۔",
    translationEn: "Your father's right is that you know he is your origin, and that without him you would not have what you see in yourself and admire. Know that your father is the origin of that blessing upon you; therefore praise God and thank Him accordingly. There is no strength except through God.",
    translationStatus: "editorial",
    translationArabic: "وأما حق أبيك فأن تعلم أنه أصلك، وأنك لولاه لم تكن فيما رأيت في نفسك مما يعجبك. واعلم أن أباك أصل النعمة عليك فيه، فاحمد الله واشكره على قدر ذلك، ولا قوة إلا بالله.",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
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
    translationUr: "اور اس نے اپنے اور والدین کے شکر کا حکم دیا؛ پس جس نے اپنے والدین کا شکر ادا نہیں کیا، اس نے اللہ کا شکر ادا نہیں کیا۔",
    translationEn: "And He commanded gratitude to Himself and to parents; whoever has not thanked their parents has not thanked God.",
    translationStatus: "editorial",
    translationArabic: "وأمر بالشكر له وللوالدين، فمن لم يشكر والديه لم يشكر الله",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
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
    translationUr: "احسان یہ ہے کہ ان دونوں کے ساتھ اچھا برتاؤ کرو، اور انہیں اپنی ضرورت کی کوئی چیز تم سے مانگنے پر مجبور نہ کرو، خواہ وہ بے نیاز ہی ہوں۔",
    translationEn: "Kindness means keeping good company with both parents and not making them ask you for anything they need, even if they are well-off.",
    translationStatus: "editorial",
    translationArabic: "الاحسان أن تحسن صحبتهما وأن لا تكلفهما أن يسألاك شيئا مما يحتاجان إليه وإن كانا مستغنيين",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
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
    translationUr: "انہیں صرف رحمت اور نرمی کی نگاہ سے دیکھو؛ اپنی آواز ان کی آواز سے بلند نہ کرو، اپنا ہاتھ ان کے ہاتھوں سے اونچا نہ اٹھاؤ، اور ان کے آگے نہ چلو۔",
    translationEn: "Look at them only with mercy and tenderness. Do not raise your voice above theirs, your hand above their hands, or walk ahead of them.",
    translationStatus: "editorial",
    translationArabic: "لا تملأ عينيك من النظر إليهما إلا برحمة ورقة ولا ترفع صوتك فوق أصواتهما ولا يدك فوق أيديهما ولا تقدم قدامهما.",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
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
    translationUr: "اولاد پر والدین کے لیے تین چیزیں لازم ہیں: ہر حال میں ان کا شکر ادا کرنا؛ ان کے حکم اور منع کی اطاعت کرنا، بشرطیکہ اس میں اللہ کی نافرمانی نہ ہو؛ اور پوشیدہ و علانیہ ان کی خیرخواہی کرنا۔",
    translationEn: "Children owe their parents three things: thanking them in every circumstance; obeying their commands and prohibitions when these do not involve disobedience to God; and seeking their good in private and in public.",
    translationStatus: "editorial",
    translationArabic: "ويجب للوالدين على الولد ثلاثة أشياء : شكرهما على كل حال . وطاعتهما فيما يأمرانه وينهيانه عنه في غير معصية الله . ونصيحتهما في السر والعلانية .",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
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
    translationUr: "اپنے باپوں کے ساتھ نیکی کرو، تمہارے بیٹے تمہارے ساتھ نیکی کریں گے؛ اور دوسروں کی عورتوں کے بارے میں پاک دامنی اختیار کرو، تمہاری عورتیں پاک دامن رہیں گی۔",
    translationEn: "Be good to your fathers, and your sons will be good to you. Observe chastity towards other people's women, and your women will remain chaste.",
    translationStatus: "editorial",
    translationArabic: "بروا آبائكم يبركم أبناؤكم وعفوا عن نساء الناس تعف نساؤكم.",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
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
    translationUr: "قیامت کے دن نیکوکاروں کا سردار وہ شخص ہوگا جس نے اپنے والدین کی وفات کے بعد بھی ان کے ساتھ نیکی کی۔",
    translationEn: "The foremost of the righteous on the Day of Resurrection will be a person who was good to their parents after their death.",
    translationStatus: "editorial",
    translationArabic: "سيد الأبرار يوم القيامة رجل بر والديه بعد موتهما.",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
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
    translationUr: "امامت امت کے نظم کی بنیاد ہے۔",
    translationEn: "Imamate is the ordering principle of the community.",
    translationStatus: "editorial",
    translationArabic: "الإمامة نظام الأمة",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
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
    translationUr: "اسلام کی بنیاد پانچ چیزوں پر رکھی گئی ہے: نماز، زکوٰۃ، روزہ، حج اور ولایت؛ اور کسی چیز کی طرف ایسی دعوت نہیں دی گئی جیسی ولایت کی طرف دی گئی۔",
    translationEn: "Islam is built upon five things: prayer, zakat, fasting, pilgrimage, and wilayah. Nothing has been called for as wilayah has been called for.",
    translationStatus: "editorial",
    translationArabic: "بني الاسلام على خمس : على الصلاة والزكاة والصوم والحج والولاية ولم يناد بشئ كما نودي بالولاية",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
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
    translationUr: "اللہ تبارک وتعالیٰ نے ابراہیمؑ کو نبی بنانے سے پہلے بندہ بنایا، رسول بنانے سے پہلے نبی بنایا، خلیل بنانے سے پہلے رسول بنایا، اور امام بنانے سے پہلے خلیل بنایا۔ جب ان کے لیے یہ سب مقامات جمع کردیے تو فرمایا: میں تمہیں لوگوں کا امام بنانے والا ہوں۔",
    translationEn: "God, Blessed and Exalted, took Abraham as a servant before taking him as a prophet, as a prophet before taking him as a messenger, as a messenger before taking him as a friend, and as a friend before making him an imam. When He had brought all these stations together for him, He said: I am making you an imam for the people.",
    translationStatus: "editorial",
    translationArabic: "إن الله تبارك وتعالى اتخذ إبراهيم عبدا قبل أن يتخذه نبيا وإن الله اتخذه نبيا قبل أن يتخذه رسولا وإن الله اتخذه رسولا قبل أن يتخذه خليلا وإن الله اتخذه خليلا قبل أن يجعله إماما ، فلما جمع له الأشياء قال : إني جاعلك للناس إماما",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
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
    translationUr: "زمین کبھی امام سے خالی نہیں ہوتی، تاکہ مؤمن اگر کچھ بڑھا دیں تو وہ انہیں واپس لائے، اور اگر کچھ کم کردیں تو وہ ان کے لیے اسے پورا کرے۔",
    translationEn: "The earth is never without an imam, so that if the believers add anything, he brings them back, and if they leave anything out, he completes it for them.",
    translationStatus: "editorial",
    translationArabic: "إن الأرض لا تخلو إلا وفيها إمام ، كيما إن زاد المؤمنون شيئا ردهم ، وإن نقصوا شيئا أتمه لهم",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
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
    translationUr: "جو اپنے امام کو پہچانے بغیر مر گیا، وہ جاہلیت کی موت مرا۔",
    translationEn: "Whoever dies without knowing their imam dies a death of ignorance.",
    translationStatus: "editorial",
    translationArabic: "من مات وهو لا يعرف إمامه مات ميتة جاهلية",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
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
    translationUr: "جسے عصمت کی توفیق دی گئی، وہ لغزش سے محفوظ ہوگیا۔",
    translationEn: "Whoever is inspired with protection from sin is safe from slipping.",
    translationStatus: "editorial",
    translationArabic: "مَنْ أُلْهِمَ الْعِصْمَةَ أَمِنَ الزَّلَلَ",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
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
    translationUr: "ہم میں سے امام صرف معصوم ہوتا ہے۔ عصمت ظاہری شکل میں ایسی چیز نہیں کہ اس سے اسے پہچانا جاسکے؛ اسی لیے امام کی تعیین نص کے ذریعے ہوتی ہے۔ عرض کیا گیا: اے فرزندِ رسول! معصوم کا کیا مطلب ہے؟ فرمایا: وہ اللہ کی رسی کو مضبوطی سے تھامنے والا ہے، اور اللہ کی رسی قرآن ہے۔ دونوں قیامت تک جدا نہیں ہوتے۔ امام قرآن کی طرف رہنمائی کرتا ہے اور قرآن امام کی طرف رہنمائی کرتا ہے۔",
    translationEn: "An imam from among us can only be infallible. Infallibility is not a visible feature of one's physical form by which one can be recognized; therefore an imam can only be designated explicitly. He was asked: O son of the Messenger of God, what does infallible mean? He said: One who holds fast to God's rope; God's rope is the Qur'an. The two do not separate until the Day of Resurrection. The imam guides towards the Qur'an, and the Qur'an guides towards the imam.",
    translationStatus: "editorial",
    translationArabic: "الامام منا لا يكون إلا معصوما وليست العصمة في ظاهر الخلقة فيعرف بها ولذلك لا يكون إلا منصوصا . فقيل له : يا ابن رسول الله فما معنى المعصوم ؟ فقال : هو المعتصم بحبل الله ، وحبل الله هو القرآن لا يفترقان إلى يوم القيامة ، والامام يهدي إلى القرآن والقرآن يهدي إلى الامام",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
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
    translationUr: "معصوم وہ ہے جو اللہ کی مدد سے اللہ کی تمام حرام کردہ چیزوں سے محفوظ رہتا ہے۔",
    translationEn: "The infallible is one who, through God, refrains from all that God has forbidden.",
    translationStatus: "editorial",
    translationArabic: "المعصوم هو الممتنع بالله من جميع محارم الله",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
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
    translationUr: "لغزشوں سے معصوم، اور تمام بے حیائیوں سے محفوظ۔",
    translationEn: "Protected from slips and safeguarded against all indecencies.",
    translationStatus: "editorial",
    translationArabic: "معصوما من الزلات ، مصونا عن الفواحش كلها",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
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
    translationUr: "پس وہ معصوم، تائید یافتہ، توفیق یافتہ اور راہِ درست پر قائم رکھا گیا ہے؛ خطاؤں، لغزشوں اور ٹھوکروں سے محفوظ ہے۔ اللہ اسے یہ خصوصیت عطا کرتا ہے تاکہ وہ اس کے بندوں پر اس کی حجت اور اس کی مخلوق پر اس کا گواہ ہو۔",
    translationEn: "Thus he is infallible, supported, granted success, and guided aright, secure from errors, slips, and stumbles. God singles him out for this so that he may be His proof over His servants and His witness over His creation.",
    translationStatus: "editorial",
    translationArabic: "فهو معصوم مؤيد ، موفق مسدد ، قد أمن من الخطايا والزلل والعثار ، يخصه الله بذلك ليكون حجته على عباده ، وشاهده على خلقه",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
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

  {
    id: "quran-hidayat-kafi-2-609-1",
    topicIds: ["quran-hidayat"],
    dossierPrimaryTextId: "quran-hidayat-covenant",
    attributedToUr: "امام صادقؑ",
    attributedToEn: "Imam al-Sadiq",
    sourceTitleUr: "الکافی",
    sourceTitleEn: "Al-Kafi",
    citedReferenceUr: "الکافی، ج2، ص609، باب فی قراءتہ، ح1۔",
    citedReferenceEn: "Al-Kafi, vol. 2, p. 609, chapter on recitation, hadith 1.",
    sourceUrl: "https://lib.eshia.ir/11005/2/609",
    candidateArabic:
      "القرآن عهد الله إلى خلقه فقد ينبغي للمرء المسلم أن ينظر في عهده وأن يقرأ منه في كل يوم خمسين آية.",
    status: "verified",
    exactArabic:
      "الْقُرْآنُ عَهْدُ اللَّهِ إِلَى خَلْقِهِ فَقَدْ يَنْبَغِي لِلْمَرْءِ الْمُسْلِمِ أَنْ يَنْظُرَ فِي عَهْدِهِ وَ أَنْ يَقْرَأَ مِنْهُ فِي كُلِّ يَوْمٍ خَمْسِينَ آيَةً.",
    translationUr: "قرآن اللہ کا اپنی مخلوق سے عہد ہے؛ پس مسلمان کو چاہیے کہ اپنے اس عہد میں نظر کرے اور ہر روز اس میں سے پچاس آیات پڑھے۔",
    translationEn: "The Qur'an is God's covenant with His creation. A Muslim should therefore look into that covenant and read fifty verses from it each day.",
    translationStatus: "editorial",
    translationArabic: "الْقُرْآنُ عَهْدُ اللَّهِ إِلَى خَلْقِهِ فَقَدْ يَنْبَغِي لِلْمَرْءِ الْمُسْلِمِ أَنْ يَنْظُرَ فِي عَهْدِهِ وَ أَنْ يَقْرَأَ مِنْهُ فِي كُلِّ يَوْمٍ خَمْسِينَ آيَةً.",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
    verifiedReferenceUr: "الکافی، ج2، ص609، باب فی قراءتہ، ح1۔",
    verifiedReferenceEn: "Al-Kafi, vol. 2, p. 609, chapter on recitation, hadith 1.",
    verifiedSourceUrl: "https://lib.eshia.ir/11005/2/609",
    verificationWitnessId: "eshia-kafi-2-609-1",
    witnesses: [
      {
        id: "eshia-kafi-2-609-1",
        role: "verification-source",
        sourceTitleUr: "الکافی",
        sourceTitleEn: "Al-Kafi",
        sourceUrl: "https://lib.eshia.ir/11005/2/609",
        citation: {
          bookUr: "الکافی",
          bookEn: "Al-Kafi",
          volume: 2,
          page: 609,
          chapterUr: "باب فی قراءتہ",
          chapterEn: "Chapter on its recitation",
          hadithNumber: "1",
        },
        exactArabic:
          "الْقُرْآنُ عَهْدُ اللَّهِ إِلَى خَلْقِهِ فَقَدْ يَنْبَغِي لِلْمَرْءِ الْمُسْلِمِ أَنْ يَنْظُرَ فِي عَهْدِهِ وَ أَنْ يَقْرَأَ مِنْهُ فِي كُلِّ يَوْمٍ خَمْسِينَ آيَةً.",
        textVerified: true,
      },
    ],
  },
  {
    id: "quran-hidayat-kafi-2-609-2",
    topicIds: ["quran-hidayat"],
    dossierPrimaryTextId: "quran-hidayat-treasuries",
    attributedToUr: "امام زین العابدینؑ",
    attributedToEn: "Imam Zayn al-Abidin",
    sourceTitleUr: "الکافی",
    sourceTitleEn: "Al-Kafi",
    citedReferenceUr: "الکافی، ج2، ص609، باب فی قراءتہ، ح2۔",
    citedReferenceEn: "Al-Kafi, vol. 2, p. 609, chapter on recitation, hadith 2.",
    sourceUrl: "https://lib.eshia.ir/11005/2/609",
    candidateArabic:
      "آيات القرآن خزائن فكلما فتحت خزانة ينبغي لك أن تنظر ما فيها.",
    status: "verified",
    exactArabic:
      "آيَاتُ الْقُرْآنِ خَزَائِنُ فَكُلَّمَا فَتَحْتَ خِزَانَةً يَنْبَغِي لَكَ أَنْ تَنْظُرَ مَا فِيهَا.",
    translationUr: "قرآن کی آیات خزانے ہیں؛ جب بھی کوئی خزانہ کھولو تو دیکھو کہ اس میں کیا ہے۔",
    translationEn: "The verses of the Qur'an are treasures; whenever you open a treasure, you should examine what it contains.",
    translationStatus: "editorial",
    translationArabic: "آيَاتُ الْقُرْآنِ خَزَائِنُ فَكُلَّمَا فَتَحْتَ خِزَانَةً يَنْبَغِي لَكَ أَنْ تَنْظُرَ مَا فِيهَا.",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
    verifiedReferenceUr: "الکافی، ج2، ص609، باب فی قراءتہ، ح2۔",
    verifiedReferenceEn: "Al-Kafi, vol. 2, p. 609, chapter on recitation, hadith 2.",
    verifiedSourceUrl: "https://lib.eshia.ir/11005/2/609",
    verificationWitnessId: "eshia-kafi-2-609-2",
    witnesses: [
      {
        id: "eshia-kafi-2-609-2",
        role: "verification-source",
        sourceTitleUr: "الکافی",
        sourceTitleEn: "Al-Kafi",
        sourceUrl: "https://lib.eshia.ir/11005/2/609",
        citation: {
          bookUr: "الکافی",
          bookEn: "Al-Kafi",
          volume: 2,
          page: 609,
          chapterUr: "باب فی قراءتہ",
          chapterEn: "Chapter on its recitation",
          hadithNumber: "2",
        },
        exactArabic:
          "آيَاتُ الْقُرْآنِ خَزَائِنُ فَكُلَّمَا فَتَحْتَ خِزَانَةً يَنْبَغِي لَكَ أَنْ تَنْظُرَ مَا فِيهَا.",
        textVerified: true,
      },
    ],
  },
  {
    id: "quran-hidayat-kafi-2-603-1",
    topicIds: ["quran-hidayat"],
    dossierPrimaryTextId: "quran-hidayat-people",
    attributedToUr: "رسول اکرمؐ",
    attributedToEn: "The Prophet",
    sourceTitleUr: "الکافی",
    sourceTitleEn: "Al-Kafi",
    citedReferenceUr: "الکافی، ج2، ص603، باب فضل حامل القرآن، ح1۔",
    citedReferenceEn: "Al-Kafi, vol. 2, p. 603, chapter on the merit of the bearer of the Qur'an, hadith 1.",
    sourceUrl: "https://lib.eshia.ir/11005/2/603",
    candidateArabic:
      "إن أهل القرآن في أعلى درجة من الآدميين ما خلا النبيين والمرسلين فلا تستضعفوا أهل القرآن حقوقهم فإن لهم من الله العزيز الجبار لمكانا عليا.",
    status: "verified",
    exactArabic:
      "إِنَّ أَهْلَ الْقُرْآنِ فِي أَعْلَى دَرَجَةٍ مِنَ الْآدَمِيِّينَ مَا خَلَا النَّبِيِّينَ وَ الْمُرْسَلِينَ فَلَا تَسْتَضْعِفُوا أَهْلَ الْقُرْآنِ حُقُوقَهُمْ فَإِنَّ لَهُمْ مِنَ اللَّهِ الْعَزِيزِ الْجَبَّارِ لَمَكَاناً عَلِيّاً.",
    translationUr: "اہلِ قرآن، انبیاء اور رسولوں کے سوا، انسانوں میں سب سے بلند درجے پر ہیں۔ پس اہلِ قرآن کے حقوق کو معمولی نہ سمجھو، کیونکہ اللہ عزیز و جبار کے ہاں ان کا بہت بلند مقام ہے۔",
    translationEn: "The people of the Qur'an hold the highest rank among human beings, apart from prophets and messengers. Do not belittle their rights, for they have an exalted station with God, the Mighty and Compelling.",
    translationStatus: "editorial",
    translationArabic: "إِنَّ أَهْلَ الْقُرْآنِ فِي أَعْلَى دَرَجَةٍ مِنَ الْآدَمِيِّينَ مَا خَلَا النَّبِيِّينَ وَ الْمُرْسَلِينَ فَلَا تَسْتَضْعِفُوا أَهْلَ الْقُرْآنِ حُقُوقَهُمْ فَإِنَّ لَهُمْ مِنَ اللَّهِ الْعَزِيزِ الْجَبَّارِ لَمَكَاناً عَلِيّاً.",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
    verifiedReferenceUr: "الکافی، ج2، ص603، باب فضل حامل القرآن، ح1۔",
    verifiedReferenceEn: "Al-Kafi, vol. 2, p. 603, chapter on the merit of the bearer of the Qur'an, hadith 1.",
    verifiedSourceUrl: "https://lib.eshia.ir/11005/2/603",
    verificationWitnessId: "eshia-kafi-2-603-1",
    witnesses: [
      {
        id: "eshia-kafi-2-603-1",
        role: "verification-source",
        sourceTitleUr: "الکافی",
        sourceTitleEn: "Al-Kafi",
        sourceUrl: "https://lib.eshia.ir/11005/2/603",
        citation: {
          bookUr: "الکافی",
          bookEn: "Al-Kafi",
          volume: 2,
          page: 603,
          chapterUr: "باب فضل حامل القرآن",
          chapterEn: "Chapter on the merit of the bearer of the Qur'an",
          hadithNumber: "1",
        },
        exactArabic:
          "إِنَّ أَهْلَ الْقُرْآنِ فِي أَعْلَى دَرَجَةٍ مِنَ الْآدَمِيِّينَ مَا خَلَا النَّبِيِّينَ وَ الْمُرْسَلِينَ فَلَا تَسْتَضْعِفُوا أَهْلَ الْقُرْآنِ حُقُوقَهُمْ فَإِنَّ لَهُمْ مِنَ اللَّهِ الْعَزِيزِ الْجَبَّارِ لَمَكَاناً عَلِيّاً.",
        textVerified: true,
      },
    ],
  },
  {
    id: "quran-hidayat-kafi-2-603-2",
    topicIds: ["quran-hidayat"],
    dossierPrimaryTextId: "quran-hidayat-memorise-act",
    attributedToUr: "امام صادقؑ",
    attributedToEn: "Imam al-Sadiq",
    sourceTitleUr: "الکافی",
    sourceTitleEn: "Al-Kafi",
    citedReferenceUr: "الکافی، ج2، ص603، باب فضل حامل القرآن، ح2۔",
    citedReferenceEn: "Al-Kafi, vol. 2, p. 603, chapter on the merit of the bearer of the Qur'an, hadith 2.",
    sourceUrl: "https://lib.eshia.ir/11005/2/603",
    candidateArabic: "الحافظ للقرآن العامل به مع السفرة الكرام البررة.",
    status: "verified",
    exactArabic:
      "الْحَافِظُ لِلْقُرْآنِ الْعَامِلُ بِهِ مَعَ السَّفَرَةِ الْكِرَامِ الْبَرَرَةِ.",
    translationUr: "قرآن کا حافظ جو اس پر عمل بھی کرتا ہو، معزز اور نیکوکار سفیروں کے ساتھ ہے۔",
    translationEn: "One who preserves the Qur'an and acts upon it is with the noble, righteous emissaries.",
    translationStatus: "editorial",
    translationArabic: "الْحَافِظُ لِلْقُرْآنِ الْعَامِلُ بِهِ مَعَ السَّفَرَةِ الْكِرَامِ الْبَرَرَةِ.",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
    verifiedReferenceUr: "الکافی، ج2، ص603، باب فضل حامل القرآن، ح2۔",
    verifiedReferenceEn: "Al-Kafi, vol. 2, p. 603, chapter on the merit of the bearer of the Qur'an, hadith 2.",
    verifiedSourceUrl: "https://lib.eshia.ir/11005/2/603",
    verificationWitnessId: "eshia-kafi-2-603-2",
    witnesses: [
      {
        id: "eshia-kafi-2-603-2",
        role: "verification-source",
        sourceTitleUr: "الکافی",
        sourceTitleEn: "Al-Kafi",
        sourceUrl: "https://lib.eshia.ir/11005/2/603",
        citation: {
          bookUr: "الکافی",
          bookEn: "Al-Kafi",
          volume: 2,
          page: 603,
          chapterUr: "باب فضل حامل القرآن",
          chapterEn: "Chapter on the merit of the bearer of the Qur'an",
          hadithNumber: "2",
        },
        exactArabic:
          "الْحَافِظُ لِلْقُرْآنِ الْعَامِلُ بِهِ مَعَ السَّفَرَةِ الْكِرَامِ الْبَرَرَةِ.",
        textVerified: true,
      },
    ],
  },
  {
    id: "quran-hidayat-kafi-2-603-3",
    topicIds: ["quran-hidayat"],
    dossierPrimaryTextId: "quran-hidayat-learn",
    attributedToUr: "رسول اکرمؐ",
    attributedToEn: "The Prophet",
    sourceTitleUr: "الکافی",
    sourceTitleEn: "Al-Kafi",
    citedReferenceUr: "الکافی، ج2، ص603، باب فضل حامل القرآن، ح3۔",
    citedReferenceEn: "Al-Kafi, vol. 2, p. 603, chapter on the merit of the bearer of the Qur'an, hadith 3.",
    sourceUrl: "https://lib.eshia.ir/11005/2/603",
    candidateArabic:
      "تعلموا القرآن فإنه يأتي يوم القيامة صاحبه في صورة شاب جميل شاحب اللون.",
    status: "verified",
    exactArabic:
      "تَعَلَّمُوا الْقُرْآنَ فَإِنَّهُ يَأْتِي يَوْمَ الْقِيَامَةِ صَاحِبَهُ فِي صُورَةِ شَابٍّ جَمِيلٍ شَاحِبِ اللَّوْنِ",
    translationUr: "قرآن سیکھو، کیونکہ قیامت کے دن وہ اپنے ساتھی کے پاس ایک خوب صورت، زرد رنگت والے نوجوان کی صورت میں آئے گا۔",
    translationEn: "Learn the Qur'an, for on the Day of Resurrection it will come to its companion in the form of a handsome young man with a pale complexion.",
    translationStatus: "editorial",
    translationArabic: "تَعَلَّمُوا الْقُرْآنَ فَإِنَّهُ يَأْتِي يَوْمَ الْقِيَامَةِ صَاحِبَهُ فِي صُورَةِ شَابٍّ جَمِيلٍ شَاحِبِ اللَّوْنِ",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
    verifiedReferenceUr: "الکافی، ج2، ص603، باب فضل حامل القرآن، ح3۔",
    verifiedReferenceEn: "Al-Kafi, vol. 2, p. 603, chapter on the merit of the bearer of the Qur'an, hadith 3.",
    verifiedSourceUrl: "https://lib.eshia.ir/11005/2/603",
    verificationWitnessId: "eshia-kafi-2-603-3",
    witnesses: [
      {
        id: "eshia-kafi-2-603-3",
        role: "verification-source",
        sourceTitleUr: "الکافی",
        sourceTitleEn: "Al-Kafi",
        sourceUrl: "https://lib.eshia.ir/11005/2/603",
        citation: {
          bookUr: "الکافی",
          bookEn: "Al-Kafi",
          volume: 2,
          page: 603,
          chapterUr: "باب فضل حامل القرآن",
          chapterEn: "Chapter on the merit of the bearer of the Qur'an",
          hadithNumber: "3",
        },
        exactArabic:
          "تَعَلَّمُوا الْقُرْآنَ فَإِنَّهُ يَأْتِي يَوْمَ الْقِيَامَةِ صَاحِبَهُ فِي صُورَةِ شَابٍّ جَمِيلٍ شَاحِبِ اللَّوْنِ",
        textVerified: true,
        note:
          "This record intentionally displays only the dossier's contiguous opening clause from a much longer verified hadith on the same page.",
      },
    ],
  },
  {
    id: "quran-hidayat-kafi-2-603-4",
    topicIds: ["quran-hidayat"],
    dossierPrimaryTextId: "quran-hidayat-youth",
    attributedToUr: "امام صادقؑ",
    attributedToEn: "Imam al-Sadiq",
    sourceTitleUr: "الکافی",
    sourceTitleEn: "Al-Kafi",
    citedReferenceUr: "الکافی، ج2، ص603، باب فضل حامل القرآن، ح4۔",
    citedReferenceEn: "Al-Kafi, vol. 2, p. 603, chapter on the merit of the bearer of the Qur'an, hadith 4.",
    sourceUrl: "https://lib.eshia.ir/11005/2/603",
    candidateArabic:
      "من قرأ القرآن وهو شاب مؤمن اختلط القرآن بلحمه ودمه وجعله الله عز وجل مع السفرة الكرام البررة.",
    status: "verified",
    exactArabic:
      "مَنْ قَرَأَ الْقُرْآنَ وَ هُوَ شَابٌّ مُؤْمِنٌ اخْتَلَطَ الْقُرْآنُ بِلَحْمِهِ وَ دَمِهِ وَ جَعَلَهُ اللَّهُ عَزَّ وَ جَلَّ مَعَ السَّفَرَةِ الْكِرَامِ الْبَرَرَةِ",
    translationUr: "جو مؤمن نوجوانی میں قرآن پڑھے، قرآن اس کے گوشت اور خون میں رچ بس جاتا ہے، اور اللہ عزوجل اسے معزز اور نیکوکار سفیروں کے ساتھ قرار دیتا ہے۔",
    translationEn: "When a young believer reads the Qur'an, it mingles with their flesh and blood, and God, Mighty and Majestic, places them with the noble, righteous emissaries.",
    translationStatus: "editorial",
    translationArabic: "مَنْ قَرَأَ الْقُرْآنَ وَ هُوَ شَابٌّ مُؤْمِنٌ اخْتَلَطَ الْقُرْآنُ بِلَحْمِهِ وَ دَمِهِ وَ جَعَلَهُ اللَّهُ عَزَّ وَ جَلَّ مَعَ السَّفَرَةِ الْكِرَامِ الْبَرَرَةِ",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
    verifiedReferenceUr: "الکافی، ج2، ص603، باب فضل حامل القرآن، ح4۔",
    verifiedReferenceEn: "Al-Kafi, vol. 2, p. 603, chapter on the merit of the bearer of the Qur'an, hadith 4.",
    verifiedSourceUrl: "https://lib.eshia.ir/11005/2/603",
    verificationWitnessId: "eshia-kafi-2-603-4",
    witnesses: [
      {
        id: "eshia-kafi-2-603-4",
        role: "verification-source",
        sourceTitleUr: "الکافی",
        sourceTitleEn: "Al-Kafi",
        sourceUrl: "https://lib.eshia.ir/11005/2/603",
        citation: {
          bookUr: "الکافی",
          bookEn: "Al-Kafi",
          volume: 2,
          page: 603,
          chapterUr: "باب فضل حامل القرآن",
          chapterEn: "Chapter on the merit of the bearer of the Qur'an",
          hadithNumber: "4",
        },
        exactArabic:
          "مَنْ قَرَأَ الْقُرْآنَ وَ هُوَ شَابٌّ مُؤْمِنٌ اخْتَلَطَ الْقُرْآنُ بِلَحْمِهِ وَ دَمِهِ وَ جَعَلَهُ اللَّهُ عَزَّ وَ جَلَّ مَعَ السَّفَرَةِ الْكِرَامِ الْبَرَرَةِ",
        textVerified: true,
        note:
          "The source continues beyond this clause on the following page; the displayed text is the contiguous dossier segment verified on p. 603.",
      },
    ],
  },
  {
    id: "quran-hidayat-kafi-2-604-5",
    topicIds: ["quran-hidayat"],
    dossierPrimaryTextId: "quran-hidayat-humility",
    attributedToUr: "رسول اکرمؐ",
    attributedToEn: "The Prophet",
    sourceTitleUr: "الکافی",
    sourceTitleEn: "Al-Kafi",
    citedReferenceUr: "الکافی، ج2، ص604، باب فضل حامل القرآن، ح5۔",
    citedReferenceEn: "Al-Kafi, vol. 2, p. 604, chapter on the merit of the bearer of the Qur'an, hadith 5.",
    sourceUrl: "https://lib.eshia.ir/11005/2/604",
    candidateArabic:
      "يا حامل القرآن تواضع به يرفعك الله ولا تعزز به فيذلك الله ... ولكنه يعفو ويصفح ويغفر ويحلم لتعظيم القرآن.",
    status: "verified",
    exactArabic:
      "يَا حَامِلَ الْقُرْآنِ تَوَاضَعْ بِهِ يَرْفَعْكَ اللَّهُ وَ لَا تَعَزَّزْ بِهِ فَيُذِلَّكَ اللَّهُ يَا حَامِلَ الْقُرْآنِ تَزَيَّنْ بِهِ لِلَّهِ يُزَيِّنْكَ اللَّهُ بِهِ وَ لَا تَزَيَّنْ بِهِ لِلنَّاسِ فَيَشِينَكَ اللَّهُ بِهِ مَنْ خَتَمَ الْقُرْآنَ فَكَأَنَّمَا أُدْرِجَتِ النُّبُوَّةُ بَيْنَ جَنْبَيْهِ وَ لَكِنَّهُ لَا يُوحَى إِلَيْهِ وَ مَنْ جَمَعَ الْقُرْآنَ فَنَوْلُهُ لَا يَجْهَلُ مَعَ مَنْ يَجْهَلُ عَلَيْهِ وَ لَا يَغْضَبُ فِيمَنْ يَغْضَبُ عَلَيْهِ وَ لَا يَحِدُّ فِيمَنْ يَحِدُّ وَ لَكِنَّهُ يَعْفُو وَ يَصْفَحُ وَ يَغْفِرُ وَ يَحْلُمُ لِتَعْظِيمِ الْقُرْآنِ",
    translationUr: "اے حاملِ قرآن! اس کے ذریعے تواضع اختیار کرو، اللہ تمہیں بلند کرے گا؛ اس کے ذریعے بڑائی نہ جتاؤ، ورنہ اللہ تمہیں پست کردے گا۔ اے حاملِ قرآن! اللہ کے لیے اس سے آراستہ ہو، اللہ تمہیں اس کے ذریعے آراستہ کرے گا؛ لوگوں کے لیے اس سے آراستہ نہ ہو، ورنہ اللہ تمہیں اس کے ذریعے بدنما کردے گا۔ جس نے قرآن ختم کیا، گویا نبوت اس کے دونوں پہلوؤں کے درمیان رکھ دی گئی، البتہ اس کی طرف وحی نہیں آتی۔ جس نے قرآن جمع کیا، اسے چاہیے کہ اس کے ساتھ جہالت کرنے والے کے ساتھ جہالت نہ کرے، اس پر غصہ کرنے والے پر غصہ نہ کرے، اور تندی کرنے والے کے ساتھ تندی نہ کرے؛ بلکہ قرآن کی تعظیم میں معاف کرے، درگزر کرے، بخشے اور بردباری اختیار کرے۔",
    translationEn: "O bearer of the Qur'an, be humble through it and God will raise you; do not use it to claim superiority, lest God abase you. O bearer of the Qur'an, adorn yourself with it for God and God will adorn you through it; do not adorn yourself with it for people, lest God disfigure you through it. Whoever completes the Qur'an, it is as though prophethood has been placed between their sides, although they receive no revelation. Whoever gathers the Qur'an should not behave ignorantly towards one who treats them ignorantly, be angry with one who is angry with them, or act harshly towards one who acts harshly. Rather, out of reverence for the Qur'an, they should pardon, overlook, forgive, and show forbearance.",
    translationStatus: "editorial",
    translationArabic: "يَا حَامِلَ الْقُرْآنِ تَوَاضَعْ بِهِ يَرْفَعْكَ اللَّهُ وَ لَا تَعَزَّزْ بِهِ فَيُذِلَّكَ اللَّهُ يَا حَامِلَ الْقُرْآنِ تَزَيَّنْ بِهِ لِلَّهِ يُزَيِّنْكَ اللَّهُ بِهِ وَ لَا تَزَيَّنْ بِهِ لِلنَّاسِ فَيَشِينَكَ اللَّهُ بِهِ مَنْ خَتَمَ الْقُرْآنَ فَكَأَنَّمَا أُدْرِجَتِ النُّبُوَّةُ بَيْنَ جَنْبَيْهِ وَ لَكِنَّهُ لَا يُوحَى إِلَيْهِ وَ مَنْ جَمَعَ الْقُرْآنَ فَنَوْلُهُ لَا يَجْهَلُ مَعَ مَنْ يَجْهَلُ عَلَيْهِ وَ لَا يَغْضَبُ فِيمَنْ يَغْضَبُ عَلَيْهِ وَ لَا يَحِدُّ فِيمَنْ يَحِدُّ وَ لَكِنَّهُ يَعْفُو وَ يَصْفَحُ وَ يَغْفِرُ وَ يَحْلُمُ لِتَعْظِيمِ الْقُرْآنِ",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
    verifiedReferenceUr: "الکافی، ج2، ص604، باب فضل حامل القرآن، ح5۔",
    verifiedReferenceEn: "Al-Kafi, vol. 2, p. 604, chapter on the merit of the bearer of the Qur'an, hadith 5.",
    verifiedSourceUrl: "https://lib.eshia.ir/11005/2/604",
    verificationWitnessId: "eshia-kafi-2-604-5",
    witnesses: [
      {
        id: "eshia-kafi-2-604-5",
        role: "verification-source",
        sourceTitleUr: "الکافی",
        sourceTitleEn: "Al-Kafi",
        sourceUrl: "https://lib.eshia.ir/11005/2/604",
        citation: {
          bookUr: "الکافی",
          bookEn: "Al-Kafi",
          volume: 2,
          page: 604,
          chapterUr: "باب فضل حامل القرآن",
          chapterEn: "Chapter on the merit of the bearer of the Qur'an",
          hadithNumber: "5",
        },
        exactArabic:
          "يَا حَامِلَ الْقُرْآنِ تَوَاضَعْ بِهِ يَرْفَعْكَ اللَّهُ وَ لَا تَعَزَّزْ بِهِ فَيُذِلَّكَ اللَّهُ يَا حَامِلَ الْقُرْآنِ تَزَيَّنْ بِهِ لِلَّهِ يُزَيِّنْكَ اللَّهُ بِهِ وَ لَا تَزَيَّنْ بِهِ لِلنَّاسِ فَيَشِينَكَ اللَّهُ بِهِ مَنْ خَتَمَ الْقُرْآنَ فَكَأَنَّمَا أُدْرِجَتِ النُّبُوَّةُ بَيْنَ جَنْبَيْهِ وَ لَكِنَّهُ لَا يُوحَى إِلَيْهِ وَ مَنْ جَمَعَ الْقُرْآنَ فَنَوْلُهُ لَا يَجْهَلُ مَعَ مَنْ يَجْهَلُ عَلَيْهِ وَ لَا يَغْضَبُ فِيمَنْ يَغْضَبُ عَلَيْهِ وَ لَا يَحِدُّ فِيمَنْ يَحِدُّ وَ لَكِنَّهُ يَعْفُو وَ يَصْفَحُ وَ يَغْفِرُ وَ يَحْلُمُ لِتَعْظِيمِ الْقُرْآنِ",
        textVerified: true,
        note:
          "The old dossier used an ellipsis between two clauses; this record restores the complete contiguous source passage between them.",
      },
    ],
  },
  {
    id: "quran-hidayat-kafi-2-602-13",
    topicIds: ["quran-hidayat"],
    dossierPrimaryTextId: "quran-hidayat-companionship",
    attributedToUr: "امام زین العابدینؑ",
    attributedToEn: "Imam Zayn al-Abidin",
    sourceTitleUr: "الکافی",
    sourceTitleEn: "Al-Kafi",
    citedReferenceUr: "الکافی، ج2، ص602، ح13۔",
    citedReferenceEn: "Al-Kafi, vol. 2, p. 602, hadith 13.",
    sourceUrl: "https://lib.eshia.ir/11005/2/602",
    candidateArabic:
      "لو مات من بين المشرق والمغرب لما استوحشت بعد أن يكون القرآن معي.",
    status: "verified",
    exactArabic:
      "لَوْ مَاتَ مَنْ بَيْنَ الْمَشْرِقِ وَ الْمَغْرِبِ لَمَا اسْتَوْحَشْتُ بَعْدَ أَنْ يَكُونَ الْقُرْآنُ مَعِي",
    translationUr: "اگر مشرق و مغرب کے درمیان سب لوگ مر جائیں تو بھی، جب تک قرآن میرے ساتھ ہو، مجھے تنہائی کا خوف نہ ہوگا۔",
    translationEn: "Even if everyone between east and west were to die, I would not feel desolate so long as the Qur'an was with me.",
    translationStatus: "editorial",
    translationArabic: "لَوْ مَاتَ مَنْ بَيْنَ الْمَشْرِقِ وَ الْمَغْرِبِ لَمَا اسْتَوْحَشْتُ بَعْدَ أَنْ يَكُونَ الْقُرْآنُ مَعِي",
    translationSourceLabelUr: "قلم ورکس — تدوینی ترجمہ",
    translationSourceLabelEn: "Qalam Works — editorial translation",
    verifiedReferenceUr: "الکافی، ج2، ص602، ح13۔",
    verifiedReferenceEn: "Al-Kafi, vol. 2, p. 602, hadith 13.",
    verifiedSourceUrl: "https://lib.eshia.ir/11005/2/602",
    verificationWitnessId: "eshia-kafi-2-602-13",
    witnesses: [
      {
        id: "eshia-kafi-2-602-13",
        role: "verification-source",
        sourceTitleUr: "الکافی",
        sourceTitleEn: "Al-Kafi",
        sourceUrl: "https://lib.eshia.ir/11005/2/602",
        citation: {
          bookUr: "الکافی",
          bookEn: "Al-Kafi",
          volume: 2,
          page: 602,
          hadithNumber: "13",
        },
        exactArabic:
          "لَوْ مَاتَ مَنْ بَيْنَ الْمَشْرِقِ وَ الْمَغْرِبِ لَمَا اسْتَوْحَشْتُ بَعْدَ أَنْ يَكُونَ الْقُرْآنُ مَعِي",
        textVerified: true,
        note:
          "The source continues with Imam al-Sajjad's repeated recitation of «مالك يوم الدين»; the dossier uses only the opening companionship clause.",
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
    errors.push(...validateHadithTranslation(record));
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

export type DossierHadithVerificationState =
  | "verified"
  | "pending"
  | "untracked";

export function dossierHadithVerificationState(
  dossierPrimaryTextId: string,
): DossierHadithVerificationState {
  const record = hadithRecordForDossierText(dossierPrimaryTextId);
  if (!record) return "untracked";
  return verifiedHadithForDossierText(dossierPrimaryTextId)
    ? "verified"
    : "pending";
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
    ? { ...record, translationUr: undefined, translationEn: undefined, translationStatus: undefined, translationSourceLabelUr: undefined, translationSourceLabelEn: undefined, ...hadithTranslationFields(record) }
    : null;
}
