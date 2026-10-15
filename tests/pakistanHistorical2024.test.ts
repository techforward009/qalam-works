import { describe, expect, it } from "vitest";
import { PAKISTAN_2024_HISTORIC_ANCHORS } from "../app/tools/date-converter/utils/hijri-authority/pakistanHistoricAnchors2024";
import { PAKISTAN_OFFICIAL_HIJRI_ANCHORS } from "../app/tools/date-converter/utils/hijri-authority/pakistanOfficialAnchors";
import { resolvePakistanOfficialHijriDate, resolvePakistanOfficialGregorianDate } from "../app/tools/date-converter/utils/hijri-authority/resolveOfficialHijriDate";
import { getReviewedPakistanHijriMonth } from "../app/tools/date-converter/utils/hijri-authority/resolveOfficialHijriMonth";
import { gregorianToJDN, jdnToGregorian } from "../app/tools/date-converter/utils/dateEngine";
import { buildCalendarMonth, buildCalendarYearModel } from "../app/tools/calendar-maker/utils/calendarModel";

const months = [
  [1445, 6, 2023, 12, 15, 29],
  [1445, 7, 2024, 1, 13, 30],
  [1445, 8, 2024, 2, 12, 29],
  [1445, 9, 2024, 3, 12, 29],
  [1445, 10, 2024, 4, 10, 30],
  [1445, 11, 2024, 5, 10, 29],
  [1445, 12, 2024, 6, 8, 30],
  [1446, 1, 2024, 7, 8, 30],
  [1446, 2, 2024, 8, 7, 30],
  [1446, 3, 2024, 9, 6, 29],
  [1446, 4, 2024, 10, 5, 30],
  [1446, 5, 2024, 11, 4, 30],
  [1446, 6, 2024, 12, 4, 29]
] as const;

const jdn = (d: {year:number;month:number;day:number}) => gregorianToJDN(d.year,d.month,d.day);
const find = (year:number, month:number, day:number) =>
  buildCalendarMonth(year,month,"gregorian-hijri","monday",0,"pakistan")
    .weeks.flatMap(week=>week.cells)
    .find(cell=>cell.inCurrentMonth && cell.gregorian.day===day)!;

describe("Pakistan Gregorian 2024 — reviewed lunar history", () => {
  it("keeps each of the twelve historic month announcements and preserves 2025 and 2026", () => {
    expect(PAKISTAN_2024_HISTORIC_ANCHORS).toHaveLength(12);
    expect(PAKISTAN_OFFICIAL_HIJRI_ANCHORS).toHaveLength(36);
    const ids=PAKISTAN_OFFICIAL_HIJRI_ANCHORS.map(anchor=>anchor.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of PAKISTAN_2024_HISTORIC_ANCHORS) {
      expect(a.sourceUrl).toMatch(/^https:\/\//);
      expect(a.verificationStatus).toBe("verified");
      const count=jdn(a.coverageEndGregorian)-jdn(a.officialDayOneGregorian)+1;
      expect([29,30]).toContain(count);
      expect(getReviewedPakistanHijriMonth(a.hijriYear,a.hijriMonth)).toMatchObject({complete:true});
    }
  });

  it("reproduces all published first-day dates and all 29/30-day month lengths", () => {
    for (const [hYear,hMonth,year,month,day,len] of months) {
      const start={year,month,day};
      expect(resolvePakistanOfficialHijriDate(start)?.hijri)
        .toEqual({year:hYear,month:hMonth,day:1});
      expect(resolvePakistanOfficialGregorianDate({year:hYear,month:hMonth,day:1}))
        .toEqual(start);
      const verified=getReviewedPakistanHijriMonth(hYear,hMonth);
      expect(verified?.days).toHaveLength(len);
      expect(verified?.complete).toBe(true);
    }
  });

  it("resolves all 366 days of leap-year 2024 with no gaps, overlapping months, or failed reverse lookups", () => {
    const start=gregorianToJDN(2024,1,1);
    const end=gregorianToJDN(2024,12,31);
    expect(end-start+1).toBe(366);
    let previous: {year:number;month:number;day:number}|null=null;
    let monthsChanged=0;
    for(let dayNumber=start;dayNumber<=end;dayNumber++){
      const g=jdnToGregorian(dayNumber);
      const r=resolvePakistanOfficialHijriDate(g);
      expect(r,`Missing Pakistan Hijri authority date for ${JSON.stringify(g)}`).not.toBeNull();
      expect(r?.authority).toBe("official");
      const hijri=r!.hijri;
      expect(resolvePakistanOfficialGregorianDate(hijri)).toEqual(g);
      if(previous && hijri.day===1)monthsChanged++;
      if(previous && hijri.day!==1) {
        expect(hijri.day).toBe(previous.day+1);
        expect(hijri.month).toBe(previous.month);
        expect(hijri.year).toBe(previous.year);
      }
      previous=hijri;
    }
    expect(monthsChanged).toBe(12);
  });

  it("agrees in date card and calendar views at important 2024 boundaries", () => {
    expect(find(2024,1,1)).toMatchObject({hijri:{year:1445,month:6,day:18},hijriSource:"official"});
    expect(find(2024,2,29)).toMatchObject({hijri:{year:1445,month:8,day:18},hijriSource:"official"});
    expect(find(2024,3,21)).toMatchObject({hijri:{year:1445,month:9,day:10},hijriSource:"official"});
    expect(find(2024,4,10)).toMatchObject({hijri:{year:1445,month:10,day:1},hijriSource:"official"});
    expect(find(2024,12,31)).toMatchObject({hijri:{year:1446,month:6,day:28},hijriSource:"official"});
    const model=buildCalendarYearModel({year:2024,content:"gregorian-hijri",language:"ur",weekStart:"monday",page:"a4-portrait",hijriPolicy:"pakistan"});
    expect(model.months.flatMap(m=>m.weeks).flatMap(w=>w.cells)
      .filter(c=>c.inCurrentMonth).every(c=>c.hijriSource==="official")).toBe(true);
  });

  it("preserves previously established Pakistani Ramadan 2025 and 2026", () => {
    expect(resolvePakistanOfficialHijriDate({year:2025,month:3,day:11})?.hijri)
      .toEqual({year:1446,month:9,day:10});
    expect(resolvePakistanOfficialHijriDate({year:2026,month:2,day:28})?.hijri)
      .toEqual({year:1447,month:9,day:10});
  });
});
