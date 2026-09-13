import type { PakistanCrescentCriterionInput, PakistanCrescentCriterionResult } from "./types";

export const PAKISTAN_FIVE_YEAR_THRESHOLDS = { altitudeDeg: 6.5, widthArcMin: 0.17, illuminationPercent: 0.8, elongationDeg: 9, lagMinutes: 38 } as const;

/** Published Ministry of Science & Technology five-year lunar calendar rule. */
export function evaluatePakistanFiveYearCriterion(input: PakistanCrescentCriterionInput): PakistanCrescentCriterionResult {
  const altitudePasses = input.altitudeDeg >= PAKISTAN_FIVE_YEAR_THRESHOLDS.altitudeDeg;
  const widthPasses = input.widthArcMin >= PAKISTAN_FIVE_YEAR_THRESHOLDS.widthArcMin;
  const illuminationOrElongationPasses = input.illuminationPercent >= PAKISTAN_FIVE_YEAR_THRESHOLDS.illuminationPercent || input.elongationDeg >= PAKISTAN_FIVE_YEAR_THRESHOLDS.elongationDeg;
  const lagPasses = input.lagMinutes >= PAKISTAN_FIVE_YEAR_THRESHOLDS.lagMinutes;
  return { ...input, altitudePasses, widthPasses, illuminationOrElongationPasses, lagPasses, qualifies: altitudePasses && widthPasses && illuminationOrElongationPasses && lagPasses };
}
