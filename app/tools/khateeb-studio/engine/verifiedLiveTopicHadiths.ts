import type { KhateebResearchEvidence } from "./researchTypes";

export type VerifiedLiveTopicHadith = {
  id: string;
  topicId: string;
  aliases: readonly string[];
  titleUr: string;
  titleEn: string;
  attributedToUr: string;
  attributedToEn: string;
  exactArabic: string;
  explanationUr: string;
  explanationEn: string;
  citationUr: string;
  citationEn: string;
  sourceUrl: string;
  providerId: string;
  sourceWitness: {
    bookUr: string;
    bookEn: string;
    volume: number;
    page: number;
    chapterUr: string;
    chapterEn: string;
    hadithNumber: string;
  };
};

const KAFI_5_78 =
  "https://najafdesertlibrary.com/book/%D8%A7%D9%84%D9%83%D8%A7%D9%81%D9%8A/v/5/p/78";

export const VERIFIED_LIVE_TOPIC_HADITHS: readonly VerifiedLiveTopicHadith[] = [
  {
    id: "rizq-kafi-5-78-3",
    topicId: "rizq",
    aliases: [
      "رزق",
      "روزی",
      "معاش",
      "کسب حلال",
      "حلال روزی",
      "طلب رزق",
      "livelihood",
      "provision",
      "halal earning",
    ],
    titleUr: "رزق کے لیے عملی کوشش",
    titleEn: "Actively seeking provision",
    attributedToUr: "امام صادقؑ",
    attributedToEn: "Imam al-Sadiq",
    exactArabic:
      "كنا جلوسا عند أبي عبد الله عليه السلام إذ أقبل العلاء بن كامل فجلس قدام أبي عبد الله عليه السلام فقال: ادع الله أن يرزقني في دعة فقال: لا أدعو لك اطلب كما أمرك الله عز وجل.",
    explanationUr:
      "روایت دعا کے ساتھ عملی کوشش کی ضرورت واضح کرتی ہے؛ رزق کے باب میں سستی یا صرف تمنا پر اکتفا نہیں کیا جاتا۔",
    explanationEn:
      "The narration pairs reliance on God with active effort and rejects passive expectation in seeking livelihood.",
    citationUr: "الکافی، ج5، ص78، باب الحث على الطلب والتعرض للرزق، ح3۔",
    citationEn:
      "Al-Kafi, vol. 5, p. 78, chapter on seeking and exposing oneself to provision, hadith 3.",
    sourceUrl: KAFI_5_78,
    providerId: "najaf-desert-library",
    sourceWitness: {
      bookUr: "الکافی",
      bookEn: "Al-Kafi",
      volume: 5,
      page: 78,
      chapterUr: "باب الحث على الطلب والتعرض للرزق",
      chapterEn: "Chapter on seeking and exposing oneself to provision",
      hadithNumber: "3",
    },
  },
  {
    id: "rizq-kafi-5-78-4",
    topicId: "rizq",
    aliases: [
      "رزق",
      "روزی",
      "معاش",
      "کسب حلال",
      "طلب رزق",
      "livelihood",
      "provision",
      "earning",
    ],
    titleUr: "اہلِ خانہ کی کفالت بھی عبادت ہے",
    titleEn: "Supporting one's household is worship",
    attributedToUr: "امام صادقؑ",
    attributedToEn: "Imam al-Sadiq",
    exactArabic:
      "سأل أبو عبد الله عليه السلام عن رجل وأنا عنده فقيل له: أصابته الحاجة، قال: فما يصنع اليوم؟ قيل: في البيت يعبد ربه قال: فمن أين قوته؟ قيل: من عند بعض إخوانه فقال أبو عبد الله عليه السلام: والله للذي يقوته أشد عبادة منه.",
    explanationUr:
      "روایت عبادت اور معاش کو ایک دوسرے کی ضد نہیں بناتی؛ دوسروں پر بوجھ بننے کے بجائے ذمہ دارانہ کفالت کو دینی قدر کے طور پر پیش کرتی ہے۔",
    explanationEn:
      "The narration refuses to separate worship from responsible livelihood and values the one who supports another's sustenance.",
    citationUr: "الکافی، ج5، ص78، باب الحث على الطلب والتعرض للرزق، ح4۔",
    citationEn:
      "Al-Kafi, vol. 5, p. 78, chapter on seeking and exposing oneself to provision, hadith 4.",
    sourceUrl: KAFI_5_78,
    providerId: "najaf-desert-library",
    sourceWitness: {
      bookUr: "الکافی",
      bookEn: "Al-Kafi",
      volume: 5,
      page: 78,
      chapterUr: "باب الحث على الطلب والتعرض للرزق",
      chapterEn: "Chapter on seeking and exposing oneself to provision",
      hadithNumber: "4",
    },
  },
  {
    id: "rizq-kafi-5-78-5",
    topicId: "rizq",
    aliases: [
      "رزق",
      "روزی",
      "معاش",
      "کسب حلال",
      "حلال روزی",
      "گھر والوں کا خرچ",
      "livelihood",
      "provision",
      "family support",
    ],
    titleUr: "عزتِ نفس، اہلِ خانہ اور پڑوسی",
    titleEn: "Dignity, family, and neighbour",
    attributedToUr: "امام باقرؑ",
    attributedToEn: "Imam al-Baqir",
    exactArabic:
      "من طلب [الرزق في] الدنيا استعفافا عن الناس وتوسيعا على أهله وتعطفا على جاره لقى الله عز وجل يوم القيامة ووجهه مثل القمر ليلة البدر.",
    explanationUr:
      "کسب کو صرف ذاتی آمدن نہیں بلکہ عزتِ نفس، اہلِ خانہ کی وسعت اور پڑوسی سے حسنِ سلوک کے ساتھ جوڑا گیا ہے۔",
    explanationEn:
      "Earning is framed as preserving dignity, supporting one's family, and showing care toward one's neighbour.",
    citationUr: "الکافی، ج5، ص78، باب الحث على الطلب والتعرض للرزق، ح5۔",
    citationEn:
      "Al-Kafi, vol. 5, p. 78, chapter on seeking and exposing oneself to provision, hadith 5.",
    sourceUrl: KAFI_5_78,
    providerId: "najaf-desert-library",
    sourceWitness: {
      bookUr: "الکافی",
      bookEn: "Al-Kafi",
      volume: 5,
      page: 78,
      chapterUr: "باب الحث على الطلب والتعرض للرزق",
      chapterEn: "Chapter on seeking and exposing oneself to provision",
      hadithNumber: "5",
    },
  },
  {
    id: "rizq-kafi-5-78-6",
    topicId: "rizq",
    aliases: [
      "رزق",
      "روزی",
      "کسب حلال",
      "حلال روزی",
      "طلب الحلال",
      "halal earning",
      "lawful earning",
      "provision",
    ],
    titleUr: "طلبِ حلال کی فضیلت",
    titleEn: "The merit of seeking lawful earnings",
    attributedToUr: "رسول اکرمؐ",
    attributedToEn: "The Prophet",
    exactArabic:
      "قال رسول الله صلى الله عليه وآله: العبادة سبعون جزءا أفضلها طلب الحلال.",
    explanationUr:
      "یہ روایت طلبِ حلال کو عبادت کے بڑے ابواب میں شمار کرتی ہے اور رزق کی بحث کو واضح اخلاقی سمت دیتی ہے۔",
    explanationEn:
      "The narration places seeking lawful earnings among the highest forms of worship and gives livelihood a clear ethical direction.",
    citationUr: "الکافی، ج5، ص78، باب الحث على الطلب والتعرض للرزق، ح6۔",
    citationEn:
      "Al-Kafi, vol. 5, p. 78, chapter on seeking and exposing oneself to provision, hadith 6.",
    sourceUrl: KAFI_5_78,
    providerId: "najaf-desert-library",
    sourceWitness: {
      bookUr: "الکافی",
      bookEn: "Al-Kafi",
      volume: 5,
      page: 78,
      chapterUr: "باب الحث على الطلب والتعرض للرزق",
      chapterEn: "Chapter on seeking and exposing oneself to provision",
      hadithNumber: "6",
    },
  },
  {
    id: "rizq-kafi-5-78-7",
    topicId: "rizq",
    aliases: [
      "رزق",
      "روزی",
      "معاش",
      "طلب رزق",
      "کوشش",
      "livelihood",
      "provision",
      "seeking sustenance",
    ],
    titleUr: "مشکل حالات میں بھی طلبِ رزق",
    titleEn: "Seeking provision even in difficult conditions",
    attributedToUr: "امام صادقؑ",
    attributedToEn: "Imam al-Sadiq",
    exactArabic:
      "قال أبو عبد الله عليه السلام: يا هشام إن رأيت الصفين قد التقيا فلا تدع طلب الرزق في ذلك اليوم.",
    explanationUr:
      "روایت معاشی ذمہ داری میں جدوجہد اور تسلسل کی شدید تاکید کرتی ہے اور طلبِ رزق کو زندگی کی مستقل ذمہ داری کے طور پر سامنے لاتی ہے۔",
    explanationEn:
      "The narration strongly emphasizes persistence in livelihood and treats seeking provision as an ongoing responsibility even under severe conditions.",
    citationUr: "الکافی، ج5، ص78، باب الحث على الطلب والتعرض للرزق، ح7۔",
    citationEn:
      "Al-Kafi, vol. 5, p. 78, chapter on seeking and exposing oneself to provision, hadith 7.",
    sourceUrl: KAFI_5_78,
    providerId: "najaf-desert-library",
    sourceWitness: {
      bookUr: "الکافی",
      bookEn: "Al-Kafi",
      volume: 5,
      page: 78,
      chapterUr: "باب الحث على الطلب والتعرض للرزق",
      chapterEn: "Chapter on seeking and exposing oneself to provision",
      hadithNumber: "7",
    },
  },
];

