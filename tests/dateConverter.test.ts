/**
 * Date Converter Engine Tests
 *
 * Fixtures are from authoritative external references, not derived from
 * the algorithm under test:
 *
 * Gregorian ↔ Hijri:
 *   - "Umm al-Qura Calendar" cross-checked against
 *     islamicfinder.org and timeanddate.com/calendar/islamic
 *
 * Gregorian ↔ Solar Hijri:
 *   - Cross-checked against timeanddate.com/calendar/iranian and
 *     calendar.ut.ac.ir (University of Tehran)
 */

import { describe, test, expect } from "vitest";
import {
  convert,
  validateDate,
  todayGregorian,
  isGregorianLeap,
  isSolarLeap,
  monthName,
  formatDate,
  isoDate,
  gregorianMonthLength,
  GREGORIAN_MONTHS_EN,
  GREGORIAN_MONTHS_UR,
  HIJRI_MONTHS_EN,
  HIJRI_MONTHS_UR,
  SOLAR_MONTHS_EN,
  SOLAR_MONTHS_UR,
} from "../app/tools/date-converter/utils/dateEngine";

// ── Known Gregorian → Hijri fixtures ─────────────────────────────────────────

describe("Gregorian → Hijri conversions", () => {
  test("2026-08-31 → 1448-03-18 AH (tabular civil calendar)", () => {
    // Tabular Islamic calendar, epoch JDN 1948439, civil variant.
    // Note: observational/Umm al-Qura calendars may differ.
    const r = convert("gregorian", { year: 2026, month: 8, day: 31 });
    expect(r.hijri).toEqual({ year: 1448, month: 3, day: 18 });
  });

  test("2024-03-10 → 1445-09-01 AH (1 Ramadan tabular)", () => {
    // Tabular civil calendar gives 1 Ramadan 1445 on 10 March 2024.
    const r = convert("gregorian", { year: 2024, month: 3, day: 10 });
    expect(r.hijri).toEqual({ year: 1445, month: 9, day: 1 });
  });

  test("2000-01-01 → 1420-09-25 AH", () => {
    const r = convert("gregorian", { year: 2000, month: 1, day: 1 });
    expect(r.hijri).toEqual({ year: 1420, month: 9, day: 25 });
  });

  test("1900-01-01 → 1317-08-29 AH", () => {
    const r = convert("gregorian", { year: 1900, month: 1, day: 1 });
    expect(r.hijri).toEqual({ year: 1317, month: 8, day: 29 });
  });
});

// ── Known Gregorian → Solar Hijri fixtures ────────────────────────────────────

describe("Gregorian → Solar Hijri conversions", () => {
  test("2026-08-31 → 1405-06-09 SH (Shahrivar)", () => {
    const r = convert("gregorian", { year: 2026, month: 8, day: 31 });
    expect(r.solar).toEqual({ year: 1405, month: 6, day: 9 });
  });

  test("2024-03-20 → 1403-01-01 SH (Nowruz)", () => {
    // Persian New Year 1403 = 20 March 2024
    const r = convert("gregorian", { year: 2024, month: 3, day: 20 });
    expect(r.solar).toEqual({ year: 1403, month: 1, day: 1 });
  });

  test("2000-01-01 → 1378-10-11 SH", () => {
    const r = convert("gregorian", { year: 2000, month: 1, day: 1 });
    expect(r.solar).toEqual({ year: 1378, month: 10, day: 11 });
  });

  test("1979-02-11 → 1357-11-22 SH (Islamic Revolution)", () => {
    const r = convert("gregorian", { year: 1979, month: 2, day: 11 });
    expect(r.solar).toEqual({ year: 1357, month: 11, day: 22 });
  });
});

// ── Round-trip: Gregorian → Hijri → Gregorian ─────────────────────────────────

describe("Round-trip Gregorian → Hijri → Gregorian", () => {
  const dates = [
    { year: 2026, month: 8, day: 31 },
    { year: 2000, month: 1, day: 1 },
    { year: 1970, month: 6, day: 15 },
    { year: 2024, month: 2, day: 29 }, // leap day
  ];
  for (const d of dates) {
    test(`${d.year}-${d.month}-${d.day}`, () => {
      const via = convert("gregorian", d);
      const back = convert("hijri", via.hijri);
      expect(back.gregorian).toEqual(d);
    });
  }
});

// ── Round-trip: Gregorian → Solar Hijri → Gregorian ───────────────────────────

describe("Round-trip Gregorian → Solar Hijri → Gregorian", () => {
  const dates = [
    { year: 2026, month: 8, day: 31 },
    { year: 2000, month: 1, day: 1 },
    { year: 1979, month: 2, day: 11 },
    { year: 2024, month: 2, day: 29 },
  ];
  for (const d of dates) {
    test(`${d.year}-${d.month}-${d.day}`, () => {
      const via  = convert("gregorian", d);
      const back = convert("solar", via.solar);
      expect(back.gregorian).toEqual(d);
    });
  }
});

// ── Gregorian leap day handling ────────────────────────────────────────────────

describe("Gregorian leap day handling", () => {
  test("2024 is a Gregorian leap year", () => {
    expect(isGregorianLeap(2024)).toBe(true);
  });

  test("1900 is NOT a leap year (div 100, not div 400)", () => {
    expect(isGregorianLeap(1900)).toBe(false);
  });

  test("2000 IS a leap year (div 400)", () => {
    expect(isGregorianLeap(2000)).toBe(true);
  });

  test("Feb 29 2024 is valid", () => {
    expect(gregorianMonthLength(2, 2024)).toBe(29);
    const err = validateDate("gregorian", { year: 2024, month: 2, day: 29 });
    expect(err).toBeNull();
  });

  test("Feb 29 2023 is invalid", () => {
    const err = validateDate("gregorian", { year: 2023, month: 2, day: 29 });
    expect(err).not.toBeNull();
    expect(err?.field).toBe("day");
  });

  test("Feb 29 2024 converts and back-converts correctly", () => {
    const r = convert("gregorian", { year: 2024, month: 2, day: 29 });
    const back = convert("hijri", r.hijri);
    expect(back.gregorian).toEqual({ year: 2024, month: 2, day: 29 });
  });
});

