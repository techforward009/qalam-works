"use client";

import { useMemo, useState } from "react";
import type { DisplayHijriPolicy } from "@/app/tools/date-converter/utils/hijri-authority/displayHijriDate";
import { useLanguage } from "@/app/lib/language-context";
import {
  GREGORIAN_MONTH_LABELS,
  buildCalendarMonth,
  type CalendarContentMode,
} from "@/app/tools/calendar-maker/utils/calendarModel";
import { MonthCalendar } from "./MonthCalendar";

const COPY = {
  en: { gregorian: "Gregorian", combined: "Pakistan — Gregorian + Hijri", pakistan: "Pakistan", tabular: "Calculated only", note: "Pakistan: reviewed official dates take priority. * marks calculated dates where no official decision has been verified." },
  ur: { gregorian: "عیسوی", combined: "پاکستانی تقویم (عیسوی + ہجری)", pakistan: "پاکستان", tabular: "صرف حسابی", note: "پاکستان: مصدقہ سرکاری تاریخ کو ترجیح دی گئی ہے۔ * نشان والی تاریخیں حسابی ہیں؛ ان کی سرکاری تصدیق دستیاب نہیں۔" },
};

export function CalendarMonthExplorer({ year, month }: { year: number; month: number }) {
  const { language, dir } = useLanguage();
  const lang = language as "en" | "ur";
  const t = COPY[lang];
  const [mode, setMode] = useState<CalendarContentMode>("gregorian-hijri");
  const [hijriPolicy, setHijriPolicy] = useState<DisplayHijriPolicy>("pakistan");

  const displayMonth = useMemo(
    () => buildCalendarMonth(year, month, mode, "monday", 0, hijriPolicy),
    [year, month, mode, lang, hijriPolicy],
  );

  return (
    <div dir={dir}>
      <div className="mb-4 inline-flex rounded-lg border border-[#1A3A2A]/15 bg-white p-1 dark:border-[#35513d] dark:bg-[#0e1c15]">
        <button type="button" onClick={() => setMode("gregorian")} aria-pressed={mode === "gregorian"} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${mode === "gregorian" ? "bg-[#1A3A2A] text-white" : "text-[#1A3A2A] dark:text-[#e8ede9]"} ${lang === "ur" ? "font-naskh" : ""}`}>{t.gregorian}</button>
        <button type="button" onClick={() => setMode("gregorian-hijri")} aria-pressed={mode === "gregorian-hijri"} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${mode === "gregorian-hijri" ? "bg-[#1A3A2A] text-white" : "text-[#1A3A2A] dark:text-[#e8ede9]"} ${lang === "ur" ? "font-naskh" : ""}`}>{t.combined}</button>
      </div>
      {mode === "gregorian-hijri" && (
        <div className={`mb-3 space-y-2 text-sm ${lang === "ur" ? "font-naskh" : ""}`}>
          <p className="font-semibold text-[#1A3A2A] dark:text-[#e8ede9]">
            {hijriPolicy === "pakistan"
              ? (lang === "ur" ? "پاکستانی ہجری تقویم" : "Pakistan Hijri calendar")
              : (lang === "ur" ? "حسابی تقویم — تحقیقی مطالعہ" : "Calculated calendar — research view")}
          </p>
          <p className="text-[#4a6a4a] dark:text-[#a8c8b0]">
            {hijriPolicy === "pakistan"
              ? t.note
              : (lang === "ur" ? "اس اضافی منظر میں حسابی تاریخیں دکھائی گئی ہیں۔" : "This optional view displays calculated dates.")}
          </p>
          <details className="rounded-lg border border-[#1A3A2A]/10 p-2 dark:border-[#35513d]">
            <summary className="cursor-pointer text-xs text-[#4a6a4a] dark:text-[#a8c8b0]">
              {lang === "ur" ? "اضافی حسابی طریقہ (تحقیق کے لیے)" : "Additional calculated method (research)"}
            </summary>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="button" aria-pressed={hijriPolicy === "pakistan"}
                onClick={() => setHijriPolicy("pakistan")}
                className={`rounded-lg border px-3 py-1.5 ${hijriPolicy === "pakistan" ? "bg-[#1A3A2A] text-white" : ""}`}>
                {t.pakistan}
              </button>
              <button type="button" aria-pressed={hijriPolicy === "tabular"}
                onClick={() => setHijriPolicy("tabular")}
                className={`rounded-lg border px-3 py-1.5 ${hijriPolicy === "tabular" ? "bg-[#1A3A2A] text-white" : ""}`}>
                {t.tabular}
              </button>
            </div>
          </details>
        </div>
      )}
      <MonthCalendar
        month={displayMonth}
        title={`${GREGORIAN_MONTH_LABELS[lang][month - 1]} ${year}`}
        language={lang}
        weekStart="monday"
        showHijri={mode === "gregorian-hijri"}
        hijriPolicy={hijriPolicy}
      />
    </div>
  );
}
