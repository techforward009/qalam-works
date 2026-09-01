"use client";

import { useState, useCallback, useEffect } from "react";
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
  },
  ur: {
    title:        "تاریخ کنورٹر",
    desc:         "عیسوی، ہجری قمری اور ہجری شمسی تاریخوں کو باہم تبدیل کریں۔",
    sourceLabel:  "ماخذ تقویم",
    day:          "دن",
    month:        "مہینہ",
    year:         "سال",
    today:        "آج کی تاریخ",
    clear:        "صاف کریں",
    copy:         "کاپی",
    copied:       "کاپی ہوگیا!",
    copyLink:     "لنک کاپی کریں",
    linkCopied:   "لنک کاپی ہوگیا!",
    gregorian:    "عیسوی",
    hijri:        "ہجری قمری",
    solar:        "ہجری شمسی",
    methodHijri:  "حسابی · مدنی",
    methodSolar:  "حسابی · 33 سالہ دور",
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

/** Weekday from Gregorian date via JDN (same formula as dateEngine, inlined). */
function weekdayFromGregorian(p: DateParts): number {
  let { year: y, month: m, day: d } = p;
  if (m <= 2) { y--; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  const jdn = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524;
  return jdn % 7; // 0=Mon … 6=Sun
}

const CAL_ORDER: CalendarType[] = ["gregorian", "hijri", "solar"];
const VALID_CALS = new Set<string>(["gregorian", "hijri", "solar"]);

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

  const [calendar,    setCalendar]    = useState<CalendarType>("gregorian");
  const [day,         setDay]         = useState("");
  const [month,       setMonth]       = useState("");
  const [year,        setYear]        = useState("");
  const [copied,      setCopied]      = useState<CalendarType | null>(null);
  const [linkCopied,  setLinkCopied]  = useState(false);

  // ── Shareable URL ───────────────────────────────────────────────────────────
  // Write the URL synchronously with the new values passed directly — avoids
  // any stale-closure / async-state-update timing issue that a useEffect would
  // have (effect sees the previous render's state, not the incoming value).
  function pushURL(cal: CalendarType, d: string, mo: string, yr: string) {
    if (typeof window === "undefined") return;
    if (!d && !mo && !yr) {
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }
    const p = new URLSearchParams();
    p.set("calendar", cal);
    if (d)  p.set("day",   d);
    if (mo) p.set("month", mo);
    if (yr) p.set("year",  yr);
    window.history.replaceState(null, "", "?" + p.toString());
  }

  // On mount: restore calendar + date from ?calendar=&day=&month=&year= params.
  // This is the ONLY useEffect needed for URL — reading on load.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    const cal = p.get("calendar") ?? "";
    const d   = p.get("day")      ?? "";
    const mo  = p.get("month")    ?? "";
    const yr  = p.get("year")     ?? "";
    if (VALID_CALS.has(cal)) setCalendar(cal as CalendarType);
    if (d)  setDay(d);
    if (mo) setMonth(mo);
    if (yr) setYear(yr);
    // No URL write here — the URL already has the correct params we just read.
  }, []);

  // ── Derived result ──────────────────────────────────────────────────────────
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

  // Weekday — same JDN for all calendars; compute once from Gregorian result.
  const weekdayIdx  = result ? weekdayFromGregorian(result.gregorian) : -1;
  const weekdayName = weekdayIdx >= 0
    ? (isUr ? WEEKDAYS_UR[weekdayIdx] : WEEKDAYS_EN[weekdayIdx])
    : "";

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
  }, []);

  const handleClear = useCallback(() => {
    setDay(""); setMonth(""); setYear("");
    setCopied(null); setLinkCopied(false);
    pushURL("gregorian", "", "", "");
  }, [calendar]);

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

  const months    = monthOptions(calendar, lang);
  const resultCals = CAL_ORDER.filter(cal => cal !== calendar);

  // ── Render ──────────────────────────────────────────────────────────────────
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

          {/* Day / Month / Year inputs */}
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

          {/* Today / Clear / Copy Link */}
          <div className={`flex gap-3 flex-wrap ${isUr ? "flex-row-reverse" : ""}`}>
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

        {/* Result cards — source calendar excluded; exactly 2 shown */}
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
                  {/* In RTL (Urdu), dir="rtl" from parent already places content on the right
                      and Copy button on the left — no flex-row-reverse needed here. */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {/* Calendar label + method badge: RTL parent puts calLabel on right, badge to its left */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className={`text-[11px] font-black uppercase tracking-widest text-[#3a6a4a] dark:text-[#a8c8b0] ${naskh}`}>
                          {calLabel(cal, lang)}
                        </p>
                        {methodBadge && (
                          <span className={`text-[10px] font-medium text-[#3a6a4a]/60 dark:text-[#8faa93]/60 ${naskh}`}>
                            {methodBadge}
                          </span>
                        )}
                      </div>
                      {/* Weekday — amber accent, smaller than main date */}
                      <p className={`text-sm font-semibold text-amber-700 dark:text-amber-400 mb-0.5 ${naskh}`} dir={isUr ? "rtl" : "ltr"}>
                        {weekdayName}
                      </p>
                      {/* Human-readable date — largest, primary */}
                      <p className={`text-lg font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${naskh}`}>{long}</p>
                      {/* ISO / numeric date — dir=ltr keeps numbers machine-readable;
                          text-right anchors it visually to the right in Urdu layout */}
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
                  {/* Per-calendar method caveat — improved contrast */}
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
      </div>
    </div>
  );
}
