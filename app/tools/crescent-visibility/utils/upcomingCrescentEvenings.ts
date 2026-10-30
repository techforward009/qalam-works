import { gregorianToJDN, isoDate, jdnToGregorian, type DateParts } from "../../date-converter/utils/dateEngine";
import { resolveDisplayHijriDate } from "../../date-converter/utils/hijri-authority/displayHijriDate";

/** The evening on day 29 of the preceding Hijri month, NOT a confirmed sighting. */
export type UpcomingCrescentEvening = {
  evening: DateParts;
  dateIso: string;
  targetHijriMonth: number;
  targetHijriYear: number;
  /** The 29th-day date is verified or scientifically predicted; sighting itself is not official. */
  dateSource: "official" | "reported-official" | "scientific";
};

function followingHijriMonth(year: number, month: number) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

/**
 * Select upcoming 29th-of-month observation evenings from the Pakistan-first
 * calendar's existing verified dates and bounded scientific month forecasts.
 * Never use a tabular fallback to advertise an apparently precise sighting date.
 * The limit also bounds the amount of astronomical work on the client.
 */
export function getUpcomingPakistanCrescentEvenings(today: DateParts, count = 6): UpcomingCrescentEvening[] {
  const requestedCount = Number.isFinite(count) ? Math.min(6, Math.max(0, Math.trunc(count))) : 0;
  if (!requestedCount) return [];
  const todayJdn = gregorianToJDN(today.year, today.month, today.day);
  const results: UpcomingCrescentEvening[] = [];
  const seen = new Set<string>();
  for (let offset = 0; offset < 240 && results.length < requestedCount; offset++) {
    const evening = jdnToGregorian(todayJdn + offset);
    if (evening.year < 1900 || evening.year > 2100) break;
    const resolved = resolveDisplayHijriDate(evening, "pakistan");
    if (resolved.hijri.day !== 29 || resolved.source === "tabular") continue;
    const next = followingHijriMonth(resolved.hijri.year, resolved.hijri.month);
    const monthKey = `${next.year}-${next.month}`;
    if (seen.has(monthKey)) continue;
    seen.add(monthKey);
    results.push({
      evening,
      dateIso: isoDate(evening),
      targetHijriMonth: next.month,
      targetHijriYear: next.year,
      dateSource: resolved.source,
    });
  }
  return results;
}
