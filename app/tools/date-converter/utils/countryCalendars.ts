/**
 * Qalam Works country method catalogue — research context, not a date authority feed.
 * No country should inherit Pakistan's verified lunar data without its own evidence.
 * Sources here justify METHOD descriptions only; they do not supply daily dates.
 */
export type HijriMethod = "observational" | "umm-al-qura" | "observational-varying" | "solar-hijri-civil";
export interface CountryCalendarInfo {
  id: string;
  name: { en: string; ur: string };
  hijriMethod: HijriMethod;
  hijriNote: { en: string; ur: string };
  officialNote?: { en: string; ur: string };
  methodSource?: { url: string; label: { en: string; ur: string } };
}

export const COUNTRY_CALENDARS: CountryCalendarInfo[] = [
  {
    "id": "pk",
    "name": {
      "en": "Pakistan",
      "ur": "پاکستان"
    },
    "hijriMethod": "observational",
    "hijriNote": {
      "en": "The Central Ruet-e-Hilal Committee reviews crescent reports and announces official lunar months. Verified Pakistan dates take priority; when no official month is available the calculated result is labeled and may differ by more than one day.",
      "ur": "مرکزی رؤیتِ ہلال کمیٹی شہادتوں کی جانچ کے بعد قمری مہینے کا اعلان کرتی ہے۔ مصدقہ پاکستانی تاریخ کو ترجیح دی جاتی ہے؛ سرکاری ثبوت نہ ہو تو حسابی نتیجہ واضح لکھا جائے گا، جس میں ایک دن سے زیادہ فرق ہوسکتا ہے۔"
    },
    "methodSource": {
      "url": "https://mora.gov.pk/Detail/ZTNhOGU5YjEtZTBmMy00OWQ2LWJlNmMtNWUxNzBkNGJmY2Nl",
      "label": {
        "en": "Pakistan Ministry of Religious Affairs",
        "ur": "پاکستان کی وزارتِ مذہبی امور"
      }
    }
  },
  {
    "id": "in",
    "name": {
      "en": "India",
      "ur": "بھارت"
    },
    "hijriMethod": "observational-varying",
    "hijriNote": {
      "en": "Different regional crescent-sighting committees and community institutions declare dates. No single nationwide lunar decision applies to every community. Select a local authority; a generic calculated date is not an official Indian date.",
      "ur": "بھارت میں مختلف علاقائی رؤیتِ ہلال کمیٹیاں اور مذہبی ادارے اعلان کرتے ہیں۔ پورے ملک کی تمام جماعتوں کے لیے ایک ہی اعلان لازم نہیں۔ متعلقہ ادارے کے بغیر حسابی تاریخ کو سرکاری تاریخ نہیں کہا جاسکتا۔"
    },
    "methodSource": {
      "url": "https://timesofindia.indiatimes.com/city/hyderabad/crescent-not-sighted-eid-now-on-saturday/articleshow/129686266.cms",
      "label": {
        "en": "Regional moon-sighting: Telangana 2026",
        "ur": "تلنگانہ کی علاقائی رؤیتِ ہلال، ۲۰۲۶ء"
      }
    }
  },
  {
    "id": "af",
    "name": {
      "en": "Afghanistan",
      "ur": "افغانستان"
    },
    "hijriMethod": "observational",
    "hijriNote": {
      "en": "The central crescent committee led by Afghanistan's Supreme Court reviews testimony from provinces and announces monthly lunar dates; calculations alone do not constitute official recognition.",
      "ur": "افغانستان میں سپریم کورٹ کی مرکزی رؤیتِ ہلال کمیٹی صوبوں سے موصول شہادتوں کے بعد قمری مہینے کا اعلان کرتی ہے۔ محض حسابی تاریخ سرکاری اعلان نہیں ہے۔"
    },
    "officialNote": {
      "en": "Current government guidance requires official correspondence to use the dates declared by the central crescent committee. Solar Hijri dating still appears in some institutions; it must not be presented as the sole current civil method.",
      "ur": "افغان حکومت نے سرکاری مراسلات میں مرکزی رؤیتِ ہلال کمیٹی کی تاریخ اختیار کرنے کی ہدایت دی ہے۔ بعض اداروں میں شمسی تاریخ بھی مستعمل ہے؛ اسے موجودہ واحد سرکاری طریقہ کہنا درست نہیں۔"
    },
    "methodSource": {
      "url": "https://www.mcit.gov.af/dr/اطلاعیه-کمیته-مرکزی-رؤیت-هلال-در-مورد-درج-تاریخ-در-امور-اداری",
      "label": {
        "en": "Afghanistan government: dating of official correspondence",
        "ur": "افغان حکومت: سرکاری مراسلات میں تاریخ کی ہدایت"
      }
    }
  },
  {
    "id": "ir",
    "name": {
      "en": "Iran",
      "ur": "ایران"
    },
    "hijriMethod": "solar-hijri-civil",
    "hijriNote": {
      "en": "The University of Tehran Calendar Center publishes Iran's official Solar Hijri calendar. Lunar religious dates depend on crescent observation, expert assessment and relevant religious authority; Qalam's simple arithmetic lunar method is not an official Iranian lunar calendar.",
      "ur": "ایران کی سرکاری شمسی تقویم تہران یونیورسٹی کا مرکزِ تقویم مرتب کرتا ہے۔ قمری مذہبی تاریخوں میں رؤیتِ ہلال، فلکیاتی جائزہ اور متعلقہ شرعی فیصلہ اہم ہیں۔ قلم کا سادہ قمری حساب ایران کی سرکاری قمری تاریخ نہیں۔"
    },
    "officialNote": {
      "en": "Iranian official civil dates are Solar Hijri, astronomically anchored to Nowruz. The Qalam Solar Hijri converter is an approximation, not the complete Iranian official calendar.",
      "ur": "ایران کی سرکاری شہری تقویم ہجری شمسی ہے، جس کی بنیاد نوروز اور فلکیاتی حساب پر ہے۔ قلم کی موجودہ شمسی تبدیلی ایک تقریب ہے، مکمل سرکاری ایرانی تقویم نہیں۔"
    },
    "methodSource": {
      "url": "https://calendar.ut.ac.ir/",
      "label": {
        "en": "University of Tehran Calendar Center",
        "ur": "تہران یونیورسٹی، مرکزِ تقویم"
      }
    }
  },
  {
    "id": "iq",
    "name": {
      "en": "Iraq",
      "ur": "عراق"
    },
    "hijriMethod": "observational-varying",
    "hijriNote": {
      "en": "Iraqi Sunni institutions and Shia marja' offices can declare different lunar starts. For Ramadan 1447 the Sunni Endowment announced 18 February 2026, but Ayatollah Sistani's Najaf office announced 19 February. Country selection alone cannot establish everyone's religious date.",
      "ur": "عراق میں سنی مذہبی اداروں اور شیعہ مراجع کے قمری اعلانات مختلف ہوسکتے ہیں۔ رمضان ۱۴۴۷ھ میں سنی اوقاف نے ۱۸ فروری جبکہ آیت اللہ سیستانی کے نجف دفتر نے ۱۹ فروری کو یکم رمضان قرار دیا۔ صرف ملک کے انتخاب سے ہر شخص کی شرعی تاریخ طے نہیں ہوتی۔"
    },
    "officialNote": {
      "en": "A marja's religious decision is distinct from a national civil calendar. Select the relevant religious authority before treating its date as applicable.",
      "ur": "مرجع کا شرعی اعلان اور ملکی سرکاری تقویم الگ ہیں۔ متعلقہ مرجع یا مذہبی ادارہ منتخب کیے بغیر ایک تاریخ سب پر لاگو نہ کی جائے۔"
    },
    "methodSource": {
      "url": "https://www.sistani.org/english/qa/01157/",
      "label": {
        "en": "Sayyid Sistani: proof of lunar crescent",
        "ur": "آیت اللہ سیستانی: ہلال کے ثبوت کا معیار"
      }
    }
  },
  {
    "id": "tj",
    "name": {
      "en": "Tajikistan",
      "ur": "تاجکستان"
    },
    "hijriMethod": "observational-varying",
    "hijriNote": {
      "en": "Tajikistan uses the Gregorian calendar officially. Religious lunar observances require local declarations and should not be equated with the unverified Qalam tabular date.",
      "ur": "تاجکستان میں سرکاری طور پر عیسوی تقویم استعمال ہوتی ہے۔ قمری مذہبی تاریخ کے لیے متعلقہ مقامی اعلان ضروری ہے؛ قلم کا غیر مصدقہ حساب سرکاری تاریخ نہیں۔"
    }
  },
  {
    "id": "sa",
    "name": {
      "en": "Saudi Arabia",
      "ur": "سعودی عرب"
    },
    "hijriMethod": "umm-al-qura",
    "hijriNote": {
      "en": "The Umm al-Qura astronomical calendar is used for scheduled Saudi civil Hijri dates. Ramadan and Eid announcements also involve the Saudi Supreme Court crescent-sighting process. The Qalam tabular calculation is neither.",
      "ur": "سعودی عرب میں ام القریٰ کی فلکیاتی تقویم سرکاری طے شدہ تاریخوں کے لیے استعمال ہوتی ہے، جبکہ رمضان اور عید کے اعلانات میں عدالتِ عظمیٰ کا رؤیتِ ہلال سے متعلق فیصلہ بھی اہم ہوتا ہے۔ قلم کے عام حساب کو ان دونوں کی جگہ نہ سمجھیں۔"
    },
    "officialNote": {
      "en": "Distinguish predicted Umm al-Qura dates from formal court decisions for observances.",
      "ur": "ام القریٰ کی پیشگی تاریخ اور مذہبی مواقع کے لیے عدالتی اعلان میں فرق واضح رکھیں۔"
    }
  }
];

export const COUNTRY_MAP = new Map(COUNTRY_CALENDARS.map(c => [c.id, c]));

/** Badge label for the Hijri method. */
export function methodLabel(
  method: HijriMethod,
  lang: "en" | "ur"
): string {
  if (lang === "ur") {
    if (method === "solar-hijri-civil")     return "ہجری شمسی (سرکاری) · قمری مذہبی";
    if (method === "umm-al-qura")           return "ام القریٰ (فلکیاتی)";
    if (method === "observational-varying") return "رویتِ ہلال (متغیر)";
    return "رویتِ ہلال";
  }
  if (method === "solar-hijri-civil")       return "Solar Hijri (civil) · lunar for religious use";
  if (method === "umm-al-qura")             return "Umm al-Qura (astronomical)";
  if (method === "observational-varying")   return "Moon sighting (varies by group)";
  return "Moon sighting";
}
