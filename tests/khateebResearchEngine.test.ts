import { describe, expect, test } from "vitest";
import { researchKhateebTopic } from "../app/tools/khateeb-studio/engine/researchEngine";

describe("Khateeb research engine", () => {
  test("builds verified evidence from the parents dossier", () => {
    const result = researchKhateebTopic({ query: "والدین", locale: "ur" });

    expect(result.matchedTopicIds).toContain("parents-barsi");
    expect(result.verifiedCount).toBeGreaterThan(0);
    expect(result.canBuildSermon).toBe(true);
    expect(result.evidence.some((item) => item.kind === "quran" && item.status === "verified")).toBe(true);
    expect(result.evidence.some((item) => item.kind === "hadith" && item.status === "verified")).toBe(true);
    expect(result.evidence.some((item) => item.arabic?.length)).toBe(true);
  });

  test("never promotes catalog-only speaker records into verified evidence", () => {
    const result = researchKhateebTopic({ query: "توحید", locale: "ur" });
    const catalogRows = result.evidence.filter((item) => item.status === "catalog-only");

    expect(catalogRows.some((item) => item.titleUr.includes("مجالس ترابی"))).toBe(true);
    expect(catalogRows.every((item) => item.status === "catalog-only")).toBe(true);
  });

  test("returns an explicit evidence gap for an unknown topic", () => {
    const result = researchKhateebTopic({
      query: "ایسا موضوع جو مقامی ذخیرے میں موجود نہیں",
      locale: "ur",
    });

    expect(result.matchedTopicIds).toEqual([]);
    expect(result.canBuildSermon).toBe(false);
    expect(result.verifiedCount).toBe(0);
    expect(result.gapsUr.join(" ")).toContain("اندازے سے");
  });

  test("caps evidence output without changing verification rules", () => {
    const result = researchKhateebTopic({
      query: "والدین",
      locale: "ur",
      maxEvidence: 5,
    });

    expect(result.evidence.length).toBeLessThanOrEqual(5);
    expect(result.evidence.every((item) =>
      ["verified", "source-lead", "catalog-only"].includes(item.status),
    )).toBe(true);
  });
});
