import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildCalendarMonth,
  buildCalendarYearModel,
} from "../app/tools/calendar-maker/utils/calendarModel";
import { buildCalendarHtml } from "../app/tools/calendar-maker/utils/buildCalendarHtml";

const root = join(__dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Calendar Explorer mode toggle", () => {
  it("pure Gregorian year data contains no Hijri day overlays", () => {
    const model = buildCalendarYearModel({
      year: 2028,
      content: "gregorian",
      language: "en",
      weekStart: "monday",
      page: "a4-portrait",
    });

    expect(
      model.months
        .flatMap((month) => month.weeks)
        .flatMap((week) => week.cells)
        .every((cell) => cell.hijri === null),
    ).toBe(true);
  });

  it("combined year data contains Hijri day overlays", () => {
    const model = buildCalendarYearModel({
      year: 2028,
      content: "gregorian-hijri",
      language: "en",
      weekStart: "monday",
      page: "a4-portrait",
    });

    expect(
      model.months
        .flatMap((month) => month.weeks)
        .flatMap((week) => week.cells)
        .some((cell) => cell.inCurrentMonth && cell.hijri !== null),
    ).toBe(true);
  });

  it("MonthCalendar derives Hijri header context only when Hijri is enabled and data exists", () => {
    const source = read("app/components/date-studio/MonthCalendar.tsx");

    expect(source).toMatch(/showHijri = true/);
    expect(source).toMatch(/const hasHijriData =/);
    expect(source).toMatch(/cell\.inCurrentMonth && cell\.hijri !== null/);
    expect(source).toMatch(/const hijriEnabled = showHijri && hasHijriData/);
    expect(source).toMatch(/hijriEnabled[\s\S]*?deriveHijriMonthContexts/);
  });

  it("year explorer wires selected mode directly into MonthCalendar", () => {
    const source = read("app/components/date-studio/CalendarExplorer.tsx");
    expect(source).toMatch(/showHijri=\{mode === "gregorian-hijri"\}/);
    expect(source).toMatch(/buildCalendarYearModel\(\{[\s\S]*?content: mode/);
  });

  it("month explorer wires selected mode directly into MonthCalendar", () => {
    const source = read("app/components/date-studio/CalendarMonthExplorer.tsx");
    expect(source).toMatch(/showHijri=\{mode === "gregorian-hijri"\}/);
    expect(source).toMatch(/buildCalendarMonth\(year, month, mode/);
  });

  it("Calendar Maker also suppresses Hijri presentation in Gregorian-only mode", () => {
    const source = read("app/tools/calendar-maker/CalendarMakerContent.tsx");
    expect(source).toMatch(/showHijri=\{content === "gregorian-hijri"\}/);
  });

  it("Gregorian-only month keeps all active cell Hijri values null", () => {
    const month = buildCalendarMonth(2028, 1, "gregorian", "monday");
    expect(
      month.weeks
        .flatMap((week) => week.cells)
        .filter((cell) => cell.inCurrentMonth)
        .every((cell) => cell.hijri === null),
    ).toBe(true);
  });
});
  it("Gregorian-only PDF HTML has no Hijri headers or day numbers", () => {
    const gregorian = buildCalendarHtml(buildCalendarYearModel({
      year: 2027,
      content: "gregorian",
      language: "en",
      weekStart: "monday",
      page: "a4-landscape",
    }));
    const combined = buildCalendarHtml(buildCalendarYearModel({
      year: 2027,
      content: "gregorian-hijri",
      language: "en",
      weekStart: "monday",
      page: "a4-landscape",
    }));

    expect(gregorian).not.toMatch(/class="hijri-day"/);
    expect(gregorian).not.toMatch(/class="ctx-name"/);
    expect(combined).toMatch(/class="hijri-day"/);
    expect(combined).toMatch(/class="ctx-name"/);
  });
