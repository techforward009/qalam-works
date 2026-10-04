import { describe, expect, test } from "vitest";
import { researchKhateebTopic } from "../app/tools/khateeb-studio/engine/researchEngine";
import { buildLiveResearchPack } from "../app/tools/khateeb-studio/engine/liveResearchPack";
import { buildGroundedSermonBlueprintText } from "../app/tools/khateeb-studio/engine/groundedSermonBlueprint";
import {
  VERIFIED_LIVE_TOPIC_HADITHS,
  validateVerifiedLiveTopicHadiths,
  verifiedLiveHadithEvidenceForQuery,
} from "../app/tools/khateeb-studio/engine/verifiedLiveTopicHadiths";

describe("Khateeb first verified live topic: Rizq", () => {
  test("locks five exact Al-Kafi narrations for Rizq", () => {
    expect(VERIFIED_LIVE_TOPIC_HADITHS).toHaveLength(5);
    expect(VERIFIED_LIVE_TOPIC_HADITHS.every((row) => row.topicId === "rizq")).toBe(true);
    expect(VERIFIED_LIVE_TOPIC_HADITHS.map((row) => row.sourceWitness.hadithNumber)).toEqual([
      "3",
      "4",
      "5",
      "6",
      "7",
    ]);
    expect(VERIFIED_LIVE_TOPIC_HADITHS.every((row) => row.sourceWitness.volume === 5)).toBe(true);
    expect(VERIFIED_LIVE_TOPIC_HADITHS.every((row) => row.sourceWitness.page === 78)).toBe(true);
    expect(validateVerifiedLiveTopicHadiths()).toEqual([]);
  });

  test("Rizq aliases retrieve only exact verified hadith evidence", () => {
    for (const query of ["رزق", "روزی", "کسب حلال", "livelihood"]) {
      const rows = verifiedLiveHadithEvidenceForQuery(query, 10);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((row) => row.status === "verified")).toBe(true);
      expect(rows.every((row) => row.kind === "hadith")).toBe(true);
      expect(rows.every((row) => Boolean(row.arabic))).toBe(true);
      expect(rows.every((row) => !row.arabic?.includes("..."))).toBe(true);
    }
  });

  test("Rizq research combines internal Quran foundation with verified hadith core", () => {
    const result = researchKhateebTopic({
      query: "رزق",
      locale: "ur",
      maxEvidence: 50,
    });

    const quran = result.evidence.filter(
      (row) => row.status === "verified" && row.kind === "quran",
    );
    const hadith = result.evidence.filter(
      (row) => row.status === "verified" && row.kind === "hadith" && row.topicId === "rizq",
    );

    expect(quran).toHaveLength(8);
    expect(hadith).toHaveLength(5);
    expect(result.matchedTopicIds).toContain("rizq");
    expect(result.canBuildSermon).toBe(true);
    expect(result.gapsUr).toEqual([]);
  });

  test("20, 30, and 45 minute live packs all preserve enough hadith core", () => {
    const result = researchKhateebTopic({
      query: "رزق",
      locale: "ur",
      maxEvidence: 50,
    });

    for (const duration of [20, 30, 45] as const) {
      const pack = buildLiveResearchPack(result, duration);
      expect(pack.ready).toBe(true);
      expect(pack.totalMinutes).toBe(duration);
      expect(pack.profile.core).toBeGreaterThanOrEqual(pack.minimumCoreEvidence);
      expect(
        pack.evidence.filter((row) => row.kind === "hadith").length,
      ).toBeGreaterThanOrEqual(pack.minimumCoreEvidence);
      expect(pack.evidence.every((row) => row.status === "verified")).toBe(true);
    }
  });

  test("balanced selection prevents Quran ranking from crowding hadith out of the 20-minute pack", () => {
    const result = researchKhateebTopic({
      query: "رزق",
      locale: "ur",
      maxEvidence: 50,
    });
    const pack = buildLiveResearchPack(result, 20);

    expect(pack.evidence).toHaveLength(5);
    expect(pack.evidence.some((row) => row.kind === "quran")).toBe(true);
    expect(pack.evidence.some((row) => row.kind === "hadith")).toBe(true);
    expect(pack.profile.core).toBeGreaterThanOrEqual(1);
  });

  test("Rizq now produces a copyable verified sermon blueprint without a prepared dossier", () => {
    const result = researchKhateebTopic({
      query: "رزق",
      locale: "ur",
      maxEvidence: 50,
    });
    const pack = buildLiveResearchPack(result, 30);
    const text = buildGroundedSermonBlueprintText(pack, "ur");

    expect(pack.ready).toBe(true);
    expect(text).toContain("30 منٹ کا مصدقہ منبری خاکہ");
    expect(text).toContain("[ماخذی بنیاد]");
    expect(text).toContain("مصدقہ روایت");
    expect(text).toContain("الکافی، ج5، ص78");
    expect(text).toContain("[تدوینی حصہ");
  });

  test("unrelated topics do not inherit Rizq hadiths", () => {
    const rows = verifiedLiveHadithEvidenceForQuery("غصہ", 10);
    expect(rows).toEqual([]);
  });
});
