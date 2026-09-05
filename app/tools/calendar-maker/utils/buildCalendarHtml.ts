import {
  deriveHijriMonthContexts,
  formatHijriContextYear,
  isSunday,
  toUrduDigits,
} from "./calendarPresentation";
import {
  CALENDAR_REFERENCE_WEEKDAYS,
  CALENDAR_URDU_WEEKDAYS,
  CALENDAR_PDF_HIJRI_SHORT_EN,
  CALENDAR_MONTH_DAY_CELLS,
  CALENDAR_MONTH_WEEK_ROWS,
  calendarPdfMonthVariables,
  calendarPdfRootVariables,
  calendarPrintMetrics,
} from "./calendarVisualSpec";
import {
  GREGORIAN_MONTH_LABELS,
  type CalendarYearModel,
} from "./calendarModel";

export interface EmbeddedNaskhFonts {
  regularBase64: string;
  boldBase64: string;
}

export interface CalendarHtmlOptions {
  naskhFonts?: EmbeddedNaskhFonts;
  researchNote?: string;
  bannerName?: string;
  bannerTitle?: string;
  bannerLogo?: string;
}

function safeBannerText(value: string | undefined, fallback: string, maxLength: number): string {
  const trimmed = value?.replace(/\s+/g, " ").trim() ?? "";
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
}

