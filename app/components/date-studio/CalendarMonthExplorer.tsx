"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/app/lib/language-context";
import {
  GREGORIAN_MONTH_LABELS,
  buildCalendarMonth,
  type CalendarContentMode,
} from "@/app/tools/calendar-maker/utils/calendarModel";
import { MonthCalendar } from "./MonthCalendar";

const COPY = {
  en: { gregorian: "Gregorian", combined: "Gregorian + Hijri" },
  ur: { gregorian: "عیسوی", combined: "عیسوی + ہجری" },
};

export function CalendarMonthExplorer({ year, month }: { year: number; month: number }) {
  const { language, dir } = useLanguage();
  const lang = language as "en" | "ur";
  const t = COPY[lang];
  const [mode, setMode] = useState<CalendarContentMode>("gregorian");

  const displayMonth = useMemo(
    () => buildCalendarMonth(year, month, mode, "monday"),
    [year, month, mode, lang],
  );

  return (
    <div dir={dir}>
      <div className="mb-4 inline-flex rounded-lg border border-[#1A3A2A]/15 bg-white p-1 dark:border-[#35513d] dark:bg-[#0e1c15]">
        <button type="button" onClick={() => setMode("gregorian")} aria-pressed={mode === "gregorian"} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${mode === "gregorian" ? "bg-[#1A3A2A] text-white" : "text-[#1A3A2A] dark:text-[#e8ede9]"} ${lang === "ur" ? "font-naskh" : ""}`}>{t.gregorian}</button>
        <button type="button" onClick={() => setMode("gregorian-hijri")} aria-pressed={mode === "gregorian-hijri"} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${mode === "gregorian-hijri" ? "bg-[#1A3A2A] text-white" : "text-[#1A3A2A] dark:text-[#e8ede9]"} ${lang === "ur" ? "font-naskh" : ""}`}>{t.combined}</button>
      </div>
      <MonthCalendar month={displayMonth} title={`${GREGORIAN_MONTH_LABELS[lang][month - 1]} ${year}`} language={lang} weekStart="monday" />
    </div>
  );
}
