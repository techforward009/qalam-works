import type { YallopCriterionInput, YallopCriterionResult, YallopVisibilityClass } from "./types";
import { calculateCrescentWidth } from "../astronomy/crescentWidth";

export function classifyYallop(q: number): YallopVisibilityClass {
  if (q > 0.216) return "A";
  if (q > -0.014) return "B";
  if (q > -0.160) return "C";
  if (q > -0.232) return "D";
  if (q > -0.293) return "E";
  return "F";
}

export function evaluateYallopCriterion(input: YallopCriterionInput): YallopCriterionResult {
  for (const [name, value] of Object.entries(input)) if (!Number.isFinite(value)) throw new Error(`${name} must be finite`);
  const { semidiameterDeg, topocentricSemidiameterDeg, widthArcMin } = calculateCrescentWidth(input);
  const threshold = 11.8371 - 6.3226 * widthArcMin + 0.7319 * widthArcMin ** 2 - 0.1018 * widthArcMin ** 3;
  const q = (input.arcvDeg - threshold) / 10;
  return { ...input, semidiameterDeg, topocentricSemidiameterDeg, widthArcMin, q, visibilityClass: classifyYallop(q) };
}