function safeBannerLogo(value: string | undefined): string | null {
  if (!value || value.length > 140000) return null;
  if (!/^data:image\/(png|jpeg);base64,/i.test(value)) return null;
  return value;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildCalendarHtml(model: CalendarYearModel, options: CalendarHtmlOptions = {}): string {
  const isUr = model.language === "ur";
  const metrics = calendarPrintMetrics(model.page);
  const monthLabels = GREGORIAN_MONTH_LABELS[model.language];
  const dayLabels = isUr
    ? CALENDAR_URDU_WEEKDAYS
    : model.weekStart === "sunday"
      ? (["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const)
      : CALENDAR_REFERENCE_WEEKDAYS;
  const defaultTitle = isUr ? `${model.year} سالانہ تقویم` : `Annual Calendar ${model.year}`;
  const title = safeBannerText(options.bannerTitle, defaultTitle, 80);
  const brandName = safeBannerText(options.bannerName, "Qalam Works", 80);
  const brandLogo = safeBannerLogo(options.bannerLogo);
  const mixedLabel = model.content === "gregorian-hijri"
    ? (isUr ? "عیسوی + ہجری" : "Gregorian + Hijri")
    : (isUr ? "عیسوی" : "Gregorian");

  const fontFace = isUr && options.naskhFonts
    ? `
@font-face{
  font-family:'QalamNaskh';
  src:url(data:font/woff2;base64,${options.naskhFonts.regularBase64}) format('woff2');
  font-weight:400;
  font-style:normal;
}
@font-face{
  font-family:'QalamNaskh';
  src:url(data:font/woff2;base64,${options.naskhFonts.boldBase64}) format('woff2');
  font-weight:700 900;
  font-style:normal;
}`
    : "";

  const researchNote = options.researchNote?.trim() ?? "";
  const researchNoteHtml = researchNote
    ? `<div data-research-note="true" class="research-note">${escapeHtml(researchNote)}</div>`
    : "";
  const researchNoteFooterHtml = researchNote
    ? `<span data-research-note-footer="true" class="research-note-footer">${escapeHtml(researchNote)}</span>`
    : "";

  const monthsHtml = model.months.map((month) => {
    const contexts = model.content === "gregorian-hijri"
      ? deriveHijriMonthContexts(month, model.language, model.hijriOffset)
      : [];
    const startHijriContexts = contexts.slice(0, 1);
    const endHijriContexts = contexts.slice(1);
    const leftHijriContexts = isUr ? endHijriContexts : startHijriContexts;
    const rightHijriContexts = isUr ? startHijriContexts : endHijriContexts;

    const contextHtml = (items: typeof contexts) => items.map((context, index) => {
      const label = isUr ? context.label : CALENDAR_PDF_HIJRI_SHORT_EN[context.month - 1];
      return `
      <span class="ctx-item">
        ${index ? '<span class="slash">/</span>' : ""}
        <span class="ctx-stack">
          <span class="ctx-name" dir="${isUr ? "rtl" : "ltr"}">${escapeHtml(label)}</span>
          <span class="ctx-year" dir="${isUr ? "rtl" : "ltr"}">${escapeHtml(formatHijriContextYear(context, model.language))}</span>
        </span>
      </span>
    `;
    }).join("");

    const cellHtml = month.weeks.flatMap((week) => week.cells).map((cell) => {
      if (!cell.inCurrentMonth) {
        return `<div class="day filler" aria-hidden="true"></div>`;
      }

      const hijri = cell.hijri
        ? `<span class="hijri-day" data-pdf-hijri-day="true" style="grid-column:2 !important;grid-row:2 !important;align-self:end !important;justify-self:end !important;color:#15803d !important;font-size:${metrics.hijriFont} !important;font-weight:bold !important;line-height:1 !important;">${escapeHtml(isUr ? toUrduDigits(cell.hijri.day) : String(cell.hijri.day))}</span>`
        : "";

      return `<div class="day current${isSunday(cell.gregorian) ? " sunday" : ""}" dir="ltr" style="position:relative !important;display:grid !important;grid-template-columns:1fr 1fr !important;grid-template-rows:1fr 1fr !important;overflow:hidden !important;"><div class="greg-day" data-pdf-gregorian-day="true" style="grid-column:1 !important;grid-row:1 !important;align-self:start !important;justify-self:start !important;font-size:${metrics.gregorianFont} !important;font-weight:900 !important;line-height:1 !important;color:#161a17 !important;">${cell.gregorian.day}</div>${hijri}</div>`;
    });
    while (cellHtml.length < CALENDAR_MONTH_DAY_CELLS) {
      cellHtml.push(`<div class="day filler" aria-hidden="true"></div>`);
    }
    const cells = cellHtml.slice(0, CALENDAR_MONTH_DAY_CELLS).join("");

    return `<section class="month" style="${calendarPdfMonthVariables(month.month)}">
      <header class="month-head" dir="ltr" style="height:${metrics.monthHeaderHeightPx}px !important;min-height:${metrics.monthHeaderHeightPx}px !important;display:flex !important;align-items:center !important;justify-content:space-between !important;gap:4px !important;overflow:hidden !important;padding:0 5px !important;">
        <div class="ctx ctx-left" data-hijri-side="left" data-hijri-role="${isUr ? "end" : "start"}" dir="ltr" style="flex:1 1 0 !important;min-width:0 !important;height:100% !important;display:flex !important;align-items:center !important;justify-content:left !important;margin:0 !important;">${contextHtml(leftHijriContexts)}</div>
        <h2 data-pdf-month-title="true" dir="ltr" style="flex:0 0 auto !important;height:auto !important;font-size:${metrics.monthTitleFont} !important;font-weight:900 !important;line-height:1.25 !important;padding:1px 0 !important;margin:0 3px !important;display:inline-flex !important;align-items:center !important;justify-content:center !important;gap:3px !important;flex-direction:${isUr ? "row-reverse" : "row"} !important;vertical-align:middle !important;overflow:visible !important;white-space:nowrap !important;"><span class="month-title-name" dir="${isUr ? "rtl" : "ltr"}" style="display:inline-flex !important;align-items:center !important;justify-content:center !important;line-height:1.25 !important;vertical-align:middle !important;overflow:visible !important;">${escapeHtml(monthLabels[month.month - 1])}</span><span class="month-title-year" dir="ltr" style="display:inline-flex !important;align-items:center !important;justify-content:center !important;line-height:1.25 !important;vertical-align:middle !important;">${model.year}</span></h2>
        <div class="ctx ctx-right" data-hijri-side="right" data-hijri-role="${isUr ? "start" : "end"}" dir="ltr" style="flex:1 1 0 !important;min-width:0 !important;height:100% !important;display:flex !important;align-items:center !important;justify-content:right !important;margin:0 !important;">${contextHtml(rightHijriContexts)}</div>
      </header>
      <div class="days" data-pdf-week-rows="${CALENDAR_MONTH_WEEK_ROWS}" dir="${isUr ? "rtl" : "ltr"}">
        ${dayLabels.map((label, index) => `<div data-pdf-weekday="true"${index === 0 ? ' data-pdf-weekday-row="true"' : ""} class="weekday${label === "Sun" || label === "اتوار" ? " sun" : ""}" style="display:flex !important;align-items:center !important;justify-content:center !important;line-height:1 !important;padding:0 !important;font-size:${metrics.weekdayFont} !important;font-weight:700 !important;${isUr ? "font-family:'QalamNaskh',serif !important;" : ""}">${label}</div>`).join("")}
        ${cells}
      </div>
    </section>`;
  }).join("");

  return `<!doctype html>
<html lang="${model.language}" dir="${isUr ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)} — Qalam Works</title>
<style>
${fontFace}
:root{${calendarPdfRootVariables()}}
@page { size: A4 ${metrics.landscape ? "landscape" : "portrait"}; margin: ${metrics.safeMarginMm}mm; }
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff;color:var(--calendar-text);width:100%;height:100%}
body{
  font-family:${isUr ? "'QalamNaskh',serif" : "Arial,Helvetica,sans-serif"};
  font-synthesis:none;
  -webkit-print-color-adjust:exact;
  print-color-adjust:exact;
}
.page{
  width:100%;
  height:${metrics.contentHeightMm}mm;
  display:flex;
  flex-direction:column;
  padding:${metrics.innerFramePaddingMm}mm;
  border:2.2px solid var(--calendar-frame);
  background:var(--calendar-paper);
  overflow:hidden;
}
.poster-head{
  min-height:${metrics.landscape ? "13.6mm" : "14.6mm"};
  display:grid;
  grid-template-columns:1fr auto 1fr;
  align-items:center;
  gap:3mm;
  background:var(--calendar-frame);
  border-bottom:1.3px solid var(--calendar-gold);
  padding:1.35mm 3mm;
  color:#fff;
}
.brand{
  justify-self:start;
  display:flex;
  align-items:center;
  gap:1.5mm;
  min-width:0;
  max-width:100%;
}
.brand-logo{
  height:${metrics.landscape ? "8.6mm" : "9.2mm"};
  width:auto;
  max-width:22mm;
  object-fit:contain;
  flex:0 0 auto;
}
.brand-name{font-weight:800;font-size:${metrics.landscape ? "7.6px" : "8.2px"};direction:ltr;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.poster-title{
  min-width:${metrics.landscape ? "60mm" : "68mm"};
  text-align:center;
  border:1.4px solid var(--calendar-gold);
  border-radius:999px;
  background:var(--calendar-title-capsule);
  color:var(--calendar-frame);
  padding:1mm 5mm;
  font-weight:900;
  font-size:${metrics.landscape ? "13.6px" : "14.6px"};
  line-height:1.05;
}
.poster-mode{justify-self:end;text-align:end;font-size:${metrics.landscape ? "6.8px" : "7.4px"};font-weight:700}
.research-note{
  padding:.7mm 2mm;
  border-bottom:.5px solid var(--calendar-gold);
  background:#fff7e9;
  color:var(--calendar-research-text);
  font-size:5.4px;
}
.year-grid{
  flex:1;
  min-height:0;
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  grid-template-rows:repeat(4,minmax(0,1fr));
  gap:${metrics.monthGapMm}mm;
  padding:1.25mm;
  direction:${isUr ? "rtl" : "ltr"};
}
.month{
  min-width:0;
  min-height:0;
  display:flex;
  flex-direction:column;
  border:1px solid var(--calendar-grid-strong);
  overflow:hidden;
}
.month-head{
  min-height:${metrics.monthHeaderHeightPx}px !important;
  height:${metrics.monthHeaderHeightPx}px !important;
  display:flex !important;
  align-items:center !important;
  justify-content:space-between !important;
  gap:4px !important;
  padding:0 5px !important;
  background:var(--calendar-header);
  border-bottom:1px solid var(--calendar-grid-strong);
  overflow:hidden;
}
.month-head h2{
  margin:0;
  flex:0 0 auto !important;
  white-space:nowrap;
  text-align:center;
  color:var(--calendar-month-title);
  font-weight:bold !important;
  font-size:${metrics.monthTitleFont} !important;
  line-height:1.25 !important;
  padding:1px 0 !important;
  display:inline-flex !important;
  align-items:center !important;
  justify-content:center !important;
  gap:3px !important;
  vertical-align:middle !important;
  overflow:visible !important;
}
.ctx{min-width:0;height:100%;display:flex;align-items:center;gap:.25mm;color:var(--calendar-hijri-context);overflow:hidden}
.ctx-left{flex:1 1 0;justify-content:left !important;text-align:left !important}
.ctx-right{flex:1 1 0;justify-content:right !important;text-align:right !important}
.ctx-item{display:inline-flex;align-items:center;gap:.45mm;min-width:0;line-height:1}
.ctx-stack{display:flex !important;min-width:0;width:auto !important;height:100% !important;flex-direction:column !important;justify-content:center !important;align-items:center !important;text-align:center !important;line-height:1;transform:none !important;}
.ctx-left .ctx-stack,.ctx-right .ctx-stack{align-items:center !important;text-align:center !important}
.ctx-name{
  display:block !important;
  width:100% !important;
  max-width:100%;
  font-size:${metrics.hijriContextMonthFont} !important;
  font-weight:700 !important;
  line-height:1 !important;
  text-align:center !important;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.ctx-year{
  display:block !important;
  width:100% !important;
  margin-top:.25mm;
  font-size:${metrics.hijriContextYearFont} !important;
  font-weight:700 !important;
  text-align:center !important;
  color:var(--calendar-context-year);
  line-height:1.1 !important;
  white-space:nowrap;
}
.slash{font-size:5.3px;color:var(--calendar-hijri-context);opacity:.7;font-weight:700}
.days{
  flex:1;
  min-height:0;
  display:grid;
  grid-template-columns:repeat(7,minmax(0,1fr));
  grid-template-rows:${metrics.weekdayHeightPx}px repeat(${CALENDAR_MONTH_WEEK_ROWS},minmax(0,1fr));
  gap:1px;
  background:var(--calendar-grid-strong);
}
.weekday{
  min-width:0;
  min-height:${metrics.weekdayHeightPx}px;
  border:none;
  background:var(--calendar-weekday);
  display:flex !important;
  align-items:center !important;
  justify-content:center !important;
  text-align:center;
  font-size:${metrics.weekdayFont} !important;
  font-weight:700 !important;
  color:var(--calendar-text);
  line-height:1.15 !important;
  overflow:hidden;
}
.weekday.sun{color:var(--calendar-month-title)}
.day{
  position:relative !important;
  min-width:0;
  min-height:0;
  border:none;
  background:var(--calendar-cell);
  overflow:hidden;
}
.day.current{
  display:grid !important;
  grid-template-columns:minmax(0,1fr) minmax(0,1fr) !important;
  grid-template-rows:minmax(0,1fr) minmax(0,1fr) !important;
  padding:1px 2px !important;
  overflow:hidden !important;
}
.filler{background:var(--calendar-filler);overflow:hidden}
.greg-day{
  grid-column:1;
  grid-row:1;
  align-self:start;
  justify-self:start;
  text-align:left;
  max-width:100%;
  white-space:nowrap;
  overflow:visible;
  font-family:Arial,Helvetica,sans-serif;
  font-size:${metrics.gregorianFont} !important;
  font-weight:900;
  line-height:1;
  color:#161a17;
  direction:ltr;
}
.day.sunday .greg-day{color:var(--calendar-month-title) !important}
.hijri-day{
  grid-column:2;
  grid-row:2;
  align-self:end;
  justify-self:end;
  text-align:right;
  max-width:100%;
  white-space:nowrap;
  overflow:visible;
  font-size:${metrics.hijriFont} !important;
  font-weight:bold !important;
  line-height:1 !important;
  color:#15803d !important;
}
.footer{
  min-height:3.1mm;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:2mm;
  padding:.4mm 1.4mm;
  border-top:.4px solid var(--calendar-frame);
  color:var(--calendar-footer-text);
  font-size:4.4px;
  direction:ltr;
}
.research-note-footer{max-width:48%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--calendar-research-text)}
</style>
</head>
<body>
<main class="page">
  <header class="poster-head">
    <div class="brand">
      ${brandLogo ? `<img class="brand-logo" alt="" src="${brandLogo}" />` : ""}
      <div class="brand-name">${escapeHtml(brandName)}</div>
    </div>
    <div class="poster-title">${escapeHtml(title)}</div>
    <div class="poster-mode">${escapeHtml(mixedLabel)}</div>
  </header>
  ${researchNoteHtml}
  <div class="year-grid">${monthsHtml}</div>
  <footer class="footer"><span>qalamworks.com</span>${researchNoteFooterHtml}<span>${escapeHtml(mixedLabel)}</span></footer>
</main>
</body>
</html>`;
}
