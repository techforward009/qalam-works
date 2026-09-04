"use client";

import { useLanguage } from "@/app/lib/language-context";
import type { DateProfile } from "@/app/tools/date-converter/utils/dateProfile";

const COPY = {
  en: {
    title: "Date facts",
    weekday: "Weekday",
    leap: "Leap year",
    dayOfYear: "Day of year",
    isoWeek: "ISO week",
    julian: "Julian day",
    yes: "Yes",
    no: "No",
  },
  ur: {
    title: "تاریخ کی معلومات",
    weekday: "ہفتے کا دن",
    leap: "لیپ سال",
    dayOfYear: "سال کا دن",
    isoWeek: "آئی ایس او ہفتہ",
    julian: "جولین دن",
    yes: "ہاں",
    no: "نہیں",
  },
};

export function DateFactsCard({ profile }: { profile: DateProfile }) {
  const { language, dir } = useLanguage();
  const lang = language as "en" | "ur";
  const t = COPY[lang];
  const naskh = lang === "ur" ? "font-naskh" : "";

  const facts = [
    { label: t.weekday, value: lang === "ur" ? profile.weekday.ur : profile.weekday.en },
    { label: t.leap, value: profile.leapYear ? t.yes : t.no },
    { label: t.dayOfYear, value: String(profile.dayOfYear) },
    { label: t.isoWeek, value: String(profile.isoWeek) },
    { label: t.julian, value: String(profile.julianDayNumber) },
  ];

  return (
    <section className="rounded-2xl border border-[#1A3A2A]/10 bg-white p-5 shadow-sm dark:border-[#2a3d30] dark:bg-[#162a1e]" dir={dir}>
      <h2 className={`text-lg font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${naskh}`}>{t.title}</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {facts.map((fact) => (
          <div key={fact.label} className="rounded-xl bg-[#F7F5EF] p-3 dark:bg-[#0e1c15]">
            <p className={`text-[10px] font-bold uppercase tracking-wide text-[#68806f] dark:text-[#a8c8b0] ${naskh}`}>{fact.label}</p>
            <p className={`mt-1 text-lg font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${naskh}`}>{fact.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
