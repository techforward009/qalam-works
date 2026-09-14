import { describe, expect, it } from "vitest";
import { PAKISTAN_NATIONAL_REFERENCE_LOCATION_IDS, evaluatePakistanNationalCrescentPrediction, pakistanNationalReferenceObservers } from "../app/tools/date-converter/utils/pakistan-crescent/nationalPrediction";
import { yallopObserver } from "../app/tools/date-converter/utils/yallop/observerLocations";
import { evaluateYallopNationalReferencePrediction } from "../app/tools/date-converter/utils/yallop/nationalReferencePrediction";

const date = { year: 2026, month: 8, day: 13 };
const prediction = (qualifies: boolean) => ({ status: "evaluated", criterion: { qualifies } }) as any;

describe("Pakistan national reference prediction", () => {
  it("uses exactly the eight published national reference locations including approved PMD Jiwani", () => {
    expect(PAKISTAN_NATIONAL_REFERENCE_LOCATION_IDS).toEqual(["gilgit", "peshawar", "islamabad", "lahore", "muzaffarabad", "quetta", "karachi", "jiwani"]);
    expect(pakistanNationalReferenceObservers()).toHaveLength(8);
    expect(yallopObserver("jiwani")).toMatchObject({ latitudeDeg: 25.0666666667, longitudeDeg: 61.8, elevationMeters: 56, timezone: "Asia/Karachi" });
  });

  it("satisfies the national criterion when one location qualifies, without majority or averaging", () => {
    let index = 0;
    const result = evaluatePakistanNationalCrescentPrediction(date, () => prediction(index++ === 7));
    expect(result.qualifies).toBe(true); expect(result.locations).toHaveLength(8);
  });

  it("does not satisfy the national criterion when no prescribed location qualifies", () => {
    expect(evaluatePakistanNationalCrescentPrediction(date, () => prediction(false)).qualifies).toBe(false);
  });

  it("keeps Yallop as a separate reference-location comparison", () => {
    let index = 0;
    const result = evaluateYallopNationalReferencePrediction(date, () => ({ status: "evaluated", criterion: { visibilityClass: index++ === 2 ? "B" : "C" }, acceptedByPolicy: index === 3 }) as any);
    expect(result.anyAcceptedByPolicy).toBe(true);
    expect(result.classCounts).toMatchObject({ A: 0, B: 1, C: 7 });
  });
});