function normalize(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ً-ٰٟ]/gu, "")
    .replace(/[أإآ]/gu, "ا")
    .replace(/ى/gu, "ی")
    .replace(/ي/gu, "ی")
    .replace(/ك/gu, "ک")
    .replace(/[^p{L}p{N}]+/gu, " ")
    .replace(/s+/gu, " ")
    .trim();
}

function matchesQuery(record: VerifiedLiveTopicHadith, query: string): boolean {
  const q = normalize(query);
  if (!q) return false;
  return record.aliases.some((alias) => {
    const a = normalize(alias);
    return a === q || q.includes(a) || (q.length >= 3 && a.includes(q));
  });
}

export function verifiedLiveHadithTopicIds(query: string): readonly string[] {
  return Array.from(
    new Set(
      VERIFIED_LIVE_TOPIC_HADITHS
        .filter((record) => matchesQuery(record, query))
        .map((record) => record.topicId),
    ),
  );
}

export function verifiedLiveHadithEvidenceForQuery(
  query: string,
  limit = 8,
): readonly KhateebResearchEvidence[] {
  return VERIFIED_LIVE_TOPIC_HADITHS
    .filter((record) => matchesQuery(record, query))
    .slice(0, Math.max(0, limit))
    .map((record) => ({
      id: `verified-live-hadith-${record.id}`,
      topicId: record.topicId,
      kind: "hadith" as const,
      status: "verified" as const,
      titleUr: `${record.attributedToUr} — ${record.titleUr}`,
      titleEn: `${record.attributedToEn} — ${record.titleEn}`,
      detailUr: record.explanationUr,
      detailEn: record.explanationEn,
      citationUr: record.citationUr,
      citationEn: record.citationEn,
      sourceUrl: record.sourceUrl,
      providerId: record.providerId,
      arabic: record.exactArabic,
      themesUr: ["رزق", "طلبِ حلال", "ذمہ دارانہ معاش"],
    }));
}

export function validateVerifiedLiveTopicHadiths(
  records: readonly VerifiedLiveTopicHadith[] = VERIFIED_LIVE_TOPIC_HADITHS,
): readonly string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const record of records) {
    if (ids.has(record.id)) errors.push(`duplicate id: ${record.id}`);
    ids.add(record.id);
    if (!record.exactArabic.trim()) errors.push(`${record.id}: missing exact text`);
    if (record.exactArabic.includes("...")) {
      errors.push(`${record.id}: exact text contains ellipsis`);
    }
    if (!record.sourceUrl.startsWith("https://")) {
      errors.push(`${record.id}: source URL must be https`);
    }
    if (
      record.sourceWitness.volume !== 5 ||
      record.sourceWitness.page !== 78 ||
      !record.sourceWitness.hadithNumber
    ) {
      errors.push(`${record.id}: source witness metadata incomplete`);
    }
    if (!record.aliases.length) errors.push(`${record.id}: aliases missing`);
  }

  return errors;
}
