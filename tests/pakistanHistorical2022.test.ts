import { describe, expect, it } from "vitest";
import { PAKISTAN_2022_HISTORIC_ANCHORS } from "../app/tools/date-converter/utils/hijri-authority/pakistanHistoricAnchors2022";
import { PAKISTAN_OFFICIAL_HIJRI_ANCHORS } from "../app/tools/date-converter/utils/hijri-authority/pakistanOfficialAnchors";
import { resolvePakistanOfficialHijriDate, resolvePakistanOfficialGregorianDate } from "../app/tools/date-converter/utils/hijri-authority/resolveOfficialHijriDate";
import { getReviewedPakistanHijriMonth } from "../app/tools/date-converter/utils/hijri-authority/resolveOfficialHijriMonth";
import { gregorianToJDN, jdnToGregorian } from "../app/tools/date-converter/utils/dateEngine";
import { buildCalendarMonth, buildCalendarYearModel } from "../app/tools/calendar-maker/utils/calendarModel";

const months = [
  [1443, 5, 2021, 12, 6, 30],
  [1443, 6, 2022, 1, 5, 29],
  [1443, 7, 2022, 2, 3, 30],
  [1443, 8, 2022, 3, 5, 29],
  [1443, 9, 2022, 4, 3, 30],
  [1443, 10, 2022, 5, 3, 29],
  [1443, 11, 2022, 6, 1, 30],
  [1443, 12, 2022, 7, 1, 30],
  [1444, 1, 2022, 7, 31, 29],
  [1444, 2, 2022, 8, 29, 30],
  [1444, 3, 2022, 9, 28, 30],
  [1444, 4, 2022, 10, 28, 29],
  [1444, 5, 2022, 11, 26, 29],
  [1444, 6, 2022, 12, 25, 30]
] as const;

