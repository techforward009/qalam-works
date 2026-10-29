"use client";

import { useMemo } from "react";
import { dateDigits } from "../../date-converter/utils/pakistanDateShare";
import { formatDate, monthName, type DateParts } from "../../date-converter/utils/dateEngine";
import { getUpcomingPakistanCrescentEvenings } from "../utils/upcomingCrescentEvenings";

export function UpcomingCrescentShortcuts({
  lang, today, selectedDate, onSelect,
}: {
  lang: "ur" | "en";
  today: DateParts;
  selectedDate: string;
  onSelect: (date: string) => void;
}) {
  const ur = lang === "ur";
  const upcoming = useMemo(
    () => getUpcomingPakistanCrescentEvenings(today, 6),
    [today.year, today.month, today.day],
  );

  return (
    <section className="mt-6 rounded-2xl border border-[#1A3A2A]/15 bg-[#F7F5EF] p-4 dark:border-[#35513d] dark:bg-[#162a1e] sm:p-5"
      aria-label={ur ? "آنے والے مہینوں کے چاند" : "Upcoming crescent observation evenings"}
      data-testid="upcoming-crescent-months">
      <h2 className={"text-lg font-bold text-[#123326] dark:text-[#f7faf7] " + (ur ? "font-naskh" : "")}>
        {ur ? "آنے والے مہینوں کے چاند کی رؤیت" : "Upcoming lunar months"}
      </h2>
      <p className={"mt-1 text-sm leading-7 text-[#486155] dark:text-[#c8d5cc] " + (ur ? "font-naskh" : "")}>
        {ur
          ? "مہینہ منتخب کریں۔ ہم آپ کو اس کی رؤیت کی متوقع شام اور اسی شام کے پاکستانی سائنسی نتائج پر لے جائیں گے۔"
          : "Select a month to jump directly to its expected observation evening and Pakistan's scientific visibility results."}
      </p>
      {upcoming.length ? (
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((entry, index) => {
            const selected = selectedDate === entry.dateIso;
            const targetMonth = monthName("hijri", entry.targetHijriMonth, lang);
            return (
              <button
                key={entry.dateIso}
                type="button"
                aria-pressed={selected}
                aria-label={ur
                  ? `${targetMonth} ${dateDigits(String(entry.targetHijriYear), lang)}، متوقع شام ${dateDigits(formatDate(entry.evening, "gregorian", lang), lang)}`
                  : `${targetMonth} ${entry.targetHijriYear}, expected evening ${formatDate(entry.evening, "gregorian", lang)}`}
                data-testid={"upcoming-crescent-month-" + index}
                onClick={() => onSelect(entry.dateIso)}
                className={"rounded-xl border px-4 py-3 text-start transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A3A2A] " +
                  (selected ? "border-[#1A3A2A] bg-[#1A3A2A] text-white dark:border-[#c7d5c5] dark:bg-[#254b35]" :
                    index === 0 ? "border-[#B8935A] bg-white text-[#123326] hover:bg-[#f6ebd3] dark:bg-[#243b2d] dark:text-[#f5f8f4]" :
                      "border-[#1A3A2A]/15 bg-white text-[#123326] hover:border-[#B8935A] dark:border-[#35513d] dark:bg-[#1b2c20] dark:text-[#f5f8f4]")}>
                {index === 0 && <span className={"block text-xs font-semibold " + (selected ? "text-[#e3d2a9]" : "text-[#916a29] dark:text-[#d6b56c]")}>
                  {ur ? "اگلا چاند" : "Next crescent"}
                </span>}
                <span className={"block text-base font-bold leading-7 " + (ur ? "font-naskh" : "")}>
                  {targetMonth} {dateDigits(String(entry.targetHijriYear), lang)}
                </span>
                <span className={"mt-1 block text-sm " + (selected ? "text-[#dce8de]" : "text-[#486155] dark:text-[#c8d5cc]")}>
                  {dateDigits(formatDate(entry.evening, "gregorian", lang), lang)}
                </span>
                <span className={"mt-0.5 block text-xs " + (selected ? "text-[#dce8de]" : "text-[#486155] dark:text-[#c8d5cc]")}>
                  {entry.dateSource === "scientific"
                    ? (ur ? "متوقع تاریخ — سائنسی حساب" : "Forecast date — scientific")
                    : (ur ? "۲۹ تاریخ — مصدقہ پاکستانی تقویم" : "Day 29 — reviewed Pakistan calendar")}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className={"mt-3 text-sm " + (ur ? "font-naskh" : "")} role="status">
          {ur ? "اس مدت کے لیے قابلِ اعتماد قمری تاریخ دستیاب نہیں؛ براہِ کرم نیچے اپنی تاریخ منتخب کریں۔" : "No verified or supported forecast dates are available in this period. Choose a date below."}
        </p>
      )}
      <p className={"mt-3 text-xs leading-6 text-[#486155] dark:text-[#c8d5cc] " + (ur ? "font-naskh" : "")}>
        {ur
          ? "یہ قمری مہینے کی ۲۹ویں شام ہے، چاند نظر آنے کی ضمانت نہیں۔ سرکاری فیصلہ مرکزی رؤیتِ ہلال کمیٹی کرے گی۔"
          : "These are day-29 observation evenings, not guarantees of visibility. Pakistan's Central Ruet-e-Hilal Committee makes the official decision."}
      </p>
    </section>
  );
}
