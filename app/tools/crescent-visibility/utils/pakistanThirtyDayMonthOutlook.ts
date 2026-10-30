import { gregorianToJDN, jdnToGregorian, type DateParts } from "../../date-converter/utils/dateEngine";
import { resolveDisplayHijriDate, type DisplayHijriResult } from "../../date-converter/utils/hijri-authority/displayHijriDate";
import type { OfficialHijriMonthAnchor } from "../../date-converter/utils/hijri-authority/types";
import type { PakistanNationalPrediction } from "../../date-converter/utils/pakistan-crescent/nationalPrediction";

/** Forecast only: require a supported 29th, a 30th day, and an independently resolved next-month day one. */
export function getPakistanThirtyDayMonthOutlook(
  evening: DateParts,
  pakistan: PakistanNationalPrediction,
  decision: OfficialHijriMonthAnchor | null,
  resolve: (day: DateParts, policy: "pakistan") => DisplayHijriResult = resolveDisplayHijriDate,
): { dayThirty: DateParts; dayOne: DateParts; nextHijriYear: number; nextHijriMonth: number } | null {
  if (decision?.sightingDecision === "sighted" || pakistan.locations.length !== 8) return null;
  // Incomplete or absent astronomy must not create a confident "not sighted" prediction.
  if (pakistan.locations.some(({ prediction }) =>
    prediction.status !== "evaluated" && prediction.status !== "moonset-before-or-at-sunset"
  ) || pakistan.locations.some(({ prediction }) =>
    prediction.status === "evaluated" && prediction.criterion.qualifies
  )) return null;

  const current = resolve(evening, "pakistan");
  if (current.source === "tabular" || current.hijri.day !== 29) return null;
  const jd = gregorianToJDN(evening.year, evening.month, evening.day);
  const dayThirty = jdnToGregorian(jd + 1);
  const dayOne = jdnToGregorian(jd + 2);
  if (dayOne.year > 2100) return null;
  const thirty = resolve(dayThirty, "pakistan");
  const first = resolve(dayOne, "pakistan");
  const nextHijriYear = current.hijri.month === 12 ? current.hijri.year + 1 : current.hijri.year;
  const nextHijriMonth = current.hijri.month === 12 ? 1 : current.hijri.month + 1;
  if (thirty.source === "tabular" || thirty.hijri.day !== 30
    || thirty.hijri.year !== current.hijri.year || thirty.hijri.month !== current.hijri.month
    || first.source === "tabular" || first.hijri.day !== 1
    || first.hijri.year !== nextHijriYear || first.hijri.month !== nextHijriMonth) return null;

  return { dayThirty, dayOne, nextHijriYear, nextHijriMonth };
}
