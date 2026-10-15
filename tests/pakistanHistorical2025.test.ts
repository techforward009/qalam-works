import { describe, expect, it } from "vitest";
import { PAKISTAN_2025_HISTORIC_ANCHORS } from "../app/tools/date-converter/utils/hijri-authority/pakistanHistoricAnchors2025";
import { PAKISTAN_OFFICIAL_HIJRI_ANCHORS } from "../app/tools/date-converter/utils/hijri-authority/pakistanOfficialAnchors";
import { resolvePakistanOfficialHijriDate, resolvePakistanOfficialGregorianDate } from "../app/tools/date-converter/utils/hijri-authority/resolveOfficialHijriDate";
import { getReviewedPakistanHijriMonth } from "../app/tools/date-converter/utils/hijri-authority/resolveOfficialHijriMonth";
import { gregorianToJDN, jdnToGregorian } from "../app/tools/date-converter/utils/dateEngine";
import { buildCalendarMonth } from "../app/tools/calendar-maker/utils/calendarModel";

const months = [
  [1446, 6, 2024, 12, 4],
  [1446, 7, 2025, 1, 2],
  [1446, 8, 2025, 1, 31],
  [1446, 9, 2025, 3, 2],
  [1446, 10, 2025, 3, 31],
  [1446, 11, 2025, 4, 29],
  [1446, 12, 2025, 5, 29],
  [1447, 1, 2025, 6, 27],
  [1447, 2, 2025, 7, 27],
  [1447, 3, 2025, 8, 26],
  [1447, 4, 2025, 9, 25],
  [1447, 5, 2025, 10, 24],
  [1447, 6, 2025, 11, 23],
  [1447, 7, 2025, 12, 22],
] as const;
const jdn = (date: { year:number; month:number; day:number }) =>
  gregorianToJDN(date.year, date.month, date.day);

describe("Pakistan full Gregorian 2025 historical month archive", () => {
  it("contains 13 published month-start anchors with distinct sources and valid boundaries", () => {
    expect(PAKISTAN_2025_HISTORIC_ANCHORS).toHaveLength(13);
    expect(PAKISTAN_OFFICIAL_HIJRI_ANCHORS).toHaveLength(36);
    const ids = PAKISTAN_2025_HISTORIC_ANCHORS.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const anchor of PAKISTAN_2025_HISTORIC_ANCHORS) {
      expect(anchor.sourceUrl).toMatch(/^https:\/\//);
      expect(anchor.verificationStatus).toBe("verified");
      const duration = jdn(anchor.coverageEndGregorian) - jdn(anchor.officialDayOneGregorian) + 1;
      expect([29,30]).toContain(duration);
      expect(resolvePakistanOfficialHijriDate(anchor.officialDayOneGregorian)?.hijri).toEqual({
        year: anchor.hijriYear, month: anchor.hijriMonth, day: 1,
      });
      expect(getReviewedPakistanHijriMonth(anchor.hijriYear, anchor.hijriMonth))
        .toMatchObject({ complete: true });
    }
  });

  it("reproduces the 2025 announced lunar month starts exactly", () => {
    for (const [hYear, hMonth, year, month, day] of months) {
      const gregorian = { year, month, day };
      expect(resolvePakistanOfficialHijriDate(gregorian)?.hijri).toEqual({
        year: hYear, month: hMonth, day: 1,
      });
      expect(resolvePakistanOfficialGregorianDate({year: hYear, month: hMonth, day: 1}))
        .toEqual(gregorian);
    }
  });

  it("has zero gaps, overlaps or inconsistent reverse conversions on all 365 days of 2025", () => {
    const start = gregorianToJDN(2025,1,1);
    const end = gregorianToJDN(2025,12,31);
    expect(end-start+1).toBe(365);
    let changes = 0;
    let previous:{year:number;month:number;day:number}|null = null;
    for (let dayNumber=start;dayNumber<=end;dayNumber++) {
      const date = jdnToGregorian(dayNumber);
      const resolved = resolvePakistanOfficialHijriDate(date);
      expect(resolved, `Missing Pakistan date for ${JSON.stringify(date)}`).not.toBeNull();
      expect(resolved!.authority).toBe("official");
      expect(resolvePakistanOfficialGregorianDate(resolved!.hijri)).toEqual(date);
      if (previous && resolved!.hijri.day === 1) changes++;
      if (previous && resolved!.hijri.day !== 1) {
        expect(resolved!.hijri.day).toBe(previous.day + 1);
        expect(resolved!.hijri.month).toBe(previous.month);
        expect(resolved!.hijri.year).toBe(previous.year);
      }
      previous=resolved!.hijri;
    }
    expect(changes).toBe(13);
  });

  it("presents all reviewed days without fallback labels in 2025 monthly calendars", () => {
    for (let month=1; month<=12; month++) {
      const grid=buildCalendarMonth(2025,month,"gregorian-hijri","monday",0,"pakistan");
      expect(grid.weeks.flatMap(w=>w.cells).filter(c=>c.inCurrentMonth)
        .every(c=>c.hijriSource==="official")).toBe(true);
    }
  });

  it("retains the earlier 2026 Ramadan outcome independently of the historical backfill", () => {
    expect(resolvePakistanOfficialHijriDate({year:2026,month:2,day:28})?.hijri)
      .toEqual({year:1447,month:9,day:10});
  });
});
