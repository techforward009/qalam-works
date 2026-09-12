import { describe, expect, it } from "vitest";
import { evaluateYallopAstronomy } from "../app/tools/date-converter/utils/yallop/astronomyAdapter";
import { evaluateYallopCriterion } from "../app/tools/date-converter/utils/yallop/yallopCriterion";

/**
 * Published reference: B. D. Yallop, NAO Technical Note 69 (1997),
 * Table 4, records 117, 273, and 263. Table columns 9, 10, and 13–16
 * give ARCL, ARCV, lag, horizontal parallax, W', and q at Yallop best time.
 */
const publishedRecords = [
  { record: 117, date: "1971-03-27", latitudeDeg: 51.0, longitudeDeg: 0.0, arclDeg: 14.7, arcvDeg: 14.4, lagMinutes: 90.1, parallaxArcMin: 61.0, widthArcMin: 0.54, q: 0.578, visibilityClass: "A" },
  { record: 273, date: "1984-10-25", latitudeDeg: 15.6, longitudeDeg: 35.6, arclDeg: 16.0, arcvDeg: 13.6, lagMinutes: 55.4, parallaxArcMin: 60.5, widthArcMin: 0.64, q: 0.553, visibilityClass: "A" },
  { record: 263, date: "1984-04-03", latitudeDeg: 15.6, longitudeDeg: 35.6, arclDeg: 24.5, arcvDeg: 24.5, lagMinutes: 101.1, parallaxArcMin: 55.1, widthArcMin: 1.4, q: 2.016, visibilityClass: "A" },
] as const;

const publishedClassificationRecords = [
  { record: 199, arclDeg: 11.1, arcvDeg: 10.2, parallaxArcMin: 54.0, widthArcMin: 0.28, q: 0.003, visibilityClass: "B" },
  { record: 36, arclDeg: 13.5, arcvDeg: 9.1, parallaxArcMin: 56.4, widthArcMin: 0.42, q: -0.018, visibilityClass: "C" },
  { record: 44, arclDeg: 9.3, arcvDeg: 8.9, parallaxArcMin: 57.1, widthArcMin: 0.21, q: -0.163, visibilityClass: "D" },
  { record: 271, arclDeg: 8.4, arcvDeg: 8.2, parallaxArcMin: 61.4, widthArcMin: 0.18, q: -0.248, visibilityClass: "E" },
  { record: 275, arclDeg: 9.2, arcvDeg: 7.6, parallaxArcMin: 59.5, widthArcMin: 0.21, q: -0.296, visibilityClass: "F" },
] as const;

describe("published Yallop Table 4 criterion references", () => {
  it.each(publishedRecords)("reproduces W' and q for record $record from published rounded inputs", record => {
    // At best time Yallop defines 4h = 5s and ARCV = h+s, hence h = 5 ARCV / 9.
    const result = evaluateYallopCriterion({
      arclDeg: record.arclDeg,
      arcvDeg: record.arcvDeg,
      moonGeocentricAltitudeDeg: 5 * record.arcvDeg / 9,
      horizontalParallaxDeg: record.parallaxArcMin / 60,
    });

    // W' is printed to 0.01 arcmin except record 263 (0.1 arcmin); q is printed to 0.001.
    const widthToleranceArcMin = record.record === 263 ? 0.05 : 0.01;
    expect(Math.abs(result.widthArcMin - record.widthArcMin)).toBeLessThanOrEqual(widthToleranceArcMin);
    expect(Math.abs(result.q - record.q)).toBeLessThanOrEqual(0.004);
    expect(result.visibilityClass).toBe(record.visibilityClass);
  });

  it.each(publishedClassificationRecords)("reproduces published class $visibilityClass for record $record", record => {
    const result = evaluateYallopCriterion({
      arclDeg: record.arclDeg,
      arcvDeg: record.arcvDeg,
      moonGeocentricAltitudeDeg: 5 * record.arcvDeg / 9,
      horizontalParallaxDeg: record.parallaxArcMin / 60,
    });

    expect(Math.abs(result.widthArcMin - record.widthArcMin)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(result.q - record.q)).toBeLessThanOrEqual(0.005);
    expect(result.visibilityClass).toBe(record.visibilityClass);
  });
});

describe("Astronomy Engine against published Yallop Table 4 records", () => {
  it.each(publishedRecords)("reproduces record $record at Yallop best time", record => {
    const result = evaluateYallopAstronomy({
      observer: {
        id: `yallop-table-4-${record.record}`,
        name: `Yallop Table 4 record ${record.record}`,
        latitudeDeg: record.latitudeDeg,
        longitudeDeg: record.longitudeDeg,
        elevationMeters: 0,
        timezone: "UTC",
      },
      evaluationWindowStartUtc: `${record.date}T00:00:00.000Z`,
    });

    expect(result.status).toBe("evaluated");
    if (result.status !== "evaluated") return;

    const lagMinutes = (Date.parse(result.snapshot.moonsetUtc) - Date.parse(result.snapshot.sunsetUtc)) / 60_000;
    expect(Math.abs(lagMinutes - record.lagMinutes)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(result.snapshot.arclDeg - record.arclDeg)).toBeLessThanOrEqual(0.06);
    expect(Math.abs(result.snapshot.arcvDeg - record.arcvDeg)).toBeLessThanOrEqual(0.06);
    expect(Math.abs(result.snapshot.horizontalParallaxDeg * 60 - record.parallaxArcMin)).toBeLessThanOrEqual(0.06);
    expect(Math.abs(result.criterion.widthArcMin - record.widthArcMin)).toBeLessThanOrEqual(0.055);
    expect(Math.abs(result.criterion.q - record.q)).toBeLessThanOrEqual(0.004);
    expect(result.criterion.visibilityClass).toBe(record.visibilityClass);
  });
});
