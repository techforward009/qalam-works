import { describe, expect, it } from "vitest";
import { buildCalendarYearModel } from "../app/tools/calendar-maker/utils/calendarModel";
import { buildCalendarHtml } from "../app/tools/calendar-maker/utils/buildCalendarHtml";
import { CALENDAR_PDF_HIJRI_SHORT_EN } from "../app/tools/calendar-maker/utils/calendarVisualSpec";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = (path: string) => readFileSync(join(__dirname, "..", path), "utf8");

describe("Calendar banner, Jamadi labels, and per-month Hijri offset", () => {
  it("uses Jamadi-I and Jamadi-II on the English calendar", () => {
    expect(CALENDAR_PDF_HIJRI_SHORT_EN).toContain("Jamadi-I");
    expect(CALENDAR_PDF_HIJRI_SHORT_EN).toContain("Jamadi-II");
    expect(CALENDAR_PDF_HIJRI_SHORT_EN).not.toContain("Jumada I");
    const html = buildCalendarHtml(buildCalendarYearModel({
      year: 2027,
      content: "gregorian-hijri",
      language: "en",
      weekStart: "monday",
      page: "a4-portrait",
    }));
    expect(html).toContain("Jamadi-I");
    expect(html).not.toContain("Jumada");
  });

  it("keeps Hijri year centered under the month name while the pair stays in the corner", () => {
    const pdf = source("app/tools/calendar-maker/utils/buildCalendarHtml.ts");
    expect(pdf).toMatch(/\.ctx-left\{[^}]*justify-content:left/);
    expect(pdf).toMatch(/\.ctx-right\{[^}]*justify-content:right/);
    expect(pdf).toMatch(/\.ctx-stack\{[^}]*align-items:center/);
    expect(pdf).toMatch(/\.ctx-year\{[\s\S]*?text-align:center/);
  });

  it("gives English month titles room for descenders like j", () => {
    const pdf = source("app/tools/calendar-maker/utils/buildCalendarHtml.ts");
    expect(pdf).toMatch(/month-title-name[\s\S]*?line-height:1\.25/);
    expect(pdf).toMatch(/overflow:visible !important/);
  });

  it("applies Hijri offset to one Gregorian month only when requested", () => {
    const all = buildCalendarYearModel({
      year: 2027,
      content: "gregorian-hijri",
      language: "en",
      weekStart: "monday",
      page: "a4-portrait",
      hijriOffset: 1,
    });
    const januaryOnly = buildCalendarYearModel({
      year: 2027,
      content: "gregorian-hijri",
      language: "en",
      weekStart: "monday",
      page: "a4-portrait",
      hijriOffset: 1,
      hijriOffsetMonths: [1],
    });
    const janAll = all.months[0].weeks.flatMap((week) => week.cells).find((cell) => cell.inCurrentMonth && cell.gregorian.day === 1);
    const janScoped = januaryOnly.months[0].weeks.flatMap((week) => week.cells).find((cell) => cell.inCurrentMonth && cell.gregorian.day === 1);
    const febScoped = januaryOnly.months[1].weeks.flatMap((week) => week.cells).find((cell) => cell.inCurrentMonth && cell.gregorian.day === 1);
    const febZero = buildCalendarYearModel({
      year: 2027,
      content: "gregorian-hijri",
      language: "en",
      weekStart: "monday",
      page: "a4-portrait",
    }).months[1].weeks.flatMap((week) => week.cells).find((cell) => cell.inCurrentMonth && cell.gregorian.day === 1);

    expect(janScoped?.hijri).toEqual(janAll?.hijri);
    expect(febScoped?.hijri).toEqual(febZero?.hijri);
    expect(febScoped?.hijri).not.toEqual(janScoped?.hijri);
  });

  it("embeds a custom banner without touching the year grid", () => {
    const html = buildCalendarHtml(buildCalendarYearModel({
      year: 2027,
      content: "gregorian-hijri",
      language: "en",
      weekStart: "monday",
      page: "a4-portrait",
    }), {
      bannerName: "Al-Noor School",
      bannerTitle: "Ramadan Calendar 2027",
      bannerLogo: "data:image/png;base64,aaa",
    });
    expect(html).toContain("Al-Noor School");
    expect(html).toContain("Ramadan Calendar 2027");
    expect(html).toContain('class="brand-logo"');
    expect(html).toContain("year-grid");
    expect(html).not.toContain("javascript:");
  });
});
