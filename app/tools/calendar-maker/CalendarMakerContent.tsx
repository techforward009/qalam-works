"use client";

import { useMemo, useState, type ChangeEvent, type CSSProperties } from "react";
import { useLanguage } from "../../lib/language-context";
import { BackToDateStudioLink } from "../../components/date-studio/DateStudioRouteNav";
import { MonthCalendar } from "../../components/date-studio/MonthCalendar";
import {
  CALENDAR_ANNUAL_GRID_CLASS,
  calendarCssVariables,
} from "./utils/calendarVisualSpec";
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
    desc: "Create a professionally typeset annual Gregorian calendar with optional Hijri day numbers and local-sighting adjustment.",
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
    hijriAdjustment: "Hijri adjustment",
    hijriApplyTo: "Apply to",
    entireCalendar: "Entire calendar",
    hijriMonthHint: "The engine is calculated. Use ±1/±2 if local moon sighting differs — for the whole year, or one Gregorian month only.",
    researchNote: "Research / local sighting note",
    researchNotePlaceholder: "Local moon-sighting record",
    calculated: "Calculated (0)",
    offsetDay: "day",
    offsetDays: "days",
    page: "Page",
    portrait: "A4 Portrait",
    landscape: "A4 Landscape",
    bannerSection: "Top banner",
    bannerName: "Name / organization",
    bannerTitle: "Header title",
    bannerTitlePlaceholder: "Annual Calendar 2027",
    bannerLogo: "Logo (optional)",
    bannerLogoClear: "Remove logo",
    bannerHint: "This strip is yours: name, title, optional logo. The calendar grid below does not move.",
    preview: "Annual preview",
    annualTitle: "Annual Calendar",
    mixedLabel: "Gregorian + Hijri",
    download: "Download PDF",
    downloading: "Preparing PDF…",
    failed: "PDF generation failed. Please try again.",
    hijriNote: "Hijri values use the same deterministic Qalam Works engine. Adjustment changes only this calendar preview/PDF for local-sighting presentation.",
  },
  ur: {
    title: "تقویم ساز",
    desc: "پیشہ ورانہ انداز کی سالانہ عیسوی تقویم بنائیں، ہجری دن اور مقامی رویت کے مطابق اختیاری تبدیلی کے ساتھ۔",
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
    hijriAdjustment: "ہجری دن کی تبدیلی",
    hijriApplyTo: "لاگو ہو",
    entireCalendar: "پوری تقویم",
    hijriMonthHint: "حسابی انجن وہی رہتا ہے۔ اگر مقامی رؤیتِ ہلال مختلف ہو تو ±1/±2 منتخب کریں — پورے سال کے لیے، یا صرف ایک عیسوی مہینے کے لیے۔",
    researchNote: "تحقیق / مقامی رؤیت کا حوالہ",
    researchNotePlaceholder: "مقامی رؤیتِ ہلال کا ریکارڈ",
    calculated: "حسابی (0)",
    offsetDay: "دن",
    offsetDays: "دن",
    page: "صفحہ",
    portrait: "A4 عمودی",
    landscape: "A4 افقی",
    bannerSection: "اوپر والی پٹی",
    bannerName: "نام / ادارہ",
    bannerTitle: "ہیڈر کا عنوان",
    bannerTitlePlaceholder: "سالانہ تقویم 2027",
    bannerLogo: "لوگو (اختیاری)",
    bannerLogoClear: "لوگو ہٹائیں",
    bannerHint: "یہ پٹی آپ کی ہے: نام، عنوان، اختیاری لوگو۔ نیچے کیلنڈر گرڈ اپنی جگہ رہتا ہے۔",
    preview: "سالانہ پیش منظر",
    annualTitle: "سالانہ تقویم",
    mixedLabel: "عیسوی + ہجری",
    download: "PDF ڈاؤن لوڈ کریں",
    downloading: "PDF تیار ہو رہی ہے…",
    failed: "PDF تیار نہیں ہو سکی۔ دوبارہ کوشش کریں۔",
    hijriNote: "ہجری قدریں قلم ورکس کے اسی حسابی انجن سے آتی ہیں۔ تبدیلی صرف اس تقویم کے پیش منظر اور PDF پر لاگو ہوتی ہے۔",
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
  const [weekStart, setWeekStart] = useState<WeekStart>("monday");
  const [hijriOffset, setHijriOffset] = useState(0);
  const [hijriOffsetMonth, setHijriOffsetMonth] = useState(0);
  const [researchNote, setResearchNote] = useState("");
  const [bannerName, setBannerName] = useState("Qalam Works");
  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerLogo, setBannerLogo] = useState("");
  const [page, setPage] = useState<CalendarPage>("a4-portrait");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const validYear = useMemo(() => parseCalendarYearInput(yearInput), [yearInput]);
  const effectiveWeekStart: WeekStart = calendarLanguage === "ur" ? "monday" : weekStart;
  const effectiveHijriOffset = content === "gregorian-hijri" ? hijriOffset : 0;
  const effectiveHijriOffsetMonths = effectiveHijriOffset !== 0 && hijriOffsetMonth >= 1 && hijriOffsetMonth <= 12
    ? [hijriOffsetMonth]
    : [];
  const calendarAnnualTitle = calendarLanguage === "ur" ? "سالانہ تقویم" : "Annual Calendar";
  const previewBannerTitle = bannerTitle.trim() || `${validYear ?? ""} ${calendarAnnualTitle}`.trim();
  const calendarMixedLabel = content === "gregorian-hijri"
    ? (calendarLanguage === "ur" ? "عیسوی + ہجری" : "Gregorian + Hijri")
    : (calendarLanguage === "ur" ? "عیسوی" : "Gregorian");

  const model = useMemo(() => {
    if (validYear === null) return null;
    return buildCalendarYearModel({
      year: validYear,
      content,
      language: calendarLanguage,
      weekStart: effectiveWeekStart,
      page,
      hijriOffset: effectiveHijriOffset,
      hijriOffsetMonths: effectiveHijriOffsetMonths,
    });
  }, [validYear, content, calendarLanguage, effectiveWeekStart, page, effectiveHijriOffset, effectiveHijriOffsetMonths]);

  async function downloadPdf() {
    if (validYear === null || model === null) return;
    setDownloading(true);
    setError("");
    try {
      const response = await fetch("/api/export-calendar-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: validYear,
          content,
          language: calendarLanguage,
          weekStart: effectiveWeekStart,
          page,
          hijriOffset: effectiveHijriOffset,
          hijriOffsetMonths: effectiveHijriOffsetMonths,
          researchNote: effectiveHijriOffset !== 0 ? researchNote.trim() : "",
          bannerName: bannerName.trim() || "Qalam Works",
          bannerTitle: bannerTitle.trim(),
          bannerLogo: bannerLogo || undefined,
        }),
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

  async function onLogoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !/^image\/(png|jpeg)$/.test(file.type)) return;
    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error("logo"));
        element.src = url;
      });
      const maxWidth = 160;
      const maxHeight = 64;
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) return;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      setBannerLogo(canvas.toDataURL("image/png"));
    } catch {
      setBannerLogo("");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const selectClass = `w-full rounded-lg border border-[#1A3A2A]/15 dark:border-[#2a3d30] bg-white dark:bg-[#0e1c15] px-3 py-2.5 text-sm text-[#1A3A2A] dark:text-[#e8ede9] focus:outline-none focus:border-[#1A3A2A]/45 dark:focus:border-[#4a7a5a] ${naskh}`;
  const labelClass = `block text-[12px] font-bold text-[#3a6a4a] dark:text-[#b8d4bc] mb-1.5 ${naskh}`;

  return (
    <div className="site-container py-7 sm:py-10" dir={dir}>
      <div className="mb-5"><BackToDateStudioLink /></div>

      <div className="mb-7 text-center">
        <h1 className={`mb-2 text-2xl font-bold text-[#1A3A2A] sm:text-3xl dark:text-[#e8ede9] ${isUr ? "font-nastaliq font-normal" : ""}`}>{t.title}</h1>
        <p className={`mx-auto max-w-2xl text-[15px] text-[#4A6A4A] dark:text-[#b8d4bc] ${naskh}`}>{t.desc}</p>
      </div>

      <section className="mb-6 rounded-2xl border border-[#1A3A2A]/10 bg-white p-5 shadow-sm dark:border-[#2a3d30] dark:bg-[#162a1e] sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div>
            <label className={labelClass}>{t.year}</label>
            <input
              type="number"
              min={MIN_GREGORIAN_YEAR}
              max={MAX_GREGORIAN_YEAR}
              value={yearInput}
              onChange={(e) => setYearInput(e.target.value)}
              className={`${selectClass} ${validYear === null ? "border-red-300 dark:border-red-800" : ""}`}
              dir="ltr"
            />
            {validYear === null && <p className={`mt-1.5 text-[12px] text-red-600 dark:text-red-400 ${naskh}`}>{t.yearInvalid}</p>}
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
            <select
              value={calendarLanguage}
              onChange={(e) => {
                const next = e.target.value as CalendarLanguage;
                setCalendarLanguage(next);
                if (next === "ur") setWeekStart("monday");
              }}
              className={selectClass}
            >
              <option value="en">{t.english}</option>
              <option value="ur">{t.urdu}</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>{t.weekStarts}</label>
            <select
              value={effectiveWeekStart}
              disabled={calendarLanguage === "ur"}
              onChange={(e) => setWeekStart(e.target.value as WeekStart)}
              className={`${selectClass} disabled:cursor-not-allowed disabled:opacity-70`}
            >
              <option value="monday">{t.monday}</option>
              <option value="sunday">{t.sunday}</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>{t.hijriAdjustment}</label>
            <select
              value={hijriOffset}
              onChange={(e) => setHijriOffset(Number(e.target.value))}
              className={selectClass}
              disabled={content !== "gregorian-hijri"}
            >
              <option value={0}>{t.calculated}</option>
              {[-2, -1, 1, 2].map((offset) => (
                <option key={offset} value={offset}>
                  {offset > 0 ? "+" : ""}{offset} {Math.abs(offset) === 1 ? t.offsetDay : t.offsetDays}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>{t.hijriApplyTo}</label>
            <select
              value={hijriOffsetMonth}
              onChange={(e) => setHijriOffsetMonth(Number(e.target.value))}
              className={selectClass}
              disabled={content !== "gregorian-hijri" || effectiveHijriOffset === 0}
            >
              <option value={0}>{t.entireCalendar}</option>
              {GREGORIAN_MONTH_LABELS[calendarLanguage].map((label, index) => (
                <option key={label} value={index + 1}>{label}</option>
              ))}
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

        {effectiveHijriOffset !== 0 && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>{t.researchNote}</label>
              <input
                type="text"
                value={researchNote}
                maxLength={240}
                onChange={(e) => setResearchNote(e.target.value)}
                placeholder={t.researchNotePlaceholder}
                className={selectClass}
              />
            </div>
            <p className={`self-end text-[12px] text-[#4a6a4a] dark:text-[#9fbfa8] ${naskh}`}>{t.hijriMonthHint}</p>
          </div>
        )}

        <div className="mt-5 border-t border-[#1A3A2A]/10 pt-5 dark:border-[#2a3d30]">
          <p className={`mb-3 text-[13px] font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${naskh}`}>{t.bannerSection}</p>
          <p className={`mb-4 text-[12px] text-[#4a6a4a] dark:text-[#9fbfa8] ${naskh}`}>{t.bannerHint}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelClass}>{t.bannerName}</label>
              <input
                type="text"
                value={bannerName}
                maxLength={80}
                onChange={(e) => setBannerName(e.target.value)}
                className={selectClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t.bannerTitle}</label>
              <input
                type="text"
                value={bannerTitle}
                maxLength={80}
                onChange={(e) => setBannerTitle(e.target.value)}
                placeholder={t.bannerTitlePlaceholder}
                className={selectClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t.bannerLogo}</label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={onLogoSelected}
                  className={`${selectClass} p-2 file:mr-2 file:rounded file:border-0 file:bg-[#1A3A2A] file:px-2 file:py-1 file:text-xs file:text-white`}
                />
                {bannerLogo && (
                  <button type="button" onClick={() => setBannerLogo("")} className={`shrink-0 text-[12px] font-semibold text-[#8a3a3a] ${naskh}`}>
                    {t.bannerLogoClear}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={`mt-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center ${naskh}`}>
          <p className="max-w-2xl text-[12px] text-[#4a6a4a] dark:text-[#9fbfa8]">{t.hijriNote}</p>
          <button
            type="button"
            disabled={downloading || validYear === null}
            onClick={downloadPdf}
            className="shrink-0 rounded-lg bg-[#1A3A2A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#244E38] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#2a5a3a]"
          >
            {downloading ? t.downloading : t.download}
          </button>
        </div>
        {error && <p className={`mt-3 text-sm text-red-600 dark:text-red-400 ${naskh}`}>{error}</p>}
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className={`text-lg font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${naskh}`}>{t.preview}</h2>
          {validYear !== null && <span className="text-sm font-semibold text-[#4a6a4a] dark:text-[#a8c8b0]" dir="ltr">{validYear}</span>}
        </div>

        {model && validYear !== null ? (
          <div
            className="mx-auto max-w-7xl overflow-hidden border-[3px] border-[var(--calendar-frame)] bg-[var(--calendar-paper)] shadow-sm"
            dir={calendarLanguage === "ur" ? "rtl" : "ltr"}
            style={calendarCssVariables() as CSSProperties}
          >
            <header className="relative grid min-h-[70px] grid-cols-[1fr_auto_1fr] items-center gap-3 border-b-2 border-[var(--calendar-gold)] bg-[var(--calendar-frame)] px-4 py-2 text-white">
              <div className="flex min-w-0 items-center gap-2 justify-self-start text-start">
                {bannerLogo && <img src={bannerLogo} alt="" className="h-9 w-auto max-w-[96px] object-contain" />}
                <span className="truncate text-sm font-black tracking-wide" dir="ltr">{bannerName.trim() || "Qalam Works"}</span>
              </div>

              <div className="min-w-[250px] max-w-[420px] rounded-full border-2 border-[var(--calendar-gold)] bg-[var(--calendar-title-capsule)] px-7 py-2 text-center text-[var(--calendar-frame)] shadow-inner">
                <div className={`truncate text-xl font-black leading-tight sm:text-2xl ${calendarLanguage === "ur" ? "font-naskh" : ""}`}>
                  {previewBannerTitle}
                </div>
              </div>

              <div className={`justify-self-end text-end text-sm font-bold ${calendarLanguage === "ur" ? "font-naskh" : ""}`}>
                {calendarMixedLabel}
              </div>
            </header>

            {effectiveHijriOffset !== 0 && researchNote.trim() && (
              <p className={`border-b border-[var(--calendar-gold)]/50 bg-[#FFF7E9] px-3 py-1.5 text-[11px] text-[var(--calendar-research-text)] ${naskh}`}>
                {researchNote.trim()}
              </p>
            )}

            <div className={CALENDAR_ANNUAL_GRID_CLASS}>
              {model.months.map((month) => (
                <MonthCalendar
                  key={month.month}
                  month={month}
                  title={`${GREGORIAN_MONTH_LABELS[calendarLanguage][month.month - 1]} ${validYear}`}
                  language={calendarLanguage}
                  weekStart={effectiveWeekStart}
                  hijriOffset={effectiveHijriOffset}
                  showHijri={content === "gregorian-hijri"}
                  interactive={false}
                  compact
                />
              ))}
            </div>

            <footer className="flex items-center justify-between border-t border-[var(--calendar-frame)]/30 px-2 py-1 text-[9px] text-[var(--calendar-footer-text)]" dir="ltr">
              <span>qalamworks.com</span>
              <span>{calendarMixedLabel}</span>
            </footer>
          </div>
        ) : (
          <div className={`rounded-2xl border border-dashed border-[#1A3A2A]/15 bg-[#fdfcf9] px-5 py-10 text-center text-sm text-[#4a6a4a] dark:border-[#2a3d30] dark:bg-[#0e1c15] dark:text-[#a8c8b0] ${naskh}`}>
            {t.yearInvalid}
          </div>
        )}
      </section>
    </div>
  );
}
