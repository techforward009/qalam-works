import type { YallopObserver } from "../yallop/types";

export type PakistanCrescentCriterionInput = {
  altitudeDeg: number; widthArcMin: number; illuminationPercent: number; elongationDeg: number; lagMinutes: number;
};

export type PakistanCrescentCriterionResult = PakistanCrescentCriterionInput & {
  altitudePasses: boolean; widthPasses: boolean; illuminationOrElongationPasses: boolean; lagPasses: boolean; qualifies: boolean;
};

export type PakistanCrescentSnapshot = PakistanCrescentCriterionInput & {
  observer: YallopObserver; sunsetUtc: string; moonsetUtc: string;
};

export type PakistanCrescentPrediction =
  | { status: "evaluated"; observerLocalDate: string; evaluationWindowStartUtc: string; snapshot: PakistanCrescentSnapshot; criterion: PakistanCrescentCriterionResult; provenance: { method: string; criterionId: string; criterionVersion: string; astronomyProvider: string; sourceUrl: string; sourceType: "astronomical-prediction"; altitudeConvention: string; crescentWidthConvention: string; evaluationInstant: string; illuminationConvention: string } }
  | { status: "no-sunset" | "no-moonset" | "moonset-before-or-at-sunset"; observerLocalDate: string; evaluationWindowStartUtc: string; observer: YallopObserver };
