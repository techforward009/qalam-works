"use client";

import Link from "next/link";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useLanguage } from "../../lib/language-context";
import { trackEvent, trackToolOpenOnce } from "../../lib/analytics";
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
import {
  findHijriDateInGregorianYear,
  getRichDateIntelligence,
} from "./utils/dateIntelligence";
import { COUNTRY_CALENDARS, COUNTRY_MAP, methodLabel } from "./utils/countryCalendars";
import {
  resolveRegionalHijriReference,
  type RegionalReference,
} from "./utils/regionalDateEvidence";

// ── Labels ────────────────────────────────────────────────────────────────────
const L = {
  en: {
    title:        "Date Converter",
    desc:         "Convert dates between Gregorian, Hijri, and Solar Hijri calendars.",
    convertTab:   "Convert Date",
    findTab:      "Find Date",
    sourceLabel:  "Source Calendar",
    day:          "Day",
    month:        "Month",
    year:         "Year",
    today:        "Today",
    clear:        "Clear",
    copy:         "Copy",
    copied:       "Copied!",
    copyLink:     "Copy Link",
    linkCopied:   "Link copied!",
    gregorian:    "Gregorian",
    hijri:        "Hijri",
    solar:        "Solar Hijri",
    methodHijri:  "Tabular · Civil",
    methodSolar:  "Arithmetic · 33-year cycle",
    hijriNote:    "Hijri dates may differ by one day depending on local moon sighting.",
    solarNote:    "Solar Hijri conversion uses an arithmetic 33-year cycle. Dates near Nowruz may differ by one day from astronomical calendars.",
    invalidDate:  "Invalid date",
    enterDate:    "Enter a date above to see conversions.",
    selectMonth:  "Month",
    countryLabel: "Regional Context",
    countryHint:  "Select a country to see how Hijri dates are determined locally.",
    countryNone:  "Select a country…",
    countryMethod: "Method",
    countryOfficial: "Official calendar note",
    regionalRef:  "Regional reference",
    calculatedResult: "Calculated result",
    noEvidence:   "No verified regional historical reference is available for this date. The calculated result is unchanged.",
    confidenceHigh:   "Confidence: High",
    confidenceMedium: "Confidence: Medium",
    sourceHistorical: "Primary historical",
    sourceSecondary:  "Secondary calendar reference",
    refDisclaimer: "The regional reference does not replace the deterministic calculated result. It reflects documented or published calendar evidence for this country.",
    moreInfo: "More date information",
    weekday: "Weekday",
    leapYear: "Leap year",
    yes: "Yes",
    no: "No",
    dayOfYear: "Day of year",
    weekNumber: "Week number",
    julianDay: "Julian Day",
    age: "Age",
    daysElapsed: "Days elapsed",
    daysUntil: "Days until",
    years: "years",
    months: "months",
    days: "days",
    futureDate: "Future date",
    inDays: (days: number) => `In ${days} days`,
    calendarMaker: "Create an annual calendar",
    studioTitle: "Date Studio",
    studioDesc: "Convert, find, explore and print Gregorian, Hijri and Solar Hijri dates.",
    gregorianExplorer: "Explore Calendars",
    hijriExplorer: "Hijri Calendar Explorer",
    calendarMakerAction: "Calendar Maker",
    findIntro: "Know the Hijri day and month, but not the Hijri year? Search the selected Gregorian year using the same deterministic Qalam Works engine.",
    hijriDay: "Hijri day",
    hijriMonth: "Hijri month",
    gregorianYear: "Gregorian year",
    findPrompt: "Enter Hijri day, Hijri month, and Gregorian year.",
    matches: "Calculated matches",
    noMatches: "No calculated match was found in this Gregorian year.",
    searchCaveat: "These are calculated tabular-Hijri matches. Regional historical evidence, where available, remains supplementary and does not replace them.",
  },
  ur: {
    title:        "تاریخ کنورٹر",
    desc:         "عیسوی، ہجری قمری اور ہجری شمسی تاریخوں کو باہم تبدیل کریں۔",
    convertTab:   "تاریخ تبدیل کریں",
    findTab:      "تاریخ تلاش کریں",
    sourceLabel:  "ماخذ تقویم",
    day:          "دن",
    month:        "مہینہ",
    year:         "سال",
    today:        "آج کی تاریخ",
    clear:        "صاف کریں",
    copy:         "کاپی کریں",
    copied:       "کاپی ہوگیا!",
    copyLink:     "لنک کاپی کریں",
    linkCopied:   "لنک کاپی ہوگیا!",
    gregorian:    "عیسوی",
    hijri:        "ہجری قمری",
    solar:        "ہجری شمسی",
    methodHijri:  "حسابی قمری طریقہ",
    methodSolar:  "33 سالہ حسابی طریقہ",
    hijriNote:    "مقامی رویتِ ہلال کے لحاظ سے ہجری تاریخ میں ایک دن کا فرق ممکن ہے۔",
    solarNote:    "ہجری شمسی تبدیلی 33 سالہ حسابی دور پر مبنی ہے۔ نوروز کے قریب فلکیاتی تقویم سے ایک دن کا فرق ممکن ہے۔",
    invalidDate:  "غلط تاریخ",
    enterDate:    "تبدیلی دیکھنے کے لیے اوپر تاریخ درج کریں۔",
    selectMonth:  "مہینہ",
    countryLabel: "علاقائی تناظر",
    countryHint:  "اپنا ملک منتخب کریں تاکہ آپ کے خطے میں ہجری تاریخ کا تعین کیسے ہوتا ہے، یہ جان سکیں۔",
    countryNone:  "ملک منتخب کریں…",
    countryMethod: "طریقہ",
    countryOfficial: "سرکاری تقویم نوٹ",
    regionalRef:  "علاقائی حوالہ",
    calculatedResult: "حسابی نتیجہ",
    noEvidence:   "اس تاریخ کے لیے کوئی تصدیق شدہ علاقائی تاریخی حوالہ دستیاب نہیں۔ حسابی نتیجہ بدستور قائم ہے۔",
    confidenceHigh:   "اعتماد: زیادہ",
    confidenceMedium: "اعتماد: درمیانہ",
    sourceHistorical: "بنیادی تاریخی",
    sourceSecondary:  "ثانوی کیلنڈر حوالہ",
    refDisclaimer: "علاقائی حوالہ حسابی نتیجے کی جگہ نہیں لیتا۔ یہ اس ملک کے لیے دستاویز شدہ یا شائع شدہ کیلنڈر شواہد کی عکاسی کرتا ہے۔",
    moreInfo: "مزید تاریخی معلومات",
    weekday: "ہفتے کا دن",
    leapYear: "لیپ سال",
    yes: "ہاں",
    no: "نہیں",
    dayOfYear: "سال کا دن",
    weekNumber: "ہفتہ نمبر",
    julianDay: "جولین دن",
    age: "عمر",
    daysElapsed: "گزرے ہوئے دن",
    daysUntil: "تاریخ تک",
    years: "سال",
    months: "ماہ",
    days: "دن",
    futureDate: "آئندہ تاریخ",
    inDays: (days: number) => `${days} دن بعد`,
    calendarMaker: "سالانہ تقویم بنائیں",
    studioTitle: "ڈیٹ اسٹوڈیو",
    studioDesc: "عیسوی، ہجری قمری اور ہجری شمسی تاریخیں تبدیل کریں، تلاش کریں، دیکھیں اور قابلِ طباعت تقویم بنائیں۔",
    gregorianExplorer: "تقویم دیکھیں",
    hijriExplorer: "ہجری کیلنڈر ایکسپلورر",
    calendarMakerAction: "تقویم ساز",
    findIntro: "اگر ہجری دن اور مہینہ معلوم ہو لیکن ہجری سال معلوم نہ ہو تو اسی قلم ورکس حسابی انجن سے منتخب عیسوی سال میں تاریخ تلاش کریں۔",
    hijriDay: "ہجری دن",
    hijriMonth: "ہجری مہینہ",
    gregorianYear: "عیسوی سال",
    findPrompt: "ہجری دن، ہجری مہینہ اور عیسوی سال درج کریں۔",
    matches: "حسابی نتائج",
    noMatches: "اس عیسوی سال میں کوئی حسابی مطابقت نہیں ملی۔",
    searchCaveat: "یہ حسابی ہجری نتائج ہیں۔ دستیاب علاقائی تاریخی شواہد ضمنی رہتے ہیں اور ان حسابی نتائج کی جگہ نہیں لیتے۔",
  },
};

