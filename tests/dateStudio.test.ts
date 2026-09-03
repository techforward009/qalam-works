import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import {
  convert,
  gregorianMonthLength,
  gregorianToJDN,
  isGregorianLeap,
  jdnToGregorian,
} from "../app/tools/date-converter/utils/dateEngine";
import {
  exactCalendarAge,
  findHijriDateInGregorianYear,
  getRichDateIntelligence,
  gregorianDayOfYear,
  isoWeekInfo,
  weekdayIndexFromGregorian,
} from "../app/tools/date-converter/utils/dateIntelligence";
import {
  buildCalendarMonth,
  buildCalendarYearModel,
  calendarWeekdayColumn,
  HIJRI_MONTH_SHORT_LABELS,
  parseCalendarYearInput,
} from "../app/tools/calendar-maker/utils/calendarModel";
import { buildCalendarHtml } from "../app/tools/calendar-maker/utils/buildCalendarHtml";
import { resolveRegionalHijriReference } from "../app/tools/date-converter/utils/regionalDateEvidence";

describe("Gregorian date intelligence regressions", () => {
  test("2027-01-01 is Friday and has correct placement", () => {
    expect(weekdayIndexFromGregorian({ year: 2027, month: 1, day: 1 })).toBe(4); // Mon=0, Fri=4
    expect(calendarWeekdayColumn({ year: 2027, month: 1, day: 1 }, "monday")).toBe(4);
    expect(calendarWeekdayColumn({ year: 2027, month: 1, day: 1 }, "sunday")).toBe(5);
  });

  test("Gregorian leap-year rules remain correct", () => {
    expect(gregorianMonthLength(2, 2027)).toBe(28);
    expect(gregorianMonthLength(2, 2028)).toBe(29);
    expect(isGregorianLeap(1900)).toBe(false);
    expect(isGregorianLeap(2000)).toBe(true);
  });

  test("1976 deterministic conversion remains unchanged", () => {
    const result = convert("gregorian", { year: 1976, month: 11, day: 29 });
    expect(result.hijri).toEqual({ year: 1396, month: 12, day: 7 });
    expect(result.solar).toEqual({ year: 1355, month: 9, day: 8 });
    expect(weekdayIndexFromGregorian(result.gregorian)).toBe(0); // Monday
  });

  test("day of year handles leap years", () => {
    expect(gregorianDayOfYear({ year: 2027, month: 1, day: 1 })).toBe(1);
    expect(gregorianDayOfYear({ year: 2027, month: 12, day: 31 })).toBe(365);
    expect(gregorianDayOfYear({ year: 2028, month: 12, day: 31 })).toBe(366);
  });

  test("ISO week handles year boundary", () => {
    expect(isoWeekInfo({ year: 2021, month: 1, day: 1 })).toEqual({ week: 53, year: 2020 });
    expect(isoWeekInfo({ year: 2027, month: 1, day: 4 })).toEqual({ week: 1, year: 2027 });
  });

  test("Julian Day is exposed through rich intelligence", () => {
    const info = getRichDateIntelligence(
      { year: 2000, month: 1, day: 1 },
      { year: 2000, month: 1, day: 1 },
    );
    expect(info.julianDayNumber).toBe(2451545);
    expect(info.wholeDayDistance).toBe(0);
  });

  test("exactCalendarAge uses deterministic month-end clamping", () => {
    const from = { year: 2023, month: 1, day: 31 };
    expect(exactCalendarAge(from, { year: 2023, month: 3, day: 1 })).toEqual({ years: 0, months: 1, days: 1 });
    expect(exactCalendarAge(from, { year: 2023, month: 3, day: 2 })).toEqual({ years: 0, months: 1, days: 2 });
  });

  test("Feb 29 anniversary clamps to Feb 28 in a non-leap year", () => {
    const birth = { year: 2020, month: 2, day: 29 };
    expect(exactCalendarAge(birth, { year: 2021, month: 2, day: 27 })).toEqual({ years: 0, months: 11, days: 29 });
    expect(exactCalendarAge(birth, { year: 2021, month: 2, day: 28 })).toEqual({ years: 1, months: 0, days: 0 });
    expect(exactCalendarAge(birth, { year: 2021, month: 3, day: 1 })).toEqual({ years: 1, months: 0, days: 1 });
  });

  test("1976-11-29 birthday regressions remain exact", () => {
    const birth = { year: 1976, month: 11, day: 29 };
    expect(exactCalendarAge(birth, { year: 2026, month: 9, day: 3 })).toEqual({ years: 49, months: 9, days: 5 });
    expect(exactCalendarAge(birth, { year: 2026, month: 11, day: 28 })).toEqual({ years: 49, months: 11, days: 30 });
    expect(exactCalendarAge(birth, { year: 2026, month: 11, day: 29 })).toEqual({ years: 50, months: 0, days: 0 });
  });

  test("CalendarAge invariants never return negative components", () => {
    const samples = [
      [{ year: 2023, month: 1, day: 31 }, { year: 2023, month: 2, day: 28 }],
      [{ year: 2023, month: 1, day: 31 }, { year: 2024, month: 2, day: 29 }],
      [{ year: 1900, month: 1, day: 1 }, { year: 2100, month: 12, day: 31 }],
      [{ year: 2000, month: 2, day: 29 }, { year: 2001, month: 2, day: 28 }],
    ] as const;
    for (const [from, to] of samples) {
      const age = exactCalendarAge(from, to);
      expect(age).not.toBeNull();
      expect(age!.years).toBeGreaterThanOrEqual(0);
      expect(age!.months).toBeGreaterThanOrEqual(0);
      expect(age!.months).toBeLessThanOrEqual(11);
      expect(age!.days).toBeGreaterThanOrEqual(0);
    }
  });

  test("regional evidence remains supplementary to the deterministic result", () => {
    const calculated = convert("hijri", { year: 1368, month: 9, day: 4 }).gregorian;
    const pakistan = resolveRegionalHijriReference("pk", { year: 1368, month: 9, day: 4 });
    expect(calculated).toEqual({ year: 1949, month: 6, day: 29 });
    expect(pakistan?.gregorianDate).toEqual({ year: 1949, month: 6, day: 30 });
    expect(convert("hijri", { year: 1368, month: 9, day: 4 }).gregorian).toEqual(calculated);
  });

  test("future dates do not produce a numeric zero-age state", () => {
    const info = getRichDateIntelligence(
      { year: 2027, month: 1, day: 1 },
      { year: 2026, month: 12, day: 31 },
    );
    expect(info.relation).toBe("future");
    expect(info.age).toBeNull();
    expect(info.wholeDayDistance).toBe(1);

    const source = readFileSync(
      path.join(process.cwd(), "app/tools/date-converter/DateConverterContent.tsx"),
      "utf8",
    );
    expect(source).toContain('futureDate: "Future date"');
    expect(source).toContain('futureDate: "آئندہ تاریخ"');
    expect(source).toContain('intelligence.relation === "future"');
  });
});

