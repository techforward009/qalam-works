import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CALENDAR_PDF_HIJRI_SHORT_EN,
  CALENDAR_VISUAL_SPEC,
} from "../app/tools/calendar-maker/utils/calendarVisualSpec";

const root = join(__dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Calendar overflow and font sizing", () => {
  it("uses readable dual-date type that still fits a stacked cell", () => {
    expect(parseFloat(CALENDAR_VISUAL_SPEC.print.gregorianFontPortrait)).toBe(14);
    expect(parseFloat(CALENDAR_VISUAL_SPEC.print.hijriFontPortrait)).toBe(9);
    expect(parseFloat(CALENDAR_VISUAL_SPEC.print.monthTitleFontPortrait)).toBe(13);
    expect(parseFloat(CALENDAR_VISUAL_SPEC.print.weekdayFontPortrait)).toBeLessThanOrEqual(9);
  });

  it("stacks Gregorian above Hijri with space-between instead of overlapping absolutes", () => {
    const pdf = read("app/tools/calendar-maker/utils/buildCalendarHtml.ts");
    expect(pdf).toMatch(/dir="ltr" style="position:relative !important;display:flex/);
    expect(pdf).toMatch(/flex-direction:column !important;justify-content:space-between/);
    expect(pdf).toMatch(/align-self:flex-start !important/);
    expect(pdf).toMatch(/align-self:flex-end !important/);
    expect(pdf).toMatch(/color:#15803d !important/);
    expect(pdf).not.toMatch(/position:absolute !important;top:/);
    expect(pdf).not.toMatch(/position:absolute !important;bottom:/);
  });

  it("does not shrink the month title and shortens English Hijri header labels", () => {
    const pdf = read("app/tools/calendar-maker/utils/buildCalendarHtml.ts");
    expect(pdf).toMatch(/flex:0 0 auto !important/);
    expect(pdf).toMatch(/CALENDAR_PDF_HIJRI_SHORT_EN/);
    expect(CALENDAR_PDF_HIJRI_SHORT_EN).toContain("Rabi I");
    expect(CALENDAR_PDF_HIJRI_SHORT_EN).toContain("Jumada II");
    expect(CALENDAR_PDF_HIJRI_SHORT_EN).toContain("Dhu Qadah");
  });

  it("production export verifies both digits paint in opposite corners", () => {
    const route = read("app/api/export-calendar-pdf/route.ts");
    expect(route).toMatch(/Gregorian digit did not paint/);
    expect(route).toMatch(/Hijri digit did not paint/);
    expect(route).toMatch(/Gregorian is not left of Hijri/);
    expect(route).toMatch(/Gregorian is not above Hijri/);
    expect(route).toMatch(/Gregorian\/Hijri gap collapsed/);
  });
});
