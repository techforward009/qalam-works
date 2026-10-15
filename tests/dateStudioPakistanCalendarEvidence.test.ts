import { describe, expect, it } from "vitest";
import { buildCalendarMonth, buildCalendarYearModel } from "../app/tools/calendar-maker/utils/calendarModel";
import { resolveDisplayHijriDate } from "../app/tools/date-converter/utils/hijri-authority/displayHijriDate";
import { getReviewedPakistanHijriMonth } from "../app/tools/date-converter/utils/hijri-authority/resolveOfficialHijriMonth";
import { convert } from "../app/tools/date-converter/utils/dateEngine";
import { buildCalendarHtml } from "../app/tools/calendar-maker/utils/buildCalendarHtml";

const find = (year: number, month: number, day: number, policy: "pakistan" | "tabular" = "pakistan") =>
  buildCalendarMonth(year, month, "gregorian-hijri", "monday", 0, policy)
    .weeks.flatMap(week => week.cells).find(cell =>
      cell.inCurrentMonth && cell.gregorian.year === year && cell.gregorian.month === month && cell.gregorian.day === day)!;

describe("Date Studio Pakistan calendar evidence across all views", () => {
  it("shares 10 Ramadan 1447 on February 28 among day and month views", () => {
    const date = { year: 2026, month: 2, day: 28 };
    expect(resolveDisplayHijriDate(date)).toMatchObject({ hijri: { year: 1447, month: 9, day: 10 }, source: "official" });
    expect(find(2026, 2, 28)).toMatchObject({ hijri: { year: 1447, month: 9, day: 10 }, hijriSource: "official" });
    expect(find(2026, 2, 28, "tabular")).toMatchObject({ hijri: { year: 1447, month: 9, day: 12 }, hijriSource: "tabular" });
    expect(convert("gregorian", date).hijri.day).toBe(12);
  });

  it("never misrepresents unverified dates as official", () => {
    expect(find(2026, 1, 19).hijriSource).toBe("tabular");
    expect(resolveDisplayHijriDate({ year: 2026, month: 7, day: 11 })).toMatchObject({ source: "tabular" });
  });

  it("does not silently stitch or overwrite official month boundaries in annual view", () => {
    const model = buildCalendarYearModel({ year: 2026, content: "gregorian-hijri", language: "ur", weekStart: "monday", page: "a4-portrait", hijriPolicy: "pakistan" });
    const cell = (m: number, d: number) => model.months[m - 1].weeks.flatMap(w => w.cells).find(c => c.inCurrentMonth && c.gregorian.day === d)!;
    expect(cell(2, 19)).toMatchObject({ hijri: { year: 1447, month: 9, day: 1 }, hijriSource: "official" });
    expect(cell(2, 28)).toMatchObject({ hijri: { year: 1447, month: 9, day: 10 }, hijriSource: "official" });
    expect(cell(3, 20)).toMatchObject({ hijri: { year: 1447, month: 9, day: 30 }, hijriSource: "official" });
    expect(cell(3, 21)).toMatchObject({ hijri: { year: 1447, month: 10, day: 1 }, hijriSource: "official" });
    expect(cell(4, 19)).toMatchObject({ hijri: { year: 1447, month: 11, day: 1 }, hijriSource: "official" });
    expect(cell(5, 18)).toMatchObject({ hijri: { year: 1447, month: 12, day: 1 }, hijriSource: "official" });
    expect(cell(6, 17)).toMatchObject({ hijri: { year: 1448, month: 1, day: 1 }, hijriSource: "official" });
    expect(cell(7, 16)).toMatchObject({ hijri: { year: 1448, month: 2, day: 1 }, hijriSource: "official" });
    expect(cell(8, 15)).toMatchObject({ hijri: { year: 1448, month: 3, day: 1 }, hijriSource: "official" });
    expect(cell(9, 14)).toMatchObject({ hijri: { year: 1448, month: 4, day: 1 }, hijriSource: "official" });
    expect(cell(10, 13)).toMatchObject({ hijri: { year: 1448, month: 5, day: 1 }, hijriSource: "official" });
  });

  it("prints Pakistan's verified 10 Ramadan and visibly marks calculated dates in PDF", () => {
    const model = buildCalendarYearModel({ year: 2026, content: "gregorian-hijri", language: "en", weekStart: "monday", page: "a4-portrait", hijriPolicy: "pakistan" });
    const html = buildCalendarHtml(model);
    expect(html).toContain('data-hijri-source-note="true"');
    expect(html).toContain('Pakistan: reviewed official dates');
    expect(html).toContain('font-size:6px !important;line-height:1 !important;">*</sup>');
    expect(html).toContain('data-pdf-hijri-day="true"');
  });
  it("refuses to apply a manual offset to verified Pakistan dates", () => {
    expect(() => buildCalendarMonth(2026, 2, "gregorian-hijri", "monday", 2, "pakistan")).toThrow(/cannot be manually offset/);
    expect(() => buildCalendarYearModel({ year: 2026, content: "gregorian-hijri", language: "ur", weekStart: "monday", page: "a4-portrait", hijriPolicy: "pakistan", hijriOffsets: Array.from({length:12},(_,i)=>i===1?2:0) })).toThrow(/cannot be manually offset/);
  });

  it("builds reviewed Ramadan month directly from evidence and refuses to invent next month days", () => {
    const ramadan = getReviewedPakistanHijriMonth(1447, 9)!;
    expect(ramadan.complete).toBe(true);
    expect(ramadan.days).toHaveLength(30);
    expect(ramadan.days[0]).toMatchObject({ hijriDay: 1, gregorian: { year: 2026, month: 2, day: 19 } });
    expect(ramadan.days[9]).toMatchObject({ hijriDay: 10, gregorian: { year: 2026, month: 2, day: 28 } });
    expect(ramadan.days[29]).toMatchObject({ hijriDay: 30, gregorian: { year: 2026, month: 3, day: 20 } });
    expect(getReviewedPakistanHijriMonth(1447, 10)).toMatchObject({ complete: false });
    expect(getReviewedPakistanHijriMonth(1447, 8)).toBeNull();
  });
});
