import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CALENDAR_VISUAL_SPEC,
  calendarPrintMetrics,
} from "../app/tools/calendar-maker/utils/calendarVisualSpec";

const root = join(__dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Calendar production audit contracts", () => {
  it("keeps physical-print safety above common desktop-printer unprintable margins", () => {
    expect(CALENDAR_VISUAL_SPEC.print.safePageMarginMm).toBeGreaterThanOrEqual(6);
    expect(calendarPrintMetrics("a4-portrait").contentHeightMm).toBeLessThanOrEqual(285);
    expect(calendarPrintMetrics("a4-landscape").contentHeightMm).toBeLessThanOrEqual(198);

    const html = read("app/tools/calendar-maker/utils/buildCalendarHtml.ts");
    const route = read("app/api/export-calendar-pdf/route.ts");
    expect(html).toMatch(/margin: \$\{metrics\.safeMarginMm\}mm/);
    expect(route).toMatch(/preferCSSPageSize: true/);
    expect(route).toMatch(/margin: \{ top: "0", right: "0", bottom: "0", left: "0" \}/);
  });

  it("uses a single shared visual specification for web and PDF", () => {
    const month = read("app/components/date-studio/MonthCalendar.tsx");
    const cell = read("app/components/date-studio/CalendarDayCell.tsx");
    const maker = read("app/tools/calendar-maker/CalendarMakerContent.tsx");
    const explorer = read("app/components/date-studio/CalendarExplorer.tsx");
    const pdf = read("app/tools/calendar-maker/utils/buildCalendarHtml.ts");

    expect(month).toMatch(/calendarCssVariables/);
    expect(cell).toMatch(/CALENDAR_VISUAL_SPEC/);
    expect(maker).toMatch(/CALENDAR_ANNUAL_GRID_CLASS/);
    expect(explorer).toMatch(/CALENDAR_ANNUAL_GRID_CLASS/);
    expect(pdf).toMatch(/calendarPdfRootVariables/);
    expect(pdf).toMatch(/calendarPdfMonthVariables/);
    expect(pdf).toMatch(/calendarPrintMetrics/);
  });

  it("anchors dual-date cell internals with resilient grids and clamp typography", () => {
    const cell = read("app/components/date-studio/CalendarDayCell.tsx");
    const pdf = read("app/tools/calendar-maker/utils/buildCalendarHtml.ts");

    expect(cell).toMatch(/grid-cols-2 grid-rows-2/);
    expect(cell).toMatch(/col-start-1 row-start-1/);
    expect(cell).toMatch(/col-start-2 row-start-2/);
    expect(CALENDAR_VISUAL_SPEC.web.compact.gregorianFont).toMatch(/^clamp\(/);
    expect(CALENDAR_VISUAL_SPEC.web.detail.hijriFont).toMatch(/^clamp\(/);

    expect(pdf).toMatch(/grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
    expect(pdf).toMatch(/grid-column:1/);
    expect(pdf).toMatch(/grid-column:2/);
    expect(CALENDAR_VISUAL_SPEC.print.gregorianFontPortrait).toMatch(/^clamp\(/);
    expect(CALENDAR_VISUAL_SPEC.print.hijriFontPortrait).toMatch(/^clamp\(/);
  });

  it("fails closed unless bundled Urdu PDF fonts are present and loaded", () => {
    const route = read("app/api/export-calendar-pdf/route.ts");
    const html = read("app/tools/calendar-maker/utils/buildCalendarHtml.ts");

    expect(route).toMatch(/naskh-400\.woff2/);
    expect(route).toMatch(/naskh-700\.woff2/);
    expect(route).toMatch(/Required bundled calendar PDF font is missing/);
    expect(route).toMatch(/fonts\?\.check\('16px "QalamNaskh"'\)/);
    expect(html).toMatch(/data:font\/woff2;base64/);
    expect(html).toMatch(/font-family:'QalamNaskh'/);
    expect(html).toMatch(/font-weight:400/);
    expect(html).toMatch(/font-weight:700 900/);
  });
});