describe("unknown Hijri year search", () => {
  test("finds the deterministic Qalam Works match without guessing Hijri year", () => {
    const matches = findHijriDateInGregorianYear({
      hijriDay: 7,
      hijriMonth: 12,
      gregorianYear: 1976,
    });
    expect(matches).toHaveLength(1);
    expect(matches[0].gregorian).toEqual({ year: 1976, month: 11, day: 29 });
    expect(matches[0].hijri).toEqual({ year: 1396, month: 12, day: 7 });
    expect(matches[0].hijri).toEqual(convert("gregorian", matches[0].gregorian).hijri);
  });

  test("locks a genuine deterministic two-match fixture", () => {
    const matches = findHijriDateInGregorianYear({
      hijriDay: 29,
      hijriMonth: 8,
      gregorianYear: 1900,
    });
    expect(matches).toHaveLength(2);
    expect(matches.map((match) => ({ gregorian: match.gregorian, hijri: match.hijri }))).toEqual([
      {
        gregorian: { year: 1900, month: 1, day: 1 },
        hijri: { year: 1317, month: 8, day: 29 },
      },
      {
        gregorian: { year: 1900, month: 12, day: 21 },
        hijri: { year: 1318, month: 8, day: 29 },
      },
    ]);
    for (const match of matches) {
      expect(match.hijri).toEqual(convert("gregorian", match.gregorian).hijri);
    }
  });

  test("returns no match for impossible tabular Hijri day/month", () => {
    expect(findHijriDateInGregorianYear({ hijriDay: 30, hijriMonth: 2, gregorianYear: 2027 })).toEqual([]);
  });

  test("scans a Gregorian leap year safely", () => {
    const matches = findHijriDateInGregorianYear({ hijriDay: 1, hijriMonth: 9, gregorianYear: 2028 });
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((match) => match.gregorian.year === 2028)).toBe(true);
    expect(matches.every((match) => match.hijri.day === 1 && match.hijri.month === 9)).toBe(true);
  });
});

describe("Calendar Maker year validation", () => {
  test("accepts the supported Gregorian boundaries without clamping", () => {
    expect(parseCalendarYearInput("1900")).toBe(1900);
    expect(parseCalendarYearInput("2100")).toBe(2100);
    expect(parseCalendarYearInput("2027")).toBe(2027);
  });

  test("rejects empty, malformed, and out-of-range years", () => {
    for (const value of ["", "1899", "2101", "02027", "abc", "2027.5"]) {
      expect(parseCalendarYearInput(value)).toBeNull();
    }
  });
});

