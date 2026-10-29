import { describe, expect, it } from "vitest";
import { getPakistanThirtyDayMonthOutlook } from "../app/tools/crescent-visibility/utils/pakistanThirtyDayMonthOutlook";
import type { DisplayHijriResult } from "../app/tools/date-converter/utils/hijri-authority/displayHijriDate";
import type { DateParts } from "../app/tools/date-converter/utils/dateEngine";
import type { PakistanNationalPrediction } from "../app/tools/date-converter/utils/pakistan-crescent/nationalPrediction";
import type { OfficialHijriMonthAnchor } from "../app/tools/date-converter/utils/hijri-authority/types";

const evening: DateParts = { year: 2026, month: 11, day: 10 };
const observers = ["gilgit","peshawar","islamabad","lahore","muzaffarabad","quetta","karachi","jiwani"];
const national = (qualifies = false, incomplete = false): PakistanNationalPrediction => ({
  qualifies,
  locations: observers.map((id, i) => ({
    observer: { id, name:id,latitudeDeg:25,longitudeDeg:67,elevationMeters:0,timezone:"Asia/Karachi" },
    prediction: incomplete && i === 3
      ? { status: "no-sunset", observerLocalDate: "2026-11-10", evaluationWindowStartUtc: "" } as never
      : { status: "evaluated", criterion: { qualifies: qualifies && i === 0 } } as never,
  })),
});
const make = (day: number, month = 5, source: DisplayHijriResult["source"] = "official"): DisplayHijriResult => ({
  hijri: { year:1448,month,day },source,
});
const consistent = (d:DateParts) => d.day === 10 ? make(29)
  : d.day === 11 ? make(30,5,"scientific")
  : make(1,6,"scientific");
describe("Pakistan 30-day moon-month public forecast", () => {
  it("predicts 12 November only after the reviewed 29th and consistent 30th/first date", () => {
    const outlook = getPakistanThirtyDayMonthOutlook(evening,national(),null,consistent);
    expect(outlook).toEqual({dayThirty:{year:2026,month:11,day:11},dayOne:{year:2026,month:11,day:12},nextHijriYear:1448,nextHijriMonth:6});
  });
  it("never presents a forced day-one date on a successful or incomplete visibility test", () => {
    expect(getPakistanThirtyDayMonthOutlook(evening,national(true),null,consistent)).toBeNull();
    expect(getPakistanThirtyDayMonthOutlook(evening,national(false,true),null,consistent)).toBeNull();
  });
  it("never predicts from unsupported tabular dates, non-29th dates or contradictory future days", () => {
    expect(getPakistanThirtyDayMonthOutlook(evening,national(),null,()=>make(29,5,"tabular"))).toBeNull();
    expect(getPakistanThirtyDayMonthOutlook(evening,national(),null,()=>make(28))).toBeNull();
    expect(getPakistanThirtyDayMonthOutlook(evening,national(),null,d=>d.day===12?make(2,6):consistent(d))).toBeNull();
  });
  it("never contradicts an official sighted announcement", () => {
    expect(getPakistanThirtyDayMonthOutlook(evening,national(),{sightingDecision:"sighted"} as OfficialHijriMonthAnchor,consistent)).toBeNull();
  });
});
