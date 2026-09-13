import { evaluateYallopAstronomy } from "./astronomyAdapter";
import type { DateParts } from "../dateEngine";
import type { YallopEvaluation, YallopObserver } from "./types";

export type DateStudioYallopPrediction = YallopEvaluation & {
  /** ISO civil date at the observer, used only to identify the evaluated evening. */
  observerLocalDate: string;
  /** UTC instant at the beginning of that observer-local civil date. */
  evaluationWindowStartUtc: string;
};

function utcOffsetMinutesAt(instant: Date, timezone: string): number {
  const zoneName = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "longOffset",
  }).formatToParts(instant).find(part => part.type === "timeZoneName")?.value;
  if (zoneName === "GMT") return 0;
  const match = zoneName?.match(/^GMT([+-])(\d{2}):(\d{2})$/);
  if (!match) throw new Error(`Could not determine UTC offset for ${timezone}`);
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === "+" ? minutes : -minutes;
}

/**
 * Resolves a civil date at an IANA observer timezone to its local-midnight UTC
 * instant. It never consults the browser's local timezone.
 */
export function observerLocalMidnightUtc(gregorian: DateParts, timezone: string): string {
  const civilMidnightAsUtc = Date.UTC(gregorian.year, gregorian.month - 1, gregorian.day);
  let instant = civilMidnightAsUtc;
  // Re-read the offset after conversion so DST offset changes around midnight
  // are resolved deterministically from the observer's IANA timezone.
  for (let i = 0; i < 3; i++) instant = civilMidnightAsUtc - utcOffsetMinutesAt(new Date(instant), timezone) * 60_000;
  return new Date(instant).toISOString();
}

/**
 * Date Studio adapter: evaluates the selected Gregorian date's local evening.
 * It deliberately leaves the deterministic Date Converter result untouched.
 */
export function evaluateDateStudioYallopPrediction(
  gregorian: DateParts,
  observer: YallopObserver,
): DateStudioYallopPrediction {
  const date = `${String(gregorian.year).padStart(4, "0")}-${String(gregorian.month).padStart(2, "0")}-${String(gregorian.day).padStart(2, "0")}`;
  const evaluationWindowStartUtc = observerLocalMidnightUtc(gregorian, observer.timezone);
  return { ...evaluateYallopAstronomy({ observer, evaluationWindowStartUtc }), observerLocalDate: date, evaluationWindowStartUtc };
}
