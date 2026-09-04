"use client";

import { useLanguage } from "@/app/lib/language-context";
import type { DateProfile } from "@/app/tools/date-converter/utils/dateProfile";
import {
  GREGORIAN_MONTHS_EN,
  GREGORIAN_MONTHS_UR,
  HIJRI_MONTHS_EN,
  HIJRI_MONTHS_UR,
  gregorianToJDN,
} from "@/app/tools/date-converter/utils/dateEngine";

const COPY = {
  en: {
    title: "Regional context",
    calculated: "Calculated Hijri result",
    reference: "Regional reference",
    difference: "Difference",
    confidence: "Confidence",
    empty: "No verified regional historical reference is available for this date.",
    day: "day",
    days: "days",
  },
  ur: {
    title: "علاقائی تناظر",
    calculated: "حسابی ہجری نتیجہ",
    reference: "علاقائی حوالہ",
    difference: "فرق",
    confidence: "اعتماد",
    empty: "اس تاریخ کے لیے کوئی تصدیق شدہ علاقائی تاریخی حوالہ دستیاب نہیں۔",
    day: "دن",
    days: "دن",
  },
};

function differenceDays(profile: DateProfile) {
  const reference = profile.regionalReference?.gregorianDate;
  if (!reference) return null;
  return Math.abs(
    gregorianToJDN(reference.year, reference.month, reference.day) -
      gregorianToJDN(profile.gregorian.year, profile.gregorian.month, profile.gregorian.day),
  );
}

export function RegionalContextCard({ profile }: { profile: DateProfile }) {
  const { language, dir } = useLanguage();
  const lang = language as "en" | "ur";
  const t = COPY[lang];
  const r = profile.regionalReference;
  const hijriMonths = lang === "ur" ? HIJRI_MONTHS_UR : HIJRI_MONTHS_EN;
  const gregMonths = lang === "ur" ? GREGORIAN_MONTHS_UR : GREGORIAN_MONTHS_EN;
  const naskh = lang === "ur" ? "font-naskh" : "";
  const difference = differenceDays(profile);
  const calculated = `${profile.hijri.day} ${hijriMonths[profile.hijri.month - 1]} ${profile.hijri.year}${lang === "ur" ? " ھ" : " AH"}`;

  return (
    <section className="rounded-2xl border border-[#1A3A2A]/10 bg-white p-5 shadow-sm dark:border-[#2a3d30] dark:bg-[#162a1e]" dir={dir}>
      <h2 className={`text-lg font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${naskh}`}>{t.title}</h2>

      <div className="mt-4 rounded-xl bg-[#F7F5EF] p-4 dark:bg-[#0e1c15]">
        <p className={`text-xs font-bold text-[#68806f] dark:text-[#a8c8b0] ${naskh}`}>{t.calculated}</p>
        <p className={`mt-1 text-lg font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${naskh}`}>{calculated}</p>
      </div>

      {!r ? (
        <p className={`mt-4 rounded-xl border border-dashed border-[#1A3A2A]/15 px-4 py-4 text-sm text-[#4a6a4a] dark:border-[#35513d] dark:text-[#a8c8b0] ${naskh}`}>
          {t.empty}
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[#1A3A2A]/8 p-3 dark:border-[#35513d]">
            <p className={`text-xs font-bold text-[#68806f] ${naskh}`}>{t.reference}</p>
            <p className={`mt-1 text-sm font-semibold text-[#1A3A2A] dark:text-[#e8ede9] ${naskh}`}>
              {r.gregorianDate.day} {gregMonths[r.gregorianDate.month - 1]} {r.gregorianDate.year}
            </p>
            <p className={`mt-1 text-xs text-[#68806f] ${naskh}`}>{lang === "ur" ? r.sourceLabel.ur : r.sourceLabel.en}</p>
          </div>

          <div className="rounded-xl border border-[#1A3A2A]/8 p-3 dark:border-[#35513d]">
            <p className={`text-xs font-bold text-[#68806f] ${naskh}`}>{t.difference}</p>
            <p className={`mt-1 text-lg font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${naskh}`}>
              {difference} {difference === 1 ? t.day : t.days}
            </p>
          </div>

          <div className="rounded-xl border border-[#1A3A2A]/8 p-3 dark:border-[#35513d]">
            <p className={`text-xs font-bold text-[#68806f] ${naskh}`}>{t.confidence}</p>
            <span className={`mt-2 inline-flex rounded-full bg-[#E7EFE8] px-3 py-1 text-xs font-bold text-[#31533d] dark:bg-[#1e3527] dark:text-[#b8d4bc] ${naskh}`}>
              {r.confidence}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
