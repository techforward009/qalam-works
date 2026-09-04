import {
  deriveHijriMonthContexts,
  formatHijriContextYear,
  isSunday,
  toUrduDigits,
} from "./calendarPresentation";
import {
  CALENDAR_REFERENCE_WEEKDAYS,
  CALENDAR_URDU_WEEKDAYS,
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
  const title = isUr ? `${model.year} سالانہ تقویم` : `Annual Calendar ${model.year}`;
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

    const contextHtml = (items: typeof contexts) => items.map((context, index) => `
      <span class="ctx-item">
        ${index ? '<span class="slash">/</span>' : ""}
        <span class="ctx-stack" style="display:flex !important;flex-direction:column !important;align-items:center !important;justify-content:center !important;text-align:center !important;width:100% !important;height:100% !important;">
          <span class="ctx-name" style="display:block !important;width:100% !important;text-align:center !important;">${escapeHtml(context.label)}</span>
          <span class="ctx-year" style="display:block !important;width:100% !important;text-align:center !important;font-size:${metrics.hijriContextYearFont} !important;">${escapeHtml(formatHijriContextYear(context, model.language))}</span>
        </span>
      </span>
    `).join("");

    const cells = month.weeks.flatMap((week) => week.cells).map((cell) => {
      if (!cell.inCurrentMonth) {
        return `<div class="day filler" aria-hidden="true"></div>`;
      }

      const hijri = cell.hijri
        ? `<span class="hijri-day" data-pdf-hijri-day="true" style="position:absolute !important;bottom:2px !important;right:2px !important;color:#15803d !important;font-size:${metrics.hijriFont} !important;font-weight:bold !important;display:block !important;line-height:1 !important;z-index:2 !important;">${escapeHtml(isUr ? toUrduDigits(cell.hijri.day) : String(cell.hijri.day))}</span>`
        : "";

      return `<div class="day current${isSunday(cell.gregorian) ? " sunday" : ""}" style="position:relative !important;overflow:visible !important;"><div class="greg-day" data-pdf-gregorian-day="true" style="position:absolute !important;top:2px !important;left:2px !important;font-size:${metrics.gregorianFont} !important;font-weight:bold !important;line-height:1 !important;display:block !important;z-index:1 !important;">${cell.gregorian.day}</div>${hijri}</div>`;
    }).join("");

    return `<section class="month" style="${calendarPdfMonthVariables(month.month)}">
      <header class="month-head" dir="ltr" style="height:${metrics.monthHeaderHeightPx}px !important;min-height:${metrics.monthHeaderHeightPx}px !important;display:flex !important;align-items:center !important;justify-content:space-between !important;gap:6px !important;overflow:hidden !important;padding:0 4px !important;">
        <div class="ctx ctx-left" data-hijri-side="left" data-hijri-role="${isUr ? "end" : "start"}" dir="${isUr ? "rtl" : "ltr"}" style="flex:1 1 0 !important;min-width:48px !important;height:100% !important;display:flex !important;align-items:center !important;justify-content:center !important;margin:0 4px 0 0 !important;">${contextHtml(leftHijriContexts)}</div>
        <h2 data-pdf-month-title="true" dir="ltr" style="flex:0 1 auto !important;height:100% !important;font-size:${metrics.monthTitleFont} !important;font-weight:900 !important;line-height:1 !important;padding:0 !important;margin:0 4px !important;display:inline-flex !important;align-items:center !important;justify-content:center !important;gap:4px !important;flex-direction:${isUr ? "row-reverse" : "row"} !important;vertical-align:middle !important;overflow:hidden !important;white-space:nowrap !important;"><span class="month-title-name" dir="${isUr ? "rtl" : "ltr"}" style="display:inline-flex !important;height:100% !important;align-items:center !important;justify-content:center !important;line-height:1 !important;vertical-align:middle !important;">${escapeHtml(monthLabels[month.month - 1])}</span><span class="month-title-year" dir="ltr" style="display:inline-flex !important;height:100% !important;align-items:center !important;justify-content:center !important;line-height:1 !important;vertical-align:middle !important;">${model.year}</span></h2>
        <div class="ctx ctx-right" data-hijri-side="right" data-hijri-role="${isUr ? "start" : "end"}" dir="${isUr ? "rtl" : "ltr"}" style="flex:1 1 0 !important;min-width:48px !important;height:100% !important;display:flex !important;align-items:center !important;justify-content:center !important;margin:0 0 0 4px !important;">${contextHtml(rightHijriContexts)}</div>
      </header>
      <div class="weekdays" data-pdf-weekday-row="true" dir="${isUr ? "rtl" : "ltr"}" style="height:${metrics.weekdayHeightPx}px !important;min-height:${metrics.weekdayHeightPx}px !important;display:flex !important;align-items:center !important;justify-content:center !important;overflow:hidden !important;">
        ${dayLabels.map((label) => `<div data-pdf-weekday="true" class="${label === "Sun" || label === "اتوار" ? "sun" : ""}" style="height:${metrics.weekdayHeightPx}px !important;min-height:${metrics.weekdayHeightPx}px !important;flex:1 1 0 !important;display:flex !important;align-items:center !important;justify-content:center !important;line-height:1 !important;padding:0 !important;font-size:${metrics.weekdayFont} !important;font-weight:700 !important;${isUr ? "font-family:'QalamNaskh',serif !important;" : ""}">${label}</div>`).join("")}
      </div>
      <div class="days" dir="${isUr ? "rtl" : "ltr"}">${cells}</div>
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
.brand-name{font-weight:800;font-size:${metrics.landscape ? "7.6px" : "8.2px"};direction:ltr;justify-self:start}
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
  border:.65px solid var(--calendar-grid-strong);
  overflow:hidden;
}
.month-head{
  min-height:${metrics.monthHeaderHeightPx}px !important;
  height:${metrics.monthHeaderHeightPx}px !important;
  display:flex !important;
  align-items:center !important;
  justify-content:space-between !important;
  gap:6px !important;
  padding:0 4px !important;
  background:var(--calendar-header);
  border-bottom:.65px solid var(--calendar-grid-strong);
  overflow:hidden;
}
.month-head h2{
  margin:0;
  min-width:0;
  white-space:nowrap;
  text-align:center;
  color:var(--calendar-month-title);
  font-weight:bold !important;
  font-size:${metrics.monthTitleFont} !important;
  line-height:1 !important;
  padding:0 !important;
  display:inline-flex !important;
  align-items:center !important;
  justify-content:center !important;
  gap:4px !important;
  vertical-align:middle !important;
  overflow:hidden !important;
  text-overflow:clip !important;
}
.ctx{min-width:48px;height:100%;display:flex;align-items:center;gap:.35mm;color:var(--calendar-hijri-context);overflow:hidden}
.ctx-left,.ctx-right{flex:1 1 0;justify-content:center !important;text-align:center !important}
.ctx-left{margin-right:2px}
.ctx-right{margin-left:2px}
.ctx-item{display:inline-flex;align-items:center;gap:.45mm;min-width:0;line-height:1}
.ctx-stack{display:flex !important;min-width:0;width:100% !important;height:100% !important;flex-direction:column !important;justify-content:center !important;align-items:center !important;text-align:center !important;line-height:1;transform:none !important;}
.ctx-name{
  display:block !important;
  width:100% !important;
  max-width:100%;
  font-size:${metrics.hijriContextMonthFont} !important;
  font-weight:700 !important;
  text-align:center !important;
  line-height:1 !important;
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
.weekdays{display:flex !important}.days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr))}
.weekdays{height:${metrics.weekdayHeightPx}px !important;min-height:${metrics.weekdayHeightPx}px !important;background:var(--calendar-weekday);border-bottom:.65px solid var(--calendar-grid-strong);align-items:stretch}
.weekdays>div{
  min-width:0;
  height:${metrics.weekdayHeightPx}px !important;
  min-height:${metrics.weekdayHeightPx}px !important;
  flex:1 1 0 !important;
  padding:0 !important;
  border-inline-end:.5px solid var(--calendar-weekday-grid);
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
.weekdays .sun{color:var(--calendar-month-title)}
.days{flex:1;min-height:0;grid-auto-rows:minmax(0,1fr)}
.day{
  position:relative !important;
  min-width:0;
  min-height:0;
  border-inline-end:.5px solid var(--calendar-grid);
  border-bottom:.5px solid var(--calendar-grid);
  background:var(--calendar-cell);
  overflow:visible;
}
.day.current{
  display:grid;
  grid-template-columns:minmax(0,1fr) minmax(0,1fr);
  grid-template-rows:minmax(0,1fr) minmax(0,1fr);
  padding:2px 3px !important;
  overflow:visible !important;
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
  color:var(--calendar-text);
  direction:ltr;
}
.day.sunday .greg-day{color:var(--calendar-month-title)}
.hijri-day{
  position:absolute !important;
  right:2px !important;
  bottom:2px !important;
  max-width:100%;
  white-space:nowrap;
  overflow:visible !important;
  font-size:${metrics.hijriFont} !important;
  font-weight:bold !important;
  display:block !important;
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
    <div class="brand-name">Qalam Works</div>
    <div class="poster-title"><span dir="ltr">${model.year}</span> ${escapeHtml(isUr ? "سالانہ تقویم" : "Annual Calendar")}</div>
    <div class="poster-mode">${escapeHtml(mixedLabel)}</div>
  </header>
  ${researchNoteHtml}
  <div class="year-grid">${monthsHtml}</div>
  <footer class="footer"><span>qalamworks.com</span>${researchNoteFooterHtml}<span>${escapeHtml(mixedLabel)}</span></footer>
</main>
</body>
</html>`;
}
