import type { DateParts } from "../dateEngine";
import { pakistanNationalReferenceObservers } from "../pakistan-crescent/nationalPrediction";
import { evaluateDateStudioYallopPrediction, type DateStudioYallopPrediction } from "./dateStudioPrediction";
import type { YallopObserver, YallopVisibilityClass } from "./types";

export type YallopNationalReferencePrediction = {
  locations: readonly { observer: YallopObserver; prediction: DateStudioYallopPrediction }[];
  anyAcceptedByPolicy: boolean;
  classCounts: Readonly<Record<YallopVisibilityClass, number>>;
};

/** A reference-location comparison, not a Pakistan-wide Yallop conclusion. */
export function evaluateYallopNationalReferencePrediction(
  gregorian: DateParts,
  evaluate = evaluateDateStudioYallopPrediction,
): YallopNationalReferencePrediction {
  const locations = pakistanNationalReferenceObservers().map((observer) => ({ observer, prediction: evaluate(gregorian, observer) }));
  const classCounts: Record<YallopVisibilityClass, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
  for (const { prediction } of locations) if (prediction.status === "evaluated") classCounts[prediction.criterion.visibilityClass]++;
  return { locations, anyAcceptedByPolicy: locations.some(({ prediction }) => prediction.status === "evaluated" && prediction.acceptedByPolicy), classCounts };
}
