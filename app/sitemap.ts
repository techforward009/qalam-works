import type { MetadataRoute } from "next";

import { calendarYear, hijriYear } from "./lib/toolCatalog";

const BASE = "https://www.qalamworks.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/calendar/${calendarYear}`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/hijri/${hijriYear}`, changeFrequency: "monthly", priority: 0.7 },
    { url: BASE, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/services`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/contact`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/tools`,                 changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/tools/document-studio`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/tools/translation-studio`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/tools/roman-urdu-writer`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/tools/urdu-roman-writer`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/tools/document-cleaner`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/tools/quality-checker`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/tools/unicode-standardizer`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/tools/arabic-diacritics`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/quran`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/quran/indopak-digital-khatt/1/1`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/quran/madinah/1/1`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/quran/ahmedgraf/1/1`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/tools/invoice-generator`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/tools/date-converter`,    changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/tools/crescent-visibility`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/tools/calendar-maker`,    changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/tools/whatsapp-rtl-formatter`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/tools/urdu-text-to-pdf`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/tools/roman-urdu-to-urdu`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/tools/hijri-to-gregorian`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE}/terms`, changeFrequency: "yearly", priority: 0.4 },
  ];
}
