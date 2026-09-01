"use client";

import { useState, useCallback } from "react";
import { useLanguage } from "../../lib/language-context";
import { trackEvent, trackToolOpenOnce } from "../../lib/analytics";
import { useEffect } from "react";
import {
  convert,
  validateDate,
  todayGregorian,
  formatDate,
  isoDate,
  GREGORIAN_MONTHS_EN,
  GREGORIAN_MONTHS_UR,
  HIJRI_MONTHS_EN,
  HIJRI_MONTHS_UR,
  SOLAR_MONTHS_EN,
  SOLAR_MONTHS_UR,
  type CalendarType,
  type DateParts,
  type ConversionResult,
} from "./utils/dateEngine";

// ── Labels ────────────────────────────────────────────────────────────────────
const L = {
  en: {
    title:        "Date Converter",
    desc:         "Convert dates between Gregorian, Hijri, and Solar Hijri calendars.",
    sourceLabel:  "Source Calendar",
    day:          "Day",
    month:        "Month",
    year:         "Year",
    today:        "Today",
    clear:        "Clear",
    copy:         "Copy",
    copied:       "Copied!",
    results:      "Results",
    gregorian:    "Gregorian",
    hijri:        "Hijri",
    solar:        "Solar Hijri",
    hijriNote:    "Hijri dates may differ by one day depending on local moon sighting.",
    solarNote:    "Solar Hijri conversion uses an arithmetic 33-year cycle. Dates near Nowruz may differ by one day from astronomical calendars.",
    invalidDate:  "Invalid date",
    enterDate:    "Enter a date above to see conversions.",
    selectMonth:  "Month",
  },
  ur: {
    title:        "تاریخ کنورٹر",
    desc:         "عیسوی، ہجری قمری اور ہجری شمسی تاریخوں کو باہم تبدیل کریں۔",
    sourceLabel:  "ماخذ تقویم",
    day:          "دن",
    month:        "مہینہ",
    year:         "سال",
    today:        "آج",
    clear:        "صاف کریں",
    copy:         "نقل",
    copied:       "نقل ہو گیا!",
    results:      "نتائج",
    gregorian:    "عیسوی",
    hijri:        "ہجری قمری",
    solar:        "ہجری شمسی",
    hijriNote:    "مقامی رویتِ ہلال کے لحاظ سے ہجری تاریخ میں ایک دن کا فرق ممکن ہے۔",
    solarNote:    "ہجری شمسی تبدیلی 33 سالہ حسابی دور پر مبنی ہے۔ نوروز کے قریب فلکیاتی تقویم سے ایک دن کا فرق ممکن ہے۔",
    invalidDate:  "غلط تاریخ",
    enterDate:    "تبدیلی دیکھنے کے لیے اوپر تاریخ درج کریں۔",
    selectMonth:  "مہینہ",
  },
};

// Weekday names keyed to JDN % 7 → 0=Mon … 6=Sun
const WEEKDAYS_EN = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const WEEKDAYS_UR = ["پیر","منگل","بدھ","جمعرات","جمعہ","ہفتہ","اتوار"];

