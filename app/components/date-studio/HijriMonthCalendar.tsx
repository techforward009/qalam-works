"use client";

import Link from "next/link";
import { useLanguage } from "@/app/lib/language-context";
import {
  GREGORIAN_MONTHS_EN,
  GREGORIAN_MONTHS_UR,
  HIJRI_MONTHS_EN,
  HIJRI_MONTHS_UR,
  type DateParts,
} from "@/app/tools/date-converter/utils/dateEngine";
import { calendarWeekdayColumn, weekdayLabels } from "@/app/tools/calendar-maker/utils/calendarModel";

export interface HijriMonthDay {
  hijriDay: number;
  gregorian: DateParts;
  gregorianIso: string;
}

export function HijriMonthCalendar({
  year,
  month,
  days,
}: {
  year: number;
  month: number;
  days: HijriMonthDay[];
}) {
  const { language, dir } = useLanguage();
  const lang = language as "en" | "ur";
  const isUr = lang === "ur";
  const hijriMonths = isUr ? HIJRI_MONTHS_UR : HIJRI_MONTHS_EN;
  const gregorianMonths = isUr ? GREGORIAN_MONTHS_UR : GREGORIAN_MONTHS_EN;
  const weekStart = isUr ? "monday" : "sunday";
  const labels = weekdayLabels(lang, weekStart);
  const leading = days.length ? calendarWeekdayColumn(days[0].gregorian, weekStart) : 0;
  const total = leading + days.length;
  const trailing = (7 - (total % 7)) % 7;
  const cells = [
    ...Array.from({ length: leading }, () => null),
    ...days,
    ...Array.from({ length: trailing }, () => null),
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-[#1A3A2A]/10 bg-white shadow-sm dark:border-[#2a3d30] dark:bg-[#162a1e]" dir={dir}>
      <div className="border-b-2 border-[#B8935A] bg-[#1A3A2A] px-5 py-4 text-white">
        <h2 className={`text-center text-xl font-bold sm:text-2xl ${isUr ? "font-naskh" : ""}`}>{hijriMonths[month - 1]} {year}</h2>
      </div>
      <div className="grid grid-cols-7 bg-[#E7EFE8] dark:bg-[#0e1c15]" dir={isUr ? "rtl" : "ltr"}>
        {labels.map((label) => (
          <div key={label} className={`py-2 text-center text-xs font-semibold text-[#31533d] dark:text-[#b8d4bc] ${isUr ? "font-naskh" : ""}`}>{label}</div>
        ))}
      </div>
      <div className="grid grid-cols-7" dir={isUr ? "rtl" : "ltr"}>
        {cells.map((day, index) =>
          day ? (
            <Link
              key={day.gregorianIso}
              href={`/date/${day.gregorianIso}`}
              className={`min-h-[88px] border-b border-e border-[#1A3A2A]/7 p-2.5 transition-colors hover:bg-[#F7F5EF] dark:border-[#2a3d30] dark:hover:bg-[#1e3527] ${isUr ? "text-right font-naskh" : "text-left"}`}
              dir={isUr ? "rtl" : "ltr"}
            >
              <span className={`block text-lg font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${isUr ? "text-right" : "text-left"}`} dir="ltr">{day.hijriDay}</span>
              <span className={`mt-1 block text-[10px] font-medium leading-snug text-[#8A6C3E] dark:text-[#D3B274] sm:text-xs ${isUr ? "text-right" : "text-left"}`}>
                <span dir="ltr">{day.gregorian.day}</span>{" "}{gregorianMonths[day.gregorian.month - 1]}
              </span>
            </Link>
          ) : (
            <div key={`blank-${index}`} aria-hidden="true" className="min-h-[88px] border-b border-e border-[#1A3A2A]/7 bg-[#F7F5EF]/45 dark:border-[#2a3d30] dark:bg-white/[0.015]" />
          ),
        )}
      </div>
    </section>
  );
}
