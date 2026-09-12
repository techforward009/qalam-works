import type { YallopCriterionInput, YallopCriterionResult, YallopVisibilityClass } from "./types";

const radians = (degrees: number) => degrees * Math.PI / 180;

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
  const semidiameterDeg = 0.27245 * input.horizontalParallaxDeg;
  const topocentricSemidiameterDeg = semidiameterDeg * (1 + Math.sin(radians(input.moonGeocentricAltitudeDeg)) * Math.sin(radians(input.horizontalParallaxDeg)));
  const widthArcMin = 60 * topocentricSemidiameterDeg * (1 - Math.cos(radians(input.arclDeg)));
  const threshold = 11.8371 - 6.3226 * widthArcMin + 0.7319 * widthArcMin ** 2 - 0.1018 * widthArcMin ** 3;
  const q = (input.arcvDeg - threshold) / 10;
  return { ...input, semidiameterDeg, topocentricSemidiameterDeg, widthArcMin, q, visibilityClass: classifyYallop(q) };
}
