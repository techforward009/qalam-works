import { convert, gregorianToJDN, jdnToGregorian, type DateParts } from "../dateEngine";
import { PAKISTAN_OFFICIAL_HIJRI_ANCHORS } from "./pakistanOfficialAnchors";
import { evaluatePakistanNationalCrescentPrediction } from "../pakistan-crescent/nationalPrediction";
import type { OfficialHijriMonthAnchor } from "./types";

/**
 * Forward-looking Pakistan month starts use the same eight-location national
 * crescent criterion as Date Studio. They never become official records.
 * Keep older calendar fixtures unchanged: scientific fallback begins after
 * the last verified day of Jumada al-Awwal 1448 (10 November 2026).
 */
const FIRST_FORECAST_DAY = gregorianToJDN(2026, 11, 11);
const MAX_FORECAST_MONTHS = 24;
type MonthStart = { start: number; year: number; month: number };
const monthCache = new Map<string, MonthStart[]>();
const eveningCache = new Map<number, boolean | null>();

function nextMonth(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

function forecastableAnchor(anchor: OfficialHijriMonthAnchor): boolean {
  return anchor.jurisdiction === "PK"
    && ((anchor.authority === "official" && anchor.verificationStatus === "verified")
      || (anchor.authority === "reported-official" && anchor.verificationStatus === "reported"));
}

function crescentQualifiesOnEvening(dayJdn: number): boolean | null {
  if (eveningCache.has(dayJdn)) return eveningCache.get(dayJdn)!;
  const result = evaluatePakistanNationalCrescentPrediction(jdnToGregorian(dayJdn));
  // Missing astronomical evidence is not evidence that the crescent failed.
  const qualifies = result.locations.every(({ prediction }) =>
    prediction.status === "evaluated" || prediction.status === "moonset-before-or-at-sunset")
    ? result.qualifies : null;
  eveningCache.set(dayJdn, qualifies);
  return qualifies;
}

/** No official authority is ever inferred; returns only a scientific prediction. */
export function predictPakistanHijriDate(gregorian: DateParts): DateParts | null {
  const requested = gregorianToJDN(gregorian.year, gregorian.month, gregorian.day);
  if (requested < FIRST_FORECAST_DAY) return null;

  const anchor = PAKISTAN_OFFICIAL_HIJRI_ANCHORS.reduce<OfficialHijriMonthAnchor | null>((latest, item) => {
    if (!forecastableAnchor(item)) return latest;
    const start = gregorianToJDN(item.officialDayOneGregorian.year, item.officialDayOneGregorian.month, item.officialDayOneGregorian.day);
    if (start > requested) return latest;
    if (!latest) return item;
    const previous = gregorianToJDN(latest.officialDayOneGregorian.year, latest.officialDayOneGregorian.month, latest.officialDayOneGregorian.day);
    return start > previous ? item : latest;
  }, null);
  if (!anchor) return null;

  const officialStart = gregorianToJDN(anchor.officialDayOneGregorian.year, anchor.officialDayOneGregorian.month, anchor.officialDayOneGregorian.day);
  const officialEnd = gregorianToJDN(anchor.coverageEndGregorian.year, anchor.coverageEndGregorian.month, anchor.coverageEndGregorian.day);
  if (requested <= officialEnd) return null; // The official resolver owns these days.
  if (requested - officialStart > MAX_FORECAST_MONTHS * 30) return null;

  let starts = monthCache.get(anchor.id);
  if (!starts) {
    starts = [{ start: officialStart, year: anchor.hijriYear, month: anchor.hijriMonth }];
    monthCache.set(anchor.id, starts);
  }

  for (let i = 0; i < MAX_FORECAST_MONTHS; i++) {
    const current = starts[i];
    if (!current) return null;
    let following = starts[i + 1];
    if (!following) {
      // Day 29 is start + 28; a favorable evening gives a 29-day month.
      const qualifies = crescentQualifiesOnEvening(current.start + 28);
      if (qualifies === null) return null;
      const next = nextMonth(current.year, current.month);
      following = { start: current.start + (qualifies ? 29 : 30), ...next };
      starts.push(following);
    }
    if (requested < following.start) {
      const day = requested - current.start + 1;
      return day >= 1 && day <= 30 ? { year: current.year, month: current.month, day } : null;
    }
  }
  return null; // Bounded forecasting; older pure tabular view remains available.
}

/** Reverse lookup for unverified Pakistan dates; never claims an official match. */
export function predictPakistanGregorianDate(hijri: DateParts): DateParts | null {
  if (!Number.isInteger(hijri.year) || !Number.isInteger(hijri.month) || !Number.isInteger(hijri.day)
    || hijri.month < 1 || hijri.month > 12 || hijri.day < 1 || hijri.day > 30) return null;
  const approximate = convert("hijri", hijri).gregorian;
  const center = gregorianToJDN(approximate.year, approximate.month, approximate.day);
  // The tabular conversion is only a search starting point, never the result.
  for (let offset = -16; offset <= 16; offset++) {
    const candidate = jdnToGregorian(center + offset);
    const prediction = predictPakistanHijriDate(candidate);
    if (prediction?.year === hijri.year && prediction.month === hijri.month && prediction.day === hijri.day) {
      return candidate;
    }
  }
  return null;
}
