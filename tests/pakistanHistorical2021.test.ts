import { describe, expect, it } from "vitest";
import { PAKISTAN_2021_HISTORIC_ANCHORS } from "../app/tools/date-converter/utils/hijri-authority/pakistanHistoricAnchors2021";
import { PAKISTAN_OFFICIAL_HIJRI_ANCHORS } from "../app/tools/date-converter/utils/hijri-authority/pakistanOfficialAnchors";
import { resolvePakistanOfficialHijriDate, resolvePakistanOfficialGregorianDate } from "../app/tools/date-converter/utils/hijri-authority/resolveOfficialHijriDate";
import { getReviewedPakistanHijriMonth } from "../app/tools/date-converter/utils/hijri-authority/resolveOfficialHijriMonth";
import { gregorianToJDN, jdnToGregorian } from "../app/tools/date-converter/utils/dateEngine";
import { buildCalendarMonth, buildCalendarYearModel } from "../app/tools/calendar-maker/utils/calendarModel";

const starts = [
  [1442, 5, 2020, 12, 17, 29],
  [1442, 6, 2021, 1, 15, 30],
  [1442, 7, 2021, 2, 14, 30],
  [1442, 8, 2021, 3, 16, 29],
  [1442, 9, 2021, 4, 14, 29],
  [1442, 10, 2021, 5, 13, 30],
  [1442, 11, 2021, 6, 12, 30],
  [1442, 12, 2021, 7, 12, 29],
  [1443, 1, 2021, 8, 10, 30],
  [1443, 2, 2021, 9, 9, 29],
  [1443, 3, 2021, 10, 8, 30],
  [1443, 4, 2021, 11, 7, 29],
  [1443, 5, 2021, 12, 6, 30]
] as const;

const fromYear = (day:number,month:number) =>
  buildCalendarMonth(2021,month,"gregorian-hijri","monday",0,"pakistan")
    .weeks.flatMap(week=>week.cells)
    .find(cell=>cell.inCurrentMonth && cell.gregorian.day===day);

