import { describe, expect, it } from "vitest";
import { evaluatePakistanFiveYearCriterion } from "../app/tools/date-converter/utils/pakistan-crescent/criterion";
import { calculateCrescentWidth } from "../app/tools/date-converter/utils/astronomy/crescentWidth";
import { evaluateYallopCriterion } from "../app/tools/date-converter/utils/yallop/yallopCriterion";
import { phaseFractionToPercent } from "../app/tools/date-converter/utils/pakistan-crescent/dateStudioPrediction";

const passes = { altitudeDeg: 6.5, widthArcMin: 0.17, illuminationPercent: 0.8, elongationDeg: 0, lagMinutes: 38 };

describe("Pakistan 5-Year Calendar Criterion", () => {
  it("uses inclusive published threshold boundaries", () => expect(evaluatePakistanFiveYearCriterion(passes).qualifies).toBe(true));
  it("requires altitude", () => expect(evaluatePakistanFiveYearCriterion({ ...passes, altitudeDeg: 6.499 }).qualifies).toBe(false));
  it("requires crescent width", () => expect(evaluatePakistanFiveYearCriterion({ ...passes, widthArcMin: 0.169 }).qualifies).toBe(false));
  it("allows illumination or elongation", () => {
    expect(evaluatePakistanFiveYearCriterion({ ...passes, illuminationPercent: 0.799, elongationDeg: 9 }).qualifies).toBe(true);
    expect(evaluatePakistanFiveYearCriterion({ ...passes, illuminationPercent: 0.799, elongationDeg: 8.999 }).qualifies).toBe(false);
  });
  it("requires the 38-minute lag", () => expect(evaluatePakistanFiveYearCriterion({ ...passes, lagMinutes: 37.999 }).qualifies).toBe(false));
  it("uses the exact shared Qalam/Yallop width primitive", () => {
    const input = { arclDeg: 12, arcvDeg: 5, moonGeocentricAltitudeDeg: 4, horizontalParallaxDeg: 1 };
    const shared = calculateCrescentWidth(input), yallop = evaluateYallopCriterion(input);
    expect(shared.semidiameterDeg).toBe(yallop.semidiameterDeg);
    expect(shared.topocentricSemidiameterDeg).toBe(yallop.topocentricSemidiameterDeg);
    expect(shared.widthArcMin).toBe(yallop.widthArcMin);
  });
  it("converts Astronomy Engine phase fractions to percent", () => {
    expect(phaseFractionToPercent(0.008)).toBe(0.8);
    expect(phaseFractionToPercent(0)).toBe(0);
    expect(phaseFractionToPercent(1)).toBe(100);
  });
});