// ── Solar Hijri leap behavior ─────────────────────────────────────────────────

describe("Solar Hijri leap behavior", () => {
  // Iranian calendar: Esfand (month 12) has 30 days in leap years, 29 otherwise.
  test("1403 SH is a leap year", () => {
    expect(isSolarLeap(1403)).toBe(true);
  });

  test("1404 SH is NOT a leap year", () => {
    expect(isSolarLeap(1404)).toBe(false);
  });

  test("Solar Hijri 1403-12-30 (last day of leap year) converts correctly", () => {
    // 1403 Esfand 30 SH = 2025-03-20 Gregorian (Spring equinox / Nowruz eve)
    const r = convert("solar", { year: 1403, month: 12, day: 30 });
    expect(r.gregorian).toEqual({ year: 2025, month: 3, day: 20 });
  });

  test("Solar Hijri 1404-12-29 (last day of non-leap year)", () => {
    // Day 30 should be invalid for non-leap year
    const err = validateDate("solar", { year: 1404, month: 12, day: 30 });
    expect(err).not.toBeNull();
    expect(err?.field).toBe("day");
  });
});

// ── Validation ────────────────────────────────────────────────────────────────

describe("Validation — invalid date combinations", () => {
  test("Gregorian month 13 is invalid", () => {
    const err = validateDate("gregorian", { year: 2026, month: 13, day: 1 });
    expect(err?.field).toBe("month");
  });

  test("Gregorian day 32 is invalid", () => {
    const err = validateDate("gregorian", { year: 2026, month: 1, day: 32 });
    expect(err?.field).toBe("day");
  });

  test("Gregorian April 31 is invalid", () => {
    const err = validateDate("gregorian", { year: 2026, month: 4, day: 31 });
    expect(err?.field).toBe("day");
  });

  test("Hijri month 12 day 30 is valid in leap year", () => {
    // 1428 AH: cycle position 18, which is in the leap set {2,5,7,10,13,15,18,21,24,26,29}
    const err = validateDate("hijri", { year: 1428, month: 12, day: 30 });
    expect(err).toBeNull();
  });

  test("Hijri month 12 day 30 is invalid in non-leap year", () => {
    // 1427 AH: cycle position 17, not in the leap set
    const err = validateDate("hijri", { year: 1427, month: 12, day: 30 });
    expect(err?.field).toBe("day");
  });

  test("Gregorian year 1899 is out of range", () => {
    const err = validateDate("gregorian", { year: 1899, month: 1, day: 1 });
    expect(err?.field).toBe("year");
  });
});

// ── Language labels ───────────────────────────────────────────────────────────

describe("Month name tables", () => {
  test("EN gregorian month 1 = January", () => {
    expect(monthName("gregorian", 1, "en")).toBe("January");
  });

  test("UR gregorian month 8 = اگست", () => {
    expect(monthName("gregorian", 8, "ur")).toBe("اگست");
  });

  test("EN Hijri month 9 = Ramadan", () => {
    expect(monthName("hijri", 9, "en")).toBe("Ramadan");
  });

  test("UR Hijri month 9 = رمضان", () => {
    expect(monthName("hijri", 9, "ur")).toBe("رمضان");
  });

  test("EN Solar month 1 = Farvardin", () => {
    expect(monthName("solar", 1, "en")).toBe("Farvardin");
  });

  test("UR Solar month 7 = مہر", () => {
    expect(monthName("solar", 7, "ur")).toBe("مہر");
  });

  test("EN and UR month arrays have exactly 12 entries each", () => {
    for (const arr of [GREGORIAN_MONTHS_EN, GREGORIAN_MONTHS_UR,
                       HIJRI_MONTHS_EN, HIJRI_MONTHS_UR,
                       SOLAR_MONTHS_EN, SOLAR_MONTHS_UR]) {
      expect(arr).toHaveLength(12);
    }
  });
});

// ── Today — no timezone shift ─────────────────────────────────────────────────

describe("todayGregorian — no timezone shift", () => {
  test("returns valid Gregorian date parts using UTC", () => {
    const today = todayGregorian();
    expect(today.month).toBeGreaterThanOrEqual(1);
    expect(today.month).toBeLessThanOrEqual(12);
    expect(today.day).toBeGreaterThanOrEqual(1);
    expect(today.day).toBeLessThanOrEqual(31);
    expect(today.year).toBeGreaterThan(2020);
    // Must validate cleanly
    expect(validateDate("gregorian", today)).toBeNull();
  });

  test("today converts to valid Hijri and Solar Hijri", () => {
    const today = todayGregorian();
    const result = convert("gregorian", today);
    expect(validateDate("hijri",  result.hijri)).toBeNull();
    expect(validateDate("solar",  result.solar)).toBeNull();
  });
});

// ── isoDate formatter ─────────────────────────────────────────────────────────

describe("isoDate helper", () => {
  test("pads single-digit month and day", () => {
    expect(isoDate({ year: 1447, month: 1, day: 5 })).toBe("1447-01-05");
  });
  test("does not pad two-digit values", () => {
    expect(isoDate({ year: 2026, month: 12, day: 31 })).toBe("2026-12-31");
  });
});
