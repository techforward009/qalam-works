"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/app/lib/language-context";
import {
  GREGORIAN_MONTH_LABELS,
  buildCalendarYearModel,
  type CalendarContentMode,
  type CalendarYearModel,
} from "@/app/tools/calendar-maker/utils/calendarModel";
import { MonthCalendar } from "./MonthCalendar";

const COPY = {
  en: { gregorian: "Gregorian", combined: "Gregorian + Hijri" },
  ur: { gregorian: "عیسوی", combined: "عیسوی + ہجری" },
};

export function CalendarExplorer({ model }: { model: CalendarYearModel }) {
  const { language, dir } = useLanguage();
  const lang = language as "en" | "ur";
  const t = COPY[lang];
  const [mode, setMode] = useState<CalendarContentMode>("gregorian");

  const displayModel = useMemo(
    () =>
      buildCalendarYearModel({
        year: model.year,
        content: mode,
        language: lang,
        weekStart: lang === "ur" ? "monday" : "sunday",
        page: model.page,
      }),
    [model.year, model.page, mode, lang],
  );

  return (
    <div className="space-y-6" dir={dir}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setMode("gregorian")}
          aria-pressed={mode === "gregorian"}
          className={`rounded-lg px-4 py-2 text-sm font-semibold border transition-colors ${mode === "gregorian" ? "bg-[#1A3A2A] text-white border-[#1A3A2A]" : "border-[#1A3A2A]/15 text-[#1A3A2A] dark:text-[#e8ede9]"} ${lang === "ur" ? "font-naskh" : ""}`}
        >
          {t.gregorian}
        </button>
        <button
          type="button"
          onClick={() => setMode("gregorian-hijri")}
          aria-pressed={mode === "gregorian-hijri"}
          className={`rounded-lg px-4 py-2 text-sm font-semibold border transition-colors ${mode === "gregorian-hijri" ? "bg-[#1A3A2A] text-white border-[#1A3A2A]" : "border-[#1A3A2A]/15 text-[#1A3A2A] dark:text-[#e8ede9]"} ${lang === "ur" ? "font-naskh" : ""}`}
        >
          {t.combined}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {displayModel.months.map((month) => (
          <MonthCalendar
            key={month.month}
            month={month}
            title={`${GREGORIAN_MONTH_LABELS[lang][month.month - 1]} ${displayModel.year}`}
            titleHref={`/calendar/${displayModel.year}/${month.month}`}
            language={lang}
            compact
          />
        ))}
      </div>
    </div>
  );
}
