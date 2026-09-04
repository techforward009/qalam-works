import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildCalendarMonth } from "../app/tools/calendar-maker/utils/calendarModel";
import { deriveHijriMonthContexts } from "../app/tools/calendar-maker/utils/calendarPresentation";

const root = join(__dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Calendar Hijri order, title centering, and cell offset", () => {
  it("keeps Hijri contexts in chronological order in the data layer", () => {
    const month = buildCalendarMonth(2027, 1, "gregorian-hijri", "monday");
    const contexts = deriveHijriMonthContexts(month, "ur", 0);
    expect(contexts.length).toBeGreaterThanOrEqual(2);

    const firstActive = month.weeks
      .flatMap((week) => week.cells)
      .find((cell) => cell.inCurrentMonth)!;
    expect(contexts[0].month).toBe(firstActive.hijri!.month);
    expect(contexts[0].year).toBe(firstActive.hijri!.year);
  });

  it("maps chronological start to physical right and later contexts to left in Urdu", () => {
    const html = read("app/tools/calendar-maker/utils/buildCalendarHtml.ts");
    expect(html).toMatch(/const startHijriContexts = contexts\.slice\(0, 1\)/);
    expect(html).toMatch(/const endHijriContexts = contexts\.slice\(1\)/);
    expect(html).toMatch(/const leftHijriContexts = isUr \? endHijriContexts : startHijriContexts/);
    expect(html).toMatch(/const rightHijriContexts = isUr \? startHijriContexts : endHijriContexts/);
    expect(html).toMatch(/data-hijri-side="right" data-hijri-role="\$\{isUr \? "start" : "end"\}"[\s\S]*?rightHijriContexts/);
    expect(html).toMatch(/data-hijri-side="left" data-hijri-role="\$\{isUr \? "end" : "start"\}"[\s\S]*?leftHijriContexts/);
  });

  it("centers Urdu month and Gregorian year vertically in one full-height flex row", () => {
    const html = read("app/tools/calendar-maker/utils/buildCalendarHtml.ts");
    expect(html).toMatch(/data-pdf-month-title="true" dir="ltr"/);
    expect(html).toMatch(/height:100% !important/);
    expect(html).toMatch(/display:inline-flex !important/);
    expect(html).toMatch(/align-items:center !important/);
    expect(html).toMatch(/justify-content:center !important/);
    expect(html).toMatch(/flex-direction:\$\{isUr \? "row-reverse" : "row"\} !important/);
    expect(html).toMatch(/line-height:1 !important/);
  });

  it("production export verifies physical Hijri side order and shared title center", () => {
    const route = read("app/api/export-calendar-pdf/route.ts");
    expect(route).toMatch(/rightHijriContext\.dataset\.hijriRole !== "start"/);
    expect(route).toMatch(/leftHijriContext\.dataset\.hijriRole !== "end"/);
    expect(route).toMatch(/Math\.abs\(nameCenterY - yearCenterY\) > 1\.5/);
    expect(route).toMatch(/parseFloat\(monthTitleStyle\.fontSize\) < 27\.5/);
    expect(route).not.toMatch(/lineHeight\) < 32/);
    expect(route).toMatch(/titleDisplay !== "flex"/);
  });

  it("lifts Hijri day digits eight pixels from the bottom border", () => {
    const html = read("app/tools/calendar-maker/utils/buildCalendarHtml.ts");
    expect(html).toMatch(/bottom:8px !important;right:6px !important/);
    expect(html).toMatch(/color:#15803d !important/);
  });
});
