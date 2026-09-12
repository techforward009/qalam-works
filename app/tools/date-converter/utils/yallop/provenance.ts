import type { MonthStartPolicy, YallopAstronomySnapshot, YallopCriterionResult, YallopProvenance } from "./types";

export const YALLOP_ALGORITHM_VERSION = "phase-1.0.0";
export const ASTRONOMY_ENGINE_VERSION = "2.1.19";

// Validated against published records 117, 263, and 273 in Yallop TN69 Table 4.
export const YALLOP_PUBLISHED_REFERENCE_VALIDATION = "validated-table-4" as const;

export function buildYallopProvenance(snapshot: YallopAstronomySnapshot, criterion: YallopCriterionResult, policy: MonthStartPolicy): YallopProvenance {
  return {
    method: "yallop", algorithm: "BD-Yallop-NAO-TN69", algorithmVersion: YALLOP_ALGORITHM_VERSION,
    astronomyProvider: "Astronomy Engine", astronomyProviderVersion: ASTRONOMY_ENGINE_VERSION,
    policyId: policy.id, observer: snapshot.observer, conjunctionUtc: snapshot.conjunctionUtc,
    sunsetUtc: snapshot.sunsetUtc, moonsetUtc: snapshot.moonsetUtc, bestTimeUtc: snapshot.bestTimeUtc,
    arclDeg: snapshot.arclDeg, arcvDeg: snapshot.arcvDeg, widthArcMin: criterion.widthArcMin,
    q: criterion.q, visibilityClass: criterion.visibilityClass, sourceType: "astronomical-prediction",
  };
}
