import { describe, expect, it } from "vitest";
import { evaluateDateStudioPakistanCrescentPrediction } from "../app/tools/date-converter/utils/pakistan-crescent/dateStudioPrediction";
import { yallopObserver } from "../app/tools/date-converter/utils/yallop/observerLocations";
import { calculateBestTimeUtc } from "../app/tools/date-converter/utils/yallop/astronomyAdapter";
import { Body, Equator, Horizon, Observer } from "astronomy-engine";

describe("Pakistan 5-Year Calendar sunset adapter", () => {
  it("uses the requested observer-local civil evening and calculates lag from sunset to moonset", () => {
    const prediction = evaluateDateStudioPakistanCrescentPrediction({ year: 2026, month: 9, day: 12 }, yallopObserver("karachi")!);
    expect(prediction).toMatchObject({ status: "evaluated", observerLocalDate: "2026-09-12" });
    if (prediction.status !== "evaluated") return;
    expect(prediction.snapshot.lagMinutes).toBeCloseTo((Date.parse(prediction.snapshot.moonsetUtc) - Date.parse(prediction.snapshot.sunsetUtc)) / 60_000, 8);
    expect(prediction.snapshot.sunsetUtc).not.toBe(calculateBestTimeUtc(prediction.snapshot.sunsetUtc, prediction.snapshot.moonsetUtc));
  });

  it("keeps the observer part of the astronomical input", () => {
    const karachi = evaluateDateStudioPakistanCrescentPrediction({ year: 2026, month: 9, day: 12 }, yallopObserver("karachi")!);
    const lahore = evaluateDateStudioPakistanCrescentPrediction({ year: 2026, month: 9, day: 12 }, yallopObserver("lahore")!);
    expect(karachi).toMatchObject({ status: "evaluated", snapshot: { observer: { id: "karachi" } } });
    expect(lahore).toMatchObject({ status: "evaluated", snapshot: { observer: { id: "lahore" } } });
    if (karachi.status === "evaluated" && lahore.status === "evaluated") expect(karachi.snapshot.sunsetUtc).not.toBe(lahore.snapshot.sunsetUtc);
  });

  it("uses unrefracted topocentric altitude at sunset", () => {
    const observer = yallopObserver("karachi")!;
    const prediction = evaluateDateStudioPakistanCrescentPrediction({ year: 2026, month: 9, day: 12 }, observer);
    expect(prediction.status).toBe("evaluated");
    if (prediction.status !== "evaluated") return;
    const time = new Date(prediction.snapshot.sunsetUtc), location = new Observer(observer.latitudeDeg, observer.longitudeDeg, observer.elevationMeters);
    const moon = Equator(Body.Moon, time, location, true, true);
    const geometric = Horizon(time, location, moon.ra, moon.dec).altitude;
    const refracted = Horizon(time, location, moon.ra, moon.dec, "normal").altitude;
    expect(prediction.snapshot.altitudeDeg).toBeCloseTo(geometric, 12);
    expect(Math.abs(refracted - geometric)).toBeGreaterThan(0.001);
  });
});
