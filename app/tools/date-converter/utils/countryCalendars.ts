/**
 * Qalam Works Date Converter — Country Calendar Context
 *
 * This file provides contextual metadata about how different countries
 * determine Hijri dates. It does NOT change the conversion calculation.
 *
 * Conversion results are always produced by the deterministic tabular engine
 * in dateEngine.ts. Country selection adds regional context only.
 */

/** How a country determines its official Hijri date. */
export type HijriMethod =
  | "observational"         // actual moon sighting — date is announced after sighting
  | "umm-al-qura"           // astronomical calculation used by Saudi Arabia officially
  | "observational-varying" // moon sighting but differs by state/organization
  | "solar-hijri-civil";    // Solar Hijri used as the official civil calendar; lunar Hijri for religious use

export interface CountryCalendarInfo {
  id: string;
  name: { en: string; ur: string };
  hijriMethod: HijriMethod;
  /** Explains how/why the calculated result may differ in this country. */
  hijriNote:    { en: string; ur: string };
  /** Optional note about official calendar usage in this country. */
  officialNote?: { en: string; ur: string };
}

export const COUNTRY_CALENDARS: CountryCalendarInfo[] = [
  {
    id: "pk",
    name: { en: "Pakistan", ur: "پاکستان" },
    hijriMethod: "observational",
    hijriNote: {
      en: "Pakistan determines Hijri dates by actual moon sighting, announced by the Ruet-e-Hilal Committee. The calculated result shown here may differ by 1 day from the officially declared date.",
      ur: "پاکستان میں ہجری تاریخ کا تعین رویتِ ہلال کمیٹی کی چاند دیکھنے کی تصدیق سے ہوتا ہے۔ یہاں دکھایا گیا حسابی نتیجہ سرکاری اعلان سے ایک دن آگے یا پیچھے ہو سکتا ہے۔",
    },
  },
  {
    id: "in",
    name: { en: "India", ur: "بھارت" },
    hijriMethod: "observational",
    hijriNote: {
      en: "India uses local moon sighting for Islamic dates. The date may differ by 1 day from this calculation, and can also vary between regions or communities.",
      ur: "بھارت میں اسلامی تاریخ مقامی رویتِ ہلال پر منحصر ہے۔ حسابی نتیجے سے ایک دن کا فرق ممکن ہے، اور مختلف علاقوں یا جماعتوں کے درمیان بھی تفاوت ہو سکتا ہے۔",
    },
  },
  {
    id: "af",
    name: { en: "Afghanistan", ur: "افغانستان" },
    hijriMethod: "solar-hijri-civil",
    hijriNote: {
      en: "Afghanistan uses actual moon sighting for Hijri dates. Solar Hijri (Afghan calendar) is also widely used for civil purposes, where 1 Hamal typically falls around 21 March.",
      ur: "افغانستان میں ہجری تاریخ کا تعین چاند نظر آنے سے ہوتا ہے۔ ہجری شمسی (افغان تقویم) بھی سرکاری مقاصد کے لیے بڑے پیمانے پر استعمال ہوتی ہے — 1 حمل عموماً 21 مارچ کے آس پاس پڑتا ہے۔",
    },
    officialNote: {
      en: "Afghanistan uses Solar Hijri as its civil calendar (the Afghan Solar Calendar). The Hijri lunar calendar is used for religious observances.",
      ur: "افغانستان سرکاری تقویم کے طور پر ہجری شمسی (افغان شمسی تقویم) استعمال کرتا ہے۔ ہجری قمری تقویم مذہبی مناسبتوں کے لیے استعمال ہوتی ہے۔",
    },
  },
  {
    id: "ir",
    name: { en: "Iran", ur: "ایران" },
    hijriMethod: "solar-hijri-civil",
    hijriNote: {
      en: "Iran's official civil calendar is Solar Hijri (Persian/Jalali). The Hijri lunar calendar is used for Islamic religious dates, determined by moon sighting. Solar Hijri dates here use an arithmetic 33-year cycle and may differ by 1 day from Iran's astronomical calculation.",
      ur: "ایران کی سرکاری تقویم ہجری شمسی (فارسی/جلالی) ہے۔ ہجری قمری تقویم اسلامی مذہبی تاریخوں کے لیے رویتِ ہلال سے طے ہوتی ہے۔ یہاں ہجری شمسی تاریخیں 33 سالہ حسابی دور پر مبنی ہیں اور ایران کے فلکیاتی حساب سے ایک دن کا فرق ممکن ہے۔",
    },
    officialNote: {
      en: "Iran uses Solar Hijri as its official civil calendar. The Persian New Year (Nowruz) falls on the vernal equinox, typically 20–21 March in the Gregorian calendar.",
      ur: "ایران ہجری شمسی کو سرکاری تقویم کے طور پر استعمال کرتا ہے۔ فارسی نئے سال (نوروز) کا آغاز بہاری اعتدال سے ہوتا ہے جو عموماً عیسوی کیلنڈر میں 20–21 مارچ کو پڑتا ہے۔",
    },
  },
  {
    id: "tj",
    name: { en: "Tajikistan", ur: "تاجکستان" },
    hijriMethod: "observational",
    hijriNote: {
      en: "Tajikistan uses the Gregorian calendar officially. Solar Hijri and Hijri lunar dates are used culturally and for Islamic observances. Moon sighting determines religious Hijri dates; a 1-day variation from this calculation is common.",
      ur: "تاجکستان سرکاری طور پر عیسوی تقویم استعمال کرتا ہے۔ ہجری شمسی اور ہجری قمری تاریخیں ثقافتی اور اسلامی مواقع کے لیے استعمال ہوتی ہیں۔ مذہبی ہجری تاریخوں کا تعین رویتِ ہلال سے ہوتا ہے اور حسابی نتیجے سے ایک دن کا فرق ممکن ہے۔",
    },
  },
  {
    id: "sa",
    name: { en: "Saudi Arabia", ur: "سعودی عرب" },
    hijriMethod: "umm-al-qura",
    hijriNote: {
      en: "Saudi Arabia officially uses the Umm al-Qura calendar, based on astronomical calculation of the new moon. The civil tabular method used here may differ by 1 day.",
      ur: "سعودی عرب سرکاری طور پر ام القریٰ تقویم استعمال کرتا ہے جو ہلالِ جدید کے فلکیاتی حساب پر مبنی ہے۔ یہاں استعمال شدہ مدنی حسابی طریقے سے ایک دن کا فرق ممکن ہے۔",
    },
    officialNote: {
      en: "The Umm al-Qura calendar is Saudi Arabia's official Islamic calendar, used for civil, administrative, and religious scheduling.",
      ur: "ام القریٰ سعودی عرب کی سرکاری اسلامی تقویم ہے جو سرکاری، انتظامی اور مذہبی شیڈولنگ کے لیے استعمال ہوتی ہے۔",
    },
  },
];

/** Map from id → entry for fast lookup. */
export const COUNTRY_MAP = new Map(
  COUNTRY_CALENDARS.map(c => [c.id, c])
);

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
