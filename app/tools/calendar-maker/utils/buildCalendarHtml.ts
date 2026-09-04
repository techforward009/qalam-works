import {
  deriveHijriMonthContexts,
  formatHijriContextYear,
  toUrduDigits,
} from "./calendarPresentation";
import {
  GREGORIAN_MONTH_LABELS,
  weekdayLabels,
  type CalendarYearModel,
} from "./calendarModel";

export interface CalendarHtmlOptions {
  naskhFontBase64?: string;
  researchNote?: string;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function buildCalendarHtml(model: CalendarYearModel, options: CalendarHtmlOptions = {}): string {
  const isUr = model.language === "ur";
  const landscape = model.page === "a4-landscape";
  const monthLabels = GREGORIAN_MONTH_LABELS[model.language];
  const dayLabels = weekdayLabels(model.language, isUr ? "monday" : model.weekStart);
  const title = isUr ? `${model.year} سالانہ تقویم` : `${model.year} Annual Calendar`;
  const subtitle = model.content === "gregorian-hijri"
    ? (isUr ? "عیسوی + ہجری" : "Gregorian + Hijri")
    : (isUr ? "عیسوی" : "Gregorian");
  const fontFace = isUr && options.naskhFontBase64
    ? `@font-face{font-family:'QalamNaskh';src:url(data:font/woff2;base64,${options.naskhFontBase64}) format('woff2');font-weight:400;font-style:normal;}`
    : "";
  const researchNote = options.researchNote?.trim() ?? "";
  const researchNoteHtml = researchNote
    ? `<div data-research-note="true" class="research-note">${escapeHtml(researchNote)}</div>`
    : "";
  const researchNoteFooterHtml = researchNote
    ? `<span data-research-note-footer="true" class="research-note-footer">${escapeHtml(researchNote)}</span>`
    : "";

  const monthsHtml = model.months.map((month) => {
    const contexts = deriveHijriMonthContexts(month, model.language, model.hijriOffset);
    const first = contexts.slice(0, 1);
    const rest = contexts.slice(1);
    const contextHtml = (items: typeof contexts) => items.map((context, index) => `
      <span class="ctx-item">${index ? '<span class="slash">/</span>' : ''}<span class="ctx-name">${escapeHtml(context.label)}</span><span class="ctx-year">${escapeHtml(formatHijriContextYear(context, model.language))}</span></span>
    `).join("");

    const cells = month.weeks.flatMap((week) => week.cells).map((cell) => {
      if (!cell.inCurrentMonth) return `<div class="day filler" aria-hidden="true"></div>`;
      const hijri = cell.hijri
        ? `<div class="hijri-day">${escapeHtml(isUr ? toUrduDigits(cell.hijri.day) : String(cell.hijri.day))}</div>`
        : "";
      return `<div class="day current"><div class="greg-day">${cell.gregorian.day}</div>${hijri}</div>`;
    }).join("");

    return `<section class="month">
      <header class="month-head" dir="${isUr ? "rtl" : "ltr"}">
        <div class="ctx start">${contextHtml(first)}</div>
        <h2>${escapeHtml(monthLabels[month.month - 1])} ${model.year}</h2>
        <div class="ctx end">${contextHtml(rest)}</div>
      </header>
      <div class="weekdays" dir="${isUr ? "rtl" : "ltr"}">${dayLabels.map((label) => `<div class="${label === "Sun" || label === "اتوار" ? "sun" : ""}">${escapeHtml(label)}</div>`).join("")}</div>
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
@page { size: A4 ${landscape ? "landscape" : "portrait"}; margin: 7mm; }
*{box-sizing:border-box} html,body{margin:0;padding:0;background:#fff;color:#17251d}
body{font-family:${isUr ? "'QalamNaskh',Tahoma,Arial,sans-serif" : "Arial,Helvetica,sans-serif"}}
.page{width:100%;height:${landscape ? "190mm" : "277mm"};display:flex;flex-direction:column}
.brand{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #b8935a;padding-bottom:4px;margin-bottom:5px}
.brand-name{font-weight:700;color:#1a3a2a;font-size:11px;direction:ltr}.title-wrap{text-align:${isUr ? "right" : "left"}}
h1{margin:0;font-size:${landscape ? "16px" : "15px"};color:#1a3a2a}.subtitle{font-size:7.5px;color:#526b5a}.research-note{margin-top:1px;font-size:6.2px;color:#7a674c}.research-note-footer{max-width:52%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.year-grid{flex:1;min-height:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(4,minmax(0,1fr));gap:${landscape ? "3.2mm" : "3mm"}}
.month{min-height:0;display:flex;flex-direction:column;border:1px solid #cbd8cf;border-radius:4px;overflow:hidden;background:#fff}
.month-head{display:grid;grid-template-columns:minmax(0,1fr) minmax(24mm,1.15fr) minmax(0,1fr);align-items:center;gap:2px;background-color:#1a3a2a;border-bottom:1.5px solid #b8935a;padding:3px 4px;color:#fff}
.month-head h2{margin:0;text-align:center;font-size:${landscape ? "9.5px" : "10px"};line-height:1.05}
.ctx{min-width:0;font-size:${landscape ? "5.5px" : "5.8px"};color:#f1dec0}.ctx.start{text-align:start}.ctx.end{text-align:end}
.ctx-item{display:inline-flex;gap:1px;align-items:baseline;white-space:nowrap}.ctx-year{display:block;color:rgba(255,255,255,.62);font-size:4.9px}.slash{color:rgba(255,255,255,.4);margin:0 1px}
.weekdays,.days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr))}.days{flex:1;min-height:0;grid-auto-rows:1fr}
.weekdays{background:#e8efe8;border-bottom:1px solid #d6e1d9}.weekdays>div{text-align:center;padding:1px 0;font-size:5.5px;font-weight:700;color:#31533d}.weekdays .sun{color:#9a4d3a}
.day{min-height:0;border-right:1px solid #e9eeea;border-bottom:1px solid #e9eeea;padding:1.5px 2px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden}
.greg-day{font-size:${landscape ? "9.8px" : "10.5px"};font-weight:800;line-height:1;color:#17251d;text-align:${isUr ? "right" : "left"};direction:ltr}
.hijri-day{font-size:${landscape ? "6.3px" : "6.7px"};font-weight:700;line-height:1;color:#496c52;text-align:${isUr ? "right" : "left"}}
.filler{background:#faf8f3}.footer{margin-top:3px;display:flex;justify-content:space-between;font-size:5.8px;color:#7b877f;direction:ltr}
</style>
</head>
<body><main class="page"><header class="brand"><div class="title-wrap"><h1>${escapeHtml(title)}</h1><div class="subtitle">${escapeHtml(subtitle)}</div>${researchNoteHtml}</div><div class="brand-name">Qalam Works</div></header><div class="year-grid">${monthsHtml}</div><div class="footer"><span>qalamworks.com</span>${researchNoteFooterHtml}<span>${escapeHtml(isUr ? "ہجری تبدیلی صرف اس تقویم پر لاگو ہوتی ہے۔" : "Hijri adjustment applies to this calendar only.")}</span></div></main></body></html>`;
}
