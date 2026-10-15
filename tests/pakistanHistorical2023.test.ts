import { describe, expect, it } from "vitest";
import { PAKISTAN_2023_HISTORIC_ANCHORS } from "../app/tools/date-converter/utils/hijri-authority/pakistanHistoricAnchors2023";
import { PAKISTAN_OFFICIAL_HIJRI_ANCHORS } from "../app/tools/date-converter/utils/hijri-authority/pakistanOfficialAnchors";
import { resolvePakistanOfficialHijriDate, resolvePakistanOfficialGregorianDate } from "../app/tools/date-converter/utils/hijri-authority/resolveOfficialHijriDate";
import { getReviewedPakistanHijriMonth } from "../app/tools/date-converter/utils/hijri-authority/resolveOfficialHijriMonth";
import { gregorianToJDN, jdnToGregorian } from "../app/tools/date-converter/utils/dateEngine";
import { buildCalendarMonth, buildCalendarYearModel } from "../app/tools/calendar-maker/utils/calendarModel";

const months = [
  [1444, 6, 2022, 12, 25, 30],
  [1444, 7, 2023, 1, 24, 29],
  [1444, 8, 2023, 2, 22, 29],
  [1444, 9, 2023, 3, 23, 30],
  [1444, 10, 2023, 4, 22, 30],
  [1444, 11, 2023, 5, 22, 29],
  [1444, 12, 2023, 6, 20, 30],
  [1445, 1, 2023, 7, 20, 30],
  [1445, 2, 2023, 8, 19, 30],
  [1445, 3, 2023, 9, 18, 29],
  [1445, 4, 2023, 10, 17, 30],
  [1445, 5, 2023, 11, 16, 29],
  [1445, 6, 2023, 12, 15, 29],
] as const;
const jdn=(d:{year:number;month:number;day:number})=>gregorianToJDN(d.year,d.month,d.day);
const find=(year:number,month:number,day:number)=>
  buildCalendarMonth(year,month,"gregorian-hijri","monday",0,"pakistan")
    .weeks.flatMap(w=>w.cells).find(c=>c.inCurrentMonth && c.gregorian.day===day)!;

describe("Pakistan historic lunar calendar across Gregorian 2023", () => {
  it("stores twelve 2023-context reported official months with unique identities, direct sources and real month lengths", () => {
    expect(PAKISTAN_2023_HISTORIC_ANCHORS).toHaveLength(12);
    expect(PAKISTAN_OFFICIAL_HIJRI_ANCHORS).toHaveLength(48);
    const ids=PAKISTAN_OFFICIAL_HIJRI_ANCHORS.map(a=>a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for(const anchor of PAKISTAN_2023_HISTORIC_ANCHORS){
      expect(anchor.sourceUrl).toMatch(/^https:\/\//);
      expect(anchor.verificationStatus).toBe("verified");
      expect([29,30]).toContain(jdn(anchor.coverageEndGregorian)-jdn(anchor.officialDayOneGregorian)+1);
      expect(getReviewedPakistanHijriMonth(anchor.hijriYear,anchor.hijriMonth))
        .toMatchObject({complete:true});
    }
  });

  it("reproduces every reviewed Pakistan lunar month first day", () => {
    for(const [hYear,hMonth,year,month,day,len] of months){
      const civil={year,month,day};
      expect(resolvePakistanOfficialHijriDate(civil)?.hijri)
        .toEqual({year:hYear,month:hMonth,day:1});
      expect(resolvePakistanOfficialGregorianDate({year:hYear,month:hMonth,day:1}))
        .toEqual(civil);
      const verified=getReviewedPakistanHijriMonth(hYear,hMonth);
      expect(verified?.days).toHaveLength(len);
      expect(verified?.complete).toBe(true);
    }
  });

  it("covers all 365 days of 2023 without gaps or contradictory reverse conversions", () => {
    const start=gregorianToJDN(2023,1,1),end=gregorianToJDN(2023,12,31);
    expect(end-start+1).toBe(365);
    let previous:{year:number;month:number;day:number}|null=null;
    let changed=0;
    for(let jd=start;jd<=end;jd++){
      const gregorian=jdnToGregorian(jd);
      const resolved=resolvePakistanOfficialHijriDate(gregorian);
      expect(resolved,`Pakistan day not found ${JSON.stringify(gregorian)}`).not.toBeNull();
      expect(resolved?.authority).toBe("official");
      expect(resolvePakistanOfficialGregorianDate(resolved!.hijri)).toEqual(gregorian);
      if(previous && resolved!.hijri.day===1) changed++;
      if(previous && resolved!.hijri.day!==1){
        expect(resolved!.hijri.day).toBe(previous.day+1);
        expect(resolved!.hijri.year).toBe(previous.year);
        expect(resolved!.hijri.month).toBe(previous.month);
      }
      previous=resolved!.hijri;
    }
    expect(changed).toBe(12);
  });

  it("uses the Pakistan announcement even when advance astronomy had forecast another start", () => {
    expect(find(2023,1,1)).toMatchObject({hijri:{year:1444,month:6,day:8},hijriSource:"official"});
    expect(find(2023,3,23)).toMatchObject({hijri:{year:1444,month:9,day:1},hijriSource:"official"});
    expect(find(2023,4,1)).toMatchObject({hijri:{year:1444,month:9,day:10},hijriSource:"official"});
    expect(find(2023,4,22)).toMatchObject({hijri:{year:1444,month:10,day:1},hijriSource:"official"});
    expect(find(2023,8,19)).toMatchObject({hijri:{year:1445,month:2,day:1},hijriSource:"official"});
    expect(find(2023,9,18)).toMatchObject({hijri:{year:1445,month:3,day:1},hijriSource:"official"});
    expect(find(2023,12,31)).toMatchObject({hijri:{year:1445,month:6,day:17},hijriSource:"official"});
  });

  it("presents all 2023 calendar days as official-derived Pakistan Hijri dates", () => {
    const annual=buildCalendarYearModel({year:2023,content:"gregorian-hijri",language:"ur",weekStart:"monday",page:"a4-portrait",hijriPolicy:"pakistan"});
    const cells=annual.months.flatMap(m=>m.weeks).flatMap(w=>w.cells).filter(c=>c.inCurrentMonth);
    expect(cells).toHaveLength(365);
    expect(cells.every(c=>c.hijriSource==="official")).toBe(true);
  });

  it("does not alter the Pakistan Ramadan results for 2024, 2025 or 2026", () => {
    expect(resolvePakistanOfficialHijriDate({year:2024,month:3,day:21})?.hijri)
      .toEqual({year:1445,month:9,day:10});
    expect(resolvePakistanOfficialHijriDate({year:2025,month:3,day:11})?.hijri)
      .toEqual({year:1446,month:9,day:10});
    expect(resolvePakistanOfficialHijriDate({year:2026,month:2,day:28})?.hijri)
      .toEqual({year:1447,month:9,day:10});
  });
});
