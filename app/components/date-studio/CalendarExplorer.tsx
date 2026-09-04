"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useLanguage } from "@/app/lib/language-context";
import {
  CALENDAR_ANNUAL_GRID_CLASS,
  calendarCssVariables,
} from "@/app/tools/calendar-maker/utils/calendarVisualSpec";
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
        weekStart: "monday",
        page: model.page,
      }),
    [model.year, model.page, mode, lang],
  );

  return (
    <div dir={dir}>
      <div className="mb-4 inline-flex rounded-lg border border-[#1A3A2A]/15 bg-white p-1 dark:border-[#35513d] dark:bg-[#0e1c15]">
        <button
          type="button"
          onClick={() => setMode("gregorian")}
          aria-pressed={mode === "gregorian"}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${mode === "gregorian" ? "bg-[#1A3A2A] text-white" : "text-[#1A3A2A] dark:text-[#e8ede9]"} ${lang === "ur" ? "font-naskh" : ""}`}
        >
          {t.gregorian}
        </button>
        <button
          type="button"
          onClick={() => setMode("gregorian-hijri")}
          aria-pressed={mode === "gregorian-hijri"}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${mode === "gregorian-hijri" ? "bg-[#1A3A2A] text-white" : "text-[#1A3A2A] dark:text-[#e8ede9]"} ${lang === "ur" ? "font-naskh" : ""}`}
        >
          {t.combined}
        </button>
      </div>

      <section className="overflow-hidden border-[3px] border-[var(--calendar-frame)] bg-[var(--calendar-paper)]" style={calendarCssVariables() as CSSProperties}>
        <header className="grid min-h-[64px] grid-cols-[1fr_auto_1fr] items-center gap-3 border-b-2 border-[var(--calendar-gold)] bg-[var(--calendar-frame)] px-4 py-2 text-white">
          <span className="justify-self-start text-sm font-black tracking-wide" dir="ltr">Qalam Works</span>
          <div className="min-w-[220px] rounded-full border-2 border-[var(--calendar-gold)] bg-[var(--calendar-title-capsule)] px-6 py-2 text-center text-[var(--calendar-frame)]">
            <span className={`text-xl font-black ${lang === "ur" ? "font-naskh" : ""}`}>
              <span dir="ltr">{displayModel.year}</span>{" "}{lang === "ur" ? "سالانہ تقویم" : "Annual Calendar"}
            </span>
          </div>
          <span className={`justify-self-end text-sm font-bold ${lang === "ur" ? "font-naskh" : ""}`}>
            {mode === "gregorian-hijri"
              ? (lang === "ur" ? "عیسوی + ہجری" : "Gregorian + Hijri")
              : (lang === "ur" ? "عیسوی" : "Gregorian")}
          </span>
        </header>

        <div className={CALENDAR_ANNUAL_GRID_CLASS} dir={lang === "ur" ? "rtl" : "ltr"}>
          {displayModel.months.map((month) => (
            <MonthCalendar
              key={month.month}
              month={month}
              title={`${GREGORIAN_MONTH_LABELS[lang][month.month - 1]} ${displayModel.year}`}
              titleHref={`/calendar/${displayModel.year}/${month.month}`}
              language={lang}
              weekStart="monday"
              compact
            />
          ))}
        </div>
      </section>
    </div>
  );
}
