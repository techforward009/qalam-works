import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildCalendarYearModel } from "../app/tools/calendar-maker/utils/calendarModel";
import { resolveDisplayHijriDate } from "../app/tools/date-converter/utils/hijri-authority/displayHijriDate";

const source = (path: string) => readFileSync(join(__dirname, "..", path), "utf8");

describe("Pakistan-first public Date Studio presentation", () => {
  it("opens the monthly and yearly calendars in Pakistan Hijri mode by default", () => {
    for (const path of [
      "app/components/date-studio/CalendarExplorer.tsx",
      "app/components/date-studio/CalendarMonthExplorer.tsx",
    ]) {
      const text = source(path);
      expect(text).toContain('useState<CalendarContentMode>("gregorian-hijri")');
      expect(text).toContain('useState<DisplayHijriPolicy>("pakistan")');
      expect(text).toContain("پاکستانی ہجری تقویم");
      expect(text).toContain("اضافی حسابی طریقہ (تحقیق کے لیے)");
      expect(text).toContain("<details");
    }
  });

  it("keeps verified Pakistan dates primary in both conversion directions", () => {
    const converter = source("app/tools/date-converter/DateConverterContent.tsx");
    expect(converter).toContain('calendar === "hijri" ? resolvePakistanOfficialGregorianDate(parts)');
    expect(converter).toContain('result ? resolvePakistanOfficialHijriDate(result.gregorian) : null');
    expect(converter).not.toContain('selectedCountry === "pk" ? resolvePakistanOfficialHijriDate');
    expect(resolveDisplayHijriDate({ year: 2026, month: 2, day: 28 })).toMatchObject({
      source: "official", hijri: { year: 1447, month: 9, day: 10 },
    });
  });

  it("keeps calculated dates labeled for months without historic Pakistan authority data", () => {
    const model = buildCalendarYearModel({
      year: 2026, content: "gregorian-hijri", language: "ur",
      weekStart: "monday", page: "a4-portrait", hijriPolicy: "pakistan",
    });
    const find = (month: number, day: number) => model.months[month - 1].weeks
      .flatMap(w => w.cells).find(c => c.inCurrentMonth && c.gregorian.day === day);
    expect(find(2, 28)?.hijriSource).toBe("official");
    expect(find(11, 15)?.hijriSource).toBe("scientific");
    const maker = source("app/tools/calendar-maker/CalendarMakerContent.tsx");
    expect(maker).toContain('useState<DisplayHijriPolicy>("pakistan")');
    expect(maker).toContain("پاکستانی تقویم ساز");
  });
});
