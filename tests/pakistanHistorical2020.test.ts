import { describe, expect, it } from "vitest";
import { PAKISTAN_2020_HISTORIC_ANCHORS } from "../app/tools/date-converter/utils/hijri-authority/pakistanHistoricAnchors2020";
import { PAKISTAN_OFFICIAL_HIJRI_ANCHORS } from "../app/tools/date-converter/utils/hijri-authority/pakistanOfficialAnchors";
import { resolvePakistanOfficialHijriDate, resolvePakistanOfficialGregorianDate } from "../app/tools/date-converter/utils/hijri-authority/resolveOfficialHijriDate";
import { getReviewedPakistanHijriMonth } from "../app/tools/date-converter/utils/hijri-authority/resolveOfficialHijriMonth";
import { gregorianToJDN, jdnToGregorian } from "../app/tools/date-converter/utils/dateEngine";
import { buildCalendarMonth, buildCalendarYearModel } from "../app/tools/calendar-maker/utils/calendarModel";

const starts = [
  [1441, 5, 2019, 12, 28, 30],
  [1441, 6, 2020, 1, 27, 30],
  [1441, 7, 2020, 2, 26, 29],
  [1441, 8, 2020, 3, 26, 30],
  [1441, 9, 2020, 4, 25, 29],
  [1441, 10, 2020, 5, 24, 30],
  [1441, 11, 2020, 6, 23, 30],
  [1441, 12, 2020, 7, 23, 29],
  [1442, 1, 2020, 8, 21, 29],
  [1442, 2, 2020, 9, 19, 30],
  [1442, 3, 2020, 10, 19, 29],
  [1442, 4, 2020, 11, 17, 30],
  [1442, 5, 2020, 12, 17, 29]
] as const;
const jdn = (d: { year:number;month:number;day:number }) => gregorianToJDN(d.year,d.month,d.day);
const cell = (m:number,d:number) => buildCalendarMonth(2020,m,"gregorian-hijri","monday",0,"pakistan")
  .weeks.flatMap(w=>w.cells).find(c=>c.inCurrentMonth && c.gregorian.day===d);

