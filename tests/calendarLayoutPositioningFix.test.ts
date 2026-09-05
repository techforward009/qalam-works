import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CALENDAR_VISUAL_SPEC } from "../app/tools/calendar-maker/utils/calendarVisualSpec";

const root = join(__dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Calendar layout positioning fix", () => {
  it("anchors Gregorian top-left and Hijri bottom-right with requested green", () => {
    expect(CALENDAR_VISUAL_SPEC.colors.hijriDay).toBe("#15803D");

    const cell = read("app/components/date-studio/CalendarDayCell.tsx");
    expect(cell).toMatch(/self-start/);
    expect(cell).toMatch(/text-left/);
    expect(cell).toMatch(/self-end/);
    expect(cell).toMatch(/text-right/);
    expect(cell).toMatch(/pb-\[3px\]/);
  });

  it("centers weekday text inside a taller strip", () => {
    const pdf = read("app/tools/calendar-maker/utils/buildCalendarHtml.ts");
    expect(CALENDAR_VISUAL_SPEC.print.weekdayStripPortraitMm).toBe(4.2);
    expect(CALENDAR_VISUAL_SPEC.print.weekdayStripLandscapeMm).toBe(4.0);
    expect(pdf).toMatch(/min-height:\$\{metrics\.weekdayHeightPx\}px/);
    expect(pdf).toMatch(/display:flex;[\s\S]*?align-items:center;[\s\S]*?justify-content:center/);
  });

  it("keeps the central month title readable without clipping the year", () => {
    expect(CALENDAR_VISUAL_SPEC.print.monthTitleFontPortrait).toBe("13px");
    expect(CALENDAR_VISUAL_SPEC.print.monthTitleFontLandscape).toBe("12px");

    const pdf = read("app/tools/calendar-maker/utils/buildCalendarHtml.ts");
    expect(pdf).toMatch(/font-size:\$\{metrics\.monthTitleFont\}/);
    expect(pdf).toMatch(/line-height:1 !important/);
    expect(pdf).toMatch(/data-pdf-month-title="true" dir="ltr"/);
    expect(pdf).toMatch(/align-items:center/);
    expect(pdf).toMatch(/justify-content:center/);
  });
});
