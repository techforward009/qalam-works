
import {describe,it,expect} from "vitest";
import {buildDateProfile,formatGregorianDate,formatHijriDate} from "../app/tools/date-converter/utils/dateProfile";

describe("Date Studio final profile",()=>{
 it("1976 profile values",()=>{
  const p=buildDateProfile({year:1976,month:11,day:28});
  expect(p.hijri.year).toBe(1396);
  expect(p.solar).toBeDefined();
  expect(p.weekday.en).toBe("Sunday");
  expect(p.leapYear).toBe(true);
 });
 it("presents verified Pakistan dates separately from calculated tabular dates",()=> {
  const profile = buildDateProfile({year:2026,month:2,day:28});
  expect(profile.pakistanOfficialHijri).toMatchObject({hijri:{year:1447,month:9,day:10},authority:"official"});
  expect(profile.hijri).toEqual({year:1447,month:9,day:12});
 });
 it("age and future",()=>{
  expect(buildDateProfile({year:2099,month:1,day:1}).futureState).toBe("future");
 });
 it("formats metadata inputs",()=>{
  expect(formatGregorianDate({year:1976,month:11,day:28})).toContain("November");
  expect(formatHijriDate({year:1396,month:12,day:7})).toContain("Dhu");
 });
});