describe("annual calendar model", () => {
  test("every current-month day occurs exactly once", () => {
    for (const year of [2027, 2028]) {
      for (let month = 1; month <= 12; month++) {
        const model = buildCalendarMonth(year, month, "gregorian", "sunday");
        const current = model.weeks.flatMap((week) => week.cells).filter((cell) => cell.inCurrentMonth);
        expect(current).toHaveLength(gregorianMonthLength(month, year));
        expect(new Set(current.map((cell) => cell.gregorian.day)).size).toBe(current.length);
      }
    }
  });

  test("week start changes first weekday offset correctly", () => {
    const sunday = buildCalendarMonth(2027, 1, "gregorian", "sunday");
    const monday = buildCalendarMonth(2027, 1, "gregorian", "monday");
    const sundayIndex = sunday.weeks[0].cells.findIndex((cell) => cell.inCurrentMonth && cell.gregorian.day === 1);
    const mondayIndex = monday.weeks[0].cells.findIndex((cell) => cell.inCurrentMonth && cell.gregorian.day === 1);
    expect(sundayIndex).toBe(5);
    expect(mondayIndex).toBe(4);
  });

  test("filler cells are explicitly distinguishable from current-month cells", () => {
    const month = buildCalendarMonth(2027, 1, "gregorian", "sunday");
    const cells = month.weeks.flatMap((week) => week.cells);
    expect(cells.some((cell) => !cell.inCurrentMonth)).toBe(true);
    expect(cells.filter((cell) => cell.inCurrentMonth && cell.gregorian.month !== 1)).toEqual([]);
  });

  test("1900 boundary filler never receives an unsupported Hijri overlay", () => {
    const january = buildCalendarMonth(1900, 1, "gregorian-hijri", "sunday");
    const cells = january.weeks.flatMap((week) => week.cells);
    const previous = cells.find((cell) => cell.gregorianIso === "1899-12-31");
    expect(previous).toMatchObject({ inCurrentMonth: false, conversionSupported: false, hijri: null });
    const first = cells.find((cell) => cell.gregorianIso === "1900-01-01");
    expect(first?.conversionSupported).toBe(true);
    expect(first?.hijri).toEqual(convert("gregorian", { year: 1900, month: 1, day: 1 }).hijri);
  });

  test("2100 boundary filler never receives an unsupported Hijri overlay", () => {
    const december = buildCalendarMonth(2100, 12, "gregorian-hijri", "sunday");
    const cells = december.weeks.flatMap((week) => week.cells);
    const next = cells.find((cell) => cell.gregorianIso === "2101-01-01");
    expect(next).toMatchObject({ inCurrentMonth: false, conversionSupported: false, hijri: null });
    const last = cells.find((cell) => cell.gregorianIso === "2100-12-31");
    expect(last?.conversionSupported).toBe(true);
    expect(last?.hijri).toEqual(convert("gregorian", { year: 2100, month: 12, day: 31 }).hijri);
  });

  test("calendar layout reuses the exported Date Converter JDN conversion", () => {
    const first = { year: 2027, month: 1, day: 1 };
    const previous = jdnToGregorian(gregorianToJDN(first.year, first.month, first.day) - 1);
    const january = buildCalendarMonth(2027, 1, "gregorian", "sunday");
    expect(january.weeks[0].cells[4].gregorian).toEqual(previous);

    const source = readFileSync(
      path.join(process.cwd(), "app/tools/calendar-maker/utils/calendarModel.ts"),
      "utf8",
    );
    expect(source).toContain("jdnToGregorian");
    expect(source).toContain("gregorianToJDN");
    expect(source).not.toContain("jdnToGregorianLocal");
    expect(source).not.toContain("1867216.25");
    expect(source).not.toContain("36524.25");
  });

  test("Hijri compact month labels are explicit, distinct, and unambiguous", () => {
    expect(HIJRI_MONTH_SHORT_LABELS.en).toEqual([
      "Muh", "Saf", "Rb1", "Rb2", "Jm1", "Jm2", "Raj", "Shb", "Ram", "Shw", "DQ", "DH",
    ]);
    expect(HIJRI_MONTH_SHORT_LABELS.ur).toEqual([
      "مح", "صف", "رب۱", "رب۲", "جم۱", "جم۲", "رج", "شع", "رم", "شو", "ذق", "ذح",
    ]);
    expect(new Set(HIJRI_MONTH_SHORT_LABELS.en).size).toBe(12);
    expect(new Set(HIJRI_MONTH_SHORT_LABELS.ur).size).toBe(12);
    expect(HIJRI_MONTH_SHORT_LABELS.ur.every((label) => !label.includes("…") && !label.includes("..."))).toBe(true);
  });

  test("Hijri overlay always equals Date Converter engine output, including boundaries", () => {
    const model = buildCalendarYearModel({
      year: 2027,
      content: "gregorian-hijri",
      language: "en",
      weekStart: "sunday",
      page: "a4-portrait",
    });
    const currentCells = model.months.flatMap((month) => month.weeks.flatMap((week) => week.cells).filter((cell) => cell.inCurrentMonth));
    for (const cell of currentCells) {
      expect(cell.hijri).toEqual(convert("gregorian", cell.gregorian).hijri);
    }

    let sawHijriMonthBoundary = false;
    let sawHijriYearBoundary = false;
    for (let index = 1; index < currentCells.length; index++) {
      const previous = currentCells[index - 1];
      const current = currentCells[index];
      if (!previous.hijri || !current.hijri) continue;
      if (previous.hijri.month !== current.hijri.month) sawHijriMonthBoundary = true;
      if (previous.hijri.year !== current.hijri.year) sawHijriYearBoundary = true;
      expect(previous.hijri).toEqual(convert("gregorian", previous.gregorian).hijri);
      expect(current.hijri).toEqual(convert("gregorian", current.gregorian).hijri);
    }
    expect(sawHijriMonthBoundary).toBe(true);
    expect(sawHijriYearBoundary).toBe(true);
  });
});

