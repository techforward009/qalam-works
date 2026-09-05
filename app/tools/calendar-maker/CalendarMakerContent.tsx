"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from "react";
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
import {
  listSightingProfiles,
  readStoredSightingProfiles,
  writeStoredSightingProfiles,
  type HijriSightingProfile,
} from "./utils/hijriSightingArchive";

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
    hijriApplyTo: "Months to adjust",
    entireCalendar: "All months",
    hijriMonthHint: "Each month can delay or advance local moon sighting. Consecutive days stay consecutive: if February starts later, Sha'ban can become 30 days so Ramadan 1 still falls on the right Gregorian date.",
    researchNote: "Printed sighting note (optional)",
    researchNotePlaceholder: "e.g. Karachi: Ramadan moon sighted 1 day later",
    researchNoteHelp: "This optional sentence prints as a thin gold bar under the top banner, so readers know why some Hijri dates were moved. Leave it empty if you do not want any note on the PDF.",
    calculated: "Calculated (0)",
    offsetDay: "day",
    offsetDays: "days",
    setAllMonths: "Set all months",
    page: "Page",
    portrait: "A4 Portrait",
    landscape: "A4 Landscape",
    bannerSection: "Top banner",
    bannerName: "Name / organization",
    bannerNamePlaceholder: "Leave empty if the logo already has the name",
    bannerTitle: "Header title",
    bannerTitlePlaceholder: "Annual Calendar 2027",
    bannerSide: "Right-side text",
    bannerSidePlaceholder: "Gregorian + Hijri",
    bannerLogo: "Logo (optional)",
    bannerLogoClear: "Remove logo",
    logoSize: "Logo size",
    titleSize: "Title size",
    titleWidth: "Title capsule width",
    titleHeight: "Title capsule height",
    sideSize: "Right-side text size",
    bannerHint: "Edit the top strip only. Empty name stays empty. Use a new line for a second row; both lines stay centered on each other.",
    sightingArchive: "Hijri sighting archive",
    sightingCalculated: "Calculated engine",
    sightingSave: "Save current months",
    sightingUpdate: "Update selected",
    sightingDelete: "Delete",
    sightingNamePlaceholder: "Archive name, e.g. Pakistan 2027",
    sightingHelp: "Save this year's month offsets as an archive. Open it later, or edit it here if the sighting is later confirmed differently.",
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
    hijriApplyTo: "جن مہینوں پر لاگو ہو",
    entireCalendar: "تمام مہینے",
    hijriMonthHint: "ہر مہینے کی الگ رؤیت ہو سکتی ہے۔ تاریخیں مسلسل رہتی ہیں: اگر اگلا مہینہ دیر سے شروع ہو تو پچھلا ہجری مہینہ ۳۰ دن کا بن سکتا ہے تاکہ چاند کی پہلی درست عیسوی تاریخ پر آئے۔",
    researchNote: "چھاپی جانے والی نوٹ (اختیاری)",
    researchNotePlaceholder: "مثلاً کراچی: رمضان کا چاند ایک دن بعد نظر آیا",
    researchNoteHelp: "یہ اختیاری جملہ اوپر والی پٹی کے نیچے ایک پتلی سونے رنگ کی لائن میں چھپتا ہے، تاکہ پڑھنے والا جانے کہ ہجری تاریخ کیوں بدلی گئی۔ خالی چھوڑیں تو PDF پر نوٹ نہیں آئے گا۔",
    calculated: "حسابی (0)",
    offsetDay: "دن",
    offsetDays: "دن",
    setAllMonths: "تمام مہینے",
    page: "صفحہ",
    portrait: "A4 عمودی",
    landscape: "A4 افقی",
    bannerSection: "اوپر والی پٹی",
    bannerName: "نام / ادارہ",
    bannerNamePlaceholder: "اگر لوگو میں نام پہلے سے ہے تو خالی رکھیں",
    bannerTitle: "ہیڈر کا عنوان",
    bannerTitlePlaceholder: "سالانہ تقویم 2027",
    bannerSide: "دائیں جانب کا متن",
    bannerSidePlaceholder: "عیسوی + ہجری",
    bannerLogo: "لوگو (اختیاری)",
    bannerLogoClear: "لوگو ہٹائیں",
    logoSize: "لوگو کا سائز",
    titleSize: "عنوان کا سائز",
    titleWidth: "عنوان کی پٹی کی چوڑائی",
    titleHeight: "عنوان کی پٹی کی لمبائی",
    sideSize: "دائیں متن کا سائز",
    bannerHint: "صرف اوپر والی پٹی ایڈٹ ہوتی ہے۔ خالی نام خالی رہتا ہے۔ دوسری سطر کے لیے نئی لائن لکھیں؛ دونوں لائنیں ایک دوسرے کے سینٹر میں رہیں گی۔",
    sightingArchive: "رؤیتِ ہلال آرکائیو",
    sightingCalculated: "حسابی انجن",
    sightingSave: "موجودہ مہینے محفوظ کریں",
    sightingUpdate: "منتخب کو اپ ڈیٹ کریں",
    sightingDelete: "حذف",
    sightingNamePlaceholder: "آرکائیو کا نام، مثلاً پاکستان ۲۰۲۷",
    sightingHelp: "اس سال کے مہینہ وار آفسیٹ ایک آرکائیو میں محفوظ کریں۔ بعد میں کھولیں، یا اگر رؤیت بدل جائے تو یہیں درست کریں۔",
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
  const [hijriOffsets, setHijriOffsets] = useState<number[]>(() => Array(12).fill(0));
  const [researchNote, setResearchNote] = useState("");
  const [bannerName, setBannerName] = useState("Qalam Works");
  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerSideText, setBannerSideText] = useState("");
  const [bannerLogo, setBannerLogo] = useState("");
  const [logoScale, setLogoScale] = useState(100);
  const [titleFontPx, setTitleFontPx] = useState(15);
  const [titleWidthMm, setTitleWidthMm] = useState(78);
  const [titlePadYMm, setTitlePadYMm] = useState(1.1);
  const [sideFontPx, setSideFontPx] = useState(8);
  const [customSightings, setCustomSightings] = useState<HijriSightingProfile[]>([]);
  const [selectedSightingId, setSelectedSightingId] = useState("calculated");
  const [sightingName, setSightingName] = useState("");
  const [page, setPage] = useState<CalendarPage>("a4-portrait");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const validYear = useMemo(() => parseCalendarYearInput(yearInput), [yearInput]);
  const effectiveWeekStart: WeekStart = calendarLanguage === "ur" ? "monday" : weekStart;
  const effectiveHijriOffset = content === "gregorian-hijri" ? hijriOffset : 0;
  const calendarAnnualTitle = calendarLanguage === "ur" ? "سالانہ تقویم" : "Annual Calendar";
  const previewBannerTitle = bannerTitle.trim() || `${calendarAnnualTitle} ${validYear ?? ""}`.trim();
  const calendarMixedLabel = content === "gregorian-hijri"
    ? (calendarLanguage === "ur" ? "عیسوی + ہجری" : "Gregorian + Hijri")
    : (calendarLanguage === "ur" ? "عیسوی" : "Gregorian");
  const previewSideText = bannerSideText.trim() || calendarMixedLabel;

  const model = useMemo(() => {
    if (validYear === null) return null;
    return buildCalendarYearModel({
      year: validYear,
      content,
      language: calendarLanguage,
      weekStart: effectiveWeekStart,
      page,
      hijriOffset: effectiveHijriOffset,
      hijriOffsets,
    });
  }, [validYear, content, calendarLanguage, effectiveWeekStart, page, effectiveHijriOffset, hijriOffsets]);

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
          hijriOffsets,
          researchNote: researchNote.trim(),
          bannerName: bannerName.trim(),
          bannerTitle: bannerTitle.trim(),
          bannerSideText: bannerSideText.trim(),
          bannerLogo: bannerLogo || undefined,
          logoScale,
          titleFontPx,
          titleWidthMm,
          titlePadYMm,
          sideFontPx,
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

    const readAsDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("logo"));
      reader.readAsDataURL(blob);
    });

    if (file.size <= 520000) {
      try {
        const original = await readAsDataUrl(file);
        if (original.startsWith("data:image/") && original.length <= 750000) {
          setBannerLogo(original);
          return;
        }
      } catch {
        // Fall through to a high-quality resample.
      }
    }

    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error("logo"));
        element.src = url;
      });
      const maxWidth = 1600;
      const maxHeight = 700;
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) return;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      let dataUrl = canvas.toDataURL("image/png");
      if (dataUrl.length > 750000) dataUrl = canvas.toDataURL("image/jpeg", 0.97);
      if (dataUrl.length > 750000) dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setBannerLogo(dataUrl);
    } catch {
      setBannerLogo("");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  useEffect(() => {
    setCustomSightings(readStoredSightingProfiles());
  }, []);

  const allSightings = useMemo(
    () => listSightingProfiles(customSightings),
    [customSightings],
  );

  function applySighting(id: string) {
    setSelectedSightingId(id);
    if (id === "calculated") {
      setHijriOffset(0);
      setHijriOffsets(Array(12).fill(0));
      return;
    }
    const profile = listSightingProfiles(customSightings).find((item) => item.id === id);
    if (!profile) return;
    setHijriOffsets([...profile.offsets]);
    const same = profile.offsets.every((offset) => offset === profile.offsets[0]);
    setHijriOffset(same ? profile.offsets[0] : 0);
    if (profile.note) setResearchNote(profile.note);
    setYearInput(String(profile.year));
  }

  function saveSighting() {
    const name = sightingName.trim();
    if (!name || validYear === null) return;
    const profile: HijriSightingProfile = {
      id: `custom-${Date.now()}`,
      name,
      nameUr: name,
      year: validYear,
      offsets: [...hijriOffsets],
      note: researchNote.trim(),
    };
    const next = [...customSightings.filter((item) => item.id !== profile.id), profile];
    setCustomSightings(next);
    writeStoredSightingProfiles(next);
    setSelectedSightingId(profile.id);
    setSightingName("");
  }

  function updateSelectedSighting() {
    if (validYear === null || selectedSightingId === "calculated") return;
    const selected = allSightings.find((item) => item.id === selectedSightingId);
    if (!selected) return;
    const profile: HijriSightingProfile = {
      id: selected.id,
      name: selected.name,
      nameUr: selected.nameUr,
      year: validYear,
      offsets: [...hijriOffsets],
      note: researchNote.trim(),
    };
    const next = [...customSightings.filter((item) => item.id !== selected.id), profile];
    setCustomSightings(next);
    writeStoredSightingProfiles(next);
  }

  function deleteSelectedSighting() {
    const next = customSightings.filter((item) => item.id !== selectedSightingId);
    setCustomSightings(next);
    writeStoredSightingProfiles(next);
    setSelectedSightingId("calculated");
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
              onChange={(e) => {
                const value = Number(e.target.value);
                setHijriOffset(value);
                setHijriOffsets(Array(12).fill(value));
              }}
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
            <label className={labelClass}>{t.page}</label>
            <select value={page} onChange={(e) => setPage(e.target.value as CalendarPage)} className={selectClass}>
              <option value="a4-portrait">{t.portrait}</option>
              <option value="a4-landscape">{t.landscape}</option>
            </select>
          </div>
        </div>

        {content === "gregorian-hijri" && (
          <div className="mt-4">
            <label className={labelClass}>{t.hijriApplyTo}</label>
            <p className={`mb-2 text-[12px] text-[#4a6a4a] dark:text-[#9fbfa8] ${naskh}`}>{t.hijriMonthHint}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {GREGORIAN_MONTH_LABELS[calendarLanguage].map((label, index) => (
                <label key={label} className={`flex items-center gap-2 rounded-lg border border-[#1A3A2A]/10 px-2 py-1.5 dark:border-[#2a3d30] ${naskh}`}>
                  <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[#1A3A2A] dark:text-[#e8ede9]">{label}</span>
                  <select
                    value={hijriOffsets[index] ?? 0}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setHijriOffsets((current) => current.map((offset, monthIndex) => (monthIndex === index ? value : offset)));
                    }}
                    className="rounded border border-[#1A3A2A]/15 bg-white px-1.5 py-1 text-[12px] dark:border-[#2a3d30] dark:bg-[#0e1c15]"
                    dir="ltr"
                  >
                    <option value={0}>0</option>
                    <option value={1}>+1</option>
                    <option value={-1}>-1</option>
                    <option value={2}>+2</option>
                    <option value={-2}>-2</option>
                  </select>
                </label>
              ))}
            </div>
          </div>
        )}

        {content === "gregorian-hijri" && (
          <div className="mt-4">
            <label className={labelClass}>{t.researchNote}</label>
            <input
              type="text"
              value={researchNote}
              maxLength={240}
              onChange={(e) => setResearchNote(e.target.value)}
              placeholder={t.researchNotePlaceholder}
              className={selectClass}
            />
            <p className={`mt-1.5 text-[12px] text-[#4a6a4a] dark:text-[#9fbfa8] ${naskh}`}>{t.researchNoteHelp}</p>
          </div>
        )}

        {content === "gregorian-hijri" && (
          <div className="mt-4 rounded-xl border border-[#1A3A2A]/10 p-3 dark:border-[#2a3d30]">
            <label className={labelClass}>{t.sightingArchive}</label>
            <p className={`mb-2 text-[12px] text-[#4a6a4a] dark:text-[#9fbfa8] ${naskh}`}>{t.sightingHelp}</p>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <select
                value={selectedSightingId}
                onChange={(e) => applySighting(e.target.value)}
                className={selectClass}
              >
                <option value="calculated">{t.sightingCalculated}</option>
                {allSightings.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {isUr ? profile.nameUr : profile.name} ({profile.year})
                  </option>
                ))}
              </select>
              {selectedSightingId !== "calculated" && (
                <div className="flex gap-2">
                  <button type="button" onClick={updateSelectedSighting} className={`rounded-lg border border-[#1A3A2A]/20 px-3 py-2 text-[12px] font-semibold ${naskh}`}>
                    {t.sightingUpdate}
                  </button>
                  {customSightings.some((profile) => profile.id === selectedSightingId) && (
                    <button type="button" onClick={deleteSelectedSighting} className={`rounded-lg px-3 py-2 text-[12px] font-semibold text-[#8a3a3a] ${naskh}`}>
                      {t.sightingDelete}
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={sightingName}
                maxLength={80}
                onChange={(e) => setSightingName(e.target.value)}
                placeholder={t.sightingNamePlaceholder}
                className={selectClass}
              />
              <button
                type="button"
                onClick={saveSighting}
                disabled={!sightingName.trim() || validYear === null}
                className={`shrink-0 rounded-lg bg-[#1A3A2A] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50 ${naskh}`}
              >
                {t.sightingSave}
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 border-t border-[#1A3A2A]/10 pt-5 dark:border-[#2a3d30]">
          <p className={`mb-3 text-[13px] font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${naskh}`}>{t.bannerSection}</p>
          <p className={`mb-4 text-[12px] text-[#4a6a4a] dark:text-[#9fbfa8] ${naskh}`}>{t.bannerHint}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelClass}>{t.bannerName}</label>
              <textarea
                rows={2}
                value={bannerName}
                maxLength={160}
                onChange={(e) => setBannerName(e.target.value)}
                placeholder={t.bannerNamePlaceholder}
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
              <label className={labelClass}>{t.bannerSide}</label>
              <textarea
                rows={2}
                value={bannerSideText}
                maxLength={160}
                onChange={(e) => setBannerSideText(e.target.value)}
                placeholder={t.bannerSidePlaceholder}
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
            <div>
              <label className={labelClass}>{t.logoSize} ({logoScale}%)</label>
              <input type="range" min={60} max={180} value={logoScale} onChange={(e) => setLogoScale(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className={labelClass}>{t.titleSize} ({titleFontPx}px)</label>
              <input type="range" min={10} max={22} value={titleFontPx} onChange={(e) => setTitleFontPx(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className={labelClass}>{t.titleWidth} ({titleWidthMm}mm)</label>
              <input type="range" min={48} max={130} value={titleWidthMm} onChange={(e) => setTitleWidthMm(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className={labelClass}>{t.titleHeight} ({titlePadYMm.toFixed(1)}mm)</label>
              <input type="range" min={0.6} max={4.5} step={0.1} value={titlePadYMm} onChange={(e) => setTitlePadYMm(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className={labelClass}>{t.sideSize} ({sideFontPx}px)</label>
              <input type="range" min={6} max={16} value={sideFontPx} onChange={(e) => setSideFontPx(Number(e.target.value))} className="w-full" />
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
              <div className="flex min-w-0 items-center gap-2 justify-self-start ps-2 text-center">
                {bannerLogo && (
                  <img
                    src={bannerLogo}
                    alt=""
                    className="w-auto object-contain"
                    style={{ height: `${Math.round(36 * logoScale / 100)}px`, maxWidth: `${Math.round(140 * logoScale / 100)}px` }}
                  />
                )}
                {bannerName.trim() ? (
                  <span className="whitespace-pre-line text-center font-nastaliq font-black leading-snug tracking-wide" dir={calendarLanguage === "ur" ? "rtl" : "ltr"}>
                    {bannerName.trim()}
                  </span>
                ) : null}
              </div>

              <div
                className={`rounded-full border-2 border-[var(--calendar-gold)] bg-[var(--calendar-title-capsule)] text-center font-nastaliq text-[var(--calendar-frame)] shadow-inner`}
                style={{ minWidth: `${Math.round(titleWidthMm * 3.2)}px`, padding: `${Math.round(titlePadYMm * 4)}px 28px` }}
              >
                <div className="truncate font-black leading-snug" style={{ fontSize: `${titleFontPx + 6}px` }}>
                  {previewBannerTitle}
                </div>
              </div>

              <div className={`justify-self-end whitespace-pre-line pe-2 text-center font-nastaliq font-bold leading-snug`} style={{ fontSize: `${sideFontPx + 4}px` }} dir={calendarLanguage === "ur" ? "rtl" : "ltr"}>
                {previewSideText}
              </div>
            </header>

            {researchNote.trim() && (
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
                  hijriOffset={model.hijriOffsets[month.month - 1] ?? 0}
                  showHijri={content === "gregorian-hijri"}
                  interactive={false}
                  compact
                />
              ))}
            </div>

            <footer className="flex items-center justify-between border-t border-[var(--calendar-frame)]/30 px-2 py-1 text-[9px] text-[var(--calendar-footer-text)]" dir="ltr">
              <span>qalamworks.com</span>
              {researchNote.trim() ? <span>{researchNote.trim()}</span> : <span />}
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
