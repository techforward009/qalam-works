import { describe, expect, it } from "vitest";
import { buildCalendarMonth, buildCalendarYearModel } from "../app/tools/calendar-maker/utils/calendarModel";
import { resolveDisplayHijriDate } from "../app/tools/date-converter/utils/hijri-authority/displayHijriDate";
import { predictPakistanGregorianDate } from "../app/tools/date-converter/utils/hijri-authority/pakistanScientificHijriDate";
import { buildPakistanDateShareText, pakistanDateStatus } from "../app/tools/date-converter/utils/pakistanDateShare";
import { buildCalendarHtml } from "../app/tools/calendar-maker/utils/buildCalendarHtml";

const parts = (day: number) => ({ year: 2026, month: 11, day });
const cell = (day: number) =>
  buildCalendarMonth(2026, 11, "gregorian-hijri", "monday", 0, "pakistan")
    .weeks.flatMap(week => week.cells)
    .find(entry => entry.inCurrentMonth && entry.gregorian.day === day)!;

describe("Pakistan scientific Hijri fallback for November 2026", () => {
  it("uses the official day 29, then a predicted day 30 and day 1", () => {
    expect(resolveDisplayHijriDate(parts(10))).toMatchObject({
      source: "official", hijri: { year: 1448, month: 5, day: 29 },
    });
    expect(resolveDisplayHijriDate(parts(11))).toMatchObject({
      source: "scientific", hijri: { year: 1448, month: 5, day: 30 },
    });
    expect(resolveDisplayHijriDate(parts(12))).toMatchObject({
      source: "scientific", hijri: { year: 1448, month: 6, day: 1 },
    });
  });

  it("agrees in the monthly and yearly calendars and leaves the pure tabular mode alone", () => {
    expect(cell(10)).toMatchObject({ hijriSource: "official", hijri: { month: 5, day: 29 } });
    expect(cell(11)).toMatchObject({ hijriSource: "scientific", hijri: { month: 5, day: 30 } });
    expect(cell(12)).toMatchObject({ hijriSource: "scientific", hijri: { month: 6, day: 1 } });
    const annual = buildCalendarYearModel({
      year: 2026, content: "gregorian-hijri", language: "ur",
      weekStart: "monday", page: "a4-portrait", hijriPolicy: "pakistan",
    });
    const november = annual.months[10].weeks.flatMap(week => week.cells);
    for (const day of [10, 11, 12]) {
      expect(november.find(entry => entry.inCurrentMonth && entry.gregorian.day === day)?.hijri)
        .toEqual(cell(day).hijri);
    }
    expect(buildCalendarMonth(2026, 11, "gregorian-hijri", "monday", 0, "tabular")
      .weeks.flatMap(week => week.cells)
      .find(entry => entry.inCurrentMonth && entry.gregorian.day === 11)?.hijriSource).toBe("tabular");
    expect(buildCalendarHtml(annual)).toContain('data-hijri-source-note="true"');
    expect(buildCalendarHtml(annual)).toContain("سائنسی پیش گوئی");
  });

  it("supports the same result in reverse conversion and never upgrades a prediction to official", () => {
    expect(predictPakistanGregorianDate({ year: 1448, month: 5, day: 30 })).toEqual(parts(11));
    expect(predictPakistanGregorianDate({ year: 1448, month: 6, day: 1 })).toEqual(parts(12));
    expect(pakistanDateStatus(null, "ur", "scientific")).toContain("سرکاری اعلان نہیں");
    const shared = buildPakistanDateShareText({
      gregorian: parts(12), hijri: { year: 1448, month: 6, day: 1 },
      weekday: "جمعرات", reviewed: null, lang: "ur", source: "scientific",
    });
    expect(shared).toContain("سائنسی پیش گوئی");
    expect(shared).not.toContain("بمطابق: مرکزی رؤیتِ ہلال کمیٹی");
  });

  it("retains older verified Pakistan dates and historic fallback behavior", () => {
    expect(resolveDisplayHijriDate({ year: 2026, month: 2, day: 28 }))
      .toMatchObject({ source: "official", hijri: { year: 1447, month: 9, day: 10 } });
    expect(resolveDisplayHijriDate({ year: 2018, month: 11, day: 11 }).source).toBe("tabular");
  });
});
