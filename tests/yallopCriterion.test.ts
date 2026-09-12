import { describe, expect, it } from "vitest";
import { Body, GeoVector, HelioVector, SiderealTime } from "astronomy-engine";
import { convert } from "../app/tools/date-converter/utils/dateEngine";
import { calculateBestTimeUtc, evaluateYallopAstronomy, geometricGeocentricVector, geocentricHorizontalFromRaDec } from "../app/tools/date-converter/utils/yallop/astronomyAdapter";
import { PAKISTAN_YALLOP_OBSERVERS, validateYallopObserver, yallopObserver } from "../app/tools/date-converter/utils/yallop/observerLocations";
import { QALAM_YALLOP_NAKED_EYE_AB_V1 } from "../app/tools/date-converter/utils/yallop/monthStartPolicy";
import { classifyYallop, evaluateYallopCriterion } from "../app/tools/date-converter/utils/yallop/yallopCriterion";

describe("Yallop pure criterion", () => {
  it.each([
    [0.2160001, "A"], [0.216, "B"], [-0.013999, "B"], [-0.014, "C"],
    [-0.159999, "C"], [-0.160, "D"], [-0.231999, "D"], [-0.232, "E"],
    [-0.292999, "E"], [-0.293, "F"],
  ] as const)("classifies q=%s as %s", (q, expected) => expect(classifyYallop(q)).toBe(expected));

  it("uses radians and returns topocentric crescent width in arcminutes", () => {
    const input = { arclDeg: 60, arcvDeg: 10, moonGeocentricAltitudeDeg: 30, horizontalParallaxDeg: 1 };
    const result = evaluateYallopCriterion(input);
    const sd = 0.27245;
    const sdPrime = sd * (1 + Math.sin(Math.PI / 6) * Math.sin(Math.PI / 180));
    expect(result.semidiameterDeg).toBeCloseTo(sd, 12);
    expect(result.topocentricSemidiameterDeg).toBeCloseTo(sdPrime, 12);
    expect(result.widthArcMin).toBeCloseTo(sdPrime * (1 - Math.cos(Math.PI / 3)) * 60, 12);
  });

  it("uses widthArcMin directly in the q polynomial", () => {
    const result = evaluateYallopCriterion({ arclDeg: 45, arcvDeg: 8.5, moonGeocentricAltitudeDeg: 12, horizontalParallaxDeg: 0.95 });
    const w = result.widthArcMin;
    expect(result.q).toBeCloseTo((8.5 - (11.8371 - 6.3226 * w + 0.7319 * w ** 2 - 0.1018 * w ** 3)) / 10, 14);
  });

  it("keeps the Qalam A/B policy separate from the criterion", () => {
    for (const visibilityClass of ["A", "B"] as const) expect(QALAM_YALLOP_NAKED_EYE_AB_V1.accepts({ visibilityClass } as never)).toBe(true);
    for (const visibilityClass of ["C", "D", "E", "F"] as const) expect(QALAM_YALLOP_NAKED_EYE_AB_V1.accepts({ visibilityClass } as never)).toBe(false);
  });
});