const WEEKDAYS_EN = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const WEEKDAYS_UR = ["پیر","منگل","بدھ","جمعرات","جمعہ","ہفتہ","اتوار"];
const CAL_ORDER: CalendarType[] = ["gregorian", "hijri", "solar"];
const VALID_CALS = new Set<string>(["gregorian", "hijri", "solar"]);
type ToolMode = "convert" | "find";

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

export default function DateConverterContent({ initialMode = "convert" }: { initialMode?: ToolMode }) {
  useEffect(() => { trackToolOpenOnce("date_converter"); }, []);

  const { language, dir } = useLanguage();
  const lang   = language as "en" | "ur";
  const t      = L[lang];
  const isUr   = lang === "ur";
  const naskh  = isUr ? "font-naskh" : "";

  const [mode, setMode] = useState<ToolMode>(initialMode);
  const [calendar,    setCalendar]    = useState<CalendarType>("gregorian");
  const [day,         setDay]         = useState("");
  const [month,       setMonth]       = useState("");
  const [year,        setYear]        = useState("");
  const [copied,      setCopied]      = useState<CalendarType | null>(null);
  const [linkCopied,  setLinkCopied]  = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [findDay, setFindDay] = useState("");
  const [findMonth, setFindMonth] = useState("");
  const [findYear, setFindYear] = useState("");

  // ── Shareable URL ───────────────────────────────────────────────────────────
  function pushURL(cal: CalendarType, d: string, mo: string, yr: string) {
    if (typeof window === "undefined") return;

    const p = new URLSearchParams(window.location.search);
    if (mode === "find" || mode === "convert") p.set("mode", mode);
    p.set("calendar", cal);

    if (d) p.set("day", d);
    else p.delete("day");

    if (mo) p.set("month", mo);
    else p.delete("month");

    if (yr) p.set("year", yr);
    else p.delete("year");

    const query = p.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
    );
  }

  function setToolMode(nextMode: ToolMode) {
    setMode(nextMode);
    if (typeof window === "undefined") return;

    const p = new URLSearchParams(window.location.search);
    p.set("mode", nextMode);
    const query = p.toString();

    window.history.pushState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
    );
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncFromUrl = () => {
      const p = new URLSearchParams(window.location.search);
      const cal = p.get("calendar") ?? "";
      const d   = p.get("day")      ?? "";
      const mo  = p.get("month")    ?? "";
      const yr  = p.get("year")     ?? "";
      const requestedMode = p.get("mode");

      if (requestedMode === "find" || requestedMode === "convert") {
        setMode(requestedMode);
      } else {
        setMode("convert");
      }

      if (VALID_CALS.has(cal)) setCalendar(cal as CalendarType);
      if (d)  setDay(d);
      if (mo) setMonth(mo);
      if (yr) setYear(yr);
    };

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  // ── Derived conversion result ───────────────────────────────────────────────
  const dayN   = parseInt(day,   10);
  const monthN = parseInt(month, 10);
  const yearN  = parseInt(year,  10);
  const hasInput = day !== "" && month !== "" && year !== "" && year.length >= 3;
  let result: ConversionResult | null = null;
  let errMsg: string | null = null;

  if (hasInput) {
    const parts: DateParts = { year: yearN, month: monthN, day: dayN };
    const err = validateDate(calendar, parts);
    if (err) errMsg = `${t.invalidDate}: ${err.message}`;
    else result = convert(calendar, parts);
  }

  const intelligence = result ? getRichDateIntelligence(result.gregorian) : null;
  const weekdayName = intelligence
    ? (isUr ? WEEKDAYS_UR[intelligence.weekdayIndex] : WEEKDAYS_EN[intelligence.weekdayIndex])
    : "";

  // ── Unknown-Hijri-year search ──────────────────────────────────────────────
  const findDayN = parseInt(findDay, 10);
  const findMonthN = parseInt(findMonth, 10);
  const findYearN = parseInt(findYear, 10);
  const hasFindInput = findDay !== "" && findMonth !== "" && findYear !== "" && findYear.length >= 4;
  const findValid = hasFindInput &&
    findDayN >= 1 && findDayN <= 30 &&
    findMonthN >= 1 && findMonthN <= 12 &&
    findYearN >= 1900 && findYearN <= 2100;
  const findMatches = useMemo(() => {
    if (!findValid) return [];
    return findHijriDateInGregorianYear({
      hijriDay: findDayN,
      hijriMonth: findMonthN,
      gregorianYear: findYearN,
    });
  }, [findValid, findDayN, findMonthN, findYearN]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleToday = useCallback(() => {
    const today = todayGregorian();
    const cal: CalendarType = "gregorian";
    const d  = String(today.day);
    const mo = String(today.month);
    const yr = String(today.year);
    setCalendar(cal);
    setDay(d);
    setMonth(mo);
    setYear(yr);
    pushURL(cal, d, mo, yr);
    trackEvent("tool_process", { tool: "date_converter" });
  }, [mode]);

  const handleClear = useCallback(() => {
    setDay(""); setMonth(""); setYear("");
    setCopied(null); setLinkCopied(false);
    pushURL("gregorian", "", "", "");
  }, [calendar, mode]);

  const handleCopy = useCallback((cal: CalendarType, text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(cal);
    setTimeout(() => setCopied(null), 1800);
    trackEvent("tool_copy", { tool: "date_converter" });
  }, []);

  const handleCopyLink = useCallback(() => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    navigator.clipboard.writeText(url).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1800);
  }, []);

  const months = monthOptions(calendar, lang);
  const resultCals = CAL_ORDER.filter(cal => cal !== calendar);
  const inputClass = "w-full border border-[#1A3A2A]/15 dark:border-[#2a3d30] dark:bg-[#0e1c15] dark:text-[#e8ede9] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A2A]/50 dark:focus:border-[#4a7a5a]";
  const studioToday = todayGregorian();
  const studioHijri = convert("gregorian", studioToday).hijri;

  return (
    <div className="site-container" dir={dir}>
      <div className="max-w-2xl mx-auto py-6 sm:py-10">
        <div className="text-center mb-7">
          <h1 className={`text-2xl sm:text-3xl font-bold text-[#1A3A2A] dark:text-[#e8ede9] mb-2 ${isUr ? "font-nastaliq font-normal" : ""}`}>
            {t.title}
          </h1>
          <p className={`text-[15px] text-[#4A6A4A] dark:text-[#b8d4bc] ${naskh}`}>{t.desc}</p>
        </div>

        <section id="date-studio" className="mb-7 rounded-2xl border border-[#1A3A2A]/10 dark:border-[#2a3d30] bg-[#F7F5EF] dark:bg-[#162a1e] p-4 sm:p-5">
          <div className="mb-4 text-start">
            <h2 className={`text-xl font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${isUr ? "font-naskh" : ""}`}>{t.studioTitle}</h2>
            <p className={`mt-1 text-sm text-[#4a6a4a] dark:text-[#a8c8b0] ${naskh}`}>{t.studioDesc}</p>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => { setMode("convert"); setToolMode("convert"); }}
              aria-pressed={mode === "convert"}
              className={`w-full rounded-xl border-2 px-5 py-4 text-start text-base font-bold transition-colors ${naskh} ${
                mode === "convert"
                  ? "border-[#1A3A2A] bg-[#1A3A2A] text-white shadow-sm dark:border-[#2a5a3a] dark:bg-[#2a5a3a]"
                  : "border-[#1A3A2A]/15 bg-white text-[#1A3A2A] hover:border-[#B8935A]/60 dark:border-[#35513d] dark:bg-[#0e1c15] dark:text-[#e8ede9]"
              }`}
            >
              {t.convertTab}
            </button>

            <button
              type="button"
              onClick={() => { setMode("find"); setToolMode("find"); }}
              aria-pressed={mode === "find"}
              className={`w-full rounded-xl border-2 px-5 py-4 text-start text-base font-bold transition-colors ${naskh} ${
                mode === "find"
                  ? "border-[#1A3A2A] bg-[#1A3A2A] text-white shadow-sm dark:border-[#2a5a3a] dark:bg-[#2a5a3a]"
                  : "border-[#1A3A2A]/15 bg-white text-[#1A3A2A] hover:border-[#B8935A]/60 dark:border-[#35513d] dark:bg-[#0e1c15] dark:text-[#e8ede9]"
              }`}
            >
              {t.findTab}
            </button>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <Link href={`/calendar/${studioToday.year}`} className={`rounded-xl border border-[#B8935A]/55 bg-[#B8935A]/8 px-4 py-3.5 text-start text-sm font-bold text-[#6F4E25] dark:text-[#E0C18D] hover:bg-[#B8935A]/14 transition-colors ${naskh}`}>{t.gregorianExplorer}</Link>
              <Link href="/tools/calendar-maker" className={`rounded-xl border border-[#1A3A2A]/15 dark:border-[#35513d] bg-white dark:bg-[#0e1c15] px-4 py-3.5 text-start text-sm font-bold text-[#1A3A2A] dark:text-[#e8ede9] hover:border-[#B8935A]/60 transition-colors ${naskh}`}>{t.calendarMakerAction}</Link>
              <Link href={`/hijri/${studioHijri.year}`} className={`rounded-xl border border-[#1A3A2A]/15 dark:border-[#35513d] bg-white dark:bg-[#0e1c15] px-4 py-3.5 text-start text-sm font-bold text-[#1A3A2A] dark:text-[#e8ede9] hover:border-[#B8935A]/60 transition-colors sm:col-span-2 ${naskh}`}>{t.hijriExplorer}</Link>
            </div>
          </div>
        </section>

        {mode === "convert" ? (
          <>
            {/* Input card — accepted Date Converter presentation preserved */}
            <div className="bg-white dark:bg-[#162a1e] border border-[#1A3A2A]/10 dark:border-[#2a3d30] rounded-2xl shadow-sm p-5 sm:p-6 mb-5">
              <label className={`block text-[12px] font-bold text-[#3a6a4a] dark:text-[#b8d4bc] uppercase tracking-wide mb-2 ${naskh}`}>
                {t.sourceLabel}
              </label>

              <div className="flex gap-2 flex-wrap mb-5">
                {CAL_ORDER.map(c => (
                  <button key={c} onClick={() => {
                    setCalendar(c); setMonth(""); setDay("");
                    pushURL(c, "", "", year);
                  }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${naskh}
                      ${calendar === c
                        ? "bg-[#1A3A2A] dark:bg-[#2a5a3a] text-white border-transparent"
                        : "border-[#1A3A2A]/20 dark:border-[#2a3d30] text-[#1A3A2A] dark:text-[#e8ede9] hover:border-[#1A3A2A]/40 dark:hover:border-[#4a7a5a]"}`}>
                    {calLabel(c, lang)}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <label className={`block text-[11px] font-semibold text-[#3a6a4a] dark:text-[#b8d4bc] mb-1 ${naskh}`}>{t.day}</label>
                  <input
                    type="number" min={1} max={31} value={day}
                    onChange={e => { const v = e.target.value; setDay(v); pushURL(calendar, v, month, year); }}
                    placeholder="1"
                    className="w-full border border-[#1A3A2A]/15 dark:border-[#2a3d30] dark:bg-[#0e1c15] dark:text-[#e8ede9] rounded-lg px-3 py-2.5 text-sm text-center focus:outline-none focus:border-[#1A3A2A]/50 dark:focus:border-[#4a7a5a]"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-semibold text-[#3a6a4a] dark:text-[#b8d4bc] mb-1 ${naskh}`}>{t.month}</label>
                  <select
                    value={month}
                    onChange={e => { const v = e.target.value; setMonth(v); pushURL(calendar, day, v, year); }}
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
                    onChange={e => { const v = e.target.value; setYear(v); pushURL(calendar, day, month, v); }}
                    placeholder={calendar === "gregorian" ? "2026" : calendar === "hijri" ? "1447" : "1405"}
                    className="w-full border border-[#1A3A2A]/15 dark:border-[#2a3d30] dark:bg-[#0e1c15] dark:text-[#e8ede9] rounded-lg px-3 py-2.5 text-sm text-center focus:outline-none focus:border-[#1A3A2A]/50 dark:focus:border-[#4a7a5a]"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="flex gap-3 flex-wrap">
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
                {result && (
                  <button onClick={handleCopyLink}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${naskh}
                      ${linkCopied
                        ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400"
                        : "border-[#1A3A2A]/20 dark:border-[#2a3d30] text-[#3a6a4a] dark:text-[#b8d4bc] hover:border-amber-400 dark:hover:border-amber-600"}`}>
                    {linkCopied ? t.linkCopied : t.copyLink}
                  </button>
                )}
              </div>
            </div>

            {errMsg && (
              <div className={`rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400 mb-5 ${naskh}`} dir={dir}>
                {errMsg}
              </div>
            )}

            {!hasInput && !errMsg && (
              <p className={`text-center text-[#4A6A4A]/70 dark:text-[#a8c8b0]/70 text-sm py-4 ${naskh}`}>{t.enterDate}</p>
            )}

            {/* Result cards — preserve accepted EN/UR hierarchy exactly */}
            {result && (
              <div className="space-y-3">
                {resultCals.map(cal => {
                  const parts    = result![cal];
                  const long     = formatDate(parts, cal, lang);
                  const iso      = isoDate(parts);
                  const copyText = `${weekdayName}  ${long}\n${iso}`;
                  const isCopied = copied === cal;
                  const methodBadge = cal === "hijri" ? t.methodHijri
                                    : cal === "solar" ? t.methodSolar
                                    : null;
                  return (
                    <div key={cal}
                      className="bg-white dark:bg-[#162a1e] border border-[#1A3A2A]/10 dark:border-[#2a3d30] rounded-xl px-5 py-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          {isUr ? (
                            <>
                              <p className={`text-[15px] font-bold text-[#1A3A2A] dark:text-[#e8ede9] mb-0.5 ${naskh}`}>
                                {calLabel(cal, lang)}
                              </p>
                              {methodBadge && (
                                <p className={`text-[11px] font-medium text-[#4a7a5a] dark:text-[#8faa93] mb-1 ${naskh}`}>
                                  {methodBadge}
                                </p>
                              )}
                            </>
                          ) : (
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="text-[11px] font-black uppercase tracking-widest text-[#3a6a4a] dark:text-[#a8c8b0]">
                                {calLabel(cal, lang)}
                              </p>
                              {methodBadge && (
                                <span className="text-[10px] font-medium text-[#3a6a4a]/60 dark:text-[#8faa93]/60">
                                  {methodBadge}
                                </span>
                              )}
                            </div>
                          )}
                          <p className={`text-sm font-semibold text-amber-700 dark:text-amber-400 mb-0.5 ${naskh}`} dir={isUr ? "rtl" : "ltr"}>
                            {weekdayName}
                          </p>
                          <p className={`text-lg font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${naskh}`}>{long}</p>
                          <p className={`text-xs text-[#4a7a5a] dark:text-[#9fbfa8] mt-0.5 font-mono ${isUr ? "text-right" : ""}`} dir="ltr">{iso}</p>
                        </div>
                        <button onClick={() => handleCopy(cal, copyText)}
                          className={`shrink-0 mt-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${naskh}
                            ${isCopied
                              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400"
                              : "border-[#1A3A2A]/20 dark:border-[#2a3d30] text-[#3a6a4a] dark:text-[#a8c8b0] hover:border-[#1A3A2A]/40 dark:hover:border-[#4a7a5a]"}`}>
                          {isCopied ? t.copied : t.copy}
                        </button>
                      </div>
                      {cal === "hijri" && (
                        <p className={`text-[11px] text-[#3a6a4a] dark:text-[#9fbfa8] mt-2 ${naskh}`}>{t.hijriNote}</p>
                      )}
                      {cal === "solar" && (
                        <p className={`text-[11px] text-[#3a6a4a] dark:text-[#9fbfa8] mt-2 ${naskh}`}>{t.solarNote}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Additive rich intelligence; numeric-only values use LTR, Urdu phrases do not. */}
            {intelligence && (() => {
              const ageValue = intelligence.age
                ? (isUr
                    ? `${intelligence.age.years} ${t.years}، ${intelligence.age.months} ${t.months}، ${intelligence.age.days} ${t.days}`
                    : `${intelligence.age.years} ${t.years}, ${intelligence.age.months} ${t.months}, ${intelligence.age.days} ${t.days}`)
                : t.futureDate;
              const rows: Array<{ label: string; value: string; numeric?: boolean }> = [
                { label: t.weekday, value: weekdayName },
                { label: t.leapYear, value: intelligence.leapYear ? t.yes : t.no },
                { label: t.dayOfYear, value: String(intelligence.dayOfYear), numeric: true },
                { label: t.weekNumber, value: `${intelligence.isoWeek}${intelligence.isoWeekYear !== intelligence.gregorian.year ? ` · ${intelligence.isoWeekYear}` : ""}`, numeric: true },
                { label: t.julianDay, value: String(intelligence.julianDayNumber), numeric: true },
                { label: t.age, value: ageValue },
                {
                  label: intelligence.relation === "future" ? t.daysUntil : t.daysElapsed,
                  value: intelligence.relation === "future"
                    ? (isUr ? t.inDays(intelligence.wholeDayDistance) : String(intelligence.wholeDayDistance))
                    : String(intelligence.wholeDayDistance),
                  numeric: intelligence.relation === "future" ? !isUr : true,
                },
              ];

              return (
                <section className="mt-5 bg-white dark:bg-[#162a1e] border border-[#1A3A2A]/10 dark:border-[#2a3d30] rounded-2xl shadow-sm p-5 sm:p-6">
                  <h2 className={`text-base font-bold text-[#1A3A2A] dark:text-[#e8ede9] mb-4 ${naskh}`}>{t.moreInfo}</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-4">
                    {rows.map(row => (
                      <div key={row.label}>
                        <p className={`text-[11px] font-semibold text-[#4a7a5a] dark:text-[#8faa93] ${naskh}`}>{row.label}</p>
                        <p
                          className={`mt-0.5 text-sm font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${naskh}`}
                          dir={row.numeric ? "ltr" : (isUr ? "rtl" : undefined)}
                        >
                          {row.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })()}

            <RegionalContext
              selectedCountry={selectedCountry}
              setSelectedCountry={setSelectedCountry}
              calendar={calendar}
              result={result}
              day={day}
              month={month}
              year={year}
              lang={lang}
              isUr={isUr}
              naskh={naskh}
            />
          </>
        ) : (
          <section className="bg-white dark:bg-[#162a1e] border border-[#1A3A2A]/10 dark:border-[#2a3d30] rounded-2xl shadow-sm p-5 sm:p-6">
            <p className={`text-[13px] text-[#4a6a4a] dark:text-[#a8c8b0] leading-relaxed mb-5 ${naskh}`}>{t.findIntro}</p>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={`block text-[11px] font-semibold text-[#3a6a4a] dark:text-[#b8d4bc] mb-1 ${naskh}`}>{t.hijriDay}</label>
                <input type="number" min={1} max={30} value={findDay} onChange={(e) => setFindDay(e.target.value)} className={`${inputClass} text-center`} dir="ltr" />
              </div>
              <div>
                <label className={`block text-[11px] font-semibold text-[#3a6a4a] dark:text-[#b8d4bc] mb-1 ${naskh}`}>{t.hijriMonth}</label>
                <select value={findMonth} onChange={(e) => setFindMonth(e.target.value)} className={`${inputClass} ${naskh}`}>
                  <option value="">{t.selectMonth}</option>
                  {(isUr ? HIJRI_MONTHS_UR : HIJRI_MONTHS_EN).map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-[11px] font-semibold text-[#3a6a4a] dark:text-[#b8d4bc] mb-1 ${naskh}`}>{t.gregorianYear}</label>
                <input type="number" min={1900} max={2100} value={findYear} onChange={(e) => setFindYear(e.target.value)} placeholder="1976" className={`${inputClass} text-center`} dir="ltr" />
              </div>
            </div>

            {!hasFindInput && <p className={`mt-5 text-center text-sm text-[#4a6a4a]/70 dark:text-[#a8c8b0]/70 ${naskh}`}>{t.findPrompt}</p>}
            {hasFindInput && !findValid && <p className={`mt-5 text-sm text-red-600 dark:text-red-400 ${naskh}`}>{t.invalidDate}</p>}

            {findValid && (
              <div className="mt-6">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2 className={`text-sm font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${naskh}`}>{t.matches}</h2>
                  <span className="text-xs font-semibold text-[#4a7a5a] dark:text-[#8faa93]" dir="ltr">{findMatches.length}</span>
                </div>

                {findMatches.length === 0 ? (
                  <p className={`rounded-xl bg-[#1A3A2A]/5 dark:bg-white/[0.04] px-4 py-3 text-sm text-[#4a6a4a] dark:text-[#a8c8b0] ${naskh}`}>{t.noMatches}</p>
                ) : (
                  <div className="space-y-3">
                    {findMatches.map(match => {
                      const wd = isUr ? WEEKDAYS_UR[match.weekdayIndex] : WEEKDAYS_EN[match.weekdayIndex];
                      return (
                        <article key={isoDate(match.gregorian)} className="rounded-xl border border-[#1A3A2A]/10 dark:border-[#2a3d30] p-4">
                          <p className={`text-sm font-semibold text-amber-700 dark:text-amber-400 ${naskh}`} dir={isUr ? "rtl" : "ltr"}>{wd}</p>
                          <p className={`mt-0.5 text-base font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${naskh}`}>{formatDate(match.gregorian, "gregorian", lang)}</p>
                          <p className="text-xs text-[#4a7a5a] dark:text-[#9fbfa8] font-mono" dir="ltr">{isoDate(match.gregorian)}</p>
                          <div className="mt-2 grid sm:grid-cols-2 gap-1 text-sm">
                            <p className={naskh}>{formatDate(match.hijri, "hijri", lang)}</p>
                            <p className={naskh}>{formatDate(match.solar, "solar", lang)}</p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}

                <p className={`mt-4 text-[11px] leading-relaxed text-[#4a7a5a] dark:text-[#8faa93] ${naskh}`}>{t.searchCaveat}</p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}


function RegionalContext({ selectedCountry, setSelectedCountry, calendar, result, day, month, year, lang, isUr, naskh }: {
  selectedCountry: string;
  setSelectedCountry: (value: string) => void;
  calendar: CalendarType;
  result: ConversionResult | null;
  day: string;
  month: string;
  year: string;
  lang: "en" | "ur";
  isUr: boolean;
  naskh: string;
}) {
  const t = L[lang];

  return (
    <div className="mt-6 bg-white dark:bg-[#162a1e] border border-[#1A3A2A]/10 dark:border-[#2a3d30] rounded-2xl shadow-sm p-5 sm:p-6">
      <p className={`text-[12px] font-bold text-[#3a6a4a] dark:text-[#b8d4bc] uppercase tracking-wide mb-1 ${naskh}`}>
        {t.countryLabel}
      </p>
      <p className={`text-[13px] text-[#4a7a5a] dark:text-[#8faa93] mb-3 ${naskh}`}>
        {t.countryHint}
      </p>

      <select
        value={selectedCountry}
        onChange={e => setSelectedCountry(e.target.value)}
        className={`w-full border border-[#1A3A2A]/15 dark:border-[#2a3d30] dark:bg-[#0e1c15] dark:text-[#e8ede9] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A3A2A]/50 dark:focus:border-[#4a7a5a] ${naskh}`}
        dir={isUr ? "rtl" : "ltr"}
      >
        <option value="">{t.countryNone}</option>
        {COUNTRY_CALENDARS.map(c => (
          <option key={c.id} value={c.id}>{c.name[lang]}</option>
        ))}
      </select>

      {selectedCountry && (() => {
        const country = COUNTRY_MAP.get(selectedCountry);
        if (!country) return null;

        const hijriInput =
          calendar === "hijri" && result
            ? { year: parseInt(year, 10), month: parseInt(month, 10), day: parseInt(day, 10) }
            : null;

        const evidence: RegionalReference | null =
          hijriInput ? resolveRegionalHijriReference(selectedCountry, hijriInput) : null;

        function fmtGregorian(g: { year: number; month: number; day: number }) {
          const months = isUr ? GREGORIAN_MONTHS_UR : GREGORIAN_MONTHS_EN;
          return `${g.day} ${months[g.month - 1]} ${g.year}`;
        }

        const confidenceLabel = evidence?.confidence === "high"
          ? t.confidenceHigh : t.confidenceMedium;
        const sourceLabel = evidence?.sourceType === "primary-historical"
          ? t.sourceHistorical : t.sourceSecondary;

        return (
          <div className="mt-4 space-y-3">
            <div className={`flex items-center gap-2 ${isUr ? "flex-row-reverse" : ""}`}>
              <span className={`text-[11px] font-semibold text-[#3a6a4a] dark:text-[#b8d4bc] ${naskh}`}>
                {t.countryMethod}:
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#1A3A2A]/8 dark:bg-white/[0.06] text-[#1A3A2A] dark:text-[#a8c8b0]">
                {methodLabel(country.hijriMethod, lang)}
              </span>
            </div>

            {hijriInput && result && (
              evidence ? (
                <div className={`rounded-xl border ${
                  evidence.confidence === "high"
                    ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40"
                    : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40"
                } px-4 py-4 space-y-3 ${isUr ? "text-right" : ""}`}>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={isUr ? "text-right" : ""}>
                      <p className={`text-[11px] font-semibold text-[#3a6a4a] dark:text-[#b8d4bc] mb-0.5 ${naskh}`}>
                        {t.calculatedResult}
                      </p>
                      <p className={`text-[15px] font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${naskh}`}>
                        {fmtGregorian(result.gregorian)}
                      </p>
                    </div>
                    <div className={isUr ? "text-right" : ""}>
                      <p className={`text-[11px] font-semibold mb-0.5 ${
                        evidence.confidence === "high"
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-amber-700 dark:text-amber-400"
                      } ${naskh}`}>
                        {t.regionalRef} — {country.name[lang]}
                      </p>
                      <p className={`text-[15px] font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${naskh}`}>
                        {fmtGregorian(evidence.gregorianDate)}
                      </p>
                    </div>
                  </div>

                  <div className={`flex flex-wrap gap-2 ${isUr ? "flex-row-reverse" : ""}`}>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      evidence.confidence === "high"
                        ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300"
                        : "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300"
                    } ${naskh}`}>
                      {confidenceLabel}
                    </span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#1A3A2A]/8 dark:bg-white/[0.06] text-[#3a6a4a] dark:text-[#a8c8b0] ${naskh}`}>
                      {sourceLabel}
                    </span>
                  </div>

                  <p className={`text-[12px] font-semibold text-[#3a6a4a] dark:text-[#8faa93] ${naskh}`}>
                    {evidence.sourceLabel[lang]}
                  </p>
                  <p className={`text-[13px] text-[#4a6a4a] dark:text-[#9fbfa8] leading-relaxed ${naskh}`}>
                    {evidence.explanation[lang]}
                  </p>
                  <p className={`text-[11px] text-[#4a7a5a]/70 dark:text-[#8faa93]/70 border-t border-[#1A3A2A]/10 pt-2 leading-relaxed ${naskh}`}>
                    {t.refDisclaimer}
                  </p>
                </div>
              ) : (
                <div className={`rounded-xl bg-[#1A3A2A]/5 dark:bg-white/[0.04] border border-[#1A3A2A]/10 dark:border-white/[0.08] px-4 py-3 ${isUr ? "text-right" : ""}`}>
                  <p className={`text-[13px] text-[#4a6a4a] dark:text-[#9fbfa8] leading-relaxed ${naskh}`}>
                    {t.noEvidence}
                  </p>
                </div>
              )
            )}

            <div className={`rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 px-4 py-3 ${isUr ? "text-right" : ""}`}>
              <p className={`text-[13px] text-amber-800 dark:text-amber-300 leading-relaxed ${naskh}`}>
                {country.hijriNote[lang]}
              </p>
            </div>

            {country.officialNote && (
              <div className={`rounded-xl bg-[#1A3A2A]/5 dark:bg-white/[0.04] border border-[#1A3A2A]/10 dark:border-white/[0.08] px-4 py-3 ${isUr ? "text-right" : ""}`}>
                <p className={`text-[11px] font-semibold text-[#3a6a4a] dark:text-[#b8d4bc] mb-1 ${naskh}`}>
                  {t.countryOfficial}
                </p>
                <p className={`text-[13px] text-[#4a6a4a] dark:text-[#9fbfa8] leading-relaxed ${naskh}`}>
                  {country.officialNote[lang]}
                </p>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
