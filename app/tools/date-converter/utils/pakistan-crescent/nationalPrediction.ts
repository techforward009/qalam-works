import type { DateParts } from "../dateEngine";
import { yallopObserver } from "../yallop/observerLocations";
import type { YallopObserver } from "../yallop/types";
import { evaluateDateStudioPakistanCrescentPrediction } from "./dateStudioPrediction";
import type { PakistanCrescentPrediction } from "./types";

/** The eight locations processed by the published Pakistan 5-Year Calendar criterion. */
export const PAKISTAN_NATIONAL_REFERENCE_LOCATION_IDS = [
  "gilgit", "peshawar", "islamabad", "lahore", "muzaffarabad", "quetta", "karachi", "jiwani",
] as const;

export const pakistanNationalReferenceObservers = (): readonly YallopObserver[] =>
  PAKISTAN_NATIONAL_REFERENCE_LOCATION_IDS.map((id) => {
    const observer = yallopObserver(id);
    if (!observer) throw new Error(`Missing Pakistan national reference observer: ${id}`);
    return observer;
  });

export type PakistanNationalPrediction = {
  locations: readonly { observer: YallopObserver; prediction: PakistanCrescentPrediction }[];
  qualifies: boolean;
};

/** National semantics are any-location qualification, never an average or majority vote. */
export function evaluatePakistanNationalCrescentPrediction(
  gregorian: DateParts,
  evaluate = evaluateDateStudioPakistanCrescentPrediction,
): PakistanNationalPrediction {
  const locations = pakistanNationalReferenceObservers().map((observer) => ({ observer, prediction: evaluate(gregorian, observer) }));
  return { locations, qualifies: locations.some(({ prediction }) => prediction.status === "evaluated" && prediction.criterion.qualifies) };
}
