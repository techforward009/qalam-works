import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildCalendarYearModel } from "../app/tools/calendar-maker/utils/calendarModel";
import { buildCalendarHtml } from "../app/tools/calendar-maker/utils/buildCalendarHtml";
import {
  CALENDAR_MONTH_DAY_CELLS,
  CALENDAR_MONTH_WEEK_ROWS,
} from "../app/tools/calendar-maker/utils/calendarVisualSpec";

const root = join(__dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

function monthDayCount(html: string, monthIndex: number): number {
  const months = html.split('<section class="month"');
  const monthHtml = months[monthIndex + 1];
  return monthHtml.split('class="day ').length - 1;
}

describe("Fixed 6 week rows per month card", () => {
  it("keeps a 6x7 slot grid even when the month only uses 4 or 5 weeks", () => {
    expect(CALENDAR_MONTH_WEEK_ROWS).toBe(6);
    expect(CALENDAR_MONTH_DAY_CELLS).toBe(42);

    const model = buildCalendarYearModel({
      year: 2027,
      content: "gregorian-hijri",
      language: "en",
      weekStart: "monday",
      page: "a4-portrait",
    });

    expect(model.months[1].weeks.length).toBe(4);
    expect(model.months[0].weeks.length).toBe(5);
    expect(model.months[4].weeks.length).toBe(6);

    const html = buildCalendarHtml(model);
    for (let month = 0; month < 12; month++) {
      expect(monthDayCount(html, month)).toBe(42);
    }
    expect(html).toContain('data-pdf-week-rows="6"');
    expect(html).toMatch(/grid-template-rows:repeat\(6,minmax\(0,1fr\)\)/);
  });

  it("pads web month cards to the same 6-row slot grid", () => {
    const month = read("app/components/date-studio/MonthCalendar.tsx");
    expect(month).toMatch(/CALENDAR_MONTH_DAY_CELLS/);
    expect(month).toMatch(/data-week-rows=\{CALENDAR_MONTH_WEEK_ROWS\}/);
    expect(month).toMatch(/empty-week-slot/);
  });

  it("fails PDF export if a month card does not contain 42 day slots", () => {
    const route = read("app/api/export-calendar-pdf/route.ts");
    expect(route).toMatch(/month week rows are not fixed at 6/);
    expect(route).toMatch(/count !== 42/);
  });

  it("draws a single 1px table line on every shared edge and skips the outer frame edge", () => {
    const pdf = read("app/tools/calendar-maker/utils/buildCalendarHtml.ts");
    expect(pdf).toMatch(/border:1px solid var\(--calendar-grid-strong\)/);
    expect(pdf).toMatch(/\.day\{[\s\S]*?border-inline-end:1px solid var\(--calendar-grid\)/);
    expect(pdf).toMatch(/\.day:nth-child\(7n\)\{border-inline-end:none\}/);
    expect(pdf).toMatch(/\.day:nth-child\(n\+36\)\{border-bottom:none\}/);
    expect(pdf).toMatch(/\.weekdays>div:last-child\{border-inline-end:none\}/);
    expect(pdf).not.toMatch(/border-inline-end:\.5px/);
    expect(pdf).not.toMatch(/gap:\.5px/);
  });
});
