import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CALENDAR_VISUAL_SPEC,
  calendarMonthTone,
} from "../app/tools/calendar-maker/utils/calendarVisualSpec";

const root = join(__dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Reference calendar exact visual contract", () => {
  it("uses the shared reference green/gold/cream poster frame", () => {
    const maker = read("app/tools/calendar-maker/CalendarMakerContent.tsx");
    const pdf = read("app/tools/calendar-maker/utils/buildCalendarHtml.ts");

    expect(CALENDAR_VISUAL_SPEC.colors.frame).toBe("#0B5136");
    expect(CALENDAR_VISUAL_SPEC.colors.gold).toBe("#C99547");
    expect(CALENDAR_VISUAL_SPEC.colors.titleCapsule).toBe("#F7E9D5");
    expect(maker).toMatch(/calendarCssVariables/);
    expect(pdf).toMatch(/calendarPdfRootVariables/);
    expect(maker).toMatch(/rounded-full/);
    expect(pdf).toMatch(/border-radius:999px/);
  });

  it("uses shared row-based blue, green, cream, and pink month surfaces", () => {
    expect(calendarMonthTone(1).header).toBe("#EEF7FA");
    expect(calendarMonthTone(4).header).toBe("#EEF8F0");
    expect(calendarMonthTone(7).header).toBe("#FFF8DF");
    expect(calendarMonthTone(10).header).toBe("#FDEEF3");

    expect(read("app/components/date-studio/MonthCalendar.tsx")).toMatch(/calendarCssVariables/);
    expect(read("app/tools/calendar-maker/utils/buildCalendarHtml.ts")).toMatch(/calendarPdfMonthVariables/);
  });

  it("uses red centered month titles and green Hijri header context through shared tokens", () => {
    const month = read("app/components/date-studio/MonthCalendar.tsx");
    expect(CALENDAR_VISUAL_SPEC.colors.monthTitle).toBe("#EF2B2F");
    expect(CALENDAR_VISUAL_SPEC.colors.hijriContext).toBe("#0D633E");
    expect(month).toMatch(/text-\[var\(--calendar-month-title\)\]/);
    expect(month).toMatch(/text-\[var\(--calendar-hijri-context\)\]/);
    expect(month).toMatch(/grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1fr\)\]/);
  });

  it("keeps the reference 3x4 annual poster density and safe print margin", () => {
    const pdf = read("app/tools/calendar-maker/utils/buildCalendarHtml.ts");
    expect(pdf).toMatch(/grid-template-columns:repeat\(3/);
    expect(pdf).toMatch(/grid-template-rows:repeat\(4/);
    expect(pdf).toMatch(/metrics\.monthGapMm/);
    expect(CALENDAR_VISUAL_SPEC.print.safePageMarginMm).toBeGreaterThanOrEqual(6);
  });

  it("anchors Gregorian upper-left and Hijri lower-right without absolute overlap", () => {
    const cell = read("app/components/date-studio/CalendarDayCell.tsx");
    const pdf = read("app/tools/calendar-maker/utils/buildCalendarHtml.ts");

    expect(cell).toMatch(/flex flex-col justify-between/);
    expect(cell).toMatch(/self-start/);
    expect(cell).toMatch(/self-end/);
    expect(pdf).toMatch(/align-self:flex-start !important/);
    expect(pdf).toMatch(/align-self:flex-end !important/);
  });

  it("keeps outside-month cells blank before all active-cell reads", () => {
    const source = read("app/components/date-studio/CalendarDayCell.tsx");
    const guard = source.indexOf("if (!cell.inCurrentMonth)");
    const content = source.indexOf("const content");
    const outside = source.slice(guard, content);

    expect(guard).toBeGreaterThan(-1);
    expect(content).toBeGreaterThan(guard);
    expect(outside).not.toMatch(/cell\.hijri/);
    expect(outside).not.toMatch(/cell\.gregorian\.day/);
    expect(outside).not.toMatch(/<Link/);
  });
});
