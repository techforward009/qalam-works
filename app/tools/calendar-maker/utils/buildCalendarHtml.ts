import {
  deriveHijriMonthContexts,
  formatHijriContextYear,
  isSunday,
  toUrduDigits,
} from "./calendarPresentation";
import {
  CALENDAR_REFERENCE_WEEKDAYS,
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
  const dayLabels = !isUr && model.weekStart === "sunday"
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
    const first = contexts.slice(0, 1);
    const rest = contexts.slice(1);

    const contextHtml = (items: typeof contexts) => items.map((context, index) => `
      <span class="ctx-item">
        ${index ? '<span class="slash">/</span>' : ""}
        <span class="ctx-stack">
          <span class="ctx-name">${escapeHtml(context.label)}</span>
          <span class="ctx-year">${escapeHtml(formatHijriContextYear(context, model.language))}</span>
        </span>
      </span>
    `).join("");

    const cells = month.weeks.flatMap((week) => week.cells).map((cell) => {
      if (!cell.inCurrentMonth) {
        return `<div class="day filler" aria-hidden="true"></div>`;
      }

      const hijri = cell.hijri
        ? `<div class="hijri-day">${escapeHtml(isUr ? toUrduDigits(cell.hijri.day) : String(cell.hijri.day))}</div>`
        : "";

      return `<div class="day current${isSunday(cell.gregorian) ? " sunday" : ""}"><div class="greg-day">${cell.gregorian.day}</div>${hijri}</div>`;
    }).join("");

    return `<section class="month" style="${calendarPdfMonthVariables(month.month)}">
      <header class="month-head" dir="${isUr ? "rtl" : "ltr"}">
        <div class="ctx ctx-start">${contextHtml(first)}</div>
        <h2>${escapeHtml(monthLabels[month.month - 1])} ${model.year}</h2>
        <div class="ctx ctx-end">${contextHtml(rest)}</div>
      </header>
      <div class="weekdays" dir="${isUr ? "rtl" : "ltr"}">
        ${dayLabels.map((label) => `<div class="${label === "Sun" ? "sun" : ""}">${label}</div>`).join("")}
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
  min-height:${metrics.monthHeaderMm}mm;
  display:grid;
  grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);
  align-items:center;
  gap:1.1mm;
  padding:1.15mm 1.15mm;
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
  font-weight:900;
  font-size:${metrics.monthTitleFont};
  line-height:1.18;
  padding-top:.35mm;
  padding-bottom:.1mm;
  display:flex;
  align-items:center;
  justify-content:center;
  overflow:hidden;
  text-overflow:ellipsis;
}
.ctx{min-width:0;height:100%;display:flex;align-items:center;gap:.55mm;color:var(--calendar-hijri-context);overflow:hidden}
.ctx-start{justify-content:flex-start;text-align:start}
.ctx-end{justify-content:flex-end;text-align:end}
.ctx-item{display:inline-flex;align-items:center;gap:.45mm;min-width:0;line-height:1}
.ctx-stack{display:inline-flex;min-width:0;height:100%;flex-direction:column;justify-content:center;align-items:stretch;line-height:1}
.ctx-name{
  max-width:100%;
  font-size:${metrics.landscape ? "5.8px" : "6.3px"};
  font-weight:700;
  line-height:1;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.ctx-year{
  margin-top:.25mm;
  font-size:${metrics.landscape ? "4.6px" : "5px"};
  font-weight:700;
  color:var(--calendar-context-year);
  line-height:1;
  white-space:nowrap;
}
.slash{font-size:5.3px;color:var(--calendar-hijri-context);opacity:.7;font-weight:700}
.weekdays,.days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr))}
.weekdays{min-height:${metrics.weekdayStripMm}mm;background:var(--calendar-weekday);border-bottom:.65px solid var(--calendar-grid-strong);align-items:stretch}
.weekdays>div{
  min-width:0;
  min-height:${metrics.weekdayStripMm}mm;
  padding:.75mm 0;
  border-inline-end:.5px solid var(--calendar-weekday-grid);
  display:flex;
  align-items:center;
  justify-content:center;
  text-align:center;
  font-size:${metrics.landscape ? "5.5px" : "5.9px"};
  font-weight:900;
  color:var(--calendar-text);
  line-height:1.15;
  overflow:hidden;
}
.weekdays .sun{color:var(--calendar-month-title)}
.days{flex:1;min-height:0;grid-auto-rows:1fr}
.day{
  min-width:0;
  min-height:0;
  border-inline-end:.5px solid var(--calendar-grid);
  border-bottom:.5px solid var(--calendar-grid);
  background:var(--calendar-cell);
  overflow:hidden;
}
.day.current{
  display:grid;
  grid-template-columns:minmax(0,1fr) minmax(0,1fr);
  grid-template-rows:minmax(0,1fr) minmax(0,1fr);
  padding:.55mm .28mm .18mm .7mm;
}
.filler{background:var(--calendar-filler)}
.greg-day{
  grid-column:1;
  grid-row:1;
  align-self:start;
  justify-self:start;
  text-align:left;
  max-width:100%;
  white-space:nowrap;
  overflow:hidden;
  font-family:Arial,Helvetica,sans-serif;
  font-size:${metrics.gregorianFont};
  font-weight:900;
  line-height:1;
  color:var(--calendar-text);
  direction:ltr;
}
.day.sunday .greg-day{color:var(--calendar-month-title)}
.hijri-day{
  grid-column:2;
  grid-row:2;
  align-self:end;
  justify-self:end;
  text-align:right;
  max-width:100%;
  white-space:nowrap;
  overflow:hidden;
  font-size:${metrics.hijriFont};
  font-weight:700;
  line-height:1;
  color:var(--calendar-hijri-day);
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