describe("Yallop observers and astronomy adapter", () => {
  it("provides and validates the eleven Pakistan observer presets", () => {
    expect(PAKISTAN_YALLOP_OBSERVERS).toHaveLength(11);
    for (const observer of PAKISTAN_YALLOP_OBSERVERS) expect(() => validateYallopObserver(observer)).not.toThrow();
    expect(new Set(PAKISTAN_YALLOP_OBSERVERS.map(observer => observer.id)).size).toBe(11);
    expect(() => validateYallopObserver({ ...PAKISTAN_YALLOP_OBSERVERS[0], latitudeDeg: 91 })).toThrow("latitude");
    expect(() => validateYallopObserver({ ...PAKISTAN_YALLOP_OBSERVERS[0], longitudeDeg: 181 })).toThrow("longitude");
    expect(() => validateYallopObserver({ ...PAKISTAN_YALLOP_OBSERVERS[0], elevationMeters: Number.NaN })).toThrow("elevation");
    expect(() => validateYallopObserver({ ...PAKISTAN_YALLOP_OBSERVERS[0], timezone: "Invalid/Zone" })).toThrow("IANA");
  });

  it("matches an independent meridian/zenith spherical-coordinate vector", () => {
    const date = new Date("2026-01-01T00:00:00.000Z");
    const observer = { ...PAKISTAN_YALLOP_OBSERVERS[0], latitudeDeg: 30, longitudeDeg: 0 };
    const coordinates = geocentricHorizontalFromRaDec(date, observer, SiderealTime(date), 30);
    expect(coordinates.altitudeDeg).toBeCloseTo(90, 10);
  });

  it("matches a fixed non-trivial geocentric horizontal reference vector", () => {
    const date = new Date("2026-01-01T00:00:00.000Z");
    const observer = { ...PAKISTAN_YALLOP_OBSERVERS[0], latitudeDeg: 30, longitudeDeg: 60 };
    const coordinates = geocentricHorizontalFromRaDec(date, observer, SiderealTime(date), 20);
    expect(coordinates.altitudeDeg).toBeCloseTo(35.30360067802465, 10);
    expect(coordinates.azimuthDeg).toBeCloseTo(274.3059663486895, 10);
  });

  it("uses the same no-aberration, no-light-time geocentric convention for Sun and Moon", () => {
    const date = new Date("2026-01-01T00:00:00.000Z");
    const earth = HelioVector(Body.Earth, date);
    for (const body of [Body.Sun, Body.Moon] as const) {
      const target = HelioVector(body, date);
      const actual = geometricGeocentricVector(body, date);
      expect([actual.x, actual.y, actual.z]).toEqual([
        target.x - earth.x,
        target.y - earth.y,
        target.z - earth.z,
      ]);
    }
    const geometricSun = geometricGeocentricVector(Body.Sun, date);
    const apparentSun = GeoVector(Body.Sun, date, true);
    expect(Math.hypot(geometricSun.x - apparentSun.x, geometricSun.y - apparentSun.y, geometricSun.z - apparentSun.z)).toBeGreaterThan(1e-7);
  });

  it("computes best time in UTC and handles moonset at/before sunset", () => {
    expect(calculateBestTimeUtc("2026-01-01T18:00:00Z", "2026-01-01T22:30:00Z")).toBe("2026-01-01T20:00:00.000Z");
    expect(calculateBestTimeUtc("2026-01-01T18:00:00Z", "2026-01-01T18:00:00Z")).toBeNull();
    expect(calculateBestTimeUtc("2026-01-01T18:00:00Z", "2026-01-01T17:00:00Z")).toBeNull();
  });

  it("is independent of the host timezone", () => {
    const previous = process.env.TZ;
    try {
      process.env.TZ = "Pacific/Honolulu";
      const west = calculateBestTimeUtc("2026-01-01T18:00:00Z", "2026-01-01T22:30:00Z");
      process.env.TZ = "Asia/Tokyo";
      const east = calculateBestTimeUtc("2026-01-01T18:00:00Z", "2026-01-01T22:30:00Z");
      expect(west).toBe(east);
    } finally {
      if (previous === undefined) delete process.env.TZ;
      else process.env.TZ = previous;
    }
  });

  it("returns a normalized astronomical prediction without changing tabular conversion", () => {
    const observer = yallopObserver("karachi")!;
    const evaluation = evaluateYallopAstronomy({ observer, evaluationWindowStartUtc: "2024-03-10T00:00:00.000Z" });
    expect(evaluation.status).toBe("evaluated");
    if (evaluation.status === "evaluated") {
      expect(evaluation.snapshot.arcvDeg).toBeTypeOf("number");
      expect(evaluation.snapshot.horizontalParallaxDeg).toBeGreaterThan(0);
      expect(evaluation.provenance).toMatchObject({ method: "yallop", algorithm: "BD-Yallop-NAO-TN69", astronomyProvider: "Astronomy Engine", sourceType: "astronomical-prediction" });
    }
    expect(convert("gregorian", { year: 2024, month: 3, day: 10 }).hijri).toEqual({ year: 1445, month: 9, day: 1 });
    expect(convert("gregorian", { year: 2000, month: 1, day: 1 }).hijri).toEqual({ year: 1420, month: 9, day: 25 });
  });
});
