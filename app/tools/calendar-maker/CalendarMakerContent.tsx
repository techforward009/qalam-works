"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "../../lib/language-context";
import { BackToDateStudioLink } from "../../components/date-studio/DateStudioRouteNav";
import { MonthCalendar } from "../../components/date-studio/MonthCalendar";
import {
  GREGORIAN_MONTH_LABELS,
  MAX_GREGORIAN_YEAR,
  MIN_GREGORIAN_YEAR,
  buildCalendarYearModel,
  parseCalendarYearInput,
  type CalendarContentMode,
  type CalendarLanguage,
  type CalendarPage,
  type WeekStart,
} from "./utils/calendarModel";

const L = {
  en: {
    title: "Calendar Maker",
    desc: "Create a clean annual Gregorian calendar, with an optional calculated Hijri date in every day cell.",
    year: "Gregorian year",
    yearInvalid: "Enter a Gregorian year from 1900 to 2100.",
    content: "Calendar content",
    gregOnly: "Gregorian only",
    gregHijri: "Gregorian + Hijri",
    language: "Language",
    english: "English",
    urdu: "Urdu",
    weekStarts: "Week starts",
    sunday: "Sunday",
    monday: "Monday",
    page: "Page",
    portrait: "A4 Portrait",
    landscape: "A4 Landscape",
    preview: "Annual preview",
    download: "Download PDF",
    downloading: "Preparing PDF…",
    failed: "PDF generation failed. Please try again.",
    hijriNote: "Hijri dates use the same deterministic tabular calculation as Date Converter and may differ from local moon sighting.",
  },
  ur: {
    title: "تقویم ساز",
    desc: "صاف ستھری سالانہ عیسوی تقویم بنائیں، اور چاہیں تو ہر دن کے ساتھ حسابی ہجری تاریخ بھی دکھائیں۔",
    year: "عیسوی سال",
    yearInvalid: "1900 سے 2100 تک درست عیسوی سال درج کریں۔",
    content: "تقویم کا مواد",
    gregOnly: "صرف عیسوی",
    gregHijri: "عیسوی + ہجری",
    language: "زبان",
    english: "English",
    urdu: "اردو",
    weekStarts: "ہفتہ شروع ہو",
    sunday: "اتوار",
    monday: "پیر",
    page: "صفحہ",
    portrait: "A4 عمودی",
    landscape: "A4 افقی",
    preview: "سالانہ پیش منظر",
    download: "PDF ڈاؤن لوڈ کریں",
    downloading: "PDF تیار ہو رہی ہے…",
    failed: "PDF تیار نہیں ہو سکی۔ دوبارہ کوشش کریں۔",
    hijriNote: "ہجری تاریخیں اسی حسابی قمری طریقے سے بنتی ہیں جو تاریخ کنورٹر میں استعمال ہوتا ہے؛ مقامی رویتِ ہلال سے فرق ممکن ہے۔",
  },
} as const;


