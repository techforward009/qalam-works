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
    () => buildCalendarMonth(year, month, mode, lang === "ur" ? "monday" : "sunday"),
    [year, month, mode, lang],
  );

  return (
    <div className="space-y-4" dir={dir}>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setMode("gregorian")} aria-pressed={mode === "gregorian"} className={`rounded-lg px-4 py-2 text-sm font-semibold border ${mode === "gregorian" ? "bg-[#1A3A2A] text-white border-[#1A3A2A]" : "border-[#1A3A2A]/15 text-[#1A3A2A] dark:text-[#e8ede9]"} ${lang === "ur" ? "font-naskh" : ""}`}>{t.gregorian}</button>
        <button type="button" onClick={() => setMode("gregorian-hijri")} aria-pressed={mode === "gregorian-hijri"} className={`rounded-lg px-4 py-2 text-sm font-semibold border ${mode === "gregorian-hijri" ? "bg-[#1A3A2A] text-white border-[#1A3A2A]" : "border-[#1A3A2A]/15 text-[#1A3A2A] dark:text-[#e8ede9]"} ${lang === "ur" ? "font-naskh" : ""}`}>{t.combined}</button>
      </div>
      <MonthCalendar
        month={displayMonth}
        title={`${GREGORIAN_MONTH_LABELS[lang][month - 1]} ${year}`}
        language={lang}
      />
    </div>
  );
}