describe("Pakistan calendar historical lunar record — Gregorian 2022", () => {
  it("stores 13 reviewed 2022 first-of-month records and a complete archive through 2025", () => {
    expect(PAKISTAN_2022_HISTORIC_ANCHORS).toHaveLength(13);
    expect(PAKISTAN_OFFICIAL_HIJRI_ANCHORS).toHaveLength(61);
    const allIds = PAKISTAN_OFFICIAL_HIJRI_ANCHORS.map(a => a.id);
    expect(new Set(allIds).size).toBe(allIds.length);
    for (const month of PAKISTAN_2022_HISTORIC_ANCHORS) {
      expect(month.sourceUrl).toMatch(/^https:\/\//);
      expect(month.verificationStatus).toMatch(/^(reported|verified)$/);
      const days = gregorianToJDN(month.coverageEndGregorian.year,month.coverageEndGregorian.month,month.coverageEndGregorian.day) -
        gregorianToJDN(month.officialDayOneGregorian.year,month.officialDayOneGregorian.month,month.officialDayOneGregorian.day) + 1;
      expect([29,30]).toContain(days);
      expect(getReviewedPakistanHijriMonth(month.hijriYear,month.hijriMonth))
        .toMatchObject({complete:true});
    }
    // Government historical day-to-day calendar records 6 Dec 2021;
    // unlike direct crescent-committee press announcements its provenance stays "reported-official".
    expect(PAKISTAN_2022_HISTORIC_ANCHORS[0]).toMatchObject({
      hijriYear:1443,hijriMonth:5,authority:"reported-official",verificationStatus:"reported",
    });
  });

  it("matches each 2022 Pakistani lunar month start and the next reviewed boundary", () => {
    for (const [hy,hm,y,m,d,len] of months) {
      const date = {year:y,month:m,day:d};
      expect(resolvePakistanOfficialHijriDate(date)?.hijri).toEqual({year:hy,month:hm,day:1});
      expect(resolvePakistanOfficialGregorianDate({year:hy,month:hm,day:1})).toEqual(date);
      expect(getReviewedPakistanHijriMonth(hy,hm)?.days).toHaveLength(len);
    }
  });

  it("covers 365 consecutive civil days of 2022 without gaps and roundtrips every date", () => {
    const start=gregorianToJDN(2022,1,1),end=gregorianToJDN(2022,12,31);
    expect(end-start+1).toBe(365);
    let prev:{year:number;month:number;day:number}|null=null;
    let transitions=0;
    for(let jd=start;jd<=end;jd++){
      const gregorian=jdnToGregorian(jd);
      const day=resolvePakistanOfficialHijriDate(gregorian);
      expect(day, `No Pakistan date for ${JSON.stringify(gregorian)}`).not.toBeNull();
      expect(["official","reported-official"]).toContain(day!.authority);
      expect(resolvePakistanOfficialGregorianDate(day!.hijri)).toEqual(gregorian);
      if(prev && day!.hijri.day === 1) transitions++;
      if(prev && day!.hijri.day !== 1){
        expect(day!.hijri.day).toBe(prev.day+1);
        expect(day!.hijri.month).toBe(prev.month);
        expect(day!.hijri.year).toBe(prev.year);
      }
      prev=day!.hijri;
    }
    expect(transitions).toBe(13);
  });

  it("shows Pakistan's declared Ramadan, Eid, Muharram and Safar, not a global estimate", () => {
    const find=(month:number,day:number) => buildCalendarMonth(2022,month,"gregorian-hijri","monday",0,"pakistan")
      .weeks.flatMap(w=>w.cells).find(c=>c.inCurrentMonth && c.gregorian.day===day);
    expect(find(1,1)).toMatchObject({hijri:{year:1443,month:5,day:27},hijriSource:"reported-official"});
    expect(find(4,3)).toMatchObject({hijri:{year:1443,month:9,day:1},hijriSource:"official"});
    expect(find(4,12)).toMatchObject({hijri:{year:1443,month:9,day:10},hijriSource:"official"});
    expect(find(5,3)).toMatchObject({hijri:{year:1443,month:10,day:1},hijriSource:"official"});
    expect(find(7,10)).toMatchObject({hijri:{year:1443,month:12,day:10},hijriSource:"official"});
    expect(find(7,31)).toMatchObject({hijri:{year:1444,month:1,day:1},hijriSource:"official"});
    expect(find(8,29)).toMatchObject({hijri:{year:1444,month:2,day:1},hijriSource:"official"});
    expect(find(9,28)).toMatchObject({hijri:{year:1444,month:3,day:1},hijriSource:"official"});
    expect(find(10,28)).toMatchObject({hijri:{year:1444,month:4,day:1},hijriSource:"official"});
    expect(find(11,26)).toMatchObject({hijri:{year:1444,month:5,day:1},hijriSource:"official"});
    expect(find(12,25)).toMatchObject({hijri:{year:1444,month:6,day:1},hijriSource:"official"});
  });

  it("keeps all 2022 public yearly calendar cells supported by Pakistani sources", () => {
    const model=buildCalendarYearModel({year:2022,content:"gregorian-hijri",language:"ur",weekStart:"monday",page:"a4-portrait",hijriPolicy:"pakistan"});
    const days=model.months.flatMap(m=>m.weeks).flatMap(w=>w.cells).filter(c=>c.inCurrentMonth);
    expect(days).toHaveLength(365);
    expect(days.every(c=>c.hijriSource==="official"||c.hijriSource==="reported-official")).toBe(true);
  });

  it("preserves already reviewed Pakistan Ramadan dates 2023 through 2026", () => {
    const dates=[
      [2023,4,1,1444,9,10],
      [2024,3,21,1445,9,10],
      [2025,3,11,1446,9,10],
      [2026,2,28,1447,9,10],
    ];
    for(const [year,month,day,hYear,hMonth,hDay] of dates){
      expect(resolvePakistanOfficialHijriDate({year,month,day})?.hijri).toEqual({year:hYear,month:hMonth,day:hDay});
    }
  });
});
