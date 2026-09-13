const radians = (degrees: number) => degrees * Math.PI / 180;

export type CrescentWidthInput = {
  arclDeg: number;
  moonGeocentricAltitudeDeg: number;
  horizontalParallaxDeg: number;
};

/**
 * Qalam's validated crescent-width computation. Inputs are geometric,
 * geocentric quantities; no atmospheric-refraction correction is applied here.
 */
export function calculateCrescentWidth(input: CrescentWidthInput) {
  const semidiameterDeg = 0.27245 * input.horizontalParallaxDeg;
  const topocentricSemidiameterDeg = semidiameterDeg * (1 + Math.sin(radians(input.moonGeocentricAltitudeDeg)) * Math.sin(radians(input.horizontalParallaxDeg)));
  const widthArcMin = 60 * topocentricSemidiameterDeg * (1 - Math.cos(radians(input.arclDeg)));
  return { semidiameterDeg, topocentricSemidiameterDeg, widthArcMin };
}
