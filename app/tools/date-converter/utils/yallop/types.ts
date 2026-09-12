export type HijriMethod = "qalam-tabular" | "yallop";

export type YallopVisibilityClass = "A" | "B" | "C" | "D" | "E" | "F";

export interface YallopObserver {
  id: string;
  name: string;
  latitudeDeg: number;
  longitudeDeg: number;
  elevationMeters: number;
  timezone: string;
}

export interface YallopAstronomyInput {
  observer: YallopObserver;
  evaluationWindowStartUtc: string;
  searchLimitDays?: number;
}

export interface YallopAstronomySnapshot {
  observer: YallopObserver;
  conjunctionUtc: string;
  sunsetUtc: string;
  moonsetUtc: string;
  bestTimeUtc: string;
  arclDeg: number;
  arcvDeg: number;
  dazDeg: number;
  moonGeocentricAltitudeDeg: number;
  horizontalParallaxDeg: number;
}

export interface YallopCriterionInput {
  arclDeg: number;
  arcvDeg: number;
  moonGeocentricAltitudeDeg: number;
  horizontalParallaxDeg: number;
}

export interface YallopCriterionResult extends YallopCriterionInput {
  semidiameterDeg: number;
  topocentricSemidiameterDeg: number;
  widthArcMin: number;
  q: number;
  visibilityClass: YallopVisibilityClass;
}

export interface MonthStartPolicy {
  id: string;
  name: string;
  acceptedClasses: readonly YallopVisibilityClass[];
  accepts(result: YallopCriterionResult): boolean;
}

export interface YallopProvenance {
  method: "yallop";
  algorithm: "BD-Yallop-NAO-TN69";
  algorithmVersion: string;
  astronomyProvider: "Astronomy Engine";
  astronomyProviderVersion: string;
  policyId: string;
  observer: YallopObserver;
  conjunctionUtc: string;
  sunsetUtc: string;
  moonsetUtc: string;
  bestTimeUtc: string;
  arclDeg: number;
  arcvDeg: number;
  widthArcMin: number;
  q: number;
  visibilityClass: YallopVisibilityClass;
  sourceType: "astronomical-prediction";
}

export type YallopNonEvaluationStatus =
  | "moonset-before-or-at-sunset"
  | "conjunction-after-evaluation-window"
  | "no-sunset"
  | "no-moonset"
  | "unsupported-date"
  | "unsupported-latitude";

export type YallopEvaluation =
  | { status: "evaluated"; snapshot: YallopAstronomySnapshot; criterion: YallopCriterionResult; acceptedByPolicy: boolean; provenance: YallopProvenance }
  | { status: YallopNonEvaluationStatus; observer: YallopObserver; detail: string };