export default function CalendarMakerContent() {
  const { language: siteLanguage, dir } = useLanguage();
  const uiLang = siteLanguage as "en" | "ur";
  const t = L[uiLang];
  const isUr = uiLang === "ur";
  const naskh = isUr ? "font-naskh" : "";

  const currentYear = new Date().getUTCFullYear();
  const initialYear = Math.min(MAX_GREGORIAN_YEAR, Math.max(MIN_GREGORIAN_YEAR, currentYear + 1));
  const [yearInput, setYearInput] = useState(String(initialYear));
  const [content, setContent] = useState<CalendarContentMode>("gregorian-hijri");
  const [calendarLanguage, setCalendarLanguage] = useState<CalendarLanguage>(uiLang);
  const [weekStart, setWeekStart] = useState<WeekStart>("sunday");
  const [page, setPage] = useState<CalendarPage>("a4-portrait");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const validYear = useMemo(() => parseCalendarYearInput(yearInput), [yearInput]);
  const effectiveWeekStart: WeekStart = calendarLanguage === "ur" ? "monday" : weekStart;
  const model = useMemo(() => {
    if (validYear === null) return null;
    return buildCalendarYearModel({
      year: validYear,
      content,
      language: calendarLanguage,
      weekStart: effectiveWeekStart,
      page,
    });
  }, [validYear, content, calendarLanguage, effectiveWeekStart, page]);

  async function downloadPdf() {
    if (validYear === null || model === null) return;
    setDownloading(true);
    setError("");
    try {
      const response = await fetch("/api/export-calendar-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: validYear, content, language: calendarLanguage, weekStart: effectiveWeekStart, page }),
      });
      if (!response.ok) throw new Error("pdf");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `qalam-works-calendar-${validYear}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError(t.failed);
    } finally {
      setDownloading(false);
    }
  }

  const selectClass = `w-full rounded-lg border border-[#1A3A2A]/15 dark:border-[#2a3d30] bg-white dark:bg-[#0e1c15] px-3 py-2.5 text-sm text-[#1A3A2A] dark:text-[#e8ede9] focus:outline-none focus:border-[#1A3A2A]/45 dark:focus:border-[#4a7a5a] ${naskh}`;
  const labelClass = `block text-[12px] font-bold text-[#3a6a4a] dark:text-[#b8d4bc] mb-1.5 ${naskh}`;

  return (
    <div className="site-container py-7 sm:py-10" dir={dir}>
      <div className="mb-5">
        <BackToDateStudioLink />
      </div>
      <div className="text-center mb-7">
        <h1 className={`text-2xl sm:text-3xl font-bold text-[#1A3A2A] dark:text-[#e8ede9] mb-2 ${isUr ? "font-nastaliq font-normal" : ""}`}>{t.title}</h1>
        <p className={`text-[15px] text-[#4A6A4A] dark:text-[#b8d4bc] max-w-2xl mx-auto ${naskh}`}>{t.desc}</p>
      </div>

      <section className="bg-white dark:bg-[#162a1e] border border-[#1A3A2A]/10 dark:border-[#2a3d30] rounded-2xl shadow-sm p-5 sm:p-6 mb-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className={labelClass}>{t.year}</label>
            <input
              type="number"
              min={MIN_GREGORIAN_YEAR}
              max={MAX_GREGORIAN_YEAR}
              value={yearInput}
              onChange={(e) => setYearInput(e.target.value)}
              className={`${selectClass} ${validYear === null ? "border-red-300 dark:border-red-800 focus:border-red-400 dark:focus:border-red-700" : ""}`}
              aria-invalid={validYear === null}
              aria-describedby={validYear === null ? "calendar-year-error" : undefined}
              dir="ltr"
            />
            {validYear === null && (
              <p id="calendar-year-error" className={`mt-1.5 text-[12px] text-red-600 dark:text-red-400 ${naskh}`}>
                {t.yearInvalid}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>{t.content}</label>
            <select value={content} onChange={(e) => setContent(e.target.value as CalendarContentMode)} className={selectClass}>
              <option value="gregorian">{t.gregOnly}</option>
              <option value="gregorian-hijri">{t.gregHijri}</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>{t.language}</label>
            <select value={calendarLanguage} onChange={(e) => {
              const nextLanguage = e.target.value as CalendarLanguage;
              setCalendarLanguage(nextLanguage);
              if (nextLanguage === "ur") setWeekStart("monday");
            }} className={selectClass}>
              <option value="en">{t.english}</option>
              <option value="ur">{t.urdu}</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>{t.weekStarts}</label>
            <select value={effectiveWeekStart} disabled={calendarLanguage === "ur"} onChange={(e) => setWeekStart(e.target.value as WeekStart)} className={`${selectClass} disabled:cursor-not-allowed disabled:opacity-70`}>
              <option value="sunday">{t.sunday}</option>
              <option value="monday">{t.monday}</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>{t.page}</label>
            <select value={page} onChange={(e) => setPage(e.target.value as CalendarPage)} className={selectClass}>
              <option value="a4-portrait">{t.portrait}</option>
              <option value="a4-landscape">{t.landscape}</option>
            </select>
          </div>
        </div>
        <div className={`mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${naskh}`}>
          <p className="text-[12px] text-[#4a6a4a] dark:text-[#9fbfa8] max-w-2xl">{t.hijriNote}</p>
          <button
            type="button"
            disabled={downloading || validYear === null}
            onClick={downloadPdf}
            className="shrink-0 rounded-lg bg-[#1A3A2A] dark:bg-[#2a5a3a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#244E38] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {downloading ? t.downloading : t.download}
          </button>
        </div>
        {error && <p className={`mt-3 text-sm text-red-600 dark:text-red-400 ${naskh}`}>{error}</p>}
      </section>

      <section>
        <div className="flex items-end justify-between gap-3 mb-3">
          <h2 className={`text-lg font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${naskh}`}>{t.preview}</h2>
          {validYear !== null && <span className="text-sm font-semibold text-[#4a6a4a] dark:text-[#a8c8b0]" dir="ltr">{validYear}</span>}
        </div>

        {model && validYear !== null ? (
          <div className={`rounded-2xl border border-[#1A3A2A]/10 dark:border-[#2a3d30] bg-[#fdfcf9] dark:bg-[#0e1c15] p-3 sm:p-5 ${page === "a4-landscape" ? "max-w-7xl" : "max-w-5xl"} mx-auto`}>
            <div className="mb-3 flex items-center justify-between gap-3 border-b border-[#B8935A]/50 pb-2" dir="ltr">
              <span className="text-xs font-bold tracking-wide text-[#1A3A2A] dark:text-[#e8ede9]">Qalam Works</span>
              <span className="text-xs font-semibold text-[#4a6a4a] dark:text-[#a8c8b0]">{validYear}</span>
            </div>
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${page === "a4-landscape" ? "xl:grid-cols-4" : "xl:grid-cols-3"} gap-3`}>
              {model.months.map((month) => {
                const monthNames = GREGORIAN_MONTH_LABELS[calendarLanguage];
                return (
                  <MonthCalendar
                    key={month.month}
                    month={month}
                    title={monthNames[month.month - 1]}
                    language={calendarLanguage}
                    interactive={false}
                    compact
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <div className={`rounded-2xl border border-dashed border-[#1A3A2A]/15 dark:border-[#2a3d30] bg-[#fdfcf9] dark:bg-[#0e1c15] px-5 py-10 text-center text-sm text-[#4a6a4a] dark:text-[#a8c8b0] ${naskh}`}>
            {t.yearInvalid}
          </div>
        )}
      </section>
    </div>
  );
}
