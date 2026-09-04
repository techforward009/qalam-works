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
    expect(cell).toMatch(/col-start-1 row-start-1/);
    expect(cell).toMatch(/self-start justify-self-start/);
    expect(cell).toMatch(/text-left/);
    expect(cell).toMatch(/col-start-2 row-start-2/);
    expect(cell).toMatch(/self-end justify-self-end/);
    expect(cell).toMatch(/text-right/);
    expect(cell).toMatch(/pb-\[2px\]/);
  });

  it("centers weekday text inside a taller strip", () => {
    const pdf = read("app/tools/calendar-maker/utils/buildCalendarHtml.ts");
    expect(CALENDAR_VISUAL_SPEC.print.weekdayStripPortraitMm).toBe(5.1);
    expect(CALENDAR_VISUAL_SPEC.print.weekdayStripLandscapeMm).toBe(4.8);
    expect(pdf).toMatch(/min-height:\$\{metrics\.weekdayStripMm\}mm/);
    expect(pdf).toMatch(/display:flex;[\s\S]*?align-items:center;[\s\S]*?justify-content:center/);
  });

  it("roughly doubles central month-title size and prevents year clipping", () => {
    expect(CALENDAR_VISUAL_SPEC.print.monthTitleFontPortrait).toBe("clamp(19px, 2.2vw, 21.5px)");
    expect(CALENDAR_VISUAL_SPEC.print.monthTitleFontLandscape).toBe("clamp(18px, 2vw, 20px)");

    const pdf = read("app/tools/calendar-maker/utils/buildCalendarHtml.ts");
    expect(pdf).toMatch(/font-size:\$\{metrics\.monthTitleFont\}/);
    expect(pdf).toMatch(/line-height:1\.18/);
    expect(pdf).toMatch(/padding-top:\.35mm/);
    expect(pdf).toMatch(/align-items:center/);
    expect(pdf).toMatch(/justify-content:center/);
  });
});
