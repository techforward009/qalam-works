import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CALENDAR_VISUAL_SPEC } from "../app/tools/calendar-maker/utils/calendarVisualSpec";

const root = join(__dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Calendar overflow and font sizing", () => {
  it("keeps print Gregorian and Hijri digits small enough to share one cell", () => {
    expect(parseFloat(CALENDAR_VISUAL_SPEC.print.gregorianFontPortrait)).toBeLessThanOrEqual(13);
    expect(parseFloat(CALENDAR_VISUAL_SPEC.print.hijriFontPortrait)).toBeLessThanOrEqual(10);
    expect(parseFloat(CALENDAR_VISUAL_SPEC.print.monthTitleFontPortrait)).toBeLessThanOrEqual(15);
    expect(parseFloat(CALENDAR_VISUAL_SPEC.print.weekdayFontPortrait)).toBeLessThanOrEqual(9);
    expect(CALENDAR_VISUAL_SPEC.print.monthHeaderHeightPortraitPx).toBeLessThanOrEqual(36);
    expect(CALENDAR_VISUAL_SPEC.print.weekdayHeightPortraitPx).toBeLessThanOrEqual(18);
  });

  it("anchors both digits without overlap and keeps cell overflow visible", () => {
    const pdf = read("app/tools/calendar-maker/utils/buildCalendarHtml.ts");
    expect(pdf).toMatch(/top:2px !important;left:2px !important/);
    expect(pdf).toMatch(/bottom:2px !important;right:2px !important/);
    expect(pdf).toMatch(/color:#15803d !important/);
    expect(pdf).toMatch(/overflow:visible !important/);
    expect(pdf).toMatch(/font-size:\$\{metrics\.gregorianFont\}/);
    expect(pdf).toMatch(/font-size:\$\{metrics\.hijriFont\}/);
  });

  it("reserves header space so Hijri context and full month titles remain visible", () => {
    const pdf = read("app/tools/calendar-maker/utils/buildCalendarHtml.ts");
    expect(pdf).toMatch(/min-width:48px/);
    expect(pdf).toMatch(/flex:0 1 auto/);
    expect(pdf).toMatch(/data-pdf-month-title="true" dir="ltr"/);
  });

  it("production export rejects overlapping or clipped dual-date digits", () => {
    const route = read("app/api/export-calendar-pdf/route.ts");
    expect(route).toMatch(/Gregorian digit clipped/);
    expect(route).toMatch(/Hijri digit clipped/);
    expect(route).toMatch(/primary\/secondary digits overlap/);
    expect(route).toMatch(/Hijri context columns were squeezed/);
    expect(route).not.toMatch(/lineHeight\) < 32/);
    expect(route).not.toMatch(/fontSize\) < 27\.5/);
  });
});
