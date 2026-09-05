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
    expect(pdf).toMatch(/month-title-name[\s\S]*?line-height:1\.45/);
    expect(pdf).toMatch(/overflow:visible !important/);
    expect(pdf).toMatch(/padding-bottom:0\.2em/);
  });

  it("applies independent Hijri offsets to several Gregorian months", () => {
    const mixed = buildCalendarYearModel({
      year: 2027,
      content: "gregorian-hijri",
      language: "en",
      weekStart: "monday",
      page: "a4-portrait",
      hijriOffsets: [1, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    });
    const baseline = buildCalendarYearModel({
      year: 2027,
      content: "gregorian-hijri",
      language: "en",
      weekStart: "monday",
      page: "a4-portrait",
    });
    const plusOne = buildCalendarYearModel({
      year: 2027,
      content: "gregorian-hijri",
      language: "en",
      weekStart: "monday",
      page: "a4-portrait",
      hijriOffset: 1,
    });
    const day = (model: ReturnType<typeof buildCalendarYearModel>, month: number) =>
      model.months[month - 1].weeks.flatMap((week) => week.cells).find((cell) => cell.inCurrentMonth && cell.gregorian.day === 1);

    expect(day(mixed, 1)?.hijri).toEqual(day(plusOne, 1)?.hijri);
    expect(day(mixed, 2)?.hijri).toEqual(day(baseline, 2)?.hijri);
    expect(day(mixed, 3)?.hijri).not.toEqual(day(baseline, 3)?.hijri);
  });

  it("keeps an empty banner name empty and omits Gregorian+Hijri from the footer", () => {
    const html = buildCalendarHtml(buildCalendarYearModel({
      year: 2027,
      content: "gregorian-hijri",
      language: "en",
      weekStart: "monday",
      page: "a4-portrait",
    }), {
      bannerName: "",
      bannerTitle: "School Calendar 2027",
      bannerSideText: "City Campus",
    });
    expect(html).not.toMatch(/class="brand-name">Qalam Works/);
    expect(html).toContain("School Calendar 2027");
    expect(html).toContain("City Campus");
    expect(html).toContain("qalamworks.com");
    expect(html).not.toMatch(/<footer class="footer">[\s\S]*Gregorian \+ Hijri/);
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
