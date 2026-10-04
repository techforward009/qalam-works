import { describe, expect, test } from "vitest";
import { researchKhateebTopic } from "../app/tools/khateeb-studio/engine/researchEngine";

describe("Khateeb sermon-build gate", () => {
  test("prepared topic with verified hadith core enables sermon building", () => {
    const result = researchKhateebTopic({
      query: "صبر",
      locale: "ur",
      maxEvidence: 50,
    });

    expect(result.canBuildSermon).toBe(true);
    expect(
      result.evidence.some(
        (item) => item.status === "verified" && item.kind === "hadith",
      ),
    ).toBe(true);
  });

  test("Quran-only topical discovery never enables sermon building", () => {
    const result = researchKhateebTopic({
      query: "تقوی",
      locale: "ur",
      maxEvidence: 50,
    });

    const verified = result.evidence.filter(
      (item) => item.status === "verified",
    );
    const core = verified.filter(
      (item) => item.kind === "hadith" || item.kind === "scholar",
    );

    if (core.length === 0) {
      expect(result.canBuildSermon).toBe(false);
    }
  });
});
