import { describe, expect, test } from "vitest";
import { buildLiveResearchPack } from "../app/tools/khateeb-studio/engine/liveResearchPack";
import { researchKhateebTopic } from "../app/tools/khateeb-studio/engine/researchEngine";
import {
  VERIFIED_LIVE_TOPIC_HADITHS,
  validateVerifiedLiveTopicHadiths,
  verifiedLiveHadithEvidenceForQuery,
} from "../app/tools/khateeb-studio/engine/verifiedLiveTopicHadiths";

describe("Khateeb verified live Rizq topic", () => {
  test("locks five direct Al-Kafi 5:78 witnesses", () => {
    expect(VERIFIED_LIVE_TOPIC_HADITHS).toHaveLength(5);
    expect(
      VERIFIED_LIVE_TOPIC_HADITHS.map(
        (row) => row.sourceWitness.hadithNumber,
      ),
    ).toEqual(["3", "4", "5", "6", "7"]);
    expect(
      VERIFIED_LIVE_TOPIC_HADITHS.every(
        (row) =>
          row.sourceWitness.volume === 5 &&
          row.sourceWitness.page === 78 &&
          row.exactArabic.length > 0 &&
          !row.exactArabic.includes("..."),
      ),
    ).toBe(true);
  });

  test("corpus integrity passes", () => {
    expect(validateVerifiedLiveTopicHadiths()).toEqual([]);
  });

  test("Urdu Rizq aliases return all five verified hadiths", () => {
    const evidence = verifiedLiveHadithEvidenceForQuery("رزق", 10);

    expect(evidence).toHaveLength(5);
    expect(evidence.every((row) => row.status === "verified")).toBe(true);
    expect(evidence.every((row) => row.kind === "hadith")).toBe(true);
    expect(evidence.every((row) => Boolean(row.arabic))).toBe(true);
    expect(evidence.every((row) => row.citationUr.includes("الکافی"))).toBe(
      true,
    );
  });

  test("live arbitrary-topic research now has Quran plus verified hadith core", () => {
    const result = researchKhateebTopic({
      query: "رزق",
      locale: "ur",
      maxEvidence: 40,
    });

    const quran = result.evidence.filter(
      (row) => row.kind === "quran" && row.status === "verified",
    );
    const hadith = result.evidence.filter(
      (row) =>
        row.kind === "hadith" &&
        row.status === "verified" &&
        row.topicId === "rizq",
    );

    expect(quran.length).toBeGreaterThanOrEqual(5);
    expect(hadith).toHaveLength(5);
    expect(result.matchedTopicIds).toContain("rizq");
    expect(result.canBuildSermon).toBe(true);
    expect(
      result.gapsUr.some((item) =>
        item.includes("روایت اور علمی توضیح کے لیے مزید مصدقہ ماخذ درکار ہیں"),
      ),
    ).toBe(false);
  });

  test("Rizq can now produce a 45-minute verified live sermon blueprint", () => {
    const result = researchKhateebTopic({
      query: "رزق",
      locale: "ur",
      maxEvidence: 40,
    });
    const pack = buildLiveResearchPack(result, 45);

    expect(pack.ready).toBe(true);
    expect(pack.totalMinutes).toBe(45);
    expect(pack.profile.hadith).toBeGreaterThanOrEqual(3);
    expect(pack.profile.quran).toBeGreaterThanOrEqual(4);
    expect(pack.blockers).toEqual([]);
    expect(pack.evidence.every((row) => row.status === "verified")).toBe(true);
  });

  test("English halal earning alias resolves the same verified core", () => {
    const evidence = verifiedLiveHadithEvidenceForQuery("halal earning", 10);
    expect(evidence).toHaveLength(5);
    expect(evidence.some((row) => row.arabic?.includes("طلب الحلال"))).toBe(
      true,
    );
  });
});
