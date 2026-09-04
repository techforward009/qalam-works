import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildCalendarMonth,
  buildCalendarYearModel,
} from "../app/tools/calendar-maker/utils/calendarModel";
import {
  deriveHijriMonthContexts,
  formatHijriContextList,
  toUrduDigits,
} from "../app/tools/calendar-maker/utils/calendarPresentation";
import { buildCalendarHtml } from "../app/tools/calendar-maker/utils/buildCalendarHtml";

const root = join(__dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Final annual calendar visual specification", () => {
  it("uses a 1/2/3 responsive annual structure and 3x4 PDF grid", () => {
    const explorer = read("app/components/date-studio/CalendarExplorer.tsx");
    const maker = read("app/tools/calendar-maker/CalendarMakerContent.tsx");
    const pdf = read("app/tools/calendar-maker/utils/buildCalendarHtml.ts");

    for (const source of [explorer, maker]) {
      expect(source).toMatch(/grid-cols-1/);
      expect(source).toMatch(/md:grid-cols-2/);
      expect(source).toMatch(/xl:grid-cols-3/);
    }
    expect(pdf).toMatch(/grid-template-columns:repeat\(3/);
    expect(pdf).toMatch(/grid-template-rows:repeat\(4/);
  });

  it("derives ordered Hijri month context from every active Gregorian day", () => {
    const month = buildCalendarMonth(2026, 1, "gregorian-hijri", "monday");
    const contexts = deriveHijriMonthContexts(month, "en", 0);
    expect(contexts.length).toBeGreaterThanOrEqual(2);

    const keys = contexts.map((context) => `${context.year}-${context.month}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(contexts[0].label.length).toBeGreaterThan(2);
  });

  it("supports a two-Hijri-month header", () => {
    let found = false;
    for (let monthNumber = 1; monthNumber <= 12; monthNumber++) {
      const month = buildCalendarMonth(2026, monthNumber, "gregorian-hijri", "monday");
      const contexts = deriveHijriMonthContexts(month, "en", 0);
      if (contexts.length === 2) {
        found = true;
        expect(contexts[0].label).not.toMatch(/^(Ram|Raj|Shb)$/);
        expect(contexts[1].label.length).toBeGreaterThan(2);
        break;
      }
    }
    expect(found).toBe(true);
  });

  it("supports three Hijri contexts and slash-separates subsequent context", () => {
    let three: ReturnType<typeof deriveHijriMonthContexts> | null = null;

    outer:
    for (let year = 1900; year <= 2100; year++) {
      for (let monthNumber = 1; monthNumber <= 12; monthNumber++) {
        const month = buildCalendarMonth(year, monthNumber, "gregorian-hijri", "monday");
        const contexts = deriveHijriMonthContexts(month, "en", 0);
        if (contexts.length >= 3) {
          three = contexts;
          break outer;
        }
      }
    }

    expect(three).not.toBeNull();
    expect(three!.length).toBeGreaterThanOrEqual(3);
    expect(formatHijriContextList(three!.slice(1), "en")).toContain(" / ");
  });

  it("keeps Hijri month names out of day cells", () => {
    const cell = read("app/components/date-studio/CalendarDayCell.tsx");
    expect(cell).not.toMatch(/HIJRI_MONTHS_EN/);
    expect(cell).not.toMatch(/HIJRI_MONTHS_UR/);
    expect(cell).not.toMatch(/HIJRI_MONTH_SHORT_LABELS/);
    expect(cell).toMatch(/data-role="hijri-day"/);
  });

  it("renders Latin Gregorian digits and Urdu Hijri digits", () => {
    expect(String(23)).toBe("23");
    expect(toUrduDigits(25)).toBe("۲۵");
    expect(toUrduDigits(1447)).toBe("۱۴۴۷");
  });

  it("uses the same month component structure for English and Urdu with RTL alignment only", () => {
    const month = read("app/components/date-studio/MonthCalendar.tsx");
    const cell = read("app/components/date-studio/CalendarDayCell.tsx");

    expect(month).toMatch(/language = "en"/);
    expect(month).toMatch(/dir=\{isUr \? "rtl" : "ltr"\}/);
    expect(month).toMatch(/deriveHijriMonthContexts/);
    expect(cell).toMatch(/isUr \? "items-end text-right" : "items-start text-left"/);
    expect(cell).toMatch(/dir="ltr"/);
  });

  it("keeps Monday-to-Sunday Urdu alignment and a distinct Sunday strip accent", () => {
    const month = read("app/components/date-studio/MonthCalendar.tsx");
    const model = read("app/tools/calendar-maker/utils/calendarModel.ts");
    expect(model).toMatch(/"پیر", "منگل", "بدھ", "جمعرات", "جمعہ", "ہفتہ", "اتوار"/);
    expect(month).toMatch(/day === "Sun" \|\| day === "اتوار"/);
  });

  it("custom Hijri offset changes displayed day values and at least one month boundary context", () => {
    const base = buildCalendarMonth(2026, 1, "gregorian-hijri", "monday", 0);
    const plusOne = buildCalendarMonth(2026, 1, "gregorian-hijri", "monday", 1);
    const baseFirst = base.weeks.flatMap((week) => week.cells).find((cell) => cell.inCurrentMonth)!;
    const plusFirst = plusOne.weeks.flatMap((week) => week.cells).find((cell) => cell.inCurrentMonth)!;
    expect(plusFirst.hijri).not.toEqual(baseFirst.hijri);

    let boundaryChanged = false;
    outer:
    for (let year = 2020; year <= 2035; year++) {
      for (let monthNumber = 1; monthNumber <= 12; monthNumber++) {
        const month = buildCalendarMonth(year, monthNumber, "gregorian-hijri", "monday");
        const zero = deriveHijriMonthContexts(month, "en", 0).map((c) => `${c.year}-${c.month}`).join(",");
        const shifted = deriveHijriMonthContexts(month, "en", 1).map((c) => `${c.year}-${c.month}`).join(",");
        if (zero !== shifted) {
          boundaryChanged = true;
          break outer;
        }
      }
    }
    expect(boundaryChanged).toBe(true);
  });

  it("keeps preview and PDF on the same Hijri context/offset model", () => {
    const model = buildCalendarYearModel({
      year: 2026,
      content: "gregorian-hijri",
      language: "ur",
      weekStart: "monday",
      page: "a4-portrait",
      hijriOffset: 1,
    });
    const contexts = deriveHijriMonthContexts(model.months[0], "ur", 1);
    const html = buildCalendarHtml(model);

    expect(contexts.length).toBeGreaterThan(0);
    expect(html).toContain(contexts[0].label);
    expect(html).toContain(toUrduDigits(contexts[0].year));
    expect(html).toMatch(/class="hijri-day">[۰-۹]+<\/div>/);
    expect(read("app/tools/calendar-maker/CalendarMakerContent.tsx")).toMatch(/hijriOffset=\{hijriOffset\}/);
  });

  it("uses prominent Gregorian day structure and secondary Hijri day structure", () => {
    const cell = read("app/components/date-studio/CalendarDayCell.tsx");
    expect(cell).toMatch(/data-role="gregorian-day"/);
    expect(cell).toMatch(/font-black/);
    expect(cell).toMatch(/text-\[17px\]/);
    expect(cell).toMatch(/text-2xl/);
    expect(cell).toMatch(/data-role="hijri-day"/);
    expect(cell).toMatch(/text-\[11px\]/);
  });
});
