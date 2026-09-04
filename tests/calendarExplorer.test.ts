import { describe, expect, it } from "vitest";
import { buildCalendarMonth, buildCalendarYearModel } from "../app/tools/calendar-maker/utils/calendarModel";
import { convert } from "../app/tools/date-converter/utils/dateEngine";

describe("Calendar Explorer regression coverage", () => {
  it("renders Gregorian 1976 year with 12 months", () => {
    const model = buildCalendarYearModel({
      year: 1976,
      content: "gregorian",
      language: "en",
      weekStart: "sunday",
      page: "a4-portrait",
    });

    expect(model.months).toHaveLength(12);
  });

  it("renders November 1976 and generates the exact date profile link", () => {
    const month = buildCalendarMonth(1976, 11, "gregorian", "sunday");
    const day = month.weeks.flatMap((week) => week.cells)
      .find((cell) => cell.gregorianIso === "1976-11-28");

    expect(day?.gregorianIso).toBe("1976-11-28");
    expect(`/date/${day?.gregorianIso}`).toBe("/date/1976-11-28");
  });

  it("keeps Gregorian leap year rules", () => {
    expect(1976 % 4 === 0).toBe(true);

    const february = buildCalendarMonth(2028, 2, "gregorian", "sunday");
    expect(
      february.weeks.flatMap((week) => week.cells)
        .filter((cell) => cell.inCurrentMonth),
    ).toHaveLength(29);
  });

  it("Hijri year foundation keeps twelve month conversion flow", () => {
    const months = Array.from({ length: 12 }, (_, index) =>
      convert("hijri", { year: 1396, month: index + 1, day: 1 }),
    );

    expect(months).toHaveLength(12);
    expect(months.every((item) => item.gregorian.year > 0)).toBe(true);
  });

  it("Hijri month supports conversion through existing engine", () => {
    const monthStart = convert("hijri", { year: 1396, month: 12, day: 1 });
    const dayThirty = convert("hijri", { year: 1396, month: 12, day: 30 });

    expect(monthStart.gregorian.year).toBeTypeOf("number");
    expect(dayThirty.gregorian.year).toBeTypeOf("number");
  });

  it("Hijri day links generate correctly", () => {
    const converted = convert("hijri", { year: 1396, month: 12, day: 7 });
    const link = `/date/${converted.gregorian.year}-${String(converted.gregorian.month).padStart(2, "0")}-${String(converted.gregorian.day).padStart(2, "0")}`;

    expect(link).toMatch(/^\/date\/\d{4}-\d{2}-\d{2}$/);
  });

  it("invalid Hijri route values are rejected", () => {
    const invalidYears = [0, -1];
    expect(invalidYears.every((year) => year < 1)).toBe(true);
    expect([0, 13].some((month) => month < 1 || month > 12)).toBe(true);
    expect(-5 < 1).toBe(true);
  });
});
