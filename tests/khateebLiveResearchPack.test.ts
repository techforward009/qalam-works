import { describe, expect, test } from "vitest";
import { buildLiveResearchPack } from "../app/tools/khateeb-studio/engine/liveResearchPack";
import type { KhateebResearchResult } from "../app/tools/khateeb-studio/engine/researchTypes";

const result: KhateebResearchResult = {
  query: "رزق میں برکت",
  locale: "ur",
  matchedTopicIds: [],
  evidence: Array.from({ length: 12 }, (_, index) => ({
    id: `e${index + 1}`,
    topicId: "live-research",
    kind: index === 0 ? "quran" : index < 7 ? "hadith" : "source",
    status: "verified",
    titleUr: `عنوان ${index + 1}`,
    titleEn: `Title ${index + 1}`,
    detailUr: "تفصیل",
    detailEn: "Detail",
    citationUr: `حوالہ ${index + 1}`,
    citationEn: `Reference ${index + 1}`,
    providerId: index > 0 ? "eshia-library" : undefined,
    arabic: "نص",
  })),
  verifiedCount: 12,
  sourceLeadCount: 0,
  catalogOnlyCount: 0,
  canBuildSermon: true,
  providerHints: [],
  gapsUr: [],
  gapsEn: [],
};

describe("live research sermon pack", () => {
  test("grows source depth with 20, 30, and 45 minute duration", () => {
    expect(buildLiveResearchPack(result, 20).evidence).toHaveLength(5);
    expect(buildLiveResearchPack(result, 30).evidence).toHaveLength(8);
    expect(buildLiveResearchPack(result, 45).evidence).toHaveLength(12);
  });

  test("allocates the requested duration without changing source text", () => {
    for (const duration of [20, 30, 45] as const) {
      const pack = buildLiveResearchPack(result, duration);
      expect(pack.totalMinutes).toBe(duration);
      expect(pack.evidence.every((item) => item.status === "verified")).toBe(true);
      expect(pack.evidence.every((item) => Boolean(item.citationUr))).toBe(true);
      expect(pack.evidence[0]?.arabic).toBe("نص");
    }
  });

  test("creates a source-led pulpit order rather than an invented sermon", () => {
    const pack = buildLiveResearchPack(result, 30);
    expect(pack.sections.map((item) => item.headingUr)).toContain("اصل روایات و متون");
    expect(pack.sections.map((item) => item.headingUr)).toContain("منبری ربط — تدوینی");
    expect(pack.sections.find(item => item.id === "synthesis")?.role).toBe("editorial-bridge");
    expect(pack.sections.every((item) => Array.isArray(item.evidenceIds))).toBe(true);
  });
});
