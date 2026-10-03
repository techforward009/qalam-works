export type IslamicSourceRole =
  | "primary-text-library"
  | "scholarly-library"
  | "translation-library"
  | "speaker-corpus";

export type IslamicSourceProvider = {
  id: string;
  nameUr: string;
  nameEn: string;
  baseUrl: string;
  roles: readonly IslamicSourceRole[];
  languages: readonly string[];
  strengthsUr: readonly string[];
  strengthsEn: readonly string[];
  verificationUr: string;
  verificationEn: string;
};

export const ISLAMIC_SOURCE_PROVIDERS: readonly IslamicSourceProvider[] = [
  {
    id: "eshia-library",
    nameUr: "کتابخانه مدرسہ فقاہت",
    nameEn: "eShia / Madrasah-e-Fiqh Library",
    baseUrl: "https://lib.eshia.ir/",
    roles: ["primary-text-library", "scholarly-library"],
    languages: ["ar", "fa"],
    strengthsUr: [
      "عربی اور فارسی شیعہ کتب کا بڑا متنی ذخیرہ",
      "حدیث، رجال، تفسیر، عقائد، سیرت، تاریخ، فقہ اور اصول کی کتب",
      "کتاب، جلد اور صفحہ کی سطح پر قابلِ حوالہ متنی صفحات",
      "متعدد معروف حدیثی مصادر اور مختلف طبعات تک رسائی",
    ],
    strengthsEn: [
      "Large Arabic and Persian Shi'i text library",
      "Hadith, rijal, tafsir, doctrine, seerah, history, fiqh, and usul",
      "Book/volume/page-level text pages suitable for precise citation",
      "Multiple major hadith collections and editions",
    ],
    verificationUr:
      "اسے اصل متن اور مطبوعہ حوالہ تلاش کرنے کے لیے ترجیحی ذخیرہ سمجھیں، لیکن کتاب کی شناخت، طبعت، جلد، صفحہ اور عبارت کو الگ الگ محفوظ کریں۔ محض کسی مجموعے میں موجود ہونا روایت کی سند یا صحت کا خودکار فیصلہ نہیں ہے۔",
    verificationEn:
      "Prefer it for locating original text and printed references, while preserving book identity, edition, volume, page, and exact wording separately. Presence in a digital library does not itself establish hadith authenticity.",
  },
  {
    id: "al-islam",
    nameUr: "الاسلام ڈاٹ آرگ",
    nameEn: "Al-Islam.org",
    baseUrl: "https://al-islam.org/",
    roles: ["scholarly-library", "translation-library", "primary-text-library"],
    languages: ["en", "ar", "fa"],
    strengthsUr: [
      "شیعہ علماء اور مصنفین کی منظم کتابیں اور مقالات",
      "انگریزی تراجم اور موضوعاتی علمی مواد",
      "صحیفہ، رسالۃ الحقوق اور دیگر بنیادی متون کے قابلِ مطالعہ نسخے",
    ],
    strengthsEn: [
      "Structured books and articles by Shi'i scholars and authors",
      "English translations and thematic scholarly material",
      "Readable editions of foundational texts such as Sahifa and Risalat al-Huquq",
    ],
    verificationUr:
      "ترجمہ یا ثانوی علمی تشریح کے لیے مفید ہے۔ جہاں اصل عربی عبارت یا دقیق مطبوعہ حوالہ درکار ہو وہاں بنیادی کتاب یا متنی ذخیرے سے تقابل کیا جائے۔",
    verificationEn:
      "Useful for translations and secondary scholarly explanation. When exact Arabic wording or a precise printed citation is needed, cross-check against the primary book or a text library.",
  },
];

export function sourceProviderForUrl(url?: string): IslamicSourceProvider | null {
  if (!url) return null;

  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }

  if (host === "lib.eshia.ir" || host.endsWith(".lib.eshia.ir")) {
    return ISLAMIC_SOURCE_PROVIDERS.find((item) => item.id === "eshia-library") ?? null;
  }

  if (host === "al-islam.org" || host.endsWith(".al-islam.org")) {
    return ISLAMIC_SOURCE_PROVIDERS.find((item) => item.id === "al-islam") ?? null;
  }

  return null;
}

export function preferredIslamicDiscoveryProviders(): readonly IslamicSourceProvider[] {
  return ISLAMIC_SOURCE_PROVIDERS;
}
