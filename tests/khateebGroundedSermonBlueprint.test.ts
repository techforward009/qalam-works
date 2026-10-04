import { describe, expect, test } from "vitest";
import { buildLiveResearchPack } from "../app/tools/khateeb-studio/engine/liveResearchPack";
import {
  buildGroundedSermonBlueprint,
  buildGroundedSermonBlueprintText,
} from "../app/tools/khateeb-studio/engine/groundedSermonBlueprint";
import type {
  KhateebResearchEvidence,
  KhateebResearchResult,
} from "../app/tools/khateeb-studio/engine/researchTypes";

function resultFrom(
  evidence: readonly KhateebResearchEvidence[],
): KhateebResearchResult {
  return {
    query: "آزمائشی موضوع",
    locale: "ur",
    matchedTopicIds: ["test"],
    evidence,
    verifiedCount: evidence.filter((item) => item.status === "verified").length,
    sourceLeadCount: evidence.filter((item) => item.status === "source-lead").length,
    catalogOnlyCount: evidence.filter((item) => item.status === "catalog-only").length,
    canBuildSermon: evidence.some((item) => item.status === "verified"),
    providerHints: [],
    gapsUr: [],
    gapsEn: [],
  };
}

function evidence(
  id: string,
  kind: KhateebResearchEvidence["kind"],
  status: KhateebResearchEvidence["status"] = "verified",
): KhateebResearchEvidence {
  return {
    id,
    topicId: "test",
    kind,
    status,
    titleUr: `عنوان ${id}`,
    titleEn: `Title ${id}`,
    detailUr: `موضوعی ربط ${id}`,
    detailEn: `Topic link ${id}`,
    citationUr: `حوالہ ${id}`,
    citationEn: `Reference ${id}`,
    arabic: kind === "quran" || kind === "hadith" ? `نص ${id}` : undefined,
  };
}

describe("grounded sermon blueprint", () => {
  test("requires core hadith or source-grounded scholarship, not raw source count alone", () => {
    const speakerHeavy = resultFrom([
      evidence("q1", "quran"),
      evidence("sp1", "speaker"),
      evidence("sp2", "speaker"),
      evidence("sp3", "speaker"),
      evidence("sp4", "speaker"),
    ]);

    const pack = buildLiveResearchPack(speakerHeavy, 20);
    expect(pack.ready).toBe(false);
    expect(pack.profile.verified).toBe(5);
    expect(pack.profile.core).toBe(0);
    expect(pack.blockers.map((item) => item.code)).toContain(
      "not-enough-core-evidence",
    );
  });

  test("keeps the Quran-only prohibition even when verse count reaches the duration threshold", () => {
    const quranOnly = resultFrom([
      evidence("q1", "quran"),
      evidence("q2", "quran"),
      evidence("q3", "quran"),
      evidence("q4", "quran"),
      evidence("q5", "quran"),
    ]);

    const pack = buildLiveResearchPack(quranOnly, 20);
    expect(pack.ready).toBe(false);
    expect(pack.blockers.map((item) => item.code)).toContain("quran-only");
  });

  test("30-minute pack requires two core verified records", () => {
    const oneCore = resultFrom([
      evidence("q1", "quran"),
      evidence("h1", "hadith"),
      evidence("sp1", "speaker"),
      evidence("sp2", "speaker"),
      evidence("sp3", "speaker"),
      evidence("sp4", "speaker"),
      evidence("sp5", "speaker"),
      evidence("sp6", "speaker"),
    ]);

    const pack = buildLiveResearchPack(oneCore, 30);
    expect(pack.profile.verified).toBe(8);
    expect(pack.profile.core).toBe(1);
    expect(pack.minimumCoreEvidence).toBe(2);
    expect(pack.ready).toBe(false);
  });

  test("builds a ready blueprint from verified Quran, hadith, and scholarship", () => {
    const grounded = resultFrom([
      evidence("q1", "quran"),
      evidence("h1", "hadith"),
      evidence("h2", "hadith"),
      evidence("s1", "scholar"),
      evidence("s2", "scholar"),
      evidence("sp1", "speaker"),
      evidence("sp2", "speaker"),
      evidence("sp3", "speaker"),
    ]);

    const pack = buildLiveResearchPack(grounded, 30);
    expect(pack.ready).toBe(true);
    expect(pack.totalMinutes).toBe(30);
    expect(pack.evidence.every((item) => item.status === "verified")).toBe(true);
    expect(pack.sections.some((item) => item.role === "editorial-bridge")).toBe(
      true,
    );
    expect(pack.sections.some((item) => item.role === "source-grounded")).toBe(
      true,
    );

    const blueprint = buildGroundedSermonBlueprint(pack);
    expect(blueprint.ready).toBe(true);
    expect(blueprint.sourceIds).toEqual(pack.evidence.map((item) => item.id));
    expect(
      blueprint.sections
        .flatMap((section) => section.evidence)
        .every((item) => item.status === "verified"),
    ).toBe(true);
  });

  test("copy text separates source-grounded material from editorial bridges", () => {
    const grounded = resultFrom([
      evidence("q1", "quran"),
      evidence("h1", "hadith"),
      evidence("h2", "hadith"),
      evidence("s1", "scholar"),
      evidence("s2", "scholar"),
    ]);

    const pack = buildLiveResearchPack(grounded, 30);
    const text = buildGroundedSermonBlueprintText(pack, "ur");

    expect(text).toContain("30 منٹ کا مصدقہ منبری خاکہ");
    expect(text).toContain("[ماخذی بنیاد]");
    expect(text).toContain("[تدوینی حصہ — اسے اصل ماخذ کا قول نہ سمجھیں]");
    expect(text).toContain("مصدقہ روایت");
    expect(text).toContain("حوالہ: حوالہ h1");
    expect(text).toContain(
      "اپنی مثال، تمہید اور ربط کو الگ تدوینی زبان میں بیان کریں",
    );
  });

  test("source leads never enter a ready blueprint", () => {
    const mixed = resultFrom([
      evidence("q1", "quran"),
      evidence("h1", "hadith"),
      evidence("h2", "hadith"),
      evidence("s1", "scholar"),
      evidence("lead1", "hadith", "source-lead"),
      evidence("lead2", "source", "source-lead"),
    ]);

    const pack = buildLiveResearchPack(mixed, 20);
    expect(pack.ready).toBe(true);
    expect(pack.evidence.map((item) => item.id)).not.toContain("lead1");
    expect(pack.evidence.map((item) => item.id)).not.toContain("lead2");

    const text = buildGroundedSermonBlueprintText(pack, "ur");
    expect(text).not.toContain("عنوان lead1");
    expect(text).not.toContain("عنوان lead2");
  });
});
