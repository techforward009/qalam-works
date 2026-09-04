import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { convert } from "../app/tools/date-converter/utils/dateEngine";
import {
  buildCalendarMonth,
  buildCalendarYearModel,
  weekdayLabels,
} from "../app/tools/calendar-maker/utils/calendarModel";
import { buildCalendarHtml } from "../app/tools/calendar-maker/utils/buildCalendarHtml";
import {
  CALENDAR_ANNUAL_GRID_CLASS,
  CALENDAR_VISUAL_SPEC,
} from "../app/tools/calendar-maker/utils/calendarVisualSpec";

const root = join(__dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Premium Calendar UX", () => {
  it("renders outside-month cells blank and non-interactive", () => {
    const source = read("app/components/date-studio/CalendarDayCell.tsx");
    expect(source).toMatch(/if \(!cell\.inCurrentMonth\)/);
    expect(source).toMatch(/aria-hidden="true"/);
    const branch = source.slice(source.indexOf("if (!cell.inCurrentMonth)"), source.indexOf("const content"));
    expect(branch).not.toMatch(/cell\.gregorian\.day/);
    expect(branch).not.toMatch(/<Link/);
  });

  it("does not render Hijri overlay in PDF filler cells", () => {
    const model = buildCalendarYearModel({
      year: 2027,
      content: "gregorian-hijri",
      language: "en",
      weekStart: "sunday",
      page: "a4-portrait",
    });
    const html = buildCalendarHtml(model);
    expect(html).toContain('class="day filler" aria-hidden="true"></div>');
    expect(read("app/tools/calendar-maker/utils/buildCalendarHtml.ts")).toMatch(/if \(!cell\.inCurrentMonth\)/);
  });

  it("uses Monday-to-Sunday Urdu weekday order", () => {
    expect(weekdayLabels("ur", "sunday")).toEqual([
      "پیر", "منگل", "بدھ", "جمعرات", "جمعہ", "ہفتہ", "اتوار",
    ]);
    expect(weekdayLabels("ur", "monday")).toEqual([
      "پیر", "منگل", "بدھ", "جمعرات", "جمعہ", "ہفتہ", "اتوار",
    ]);
  });

  it("aligns Urdu dates to Monday-first grid columns", () => {
    const model = buildCalendarYearModel({
      year: 2027,
      content: "gregorian",
      language: "ur",
      weekStart: "sunday",
      page: "a4-portrait",
    });
    expect(model.weekStart).toBe("monday");
    const january = model.months[0];
    const jan1 = january.weeks[0].cells.findIndex(
      (cell) => cell.inCurrentMonth && cell.gregorian.day === 1,
    );
    expect(jan1).toBe(4);
  });

  it("keeps Gregorian-only mode free of Hijri overlays", () => {
    const month = buildCalendarMonth(2027, 1, "gregorian", "sunday");
    expect(month.weeks.flatMap((week) => week.cells).every((cell) => cell.hijri === null)).toBe(true);
  });

  it("Gregorian + Hijri mode reuses deterministic Date Converter output", () => {
    const month = buildCalendarMonth(2027, 1, "gregorian-hijri", "sunday");
    for (const cell of month.weeks.flatMap((week) => week.cells).filter((cell) => cell.inCurrentMonth)) {
      expect(cell.hijri).toEqual(convert("gregorian", cell.gregorian).hijri);
    }
  });

  it("shows no Hijri overlay on outside-month cells in shared UI", () => {
    const source = read("app/components/date-studio/CalendarDayCell.tsx");
    const outsideBranch = source.slice(source.indexOf("if (!cell.inCurrentMonth)"), source.indexOf("const content"));
    expect(outsideBranch).not.toMatch(/cell\.hijri/);
  });

  it("adds Back to Date Studio to maker and all explorer route families", () => {
    const nav = read("app/components/date-studio/DateStudioRouteNav.tsx");
    const maker = read("app/tools/calendar-maker/CalendarMakerContent.tsx");
    expect(nav).toMatch(/Back to Date Studio/);
    expect(nav).toMatch(/ڈیٹ اسٹوڈیو پر واپس/);
    expect(nav).toMatch(/\/tools\/date-converter#date-studio/);
    expect(maker).toMatch(/BackToDateStudioLink/);
    for (const path of [
      "app/calendar/[year]/page.tsx",
      "app/calendar/[year]/[month]/page.tsx",
      "app/hijri/[year]/page.tsx",
      "app/hijri/[year]/[month]/page.tsx",
    ]) {
      expect(read(path)).toMatch(/DateStudioRouteNav/);
    }
  });

  it("provides Gregorian and Gregorian + Hijri explorer modes", () => {
    const year = read("app/components/date-studio/CalendarExplorer.tsx");
    const month = read("app/components/date-studio/CalendarMonthExplorer.tsx");
    for (const source of [year, month]) {
      expect(source).toMatch(/"gregorian"/);
      expect(source).toMatch(/"gregorian-hijri"/);
      expect(source).toMatch(/عیسوی \+ ہجری/);
    }
  });

  it("keeps annual explorer dense across responsive breakpoints through the shared layout contract", () => {
    const source = read("app/components/date-studio/CalendarExplorer.tsx");
    expect(CALENDAR_ANNUAL_GRID_CLASS).toContain("grid-cols-1");
    expect(CALENDAR_ANNUAL_GRID_CLASS).toContain("md:grid-cols-2");
    expect(CALENDAR_ANNUAL_GRID_CLASS).toContain("xl:grid-cols-3");
    expect(source).toMatch(/CALENDAR_ANNUAL_GRID_CLASS/);
    expect(source).toMatch(/<MonthCalendar[\s\S]*?compact/);
  });

  it("Date Studio action hierarchy preserves four actions and restores Hijri Explorer", () => {
    const source = read("app/tools/date-converter/DateConverterContent.tsx");
    expect(source).toMatch(/setMode\("convert"\)/);
    expect(source).toMatch(/setMode\("find"\)/);
    expect(source).toMatch(/Explore Calendars/);
    expect(source).toMatch(/Calendar Maker/);
    expect(source).toMatch(/Hijri Calendar Explorer/);
    expect(source).toMatch(/ہجری کیلنڈر ایکسپلورر/);
    expect(source).toMatch(/\/tools\/calendar-maker/);
    expect(source).toMatch(/studioToday\.year/);
    expect(source).toMatch(/studioHijri\.year/);
    expect(source).toMatch(/\/hijri\//);
  });

  it("uses the shared local/CSS-only calendar visual specification", () => {
    const web = read("app/components/date-studio/MonthCalendar.tsx");
    const pdf = read("app/tools/calendar-maker/utils/buildCalendarHtml.ts");
    expect(CALENDAR_VISUAL_SPEC.colors.frame).toBe("#0B5136");
    expect(CALENDAR_VISUAL_SPEC.colors.gold).toBe("#C99547");
    expect(web).toMatch(/calendarCssVariables/);
    expect(pdf).toMatch(/calendarPdfRootVariables/);
    expect(pdf).not.toMatch(/https?:\/\//);
  });
});
