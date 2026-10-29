"use client";

import { useMemo } from "react";
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
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 min-[900px]:grid-cols-3" data-crescent-month-grid>
          {upcoming.map((entry, index) => {
            const selected = selectedDate === entry.dateIso;
            const targetMonth = monthName("hijri", entry.targetHijriMonth, lang);
            return (
              <button
                key={entry.dateIso}
                type="button"
                aria-pressed={selected}
                aria-label={ur
                  ? `${targetMonth} ${entry.targetHijriYear}، متوقع شام ${formatDate(entry.evening, "gregorian", lang)}`
                  : `${targetMonth} ${entry.targetHijriYear}, expected evening ${formatDate(entry.evening, "gregorian", lang)}`}
                data-testid={"upcoming-crescent-month-" + index}
                onClick={() => onSelect(entry.dateIso)}
                className={"group relative flex min-h-[156px] w-full flex-col justify-center gap-1.5 rounded-2xl border-2 px-5 py-4 text-start shadow-sm transition-colors hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A3A2A] sm:px-6 " +
                  (selected ? "border-[#1A3A2A] bg-[#1A3A2A] text-white dark:border-[#c7d5c5] dark:bg-[#254b35]" :
                    index === 0 ? "border-[#B8935A] bg-white text-[#123326] hover:bg-[#f6ebd3] dark:bg-[#243b2d] dark:text-[#f5f8f4]" :
                    entry.targetHijriMonth === 9 ? "border-amber-300 bg-amber-50/80 text-[#123326] hover:border-amber-500 dark:border-amber-700 dark:bg-[#322a1d] dark:text-[#f5f8f4]" :
                      "border-[#1A3A2A]/10 bg-white text-[#123326] hover:border-[#B8935A] dark:border-[#35513d] dark:bg-[#1b2c20] dark:text-[#f5f8f4]")}>
                <span className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span data-crescent-month-title className="block">
                    {targetMonth} {entry.targetHijriYear}
                  </span>
                  {index === 0 && <span className={"rounded-full px-3 py-1 " + (selected ? "bg-white/15 text-[#e3d2a9]" : "bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200")}>
                    {ur ? "اگلا چاند" : "Next crescent"}
                  </span>}
                </span>
                <span className={"block " + (selected ? "text-[#dce8de]" : "text-[#486155] dark:text-[#c8d5cc]")}>
                  {formatDate(entry.evening, "gregorian", lang)}
                </span>
                <span className="sr-only">
                  {entry.dateSource === "scientific"
                    ? (ur ? "متوقع تاریخ — سائنسی حساب" : "Forecast date — scientific")
                    : (ur ? "۲۹ تاریخ — مصدقہ پاکستانی تقویم" : "Day 29 — reviewed Pakistan calendar")}
                </span>
                <span className={"block " + (selected ? "text-[#f1d99e]" : "text-[#315c40] dark:text-[#bde2c7]")}>
                  {ur ? "نتیجہ دیکھیں ←" : "See result →"}
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
      <p data-crescent-month-note className={"mx-auto mt-5 max-w-4xl text-center text-[#486155] dark:text-[#c8d5cc] " + (ur ? "font-naskh" : "")}>
        {ur
          ? "منتخب تاریخ کا سائنسی حساب دیکھیں۔ سرکاری فیصلہ مرکزی رؤیتِ ہلال کمیٹی پاکستان کرے گی۔"
          : "These are day-29 observation evenings, not guarantees of visibility. Pakistan's Central Ruet-e-Hilal Committee makes the official decision."}
      </p>
    </section>
  );
}