describe("calendar PDF HTML builder", () => {
  test("contains all 12 months, selected mode, and no external resources", () => {
    const model = buildCalendarYearModel({
      year: 2027,
      content: "gregorian-hijri",
      language: "en",
      weekStart: "monday",
      page: "a4-landscape",
    });
    const html = buildCalendarHtml(model);
    expect(html).toContain("2027 Annual Calendar");
    expect(html).toContain("Gregorian + calculated Hijri");
    for (const name of ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]) {
      expect(html).toContain(name);
    }
    expect(html).not.toMatch(/https?:\/\//i);
    expect(html).toContain("A4 landscape");
  });

  test("PDF HTML uses deliberate Hijri short labels without ambiguous truncation", () => {
    const enModel = buildCalendarYearModel({
      year: 2027,
      content: "gregorian-hijri",
      language: "en",
      weekStart: "sunday",
      page: "a4-landscape",
    });
    const enHtml = buildCalendarHtml(enModel);
    for (const label of ["Rb1", "Rb2", "Jm1", "Jm2", "Shb", "Shw", "DQ", "DH"]) {
      expect(enHtml).toContain(label);
    }

    const urModel = buildCalendarYearModel({
      year: 2027,
      content: "gregorian-hijri",
      language: "ur",
      weekStart: "sunday",
      page: "a4-landscape",
    });
    const urHtml = buildCalendarHtml(urModel);
    for (const label of HIJRI_MONTH_SHORT_LABELS.ur) expect(urHtml).toContain(label);
    expect(urHtml).not.toContain("جمادی ا...");
    expect(urHtml).not.toContain("جمادی الثا...");
    expect(urHtml).not.toContain("…");
  });

  test("Urdu calendar HTML has Urdu title and RTL document direction", () => {
    const model = buildCalendarYearModel({
      year: 2028,
      content: "gregorian",
      language: "ur",
      weekStart: "sunday",
      page: "a4-portrait",
    });
    const html = buildCalendarHtml(model);
    expect(html).toContain("2028 سالانہ تقویم");
    expect(html).toContain('lang="ur" dir="rtl"');
    expect(html).toContain("جنوری");
    expect(html).not.toMatch(/https?:\/\//i);
  });

  test("boundary calendar HTML does not render Hijri for unsupported filler dates", () => {
    const model1900 = buildCalendarYearModel({
      year: 1900,
      content: "gregorian-hijri",
      language: "en",
      weekStart: "sunday",
      page: "a4-portrait",
    });
    const january = model1900.months[0];
    const unsupported = january.weeks.flatMap((week) => week.cells).find((cell) => !cell.conversionSupported);
    expect(unsupported?.gregorianIso).toBe("1899-12-31");
    expect(unsupported?.hijri).toBeNull();

    const model2100 = buildCalendarYearModel({
      year: 2100,
      content: "gregorian-hijri",
      language: "ur",
      weekStart: "sunday",
      page: "a4-landscape",
    });
    const december = model2100.months[11];
    const next = december.weeks.flatMap((week) => week.cells).find((cell) => cell.gregorianIso === "2101-01-01");
    expect(next?.hijri).toBeNull();
  });
});