/** Compute weekday index from a Gregorian date without importing the full engine. */
function weekdayFromGregorian(p: DateParts): number {
  let { year: y, month: m, day: d } = p;
  if (m <= 2) { y--; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  const jdn = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524;
  return jdn % 7; // 0=Mon … 6=Sun
}

const CAL_ORDER: CalendarType[] = ["gregorian", "hijri", "solar"];

function calLabel(cal: CalendarType, lang: "en" | "ur"): string {
  const t = L[lang];
  if (cal === "gregorian") return t.gregorian;
  if (cal === "hijri")     return t.hijri;
  return t.solar;
}

function monthOptions(cal: CalendarType, lang: "en" | "ur") {
  if (cal === "gregorian") return lang === "ur" ? GREGORIAN_MONTHS_UR : GREGORIAN_MONTHS_EN;
  if (cal === "hijri")     return lang === "ur" ? HIJRI_MONTHS_UR     : HIJRI_MONTHS_EN;
  return lang === "ur" ? SOLAR_MONTHS_UR : SOLAR_MONTHS_EN;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DateConverterContent() {
  useEffect(() => { trackToolOpenOnce("date_converter"); }, []);

  const { language, dir } = useLanguage();
  const lang   = language as "en" | "ur";
  const t      = L[lang];
  const isUr   = lang === "ur";
  const naskh  = isUr ? "font-naskh" : "";

  const [calendar, setCalendar] = useState<CalendarType>("gregorian");
  const [day,   setDay]   = useState("");
  const [month, setMonth] = useState("");
  const [year,  setYear]  = useState("");
  const [copied, setCopied] = useState<CalendarType | null>(null);

  // Derive result reactively
  const dayN   = parseInt(day,   10);
  const monthN = parseInt(month, 10);
  const yearN  = parseInt(year,  10);

  const hasInput = day !== "" && month !== "" && year !== "" && year.length >= 3;
  let result:  ConversionResult | null = null;
  let errMsg:  string | null = null;

  if (hasInput) {
    const parts: DateParts = { year: yearN, month: monthN, day: dayN };
    const err = validateDate(calendar, parts);
    if (err) {
      errMsg = `${t.invalidDate}: ${err.message}`;
    } else {
      result = convert(calendar, parts);
    }
  }

  // Weekday is the same for all result calendars (same JDN); compute once.
  const weekdayIdx    = result ? weekdayFromGregorian(result.gregorian) : -1;
  const weekdayName   = weekdayIdx >= 0
    ? (isUr ? WEEKDAYS_UR[weekdayIdx] : WEEKDAYS_EN[weekdayIdx])
    : "";

  const handleToday = useCallback(() => {
    const today = todayGregorian();
    setCalendar("gregorian");
    setDay(String(today.day));
    setMonth(String(today.month));
    setYear(String(today.year));
    trackEvent("tool_process", { tool: "date_converter" });
  }, []);

  const handleClear = useCallback(() => {
    setDay(""); setMonth(""); setYear("");
    setCopied(null);
  }, []);

  const handleCopy = useCallback((cal: CalendarType, text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(cal);
    setTimeout(() => setCopied(null), 1800);
    trackEvent("tool_copy", { tool: "date_converter" });
  }, []);

  const months = monthOptions(calendar, lang);

  // Only show the TWO converted calendars — hide the source calendar card.
  const resultCals = CAL_ORDER.filter(cal => cal !== calendar);

  return (
    <div className="site-container" dir={dir}>
      <div className="max-w-2xl mx-auto py-6 sm:py-10">

        {/* Header */}
        <div className="text-center mb-7">
          <h1 className={`text-2xl sm:text-3xl font-bold text-[#1A3A2A] dark:text-[#e8ede9] mb-2 ${isUr ? "font-nastaliq font-normal" : ""}`}>
            {t.title}
          </h1>
          <p className={`text-[15px] text-[#4A6A4A] dark:text-[#b8d4bc] ${naskh}`}>{t.desc}</p>
        </div>

        {/* Input card */}
        <div className="bg-white dark:bg-[#162a1e] border border-[#1A3A2A]/10 dark:border-[#2a3d30] rounded-2xl shadow-sm p-5 sm:p-6 mb-5">

          {/* Calendar selector */}
          <label className={`block text-[12px] font-bold text-[#3a6a4a] dark:text-[#b8d4bc] uppercase tracking-wide mb-2 ${naskh}`}>
            {t.sourceLabel}
          </label>
          <div className="flex gap-2 flex-wrap mb-5">
            {CAL_ORDER.map(c => (
              <button key={c} onClick={() => { setCalendar(c); setMonth(""); setDay(""); }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${naskh}
                  ${calendar === c
                    ? "bg-[#1A3A2A] dark:bg-[#2a5a3a] text-white border-transparent"
                    : "border-[#1A3A2A]/20 dark:border-[#2a3d30] text-[#1A3A2A] dark:text-[#e8ede9] hover:border-[#1A3A2A]/40 dark:hover:border-[#4a7a5a]"}`}>
                {calLabel(c, lang)}
              </button>
            ))}
          </div>

          {/* Day / Month / Year inputs */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className={`block text-[11px] font-semibold text-[#3a6a4a] dark:text-[#b8d4bc] mb-1 ${naskh}`}>{t.day}</label>
              <input
                type="number" min={1} max={31} value={day}
                onChange={e => setDay(e.target.value)}
                placeholder="1"
                className="w-full border border-[#1A3A2A]/15 dark:border-[#2a3d30] dark:bg-[#0e1c15] dark:text-[#e8ede9] rounded-lg px-3 py-2.5 text-sm text-center focus:outline-none focus:border-[#1A3A2A]/50 dark:focus:border-[#4a7a5a]"
                dir="ltr"
              />
            </div>
            <div>
              <label className={`block text-[11px] font-semibold text-[#3a6a4a] dark:text-[#b8d4bc] mb-1 ${naskh}`}>{t.month}</label>
              <select
                value={month}
                onChange={e => setMonth(e.target.value)}
                className={`w-full border border-[#1A3A2A]/15 dark:border-[#2a3d30] dark:bg-[#0e1c15] dark:text-[#e8ede9] rounded-lg px-2 py-2.5 text-sm focus:outline-none focus:border-[#1A3A2A]/50 dark:focus:border-[#4a7a5a] ${naskh}`}>
                <option value="">{t.selectMonth}</option>
                {months.map((m, i) => (
                  <option key={i + 1} value={String(i + 1)}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-[11px] font-semibold text-[#3a6a4a] dark:text-[#b8d4bc] mb-1 ${naskh}`}>{t.year}</label>
              <input
                type="number" value={year}
                onChange={e => setYear(e.target.value)}
                placeholder={calendar === "gregorian" ? "2026" : calendar === "hijri" ? "1447" : "1405"}
                className="w-full border border-[#1A3A2A]/15 dark:border-[#2a3d30] dark:bg-[#0e1c15] dark:text-[#e8ede9] rounded-lg px-3 py-2.5 text-sm text-center focus:outline-none focus:border-[#1A3A2A]/50 dark:focus:border-[#4a7a5a]"
                dir="ltr"
              />
            </div>
          </div>

          {/* Today / Clear */}
          <div className={`flex gap-3 ${isUr ? "flex-row-reverse" : ""}`}>
            <button onClick={handleToday}
              className={`px-4 py-2 rounded-lg text-sm font-semibold bg-[#1A3A2A]/8 dark:bg-[#2a3d30] text-[#1A3A2A] dark:text-[#e8ede9] hover:bg-[#1A3A2A]/15 dark:hover:bg-[#3a5a45] transition-colors ${naskh}`}>
              {t.today}
            </button>
            {(day || month || year) && (
              <button onClick={handleClear}
                className={`px-4 py-2 rounded-lg text-sm font-semibold text-[#3a6a4a] dark:text-[#b8d4bc] hover:text-red-600 dark:hover:text-red-400 transition-colors ${naskh}`}>
                {t.clear}
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {errMsg && (
          <div className={`rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400 mb-5 ${naskh}`} dir={dir}>
            {errMsg}
          </div>
        )}

        {/* Empty state */}
        {!hasInput && !errMsg && (
          <p className={`text-center text-[#4A6A4A]/70 dark:text-[#a8c8b0]/70 text-sm py-4 ${naskh}`}>{t.enterDate}</p>
        )}

        {/* Result cards — source calendar excluded */}
        {result && (
          <div className="space-y-3">
            {resultCals.map(cal => {
              const parts    = result![cal];
              const long     = formatDate(parts, cal, lang);
              const iso      = isoDate(parts);
              const copyText = `${weekdayName}  ${long}\n${iso}`;
              const isCopied = copied === cal;
              return (
                <div key={cal}
                  className="bg-white dark:bg-[#162a1e] border border-[#1A3A2A]/10 dark:border-[#2a3d30] rounded-xl px-5 py-4 shadow-sm">
                  <div className={`flex items-start justify-between gap-3 ${isUr ? "flex-row-reverse" : ""}`}>
                    <div>
                      {/* Calendar system label */}
                      <p className={`text-[11px] font-black uppercase tracking-widest text-[#3a6a4a] dark:text-[#a8c8b0] mb-1 ${naskh}`}>
                        {calLabel(cal, lang)}
                      </p>
                      {/* Weekday — prominent */}
                      <p className={`text-sm font-semibold text-[#1A3A2A] dark:text-[#c8e4cc] mb-0.5 ${naskh}`} dir={isUr ? "rtl" : "ltr"}>
                        {weekdayName}
                      </p>
                      {/* Human-readable date */}
                      <p className={`text-lg font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${naskh}`}>{long}</p>
                      {/* ISO / numeric date */}
                      <p className="text-xs text-[#3a6a4a] dark:text-[#8faa93] mt-0.5 font-mono" dir="ltr">{iso}</p>
                    </div>
                    <button onClick={() => handleCopy(cal, copyText)}
                      className={`shrink-0 mt-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${naskh}
                        ${isCopied
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400"
                          : "border-[#1A3A2A]/20 dark:border-[#2a3d30] text-[#3a6a4a] dark:text-[#a8c8b0] hover:border-[#1A3A2A]/40 dark:hover:border-[#4a7a5a]"}`}>
                      {isCopied ? t.copied : t.copy}
                    </button>
                  </div>
                  {/* Per-calendar method notes — only shown on the relevant card */}
                  {cal === "hijri" && (
                    <p className={`text-[11px] text-[#3a6a4a]/80 dark:text-[#a8c8b0]/80 mt-2 ${naskh}`}>{t.hijriNote}</p>
                  )}
                  {cal === "solar" && (
                    <p className={`text-[11px] text-[#3a6a4a]/80 dark:text-[#a8c8b0]/80 mt-2 ${naskh}`}>{t.solarNote}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
