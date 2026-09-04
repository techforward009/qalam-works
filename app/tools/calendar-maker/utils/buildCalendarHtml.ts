import {
  GREGORIAN_MONTH_LABELS,
  HIJRI_MONTH_SHORT_LABELS,
  weekdayLabels,
  type CalendarYearModel,
} from "./calendarModel";

export interface CalendarHtmlOptions {
  naskhFontBase64?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildCalendarHtml(
  model: CalendarYearModel,
  options: CalendarHtmlOptions = {},
): string {
  const isUr = model.language === "ur";
  const landscape = model.page === "a4-landscape";
  const columns = landscape ? 4 : 3;
  const rows = landscape ? 3 : 4;
  const monthLabels = GREGORIAN_MONTH_LABELS[model.language];
  const dayLabels = weekdayLabels(model.language, isUr ? "monday" : model.weekStart);
  const hijriMonthLabels = HIJRI_MONTH_SHORT_LABELS[model.language];
  const title = isUr ? `${model.year} سالانہ تقویم` : `${model.year} Annual Calendar`;
  const subtitle = model.content === "gregorian-hijri"
    ? (isUr ? "عیسوی + حسابی ہجری قمری" : "Gregorian + calculated Hijri")
    : (isUr ? "عیسوی" : "Gregorian");
  const fontFace = isUr && options.naskhFontBase64
    ? `@font-face{font-family:'QalamNaskh';src:url(data:font/woff2;base64,${options.naskhFontBase64}) format('woff2');font-weight:400;font-style:normal;}`
    : "";

  const monthsHtml = model.months.map((month) => {
    const cells = month.weeks.flatMap((week) => week.cells).map((cell) => {
      if (!cell.inCurrentMonth) return `<div class="day filler" aria-hidden="true"></div>`;
      const hijri = cell.hijri
        ? `<div class="hijri" dir="${isUr ? "rtl" : "ltr"}"><span class="hijri-day" dir="ltr">${cell.hijri.day}</span> ${escapeHtml(hijriMonthLabels[cell.hijri.month - 1])}</div>`
        : "";
      return `<div class="day current"><div class="greg" dir="ltr">${cell.gregorian.day}</div>${hijri}</div>`;
    }).join("");

    return `<section class="month">
      <h2>${escapeHtml(monthLabels[month.month - 1])}</h2>
      <div class="weekdays" dir="${isUr ? "rtl" : "ltr"}">${dayLabels.map((label) => `<div>${escapeHtml(label)}</div>`).join("")}</div>
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
@page { size: A4 ${landscape ? "landscape" : "portrait"}; margin: 8mm; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; color: #17251d; }
body { font-family: ${isUr ? "'QalamNaskh', Tahoma, Arial, sans-serif" : "Arial, Helvetica, sans-serif"}; }
.page { width:100%; height:${landscape ? "188mm" : "275mm"}; display:flex; flex-direction:column; }
.brand { display:flex; align-items:center; justify-content:space-between; gap:12px; border-bottom:2px solid #b8935a; padding-bottom:5px; margin-bottom:6px; }
.brand-name { font-weight:700; color:#1a3a2a; font-size:12px; direction:ltr; }
.title-wrap { text-align:${isUr ? "right" : "left"}; }
h1 { margin:0; font-size:${landscape ? "18px" : "17px"}; line-height:1.2; color:#1a3a2a; }
.subtitle { margin-top:2px; font-size:8.5px; color:#526b5a; }
.year-grid { flex:1; min-height:0; display:grid; grid-template-columns:repeat(${columns}, minmax(0,1fr)); grid-template-rows:repeat(${rows}, minmax(0,1fr)); gap:${landscape ? "4.5mm" : "4mm"}; }
.month { min-height:0; display:flex; flex-direction:column; border:1px solid #ccd8d0; border-radius:5px; overflow:hidden; break-inside:avoid; background:#fff; }
.month h2 { flex:0 0 auto; margin:0; padding:4px; text-align:center; color:#fff; font-size:${landscape ? "11px" : "11.5px"}; line-height:1.2; border-bottom:1.5px solid #b8935a; background-color:#1a3a2a; background-image:linear-gradient(30deg,rgba(184,147,90,.13) 12%,transparent 12.5%,transparent 87%,rgba(184,147,90,.13) 87.5%),linear-gradient(150deg,rgba(184,147,90,.08) 12%,transparent 12.5%,transparent 87%,rgba(184,147,90,.08) 87.5%); background-size:24px 14px; }
.weekdays, .days { display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); }
.days { flex:1; min-height:0; grid-auto-rows:1fr; }
.weekdays { background:#e7efe8; border-bottom:1px solid #d6e1d9; }
.weekdays > div { text-align:center; padding:1.5px 0; font-size:${landscape ? "6.3px" : "6.6px"}; font-weight:700; color:#31533d; white-space:nowrap; }
.day { min-height:0; border-right:1px solid #edf0ee; border-bottom:1px solid #edf0ee; padding:1.5px 2px; overflow:hidden; }
.day:nth-child(7n) { border-right:0; }
.greg { font-size:${landscape ? "8.2px" : "8.7px"}; font-weight:700; color:#17251d; text-align:${isUr ? "right" : "left"}; }
.hijri { font-size:${landscape ? "6.0px" : "6.3px"}; color:#8a6c3e; margin-top:0; text-align:${isUr ? "right" : "left"}; }
.filler { background:#fafafa; }
.footer { flex:0 0 auto; margin-top:4px; display:flex; justify-content:space-between; gap:8px; font-size:6.5px; color:#7b877f; direction:ltr; }
</style>
</head>
<body>
<main class="page">
  <header class="brand">
    <div class="title-wrap"><h1>${escapeHtml(title)}</h1><div class="subtitle">${escapeHtml(subtitle)}</div></div>
    <div class="brand-name">Qalam Works</div>
  </header>
  <div class="year-grid">${monthsHtml}</div>
  <div class="footer"><span>qalamworks.com</span><span>${escapeHtml(isUr ? "حسابی ہجری تاریخ مقامی رویت سے مختلف ہو سکتی ہے۔" : "Calculated Hijri dates may differ from local moon sighting.")}</span></div>
</main>
</body>
</html>`;
}
