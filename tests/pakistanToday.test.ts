import { afterEach, expect, it, vi } from "vitest";
import { pakistanDate } from "../app/lib/pakistanDate";
import TodayPage from "../app/today/page";
import sitemap from "../app/sitemap";
import { calendarYear, hijriYear } from "../app/lib/toolCatalog";
const redirect=vi.hoisted(()=>vi.fn((url:string)=>{throw new Error(url)}));
vi.mock("next/navigation",()=>({redirect}));
afterEach(()=>{vi.useRealTimers();vi.clearAllMocks()});
it.each([
 ["2026-10-20T18:59:59Z","2026-10-20",2026],
 ["2026-10-20T19:00:00Z","2026-10-21",2026],
 ["2026-12-31T19:00:00Z","2027-01-01",2027],
 ["2028-02-28T19:00:00Z","2028-02-29",2028],
])("resolves Pakistan's midnight independently of host timezone (%s)",(utc,iso,year)=>{
 expect(pakistanDate(new Date(utc))).toEqual({iso,year});
});
it("recomputes /today per request rather than freezing the build date",()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date("2026-10-20T18:59:59Z"));
 expect(()=>TodayPage()).toThrow("/date/2026-10-20");
 vi.setSystemTime(new Date("2026-10-20T19:00:00Z"));
 expect(()=>TodayPage()).toThrow("/date/2026-10-21");
});
it("publishes the today and current-year calendar entry points",()=>{
 expect(sitemap().map(entry=>entry.url)).toEqual(expect.arrayContaining([
  "https://www.qalamworks.com/today",`https://www.qalamworks.com/calendar/${calendarYear}`,`https://www.qalamworks.com/hijri/${hijriYear}`,
 ]));
});