describe("Pakistan historical Hijri calendar Gregorian 2021", () => {
  it("preserves twelve first-day source records with genuine 29/30-day lunar boundaries", () => {
    expect(PAKISTAN_2021_HISTORIC_ANCHORS).toHaveLength(12);
    expect(PAKISTAN_OFFICIAL_HIJRI_ANCHORS).toHaveLength(73);
    const ids=PAKISTAN_OFFICIAL_HIJRI_ANCHORS.map(x=>x.id);
    expect(new Set(ids).size).toBe(ids.length);
    for(const m of PAKISTAN_2021_HISTORIC_ANCHORS){
      expect(m.sourceUrl).toMatch(/^https:\/\//);
      const start=gregorianToJDN(m.officialDayOneGregorian.year,m.officialDayOneGregorian.month,m.officialDayOneGregorian.day);
      const end=gregorianToJDN(m.coverageEndGregorian.year,m.coverageEndGregorian.month,m.coverageEndGregorian.day);
      expect([29,30]).toContain(end-start+1);
      expect(getReviewedPakistanHijriMonth(m.hijriYear,m.hijriMonth)).toMatchObject({complete:true});
    }
  });

  it("uses committee-announced Rajab and Shawwal, where past government projection differs", () => {
    const rajab=PAKISTAN_2021_HISTORIC_ANCHORS.find(x=>x.hijriYear===1442&&x.hijriMonth===7);
    const shawwal=PAKISTAN_2021_HISTORIC_ANCHORS.find(x=>x.hijriYear===1442&&x.hijriMonth===10);
    expect(rajab).toMatchObject({authority:"official",officialDayOneGregorian:{year:2021,month:2,day:14}});
    expect(shawwal).toMatchObject({authority:"official",officialDayOneGregorian:{year:2021,month:5,day:13}});
    expect(resolvePakistanOfficialHijriDate({year:2021,month:2,day:13})?.hijri)
      .toEqual({year:1442,month:6,day:30});
    expect(resolvePakistanOfficialHijriDate({year:2021,month:5,day:13})?.hijri)
      .toEqual({year:1442,month:10,day:1});
  });

  it("anchors 2021 January to the final 15 December 2020 Pakistan committee decision", () => {
    const m=PAKISTAN_2021_HISTORIC_ANCHORS.find(x=>x.hijriYear===1442&&x.hijriMonth===5);
    expect(m).toMatchObject({
      authority:"official", sightingDecision:"not-sighted",
      officialDayOneGregorian:{year:2020,month:12,day:17},
      announcementGregorianDate:{year:2020,month:12,day:15},
      coverageEndGregorian:{year:2021,month:1,day:14},
    });
    expect(resolvePakistanOfficialHijriDate({year:2021,month:1,day:1})?.hijri)
      .toEqual({year:1442,month:5,day:16});
  });

  it("keeps archive-only dates labelled as historic reported dates, not fabricated sighting decisions", () => {
    for(const hMonth of [6,11]){
      const anchor=PAKISTAN_2021_HISTORIC_ANCHORS.find(x=>x.hijriYear===1442&&x.hijriMonth===hMonth);
      expect(anchor).toMatchObject({authority:"reported-official",verificationStatus:"reported"});
      expect(anchor?.sightingDecision).toBeUndefined();
      expect(anchor?.announcementGregorianDate).toBeUndefined();
    }
  });

  it("resolves every 2021 published lunar month first day and correct month length", () => {
    for(const [hy,hm,year,month,day,count] of starts){
      const date={year,month,day};
      expect(resolvePakistanOfficialHijriDate(date)?.hijri).toEqual({year:hy,month:hm,day:1});
      expect(resolvePakistanOfficialGregorianDate({year:hy,month:hm,day:1})).toEqual(date);
      expect(getReviewedPakistanHijriMonth(hy,hm)?.days).toHaveLength(count);
    }
  });

  it("has zero gaps, repeated Hijri dates or reverse lookup failures on all 365 days", () => {
    const from=gregorianToJDN(2021,1,1);
    const to=gregorianToJDN(2021,12,31);
    expect(to-from+1).toBe(365);
    let prev:{year:number;month:number;day:number}|null=null,monthChanges=0;
    for(let j=from;j<=to;j++){
      const gregorian=jdnToGregorian(j);
      const day=resolvePakistanOfficialHijriDate(gregorian);
      expect(day,`Pakistan historical day not found: ${JSON.stringify(gregorian)}`).not.toBeNull();
      expect(["official","reported-official"]).toContain(day?.authority);
      expect(resolvePakistanOfficialGregorianDate(day!.hijri)).toEqual(gregorian);
      if(prev&&day!.hijri.day===1)monthChanges++;
      else if(prev) {
        expect(day!.hijri.day).toBe(prev.day+1);
        expect(day!.hijri.month).toBe(prev.month);
        expect(day!.hijri.year).toBe(prev.year);
      }
      prev=day!.hijri;
    }
    expect(monthChanges).toBe(12);
  });

  it("shows Pakistan first Ramadan, Eid and Ashura dates on monthly and annual views", () => {
    expect(fromYear(1,1)).toMatchObject({hijri:{year:1442,month:5,day:16},hijriSource:"official"});
    expect(fromYear(14,4)).toMatchObject({hijri:{year:1442,month:9,day:1},hijriSource:"official"});
    expect(fromYear(23,4)).toMatchObject({hijri:{year:1442,month:9,day:10},hijriSource:"official"});
    expect(fromYear(13,5)).toMatchObject({hijri:{year:1442,month:10,day:1},hijriSource:"official"});
    expect(fromYear(12,7)).toMatchObject({hijri:{year:1442,month:12,day:1},hijriSource:"official"});
    expect(fromYear(21,7)).toMatchObject({hijri:{year:1442,month:12,day:10},hijriSource:"official"});
    expect(fromYear(10,8)).toMatchObject({hijri:{year:1443,month:1,day:1},hijriSource:"official"});
    expect(fromYear(19,8)).toMatchObject({hijri:{year:1443,month:1,day:10},hijriSource:"official"});
    expect(fromYear(8,10)).toMatchObject({hijri:{year:1443,month:3,day:1},hijriSource:"official"});
    expect(fromYear(19,10)).toMatchObject({hijri:{year:1443,month:3,day:12},hijriSource:"official"});
    const annual=buildCalendarYearModel({year:2021,content:"gregorian-hijri",language:"ur",weekStart:"monday",page:"a4-portrait",hijriPolicy:"pakistan"});
    const cells=annual.months.flatMap(m=>m.weeks).flatMap(w=>w.cells).filter(c=>c.inCurrentMonth);
    expect(cells).toHaveLength(365);
    expect(cells.every(c=>["official","reported-official"].includes(c.hijriSource||""))).toBe(true);
  });

  it("does not disturb the approved Pakistan Ramadan dates through 2026", () => {
    for(const [gYear,gMonth,gDay,hYear,hMonth,hDay] of [
      [2022,4,12,1443,9,10],
      [2023,4,1,1444,9,10],
      [2024,3,21,1445,9,10],
      [2025,3,11,1446,9,10],
      [2026,2,28,1447,9,10],
    ]){
      expect(resolvePakistanOfficialHijriDate({year:gYear,month:gMonth,day:gDay})?.hijri)
        .toEqual({year:hYear,month:hMonth,day:hDay});
    }
  });
});
