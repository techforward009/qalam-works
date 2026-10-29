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
    <section className="mt-6 rounded-3xl border border-[#1A3A2A]/15 bg-[#F7F5EF] p-5 shadow-sm dark:border-[#35513d] dark:bg-[#162a1e] sm:p-7"
      aria-label={ur ? "آنے والے مہینوں کے چاند" : "Upcoming crescent observation evenings"}
      data-testid="upcoming-crescent-months">
      <h2 className={"text-xl font-bold text-[#123326] dark:text-[#f7faf7] " + (ur ? "font-naskh" : "")}>
        {ur ? "کس مہینے کا چاند دیکھنا ہے؟" : "Which month’s crescent?"}
      </h2>
      <p className={"mt-1 text-sm leading-7 text-[#486155] dark:text-[#c8d5cc] " + (ur ? "font-naskh" : "")}>
        {ur
          ? "اپنا مہینہ دبائیں۔ ہم اس شام کا جواب دکھائیں گے۔"
          : "Tap a month to see the prediction for that evening."}
      </p>
      {upcoming.length ? (
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
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
                className={"group relative min-h-[104px] overflow-hidden rounded-2xl border-2 px-3 py-3 text-start shadow-sm transition-colors hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A3A2A] sm:px-4 " +
                  (selected ? "border-[#1A3A2A] bg-[#1A3A2A] text-white dark:border-[#c7d5c5] dark:bg-[#254b35]" :
                    index === 0 ? "border-[#B8935A] bg-white text-[#123326] hover:bg-[#f6ebd3] dark:bg-[#243b2d] dark:text-[#f5f8f4]" :
                    entry.targetHijriMonth === 9 ? "border-amber-300 bg-amber-50/80 text-[#123326] hover:border-amber-500 dark:border-amber-700 dark:bg-[#322a1d] dark:text-[#f5f8f4]" :
                      "border-[#1A3A2A]/10 bg-white text-[#123326] hover:border-[#B8935A] dark:border-[#35513d] dark:bg-[#1b2c20] dark:text-[#f5f8f4]")}>
                
                {index === 0 && <span className={"mb-2 inline-block rounded-full px-2 py-1 text-xs font-semibold " + (selected ? "bg-white/15 text-[#e3d2a9]" : "bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200")}>
                  {ur ? "اگلا چاند" : "Next crescent"}
                </span>}
                                <span className={ "block text-base font-bold leading-7 " + (ur ? "font-naskh" : "")}>
                  {targetMonth} {dateDigits(String(entry.targetHijriYear), lang)}
                </span>
                <span className={"mt-1 block text-sm " + (selected ? "text-[#dce8de]" : "text-[#486155] dark:text-[#c8d5cc]")}>
                  {dateDigits(formatDate(entry.evening, "gregorian", lang), lang)}
                </span>
                <span className={"sr-only " + (selected ? "text-[#dce8de]" : "text-[#486155] dark:text-[#c8d5cc]")}>
                  {entry.dateSource === "scientific"
                    ? (ur ? "متوقع تاریخ — سائنسی حساب" : "Forecast date — scientific")
                    : (ur ? "۲۹ تاریخ — مصدقہ پاکستانی تقویم" : "Day 29 — reviewed Pakistan calendar")}
                </span>
                <span className={"mt-1 block text-xs font-semibold " + (selected ? "text-[#f1d99e]" : "text-[#315c40] dark:text-[#bde2c7]")}>{ur ? "نتیجہ دیکھیں ←" : "See result →"}</span>
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