describe("Pakistan historical Hijri calendar Gregorian leap-year 2020", () => {
  it("retains 12 Pakistan historic month starts with sources, bounded 29/30-day months", () => {
    expect(PAKISTAN_2020_HISTORIC_ANCHORS).toHaveLength(12);
    expect(PAKISTAN_OFFICIAL_HIJRI_ANCHORS).toHaveLength(85);
    const ids=PAKISTAN_OFFICIAL_HIJRI_ANCHORS.map(x=>x.id);
    expect(new Set(ids).size).toBe(ids.length);
    for(const month of PAKISTAN_2020_HISTORIC_ANCHORS){
      expect(month.sourceUrl).toMatch(/^https:\/\//);
      expect(month.jurisdiction).toBe("PK");
      const length=jdn(month.coverageEndGregorian)-jdn(month.officialDayOneGregorian)+1;
      expect([29,30]).toContain(length);
      expect(getReviewedPakistanHijriMonth(month.hijriYear,month.hijriMonth))
        .toMatchObject({complete:true});
    }
  });
  it("resolves Pakistan's historic first dates and correct 29/30 day lengths", () => {
    for(const [hy,hm,year,month,day,days] of starts){
      const gregorian={year,month,day};
      expect(resolvePakistanOfficialHijriDate(gregorian)?.hijri).toEqual({year:hy,month:hm,day:1});
      expect(resolvePakistanOfficialGregorianDate({year:hy,month:hm,day:1})).toEqual(gregorian);
      expect(getReviewedPakistanHijriMonth(hy,hm)?.days).toHaveLength(days);
    }
  });
  it("distinguishes retrospective Pakistani calendar evidence from final committee decisions", () => {
    for(const h of [[1441,6],[1441,11],[1442,2]]){
      const m=PAKISTAN_2020_HISTORIC_ANCHORS.find(x=>x.hijriYear===h[0]&&x.hijriMonth===h[1]);
      expect(m).toMatchObject({authority:"reported-official",verificationStatus:"reported",evidenceKind:"historical-calendar"});
      expect(m?.announcementGregorianDate).toBeUndefined();
      expect(m?.sightingDecision).toBeUndefined();
    }
    for(const h of [[1441,9],[1441,10],[1441,12],[1442,1],[1442,3],[1442,4]]){
      const m=PAKISTAN_2020_HISTORIC_ANCHORS.find(x=>x.hijriYear===h[0]&&x.hijriMonth===h[1]);
      expect(m).toMatchObject({authority:"official",verificationStatus:"verified",evidenceKind:"official-declaration"});
      expect(m?.announcementGregorianDate).toBeDefined();
    }
  });
  it("has zero gaps or duplicate Hijri dates in all 366 days, with exact reverse conversion", () => {
    const start=jdn({year:2020,month:1,day:1});
    const end=jdn({year:2020,month:12,day:31});
    expect(end-start+1).toBe(366);
    let previous:{year:number;month:number;day:number}|null=null,transitions=0;
    for(let jd=start;jd<=end;jd++){
      const gregorian=jdnToGregorian(jd);
      const result=resolvePakistanOfficialHijriDate(gregorian);
      expect(result,`Missing Pakistan date: ${JSON.stringify(gregorian)}`).not.toBeNull();
      expect(["official","reported-official"]).toContain(result?.authority);
      expect(resolvePakistanOfficialGregorianDate(result!.hijri)).toEqual(gregorian);
      if(previous && result!.hijri.day===1) transitions++;
      else if(previous){
        expect(result!.hijri.day).toBe(previous.day+1);
        expect(result!.hijri.month).toBe(previous.month);
        expect(result!.hijri.year).toBe(previous.year);
      }
      previous=result!.hijri;
    }
    expect(transitions).toBe(12);
  });
  it("presents Pakistan 2020 Ramadan, Eids, Ashura and December declaration without global offsets", () => {
    expect(cell(1,1)).toMatchObject({hijri:{year:1441,month:5,day:5},hijriSource:"official"});
    expect(cell(2,29)).toMatchObject({hijri:{year:1441,month:7,day:4},hijriSource:"official"});
    expect(cell(4,25)).toMatchObject({hijri:{year:1441,month:9,day:1},hijriSource:"official"});
    expect(cell(5,4)).toMatchObject({hijri:{year:1441,month:9,day:10},hijriSource:"official"});
    expect(cell(5,24)).toMatchObject({hijri:{year:1441,month:10,day:1},hijriSource:"official"});
    expect(cell(7,23)).toMatchObject({hijri:{year:1441,month:12,day:1},hijriSource:"official"});
    expect(cell(8,1)).toMatchObject({hijri:{year:1441,month:12,day:10},hijriSource:"official"});
    expect(cell(8,21)).toMatchObject({hijri:{year:1442,month:1,day:1},hijriSource:"official"});
    expect(cell(8,30)).toMatchObject({hijri:{year:1442,month:1,day:10},hijriSource:"official"});
    expect(cell(9,19)).toMatchObject({hijri:{year:1442,month:2,day:1},hijriSource:"reported-official"});
    expect(cell(10,19)).toMatchObject({hijri:{year:1442,month:3,day:1},hijriSource:"official"});
    expect(cell(11,17)).toMatchObject({hijri:{year:1442,month:4,day:1},hijriSource:"official"});
    expect(cell(12,17)).toMatchObject({hijri:{year:1442,month:5,day:1},hijriSource:"official"});
    expect(cell(12,31)).toMatchObject({hijri:{year:1442,month:5,day:15},hijriSource:"official"});
  });
  it("keeps all leap-year 2020 cells Pakistan-sourced and the 2021 January boundary correct", () => {
    const year=buildCalendarYearModel({year:2020,content:"gregorian-hijri",language:"ur",weekStart:"monday",page:"a4-portrait",hijriPolicy:"pakistan"});
    const days=year.months.flatMap(m=>m.weeks).flatMap(w=>w.cells).filter(c=>c.inCurrentMonth);
    expect(days).toHaveLength(366);
    expect(days.every(c=>["official","reported-official"].includes(c.hijriSource||""))).toBe(true);
    expect(resolvePakistanOfficialHijriDate({year:2021,month:1,day:1})?.hijri)
      .toEqual({year:1442,month:5,day:16});
    for(const [year,month,day,hYear,hMonth,hDay] of [
      [2021,4,23,1442,9,10],
      [2022,4,12,1443,9,10],
      [2023,4,1,1444,9,10],
      [2024,3,21,1445,9,10],
      [2025,3,11,1446,9,10],
      [2026,2,28,1447,9,10],
    ]){
      expect(resolvePakistanOfficialHijriDate({year,month,day})?.hijri)
        .toEqual({year:hYear,month:hMonth,day:hDay});
    }
  });
});
